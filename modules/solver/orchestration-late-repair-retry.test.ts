import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { solveLevel } from './orchestration.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { makeRepairGatedInfeasibleLevel, exhaustingDispatch, makeGoalAttractionDisabledRetryGatedInfeasibleLevel } from './orchestration-test-support.js';

// 2026-09-02: guidance-goal-distance-retry is the sixth tier migrated off queue #2 step 3's
// ms-derived work-dose debt (following coarse-state-near-tie-retention, repair-fallback,
// admissible-order-non-default-retry, connectivity-axis-prune-disabled-retry, and
// must-cross-neighbor-prune-disabled-retry). Same ownership invariant as its five predecessors: a
// non-binding wall deadline must not resize an explicit-work retry dose, and explicit
// baseWorkBudget must size the fresh pool. The tier's ms total remains a wall-deadline bound.
// Unlike its siblings this tier has no budget-fraction override plumbing yet (first-landing
// scope, per its own comment in stage-budget.ts), so isolation here disables every OTHER
// default-on last-resort tier via their own overrides/ablation and leaves this one at its
// default-ON fraction (1.0) via cfg=null.
function isolateGoalAttractionGuidanceDistanceRetryWorkDoseOpts(overrides: Record<string, unknown> = {}) {
    return {
        attemptBudgetTelemetry: true,
        ablation: {
            STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: true,
        },
        repairAdditiveBudgetMultiplierOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ...overrides,
    };
}

test('guidance-goal-distance-retry work dose no longer resizes with a non-binding deadline change', async () => {
    const run = (timeBudgetMs: number) => solveLevel(
        makeGoalAttractionDisabledRetryGatedInfeasibleLevel(),
        isolateGoalAttractionGuidanceDistanceRetryWorkDoseOpts({ timeBudgetMs, workBudget: 200_000 }),
    );
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'guidance-goal-distance-retry')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one guidance-goal-distance-retry attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the non-binding deadline');
});

test('guidance-goal-distance-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const solveWith = (baseWorkBudget: number) => solveLevel(
        makeGoalAttractionDisabledRetryGatedInfeasibleLevel(),
        isolateGoalAttractionGuidanceDistanceRetryWorkDoseOpts({ timeBudgetMs: 1000, baseWorkBudget }),
    );
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'guidance-goal-distance-retry')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null,
        'expected a guidance-goal-distance-retry attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

// ── STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY ─────────────────────────────────────
//
// Opt-in, default OFF (see REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION's own comment in
// orchestration.ts): applies the same pattern to a DIFFERENT known double-edged mechanism,
// STRATEGY_REPAIR_ELITE_PREFIX_DFS (reports/2026-08-07-repair-elite-prefix-dfs.md) — sound and
// mechanistically real, but net-negative in its own 20-level A/B due to shared-node-budget
// displacement (R02239 solves via ordinary repair with it off, exhausts the SAME repair call's
// budget with it on). Unlike the three sibling suites above, this reruns `repairConfigs` (the
// same per-config/per-gate manual loop shape as the ordinary repair fallback loop), not
// `mainConfigs`, and ENABLES a flag via its Proxy override rather than disabling one. Reuses
// makeRepairGatedInfeasibleLevel() (genuinely unsolvable: requiredLength=1 with 3 must-pass + 2 must-cross
// on a 6x6 grid) since it carries a real repair config, unlike the mainConfigs-only fixture the
// three sibling suites use.

test('repair-elite-prefix-dfs-retry pass reruns the repair ladder once more after everything else fails', async () => {
    // Isolate from every other default-on last-resort tier (none of which touch repairConfigs) so
    // "ordinaryRepairAttempts" below counts only the ordinary repair-fallback loop's own attempts —
    // and exclude early-repair-search attempts by canonical stageId, which also carry
    // repair === true but run before the main loop, not as part of the fallback loop this tier reruns.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        attemptSearchForTesting: exhaustingDispatch,
    });
    assert.equal(result.ok, false);
    const retryAttempts = result.attempts.filter(a => a.stageId === 'repair-elite-prefix-dfs-retry');
    const ordinaryRepairAttempts = result.attempts.filter(a => a.repair === true && a.stageId !== 'early-repair-search' && a.stageId !== 'repair-elite-prefix-dfs-retry');
    assert.ok(retryAttempts.length > 0, 'expected at least one repair-elite-prefix-dfs-retry attempt');
    // The pass reruns the exact same repairConfigs ladder, so (this level being genuinely
    // unsolvable, meaning neither run gets cut off early by finding a solution) it should run
    // through exactly as many config/gate pairs as the ordinary repair fallback loop itself did.
    assert.equal(retryAttempts.length, ordinaryRepairAttempts.length);
});

test('repair-elite-prefix-dfs-retry pass is inert by default (cfg=null): no retry attempt is ever run', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), { timeBudgetMs: 1000, attemptSearchForTesting: exhaustingDispatch });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'repair-elite-prefix-dfs-retry'), false);
});

test('repair-elite-prefix-dfs-retry pass stays off under an explicit { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: false }, and under a sparse unrelated ablation object', async () => {
    for (const ablation of [
        { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: false },
        { STRATEGY_REPAIR_ELITE_PREFIX_DFS: false },
    ]) {
        const result = await solveLevel(makeRepairGatedInfeasibleLevel(), { timeBudgetMs: 1000, ablation, attemptSearchForTesting: exhaustingDispatch });
        assert.equal(result.ok, false);
        assert.equal(result.attempts.some(a => a.stageId === 'repair-elite-prefix-dfs-retry'), false);
    }
});

test('repairElitePrefixDfsRetryBudgetFractionOverride: 0 suppresses the pass even with the flag on', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true },
        repairElitePrefixDfsRetryBudgetFractionOverride: 0,
        attemptSearchForTesting: exhaustingDispatch,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'repair-elite-prefix-dfs-retry'), false);
});

test('disableExtraBudgetPasses suppresses newer additive tiers, while explicit tier overrides still win', async () => {
    const eliteSuppressed = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true },
        disableExtraBudgetPasses: true,
    });
    assert.equal(eliteSuppressed.attempts.some(a => a.stageId === 'repair-elite-prefix-dfs-retry'), false);

    const mcSuppressed = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_MC_NEIGHBOR_BUDGET_RETRY: true },
        disableExtraBudgetPasses: true,
    });
    assert.equal(mcSuppressed.attempts.some(a => a.stageId === 'must-cross-neighbor-prune-disabled-retry'), false);

    const eliteOverridden = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true },
        disableExtraBudgetPasses: true,
        repairElitePrefixDfsRetryBudgetFractionOverride: 1,
    });
    assert.ok(eliteOverridden.attempts.some(a => a.stageId === 'repair-elite-prefix-dfs-retry'));

    const lateProbeOverridden = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_LATE_PROBE: true },
        disableExtraBudgetPasses: true,
        repairLateProbeNodeBudgetOverride: 100,
    });
    assert.ok(lateProbeOverridden.attempts.some(a => a.stageId === 'late-repair-search'));
});

// 2026-09-02: repair-elite-prefix-dfs-retry is the seventh tier migrated off queue #2 step 3's
// ms-derived work-dose debt, and the second (after repair-fallback itself) to use the
// withWorkCapScope fresh-pool shape rather than runWholeLadderRetryTier. Same ownership invariant
// as its predecessors: a non-binding wall deadline must not resize an explicit-work retry dose,
// and explicit baseWorkBudget must size the fresh pool. Isolated via disableExtraBudgetPasses
// (this tier is opt-in/default-OFF, so an explicit fraction override is required to force it on
// even with every sibling tier suppressed — see the "explicit tier overrides still win" test above).
function isolateRepairElitePrefixDfsRetryWorkDoseOpts(overrides: Record<string, unknown> = {}) {
    return {
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true },
        repairElitePrefixDfsRetryBudgetFractionOverride: 1,
        attemptSearchForTesting: exhaustingDispatch,
        attemptBudgetTelemetry: true,
        ...overrides,
    };
}

test('repair-elite-prefix-dfs-retry work dose no longer resizes with a non-binding deadline change', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const run = (timeBudgetMs: number) => solveLevel(level, isolateRepairElitePrefixDfsRetryWorkDoseOpts({ timeBudgetMs, workBudget: 200_000 }));
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'repair-elite-prefix-dfs-retry')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one repair-elite-prefix-dfs-retry attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the non-binding deadline');
});

test('repair-elite-prefix-dfs-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const solveWith = (baseWorkBudget: number) => solveLevel(level, isolateRepairElitePrefixDfsRetryWorkDoseOpts({ timeBudgetMs: 1000, baseWorkBudget }));
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'repair-elite-prefix-dfs-retry')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null,
        'expected a repair-elite-prefix-dfs-retry attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

test('late-repair-search does not fire when repairConfigs is empty only because STRATEGY_REPAIR_FALLBACK was ablated off (regression, fixed 2026-08-20)', async () => {
    // makeRepairGatedInfeasibleLevel() genuinely needs repair fallback (needsRepairFallback(f) is
    // true for it), unlike makeGoalAttractionDisabledRetryGatedInfeasibleLevel() above, which the late
    // probe's own eligibility gate targets. `repairConfigs.length === 0` here comes ONLY from the
    // explicit STRATEGY_REPAIR_FALLBACK: false ablation (applyAttemptConfigOptions strips every
    // repair config when that flag is off) -- an experiment deliberately routing away from repair,
    // not a level repair was never eligible for. Before the fix, the late probe's eligibility check
    // couldn't tell the two apart and would silently reintroduce repair anyway.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_LATE_PROBE: true, STRATEGY_REPAIR_FALLBACK: false },
        disableExtraBudgetPasses: true,
        repairLateProbeNodeBudgetOverride: 100,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'late-repair-search'), false,
        'STRATEGY_REPAIR_FALLBACK: false must not be silently undone by the late-probe tier');
    assert.equal(result.attempts.some(a => a.repair === true), false,
        'no repair attempt of any kind should run when the fallback is explicitly disabled');
});

// 2026-09-02: late-repair-search is the eighth tier migrated off queue #2 step 3's ms-derived
// work-dose debt, and the first found outside the original nine-site CI inventory (its
// `repairLateProbeTotalBudget = timeBudgetMs` line has no `* fraction` multiplication, so the
// ratchet's own regex-based scan never flagged it as debt — see
// scripts/check-solver-budget-boundaries.mjs's own comment on this site). Same ownership
// invariant as its seven predecessors: a non-binding wall deadline must not resize an
// explicit-work retry dose, and explicit baseWorkBudget must size the fresh pool.
function isolateLateRepairSearchWorkDoseOpts(overrides: Record<string, unknown> = {}) {
    return {
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_REPAIR_LATE_PROBE: true },
        repairLateProbeNodeBudgetOverride: 100,
        attemptSearchForTesting: exhaustingDispatch,
        attemptBudgetTelemetry: true,
        ...overrides,
    };
}

test('late-repair-search work dose no longer resizes with a non-binding deadline change', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const run = (timeBudgetMs: number) => solveLevel(level, isolateLateRepairSearchWorkDoseOpts({ timeBudgetMs, workBudget: 200_000 }));
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'late-repair-search')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one late-repair-search attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the non-binding deadline');
});

test('late-repair-search now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const solveWith = (baseWorkBudget: number) => solveLevel(level, isolateLateRepairSearchWorkDoseOpts({ timeBudgetMs: 1000, baseWorkBudget }));
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'late-repair-search')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null,
        'expected a late-repair-search attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

// 2026-09-02: late-repair-multiseed-retry is the ninth migrated work-dose site, and was found only
// because the whole-ladder deadline-independence test above (queue #2 step 4) exercises this exact
// tier alongside its siblings and empirically caught its allocatedWorkCeiling resizing 10x between
// a 60s and a 600s non-binding deadline — this tier had no dedicated test of its own before. Same
// ownership invariant as its eight predecessors. Unlike late-repair-search itself, this tier needs
// BOTH STRATEGY_REPAIR_LATE_PROBE (so repairLateProbeTierWillRun, its own prerequisite, is true)
// and STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY explicitly enabled in the ablation object, since a
// non-null cfg object no longer defaults every unmentioned flag to its promoted ON state.
function isolateLateRepairMultiSeedRetryWorkDoseOpts(overrides: Record<string, unknown> = {}) {
    return {
        disableExtraBudgetPasses: true,
        ablation: { STRATEGY_REPAIR_LATE_PROBE: true, STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY: true },
        repairLateProbeNodeBudgetOverride: 100,
        attemptSearchForTesting: exhaustingDispatch,
        attemptBudgetTelemetry: true,
        ...overrides,
    };
}

test('late-repair-multiseed-retry work dose no longer resizes with a non-binding deadline change', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const run = (timeBudgetMs: number) => solveLevel(level, isolateLateRepairMultiSeedRetryWorkDoseOpts({ timeBudgetMs, workBudget: 200_000 }));
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'late-repair-multiseed-retry')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one late-repair-multiseed-retry attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own per-round work pool must depend on workBudget, not on the non-binding deadline');
});

test('late-repair-multiseed-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const solveWith = (baseWorkBudget: number) => solveLevel(level, isolateLateRepairMultiSeedRetryWorkDoseOpts({ timeBudgetMs: 1000, baseWorkBudget }));
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'late-repair-multiseed-retry')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null,
        'expected a late-repair-multiseed-retry attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

// Experiment-only seam for the late-repair-multiseed-retry 7-vs-6 seed-count confirmation
// (reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md). exhaustingDispatch
// reports spending exactly the nodeBudget handed to runAttempt, and the small
// repairLateProbeNodeBudgetOverride: 100 in isolateLateRepairMultiSeedRetryWorkDoseOpts means the
// FIRST gate attempt of each round always exhausts that round's own 100-node allotment, so exactly
// one attempt (carrying its round's seedSalt) is recorded per seed round -- this makes the exact
// sequence of recorded seedSalt values a precise, deterministic proxy for which salts the
// orchestration loop actually iterated, not just how many attempts happened to be pushed.
function recordedMultiSeedRetrySeedSalts(result: Awaited<ReturnType<typeof solveLevel>>) {
    return result.attempts
        .filter(a => a.stageId === 'late-repair-multiseed-retry')
        .map(a => a.seedSalt ?? 0);
}

test('late-repair-multiseed-retry seed-count override omitted: production-equivalent, executes all seven salts 1-7', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const result = await solveLevel(level, isolateLateRepairMultiSeedRetryWorkDoseOpts());
    assert.deepEqual(recordedMultiSeedRetrySeedSalts(result), [1, 2, 3, 4, 5, 6, 7]);
});

test('late-repair-multiseed-retry seed-count override = 6: executes exactly salts 1-6, with the seventh round never attempted', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const result = await solveLevel(level, isolateLateRepairMultiSeedRetryWorkDoseOpts({
        repairLateProbeMultiSeedRetrySeedCountOverride: 6,
    }));
    assert.deepEqual(recordedMultiSeedRetrySeedSalts(result), [1, 2, 3, 4, 5, 6]);
});

test('late-repair-multiseed-retry seed-count override = 0: the tier still "will run" but attempts nothing (empty salt slice)', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const result = await solveLevel(level, isolateLateRepairMultiSeedRetryWorkDoseOpts({
        repairLateProbeMultiSeedRetrySeedCountOverride: 0,
    }));
    assert.deepEqual(recordedMultiSeedRetrySeedSalts(result), []);
});

test('adaptive gate weighting cannot claim more than the remaining tier budget (regression, fixed 2026-08-20)', async () => {
    // adaptiveGateWeight is unbounded above ((share*n)**2 for a gate that has accumulated more
    // than its "fair" 1/n share of nodesExpanded progress) and used to multiply attBudget without
    // ever being clamped back to budgetLeft -- every OTHER path through attemptBudgetShare (the
    // plain even split, and the minBudgetFraction floor) already respects that bound. Only reachable
    // on >= ADAPTIVE_GATE_THRESHOLD (4) gate levels via runInterleavedAttempts; the published corpus
    // never has more than 3 gates (CLAUDE.md), so this is a stress-corpus-only path solver:regression
    // --check cannot exercise.
    //
    // Many gates (20) so the weight's theoretical ceiling (n**2 when one gate holds ~100% of all
    // progress) is large enough to exceed pairsLeft even many rounds in; gate 0 reports a huge
    // nodesExpanded on EVERY round (not just the first) to keep its dominant share sustained as
    // pairsLeft shrinks toward the end of the config list, where the unclamped product is most
    // likely to overshoot. Scans every attempt's own allocatedWorkCeiling (attemptBudgetTelemetry)
    // rather than tracking one specific round, since which round overflows first depends on the
    // exact config-list length.
    const gateCount = 10;
    const gateKeys = Array.from({ length: gateCount }, (_, i) => PACK(i, 0));
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, gateKey, , prep, , , , , , out] = args;
        const reported = gateKey === gateKeys[0] ? 200_000 : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += reported;
        if (out) out.nodesExpanded = reported;
        return null;
    }) as typeof runAttemptSearch;
    const level = {
        ...makeRepairGatedInfeasibleLevel(), grid: { w: 15, h: 15 }, gateKeys,
        goalKey: PACK(14, 14), mustPassKeys: [], mustCrossKeys: [],
    };
    const workBudget = 500_000;
    const result = await solveLevel(level as unknown as NormalizedLevel, {
        timeBudgetMs: 60_000,
        workBudget,
        nodeBudget: 50_000_000,
        attemptBudgetTelemetry: true,
        disableExtraBudgetPasses: true,
        // Otherwise STRATEGY_PARITY_GATE_FILTER (getActiveGates) drops every gate whose parity
        // relative to the goal/requiredLength doesn't match, silently shrinking activeGates below what
        // this test constructed — irrelevant to the scheduling behavior under test.
        ablation: { STRATEGY_PARITY_GATE_FILTER: false },
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, false, 'the mocked dispatch never solves');
    const gate0Attempts = result.attempts.filter(a => a.gateKey === gateKeys[0] && a.allocatedWorkCeiling != null);
    assert.ok(gate0Attempts.length > gateCount, 'gate 0 must have run across several weighted rounds, not just round 0');
    const maxCeiling = Math.max(...gate0Attempts.map(a => a.allocatedWorkCeiling as number));
    // budgetLeft <= workBudget always, so this is a valid (if slightly loose) upper bound for any
    // single attempt regardless of which round it came from.
    assert.ok(maxCeiling <= workBudget,
        `a single weighted attempt must not be granted more than the tier's own workBudget (${workBudget}), got ${maxCeiling}`);
});

test('repair-elite-prefix-dfs-retry pass can solve a level the main loop misses, and enables STRATEGY_REPAIR_ELITE_PREFIX_DFS while it runs', async () => {
    // Simulates the real mechanism's shape without depending on repair-search.ts's actual
    // elitePrefixDfsRepair internals: succeeds only once prep._cfg reflects
    // STRATEGY_REPAIR_ELITE_PREFIX_DFS explicitly enabled — exactly what the retry pass's own Proxy
    // override produces, and exactly what the ordinary repair fallback loop's cfg (unset, so
    // opt-in-default-false) never does.
    //
    // Isolates every sibling default-on retry tier (goalAttractionDisabledRetry/admissibleOrder/coarseStateNearTieRetentionRetry/
    // admissibleOrderNonDefaultRetry/connectivityAxisExhaustedRetry) via budget-fraction overrides.
    // Historically load-bearing: each sibling Proxy used to fall through to a blind `true` for any
    // prop it didn't explicitly name, so an earlier sibling tier's own Proxy would satisfy this
    // mock's `=== true` check on STRATEGY_REPAIR_ELITE_PREFIX_DFS (an opt-in flag) before this
    // tier's own pass ever ran. Fixed 2026-08-20 (all 5 retry-tier Proxies now fall through to
    // `!OPT_IN_FEATURES.has(prop)`, matching `normalizeAblationConfig`), so this isolation is no
    // longer strictly required for this specific flag — kept anyway as good practice/defense in
    // depth for whichever prop a future version of this test happens to check.
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep] = args;
        if (prep._cfg && prep._cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS === true) return [0, 1];
        return null;
    }) as typeof runAttemptSearch;
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, true, 'the elite-prefix-dfs-on retry wins');
    assert.equal(result.attempts.at(-1)?.stageId, 'repair-elite-prefix-dfs-retry');
});

test('retry-tier config Proxies do not leak unrelated opt-in flags to true (regression, fixed 2026-08-20)', async () => {
    // Direct regression coverage for the bug the previous test's comment describes: every retry-tier
    // Proxy (goalAttractionDisabledRetry/coarseStateNearTieRetentionRetry/connectivityAxisExhaustedRetry/
    // repairElitePrefixDfsRetry/mcNeighborBudgetRetry) used to fall through to a blind `true` for any
    // prop it didn't explicitly name — so with the real production default `cfg === null`, ANY
    // unrelated opt-in/default-OFF flag (e.g. PRUNE_PORTAL_PARITY_ENVELOPE) would read `true` for the
    // whole duration of the retry pass, silently activating an unvalidated experimental mechanism no
    // caller asked for. Captures the observed value while repairElitePrefixDfsRetry's own Proxy is
    // active (representative of all 5, which share the identical fixed fallback shape).
    let observedPortalParity: unknown;
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep] = args;
        if (prep._cfg) observedPortalParity = prep._cfg.PRUNE_PORTAL_PARITY_ENVELOPE;
        if (prep._cfg && prep._cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS === true) return [0, 1];
        return null;
    }) as typeof runAttemptSearch;
    await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        attemptSearchForTesting: dispatch,
    });
    assert.notEqual(observedPortalParity, true, 'an unrelated opt-in flag must not read true under a retry-tier Proxy with cfg=null');
});
