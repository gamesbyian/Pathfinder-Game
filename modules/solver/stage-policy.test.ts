import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createBudgetEnvelope, legacyStageTags, SOLVER_STAGE_IDS, SOLVER_STAGE_SPECS, solverStageSpec } from './stage-policy.js';
test('every policy stage has exactly one canonical spec and label', () => {
    assert.equal(Object.keys(SOLVER_STAGE_SPECS).length, SOLVER_STAGE_IDS.length);
    assert.equal(new Set(SOLVER_STAGE_IDS).size, SOLVER_STAGE_IDS.length);
    for (const id of SOLVER_STAGE_IDS) assert.equal(solverStageSpec(id).telemetryLabel, id);
    assert.throws(() => solverStageSpec('future-stage' as never), /Unknown solver stage/);
});
test('legacy markers derive from canonical stages', () => {
    assert.deepEqual(legacyStageTags('repair-probe-shrink-recovery'), { repairProbe: true, repairProbeShrinkRecovery: true });
    assert.deepEqual(legacyStageTags('mc-neighbor-budget-retry'), { mcNeighborBudgetRetry: true });
    assert.deepEqual(legacyStageTags('main-loop'), {});
});
test('budget envelopes preserve currencies, reserve direction, scope, and override origin', () => {
    const ordinary = createBudgetEnvelope({ stageId: 'main-loop', wallMs: 20_000, workUnits: 67_000_000 });
    assert.deepEqual([ordinary.wall.ceiling, ordinary.work.ceiling, ordinary.nodes.ceiling], [20_000, 67_000_000, null]);
    const offline = createBudgetEnvelope({ stageId: 'admissible-order', wallMs: 10_000, workUnits: 100_000, nodeCeiling: 8_000_000, explicitOverride: true, strictTotalWork: true, scope: 'whole-solve', headroom: { kind: 'withheld', amount: 2_000_000, sourceStageId: 'main-loop' } });
    assert.equal(offline.nodes.source, 'explicit-override'); assert.equal(offline.strictTotalWork, true); assert.equal(offline.headroom.kind, 'withheld');
    const retry = createBudgetEnvelope({ stageId: 'connectivity-axis-exhausted-retry', nodeCeiling: 12_000_000, headroom: { kind: 'additive', amount: 2_000_000, sourceStageId: 'main-loop' } });
    assert.equal(retry.headroom.kind, 'additive'); assert.equal(retry.nodes.ceiling, 12_000_000);
});
