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

const ROOT = path.resolve(process.argv.find(a => a.startsWith('--root='))?.slice(7) || process.cwd());
const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6) || null;
const ENFORCE = process.argv.includes('--enforce');
const SUMMARY_ONLY = process.argv.includes('--summary-only');
const { sourceTexts, reachable } = buildMaintainedReachability(ROOT);

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
    /data\/hints\//u, /data\/stress\/hints(?:-random|-envelope)?\//u,
    /['"]hints(?:-random|-envelope)?['"]/u,
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
  if (maintainedReachable
      && /JSON\.parse\s*\([^\n]*(?:readFileSync|readFile)/u.test(text)
      && /(?:hintFile|hintDoc|hints\/|hints-random\/|data\/hints)/u.test(text)
      && /\.hints\b/u.test(text)) {
    directPhysicalReadSuspects.push(rel);
  }
  if (maintainedReachable
      && /JSON\.parse\s*\([^\n]*(?:readFileSync|readFile)/u.test(text)
      && /\b(?:doc|document|hintDoc)\.hints\b/u.test(text)
      && !/\b(?:decodeHintArtifact|parseHintFileContents)\b/u.test(text)) {
    physicalDecodeBypasses.push(rel);
  }
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
}, null, 2));
if (ENFORCE && result.physicalDecodeBypasses.length > 0) {
  console.error('Maintained raw Hint artifact readers bypass the shared decoder:');
  for (const file of result.physicalDecodeBypasses) console.error('  - ' + file);
  process.exit(1);
}
