#!/usr/bin/env node
/**
 * Phase-8 post-merge naming closeout audit.
 *
 * This checker is intentionally consumer-inward: it scans maintained live source/docs/workflows for
 * Phase-8 legacy spellings after all eight batches have merged. Frozen execution evidence and the
 * naming authorities that necessarily describe old->new mappings are excluded explicitly. Known
 * compatibility reads are allowlisted at their owning boundary only.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ledgerArg = process.argv.find(arg => arg.startsWith('--ledger='));
const scanRootArg = process.argv.find(arg => arg.startsWith('--scan-root='));
const originalCwd = process.cwd();
const ledgerPath = path.resolve(originalCwd, ledgerArg?.slice('--ledger='.length) ?? 'docs/naming-cleanup-ledger.json');
if (scanRootArg) process.chdir(path.resolve(originalCwd, scanRootArg.slice('--scan-root='.length)));
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
const phase8Rows = ledger.entries.filter(entry => entry.phase === 8);
const phase8Coverage = ledger.phaseCloseoutCoverage?.['8'] ?? {};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

const ROOTS = ['modules', 'scripts', 'docs', '.github'];
const TOP_LEVEL = ['package.json', 'AGENTS.md', 'README.md', 'DEVELOPER_REFERENCE.md'];
const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.ts', '.mts', '.tsx', '.py', '.md', '.json', '.yml', '.yaml']);
const MAX_BYTES = 2 * 1024 * 1024;

function posix(file) {
  return file.split(path.sep).join('/');
}

function walk(root) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return out;
    throw error;
  }
  for (const entry of entries) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(file));
    else if (entry.isFile()) out.push(posix(file));
  }
  return out;
}

function isFrozenOrAuthority(file) {
  return file.startsWith('docs/archive/')
    || file.startsWith('docs/history/')
    || file.startsWith('docs/naming-cleanup-phase-records/')
    || file.startsWith('scripts/naming-cleanup-')
    || file === 'scripts/check-naming-cleanup-ledger.mjs'
    || file === 'docs/naming-cleanup-plan.md'
    || file === 'docs/naming-cleanup-ledger.json'
    || file === 'docs/naming-cleanup-history-and-lessons.md'
    || file === 'docs/naming-cleanup-process-hardening.md'
    || file === 'docs/naming-cleanup-future-phase-preparation.md'
    || file === 'docs/naming-and-vocabulary.md';
}

const files = [
  ...ROOTS.flatMap(walk),
  ...TOP_LEVEL,
].filter((file, index, all) => all.indexOf(file) === index)
  .filter(file => {
    try {
      return statSync(file).isFile()
        && statSync(file).size <= MAX_BYTES
        && TEXT_EXTENSIONS.has(path.extname(file));
    } catch {
      return false;
    }
  })
  .filter(file => !isFrozenOrAuthority(file))
  .sort();

const legacyChecks = [
  ['receptor terminology', /\breceptor(?:s| limitation| can rediscover)?\b/giu],
];
const phase8RetainedSurfaces = ledger.phaseRetainedSurfaces?.['8'] ?? [];
const intentionalLegacyByLabel = new Map();
for (const retained of phase8RetainedSurfaces) {
  for (const match of retained.matches ?? []) {
    const label = `${retained.id} retained surface: ${match.term}`;
    legacyChecks.push([label, new RegExp(`(?<![\\w])${escapeRegExp(match.term)}(?![\\w])`, 'iu')]);
    intentionalLegacyByLabel.set(label, new Set(match.files ?? []));
  }
}

// Exact legacy identities come from the ledger. This closes the former coverage hole where a
// completed row (for example the old lineage analyzer/doc or CP-SAT workflow) could simply be
// absent from this checker's hand-written patterns.
for (const row of phase8Rows) {
  const coverage = phase8Coverage[row.id];
  if (coverage?.kind === 'literal-legacy-surface') {
    legacyChecks.push([`${row.id} ledger legacy surface`, new RegExp(escapeRegExp(coverage.legacy), 'iu')]);
  }
}
const compatibilityCoverages = Object.values(phase8Coverage)
  .filter(coverage => coverage.kind === 'compatibility-exemption');
const compatibilityAllowlist = new Map(compatibilityCoverages.map(coverage =>
  [coverage.legacy, new Set(coverage.files ?? [])]));
const compatibilityChecks = compatibilityCoverages.map(coverage =>
  [coverage.legacy, new RegExp(`\\b${escapeRegExp(coverage.legacy)}\\b`, 'u')]);

const failures = [];
const compatibilityHits = [];

const coverageContractRows = new Map([
  ['typed-scoring-profile-shorthand', new Set(['NC-P08-007'])],
  ['persisted-level-fingerprint-cluster', new Set(['NC-P08-008'])],
  ['solution-path-family-concept', new Set(['NC-P08-009'])],
  ['domain-qualified-residual-exports', new Set(['NC-P08-011'])],
  ['trove-compatibility-and-persisted-identities', new Set(['NC-P08-019'])],
  ['solver-diagnostics-historical-reader', new Set(['NC-P08-024', 'NC-P08-025'])],
  ['prune-gap-workflow-identity', new Set(['NC-P08-044'])],
  ['cpsat-reference-display', new Set(['NC-P08-046'])],
  ['variant-family-dataset-root-resolver', new Set(['NC-P08-053'])],
  ['producer-consumer-terminology', new Set(['NC-P08-066'])],
]);

const coverageIds = new Set(Object.keys(phase8Coverage));
for (const row of phase8Rows) {
  const coverage = phase8Coverage[row.id];
  if (!coverage) failures.push({ label: 'Phase-8 ledger row lacks closeout coverage', file: 'docs/naming-cleanup-ledger.json', line: 0, text: row.id });
  else if (coverage.legacy !== row.old) failures.push({ label: 'Phase-8 closeout coverage drift', file: 'docs/naming-cleanup-ledger.json', line: 0, text: row.id });
  else if (coverage.kind !== 'literal-legacy-surface' && !coverageContractRows.get(coverage.contract)?.has(row.id)) failures.push({ label: 'unsupported or misassigned Phase-8 semantic contract/exemption', file: 'docs/naming-cleanup-ledger.json', line: 0, text: `${row.id}: ${coverage.contract}` });
}
for (const id of coverageIds) {
  if (!phase8Rows.some(row => row.id === id)) failures.push({ label: 'unknown Phase-8 closeout coverage row', file: 'docs/naming-cleanup-ledger.json', line: 0, text: id });
}
const retainedSurfaceIds = new Set(phase8RetainedSurfaces.map(retained => retained.id));
const referencedRetainedSurfaceIds = new Set();
const ledgerRowIds = new Set(ledger.entries.map(entry => entry.id));
for (const retained of phase8RetainedSurfaces) {
  if (!Array.isArray(retained.ownerRowIds) || retained.ownerRowIds.length === 0 ||
      retained.ownerRowIds.some(id => !ledgerRowIds.has(id)) ||
      !retained.ownerRowIds.some(id => id.startsWith('NC-P08-')) ||
      typeof retained.ownerClass !== 'string' || !retained.ownerClass) {
    failures.push({ label: 'invalid retained-surface structured owner', file: 'docs/naming-cleanup-ledger.json', line: 0, text: retained.id });
  }
}
for (const [rowId, coverage] of Object.entries(phase8Coverage)) {
  for (const id of coverage.retainedSurfaceIds ?? []) {
    if (!retainedSurfaceIds.has(id)) failures.push({ label: 'unknown retained-surface reference', file: 'docs/naming-cleanup-ledger.json', line: 0, text: `${rowId}: ${id}` });
    referencedRetainedSurfaceIds.add(id);
  }
}
for (const id of retainedSurfaceIds) {
  if (!referencedRetainedSurfaceIds.has(id)) failures.push({ label: 'unowned Phase-8 retained surface', file: 'docs/naming-cleanup-ledger.json', line: 0, text: id });
}

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split(/\r?\n/u);

  for (const [label, pattern] of legacyChecks) {
    pattern.lastIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      pattern.lastIndex = 0;
      if (!pattern.test(lines[i])) continue;
      if (intentionalLegacyByLabel.get(label)?.has(file)) continue;
      failures.push({ label, file, line: i + 1, text: lines[i].trim() });
    }
  }

  for (const [token, pattern] of compatibilityChecks) {
    pattern.lastIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      pattern.lastIndex = 0;
      if (!pattern.test(lines[i])) continue;
      if (compatibilityAllowlist.get(token)?.has(file)) {
        compatibilityHits.push({ token, file, line: i + 1 });
      } else {
        failures.push({ label: `${token} outside compatibility owner`, file, line: i + 1, text: lines[i].trim() });
      }
    }
  }

  if (/modules\/Solver\.ts/u.test(source)) {
    failures.push({ label: 'stale case-sensitive solver module path', file, line: 0, text: 'use the live modules/solver.ts path' });
  }
}

// Semantic qualification guards. These deliberately inspect declaration/boundary shapes rather
// than banning common English words. Expanding one of these retained boundaries requires updating
// the ledger/vocabulary authority, not merely adding another file to a loose allowlist.
const expectedApplicationFingerprintCluster = new Set(phase8Coverage['NC-P08-008']?.files ?? []);
const applicationFingerprintCluster = new Set(files.filter(file =>
  (file === 'modules/data.ts' || file === 'modules/dev-corpus.ts' || file === 'modules/ports.ts' ||
   file === 'modules/state-slices.ts' || /^modules\/(?:input|persistence|state\/actions)\//u.test(file)) &&
  /\bfingerprint\b/u.test(readFileSync(file, 'utf8'))));
for (const file of applicationFingerprintCluster) {
  if (!expectedApplicationFingerprintCluster.has(file)) failures.push({ label: 'application fingerprint outside retained cluster', file, line: 0, text: 'amend NC-P15-004 inventory before expanding this boundary' });
}
for (const file of expectedApplicationFingerprintCluster) {
  if (!applicationFingerprintCluster.has(file)) failures.push({ label: 'stale application fingerprint retained-cluster contract', file, line: 0, text: 'remove/reclassify this boundary entry explicitly' });
}

for (const file of files.filter(file => file.startsWith('modules/') && file.endsWith('.ts') && !file.endsWith('.test.ts'))) {
  const source = readFileSync(file, 'utf8');
  const profileDeclarations = source.match(/\bprofile\??:\s*(?:string|ScoringProfile)\b/gu) ?? [];
  for (const declaration of profileDeclarations) {
    if (/ScoringProfile/u.test(declaration)) continue;
    if (file === 'modules/solver/hint-provenance.ts' && /profile\?:\s*string/u.test(declaration)) continue;
    failures.push({ label: 'unclassified naked profile declaration', file, line: 0, text: declaration });
  }
  const familyDeclarations = source.match(/\b(?:family|families|familyIds)\??:\s*(?:string|string\[\]|number)\b/gu) ?? [];
  for (const declaration of familyDeclarations) {
    if (file === 'modules/solver/known-solution-prefix-survival.ts') continue;
    failures.push({ label: 'unclassified naked family declaration', file, line: 0, text: declaration });
  }
  const residualDeclarations = source.match(/\bresidual\??:\s*[A-Za-z_$][\w$<>\[\]| ]*/gu) ?? [];
  for (const declaration of residualDeclarations) {
    failures.push({ label: 'unclassified naked residual declaration', file, line: 0, text: declaration });
  }
}

// Targeted semantic checks for the broad 8H "naked" rows. These pin the concrete exported/tooling
// contracts actually migrated in 8H without pretending every local variable named profile/family/
// fingerprint/residual is semantically wrong.
const targetedContracts = [
  {
    file: 'modules/solver/operational-research-types.d.ts',
    forbidden: [/\bprofile\s*:/gu, /\bfamily\s*:/gu],
    required: [/\bscoringProfile\s*:/gu, /\bsearchFamily\s*:/gu],
  },
  {
    file: 'scripts/import-published-levels.mjs',
    forbidden: [/export\s+function\s+fingerprint\s*\(/gu],
    required: [/export\s+function\s+levelFingerprint\s*\(/gu],
  },
  {
    file: 'scripts/stress/elite-prefix-dfs-ab.mjs',
    forbidden: [/\bprofile\s*:/gu],
    required: [/\bscoringProfile\s*:/gu],
  },
  {
    file: 'scripts/stress/solution-profile-lib.mjs',
    forbidden: [/\{\s*id\s*,\s*profile\s*\}/gu],
    required: [/solutionProfile/gu],
  },
  {
    file: 'modules/solver/known-solution-prefix-survival.ts',
    forbidden: [],
    required: [/KnownSolutionLabel[^\n]+family\?: string/gu, /familyIds: string\[\]/gu],
  },
  {
    file: 'modules/state-slices.ts',
    forbidden: [],
    required: [/fingerprint: string \| null/gu],
  },
  {
    file: 'modules/persistence/level-rating-repository.ts',
    forbidden: [],
    required: [/doc\(ratings\(\), fingerprint\)/gu],
  },
  {
    file: 'scripts/experiment-manifest-lib.mjs',
    forbidden: [],
    required: [/\btrove\b/gu],
  },
  {
    file: 'scripts/stress/cpsat-explicit-prefix-reference.mjs',
    forbidden: [],
    required: [/oracleLabel/gu, /oracleReason/gu],
  },
  {
    file: '.github/workflows/collect-prune-gap-labels.yml',
    forbidden: [/\batlas-sweep\b/gu],
    required: [/^name: collect-prune-gap-labels\b/gmu, /^  group: collect-prune-gap-labels$/gmu],
  },
  {
    file: '.github/workflows/cpsat-explicit-prefix-reference.yml',
    forbidden: [/^name:.*oracle/gimu, /^run-name:.*oracle/gimu, /^\s+name:.*oracle/gimu],
    required: [/^name: cpsat-explicit-prefix-reference$/gmu, /^run-name: "CP-SAT prefix reference/gmu, /oracle-shards/gu],
  },
];

for (const contract of targetedContracts) {
  let source;
  try {
    source = readFileSync(contract.file, 'utf8');
  } catch {
    failures.push({ label: 'missing canonical 8H contract', file: contract.file, line: 0, text: 'file missing' });
    continue;
  }
  for (const pattern of contract.forbidden) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push({ label: '8H naked API residue', file: contract.file, line: 0, text: String(pattern) });
  }
  for (const pattern of contract.required) {
    pattern.lastIndex = 0;
    if (!pattern.test(source)) failures.push({ label: '8H canonical API missing', file: contract.file, line: 0, text: String(pattern) });
  }
}

if (failures.length) {
  console.error(`Phase-8 post-merge closeout found ${failures.length} unclassified live legacy hit(s):`);
  for (const failure of failures) {
    console.error(`  - ${failure.label}: ${failure.file}${failure.line ? `:${failure.line}` : ''}${failure.text ? ` :: ${failure.text}` : ''}`);
  }
  process.exit(1);
}

console.log(`Phase-8 post-merge closeout clean: ${files.length} maintained text surfaces scanned; no unclassified live legacy spellings.`);
for (const hit of compatibilityHits) {
  console.log(`  retained compatibility read: ${hit.token} @ ${hit.file}:${hit.line}`);
}
console.log('Frozen naming-cleanup execution records/archives and mapping authorities were intentionally excluded from live-residue failure classification.');
