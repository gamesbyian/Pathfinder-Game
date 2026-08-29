import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NormalizedLevel } from '../domain/types.js';
import { PACK } from './encoding.js';
import { solveLevel } from './orchestration.js';

function makeLateEarlyRepairSearchEligibleInfeasibleLevel(): NormalizedLevel {
    return {
        grid: { w: 3, h: 1 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(2, 0),
        reqLen: 4,
        reqInt: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('disableExtraBudgetPasses suppresses late repair probe when no explicit override is supplied', async () => {
    const level = makeLateEarlyRepairSearchEligibleInfeasibleLevel();

    const enabled = await solveLevel(level, {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_LATE_PROBE: true },
        repairLateProbeNodeBudgetOverride: 100,
        repairBudgetFractionOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        dedupNearTieRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
    });
    assert.ok(enabled.attempts.some(attempt => attempt.stageId === 'late-repair-search'),
        'fixture must actually reach the late repair probe when explicitly enabled');

    const suppressed = await solveLevel(level, {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_LATE_PROBE: true },
        disableExtraBudgetPasses: true,
    });
    assert.equal(suppressed.attempts.some(attempt => attempt.stageId === 'late-repair-search'), false,
        'global extra-budget suppression must prevent the late repair probe unless explicitly overridden');
});
