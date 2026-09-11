import assert from 'node:assert/strict';
import { test } from 'vitest';
import { computeStageBudgetPlan } from './stage-budget.js';
import { defaultConfig } from './ablation-config.js';

const nodeBudget = 50_000_000;
const baseInput = {
    opts: {},
    timeBudgetMs: 20_000,
    nodeBudget,
    repairConfigsCount: 2,
    admissibleOrderConfigsCount: 4,
    admissibleOrderNonDefaultConfigsCount: 3,
    mainConfigsCount: 16,
    initialMustCrossMask: 1,
};

function cfg(overrides: Record<string, boolean>) {
    return { ...defaultConfig(), ...overrides };
}

test('budget planner treats null and explicit production defaults identically', () => {
    const nullPlan = computeStageBudgetPlan({ ...baseInput, cfg: null });
    const explicitPlan = computeStageBudgetPlan({ ...baseInput, cfg: defaultConfig() });
    assert.deepEqual(nullPlan, explicitPlan,
        'budget allocation must not depend on whether production defaults arrived as null or an explicit config');
    assert.equal(nullPlan.goalAttractionDisabledRetryNodeReserveEligible, true,
        'the promoted default-on node reserve must be active on the null production path');
});

test('budget planner suppresses behavior-identical whole-ladder retry capacity', () => {
    const control = computeStageBudgetPlan({ ...baseInput, cfg: defaultConfig() });
    assert.equal(control.diversityTierWillRun, true);
    assert.equal(control.coarseStateNearTieRetentionRetryTierWillRun, true);
    assert.equal(control.connectivityRetryTierWillRun, true);
    assert.equal(control.mcNeighborBudgetRetryTierWillRun, true);
    assert.equal(control.goalAttractionGuidanceDistanceRetryTierWillRun, true);

    const diversity = computeStageBudgetPlan({
        ...baseInput,
        cfg: cfg({
            SCORE_GOAL_ATTRACTION: false,
            STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE: true,
        }),
    });
    assert.equal(diversity.diversityTierWillRun, false);
    assert.equal(diversity.goalAttractionDisabledRetryNodeReserveEligible, false);
    assert.equal(diversity.goalAttractionDisabledRetryNodeReserve, 0,
        'an identical retry must not withhold main-search nodes it will never spend');

    const nearTie = computeStageBudgetPlan({
        ...baseInput,
        cfg: cfg({ STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION: false }),
    });
    assert.equal(nearTie.coarseStateNearTieRetentionRetryTierWillRun, false);
    assert.equal(nearTie.coarseStateNearTieRetentionRetryNodeReserve, 0);
    assert.equal(nearTie.coarseStateNearTieRetentionRetryNodeCeiling, nodeBudget,
        'a skipped additive retry must not extend the ceiling seen by later stages');

    const connectivity = computeStageBudgetPlan({
        ...baseInput,
        cfg: cfg({ PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false }),
    });
    assert.equal(connectivity.connectivityRetryTierWillRun, false);
    assert.equal(connectivity.connectivityRetryNodeReserve, 0);
    assert.equal(connectivity.connectivityRetryNodeCeiling, connectivity.nonDefaultRetryNodeCeiling);

    const mustCrossNeighbor = computeStageBudgetPlan({
        ...baseInput,
        cfg: cfg({ PRUNE_MC_NEIGHBOR_BUDGET: false }),
    });
    assert.equal(mustCrossNeighbor.mcNeighborBudgetRetryTierWillRun, false);
    assert.equal(mustCrossNeighbor.mcNeighborBudgetRetryNodeReserve, 0);
    assert.equal(mustCrossNeighbor.mcNeighborBudgetRetryNodeCeiling,
        mustCrossNeighbor.repairElitePrefixDfsRetryNodeCeiling);

    const guidanceDistance = computeStageBudgetPlan({
        ...baseInput,
        cfg: cfg({ SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE: true }),
    });
    assert.equal(guidanceDistance.goalAttractionGuidanceDistanceRetryTierWillRun, false);
    assert.equal(guidanceDistance.goalAttractionGuidanceDistanceRetryNodeReserve, 0);
    assert.equal(guidanceDistance.goalAttractionGuidanceDistanceRetryNodeCeiling,
        guidanceDistance.repairLateProbeNodeCeiling);
});
