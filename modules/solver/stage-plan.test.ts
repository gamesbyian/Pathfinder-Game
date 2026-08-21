import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildSolverStagePlan } from './stage-plan.js';
import { computeStageBudgetPlan } from './stage-budget.js';
import { SOLVER_STAGE_IDS } from './stage-policy.js';

const baseInput = {
    opts: {},
    cfg: null,
    nodeBudget: Infinity,
    timeBudgetMs: 20000,
    repairConfigsCount: 2,
    admissibleOrderConfigsCount: 4,
    admissibleOrderNonDefaultConfigsCount: 3,
    mainConfigsCount: 16,
    initialMustCrossMask: 0,
};

test('buildSolverStagePlan covers every SOLVER_STAGE_IDS entry, in declared order, with an explicit eligible/undefined verdict', () => {
    const budgetPlan = computeStageBudgetPlan(baseInput);
    const plan = buildSolverStagePlan({ budgetPlan, mainLoopEligible: true });
    assert.deepEqual(plan.map(entry => entry.spec.id), [...SOLVER_STAGE_IDS]);
    // Stages this pre-probe plan cannot resolve report `undefined`, never a guessed boolean.
    assert.equal(plan.find(entry => entry.spec.id === 'prime')!.eligible, undefined);
    assert.equal(plan.find(entry => entry.spec.id === 'portfolio-pass')!.eligible, undefined);
    assert.equal(plan.find(entry => entry.spec.id === 'portfolio-fallback')!.eligible, undefined);
    assert.equal(plan.find(entry => entry.spec.id === 'repair-probe-shrink-recovery')!.eligible, undefined);
    // Every other stage resolves to a real boolean.
    for (const entry of plan) {
        if (['prime', 'portfolio-pass', 'portfolio-fallback', 'repair-probe-shrink-recovery'].includes(entry.spec.id)) continue;
        assert.equal(typeof entry.eligible, 'boolean', `${entry.spec.id} must resolve to a boolean`);
    }
});

test('buildSolverStagePlan.eligible agrees with computeStageBudgetPlan.xTierWillRun for every retry tier — one canonical source, two read paths', () => {
    const nodeBudget = 50_000_000;
    const budgetPlan = computeStageBudgetPlan({ ...baseInput, nodeBudget, initialMustCrossMask: 0b1, repairConfigsCount: 0 });
    const plan = buildSolverStagePlan({ budgetPlan, mainLoopEligible: true });
    const eligible = (id: string) => plan.find(entry => entry.spec.id === id)!.eligible;
    assert.equal(eligible('repair-probe'), budgetPlan.repairProbeTierWillRun);
    assert.equal(eligible('repair-fallback'), budgetPlan.repairFallbackTierWillRun);
    assert.equal(eligible('attraction-diversity'), budgetPlan.diversityTierWillRun);
    assert.equal(eligible('admissible-order'), budgetPlan.admissibleOrderTierWillRun);
    assert.equal(eligible('dedup-near-tie-retry'), budgetPlan.dedupRetryTierWillRun);
    assert.equal(eligible('admissible-order-non-default-retry'), budgetPlan.nonDefaultRetryTierWillRun);
    assert.equal(eligible('connectivity-axis-exhausted-retry'), budgetPlan.connectivityRetryTierWillRun);
    assert.equal(eligible('repair-elite-prefix-dfs-retry'), budgetPlan.repairElitePrefixDfsRetryTierWillRun);
    assert.equal(eligible('mc-neighbor-budget-retry'), budgetPlan.mcNeighborBudgetRetryTierWillRun);
    // repairConfigsCount: 0 makes repair-late-probe's structural precondition hold.
    assert.equal(eligible('repair-late-probe'), true);
    assert.equal(eligible('repair-late-probe'), budgetPlan.repairLateProbeTierWillRun);
});

test('repair-probe-shrink-recovery resolves once repairProbeShrunkTierCount is supplied', () => {
    const budgetPlan = computeStageBudgetPlan({
        ...baseInput, nodeBudget: 50_000_000,
        cfg: { STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY: true, STRATEGY_REPAIR_PROBE: true, STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET: true },
    });
    const noneShrunk = buildSolverStagePlan({ budgetPlan, mainLoopEligible: true, repairProbeShrunkTierCount: 0 });
    assert.equal(noneShrunk.find(entry => entry.spec.id === 'repair-probe-shrink-recovery')!.eligible, false);
    const oneShrunk = buildSolverStagePlan({ budgetPlan, mainLoopEligible: true, repairProbeShrunkTierCount: 1 });
    assert.equal(oneShrunk.find(entry => entry.spec.id === 'repair-probe-shrink-recovery')!.eligible, true);
});
