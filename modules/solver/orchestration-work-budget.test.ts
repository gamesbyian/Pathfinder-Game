import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { solveLevel, runAttempt } from './orchestration.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { workMeter } from './work-meter.js';
import { prepLevel } from './prep.js';
import { makeLineLevel, makeRepairGatedInfeasibleLevel, exhaustingDispatch, makeGoalAttractionDisabledRetryGatedInfeasibleLevel } from './orchestration-test-support.js';

/** The attempt ladder always divides WORK (work-meter.ts), never wall clock. These pin the two
 *  properties that make a solve reproducible: an explicit workBudget fully determines the search,
 *  and timeBudgetMs is only ever a deadline. */
test('an explicit workBudget reproduces the same search and bounds the work spent', async () => {
    const level = makeLineLevel();
    const t0 = workMeter.units;
    const a = await solveLevel(level as unknown as NormalizedLevel, { timeBudgetMs: 600000, workBudget: 200000 });
    const spentA = workMeter.units - t0;
    const t1 = workMeter.units;
    const b = await solveLevel(level as unknown as NormalizedLevel, { timeBudgetMs: 600000, workBudget: 200000 });
    const spentB = workMeter.units - t1;
    assert.equal(a.ok, true);
    assert.equal(b.ok, a.ok);
    assert.equal(b.nodesExpanded, a.nodesExpanded, 'same workBudget must reproduce the same search');
    assert.equal(spentB, spentA, 'and spend the same work');
});

test('baseWorkBudget is the preferred alias for legacy workBudget and conflicts fail loudly', async () => {
    const level = makeLineLevel() as unknown as NormalizedLevel;
    const legacy = await solveLevel(level, { timeBudgetMs: 600_000, workBudget: 200_000 });
    const preferred = await solveLevel(level, { timeBudgetMs: 600_000, baseWorkBudget: 200_000 });
    assert.equal(preferred.ok, legacy.ok);
    assert.equal(preferred.nodesExpanded, legacy.nodesExpanded);
    assert.equal(preferred.workSpent, legacy.workSpent);
    await assert.rejects(
        solveLevel(level, { timeBudgetMs: 600_000, baseWorkBudget: 200_000, workBudget: 199_999 }),
        /baseWorkBudget .* legacy workBudget .* disagree/,
    );
});

test('a non-binding deadline cannot resize an explicit-work main-ladder trajectory', async () => {
    // This deliberately exercises the part of the scheduler that is already fully work-denominated.
    // Additive legacy tiers still have separately-inventoried ms-shaped compatibility debt; when
    // those are migrated, extend this invariant across the whole production ladder too.
    const level = makeLineLevel() as unknown as NormalizedLevel;
    const run = (timeBudgetMs: number) => solveLevel(level, {
        timeBudgetMs,
        workBudget: 200_000,
        disableExtraBudgetPasses: true,
        attemptBudgetTelemetry: true,
    });
    const shortDeadline = await run(60_000);
    const longDeadline = await run(600_000);
    const trajectory = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts.map(attempt => ({
        stageId: attempt.stageId,
        gateKey: attempt.gateKey,
        scoringProfileId: attempt.scoringProfileId,
        orderingBias: attempt.orderingBiasId,
        beamWidth: attempt.beamWidth,
        outcome: attempt.outcome,
        nodesExpanded: attempt.nodesExpanded,
        allocatedWorkCeiling: attempt.allocatedWorkCeiling,
        workSpent: attempt.workSpent,
    }));

    assert.equal(shortDeadline.deadlineTruncated, undefined);
    assert.equal(longDeadline.deadlineTruncated, undefined);
    assert.equal(longDeadline.ok, shortDeadline.ok);
    assert.deepEqual(longDeadline.solution, shortDeadline.solution);
    assert.equal(longDeadline.nodesExpanded, shortDeadline.nodesExpanded);
    assert.equal(longDeadline.workSpent, shortDeadline.workSpent);
    assert.deepEqual(trajectory(longDeadline), trajectory(shortDeadline),
        'deadline headroom is latency protection, not a search-allocation input');
});

// 2026-09-02: queue #2 step 4 (docs/solver-budget-determinism.md's "Migration priority" list) —
// now that every ms-derived additive-tier work-dose site is migrated (see that doc's "Remaining
// ms-shaped allocation debt" section), widen the invariant above from the isolated main ladder to
// the WHOLE default-on production ladder: every additive last-resort tier reachable under cfg=null
// participates at once, not one at a time in isolation. exhaustingDispatch keeps this fast (no real
// search cost) while still exercising orchestration.ts's own budget bookkeeping.
//
// One fixture cannot reach every last-resort tier: `late-repair-search`'s own eligibility gate is
// `repairConfigsCount === 0` (see stage-budget.ts) — the OPPOSITE polarity of `early-repair-search`/
// `repair-fallback`'s `needsRepairFallback` gate, and deliberately so (it exists specifically for
// the population ordinary repair never got a chance on). No single level can satisfy both, so this
// invariant needs two complementary fixtures, split along exactly that inherent eligibility
// boundary, not a test gap:
//
// 1. makeRepairGatedInfeasibleLevel() (mustPassKeys + mustCrossKeys present, needsRepairFallback):
//    early-repair-search, repair-fallback, and the two mechanic-specific prune-disabled retries
//    (connectivity-axis, must-cross-neighbor, which each require their own mechanic present) plus
//    every general whole-ladder rerun tier.
// 2. makeGoalAttractionDisabledRetryGatedInfeasibleLevel() (no mustPass/mustCross, no repair need):
//    late-repair-search, plus the same general whole-ladder rerun tiers (which aren't gated on
//    mustPass/mustCross presence).
//
// Together the two runs cover all eight migrated work-dose sites' deadline-independence holding
// SIMULTANEOUSLY with every sibling tier, not just in per-tier isolation.
function assertWholeLadderDeadlineIndependent(shortDeadline: any, longDeadline: any, expectedStageIds: string[]) {
    const trajectory = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts.map(attempt => ({
        stageId: attempt.stageId,
        gateKey: attempt.gateKey,
        scoringProfileId: attempt.scoringProfileId,
        orderingBias: attempt.orderingBiasId,
        beamWidth: attempt.beamWidth,
        outcome: attempt.outcome,
        nodesExpanded: attempt.nodesExpanded,
        allocatedWorkCeiling: attempt.allocatedWorkCeiling,
        workSpent: attempt.workSpent,
    }));

    // Both fixtures are deterministically unsolvable, so (unlike the plain main-ladder test above,
    // whose makeLineLevel() solves and leaves deadlineTruncated unset) both runs reach the final
    // `ok: false` result path, which always resolves deadlineTruncated to an explicit boolean —
    // false here since exhaustingDispatch finishes the whole ladder well inside either deadline.
    assert.equal(shortDeadline.deadlineTruncated, false);
    assert.equal(longDeadline.deadlineTruncated, false);
    assert.equal(longDeadline.ok, shortDeadline.ok);
    assert.deepEqual(longDeadline.solution, shortDeadline.solution);
    assert.equal(longDeadline.nodesExpanded, shortDeadline.nodesExpanded);
    assert.equal(longDeadline.workSpent, shortDeadline.workSpent);
    assert.deepEqual(trajectory(longDeadline), trajectory(shortDeadline),
        'deadline headroom must be latency protection everywhere in the ladder, not a search-allocation input on any additive tier');

    // Guard against a vacuous pass: confirm the additive tiers this test exists to cover actually
    // ran (not just the main loop/early-repair-search), on BOTH runs, so a future refactor that
    // silently short-circuits the ladder before reaching them cannot pass this test unnoticed.
    const stageIds = new Set(shortDeadline.attempts.map((a: { stageId: string }) => a.stageId));
    for (const expected of expectedStageIds) {
        assert.ok(stageIds.has(expected), `expected the whole-ladder run to reach ${expected}; got stageIds: ${[...stageIds].join(', ')}`);
    }
}

test('a non-binding deadline cannot resize an explicit-work trajectory across the WHOLE default-on production ladder (repair-eligible population)', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const run = (timeBudgetMs: number) => solveLevel(level, {
        timeBudgetMs,
        workBudget: 200_000,
        attemptBudgetTelemetry: true,
        attemptSearchForTesting: exhaustingDispatch,
    });
    const shortDeadline = await run(60_000);
    const longDeadline = await run(600_000);
    assertWholeLadderDeadlineIndependent(shortDeadline, longDeadline, [
        'repair-fallback', 'goal-attraction-disabled-retry', 'admissible-order-fallback',
        'admissible-order-alternate-tiebreak-retry', 'coarse-state-near-tie-retention-disabled-retry',
        'connectivity-axis-prune-disabled-retry', 'must-cross-neighbor-prune-disabled-retry',
        'guidance-goal-distance-retry',
    ]);
});

test('a non-binding deadline cannot resize an explicit-work trajectory across the WHOLE default-on production ladder (repair-ineligible population, covers late-repair-search)', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const run = (timeBudgetMs: number) => solveLevel(level, {
        timeBudgetMs,
        workBudget: 200_000,
        attemptBudgetTelemetry: true,
        attemptSearchForTesting: exhaustingDispatch,
    });
    const shortDeadline = await run(60_000);
    const longDeadline = await run(600_000);
    assertWholeLadderDeadlineIndependent(shortDeadline, longDeadline, [
        'goal-attraction-disabled-retry', 'admissible-order-fallback',
        'admissible-order-alternate-tiebreak-retry', 'coarse-state-near-tie-retention-disabled-retry',
        'guidance-goal-distance-retry', 'late-repair-search',
    ]);
});

test('strictTotalWorkBudget installs one remaining-work cap across every additive path', async () => {
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep, , , , , , out] = args;
        if (prep._metrics) prep._metrics.nodesExpanded += 1;
        if (out) { out.nodesExpanded = 1; out.timedOut = true; }
        return null;
    };
    const common = {
        timeBudgetMs: 10_000,
        nodeBudget: 1_000_000,
        workBudget: 100_000,
        attemptBudgetTelemetry: true,
        attemptSearchForTesting: dispatch,
    };
    const legacy = await solveLevel(makeRepairGatedInfeasibleLevel(), common);
    assert.equal(legacy.attempts.find(attempt => attempt.stageId === 'early-repair-search')?.allocatedWorkCeiling, null,
        'the historical repair probe runs before the main ladder installs a work cap');

    const strict = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        ...common,
        strictTotalWorkBudget: true,
        lifecycleTelemetry: true,
    });
    const paths = {
        earlyRepairSearch: strict.attempts.find(attempt => attempt.stageId === 'early-repair-search'),
        repairFallback: strict.attempts.find(attempt => attempt.repair && attempt.stageId !== 'early-repair-search'),
        goalAttractionDisabledRetry: strict.attempts.find(attempt => attempt.stageId === 'goal-attraction-disabled-retry'),
        admissibleOrder: strict.attempts.find(attempt => attempt.admissibleOrder),
    };
    for (const [name, attempt] of Object.entries(paths)) {
        assert.ok(attempt, `${name} must be reached by the controlled dispatch`);
        assert.ok(attempt.allocatedWorkCeiling != null && attempt.allocatedWorkCeiling <= common.workBudget,
            `${name} must see the immutable whole-solve cap`);
        assert.ok(attempt.allocatedNodeCeiling != null, `${name} must record its node allowance`);
    }
    const lifecycle = strict.stageLifecycle as Record<string, any>;
    for (const name of ['early-repair-search', 'repair-fallback', 'goal-attraction-disabled-retry', 'admissible-order-fallback']) {
        assert.equal(lifecycle[name].mechanicallyEligible, true);
        assert.equal(lifecycle[name].reached, true);
        assert.ok(lifecycle[name].attempts > 0);
        assert.ok(Array.isArray(lifecycle[name].allocatedWorkCeilings));
        assert.equal(lifecycle[name].actualWork, 0, 'controlled zero-work dispatch must meter exactly');
    }
    assert.equal(legacy.stageLifecycle, undefined, 'omitting lifecycle telemetry preserves the result shape');
});

test('the ordinary repair fallback loop gets fresh work room, not a stale cap left by the main loop (regression, fixed 2026-08-20)', async () => {
    // Unlike the repair PROBE (which runs before the main ladder and therefore never inherits a
    // cap from it — see the previous test), the ordinary repair fallback loop runs AFTER the main
    // ladder finishes. Its `runAttempt` calls used to leave `prep._workCap` untouched, silently
    // inheriting whatever the main loop's LAST attempt left behind — which, once budget-share
    // division has run through many configs, can be a small fraction of the real repair budget.
    let repairAllocatedWorkCeiling: number | undefined;
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , , , , , out] = args;
        if (prep._metrics) prep._metrics.nodesExpanded += 1;
        if (out) out.nodesExpanded = 1;
        if (config.repair) {
            repairAllocatedWorkCeiling = prep._workCap == null ? undefined : prep._workCap - prep._workMeter.units;
            return [0, 1];
        }
        return null;
    };
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 5000,
        workBudget: 100_000,
        attemptBudgetTelemetry: true,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false },
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, true, 'the mocked repair config must win');
    assert.ok(repairAllocatedWorkCeiling !== undefined, 'the repair fallback attempt must have run');
    // Before the 2026-08-20 fix this was whatever the main loop's last per-attempt slice happened to
    // be (bounded by the external workBudget=100,000). After that fix, and before the 2026-08-28
    // queue #2 step-3 migration (reports/2026-08-28-coarse-state-near-tie-retention-disabled-retry-work-dose-migration.md),
    // it was REPAIR_ADDITIVE_BUDGET_MULTIPLIER (6.0) * timeBudgetMs * DEFAULT_WORK_PER_MS, ~100.5M —
    // ignoring the caller's own explicit workBudget entirely, exactly the bug that migration closed.
    // After the migration it is REPAIR_ADDITIVE_BUDGET_MULTIPLIER (6.0) * the solve's own resolved
    // workBudget (100,000 here, explicit) = 600,000 exactly — three orders of magnitude smaller than
    // the old ms-derived number, but still three orders of magnitude larger than any single
    // main-search per-attempt slice of workBudget=100,000 (bounded by workBudget itself, so at most
    // 100,000, typically far less once divided across many configs), so this pin still distinguishes
    // "fresh" from "stale/inherited" — it just now also reflects the caller's real workBudget instead
    // of silently re-deriving a different one from timeBudgetMs.
    assert.equal(repairAllocatedWorkCeiling, 600_000,
        `repair fallback must see a fresh work cap sized off workBudget, got ${repairAllocatedWorkCeiling}`);
});

test('lifecycle telemetry classifies newer retry tiers as their own technique, not main-ladder/repair-fallback/admissible-order-fallback (regression, fixed 2026-08-20)', async () => {
    // Before the fix, `classify()` only knew 5 categories (early-repair-search/repair-fallback/attraction-
    // diversity/admissible-order-fallback/main-ladder) -- every retry tier added since (coarse-state-near-tie-retention,
    // connectivity-axis-exhausted, repair-elite-prefix-dfs, mc-neighbor-budget, late-repair-search,
    // admissible-order-fallback-non-default) silently fell into whichever of those 5 buckets its OWN base
    // config type happened to match (must-cross-neighbor-prune-disabled-retry reruns mainConfigs -> 'main-ladder';
    // repair-elite-prefix-dfs-retry reruns repairConfigs -> 'repair-fallback'), misreporting which
    // stage of the ladder actually ran or found a solution.
    //
    // Wins only via mcNeighborBudgetRetryCfg's own distinguishing override (PRUNE_MC_NEIGHBOR_BUDGET:
    // false), which nothing else in the ladder ever sets -- so a win here can only have come from
    // that specific tier. STRATEGY_EARLY_REPAIR_SEARCH disabled so the repair-gated level's genuine
    // needsRepairFallback eligibility doesn't let an earlier repair attempt win first by accident.
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep] = args;
        if (prep._cfg && prep._cfg.PRUNE_MC_NEIGHBOR_BUDGET === false) return [0, 1];
        return null;
    }) as typeof runAttemptSearch;
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 2000,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: false },
        repairAdditiveBudgetMultiplierOverride: 0,
        lifecycleTelemetry: true,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, true, 'the must-cross-neighbor-prune-disabled-retry-only mock must win');
    const winningAttempts = result.attempts.filter(a => a.ok);
    assert.equal(winningAttempts.length, 1);
    assert.equal(winningAttempts[0].stageId, 'must-cross-neighbor-prune-disabled-retry', 'the winning attempt must be tagged by its real tier');
    const lifecycle = result.stageLifecycle as Record<string, any>;
    assert.ok(lifecycle['must-cross-neighbor-prune-disabled-retry'], 'the new category must exist in the lifecycle map');
    assert.equal(lifecycle['must-cross-neighbor-prune-disabled-retry'].reached, true);
    assert.ok(lifecycle['must-cross-neighbor-prune-disabled-retry'].attempts > 0);
    // The winning attempt must NOT also be double-counted into main-ladder, which is what every
    // mcNeighborBudgetRetry attempt used to collapse into (it reruns mainConfigs, so attempt.repair
    // and attempt.admissibleOrder are both unset -- exactly what the old classify()'s final
    // fallback branch matched).
    const mainLadderAttempts = result.attempts.filter(a => !a.repair && !a.admissibleOrder && a.stageId !== 'goal-attraction-disabled-retry'
        && a.stageId !== 'must-cross-neighbor-prune-disabled-retry' && a.stageId !== 'connectivity-axis-prune-disabled-retry' && a.stageId !== 'coarse-state-near-tie-retention-disabled-retry');
    assert.equal(lifecycle['main-ladder'].attempts, mainLadderAttempts.length,
        'main-ladder must not absorb attempts that belong to a newer retry tier');
});

// 2026-09-01: must-cross-neighbor-prune-disabled-retry is the fifth tier migrated off
// queue #2 step 3's ms-derived work-dose debt. This tier's own historical implementation
// comment explicitly diagnosed the huge non-binding deadline-derived work pool as defeating
// work subdivision; keep its staircase/node logic unchanged and pin only work-dose ownership.
function isolateMcNeighborRetryWorkDoseOpts(overrides: Record<string, unknown> = {}) {
    return {
        attemptBudgetTelemetry: true,
        ablation: {
            STRATEGY_MC_NEIGHBOR_BUDGET_RETRY: true,
            STRATEGY_EARLY_REPAIR_SEARCH: false,
            STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false,
        },
        repairAdditiveBudgetMultiplierOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        repairElitePrefixDfsRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ...overrides,
    };
}

test('must-cross-neighbor-prune-disabled-retry work dose no longer resizes with a non-binding deadline change', async () => {
    const run = (timeBudgetMs: number) => solveLevel(
        makeRepairGatedInfeasibleLevel(),
        isolateMcNeighborRetryWorkDoseOpts({ timeBudgetMs, workBudget: 200_000 }),
    );
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'must-cross-neighbor-prune-disabled-retry')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one must-cross-neighbor-prune-disabled-retry attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the non-binding deadline');
});

test('must-cross-neighbor-prune-disabled-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const solveWith = (baseWorkBudget: number) => solveLevel(
        makeRepairGatedInfeasibleLevel(),
        isolateMcNeighborRetryWorkDoseOpts({ timeBudgetMs: 1000, baseWorkBudget }),
    );
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'must-cross-neighbor-prune-disabled-retry')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null,
        'expected a must-cross-neighbor-prune-disabled-retry attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

test('lifecycle telemetry separates mechanical eligibility from disabled routing', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 100,
        workBudget: 100_000,
        disableExtraBudgetPasses: true,
        lifecycleTelemetry: true,
    });
    const lifecycle = result.stageLifecycle as Record<string, any>;
    for (const name of ['early-repair-search', 'repair-fallback', 'goal-attraction-disabled-retry', 'admissible-order-fallback']) {
        assert.equal(lifecycle[name].mechanicallyEligible, true, `${name} has a mechanics-selected config`);
        assert.equal(lifecycle[name].skippedByRoutingOrConfiguration, true, `${name} was explicitly disabled`);
        assert.equal(lifecycle[name].reached, false);
    }
});

test('lifecycle telemetry reports guidance-goal-distance-retry and late-repair-multiseed-retry as mechanically instantiated (regression, stage-lifecycle instantiation projection gap)', async () => {
    // Before the fix, the hand-maintained `instantiated` map in orchestration.ts's `finish()`
    // stopped at 'late-repair-search' and never listed either of these two canonical stage-plan
    // entries, so the missing lookup silently fell back to `undefined` and both fields were
    // falsely reported as `false` even though the stages are mechanically available here (a main
    // config with no configured repair fallback satisfies both stages' structural preconditions).
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        lifecycleTelemetry: true,
    });
    const lifecycle = result.stageLifecycle as Record<string, any>;
    for (const name of ['guidance-goal-distance-retry', 'late-repair-multiseed-retry']) {
        assert.equal(lifecycle[name].mechanicallyEligible, true, `${name} has a mechanics-selected config`);
        assert.equal(lifecycle[name].instantiated, true, `${name} has a mechanics-selected config`);
    }
});

test('attempt work telemetry sums exactly to whole-level canonical work', async () => {
    const result = await solveLevel(makeLineLevel() as unknown as NormalizedLevel, {
        timeBudgetMs: 10_000,
        workBudget: 200_000,
        lifecycleTelemetry: true,
    });
    const attemptWork = result.attempts.reduce((sum, attempt) => sum + Number(attempt.workSpent), 0);
    const lifecycleWork = Object.values(result.stageLifecycle as Record<string, any>)
        .reduce((sum: number, lifecycle: any) => sum + Number(lifecycle.actualWork ?? 0), 0);
    assert.equal(attemptWork, result.workSpent);
    assert.equal(lifecycleWork, result.workSpent);
});

test('a zero dispatch-time work allowance is reported as budget starvation, not a deadline timeout', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    prep._attemptBudgetTelemetry = true;
    // prep._workMeter.units (not the module-global workMeter.units, which accumulates across every
    // solve/test in this process and is no longer what any budget check reads — see PrepLevel's own
    // comment) is this fresh prep's own baseline, 0 until something spends against it.
    prep._workCap = prep._workMeter.units;
    const config = getConfiguredAttemptConfigs(level, null).find(candidate => !candidate.repair && !candidate.admissibleOrder)!;
    const result = await runAttempt(level.gateKeys[0], level, prep, config, 10_000, Date.now(), null, 1000);
    assert.equal(result.attempt.allocatedWorkCeiling, 0);
    assert.ok(result.attempt.workSpent! >= 0, 'primitive may spend a bounded check-interval overshoot');
    assert.equal(result.attempt.outcome, 'budget-starved');
});

test('timeBudgetMs alone still solves, via a workBudget derived from it', async () => {
    const level = makeLineLevel();
    const res = await solveLevel(level as unknown as NormalizedLevel, { timeBudgetMs: 2000 });
    assert.equal(res.ok, true);
});
