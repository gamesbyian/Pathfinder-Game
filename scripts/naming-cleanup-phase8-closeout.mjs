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
  ['hint-path-oracle filename', /hint-path-oracle\.mjs/gu],
  ['hint-path-oracle package alias', /test:hint-path-oracle\b/gu],
  ['CP-SAT full-probe filename', /cpsat-full-probe\.py/gu],
  ['CP-SAT explicit-prefix oracle filename', /cpsat-explicit-prefix-oracle\.mjs/gu],
  ['research-lineage module', /research-lineage\.ts/gu],
  ['WinningPrefixIndex type', /\bWinningPrefixIndex\b/gu],
  ['WinningLineageObserver type', /\bWinningLineageObserver\b/gu],
  ['LineageStageSummary type', /\bLineageStageSummary\b/gu],
  ['winning-lineage collector', /winning-lineage-pilot/gu],
  ['winning-prefix-atlas collector', /winning-prefix-atlas-pilot/gu],
  ['winning lineage phrase', /\bwinning lineage\b/giu],
  ['atlas sweep filename/workflow', /\batlas-sweep(?:\.mjs|\.ya?ml)?\b/gu],
  ['branch atlas phrase', /\bbranch atlas\b/giu],
  ['family-wide trove manifest', /family-wide-trove-manifest\.mjs/gu],
  ['family-wide trove shard runner', /family-wide-trove-shard-run\.mjs/gu],
  ['family-wide trove shard planner', /family-wide-trove-shard-slice\.mjs/gu],
  ['family-wide trove combiner', /family-wide-trove-combine\.mjs/gu],
  ['family trove doctor', /family-trove-doctor\.mjs/gu],
  ['family trove package alias', /family:trove:doctor\b/gu],
  ['TROVE_BRANCH local', /\bTROVE_BRANCH\b/gu],
  ['technique-census second-order tool', /technique-census-second-order\.mjs/gu],
  ['technique-census second-order doc', /technique-census-second-order-analysis\.md/gu],
  ['equal-work census pilot', /analyze-equal-work-census-pilot\.mjs/gu],
  ['audit-export tool', /run-audit-export\.mjs/gu],
  ['audit-export workflow', /(?:^|[/"'])audit-export\.ya?ml\b/gmu],
  ['audit:newhint:full package alias', /audit:newhint:full\b/gu],
  ['repair-direct probe', /repair-direct-probe(?:-worker)?\.mjs/gu],
  ['producer-population pilot', /producer-population-pilot/gu],
  ['residual-interface pilot', /residual-interface-(?:mining-)?pilot/gu],
  ['repair-rollback pilot', /repair-rollback-(?:census-)?pilot/gu],
  ['symmetry-repair-seed pilot', /symmetry-repair-seed-pilot/gu],
  ['restart-continuation pilot', /restart-continuation-population-pilot/gu],
  ['candidate archetype audit filename', /confirm-residual-001-archetype-audit\.mjs/gu],
  ['portfolio scheduler report', /portfolio-scheduler-report\.mjs/gu],
  ['portfolio report alias', /solver:portfolio-report\b/gu],
  ['portfolio historical replay', /portfolio-historical-replay\.mjs/gu],
  ['portfolio replay alias', /solver:portfolio-replay\b/gu],
  ['gha-result filename', /(?<!fetch-)(?:scripts\/)?gha-result\.mjs/gu],
  ['gha:result alias', /\bgha:result\b/gu],
  ['shadow-eval harness doc', /solver-shadow-eval-harness\.md/gu],
  ['interface-probe harness', /interface-probe-harness\.mjs/gu],
  ['receptor terminology', /\breceptor(?:s| limitation| can rediscover)?\b/giu],
  ['winning-path archaeology phrase', /\bwinning-path archaeology\b/giu],
  ['winning-path archaeology filename', /winning-path-archaeology\.mjs/gu],
];


const intentionalLegacyByLabel = new Map([
  ['winning-prefix-atlas collector', new Set([
    '.github/workflows/cpsat-explicit-prefix-reference.yml',
  ])],
  ['producer-population pilot', new Set([
    'modules/solver/repair-search.ts',
    'scripts/stress/compare-search-producer-populations.mjs',
  ])],
  ['repair-rollback pilot', new Set([
    'scripts/stress/census-repair-rollback-windows.mjs',
  ])],
]);

const compatibilityAllowlist = new Map([
  ['PATHFINDER_VARIANT_TROVE', new Set([
    'scripts/validate-variant-family-dataset-worktree.mjs',
    'scripts/validate-variant-family-dataset-worktree-node-test.mjs',
  ])],
  ['knownHardCluster', new Set([
    'scripts/analyze-solver-diagnostics.mjs',
  ])],
  ['recommendedGating', new Set([
    'scripts/analyze-solver-diagnostics.mjs',
  ])],
]);

const compatibilityChecks = [
  ['PATHFINDER_VARIANT_TROVE', /\bPATHFINDER_VARIANT_TROVE\b/gu],
  ['knownHardCluster', /\bknownHardCluster\b/gu],
  ['recommendedGating', /\brecommendedGating\b/gu],
];

const failures = [];
const compatibilityHits = [];

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
