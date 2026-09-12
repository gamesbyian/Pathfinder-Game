import assert from 'node:assert/strict';
import { test } from 'vitest';
import { solveLevel, COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION, ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION, CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION } from './orchestration.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { makeGoalAttractionDisabledRetryGatedInfeasibleLevel } from './orchestration-test-support.js';

// ── STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY ─────────────────────────────────────────────
//
// PROMOTED to default-ON (2026-08-15, same day as built — see COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION's
// own comment in orchestration.ts for the full-corpus A/B population-validation history behind the
// promotion). Reuses the same infeasible-level pattern goal-attraction-disabled-retry's own tests already
// establish: this level's every attempt is pruned near-instantly by distance/parity regardless of
// search strategy or STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION, so the inertness/suppression tests below
// don't depend on the mechanism's own real rescue behavior.

test('coarse-state-near-tie-retention-disabled-retry pass reruns the main ladder once more after main loop and repair fallback fail', async () => {
    // goalAttractionDisabledRetryBudgetFractionOverride/admissibleOrderBudgetFractionOverride: 0 isolate the
    // pass under test from its sibling last-resort tiers, which also run by default and would
    // otherwise inflate "mainSearchAttempts" below (their attempts carry none of these three markers).
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
    });
    assert.equal(result.ok, false);
    const retryAttempts = result.attempts.filter(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry');
    const mainSearchAttempts = result.attempts.filter(a => a.stageId !== 'coarse-state-near-tie-retention-disabled-retry');
    assert.ok(retryAttempts.length > 0, 'expected at least one coarse-state-near-tie-retention-disabled-retry attempt');
    // The pass reruns the exact same mainConfigs ladder, so (this level being pruned near-instantly
    // regardless of budget, meaning neither run gets cut off partway through) it should run through
    // exactly as many configs as the main loop itself did.
    assert.equal(retryAttempts.length, mainSearchAttempts.length);
});

test('coarse-state-near-tie-retention-disabled-retry pass is ACTIVE by default (cfg=null) since promotion: retry attempts run without any explicit ablation override', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), 'expected the promoted default-ON tier to run with cfg=null');
});

test('disableExtraBudgetPasses: true suppresses the promoted default-ON pass even with cfg=null (the two interactive solve UIs\' real production combination)', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), false);
});

test('coarse-state-near-tie-retention-disabled-retry pass stays off under the legacy retry alias set false', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_DEDUP_NEAR_TIE_RETRY: false },
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), false);
});


test('coarse-state-near-tie-retention-disabled-retry pass also stays off under the canonical false spelling', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: false },
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), false,
        'legacy and canonical spellings must normalize to identical runtime behavior');
});

test('a sparse config that already disables near-tie retention suppresses the behavior-identical retry', async () => {
    // Audit 12 requires a funded retry to change effective behavior. This sparse config already
    // applies the exact treatment the retry would force, so rerunning it would only buy the same
    // search a second dose and corrupt rescue attribution.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), false,
        "retry must not rerun when its forced treatment is already the caller's effective setting");
});

test('coarseStateNearTieRetentionRetryBudgetFractionOverride: 0 suppresses the pass even with the flag on', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: true },
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), false);
});

test('disableExtraBudgetPasses: true suppresses the pass even with the flag on, but an explicit override still wins', async () => {
    const suppressed = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: true },
        disableExtraBudgetPasses: true,
    });
    assert.equal(suppressed.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), false);

    const overridden = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: true },
        disableExtraBudgetPasses: true,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION,
    });
    assert.ok(overridden.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'));
});

test('coarse-state-near-tie-retention-disabled-retry pass can solve a level the main loop misses, and disables retention while it runs', async () => {
    // Simulates the real mechanism's shape without depending on search.ts's actual beam internals:
    // succeeds only once prep._cfg reflects STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION explicitly disabled —
    // exactly what the retry pass's own Proxy override produces, and exactly what the ordinary main
    // loop's cfg (retention left at its normalized-default true) never does.
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep] = args;
        if (prep._cfg && prep._cfg.STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION === false) return [0, 1];
        return null;
    }) as typeof runAttemptSearch;
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: true },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, true, 'the retention-off retry wins');
    assert.equal(result.attempts.at(-1)?.stageId, 'coarse-state-near-tie-retention-disabled-retry');
});

// 2026-08-28: coarse-state-near-tie-retention-disabled-retry was the first tier migrated off queue #2 step 3's ms-derived
// work-dose debt (docs/solver-budget-determinism.md's "Remaining ms-shaped allocation debt";
// scaledStageWorkBudget in budget-units.ts). These two tests are this tier's own version of the
// main-ladder invariant already pinned above ('a non-binding deadline cannot resize an
// explicit-work main-ladder trajectory'): a non-binding deadline change alone must not resize this
// tier's own work dose, and an explicit baseWorkBudget now genuinely sizes it instead of being
// silently ignored in favor of a fresh timeBudgetMs-derived pool.
function isolateDedupNearTieRetryOpts(overrides = {}) {
    return {
        attemptBudgetTelemetry: true,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ...overrides,
    };
}

test('coarse-state-near-tie-retention-disabled-retry work dose no longer resizes with a non-binding deadline change', async () => {
    const run = (timeBudgetMs: number) => solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(),
        isolateDedupNearTieRetryOpts({ timeBudgetMs, workBudget: 200_000 }));
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one coarse-state-near-tie-retention-disabled-retry attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the (non-binding) deadline');
});

test('coarse-state-near-tie-retention-disabled-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const solveWith = (baseWorkBudget: number) => solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(),
        isolateDedupNearTieRetryOpts({ timeBudgetMs: 1000, baseWorkBudget }));
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null, 'expected a coarse-state-near-tie-retention-disabled-retry attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

// ── STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY ───────────────────────────────
//
// Opt-in, default OFF (see ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION's own comment in
// orchestration.ts for the full local-validation history: recovers R03148 referee-valid at the
// shipped 0.5 reserve fraction, confirmed zero effect on R02644 at both a solving and a
// non-solving budget). Reuses the same infeasible-level pattern the coarse-state-near-tie-retention-disabled-retry suite
// above already establishes.

test('admissible-order-alternate-tiebreak-retry pass can solve a level the admissible-order-fallback tier\'s own pass misses, and never retries \'default\'', async () => {
    // Mock: only a non-'default' admissible-order-fallback profile ever solves. admissibleOrderBudgetFractionOverride: 0
    // suppresses the admissible-order-fallback tier's OWN pass entirely (so 'default'/'none' never get tried
    // there), isolating this tier's own contribution — same isolation shape as the coarse-state-near-tie-retention retry suite's
    // own "can solve a level the main loop misses" test.
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config] = args;
        if (config.admissibleOrder && config.scoringProfileId !== 'default') return [0, 1];
        return null;
    }) as typeof runAttemptSearch;
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: true },
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, true, 'the non-default retry wins');
    assert.equal(result.attempts.at(-1)?.stageId, 'admissible-order-alternate-tiebreak-retry');
    assert.equal(result.attempts.filter(a => a.stageId === 'admissible-order-alternate-tiebreak-retry' && a.scoringProfileId === 'default').length, 0, "'default' is never retried by this tier");
});

test('admissible-order-alternate-tiebreak-retry pass is ACTIVE by default (cfg=null) since promotion: retry attempts run without any explicit ablation override', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.attempts.some(a => a.stageId === 'admissible-order-alternate-tiebreak-retry'), 'expected the promoted default-ON tier to run with cfg=null');
});

test('disableExtraBudgetPasses: true suppresses the promoted default-ON admissible-order-alternate-tiebreak-retry pass even with cfg=null (the two interactive solve UIs\' real production combination)', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'admissible-order-alternate-tiebreak-retry'), false);
});

test('admissible-order-alternate-tiebreak-retry pass stays off under an explicit { STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: false }', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: false },
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'admissible-order-alternate-tiebreak-retry'), false);
});

test('a sparse unrelated ablation object leaves the promoted default-ON admissible-order-alternate-tiebreak-retry pass active', async () => {
    // Since promotion, this flag is unset-means-true (the standard `!cfg || cfg.FLAG` convention),
    // so a sparse config that only touches a DIFFERENT flag must still leave THIS one active — same
    // check as the coarse-state-near-tie-retention-disabled-retry suite's own equivalent test.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.attempts.some(a => a.stageId === 'admissible-order-alternate-tiebreak-retry'), 'expected the promoted tier to still run: only an unrelated flag was set');
});

test('admissibleOrderNonDefaultRetryBudgetFractionOverride: 0 suppresses the pass even with the flag on', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: true },
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'admissible-order-alternate-tiebreak-retry'), false);
});

test('disableExtraBudgetPasses: true suppresses the admissible-order-alternate-tiebreak-retry pass even with the flag on, but an explicit override still wins', async () => {
    const suppressed = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: true },
        disableExtraBudgetPasses: true,
    });
    assert.equal(suppressed.attempts.some(a => a.stageId === 'admissible-order-alternate-tiebreak-retry'), false);

    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config] = args;
        if (config.admissibleOrder && config.scoringProfileId !== 'default') return [0, 1];
        return null;
    }) as typeof runAttemptSearch;
    const overridden = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: true },
        disableExtraBudgetPasses: true,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION,
        admissibleOrderBudgetFractionOverride: 0,
        attemptSearchForTesting: dispatch,
    });
    assert.ok(overridden.attempts.some(a => a.stageId === 'admissible-order-alternate-tiebreak-retry'));
});

// 2026-08-28: admissible-order-alternate-tiebreak-retry was the third tier migrated off queue #2 step 3's
// ms-derived work-dose debt (docs/solver-budget-determinism.md's "Remaining ms-shaped allocation
// debt"; scaledStageWorkBudget in budget-units.ts) -- same pattern and same two tests as
// coarse-state-near-tie-retention-disabled-retry's/repair-fallback's own pairs above.
function isolateAdmissibleOrderNonDefaultRetryOpts(overrides: Record<string, unknown> = {}) {
    return {
        attemptBudgetTelemetry: true,
        ablation: { STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ...overrides,
    };
}

test('admissible-order-alternate-tiebreak-retry work dose no longer resizes with a non-binding deadline change', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const run = (timeBudgetMs: number) => solveLevel(level, isolateAdmissibleOrderNonDefaultRetryOpts({ timeBudgetMs, workBudget: 200_000 }));
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'admissible-order-alternate-tiebreak-retry')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one admissible-order-alternate-tiebreak-retry attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the (non-binding) deadline');
});

test('admissible-order-alternate-tiebreak-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const level = makeGoalAttractionDisabledRetryGatedInfeasibleLevel();
    const solveWith = (baseWorkBudget: number) => solveLevel(level, isolateAdmissibleOrderNonDefaultRetryOpts({ timeBudgetMs: 1000, baseWorkBudget }));
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'admissible-order-alternate-tiebreak-retry')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null, 'expected an admissible-order-alternate-tiebreak-retry attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});

// ── STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY ────────────────────────────────
//
// PROMOTED to production default-ON (see CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION's own
// comment in orchestration.ts for the full local-then-population validation history: recovers
// R02114/R00592 referee-valid at the shipped 0.5 reserve fraction once its ceiling was fixed to
// stack on STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY's own ceiling rather than restart from
// `nodeBudget`; confirmed zero effect on R02248/R03248, both of which solve via the normal ladder;
// population-validated 2026-08-16 on run 31918095910 — corpus1 95/95 unchanged, corpus2 +10/-0).
// Reuses the same infeasible-level pattern the sibling retry-tier suites above already establish.

test('connectivity-axis-prune-disabled-retry pass reruns the main ladder once more after everything else fails', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: true, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
    });
    assert.equal(result.ok, false);
    const retryAttempts = result.attempts.filter(a => a.stageId === 'connectivity-axis-prune-disabled-retry');
    const mainSearchAttempts = result.attempts.filter(a => a.stageId !== 'connectivity-axis-prune-disabled-retry');
    assert.ok(retryAttempts.length > 0, 'expected at least one connectivity-axis-prune-disabled-retry attempt');
    // The pass reruns the exact same mainConfigs ladder, so (this level being pruned near-instantly
    // regardless of budget, meaning neither run gets cut off partway through) it should run through
    // exactly as many configs as the main loop itself did.
    assert.equal(retryAttempts.length, mainSearchAttempts.length);
});

test('connectivity-axis-prune-disabled-retry pass is ACTIVE by default (cfg=null) since promotion: retry attempts run without any explicit ablation override', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'), 'expected the promoted default-ON tier to run with cfg=null');
});

test('disableExtraBudgetPasses: true suppresses the promoted default-ON connectivity-axis-prune-disabled-retry pass even with cfg=null (the two interactive solve UIs\' real production combination)', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'), false);
});

test('connectivity-axis-prune-disabled-retry pass stays off under an explicit { STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: false }', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: false },
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'), false);
});

test('a sparse config that already disables connectivity-axis pruning suppresses the behavior-identical retry', async () => {
    // Audit 12 applies the same distinctness rule here: the mechanism flag is the retry treatment,
    // not an unrelated setting. If it is already false, the retry has no behavioral delta to fund.
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'), false,
        "retry must not rerun when its forced treatment is already the caller's effective setting");
});

test('connectivityAxisExhaustedRetryBudgetFractionOverride: 0 suppresses the pass even with the flag on', async () => {
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: true },
        connectivityAxisExhaustedRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'), false);
});

test('disableExtraBudgetPasses: true suppresses the connectivity-axis-prune-disabled-retry pass even with the flag on, but an explicit override still wins', async () => {
    const suppressed = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: true },
        disableExtraBudgetPasses: true,
    });
    assert.equal(suppressed.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'), false);

    const overridden = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: true },
        disableExtraBudgetPasses: true,
        connectivityAxisExhaustedRetryBudgetFractionOverride: CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION,
    });
    assert.ok(overridden.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'));
});

test('connectivity-axis-prune-disabled-retry pass can solve a level the main loop misses, and disables the connectivity-axis-exhausted prune while it runs', async () => {
    // Simulates the real mechanism's shape without depending on topology.ts's actual flood-fill
    // internals: succeeds only once prep._cfg reflects PRUNE_CONNECTIVITY_AXIS_EXHAUSTED explicitly
    // disabled — exactly what the retry pass's own Proxy override produces, and exactly what the
    // ordinary main loop's cfg (the prune left at its normalized-default true) never does.
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep] = args;
        if (prep._cfg && prep._cfg.PRUNE_CONNECTIVITY_AXIS_EXHAUSTED === false) return [0, 1];
        return null;
    }) as typeof runAttemptSearch;
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: true },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, true, 'the connectivity-axis-exhausted-off retry wins');
    assert.equal(result.attempts.at(-1)?.stageId, 'connectivity-axis-prune-disabled-retry');
});


// 2026-09-01: connectivity-axis-prune-disabled-retry is the fourth tier migrated off
// queue #2 step 3's ms-derived work-dose debt. Same ownership invariant as the first three:
// a non-binding wall deadline must not resize an explicit-work retry dose, and explicit
// baseWorkBudget must size the fresh pool. The tier's ms total remains a wall-deadline bound.
function isolateConnectivityRetryWorkDoseOpts(overrides: Record<string, unknown> = {}) {
    return {
        attemptBudgetTelemetry: true,
        ablation: {
            STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: true,
            STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY: false,
        },
        repairAdditiveBudgetMultiplierOverride: 0,
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
        coarseStateNearTieRetentionRetryBudgetFractionOverride: 0,
        admissibleOrderNonDefaultRetryBudgetFractionOverride: 0,
        mcNeighborBudgetRetryBudgetFractionOverride: 0,
        repairLateProbeNodeBudgetOverride: 0,
        ...overrides,
    };
}

test('connectivity-axis-prune-disabled-retry work dose no longer resizes with a non-binding deadline change', async () => {
    const run = (timeBudgetMs: number) => solveLevel(
        makeGoalAttractionDisabledRetryGatedInfeasibleLevel(),
        isolateConnectivityRetryWorkDoseOpts({ timeBudgetMs, workBudget: 200_000 }),
    );
    const shortDeadline = await run(1000);
    const longDeadline = await run(600_000);
    const dose = (result: Awaited<ReturnType<typeof solveLevel>>) => result.attempts
        .filter(a => a.stageId === 'connectivity-axis-prune-disabled-retry')
        .map(a => a.allocatedWorkCeiling);
    const shortDose = dose(shortDeadline);
    assert.ok(shortDose.length > 0, 'expected at least one connectivity-axis-prune-disabled-retry attempt');
    assert.deepEqual(dose(longDeadline), shortDose,
        'this tier\'s own work pool must depend on workBudget, not on the non-binding deadline');
});

test('connectivity-axis-prune-disabled-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs', async () => {
    const solveWith = (baseWorkBudget: number) => solveLevel(
        makeGoalAttractionDisabledRetryGatedInfeasibleLevel(),
        isolateConnectivityRetryWorkDoseOpts({ timeBudgetMs: 1000, baseWorkBudget }),
    );
    const small = await solveWith(200_000);
    const large = await solveWith(20_000_000);
    const ceiling = (result: Awaited<ReturnType<typeof solveLevel>>) =>
        result.attempts.find(a => a.stageId === 'connectivity-axis-prune-disabled-retry')?.allocatedWorkCeiling ?? null;
    const smallCeiling = ceiling(small);
    const largeCeiling = ceiling(large);
    assert.ok(smallCeiling != null && largeCeiling != null,
        'expected a connectivity-axis-prune-disabled-retry attempt in both runs');
    assert.ok((largeCeiling as number) > (smallCeiling as number),
        'an explicit baseWorkBudget must now size this tier\'s own dose');
});
