#!/usr/bin/env node
/**
 * Hostile post-consolidation census of every maintained-reachable Hint/provenance surface.
 *
 * This is deliberately broader than a single "forbidden import" guard. It inventories physical
 * artifact knowledge, semantic readers/writers, provenance construction, direct mutable aliases,
 * workflow persistence, Firestore surfaces, and research consumers. The first use is diagnostic:
 * review/classify every surfaced file before converting stable invariants into hard failures.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildMaintainedReachability } from './hint-io-facade-guard-lib.mjs';
import { CANONICAL_TRACKED_HINT_STORE_DIRS } from './hint-store-roots.mjs';

const ROOT = path.resolve(process.argv.find(a => a.startsWith('--root='))?.slice(7) || process.cwd());
const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6) || null;
const ENFORCE = process.argv.includes('--enforce');
const SUMMARY_ONLY = process.argv.includes('--summary-only');
const { sourceTexts, reachable } = buildMaintainedReachability(ROOT);

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const CANONICAL_STORE_SOURCE = CANONICAL_TRACKED_HINT_STORE_DIRS.map(escapeRegExp).join('|');
const CANONICAL_STORE_PATH_RE = new RegExp('(?:' + CANONICAL_STORE_SOURCE + ')/', 'u');
const CANONICAL_STORE_JOIN_RES = CANONICAL_TRACKED_HINT_STORE_DIRS.map(dir =>
  new RegExp(dir.split('/').map(escapeRegExp).join("['\"]\\s*,\\s*['\"]"), 'u'));
const HINT_PATH_HELPER_RE = /\b(?:hintFilePathFor|hintsDirFor|hintArtifactFileName|isHintArtifactFileName|hintKeyForLevel)\s*\(/u;

function expressionHasCanonicalHintPath(expression, pathVars = new Set()) {
  if (CANONICAL_STORE_PATH_RE.test(expression)
      || CANONICAL_STORE_JOIN_RES.some(re => re.test(expression))
      || HINT_PATH_HELPER_RE.test(expression)) return true;
  for (const name of pathVars) {
    if (new RegExp('\\b' + escapeRegExp(name) + '\\b', 'u').test(expression)) return true;
  }
  return false;
}
function inspectPhysicalHintReadSurface(text) {
  const readsJsonFile = /\b(?:readFileSync|readFile)\s*\(/u.test(text)
    && /\bJSON\.parse\s*\(/u.test(text);
  const consumesHintRows = /\.hints\b/u.test(text);
  const hasHintSourceSignal = /\bhint(?:File(?:Path)?|Doc|Path|Artifact(?:Path)?|Contents?|Metadata|Dir)\b/iu.test(text)
    || CANONICAL_STORE_PATH_RE.test(text)
    || CANONICAL_STORE_JOIN_RES.some(re => re.test(text))
    || HINT_PATH_HELPER_RE.test(text);
  const usesSharedDecoder = /\b(?:decodeHintArtifact|parseHintFileContents)\b/u.test(text);
  const suspect = readsJsonFile && consumesHintRows && hasHintSourceSignal;
  // Bypass classification must tie the filesystem read itself to a Hint-shaped target. A file may
  // legitimately read unrelated manifest/report JSON and also consume hydrated level.hints through
  // the canonical corpus reader; the earlier file-level conjunction mislabeled that as a raw
  // physical Hint read (family-generate.mjs was the concrete counterexample).
  const readsHintTarget = /\b(?:readFileSync|readFile)\s*\(\s*[^,\n]*(?:hint(?:File(?:Path)?|Artifact(?:Path)?|Path|Doc|Dir)|data\/(?:families\/(?:phaseB\/)?|stress\/)?hints(?:-random|-envelope)?\/)/iu.test(text)
    || CANONICAL_STORE_JOIN_RES.some(re => new RegExp('(?:readFileSync|readFile)\\\\s*\\\\([^\\n]*' + re.source, 'u').test(text));
  return { suspect, bypass: suspect && readsHintTarget && !usesSharedDecoder };
}

function inspectPhysicalHintWriteSurface(text) {
  const writeCallRe = /\b(?:writeFileSync|writeFile|appendFileSync|appendFile|copyFileSync|renameSync)\s*\(\s*([^,\n]+)/gu;
  const canonicalPathVars = new Set();
  const assignments = [...text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/gu)];
  let changed = true;
  while (changed) {
    changed = false;
    for (const match of assignments) {
      if (!canonicalPathVars.has(match[1]) && expressionHasCanonicalHintPath(match[2], canonicalPathVars)) {
        canonicalPathVars.add(match[1]);
        changed = true;
      }
    }
  }
  let writesDirectCanonicalTarget = false;
  for (const match of text.matchAll(writeCallRe)) {
    const target = match[1].trim();
    if (expressionHasCanonicalHintPath(target, canonicalPathVars) || canonicalPathVars.has(target)) {
      writesDirectCanonicalTarget = true;
      break;
    }
  }
  // Canonical/migration/compatibility owners often compute the path through helpers or maps, but
  // their physical write is paired with the shared encoder. This intentionally does not treat a
  // file as a writer merely because it reads Hint paths and also writes an unrelated report.
  const writesFile = /\b(?:writeFileSync|writeFile|appendFileSync|appendFile|copyFileSync|renameSync)\s*\(/u.test(text);
  const ownsPhysicalEncoding = /\b(?:encodeHintArtifact|stringifyHints)\b/u.test(text);
  return { suspect: writesDirectCanonicalTarget || (writesFile && ownsPhysicalEncoding) };
}

if (process.argv.includes('--self-test')) {
  const cases = [
    {
      name: 'inline raw physical reader',
      text: `const doc = JSON.parse(fs.readFileSync('data/stress/hints/a.json', 'utf8')); doc.hints.forEach(use);`,
      suspect: true,
      bypass: true,
    },
    {
      name: 'staged raw physical reader',
      text: `const raw = fs.readFileSync(hintFilePath, 'utf8');\nconst parsed = JSON.parse(raw);\nfor (const hint of parsed.hints) use(hint);`,
      suspect: true,
      bypass: true,
    },
    {
      name: 'raw family-store physical reader',
      text: `const parsed = JSON.parse(fs.readFileSync('data/families/phaseB/hints/F00001.json', 'utf8'));\nfor (const hint of parsed.hints) use(hint);`,
      suspect: true,
      bypass: true,
    },
    {
      name: 'staged reader through shared decoder',
      text: `const raw = fs.readFileSync(hintArtifactPath, 'utf8');\nconst parsed = JSON.parse(raw);\nconst doc = decodeHintArtifact(parsed);\nfor (const hint of doc.hints) use(hint);`,
      suspect: true,
      bypass: false,
    },
    {
      name: 'manifest JSON plus hydrated semantic hints',
      text: `const block = JSON.parse(readFileSync(blockAbs, 'utf8'));\nconst level = readLevelCorpusDocumentWithHints(corpus).levels[0];\nconsole.log(level.hints);\nconst dir = hintsDirFor(corpus);`,
      suspect: true,
      bypass: false,
    },
    {
      name: 'unrelated JSON with semantic hints property',
      text: `const raw = fs.readFileSync(reportPath, 'utf8');\nconst parsed = JSON.parse(raw);\nconsole.log(parsed.hints);`,
      suspect: false,
      bypass: false,
    },
  ];
  for (const fixture of cases) {
    const actual = inspectPhysicalHintReadSurface(fixture.text);
    if (actual.suspect !== fixture.suspect || actual.bypass !== fixture.bypass) {
      throw new Error(`${fixture.name}: expected suspect=${fixture.suspect}, bypass=${fixture.bypass}; got ${JSON.stringify(actual)}`);
    }
  }
  const writerCases = [
    {
      name: 'direct canonical physical writer',
      text: `writeFileSync('data/stress/hints/P00001.json', JSON.stringify(doc));`,
      suspect: true,
    },
    {
      name: 'shared codec owner write',
      text: `const next = stringifyHints(records); writeFileSync(hintFilePathFor(levelsFile, id), next);`,
      suspect: true,
    },
    {
      name: 'staged canonical path raw writer',
      text: `const target = path.join(root, 'data/hints/P00001.json');\nwriteFileSync(target, JSON.stringify(doc));`,
      suspect: true,
    },
    {
      name: 'family-store raw writer',
      text: `writeFileSync('data/families/hints/F00001.json', JSON.stringify(doc));`,
      suspect: true,
    },
    {
      name: 'path-joined family-store raw writer',
      text: `const target = path.join(root, 'data', 'families', 'hints', 'F00001.json');\nwriteFileSync(target, JSON.stringify(doc));`,
      suspect: true,
    },
    {
      name: 'helper-derived staged raw writer',
      text: `const hintDir = hintsDirFor(corpusPath);\nconst target = path.join(hintDir, id + '.json');\nwriteFileSync(target, JSON.stringify(doc));`,
      suspect: true,
    },
    {
      name: 'unrelated report writer',
      text: `writeFileSync(reportPath, JSON.stringify(report));`,
      suspect: false,
    },
  ];
  for (const fixture of writerCases) {
    const actual = inspectPhysicalHintWriteSurface(fixture.text);
    if (actual.suspect !== fixture.suspect) {
      throw new Error(`${fixture.name}: expected writer suspect=${fixture.suspect}; got ${JSON.stringify(actual)}`);
    }
  }
  console.log('hint-provenance-surface-audit detector self-test: all tests passed');
  process.exit(0);
}

const categories = {
  physicalCodec: [
    /\bdecodeHintArtifact\b/u, /\bencodeHintArtifact\b/u, /\bparseHintFileContents\b/u,
    /\bstringifyHints\b/u, /\bHINT_ARTIFACT_SCHEMA_VERSION\b/u,
  ],
  corpusIo: [
    /\breadLevelCorpusDocumentWithHints\b/u, /\bwriteLevelCorpusDocumentWithHints\b/u,
    /\breadLevelHints\b/u, /\bhintFilePathFor\b/u, /\bhintsDirFor\b/u,
  ],
  semanticMutation: [
    /\bsetLevelHintRecords\b/u, /\bmergeHints\b/u, /\bdedupeProvenanceEntries\b/u,
  ],
  provenanceConstruction: [
    /\bmakeProvenanceEntry\b/u, /\bprovenanceFromSolveResult\b/u,
    /\bprovenanceFromHistoricalSolveResult\b/u, /\bhintsFromVarietyResult\b/u,
    /\btoHint\b/u,
  ],
  provenanceConsumption: [
    /\bprovenanceEventIdentity\b/u, /\.provenance\b/u, /\boccurrences\b/u,
    /\bsolverRequestIdentity\b/u, /\bprotocolHash\b/u, /\busedExistingHints\b/u,
    /\bhintGuided\b/u, /\bisolatedTechnique\b/u,
  ],
  mutableAliases: [
    /\.hintRecords\s*=/u, /\.hints\s*=/u,
    /\.(?:hintRecords|hints)\.(?:push|pop|shift|unshift|splice|sort|reverse)\s*\(/u,
    /\.(?:hintRecords|hints)\s*\[[^\]]+\]\s*=/u,
  ],
  provenanceIdentityMutation: [
    /\.context\.levelRevision\s*=/u,
    /\.foundAt\s*=/u,
    /\.execution\s*=/u,
    /\.occurrences\s*=/u,
  ],
  physicalShapeKnowledge: [
    /\bhintMetadata\b/u,
    /\b(?:parsed|obj|artifact|document)\??\.hints\b/u,
    /\bschemaVersion\s*(?:===|==|:|=)\s*[1234]\b/u,
    /\brepresentation\s*(?:===|==|:|=)\s*['"](?:sparse-inline|interned)['"]/u,
    /\bsolverRefs\b/u, /\bcontextRefs\b/u, /\bexecutionRefs\b/u,
  ],
  physicalPathKnowledge: [
    CANONICAL_STORE_PATH_RE,
    ...CANONICAL_STORE_JOIN_RES,
    /['"]hints(?:-random|-envelope)?['"]/u,
    /\b(?:hintFilePathFor|hintsDirFor|hintArtifactFileName|isHintArtifactFileName|hintKeyForLevel)\b/u,
  ],
  workflowPersistence: [
    /--save-hints\b/u, /git add[^\n]*hints/u, /harvest-solver-evidence/u,
    /merge-hint-artifacts/u,
  ],
  firestore: [
    /\blocal_level_hints\b/u, /\bpublished_levels\b/u, /\bFirestore\b/u, /\bfirestore\b/u,
  ],
  researchHintConsumer: [
    /hint-query/u, /provenance-source-taxonomy/u, /hint-discovery-replayability/u,
    /hint-termination-semantics/u, /hint-cost-drift/u, /hint-discovery-process/u,
    /hint-failure-process/u, /provenance-coverage/u, /solution-profile/u,
  ],
};

const directPhysicalReadSuspects = [];
const physicalDecodeBypasses = [];
const directPhysicalWriteSuspects = [];
const rows = [];
for (const [rel, text] of sourceTexts) {
  const hits = {};
  for (const [category, patterns] of Object.entries(categories)) {
    const matched = patterns.filter(re => re.test(text)).map(re => re.source);
    if (matched.length) hits[category] = matched;
  }
  if (!Object.keys(hits).length) continue;
  const maintainedReachable = reachable.has(rel);
  rows.push({
    path: rel,
    maintainedReachable,
    directPackageReference: fs.existsSync(path.join(ROOT, 'package.json'))
      && fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8').includes(rel),
    hits,
  });
  const physicalRead = inspectPhysicalHintReadSurface(text);
  if (maintainedReachable && physicalRead.suspect) directPhysicalReadSuspects.push(rel);
  if (maintainedReachable && physicalRead.bypass) physicalDecodeBypasses.push(rel);
  const physicalWrite = inspectPhysicalHintWriteSurface(text);
  if (maintainedReachable && physicalWrite.suspect) directPhysicalWriteSuspects.push(rel);
}
rows.sort((a,b)=>a.path.localeCompare(b.path));

const maintained = rows.filter(r=>r.maintainedReachable);
const summary = {};
for (const category of Object.keys(categories)) {
  summary[category] = {
    maintainedFiles: maintained.filter(r=>r.hits[category]).length,
    allFiles: rows.filter(r=>r.hits[category]).length,
  };
}

const result = {
  schemaVersion: 1,
  kind: 'pathfinder-hint-provenance-surface-census',
  generatedAt: new Date().toISOString(),
  root: ROOT,
  summary,
  directPhysicalReadSuspects: [...new Set(directPhysicalReadSuspects)].sort(),
  physicalDecodeBypasses: [...new Set(physicalDecodeBypasses)].sort(),
  directPhysicalWriteSuspects: [...new Set(directPhysicalWriteSuspects)].sort(),
  maintainedRows: maintained,
  dormantRows: rows.filter(r=>!r.maintainedReachable),
};
const json = JSON.stringify(result, null, 2);
if (OUT) {
  const out = path.resolve(ROOT, OUT);
  fs.mkdirSync(path.dirname(out), {recursive:true});
  fs.writeFileSync(out, json + '\n');
}
if (!SUMMARY_ONLY) console.log(json);
else console.log(JSON.stringify({
  summary,
  directPhysicalReadSuspects: result.directPhysicalReadSuspects,
  physicalDecodeBypasses: result.physicalDecodeBypasses,
  directPhysicalWriteSuspects: result.directPhysicalWriteSuspects,
}, null, 2));
if (ENFORCE) {
  const failures = [];
  if (result.physicalDecodeBypasses.length > 0) {
    failures.push(...result.physicalDecodeBypasses.map(file =>
      file + ': raw Hint artifact reader bypasses the shared decoder'));
  }

  const bareMutationLedgerPath = path.join(ROOT, 'docs', 'hint-bare-mutation-audit.json');
  if (!fs.existsSync(bareMutationLedgerPath)) {
    failures.push('docs/hint-bare-mutation-audit.json: reviewed bare-Hint mutation ledger is missing');
  } else {
    const bareMutationLedger = JSON.parse(fs.readFileSync(bareMutationLedgerPath, 'utf8'));
    const reviewedBareMutations = new Map((bareMutationLedger.entries ?? []).map(entry => [entry.path, entry]));
    const currentBareMutations = new Set(maintained.filter(row => row.hits.mutableAliases).map(row => row.path));
    for (const file of currentBareMutations) {
      if (!reviewedBareMutations.has(file)) {
        failures.push(file + ': direct .hints/.hintRecords assignment has not been explicitly reviewed');
      }
    }
    for (const file of reviewedBareMutations.keys()) {
      if (!currentBareMutations.has(file)) {
        failures.push(file + ': bare-Hint mutation review entry is stale; re-review/remove the classification');
      }
    }
  }

  const writerLedgerPath = path.join(ROOT, 'docs', 'hint-physical-writer-audit.json');
  if (!fs.existsSync(writerLedgerPath)) {
    failures.push('docs/hint-physical-writer-audit.json: reviewed physical-writer ledger is missing');
  } else {
    const writerLedger = JSON.parse(fs.readFileSync(writerLedgerPath, 'utf8'));
    const reviewedWriters = new Map((writerLedger.entries ?? []).map(entry => [entry.path, entry]));
    const currentWriters = new Set(result.directPhysicalWriteSuspects);
    for (const file of currentWriters) {
      const entry = reviewedWriters.get(file);
      if (!entry) {
        failures.push(file + ': direct physical Hint writer has not been explicitly reviewed');
        continue;
      }
      const source = sourceTexts.get(file) ?? '';
      if (entry.disposition === 'physical-io-owner'
          && !/\b(?:encodeHintArtifact|stringifyHints)\b/u.test(source)) {
        failures.push(file + ': physical I/O owner no longer delegates writes through the shared Hint encoder');
      }
      if (entry.disposition === 'physical-migration-owner'
          && (!/\bdecodeHintArtifact\b/u.test(source)
              || !/\bencodeHintArtifact\b/u.test(source)
              || !/semantic/u.test(source))) {
        failures.push(file + ': physical migration owner no longer visibly proves decode/encode semantic preservation');
      }
      if (entry.disposition === 'historical-compatibility-importer'
          && (!/\bdecodeHintArtifact\b/u.test(source)
              || !/\bmergeHints\b/u.test(source)
              || !/\bvalidateCandidatePath\b/u.test(source))) {
        failures.push(file + ': compatibility importer no longer visibly decodes, referee-validates and semantically merges');
      }
      if (entry.disposition === 'temporary-test-fixture-writer'
          && !/\b(?:mkdtempSync|mkdtemp)\b/u.test(source)) {
        failures.push(file + ': temporary fixture writer no longer creates an isolated temporary root');
      }
      if (entry.disposition === 'false-positive-audit-fixture'
          && file !== 'scripts/hint-provenance-surface-audit.mjs') {
        failures.push(file + ': false-positive audit-fixture disposition is reserved for the detector self-test');
      }
    }
    for (const file of reviewedWriters.keys()) {
      if (!currentWriters.has(file)) {
        failures.push(file + ': physical-writer review entry is stale; re-review/remove the classification');
      }
    }
  }

  const ledgerPath = path.join(ROOT, 'docs', 'hint-physical-reader-audit.json');
  if (!fs.existsSync(ledgerPath)) {
    failures.push('docs/hint-physical-reader-audit.json: reviewed physical-reader ledger is missing');
  } else {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const reviewed = new Map((ledger.entries ?? []).map(entry => [entry.path, entry]));
    const currentReaders = new Set(result.directPhysicalReadSuspects);
    for (const file of currentReaders) {
      const entry = reviewed.get(file);
      if (!entry) {
        failures.push(file + ': new direct physical-read suspect has not been explicitly reviewed');
        continue;
      }
      const source = sourceTexts.get(file) ?? '';
      if (entry.disposition === 'shared-decoder'
          && !/\b(?:decodeHintArtifact|parseHintFileContents)\b/u.test(source)) {
        failures.push(file + ': ledger says shared-decoder but the decoder boundary is no longer present');
      }
      if (entry.disposition === 'physical-io-owner'
          && !/\bdecodeHintArtifact\b/u.test(source)) {
        failures.push(file + ': physical I/O owner no longer delegates reads to decodeHintArtifact');
      }
    }
    for (const file of reviewed.keys()) {
      if (!currentReaders.has(file)) {
        failures.push(file + ': physical-reader review entry is stale; re-review/remove the classification');
      }
    }
  }

  if (failures.length > 0) {
    console.error('Hint/provenance physical-reader audit failures:');
    for (const failure of failures) console.error('  - ' + failure);
    process.exit(1);
  }
}
