import assert from 'node:assert/strict';
import { test } from 'vitest';
import { solveLevel } from './orchestration.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { makeRepairGatedInfeasibleLevel, makeGoalAttractionDisabledRetryGatedInfeasibleLevel, repairFallbackReserveDispatch } from './orchestration-test-support.js';

// 2026-08-28: repair-fallback was the second tier migrated off queue #2 step 3's ms-derived
// work-dose debt (docs/solver-budget-determinism.md's "Remaining ms-shaped allocation debt";
// scaledStageWorkBudget in budget-units.ts) -- same pattern and same two tests as
// coarse-state-near-tie-retention-disabled-retry's own pair above. STRATEGY_REPAIR_FALLBACK_NODE_RESERVE / the reserve
// override are needed (see the two tests just above) so the fallback loop actually gets a turn
// instead of being starved by the main loop's own share of the shared node budget.
function isolateRepairFallbackOpts(overrides: Record<string, unknown> = {}) {
    return {
        nodeBudget: 1000,
        admissibleOrderBudgetFractionOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0.3,
        mainSearchLateReserveConfigCountOverride: 2,
        repairFallbackNodeReserveFractionOverride: 0.5,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        attemptSearchForTesting: repairFallbackReserveDispatch(),
        attemptBudgetTelemetry: true,
        ...overrides,
    };
}

test('repair-fallback work dose no longer resizes with a non-binding deadline change', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const run = (timeBudgetMs: number) => solveLevel(level, isolateRepairFallbackOpts({ timeBudgetMs, workBudget: 200_000 }));
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.repair === true)
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one repair-fallback attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the (non-binding) deadline');
});

test('repair-fallback now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const solveWith = (baseWorkBudget: number) => solveLevel(level, isolateRepairFallbackOpts({ timeBudgetMs: 1000, baseWorkBudget }));
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.repair === true)?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null, 'expected a repair-fallback attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

test('repair-fallback reserve is a no-op when mainSearchLateReserve is 0 (accepted coupling)', async () => {
    // Documented, accepted limitation (see the read site's own comment): this reserve carves FROM
    // mainSearchLateReserve, so it has nothing to withhold when that reserve is itself zero --
    // whether because STRATEGY_MAIN_SEARCH_LATE_RESERVE is off, or its own fraction/config-count is 0.
    // Confirms this degrades safely (no crash, no stranded nodes) rather than silently doing nothing
    // dangerous.
    const level = makeRepairGatedInfeasibleLevel();
    const result = await solveLevel(level, {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_MAIN_SEARCH_LATE_RESERVE: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        admissibleOrderBudgetFractionOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairFallbackNodeReserveFractionOverride: 0.5,
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    assert.equal(result.attempts.filter(a => a.repair === true).length, 0, 'nothing withheld for the fallback loop to spend');
    assert.equal(result.nodesExpanded, 1000, 'the main loop alone spends the entire (undivided) earlyTierNodeBudget, exactly as if the flag were off');
});

// STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE (promoted default-ON 2026-09-10 as a pair
// with STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL — see GOAL_ATTRACTION_DISABLED_RETRY_NODE_
// RESERVE_FRACTION's own comment). Reuses repairFallbackReserveDispatch() and
// makeRepairGatedInfeasibleLevel() above: this reserve nests inside the SAME mainSearchLateReserve
// pool as the sibling reserve, one layer deeper, so the fixture and mock dispatch are identical.

test('goal-attraction-disabled-retry reserve is active by default (cfg leaves it unset) now that it is promoted default-ON', async () => {
    // Was "...inert by default..." pre-promotion (2026-09-10): this flag used to be opt-in, so an
    // ablation cfg that set sibling flags but left THIS one unset resolved it to false. Now that it
    // is promoted default-ON, the SAME unset-in-partial-cfg shape must resolve to true instead —
    // this is the mirror check for the promotion, using the exact numbers the explicit
    // STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE: true arm below already validates.
    const level = makeRepairGatedInfeasibleLevel();
    const result = await solveLevel(level, {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0.3,
        mainSearchLateReserveConfigCountOverride: 2,
        repairFallbackNodeReserveFractionOverride: 0.5,
        goalAttractionDisabledRetryNodeReserveFractionOverride: 0.4,
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    // Same arithmetic as the explicit "on" arm below: earlyTierNodeBudget=1000, mainSearchLateReserve=
    // floor(1000*0.3)=300, repairFallbackNodeReserve=floor(300*0.5)=150,
    // goalAttractionDisabledRetryNodeReserve=floor((300-150)*0.4)=60, so the main loop spends 790 and
    // diversity gets real (nonzero) node room instead of being starved out by the sibling reserve alone.
    const diversityAttempts = result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry');
    assert.equal(diversityAttempts.some(a => (a.nodesExpanded ?? 0) > 0), true, 'diversity must receive real node room now that this reserve is on by default');
    assert.equal(result.nodesExpanded, 1000, 'total stays the full nodeBudget; only the internal split shifts');
});

test('goal-attraction-disabled-retry reserve gives the diversity pass room without touching the probe/main-search/repair-fallback-reserve slice', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const opts = {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0.3,
        mainSearchLateReserveConfigCountOverride: 2,
        repairFallbackNodeReserveFractionOverride: 0.5,
        goalAttractionDisabledRetryNodeReserveFractionOverride: 0.4,
    };
    const off = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE: false, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    const on = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    // earlyTierNodeBudget=1000, mainSearchLateReserve=floor(1000*0.3)=300, mainSearchEarlyNodeBudget=700
    // (identical in both arms). repairFallbackNodeReserve=floor(300*0.5)=150 in BOTH arms (this
    // flag being on/off must never change its sibling's own already-validated slice).
    // goalAttractionDisabledRetryNodeReserve=floor((300-150)*0.4)=60 only when ON, so mainSearchNodeBudget=
    // 850 (off) vs 790 (on); repairFallbackNodeCeiling=1000 (off) vs 940 (on).
    const mainSearchAttempts = (result: typeof off) => result.attempts.filter(a => a.repair !== true && a.stageId !== 'goal-attraction-disabled-retry');
    const fallbackAttempts = (result: typeof off) => result.attempts.filter(a => a.repair === true && a.stageId !== 'goal-attraction-disabled-retry');
    const diversityAttempts = (result: typeof off) => result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry');
    assert.equal(mainSearchAttempts(off)[0].nodesExpanded, 700, 'the FIRST early-prefix attempt consumes the untouched mainSearchEarlyNodeBudget identically in both arms');
    assert.equal(mainSearchAttempts(on)[0].nodesExpanded, 700, 'byte-identical to the off arm: the probe/early-config ceiling must never depend on this flag');
    assert.equal(mainSearchAttempts(off).reduce((n, a) => n + (a.nodesExpanded ?? 0), 0), 850, 'off: main loop spends mainSearchNodeBudget=850 (700 early + 75 + 75 late), same as the sibling reserve alone');
    assert.equal(mainSearchAttempts(on).reduce((n, a) => n + (a.nodesExpanded ?? 0), 0), 790, 'on: the late suffix is additionally capped, leaving room for this reserve too (700 early + 45 + 45 late)');
    assert.equal(fallbackAttempts(off).length, 1, 'off: repairFallbackNodeReserve alone still gives the fallback loop its slice');
    assert.equal(fallbackAttempts(on).length, 1, 'on: the fallback loop still runs -- this reserve protects the diversity pass FROM it, not by excluding it');
    assert.equal(fallbackAttempts(off)[0].nodesExpanded, 150, 'off: exactly repairFallbackNodeReserve, unaffected by this flag being off');
    assert.equal(fallbackAttempts(on)[0].nodesExpanded, 150, 'on: byte-identical to off -- this reserve must never shrink the sibling reserve\'s own already-validated slice');
    assert.equal(diversityAttempts(off).every(a => (a.nodesExpanded ?? 0) === 0), true, 'off: earlyTierNodeBudget is already exhausted (850+150=1000) before the diversity pass ever gets a node');
    // The diversity pass call (runGateSerialAttempts, single gate, no late-split args -- see
    // GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE_FRACTION's own comment) keeps iterating through all 16
    // mainConfigs even after its node ceiling is spent (a pre-existing property of that runner when
    // earlyConfigNodeBudget===nodeBudget, unrelated to this reserve): the first config consumes
    // whatever room remains, every subsequent one gets remainingNodeBudget=0 and is a real but
    // zero-node attempt. So the count is 16 either way; what this reserve actually changes is how
    // much of that room the FIRST one gets.
    assert.equal(diversityAttempts(on).length, 16);
    assert.equal(diversityAttempts(on)[0].nodesExpanded, 60, 'exactly goalAttractionDisabledRetryNodeReserve (the room withheld from the repair-fallback loop\'s own ceiling)');
    assert.equal(diversityAttempts(on).slice(1).every(a => (a.nodesExpanded ?? 0) === 0), true, 'every subsequent diversity attempt gets zero additional room');
    assert.equal(off.nodesExpanded, 1000);
    assert.equal(on.nodesExpanded, 1000, 'same total spend either way -- this reserve only changes WHO gets the nodes, never how many exist');
});

test('goal-attraction-disabled-retry reserve is a no-op when repairFallbackNodeReserve already exhausts mainSearchLateReserve', async () => {
    // Documented, accepted limitation mirroring the sibling reserve's own equivalent test: this
    // reserve carves from the REMAINDER of mainSearchLateReserve after repairFallbackNodeReserve's own
    // cut, so it has nothing left to withhold when that remainder is zero (fraction=1.0 here takes
    // the whole pool). Confirms this degrades safely rather than stranding nodes or double-spending.
    const level = makeRepairGatedInfeasibleLevel();
    const result = await solveLevel(level, {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0.3,
        mainSearchLateReserveConfigCountOverride: 2,
        repairFallbackNodeReserveFractionOverride: 1.0,
        goalAttractionDisabledRetryNodeReserveFractionOverride: 0.5,
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    assert.equal(result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry').length, 0, 'nothing left in mainSearchLateReserve for this reserve to withhold');
    // mainSearchNodeBudget = 1000 - 300 (repairFallbackNodeReserve, =mainSearchLateReserve exactly at
    // fraction 1.0) - 0 (this reserve, ineligible since the remainder is 0) = 700 = mainSearchEarlyNode
    // Budget exactly, so the late suffix's two configs get no additional room and are skipped
    // entirely (no attempt objects). repairFallbackNodeCeiling = 1000 - 0 = 1000 (unchanged), so the
    // fallback loop still gets its full 300-node slice: 700 early + 300 repair fallback = 1000.
    assert.equal(result.nodesExpanded, 1000, 'all 1000 nodes accounted for: 700 early + 300 repair fallback, nothing stranded');
});

// STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL (opt-in, default OFF — see
// reports/2026-09-02-goal-attraction-disabled-retry-work-pool-starvation.md for the population-scale
// telemetry motivating this). Same work-expensive-overshoot mock as the main-search-reserve WORK
// tests above (prep._workMeter.units += a fixed amount per attempt, node count left small), so a
// modest workBudget is exhausted by main-search alone long before goal-attraction-disabled-retry's
// own (purely node-gated) eligibility check is even reached.
test('goal-attraction-disabled-retry fresh work pool gives the pass real room even after the shared pool is already spent', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const mainConfigs = getConfiguredAttemptConfigs(level, null).filter(config => !config.repair && !config.admissibleOrder);
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep, , , , , , out] = args;
        prep._workMeter.units += 100_000;
        if (prep._metrics) prep._metrics.nodesExpanded += 1;
        if (out) { out.nodesExpanded = 1; out.timedOut = true; }
        return null;
    };
    const opts = {
        timeBudgetMs: 1000,
        nodeBudget: 1_000_000, // generous -- the node dimension must never be what this test exercises
        workBudget: 50_000, // a single mocked attempt (100,000) overshoots this 2x, so main-search
        // alone leaves the shared pool decisively (not just marginally) over budget by the time
        // diversity's own gate is reached -- avoids an exact-equality boundary race with the
        // `workSpent >= workBudget` check's own before-dispatch timing.
        attemptBudgetTelemetry: true, // required for Attempt.workSpent to be populated at all
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        attemptSearchForTesting: dispatch,
    };
    assert.ok(mainConfigs.length >= 1, 'fixture sanity: at least one main-search attempt must run to spend the shared pool');
    const off = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false, STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: false },
    });
    const on = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false, STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: true },
    });
    const diversityAttempts = (result: typeof off) => result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry');
    // OFF: the shared (workBudget, workStart) pool main-search already exhausted (workSpent >=
    // workBudget) is what diversity's own runGateSerialAttempts call reads too, so its very first
    // per-gate check bails out before dispatching anything at all -- zero attempts, not merely
    // zero-work ones (this is the exact `attemptCount: 0` signature the population telemetry in
    // reports/2026-09-02-goal-attraction-disabled-retry-work-pool-starvation.md found).
    assert.equal(diversityAttempts(off).length, 0,
        'off: the shared pool is already fully spent by main-search alone, so diversity never even gets dispatched');
    // ON: a fresh prep._workMeter.units mark plus a fraction-1.0 (i.e. full-sized) fresh pool sized
    // off the same workBudget gives diversity real room regardless of what main-search already spent.
    assert.ok(diversityAttempts(on).length > 0, 'on: diversity gets a real dispatch from its own fresh pool');
    assert.ok(diversityAttempts(on).some(a => (a.workSpent ?? 0) > 0),
        'on: at least one diversity attempt gets real work room from its own fresh pool');
});

// STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE (opt-in, default OFF — see
// ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION's own comment and the read site's, which documents
// the R03148 precedent this targets and the asymmetric-risk caution specific to this mechanism).
// Reuses repairFallbackReserveDispatch() and makeRepairGatedInfeasibleLevel() above: the mock's
// "consume exactly what nodeBudget it is given" behavior works identically for admissible-order-fallback
// attempts as it does for main-search/repair-fallback ones, since it patches the shared dispatch seam.

test('admissible-order-fallback profile reserve is inert by default (cfg=null) even with a finite node ceiling', async () => {
    // Same opt-in-convention check as both prior reserves' own first test: cfg is non-null here
    // (STRATEGY_EARLY_REPAIR_SEARCH is set), but THIS flag is unset within it — the opt-in Proxy must
    // resolve it to false regardless of what else is set.
    const level = makeRepairGatedInfeasibleLevel();
    const result = await solveLevel(level, {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false },
        repairAdditiveBudgetMultiplierOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0,
        admissibleOrderNodeReserveFractionOverride: 0.4,
        admissibleOrderProfileNodeReserveFractionOverride: 0.5,
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    const admissibleOrderAttempts = result.attempts.filter(a => a.admissibleOrder === true);
    // earlyTierNodeBudget = 1000 - floor(1000*0.4) = 600 (main loop consumes exactly this, see the
    // numeric test below for the full derivation); with this flag off, 'default' gets the whole
    // remaining 400 and every other profile is starved, exactly the pre-mechanism/R03148 shape.
    assert.equal(admissibleOrderAttempts.filter(a => a.scoringProfileId !== 'default').every(a => (a.nodesExpanded ?? 0) === 0), true, 'no room was withheld for the non-default profiles: the reserve did not activate');
    assert.equal(admissibleOrderAttempts.find(a => a.scoringProfileId === 'default')?.nodesExpanded, 400, '\'default\' alone spends the whole undivided admissible-order-fallback reserve, exactly the pre-reserve/R03148 behavior');
});

test('admissible-order-fallback profile reserve gives non-default profiles room without shrinking default\'s guaranteed floor', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const opts = {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        repairAdditiveBudgetMultiplierOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0,
        admissibleOrderNodeReserveFractionOverride: 0.4,
        admissibleOrderProfileNodeReserveFractionOverride: 0.5,
    };
    const off = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE: false, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    const on = await solveLevel(level, {
        ...opts,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    // nodeBudget=1000, admissibleOrderNodeReserve=floor(1000*0.4)=400, earlyTierNodeBudget=600 (main
    // loop's single early-prefix attempt consumes exactly this in both arms — mainSearchLateReserve is
    // explicitly 0 here to keep the main-search side of the arithmetic out of this test entirely).
    // admissibleOrderProfileNodeReserve=floor(400*0.5)=200 only when ON, so admissibleOrderDefault
    // ProfileCeiling=1000 (off) vs 800 (on); every OTHER profile's own ceiling stays the full 1000
    // nodeBudget in both arms.
    const mainSearchNodes = (result: typeof off) => result.attempts.filter(a => !a.repair && a.stageId !== 'goal-attraction-disabled-retry' && !a.admissibleOrder).reduce((n, a) => n + (a.nodesExpanded ?? 0), 0);
    const byProfile = (result: typeof off, profile: string) => result.attempts.find(a => a.admissibleOrder === true && a.scoringProfileId === profile);
    assert.equal(mainSearchNodes(off), 600, 'main loop spends the untouched earlyTierNodeBudget identically in both arms');
    assert.equal(mainSearchNodes(on), 600, 'byte-identical to the off arm: nothing before the admissible-order-fallback tier depends on this flag');
    assert.equal(byProfile(off, 'default')?.nodesExpanded, 400, 'off: \'default\' alone spends the whole undivided reserve (600 early + 400 default = 1000)');
    assert.equal(byProfile(on, 'default')?.nodesExpanded, 200, 'on: \'default\'\'s ceiling is reduced by exactly admissibleOrderProfileNodeReserve (400 -> 200) -- the asymmetric risk, made concrete and measurable');
    assert.equal(byProfile(off, 'none'), undefined, 'off: \'default\' exhausted nodeBudget before \'none\' was ever reached -- the R03148 starvation shape reproduced');
    assert.equal(byProfile(on, 'none')?.nodesExpanded, 200, 'on: \'none\' gets exactly the withheld slice (600 + 200 default + 200 none = 1000)');
    assert.equal(byProfile(on, 'mustCrossFirst'), undefined, 'on: this reserve protects the non-default profiles COLLECTIVELY, not individually -- \'mustCrossFirst\' still gets nothing once \'none\' exhausts the shared nodeBudget ceiling, by design (see the read site\'s own scope note)');
    assert.equal(off.nodesExpanded, 1000);
    assert.equal(on.nodesExpanded, 1000, 'same total spend either way -- this reserve only changes WHO gets the nodes, never how many exist');
});

test('admissible-order-fallback profile reserve is a no-op when admissibleOrderNodeReserve is 0', async () => {
    // Documented, accepted limitation mirroring both prior reserves' own equivalent test: this
    // reserve carves FROM admissibleOrderNodeReserve, so it has nothing to withhold when that
    // reserve is itself zero -- whether because ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own
    // fraction is 0, or the tier has only one profile, or no external nodeBudget is set.
    const level = makeRepairGatedInfeasibleLevel();
    const result = await solveLevel(level, {
        timeBudgetMs: 1000, workBudget: 1_000_000, nodeBudget: 1000,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false, STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        repairAdditiveBudgetMultiplierOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        mainSearchLateReserveFractionOverride: 0,
        admissibleOrderNodeReserveFractionOverride: 0,
        admissibleOrderProfileNodeReserveFractionOverride: 0.5,
        attemptSearchForTesting: repairFallbackReserveDispatch(),
    });
    const admissibleOrderAttempts = result.attempts.filter(a => a.admissibleOrder === true);
    assert.equal(admissibleOrderAttempts.filter(a => a.scoringProfileId !== 'default').every(a => (a.nodesExpanded ?? 0) === 0), true, 'nothing withheld for the non-default profiles to spend');
    assert.equal(result.nodesExpanded, 1000, 'the main loop (600) + \'default\' alone (400) spend the entire (undivided) nodeBudget, exactly as if the flag were off');
});
