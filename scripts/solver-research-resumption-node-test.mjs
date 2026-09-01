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
import { analyzeTechniqueCensus } from './analyze-technique-census.mjs';
import { buildResearchStatusIndex, queryResearchStatusIndex } from './research-status-index-lib.mjs';
import { createCellRunner } from './technique-census-cell.mjs';

const ROOT = process.cwd();

function assertMixedEraJoin(label, legacy, canonical, normalizer) {
  assert.notEqual(legacy, canonical, `${label}: fixture must contain two eras`);
  const raw = new Map([[legacy, 1], [canonical, 1]]);
  assert.equal(raw.size, 2, `${label}: raw grouping must demonstrate the split this gate prevents`);
  const joined = new Map();
  for (const [identity, weight] of raw) {
    const key = normalizer(identity);
    joined.set(key, (joined.get(key) ?? 0) + weight);
  }
  assert.equal(joined.size, 1, `${label}: owning normalizer must collapse mixed-era identities`);
  assert.equal([...joined.values()][0], 2, `${label}: mixed-era evidence weight must be preserved`);
}

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

// Prove the actual analysis layer, not only the parser, joins a historical compact winner to the
// canonical isolated-technique identity.
const analysisJoin = analyzeTechniqueCensus({ results: [{
  tier: 'T1',
  corpus: 'corpus2',
  levelId: 'mixed-era',
  levelPos: 1,
  techniqueKeys: ['beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain'],
  ok: false,
  status: 'exhausted',
  nodesExpanded: 20,
}] }, [{
  corpus: 'corpus2',
  levelId: 'mixed-era',
  wasSolvedByProduction: true,
  solvedByT1: [],
}], [100], [], [], [{
  corpus: 'corpus2',
  id: 'mixed-era',
  ok: true,
  winningConfig: 'beam:perimeterSweep/perimeterCW@beam2000',
  lifecycleWinningTechnique: 'admissible-order',
  attemptCount: 3,
  nodesExpanded: 40,
}]);
assert.equal(
  analysisJoin.reverseOracle.rows[0].matchingIsolatedStatus,
  'exhausted',
  'current technique-census analysis must join historical compact winningConfig to canonical technique identity',
);

// Replay every Phase-15 compatibility boundary through its already-owned executable proof rather
// than duplicating historical spellings here. These suites cover the external dataset-root
// transition, authentic v1 family-run normalization, mixed-era family-index discovery/precedence,
// known-prefix source/input normalization plus canonical writers, and prune-gap current CLI/report
// behavior.
for (const script of [
  'scripts/naming-cleanup-phase15c-dataset-root-node-test.mjs',
  'scripts/experiment-manifest-lib-check.mjs',
  'scripts/family-run-manifest-producer-node-test.mjs',
  'scripts/family-index-lib-check.mjs',
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
for (const current of [
  'solver:regression',
  'solver:measure-speed',
  'stress:measure-solver',
  'solver:direct',
  'solver:experiment-preflight',
]) {
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
// queue. The current preflight must accept a tiny strict-total-work control manifest.
const workstreams = readFileSync('docs/solver-optimization-workstreams.md', 'utf8');
assert.match(workstreams, /\| 2 \|[^\n]*\*\*ACTIVE FOUNDATION/u);
mkdirSync('tmp', { recursive: true });
const preflightPath = 'tmp/phase15i-post-naming-preflight.json';
execFileSync(process.execPath, [
  '--import', 'tsx', 'scripts/solver-experiment-preflight.mjs',
  '--corpus=data/levels.json',
  '--level-ids=P00001',
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
assert.deepEqual(preflight.levelIds, ['P00001']);

// Tiny REAL equal-work census execution on the current solver/data. This is a toolchain anchor,
// not decision-bearing research.
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

console.log('solver research resumption gate passed: mixed-era joins, owned Phase-15 compatibility suites, current research-status discovery, Workstream-2 preflight, and equal-work anchor are executable.');
