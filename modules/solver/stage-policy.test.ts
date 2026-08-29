import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createBudgetEnvelope, legacyStageTags, normalizeSolverStageId, SOLVER_STAGE_IDS, SOLVER_STAGE_SPECS, solverStageSpec } from './stage-policy.js';
test('every policy stage has exactly one canonical spec and label', () => {
    assert.equal(Object.keys(SOLVER_STAGE_SPECS).length, SOLVER_STAGE_IDS.length);
    assert.equal(new Set(SOLVER_STAGE_IDS).size, SOLVER_STAGE_IDS.length);
    for (const id of SOLVER_STAGE_IDS) assert.equal(solverStageSpec(id).telemetryLabel, id);
    assert.throws(() => solverStageSpec('future-stage' as never), /Unknown solver stage/);
});
test('production retry metadata reports current production-default policy status', () => {
    for (const id of [
        'coarse-state-near-tie-retention-disabled-retry',
        'admissible-order-fallback-fallback-alternate-tiebreak-retry',
        'connectivity-axis-prune-disabled-retry',
        'must-cross-neighbor-prune-disabled-retry',
        'late-repair-search',
        'guidance-goal-distance-retry',
        'late-repair-multiseed-retry',
    ] as const) {
        assert.equal(solverStageSpec(id).disposition, 'production-default', `${id} policy status drifted from production-default`);
    }
    assert.equal(solverStageSpec('repair-shrink-recovery').disposition, 'opt-in');
    assert.equal(solverStageSpec('repair-elite-prefix-dfs-retry').disposition, 'opt-in');
});
test('legacy markers derive from canonical stages', () => {
    assert.deepEqual(legacyStageTags('repair-shrink-recovery'), { repairProbe: true, repairProbeShrinkRecovery: true });
    assert.deepEqual(legacyStageTags('must-cross-neighbor-prune-disabled-retry'), { mcNeighborBudgetRetry: true });
    assert.deepEqual(legacyStageTags('main-search'), {});
});
test('budget envelopes preserve currencies, reserve direction, scope, and override origin', () => {
    const ordinary = createBudgetEnvelope({ stageId: 'main-search', wallMs: 20_000, workUnits: 67_000_000 });
    assert.deepEqual([ordinary.wall.ceiling, ordinary.work.ceiling, ordinary.nodes.ceiling], [20_000, 67_000_000, null]);
    const offline = createBudgetEnvelope({ stageId: 'admissible-order-fallback-fallback', wallMs: 10_000, workUnits: 100_000, nodeCeiling: 8_000_000, explicitOverride: true, strictTotalWork: true, scope: 'whole-solve', headroom: { kind: 'withheld', amount: 2_000_000, sourceStageId: 'main-search' } });
    assert.equal(offline.nodes.source, 'explicit-override'); assert.equal(offline.strictTotalWork, true); assert.equal(offline.headroom.kind, 'withheld');
    const retry = createBudgetEnvelope({ stageId: 'connectivity-axis-prune-disabled-retry', nodeCeiling: 12_000_000, headroom: { kind: 'additive', amount: 2_000_000, sourceStageId: 'main-search' } });
    assert.equal(retry.headroom.kind, 'additive'); assert.equal(retry.nodes.ceiling, 12_000_000);
});
test('legacy stage IDs normalize to canonical identities without changing canonical IDs', () => {
    assert.equal(normalizeSolverStageId('repair-probe'), 'early-repair-search');
    assert.equal(normalizeSolverStageId('main-loop'), 'main-search');
    assert.equal(normalizeSolverStageId('portfolio-pass'), 'legacy-latency-portfolio-pass');
    assert.equal(normalizeSolverStageId('guidance-goal-distance-retry'), 'guidance-goal-distance-retry');
    assert.throws(() => normalizeSolverStageId('not-a-stage'), /Unknown solver stage/);
});
