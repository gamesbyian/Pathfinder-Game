import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { solveLevel, attemptConfigKey, GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION } from './orchestration.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { makeRepairGatedInfeasibleLevel, makeGoalAttractionDisabledRetryGatedInfeasibleLevel, repairFallbackReserveDispatch } from './orchestration-test-support.js';

test('goal-attraction-disabled-retry pass reruns the main ladder once more after both prior stages fail', async () => {
    // admissibleOrderBudgetFractionOverride: 0 isolates the pass under test from the newer
    // admissible-order-fallback-search last-resort tier (orchestration.ts), which also runs by default after
    // this pass and would otherwise inflate "mainSearchAttempts" below (its attempts carry neither
    // marker, since it's a distinct search primitive, not a rerun of mainConfigs).
    // repairLateProbeNodeBudgetOverride: 0 similarly isolates this pass from the default-on
    // late-repair-search tier, which targets the same repair-ineligible fixture and would otherwise
    // spend its own flat 2,000,000-node reserve on top of the tiny budget this test measures.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), { timeBudgetMs: 1000, admissibleOrderBudgetFractionOverride: 0, coarseStateNearTieRetentionRetryBudgetFractionOverride: 0, admissibleOrderNonDefaultRetryBudgetFractionOverride: 0, connectivityAxisExhaustedRetryBudgetFractionOverride: 0, mcNeighborBudgetRetryBudgetFractionOverride: 0, repairLateProbeNodeBudgetOverride: 0, ablation: { STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false } });
    assert.equal(result.ok, false);
    const diversityAttempts = result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry');
    const mainSearchAttempts = result.attempts.filter(a => a.stageId !== 'goal-attraction-disabled-retry');
    assert.ok(diversityAttempts.length > 0, 'expected at least one goal-attraction-disabled-retry attempt');
    // The pass reruns the exact same mainConfigs ladder, so (this level being pruned near-instantly
    // regardless of budget, meaning neither run gets cut off partway through) it should run through
    // exactly as many configs as the main loop itself did.
    assert.equal(diversityAttempts.length, mainSearchAttempts.length);
});

test('STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY: false suppresses the pass', async () => {
    // This infeasible level is pruned by distance/parity regardless of search strategy, so the
    // side effect of every OTHER unset STRATEGY_* flag also reading false here (see SolveOpts's
    // repairAdditiveBudgetMultiplierOverride field comment) doesn't change the (still-unsolved) result.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY: false },
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'), false);
});

test('goalAttractionDisabledRetryBudgetFractionOverride: 0 suppresses the pass independently of repairAdditiveBudgetMultiplierOverride', async () => {
    // Both overrides at 0 mirrors solver-controller.ts/review-controller.ts's interactive call
    // sites — confirms the two are independently controllable (not coupled to one flag/override).
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        repairAdditiveBudgetMultiplierOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'), false);
});

test('disableExtraBudgetPasses: true suppresses the goal-attraction-disabled-retry pass on its own', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'), false);
});

test('disableExtraBudgetPasses: true also suppresses the early repair probe', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.repair), false);
});

test('an explicit goalAttractionDisabledRetryBudgetFractionOverride still wins over disableExtraBudgetPasses', async () => {
    // Precedence check: disableExtraBudgetPasses is a convenience default, not a hard override —
    // a caller isolating one pass's own cost (per goalAttractionDisabledRetryBudgetFractionOverride's own
    // comment) must still be able to set disableExtraBudgetPasses for "everything else off" while
    // leaving this one pass explicitly enabled.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
        goalAttractionDisabledRetryBudgetFractionOverride: GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'), true);
});

// opts.nodeBudget composition with the goal-attraction-disabled-retry pass: gated on
// `prep._metrics.nodesExpanded < nodeBudget` (orchestration.ts) BEFORE the pass starts, then passed
// into the ladder rerun (runInterleavedAttempts/runGateSerialAttempts). Both known measured on
// makeGoalAttractionDisabledRetryGatedInfeasibleLevel() at a generous timeBudgetMs (so only nodeBudget,
// never wall-clock, is the limiting factor): the main loop alone consumes 288 nodes (16 configs x
// 1 gate x 18 nodes/config, all pruned near-instantly by the distance bound); a second full
// diversity-pass rerun consumes another 288 (576 total).
//
// The second test below caught a real bug during authoring: runInterleavedAttempts/
// runGateSerialAttempts check nodeBudget directly against prep._metrics.nodesExpanded (the GLOBAL
// cumulative counter, already carrying the main loop's own spend) — NOT a local-relative counter
// the way repairSearchFromGate's own nodeBudget param is. An earlier version of this pass computed
// a remaining-budget value (nodeBudget - nodesExpanded so far, mirroring the repair loop's own
// pattern a few lines above it) and passed THAT into these two functions — which silently
// short-circuited the pass entirely on this exact test (288 already spent >= 112 "remaining" is
// true immediately, even though the ABSOLUTE budget of 400 had plenty of room left). Fixed by
// passing the same absolute nodeBudget the main loop's own call to these functions already uses.
test('a nodeBudget exhausted by the main loop alone suppresses the diversity pass entirely', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        // Deliberately below the ordinary ladder's current demand. The exact historical
        // per-config total is not a contract; the invariant is that a genuinely exhausted finite
        // early-tier ceiling must not manufacture headroom for this retry.
        nodeBudget: 100,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'node-budget-reached');
    assert.equal(result.nodeBudgetReached, true);
    assert.equal(result.attempts.some(a => a.stageId === 'goal-attraction-disabled-retry'), false);
});

test('a nodeBudget with room left after the main loop lets the diversity pass start, but caps its tail', async () => {
    // nodeBudget(400) clears the diversity pass's entry gate (288 already spent by the main loop is
    // still < the 300 ceiling the early tiers share), so the pass STARTS and every one of its 16
    // configs is still attempted. But as of the 2026-07-23 per-attempt node-budget threading, each
    // attempt's search is capped at the remaining budget (runInterleavedAttempts/
    // runGateSerialAttempts recompute nodeBudget - nodesExpanded before each runAttempt), so once
    // the cumulative reaches the ceiling the tail configs expand ~0 nodes -- NOT the 576 this ran to
    // when the budget was only checked once per gate and every config ran to full completion. That
    // tight-adherence property is what this test guards, and it is unchanged.
    //
    // The exact total moved 402 -> 315 with ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION (0.25): the early
    // tiers now share a reduced ceiling of 400 - floor(400*0.25) = 300 rather than the full 400, so
    // the main loop + diversity pass stop at ~300 instead of ~400, and the admissible-order-fallback tier
    // then spends its reserve on this (instantly-pruned) level without exhausting it. Both numbers
    // are the same "stop within a couple of nodes of the ceiling" behaviour, measured against
    // different ceilings.
    //
    // status stays 'node-budget-reached' even though 315 < 400, and that is deliberate: the ceiling
    // DID stop the early tiers at 300. See orchestration.ts's earlyTiersHitNodeCeiling -- reporting
    // 'failed' here would claim the ladder searched itself out when the budget actually truncated it.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400, // > 288 (main loop alone) -- clears the pass's entry gate
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'node-budget-reached');
    const diversityAttempts = result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry');
    assert.equal(diversityAttempts.length, 16, 'expected every config to still be attempted once past the entry gate');
    assert.equal(result.nodesExpanded, 315);
});

// The node reserve itself (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION). The bug it fixes: `nodeBudget`
// is ONE cumulative ceiling every tier checks against the same running counter, so the earlier tiers
// consumed all of it and the admissible-order-fallback tier -- last in line -- hit its own
// `nodesExpanded >= nodeBudget` guard and ran nothing. Measured on the 2026-07-30T114427Z corpus-2
// baseline: all 141 unsolved levels carrying a validated admissible-order-fallback hint terminated at the
// 20M cap, and the tier was recorded on 1 of them.
test('the node reserve is a strict no-op when no external nodeBudget is set', async () => {
    // The reserve is a share of an EXTERNAL ceiling; with none there is nothing to withhold, so
    // every production path (which passes no nodeBudget) is unaffected. Same level/budget as the
    // first diversity test above, whose attempt counts are therefore reproduced exactly.
    // repairLateProbeNodeBudgetOverride: 0 suppresses the default-on late-repair-search tier, which
    // also targets this repair-ineligible fixture and would otherwise inject its own randomized
    // repair-restart variance into what this test needs to be an exact-repro comparison.
    const withDefault = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), { timeBudgetMs: 1000, repairLateProbeNodeBudgetOverride: 0 });
    const withReserveOff = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        admissibleOrderNodeReserveFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
    });
    assert.equal(withDefault.nodesExpanded, withReserveOff.nodesExpanded);
    assert.equal(withDefault.attempts.length, withReserveOff.attempts.length);
    assert.equal(withDefault.status, withReserveOff.status);
});

test('disableExtraBudgetPasses leaves the full nodeBudget to the earlier tiers', async () => {
    // Reserving for a tier that will not run would strand the nodes and shrink the effective budget
    // of every interactive/batch caller that suppresses the extra passes -- so the reserve is gated
    // on the tier's REAL run condition, not just on the fraction. 288 (main loop) < 400 and no
    // diversity/admissible-order-fallback pass runs, so the whole ceiling stays available to the main loop
    // and the level is NOT reported as node-budget-limited.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.nodesExpanded, 288);
    assert.equal(result.nodeBudgetReached, false);
    assert.equal(result.status, 'failed');
});

test('the reserve withholds nodes from the early tiers and leaves them for the admissible-order-fallback tier', async () => {
    // The mechanism, stated as a comparison: same level, same ceiling, reserve off vs on. With the
    // reserve OFF the early tiers spend right up to the full 400 (402, the pre-reserve behaviour);
    // with it ON they are held to 400 - floor(400*0.25) = 300. The difference is the slice the tier
    // gets to spend, which before this fix was always zero.
    const off = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400,
        admissibleOrderNodeReserveFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
    });
    const on = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
    });
    assert.equal(off.nodesExpanded, 402, 'reserve off reproduces the pre-reserve total exactly');
    assert.ok(on.nodesExpanded < off.nodesExpanded, 'the reserve must hold the early tiers below the full ceiling');
    // Both are still reported as budget-limited: the ceiling stopped a tier in each case.
    assert.equal(off.nodeBudgetReached, true);
    assert.equal(on.nodeBudgetReached, true);
});

test('opt-in main-search reserve preserves order and gives a late suffix nonzero nodes', async () => {
    const seenConfigs: string[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , , , , nodeBudget, out] = args;
        seenConfigs.push(attemptConfigKey(config));
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) { out.nodesExpanded = spent; out.timedOut = true; }
        return null;
    };
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const mainConfigs = getConfiguredAttemptConfigs(level, null)
        .filter(config => !config.repair && !config.admissibleOrder);
    const result = await solveLevel(level, {
        timeBudgetMs: 1000,
        workBudget: 1_000_000,
        nodeBudget: 100,
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: true },
        mainSearchLateReserveFractionOverride: 0.2,
        mainSearchLateReserveConfigCountOverride: 2,
        attemptSearchForTesting: dispatch,
    });

    assert.equal(result.nodesExpanded, 100);
    assert.equal(result.nodeBudgetReached, true);
    assert.deepEqual(seenConfigs, [
        attemptConfigKey(mainConfigs[0]),
        attemptConfigKey(mainConfigs.at(-2)!),
        attemptConfigKey(mainConfigs.at(-1)!),
    ]);
    assert.equal(result.attempts[0].mainSearchLateReserve, undefined);
    assert.equal(result.attempts[1].mainSearchLateReserve, true);
    assert.equal(result.attempts[2].mainSearchLateReserve, true);
    assert.equal(result.attempts[0].nodesExpanded, 80);
    assert.equal(result.attempts[1].nodesExpanded, 10);
    assert.equal(result.attempts[2].nodesExpanded, 10);
});

test('interleaved main-search reserve gives every late config/gate pair its own slice', async () => {
    const level = { ...makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), gateKeys: [PACK(0, 0), PACK(0, 2)] };
    const attemptsSeen: Array<{ config: string; gate: number; budget: number }> = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, gate, , prep, , , , , nodeBudget, out] = args;
        const spent = Number(nodeBudget);
        attemptsSeen.push({ config: attemptConfigKey(config), gate, budget: spent });
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) { out.nodesExpanded = spent; out.timedOut = true; }
        return null;
    };
    const mainConfigs = getConfiguredAttemptConfigs(level, null).filter(config => !config.repair && !config.admissibleOrder);
    const result = await solveLevel(level, {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 100,
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: true },
        mainSearchLateReserveFractionOverride: 0.2,
        mainSearchLateReserveConfigCountOverride: 2,
        attemptSearchForTesting: dispatch,
    });

    assert.deepEqual(attemptsSeen, [
        { config: attemptConfigKey(mainConfigs[0]), gate: level.gateKeys[0], budget: 80 },
        { config: attemptConfigKey(mainConfigs.at(-2)!), gate: level.gateKeys[0], budget: 5 },
        { config: attemptConfigKey(mainConfigs.at(-2)!), gate: level.gateKeys[1], budget: 5 },
        { config: attemptConfigKey(mainConfigs.at(-1)!), gate: level.gateKeys[0], budget: 5 },
        { config: attemptConfigKey(mainConfigs.at(-1)!), gate: level.gateKeys[1], budget: 5 },
    ]);
    assert.equal(result.attempts.filter(a => a.mainSearchLateReserve).length, 4);
    assert.equal(result.nodeBudgetReached, true);
});

// Regression for the confirm-residual-001 gap (2026-08-26, fixed the same day): every existing
// main-search-reserve test above starves the loop via `nodeBudget` alone, with `workBudget` set
// generously large (1,000,000) so it never binds. Production solves are actually capped on BOTH
// resources simultaneously, and before the fix, runGateSerialAttempts/runInterleavedAttempts' WORK
// stop condition had no `ci >= lateConfigStart` carve-out the way the NODE-side check did -- an
// early config that consumed more than its fair share of WORK (measured directly on real generated
// raised-cap levels: confirm-residual-001's 25 routing-regime-eligible-and-residual rows each spent
// orders of magnitude more canonical work than nodes per attempt) could exhaust the loop's work
// pool before ever reaching the reserve-protected late suffix, even while the NODE dimension still
// had ample headroom -- the trailing configs the reserve exists to protect never got dispatched.
// This exercises the FIXED behavior directly: once an early config's own consumption crosses the
// reserve's early work ceiling, FURTHER early configs are skipped rather than allowed to keep
// draining the slice reserved for the trailing configs.
test('main-search reserve protects late configs from WORK (not just node) starvation by early configs', async () => {
    const seenConfigs: string[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , , , , , out] = args;
        seenConfigs.push(attemptConfigKey(config));
        // Simulate a work-expensive attempt that overshoots its own allotted share, as a real
        // beam/DFS search that only checks its budget periodically can, while expanding only a
        // token number of nodes -- the node dimension stays practically untouched.
        prep._workMeter.units += 60000;
        if (prep._metrics) prep._metrics.nodesExpanded += 1;
        if (out) { out.nodesExpanded = 1; out.timedOut = true; }
        return null;
    };
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const mainConfigs = getConfiguredAttemptConfigs(level, null)
        .filter(config => !config.repair && !config.admissibleOrder);
    const result = await solveLevel(level, {
        timeBudgetMs: 1000,
        nodeBudget: 1_000_000, // generous -- must not be what stops the loop
        workBudget: 100_000,
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: true },
        mainSearchLateReserveFractionOverride: 0.5,
        mainSearchLateReserveConfigCountOverride: 1,
        attemptSearchForTesting: dispatch,
    });

    // Node budget was never remotely threatened.
    assert.ok(result.nodesExpanded < 1_000, 'node budget must stay far from exhausted in this scenario');
    assert.ok(seenConfigs.includes(attemptConfigKey(mainConfigs[0])), 'the first config should still run');
    assert.ok(!seenConfigs.includes(attemptConfigKey(mainConfigs[1])),
        'the second, non-reserved early config must be skipped once the early work ceiling is crossed, ' +
        'preserving its share for the reserve-protected suffix instead');
    assert.ok(seenConfigs.includes(attemptConfigKey(mainConfigs.at(-1)!)),
        'the reserve-protected last config must still get dispatched despite the earlier work overshoot');
    assert.equal(result.attempts.some(a => a.mainSearchLateReserve), true,
        'the reserve must still get a genuine chance to run once its own slice, not zero, when work is scarce');
});

// Interleaved-variant sibling of the gate-serial test above: same WORK-dimension gap
// (runInterleavedAttempts' work check had no `ci >= lateConfigStart` carve-out either), exercised
// through the multi-gate path instead. Mirrors 'interleaved main-search reserve gives every late
// config/gate pair its own slice' above, but starves via `workBudget` instead of `nodeBudget`.
test('interleaved main-search reserve protects late config/gate pairs from WORK starvation by early configs', async () => {
    const level = { ...makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), gateKeys: [PACK(0, 0), PACK(0, 2)] };
    const attemptsSeen: Array<{ config: string; gate: number }> = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, gate, , prep, , , , , , out] = args;
        attemptsSeen.push({ config: attemptConfigKey(config), gate });
        // Same work-expensive-overshoot simulation as the gate-serial test above. The multi-gate
        // config list for this level is much longer (16 configs), so the fair evenShare per
        // config/gate pair is small; the overshoot must clear the early reserve ceiling in a single
        // dispatch regardless.
        prep._workMeter.units += 1_400_000;
        if (prep._metrics) prep._metrics.nodesExpanded += 1;
        if (out) { out.nodesExpanded = 1; out.timedOut = true; }
        return null;
    };
    const mainConfigs = getConfiguredAttemptConfigs(level, null).filter(config => !config.repair && !config.admissibleOrder);
    const result = await solveLevel(level, {
        timeBudgetMs: 1000,
        nodeBudget: 1_000_000,
        workBudget: 2_000_000,
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: true },
        mainSearchLateReserveFractionOverride: 0.5,
        mainSearchLateReserveConfigCountOverride: 1,
        attemptSearchForTesting: dispatch,
    });

    assert.ok(result.nodesExpanded < 1_000, 'node budget must stay far from exhausted in this scenario');
    assert.deepEqual(attemptsSeen, [
        { config: attemptConfigKey(mainConfigs[0]), gate: level.gateKeys[0] },
        { config: attemptConfigKey(mainConfigs.at(-1)!), gate: level.gateKeys[0] },
    ], 'the second early config is skipped entirely once the early work ceiling is crossed, and the ' +
        'reserve-protected last config gets dispatched on its own escalating slice instead');
    assert.equal(result.attempts.some(a => a.mainSearchLateReserve), true,
        'the reserve must still get a genuine chance to run once its own slice, not zero, when work is scarce');
});

test('main-search reserve activates by default with an omitted ablation config and a finite node ceiling', async () => {
    // Production default-ON as of 2026-08-12 (reports/2026-08-12-main-search-late-reserve-population-ab.md).
    // Mirrors lower-bounds.test.ts's PRUNE_MC_NEIGHBOR_BUDGET regression: an entirely omitted
    // `ablation` option (cfg=null, exactly what every production caller and any CLI invocation
    // without --enable-flags passes) must activate the rule, not silently leave it inert — the
    // wiring gap the neighbor-budget promotion shipped with and had to fix separately. This test
    // deliberately omits `ablation` entirely rather than passing `{ STRATEGY_MAIN_SEARCH_LATE_RESERVE: true }`.
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const defaulted = await solveLevel(level, {
        timeBudgetMs: 1000,
        nodeBudget: 400,
        disableExtraBudgetPasses: true,
        mainSearchLateReserveFractionOverride: 0.9,
        mainSearchLateReserveConfigCountOverride: 1,
    });
    assert.equal(defaulted.attempts.some(a => a.mainSearchLateReserve), true);
});

test('main-search reserve is inert with an explicit disable or an infinite node ceiling', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const explicitlyOff = await solveLevel(level, {
        timeBudgetMs: 1000,
        nodeBudget: 400,
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: false },
        mainSearchLateReserveFractionOverride: 0.9,
        mainSearchLateReserveConfigCountOverride: 1,
    });
    const infinite = await solveLevel(level, {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: true },
        mainSearchLateReserveFractionOverride: 0.9,
        mainSearchLateReserveConfigCountOverride: 1,
    });
    assert.equal(explicitlyOff.attempts.some(a => a.mainSearchLateReserve), false);
    assert.equal(infinite.attempts.some(a => a.mainSearchLateReserve), false);
});

test('zero fraction or zero suffix count disables the main-search reserve', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    for (const overrides of [
        { mainSearchLateReserveFractionOverride: 0, mainSearchLateReserveConfigCountOverride: 2 },
        { mainSearchLateReserveFractionOverride: 0.2, mainSearchLateReserveConfigCountOverride: 0 },
    ]) {
        const result = await solveLevel(level, {
            timeBudgetMs: 1000, nodeBudget: 400, disableExtraBudgetPasses: true,
            ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: true }, ...overrides,
        });
        assert.equal(result.attempts.some(a => a.mainSearchLateReserve), false);
    }
});

test('a reserve fraction that rounds to zero is fully inert', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 1,
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_MAIN_SEARCH_LATE_RESERVE: true },
        mainSearchLateReserveFractionOverride: 0.01,
        mainSearchLateReserveConfigCountOverride: 4,
    });
    assert.equal(result.attempts.some(a => a.mainSearchLateReserve), false);
});

test('repair-fallback reserve is inert by default (cfg=null) even with a finite node ceiling', async () => {
    // Opt-in convention: unlike STRATEGY_MAIN_SEARCH_LATE_RESERVE (standard convention, activates by
    // default), an entirely omitted ablation option must leave this flag OFF — the opposite
    // regression direction from the wiring-gap bug documented throughout
    // docs/solver-opt-in-experiment-ledger.md, and exactly the mismatch a first draft of this flag's
    // read site introduced (see orchestration.ts's own comment on the read site).
    const level = makeRepairGatedInfeasibleLevel();
    const withoutFlag = await solveLevel(level, {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        admissibleOrderBudgetFractionOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0.3,
        mainSearchLateReserveConfigCountOverride: 2,
        repairFallbackNodeReserveFractionOverride: 0.5,
        attemptSearchForTesting: repairFallbackReserveDispatch(),
        repairLateProbeNodeBudgetOverride: 0,
    });
    // cfg is non-null here (STRATEGY_EARLY_REPAIR_SEARCH: false is set), but this flag is unset within it —
    // the opt-in Proxy must resolve it to false regardless of what else is in the object.
    assert.equal(withoutFlag.attempts.filter(a => a.repair && !a.ok).length, 0, 'no repair-fallback attempts ran: the reserve did not activate');
    assert.equal(withoutFlag.nodesExpanded, 1000, 'the main loop alone consumed the entire earlyTierNodeBudget, exactly the pre-reserve behavior');
});

test('repair-fallback reserve gives the fallback loop room without touching the probe/early-config ceiling', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const opts = {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        admissibleOrderBudgetFractionOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0.3,
        mainSearchLateReserveConfigCountOverride: 2,
        repairFallbackNodeReserveFractionOverride: 0.5,
    };
    const off = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: false, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    const on = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    // earlyTierNodeBudget=1000 (no admissible-order-fallback reserve), mainSearchLateReserve=floor(1000*0.3)=300,
    // mainSearchEarlyNodeBudget=700 (identical in both arms — this is the invariant the two prior
    // revisions violated). repairFallbackNodeReserve=floor(300*0.5)=150 only when ON, so
    // mainSearchNodeBudget=1000 (off) vs 850 (on).
    const mainSearchAttempts = (result: typeof off) => result.attempts.filter(a => a.repair !== true);
    const fallbackAttempts = (result: typeof off) => result.attempts.filter(a => a.repair === true);
    assert.equal(mainSearchAttempts(off)[0].nodesExpanded, 700, 'the FIRST early-prefix attempt consumes the untouched mainSearchEarlyNodeBudget identically in both arms');
    assert.equal(mainSearchAttempts(on)[0].nodesExpanded, 700, 'byte-identical to the off arm: the probe/early-config ceiling must never depend on this flag');
    assert.equal(mainSearchAttempts(off).reduce((n, a) => n + (a.nodesExpanded ?? 0), 0), 1000, 'off: the main loop alone spends the entire earlyTierNodeBudget (700 early + 150 + 150 late)');
    assert.equal(mainSearchAttempts(on).reduce((n, a) => n + (a.nodesExpanded ?? 0), 0), 850, 'on: the late suffix is capped at mainSearchNodeBudget (700 early + 75 + 75 late), leaving room for the reserve');
    assert.equal(fallbackAttempts(off).length, 0, 'off: earlyTierNodeBudget is already exhausted by the main loop alone, so the fallback loop never runs');
    assert.equal(fallbackAttempts(on).length, 1, 'on: the fallback loop gets exactly the withheld slice');
    assert.equal(fallbackAttempts(on)[0].nodesExpanded, 150, 'exactly repairFallbackNodeReserve (the room this mechanism withheld from the main loop)');
    assert.equal(off.nodesExpanded, 1000);
    assert.equal(on.nodesExpanded, 1000, 'same total spend either way -- this reserve only changes WHO gets the nodes, never how many exist');
});
