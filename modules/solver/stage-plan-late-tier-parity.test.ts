import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildSolverStagePlan } from './stage-plan.js';
import { computeStageBudgetPlan } from './stage-budget.js';

const baseInput = {
    opts: {},
    cfg: null,
    nodeBudget: 50_000_000,
    timeBudgetMs: 20_000,
    repairConfigsCount: 0,
    admissibleOrderConfigsCount: 4,
    admissibleOrderNonDefaultConfigsCount: 3,
    mainConfigsCount: 16,
    initialMustCrossMask: 0,
};

test('late promoted retry stages use the same eligibility verdict in budget and scheduler plans', () => {
    const budgetPlan = computeStageBudgetPlan(baseInput);
    const plan = buildSolverStagePlan({ budgetPlan, mainSearchEligible: true });
    const eligible = (id: string) => plan.find(entry => entry.spec.id === id)!.eligible;

    assert.equal(
        eligible('guidance-goal-distance-retry'),
        budgetPlan.goalAttractionGuidanceDistanceRetryTierWillRun,
    );
    assert.equal(
        eligible('late-repair-multiseed-retry'),
        budgetPlan.repairLateProbeMultiSeedRetryTierWillRun,
    );
});
