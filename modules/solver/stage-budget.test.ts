import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    computeStageBudgetPlan, computeShrinkRecoveryBudget, buildStageBudgetEnvelopes, envelopeNodeCeiling,
    ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION, COARSE_STATE_NEAR_TIE_RETENTION_RETRY_NODE_RESERVE_FRACTION,
    ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION, CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION,
    MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION,
    REPAIR_LATE_PROBE_NODE_BUDGET, MAIN_LOOP_LATE_RESERVE_FRACTION, MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT,
} from './stage-budget.js';
import { defaultConfig } from './ablation-config.js';

const baseInput = {
    opts: {},
    cfg: null,
    timeBudgetMs: 20000,
    repairConfigsCount: 2,
    admissibleOrderConfigsCount: 4,
    admissibleOrderNonDefaultConfigsCount: 3,
    mainConfigsCount: 16,
    initialMustCrossMask: 0,
};

test('production/interactive shape (Infinity nodeBudget) is a strict no-op: every reserve and ceiling collapses to Infinity', () => {
    const plan = computeStageBudgetPlan({ ...baseInput, nodeBudget: Infinity });
    for (const ceiling of [
        plan.admissibleOrderNodeReserve, plan.coarseStateNearTieRetentionRetryNodeReserve, plan.nonDefaultRetryNodeReserve,
        plan.connectivityRetryNodeReserve, plan.repairElitePrefixDfsRetryNodeReserve, plan.mcNeighborBudgetRetryNodeReserve,
        plan.repairFallbackNodeReserve, plan.attractionDiversityNodeReserve,
    ]) assert.equal(ceiling, 0, 'every reserve must be exactly 0 with no finite nodeBudget to withhold from');
    for (const ceiling of [
        plan.earlyTierNodeBudget, plan.mainLoopEarlyNodeBudget, plan.mainLoopNodeBudget, plan.coarseStateNearTieRetentionRetryNodeCeiling,
        plan.nonDefaultRetryNodeCeiling, plan.connectivityRetryNodeCeiling, plan.repairElitePrefixDfsRetryNodeCeiling,
        plan.mcNeighborBudgetRetryNodeCeiling, plan.repairFallbackNodeCeilingBase, plan.admissibleOrderDefaultProfileCeiling,
    ]) assert.equal(ceiling, Infinity);
    // late-repair-search's own flat cap is the one ceiling that stays finite regardless of nodeBudget.
    assert.equal(plan.repairLateProbeNodeCeiling, Infinity);
});

test('offline finite nodeBudget: admissible-order-fallback reserve is withheld from every earlier tier and additive tiers stack on top of nodeBudget, in strict declared order', () => {
    const nodeBudget = 50_000_000;
    const plan = computeStageBudgetPlan({ ...baseInput, nodeBudget });
    // Withheld reserve: earlier tiers (probe/main loop/repair fallback/goal-attraction-disabled-retry) share
    // nodeBudget MINUS the admissible-order-fallback tier's own slice.
    assert.equal(plan.admissibleOrderNodeReserve, Math.floor(nodeBudget * ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION));
    assert.equal(plan.earlyTierNodeBudget, nodeBudget - plan.admissibleOrderNodeReserve);
    // Additive stack: dedup-retry -> admissible-order-alternate-tiebreak-retry -> connectivity-retry ->
    // repair-elite-prefix-dfs-retry -> must-cross-neighbor-prune-disabled-retry -> late-repair-search, each stacked
    // on the IMMEDIATELY PRECEDING tier's own ceiling, never on plain nodeBudget directly (except
    // dedup-retry, the first additive tier, which stacks on nodeBudget itself).
    assert.equal(plan.coarseStateNearTieRetentionRetryNodeReserve, Math.floor(nodeBudget * COARSE_STATE_NEAR_TIE_RETENTION_RETRY_NODE_RESERVE_FRACTION));
    assert.equal(plan.coarseStateNearTieRetentionRetryNodeCeiling, nodeBudget + plan.coarseStateNearTieRetentionRetryNodeReserve);
    assert.equal(plan.nonDefaultRetryNodeReserve, Math.floor(nodeBudget * ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION));
    assert.equal(plan.nonDefaultRetryNodeCeiling, nodeBudget + plan.nonDefaultRetryNodeReserve);
    // Unlike the additive tiers above/below it, connectivity-retry's own RESERVE amount is a
    // fraction of plain nodeBudget (not the preceding tier's stacked ceiling) — only the resulting
    // CEILING stacks on nonDefaultRetryNodeCeiling. See CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_
    // RESERVE_FRACTION's own call site.
    assert.equal(plan.connectivityRetryNodeReserve, Math.floor(nodeBudget * CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION));
    assert.equal(plan.connectivityRetryNodeCeiling, plan.nonDefaultRetryNodeCeiling + plan.connectivityRetryNodeReserve);
    // repair-elite-prefix-dfs-retry is opt-in (cfg null here => disabled), so its own reserve/ceiling
    // stay at the "tier will not run" no-op shape: reserve 0, ceiling === the preceding tier's own.
    assert.equal(plan.repairElitePrefixDfsRetryTierWillRun, false);
    assert.equal(plan.repairElitePrefixDfsRetryNodeReserve, 0);
    assert.equal(plan.repairElitePrefixDfsRetryNodeCeiling, plan.connectivityRetryNodeCeiling);
    // must-cross-neighbor-prune-disabled-retry needs initialMustCrossMask !== 0 as well as the flag; base fixture
    // has no must-cross mechanics, so it is also a no-op here (see the must-cross-gated test below).
    assert.equal(plan.mcNeighborBudgetRetryTierWillRun, false);
    assert.equal(plan.mcNeighborBudgetRetryNodeCeiling, plan.repairElitePrefixDfsRetryNodeCeiling);
    // late-repair-search needs repairConfigsCount === 0; base fixture has repair configs, so no-op.
    assert.equal(plan.repairLateProbeTierWillRun, false);
    assert.equal(plan.repairLateProbeNodeCeiling, plan.mcNeighborBudgetRetryNodeCeiling);
});

test('must-cross-neighbor-prune-disabled-retry only reserves/stacks when the level has must-cross mechanics, and its budget fraction default matches the exported constant', () => {
    const nodeBudget = 50_000_000;
    const withMustCross = computeStageBudgetPlan({ ...baseInput, nodeBudget, initialMustCrossMask: 0b1 });
    assert.equal(withMustCross.mcNeighborBudgetRetryTierWillRun, true);
    assert.equal(withMustCross.mcNeighborBudgetRetryNodeReserve, Math.floor(withMustCross.repairElitePrefixDfsRetryNodeCeiling * MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION));
    assert.equal(withMustCross.mcNeighborBudgetRetryNodeCeiling, withMustCross.repairElitePrefixDfsRetryNodeCeiling + withMustCross.mcNeighborBudgetRetryNodeReserve);
});

test('late-repair-search: no-repair-config levels get the flat REPAIR_LATE_PROBE_NODE_BUDGET reserve stacked on the preceding tier, not a fraction of nodeBudget', () => {
    const nodeBudget = 50_000_000;
    const plan = computeStageBudgetPlan({ ...baseInput, nodeBudget, repairConfigsCount: 0 });
    assert.equal(plan.repairLateProbeTierWillRun, true);
    assert.equal(plan.repairLateProbeNodeReserve, REPAIR_LATE_PROBE_NODE_BUDGET);
    assert.equal(plan.repairLateProbeNodeCeiling, plan.mcNeighborBudgetRetryNodeCeiling + REPAIR_LATE_PROBE_NODE_BUDGET);
});

test('disableExtraBudgetPasses zeroes every retry-tier budget fraction unless an explicit per-tier override wins', () => {
    const suppressed = computeStageBudgetPlan({ ...baseInput, nodeBudget: Infinity, opts: { disableExtraBudgetPasses: true } });
    for (const fraction of [
        suppressed.repairBudgetFraction, suppressed.diversityBudgetFraction, suppressed.coarseStateNearTieRetentionRetryBudgetFraction,
        suppressed.nonDefaultRetryBudgetFraction, suppressed.connectivityRetryBudgetFraction, suppressed.mcNeighborBudgetRetryBudgetFraction,
        suppressed.admissibleOrderBudgetFraction,
    ]) assert.equal(fraction, 0);
    // An explicit per-tier override still wins over the blanket suppression.
    const overridden = computeStageBudgetPlan({
        ...baseInput, nodeBudget: Infinity,
        opts: { disableExtraBudgetPasses: true, attractionDiversityBudgetFractionOverride: 2.5 },
    });
    assert.equal(overridden.diversityBudgetFraction, 2.5);
    assert.equal(overridden.repairBudgetFraction, 0);
});

test('repair-shrink-recovery: no-op when nothing was shrunk, and repays the full withheld budget (not just the difference) when it was', () => {
    const nodeBudget = 50_000_000;
    const plan = computeStageBudgetPlan({
        ...baseInput, nodeBudget,
        opts: { repairProbeShrinkRecoveryNodeReserveFractionOverride: 0.5 },
        // Providing ANY cfg object turns off every OTHER unset flag (the documented ablation-config
        // gotcha — see SolveOpts's repairBudgetFractionOverride comment), so every flag this tier's
        // own eligibility reads must be explicitly set true here.
        cfg: { STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY: true, STRATEGY_REPAIR_PROBE: true, STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET: true },
    });
    const noShrink = computeShrinkRecoveryBudget(plan, []);
    assert.equal(noShrink.shrinkRecoveryDebt, 0);
    assert.equal(noShrink.shrinkRecoveryNodeReserve, 0);
    assert.equal(noShrink.mainLoopNodeBudgetFinal, plan.mainLoopNodeBudget);
    assert.equal(noShrink.repairFallbackNodeCeiling, plan.repairFallbackNodeCeilingBase);
    assert.equal(noShrink.diversityNodeCeiling, plan.earlyTierNodeBudget);

    const shrunk = computeShrinkRecoveryBudget(plan, [{ fullNodeBudget: 6_000_000 }]);
    assert.equal(shrunk.shrinkRecoveryDebt, 6_000_000);
    // Reserve is capped at `fraction * earlyTierNodeBudget`, never more than the actual debt.
    assert.equal(shrunk.shrinkRecoveryNodeReserve, Math.min(6_000_000, Math.floor(plan.earlyTierNodeBudget * 0.5)));
    assert.equal(shrunk.mainLoopNodeBudgetFinal, plan.mainLoopNodeBudget - shrunk.shrinkRecoveryNodeReserve);
});

test('buildStageBudgetEnvelopes projects the exact same node ceilings the plan computed — one canonical number, two read paths', () => {
    const nodeBudget = 50_000_000;
    const plan = computeStageBudgetPlan({ ...baseInput, nodeBudget, initialMustCrossMask: 0b1 });
    const envelopes = buildStageBudgetEnvelopes(plan, { timeBudgetMs: baseInput.timeBudgetMs, nodeBudget });
    assert.equal(envelopeNodeCeiling(envelopes['main-search']!), plan.mainLoopEarlyNodeBudget);
    assert.equal(envelopeNodeCeiling(envelopes['repair-fallback']!), plan.repairFallbackNodeCeilingBase);
    assert.equal(envelopeNodeCeiling(envelopes['goal-attraction-disabled-retry']!), plan.earlyTierNodeBudget);
    assert.equal(envelopeNodeCeiling(envelopes['admissible-order-fallback']!), nodeBudget);
    assert.equal(envelopeNodeCeiling(envelopes['coarse-state-near-tie-retention-disabled-retry']!), plan.coarseStateNearTieRetentionRetryNodeCeiling);
    assert.equal(envelopeNodeCeiling(envelopes['admissible-order-alternate-tiebreak-retry']!), plan.nonDefaultRetryNodeCeiling);
    assert.equal(envelopeNodeCeiling(envelopes['connectivity-axis-prune-disabled-retry']!), plan.connectivityRetryNodeCeiling);
    assert.equal(envelopeNodeCeiling(envelopes['repair-elite-prefix-dfs-retry']!), plan.repairElitePrefixDfsRetryNodeCeiling);
    assert.equal(envelopeNodeCeiling(envelopes['must-cross-neighbor-prune-disabled-retry']!), plan.mcNeighborBudgetRetryNodeCeiling);
    assert.equal(envelopes['coarse-state-near-tie-retention-disabled-retry']!.headroom.kind, 'additive');
    assert.equal(envelopes['admissible-order-fallback']!.headroom.kind, 'withheld');
    // Every envelope carries its own stable stageId (stage-policy.ts's canonical vocabulary).
    for (const [stageId, envelope] of Object.entries(envelopes)) assert.equal(envelope!.stageId, stageId);
});

test('main-search late-suffix reserve fraction/count overrides are honored and clamp to mainConfigsCount', () => {
    const nodeBudget = 50_000_000;
    const plan = computeStageBudgetPlan({
        ...baseInput, nodeBudget, mainConfigsCount: 3,
        opts: { mainLoopLateReserveFractionOverride: 0.3, mainLoopLateReserveConfigCountOverride: 10 },
    });
    assert.equal(plan.mainLoopLateReserveFraction, 0.3);
    // Clamped to mainConfigsCount (3), not the requested 10.
    assert.equal(plan.mainLoopLateReserveConfigCount, 3);
    assert.equal(plan.mainLoopLateReserve, Math.floor(plan.earlyTierNodeBudget * 0.3));
    assert.equal(plan.mainLoopEarlyNodeBudget, plan.earlyTierNodeBudget - plan.mainLoopLateReserve);
});

test('STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE widens the reserve window by exactly one, only when enabled', () => {
    const nodeBudget = 50_000_000;

    const off = computeStageBudgetPlan({ ...baseInput, nodeBudget, mainConfigsCount: 20 });
    assert.equal(off.mainLoopLateReserveConfigCount, MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT, 'default (cfg: null) is unaffected');

    const cfgOff = computeStageBudgetPlan({ ...baseInput, nodeBudget, mainConfigsCount: 20, cfg: defaultConfig() });
    assert.equal(cfgOff.mainLoopLateReserveConfigCount, MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT, 'production defaultConfig() (flag off) is unaffected');

    const on = computeStageBudgetPlan({
        ...baseInput, nodeBudget, mainConfigsCount: 20,
        cfg: { ...defaultConfig(), STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE: true },
    });
    assert.equal(on.mainLoopLateReserveConfigCount, MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT + 1, 'flag on widens the window by exactly one');

    // An explicit opts override still wins over the flag, same precedence as every other override here.
    const overridden = computeStageBudgetPlan({
        ...baseInput, nodeBudget, mainConfigsCount: 20,
        cfg: { ...defaultConfig(), STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE: true },
        opts: { mainLoopLateReserveConfigCountOverride: 2 },
    });
    assert.equal(overridden.mainLoopLateReserveConfigCount, 2, 'explicit override takes precedence over the flag');
});

test('MAIN_LOOP_LATE_RESERVE_FRACTION default is honored when no override is supplied', () => {
    const nodeBudget = 50_000_000;
    const plan = computeStageBudgetPlan({ ...baseInput, nodeBudget });
    assert.equal(plan.mainLoopLateReserveFraction, MAIN_LOOP_LATE_RESERVE_FRACTION);
});
