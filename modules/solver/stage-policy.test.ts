import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createBudgetEnvelope, legacyStageTags, normalizeSolverStageId, SOLVER_STAGE_IDS, SOLVER_STAGE_SPECS, solverStageSpec, withSolverStage } from './stage-policy.js';
test('every policy stage has exactly one canonical spec and label', () => {
    assert.equal(Object.keys(SOLVER_STAGE_SPECS).length, SOLVER_STAGE_IDS.length);
    assert.equal(new Set(SOLVER_STAGE_IDS).size, SOLVER_STAGE_IDS.length);
    for (const id of SOLVER_STAGE_IDS) assert.equal(solverStageSpec(id).telemetryLabel, id);
    assert.throws(() => solverStageSpec('future-stage' as never), /Unknown solver stage/);
});
test('production retry metadata reports current production-default policy status', () => {
    for (const id of [
        'coarse-state-near-tie-retention-disabled-retry',
        'admissible-order-alternate-tiebreak-retry',
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
test('withSolverStage single-writes canonical stageId without legacy boolean tags', () => {
    assert.deepEqual(withSolverStage({ ok: true }, 'early-repair-search'), { ok: true, stageId: 'early-repair-search' });
    assert.deepEqual(withSolverStage({ ok: true }, 'goal-attraction-disabled-retry'), { ok: true, stageId: 'goal-attraction-disabled-retry' });
});

test('budget envelopes preserve currencies, reserve direction, scope, and override origin', () => {
    const ordinary = createBudgetEnvelope({ stageId: 'main-search', wallMs: 20_000, workUnits: 67_000_000 });
    assert.deepEqual([ordinary.wall.ceiling, ordinary.work.ceiling, ordinary.nodes.ceiling], [20_000, 67_000_000, null]);
    const offline = createBudgetEnvelope({ stageId: 'admissible-order-fallback', wallMs: 10_000, workUnits: 100_000, nodeCeiling: 8_000_000, explicitOverride: true, strictTotalWork: true, scope: 'whole-solve', headroom: { kind: 'withheld', amount: 2_000_000, sourceStageId: 'main-search' } });
    assert.equal(offline.nodes.source, 'explicit-override'); assert.equal(offline.strictTotalWork, true); assert.equal(offline.headroom.kind, 'withheld');
    const retry = createBudgetEnvelope({ stageId: 'connectivity-axis-prune-disabled-retry', nodeCeiling: 12_000_000, headroom: { kind: 'additive', amount: 2_000_000, sourceStageId: 'main-search' } });
    assert.equal(retry.headroom.kind, 'additive'); assert.equal(retry.nodes.ceiling, 12_000_000);
});
test('every historical stage ID normalizes to exactly one canonical identity without changing canonical IDs', () => {
    const historicalCases = {
        prime: 'explicit-prime',
        'repair-probe': 'early-repair-search',
        'main-loop': 'main-search',
        'attraction-diversity': 'goal-attraction-disabled-retry',
        'repair-probe-shrink-recovery': 'repair-shrink-recovery',
        'admissible-order': 'admissible-order-fallback',
        'dedup-near-tie-retry': 'coarse-state-near-tie-retention-disabled-retry',
        'admissible-order-non-default-retry': 'admissible-order-alternate-tiebreak-retry',
        'connectivity-axis-exhausted-retry': 'connectivity-axis-prune-disabled-retry',
        'mc-neighbor-budget-retry': 'must-cross-neighbor-prune-disabled-retry',
        'repair-late-probe': 'late-repair-search',
        'goal-attraction-legacy-distance-retry': 'guidance-goal-distance-retry',
        'repair-late-probe-multi-seed-retry': 'late-repair-multiseed-retry',
        'portfolio-pass': 'legacy-latency-portfolio-pass',
        'portfolio-fallback': 'legacy-latency-portfolio-fallback',
    } as const;
    for (const [legacy, canonical] of Object.entries(historicalCases)) {
        assert.equal(normalizeSolverStageId(legacy), canonical, legacy);
    }
    for (const canonical of SOLVER_STAGE_IDS) {
        assert.equal(normalizeSolverStageId(canonical), canonical, canonical);
    }
    assert.equal(new Set(Object.values(historicalCases)).size, Object.keys(historicalCases).length,
        'distinct historical stage IDs must not collapse to one canonical identity');
    assert.throws(() => normalizeSolverStageId('not-a-stage'), /Unknown solver stage/);
});
