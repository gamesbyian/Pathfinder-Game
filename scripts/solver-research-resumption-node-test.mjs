#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { normalizeAttemptActionKey, normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import { normalizeSolverStageId } from '../modules/solver/stage-id-normalization.mjs';
import { normalizeRoutingRegime } from '../modules/solver/routing-regime-normalization.mjs';
import { variantFamilyDatasetRootArg } from './family-paths.mjs';
import { buildFamilyEvaluationRunManifest, validateFamilyEvaluationRunManifest } from './experiment-manifest-lib.mjs';
import { buildFamilyIndex, queryFamilyIndex } from './family-index-lib.mjs';
import { extractExplicitPrefixCases } from './stress/cpsat-explicit-prefix-reference-lib.mjs';
import { analyzeTechniqueCensus } from './analyze-technique-census.mjs';
import { buildResearchStatusIndex, queryResearchStatusIndex } from './research-status-index-lib.mjs';
import { createCellRunner } from './technique-census-cell.mjs';

const ROOT = process.cwd();

function normalizedJoin(values, normalizer) {
  const groups = new Map();
  for (const value of values) {
    const canonical = normalizer(value.identity);
    groups.set(canonical, (groups.get(canonical) ?? 0) + value.weight);
  }
  return groups;
}

function assertMixedEraJoin(label, legacy, canonical, normalizer) {
  assert.notEqual(legacy, canonical, `${label}: fixture must actually contain two eras`);
  const raw = new Map([[legacy, 1], [canonical, 1]]);
  assert.equal(raw.size, 2, `${label}: raw-string grouping must demonstrate the split this gate prevents`);
  const joined = normalizedJoin([{ identity: legacy, weight: 1 }, { identity: canonical, weight: 1 }], normalizer);
  assert.equal(joined.size, 1, `${label}: owning normalizer must collapse mixed-era identities`);
  assert.equal([...joined.values()][0], 2, `${label}: mixed-era evidence weight must be preserved`);
}

// Historical identity families used by current solver research must join through their named owner,
// not merely parse correctly one record at a time.
assertMixedEraJoin(
  'attempt identity',
  'beam:intersectionHarvest@beam5000(diverse)',
  'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets',
  normalizeAttemptIdentityKey,
);
assertMixedEraJoin(
  'composite attempt action',
  'repair-probe|dfs:repair:repair|seedSalt=0',
  'early-repair-search|repair|score=repair|guidance=standard|seedSalt=0',
  normalizeAttemptActionKey,
);
assertMixedEraJoin('solver stage', 'main-loop', 'main-search', normalizeSolverStageId);
assertMixedEraJoin('routing regime', 'high-intersection-burden', 'intersection-heavy', normalizeRoutingRegime);

assert.equal(normalizeSolverStageId('portfolio-pass'), 'legacy-latency-portfolio-pass');
assert.equal(normalizeRoutingRegime('default'), 'general');
assert.equal(normalizeRoutingRegime('portal-heavy'), 'multi-portal');

// Current analysis tooling itself must join a historical compact winningConfig to a canonical
// isolated-technique census identity.
const analysisJoin = analyzeTechniqueCensus({ results: [
  {
    tier: 'T1', corpus: 'corpus2', levelId: 'mixed-era', levelPos: 1,
    techniqueKeys: ['beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain'],
    ok: false, status: 'exhausted', nodesExpanded: 20,
  },
] }, [
  { corpus: 'corpus2', levelId: 'mixed-era', wasSolvedByProduction: true, solvedByT1: [] },
], [100], [], [], [
  {
    corpus: 'corpus2', id: 'mixed-era', ok: true,
    winningConfig: 'beam:perimeterSweep/perimeterCW@beam2000',
    lifecycleWinningTechnique: 'admissible-order', attemptCount: 3, nodesExpanded: 40,
  },
]);
assert.equal(
  analysisJoin.reverseOracle.rows[0].matchingIsolatedStatus,
  'exhausted',
  'current technique-census analysis must join legacy compact winningConfig to canonical technique identity',
);

// Phase-15 external family-root alias: same external boundary, one owner, canonical internal path.
const rootFixture = path.join(tmpdir(), 'phase15i-family-root');
assert.equal(variantFamilyDatasetRootArg([`--trove-root=${rootFixture}`]), path.resolve(rootFixture));
assert.equal(variantFamilyDatasetRootArg([`--variant-family-dataset-root=${rootFixture}`]), path.resolve(rootFixture));
assert.equal(
  variantFamilyDatasetRootArg([`--trove-root=${rootFixture}`, `--variant-family-dataset-root=${rootFixture}`]),
  path.resolve(rootFixture),
);

// Authentic schema-v1 family-run fixture must permanently normalize into the canonical v2 model.
const legacyFamilyRun = JSON.parse(readFileSync(
  'docs/naming-cleanup-phase-records/fixtures/phase15d-family-run-manifest-v1.json',
  'utf8',
));
const normalizedFamilyRun = validateFamilyEvaluationRunManifest(legacyFamilyRun);
assert.equal(legacyFamilyRun.schemaVersion, 1);
assert.ok('trove' in legacyFamilyRun);
assert.equal(normalizedFamilyRun.schemaVersion, 2);
assert.equal('trove' in normalizedFamilyRun, false);
assert.ok(normalizedFamilyRun.variantFamilyDataset);

const canonicalFamilyRun = buildFamilyEvaluationRunManifest({
  runId: 'phase15i-canonical-run',
  tool: 'solver-research-resumption-node-test.mjs',
  workflow: 'direct',
  corpora: ['corpus-a'],
  families: ['corpus-a:P1'],
  variantFamilyDataset: {
    manifest: 'data/families/variant-family-dataset-manifest.json',
    shardFile: 'logs/family-census/phase15i-shard.json',
  },
  solverPolicy: { mode: 'production', profile: null, config: null, flags: {}, strictTotalWorkBudget: true },
  budgets: { workUnits: 10_000, nodeCeiling: null, wallDeadlineMs: 5_000 },
  seeds: [20260901],
  shardCount: 1,
  shardIndex: 1,
  startedAt: '2026-09-01T00:00:00Z',
  completedAt: '2026-09-01T00:00:01Z',
  outputArtifacts: [],
  sourceGenerationArtifacts: [],
  solver: { commit: '0123456789abcdef0123456789abcdef01234567', ref: 'main', dirty: false },
});
assert.equal(canonicalFamilyRun.schemaVersion, 2);
assert.ok('variantFamilyDataset' in canonicalFamilyRun);
assert.equal('trove' in canonicalFamilyRun, false, 'current family-run writer must be canonical-only');

// Family-index must combine eras at the real discovery boundary without double-counting the frozen
// wide-trove aggregate when canonical current aggregate evidence exists for the same corpus.
const familyRoot = mkdtempSync(path.join(tmpdir(), 'phase15i-family-index-'));
try {
  mkdirSync(path.join(familyRoot, 'data/families/corpus-a'), { recursive: true });
  mkdirSync(path.join(familyRoot, 'reports/families'), { recursive: true });
  writeFileSync(path.join(familyRoot, 'data/families/corpus-a/family-P1-sym-manifest.json'), JSON.stringify({
    familyId: 'family-P1-w0-symmetry',
    parentLevelId: 'P1',
    parentCorpus: 'data/stress/stress-levels.json',
    familyMode: 'symmetry',
    variants: [{ variantId: 'V1', relation: 'symmetry', mutationManifest: { operation: 'transform' } }],
  }));
  writeFileSync(
    path.join(familyRoot, 'reports/families/2026-08-07-wide-trove-attempts-corpus-a-part01.json'),
    JSON.stringify({ levels: [{ id: 'V1', parentId: 'P1', corpus: 'corpus-a', ok: true, workSpent: 111 }] }),
  );
  writeFileSync(
    path.join(familyRoot, 'reports/families/variant-family-dataset-attempts-corpus-a-part01.json'),
    JSON.stringify({ levels: [{ id: 'V1', parentId: 'P1', corpus: 'corpus-a', ok: false, workSpent: 222 }] }),
  );
  const index = buildFamilyIndex(familyRoot);
  const variant = queryFamilyIndex(index, { parentId: 'P1', variantId: 'V1' }).variants[0];
  assert.equal(variant.evidence.length, 1, 'canonical aggregate must suppress duplicate historical aggregate for the same corpus');
  assert.equal(variant.evidence[0].work, 222);
  assert.match(variant.evidence[0].evidencePath, /variant-family-dataset-attempts-corpus-a-part01\.json$/u);
} finally {
  rmSync(familyRoot, { recursive: true, force: true });
}

// Authentic known-prefix schema-v1 evidence remains readable through the one current source
// normalizer. Canonical and transition input spellings select exactly the same canonical cases.
const legacyPrefixDocument = JSON.parse(readFileSync(
  'docs/naming-cleanup-phase-records/fixtures/phase15-winning-prefix-v1.json',
  'utf8',
));
const legacyFormatCases = extractExplicitPrefixCases(legacyPrefixDocument, { format: 'atlas-abstain' });
const canonicalFormatCases = extractExplicitPrefixCases(legacyPrefixDocument, { format: 'reference-abstain' });
assert.ok(legacyFormatCases.length > 0);
assert.deepEqual(legacyFormatCases, canonicalFormatCases);
assert.ok(canonicalFormatCases.every(row => row.sourceLabel === 'reference-abstain'));

// Current stronger Phase-15 writer/CLI checks are part of the resumption gate rather than merely
// coexisting elsewhere in test:node.
for (const script of [
  'scripts/naming-cleanup-phase15g-reference-node-test.mjs',
  'scripts/naming-cleanup-phase15h-node-test.mjs',
]) {
  execFileSync(process.execPath, [script], { cwd: ROOT, stdio: 'pipe' });
}

// Canonical research-status queries must recover frozen evidence written only in historical
// stage/routing vocabulary, and legacy/canonical queries must resolve the same evidence.
const statusRoot = mkdtempSync(path.join(tmpdir(), 'phase15i-research-status-'));
try {
  mkdirSync(path.join(statusRoot, 'docs'), { recursive: true });
  mkdirSync(path.join(statusRoot, 'reports'), { recursive: true });
  writeFileSync(path.join(statusRoot, 'docs/solver-optimization-workstreams.md'), `# Solver optimization workstreams
## Active workstreams
| ID | Workstream | State | Next gate |
|---:|---|---|---|
| 2 | Budget model | **ACTIVE** | Continue fixed-work pricing. |
`);
  writeFileSync(path.join(statusRoot, 'docs/solver-opt-in-experiment-ledger.md'), '# Ledger\n');
  writeFileSync(path.join(statusRoot, 'reports/2026-01-01-legacy.md'), `# Legacy
## Repair-probe starvation
Historical stage evidence.
## High-intersection-burden cohort
Historical routing evidence.
`);
  const index = buildResearchStatusIndex(statusRoot);
  const canonicalStage = queryResearchStatusIndex(index, { query: 'early-repair-search' }).map(row => row.id);
  const legacyStage = queryResearchStatusIndex(index, { query: 'repair-probe' }).map(row => row.id);
  const canonicalRouting = queryResearchStatusIndex(index, { query: 'intersection-heavy' }).map(row => row.id);
  const legacyRouting = queryResearchStatusIndex(index, { query: 'high-intersection-burden' }).map(row => row.id);
  assert.deepEqual(canonicalStage, legacyStage);
  assert.deepEqual(canonicalRouting, legacyRouting);
  assert.deepEqual(canonicalStage, ['legacy']);
  assert.deepEqual(canonicalRouting, ['legacy']);
} finally {
  rmSync(statusRoot, { recursive: true, force: true });
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
for (const current of ['solver:regression', 'solver:measure-speed', 'stress:measure-solver', 'solver:direct', 'solver:experiment-preflight']) {
  assert.equal(typeof pkg.scripts?.[current], 'string', `current command missing: ${current}`);
}
for (const retired of [
  ['solver:', 'bench'].join(''),
  ['solver:', 'speed-', 'probe'].join(''),
  ['stress:', 'bench', 'mark'].join(''),
]) {
  assert.equal(pkg.scripts?.[retired], undefined, `retired command unexpectedly live: ${retired}`);
}
assert.match(pkg.scripts['solver:direct'], /run-solver-direct\.mjs/u);

// Workstream 2 remains the active foundation. Naming work must not silently reorder the research
// queue, and the current preflight must accept a tiny strict-total-work control manifest.
const workstreams = readFileSync('docs/solver-optimization-workstreams.md', 'utf8');
assert.match(workstreams, /\| 2 \|[^\n]*\*\*ACTIVE FOUNDATION/u);
mkdirSync('tmp', { recursive: true });
const preflightPath = 'tmp/phase15i-post-naming-preflight.json';
execFileSync(process.execPath, [
  '--import', 'tsx', 'scripts/solver-experiment-preflight.mjs',
  '--corpus=data/stress/stress-levels-random.json',
  '--level-ids=R00001',
  '--experiment-id=phase15i-post-naming-anchor',
  '--run-id=phase15i-post-naming-anchor-control',
  '--arm=control',
  `--output=${preflightPath}`,
  '--work-budget=10000',
  '--wall-deadline-ms=5000',
  '--budget-protocol=strict-total-work',
  '--profile=default',
  '--instrumentation=off',
  '--allow-dirty',
], { cwd: ROOT, stdio: 'pipe' });
const preflight = JSON.parse(readFileSync(preflightPath, 'utf8'));
assert.equal(preflight.arm, 'control');
assert.equal(preflight.budgetProtocol, 'strict-total-work');
assert.equal(preflight.canonicalWorkBudget, 10_000);
assert.deepEqual(preflight.levelIds, ['R00001']);

// Execute one tiny REAL equal-work census cell on current solver/data. This is a toolchain anchor,
// not decision-bearing research; it proves the post-naming equal-work path can still execute.
const { runCell } = await createCellRunner();
const anchor = await runCell({
  cellId: 'phase15i-post-naming-anchor',
  tier: 'EW-ANCHOR',
  corpus: 'published',
  levelPos: 1,
  techniqueKeys: ['dfs|score=default|bias=none'],
  nodeBudget: Number.POSITIVE_INFINITY,
  workBudget: 10_000,
  budgetMs: 5_000,
});
assert.equal(anchor.cellId, 'phase15i-post-naming-anchor');
assert.equal(anchor.workBudget, 10_000);
assert.ok(Number.isFinite(anchor.workSpent) && anchor.workSpent >= 0);
assert.ok(['success', 'work-budget-reached', 'exhausted'].includes(anchor.status), `unexpected anchor status ${anchor.status}`);
assert.notEqual(anchor.status, 'deadline-truncated', 'anchor must not be right-censored by wall time');
assert.notEqual(anchor.status, 'error');
const anchorPath = 'tmp/phase15i-post-naming-equal-work-anchor.json';
const stableAnchor = {
  cellId: anchor.cellId,
  tier: anchor.tier,
  corpus: anchor.corpus,
  levelId: anchor.levelId,
  levelPos: anchor.levelPos,
  techniqueKeys: anchor.techniqueKeys,
  workBudget: anchor.workBudget,
  workSpent: anchor.workSpent,
  ok: anchor.ok,
  status: anchor.status,
  refereeValid: anchor.refereeValid,
  winningConfigKey: anchor.winningConfigKey,
  nodesExpanded: anchor.nodesExpanded,
};
writeFileSync(anchorPath, `${JSON.stringify(stableAnchor, null, 2)}\n`);
console.log(`POST_NAMING_EQUAL_WORK_ANCHOR path=${anchorPath} data=${JSON.stringify(stableAnchor)}`);

const bridge = readFileSync(new URL('../docs/solver-research-post-naming-resumption.md', import.meta.url), 'utf8');
for (const required of [
  'normalizeAttemptIdentityKey',
  'normalizeAttemptActionKey',
  'normalizeSolverStageId',
  'normalizeRoutingRegime',
  'readRawChallengeMetrics',
  'solver:regression',
  ...Array.from({ length: 14 }, (_, i) => `NC-P15-${String(i + 1).padStart(3, '0')}`),
]) {
  assert.ok(bridge.includes(required), `resumption bridge missing required contract reference: ${required}`);
}
assert.match(bridge, /no maintained historical schema-v1 result reader/u);
assert.doesNotMatch(bridge, /pre-Phase-15 handoff contract/u);

console.log('solver research resumption gate passed: mixed-era joins, Phase-15 readers/writers, current research-status discovery, Workstream-2 preflight, and equal-work anchor are executable.');
