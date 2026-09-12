import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';

// Fast/deep test-tier gate (see docs/testing.md's "Fast and deep gates" and
// modules/solver/lower-bounds.test.ts's identical gate for the full rationale).
const deepTest = process.env.SOLVER_DEEP_TESTS === '0' ? test.skip : test;
import { PACK } from './encoding.js';
import { solveLevel, EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP, EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE } from './orchestration.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { makeRepairGatedInfeasibleLevel, exhaustingDispatch } from './orchestration-test-support.js';

test('repair probe retries the ordinary tier across EARLY_REPAIR_SEARCH_ORDINARY_SEED_SALTS', async () => {
    // timeBudgetMs is tiny on purpose: the probe ignores it entirely (its own node budgets
    // decide its cost — see runEarlyRepairSearch's own comment). The dispatch is stubbed to report
    // exhausting whatever node budget each round grants (see exhaustingDispatch above) instead of
    // actually running 5 seeds x 2,000,000 real search nodes — this test is about the probe's own
    // scheduling (attempt count, recorded seedSalt values), not about real search cost.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), { timeBudgetMs: 50, attemptSearchForTesting: exhaustingDispatch });
    assert.equal(result.ok, false);
    const probeAttempts = result.attempts.filter(a => a.repair && a.allocatedBudgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP);
    assert.equal(probeAttempts.length, 2);
    assert.deepEqual(probeAttempts.map(a => a.seedSalt ?? 0), [0, 1]);
    assert.equal(probeAttempts.every(a => a.nodesExpanded === 2_000_000), true);
});

test('STRATEGY_EARLY_REPAIR_SEARCH_MULTI_SEED: false restricts the probe to a single seed', async () => {
    // Must also set STRATEGY_EARLY_REPAIR_SEARCH: true explicitly — passing an ablation object with
    // any field set makes every OTHER unset STRATEGY_* flag read as false (see SolveOpts's
    // repairAdditiveBudgetMultiplierOverride comment), which would otherwise silently skip the probe
    // entirely and make this test pass for the wrong reason.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH: true, STRATEGY_EARLY_REPAIR_SEARCH_MULTI_SEED: false },
        attemptSearchForTesting: exhaustingDispatch,
    });
    assert.equal(result.ok, false);
    const probeAttempts = result.attempts.filter(a => a.repair && a.allocatedBudgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP);
    assert.equal(probeAttempts.length, 1);
    assert.equal(probeAttempts[0].seedSalt ?? 0, 0);
});

// Same shape as makeRepairGatedInfeasibleLevel, plus a must-turn cell so attempts.ts's needsRepairFallback
// / mustTurn>0 gating (attempts.ts) also appends the must-turn-biased repair config — the only
// thing STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET can ever act on (see attempts.test.ts's
// nearly-identical fixture for the same repair-gated + must-turn combination).
function makeRepairGatedMustTurnInfeasibleLevel() {
    return {
        ...makeRepairGatedInfeasibleLevel(),
        mustPassTurnDirs: new Map([[PACK(1, 1), 'either']]),
    } as unknown as NormalizedLevel;
}

// Production default-ON as of 2026-08-13 (reports/2026-08-12-early-repair-search-early-main-search-starvation.md).
// Mirrors the PRUNE_MC_NEIGHBOR_BUDGET / STRATEGY_MAIN_SEARCH_LATE_RESERVE regression pattern: an
// entirely omitted `ablation` option (cfg=null, exactly what every production caller and any CLI
// invocation without --enable-flags passes) must activate the rule, not silently leave it inert —
// the wiring gap both of those promotions shipped with and had to fix separately.
test('STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET shrinks the biased tier by default when ordinary-tier bestBadness is poor', async () => {
    const biasedNodeBudgets: number[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , budgetMs, , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            // Only the PROBE's biased-tier call is under test — the full repair fallback loop
            // later in the same solve retries the same config at a different (much larger) ms
            // budget, which must not be mistaken for a second probe attempt.
            if (config.repairMustTurnBiased && budgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP) biasedNodeBudgets.push(spent);
            else if (!config.repairMustTurnBiased) out.bestBadness = 100; // poor live evidence: well above EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE
        }
        return null;
    };
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, false);
    const scale = Math.min(1, Math.max(EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE / 100));
    const expectedScaled = Math.floor(EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET * scale);
    assert.equal(biasedNodeBudgets.length, 1);
    assert.equal(biasedNodeBudgets[0], expectedScaled);
    assert.ok(expectedScaled < EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, 'sanity: the scale actually shrank the budget');
});

test('STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET leaves the biased tier at full budget when ordinary-tier bestBadness already looks promising', async () => {
    const biasedNodeBudgets: number[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , budgetMs, , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (config.repairMustTurnBiased && budgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP) biasedNodeBudgets.push(spent);
            else if (!config.repairMustTurnBiased) out.bestBadness = 2; // promising: well under EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE (10)
        }
        return null;
    };
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, false);
    assert.equal(biasedNodeBudgets.length, 1);
    assert.equal(biasedNodeBudgets[0], EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, 'scale 1: no-op when live evidence already looks promising');
});

test('STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET: false keeps the biased tier at full budget even with poor evidence', async () => {
    const biasedNodeBudgets: number[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , budgetMs, , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (config.repairMustTurnBiased && budgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP) biasedNodeBudgets.push(spent);
            else if (!config.repairMustTurnBiased) out.bestBadness = 100;
        }
        return null;
    };
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50,
        // normalizeAblationConfig's Proxy falls back every OTHER unset key to its normal
        // registry-derived default (!OPT_IN_FEATURES.has(key)), so a sparse object naming only
        // this flag is enough to isolate its disablement without also touching
        // STRATEGY_EARLY_REPAIR_SEARCH / STRATEGY_EARLY_REPAIR_SEARCH_MULTI_SEED (both non-opt-in, default true).
        ablation: { STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET: false },
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, false);
    assert.equal(biasedNodeBudgets.length, 1);
    assert.equal(biasedNodeBudgets[0], EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET);
});

// 2026-08-13 (docs/future-work.md item 4b, reports/2026-08-13-existing-solve-data-tuning-opportunities.md):
// earlyRepairSearchAdaptiveBiasedBadnessGateOverride/earlyRepairSearchAdaptiveBiasedMinScaleOverride let a batch-tooling
// sweep compare candidate gate/scale values against the production default without editing the constants.
test('earlyRepairSearchAdaptiveBiasedBadnessGateOverride raises the gate: badness that used to shrink the tier now leaves it at full budget', async () => {
    const biasedNodeBudgets: number[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , budgetMs, , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (config.repairMustTurnBiased && budgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP) biasedNodeBudgets.push(spent);
            // badness=20 is above the production gate (10, so this would normally shrink — see the
            // first test above), but below an overridden gate of 25.
            else if (!config.repairMustTurnBiased) out.bestBadness = 20;
        }
        return null;
    };
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50,
        attemptSearchForTesting: dispatch,
        earlyRepairSearchAdaptiveBiasedBadnessGateOverride: 25,
    });
    assert.equal(result.ok, false);
    assert.equal(biasedNodeBudgets.length, 1);
    assert.equal(biasedNodeBudgets[0], EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, 'scale 1: badness <= the overridden gate is a no-op');
});

test('legacy repairProbeAdaptiveBiasedBadnessGateOverride/MinScaleOverride option names normalize to the canonical earlyRepairSearchAdaptiveBiased* overrides', async () => {
    const badnessGateDispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , , , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (!config.repairMustTurnBiased) out.bestBadness = 20; // above production gate (10), below overridden gate (25)
        }
        return null;
    };
    const legacyGate = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, attemptSearchForTesting: badnessGateDispatch,
        repairProbeAdaptiveBiasedBadnessGateOverride: 25,
    });
    const canonicalGate = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, attemptSearchForTesting: badnessGateDispatch,
        earlyRepairSearchAdaptiveBiasedBadnessGateOverride: 25,
    });
    assert.equal(legacyGate.ok, canonicalGate.ok);
    assert.equal(legacyGate.attempts.length, canonicalGate.attempts.length);

    const minScaleDispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , , , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (!config.repairMustTurnBiased) out.bestBadness = 1000;
        }
        return null;
    };
    const legacyScale = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, attemptSearchForTesting: minScaleDispatch,
        repairProbeAdaptiveBiasedMinScaleOverride: 0.1,
    });
    const canonicalScale = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, attemptSearchForTesting: minScaleDispatch,
        earlyRepairSearchAdaptiveBiasedMinScaleOverride: 0.1,
    });
    assert.equal(legacyScale.ok, canonicalScale.ok);
    assert.equal(legacyScale.attempts.length, canonicalScale.attempts.length);
});

test('earlyRepairSearchAdaptiveBiasedMinScaleOverride lowers the floor: very poor badness shrinks past the production MIN_SCALE', async () => {
    const biasedNodeBudgets: number[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , budgetMs, , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (config.repairMustTurnBiased && budgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP) biasedNodeBudgets.push(spent);
            else if (!config.repairMustTurnBiased) out.bestBadness = 1000; // terrible: gate/badness << production MIN_SCALE
        }
        return null;
    };
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50,
        attemptSearchForTesting: dispatch,
        earlyRepairSearchAdaptiveBiasedMinScaleOverride: 0.1,
    });
    assert.equal(result.ok, false);
    const expectedScaled = Math.floor(EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET * 0.1);
    assert.equal(biasedNodeBudgets.length, 1);
    assert.equal(biasedNodeBudgets[0], expectedScaled);
    assert.ok(expectedScaled < Math.floor(EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET * EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE),
        'sanity: the overridden floor shrinks further than the production MIN_SCALE would');
});

test('earlyRepairSearchAdaptiveBiasedBadnessGateOverride/MinScaleOverride undefined preserves production constants exactly', async () => {
    // Same fixture/evidence as the very first ADAPTIVE_BIASED_BUDGET test above (poor badness=100,
    // no override) -- confirms leaving both fields undefined is byte-identical to today's behavior.
    const biasedNodeBudgets: number[] = [];
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , budgetMs, , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (config.repairMustTurnBiased && budgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP) biasedNodeBudgets.push(spent);
            else if (!config.repairMustTurnBiased) out.bestBadness = 100;
        }
        return null;
    };
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50,
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, false);
    const scale = Math.min(1, Math.max(EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE / 100));
    const expectedScaled = Math.floor(EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET * scale);
    assert.equal(biasedNodeBudgets.length, 1);
    assert.equal(biasedNodeBudgets[0], expectedScaled);
});

// BUG FIXED 2026-08-12 (reports/2026-08-12-worker-count-sensitivity-early-repair-search-wallclock.md):
// runEarlyRepairSearch's per-attempt wall-clock cap was a flat 30 seconds, justified as "well above any
// observed real-world cost ... contention-independent". Measured 4-way CPU contention on a 4-core
// host (--workers=4, not even oversubscribed) reproducibly dropped one early-repair-search attempt's real
// throughput to ~37,000-43,000 nodes/sec — well under the old cap's implicit >=66,667 nodes/sec
// floor (2,000,000 nodes / 30s) — silently truncating the attempt below its intended node budget
// and changing solve outcomes purely as a function of host contention. This test encodes the fix's
// safety margin directly rather than re-running real contention (which is inherently
// host/load-dependent and unsuitable for a fast, deterministic unit test): the cap must still
// cover the probe's worst-case node budget at a throughput conservatively BELOW the measured
// contended rate, not just above nominal uncontended throughput — the exact assumption that broke.
test('EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP survives real contention, not just an idle host', () => {
    const CONSERVATIVE_CONTENDED_NODES_PER_SEC = 10_000; // well under the ~37k-43k measured contended rate
    const WORST_CASE_NODE_BUDGET = 6_000_000; // EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, a single un-split gate
    const minimumSafeMs = (WORST_CASE_NODE_BUDGET / CONSERVATIVE_CONTENDED_NODES_PER_SEC) * 1000;
    assert.ok(
        EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP >= minimumSafeMs,
        `EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP (${EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP}ms) must cover ${WORST_CASE_NODE_BUDGET} nodes at ${CONSERVATIVE_CONTENDED_NODES_PER_SEC} nodes/sec (${minimumSafeMs}ms), with margin`,
    );
    // The old, falsified assumption was a flat 30s cap — well under minimumSafeMs above, which is
    // exactly why it broke under contention. Guards against silently reverting to it.
    assert.ok(EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP > 30_000);
});

// BUG FIXED 2026-07-17 (reports/2026-07-17-goal-attraction-disabled-retry-dose-response.md's flagged
// "unexplained observation" + the follow-up budget-accounting audit): the probe's cost used to be
// completely unaffected by repairAdditiveBudgetMultiplierOverride, even at 0 — a caller explicitly asking
// for zero repair-related cost (both interactive UI call sites; any solver-testing sweep following
// this session's own documented policy) still silently paid the probe's full node-budget cost.
// Confirmed on a real corpus level (R02401): repairAdditiveBudgetMultiplierOverride: 0 correctly zeroed the
// LATER full-budget fallback loop but the EARLY probe still ran to completion, costing ~10.7s of
// unaccounted wall time. Fixed by skipping the probe outright whenever the resolved
// repairAdditiveBudgetMultiplier is exactly 0 — same "no repair-related cost, period" signal the later
// fallback loop already honored.
test('repairAdditiveBudgetMultiplierOverride: 0 skips the early repair probe entirely', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        repairAdditiveBudgetMultiplierOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.repair), false);
});

test('repairAdditiveBudgetMultiplierOverride: undefined (production default) still runs the probe', async () => {
    // Guards against the fix above accidentally widening beyond exactly-0 (e.g. treating any
    // falsy/undefined override as "skip") — the production default (no override at all) must
    // reach the probe exactly as before this fix.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), { timeBudgetMs: 50, attemptSearchForTesting: exhaustingDispatch });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.repair), true);
});

// BUG FIXED 2026-07-17 (see reports/2026-07-17-early-repair-search-node-budget-starvation.md): the probe
// never checked the caller's external `nodeBudget` at all, so it always ran its full internal
// worst case (here, 2 seeds x 2,000,000 = up to 4,000,000 nodes) regardless of how small an
// external ceiling the caller asked for — confirmed at scale on the real corpus-2 batch workflow,
// where the probe alone (up to ~10,000,000 nodes on must-turn levels) consistently blew through
// the workflow's 8,000,000-node ceiling by ~25%, leaving the main loop/fallback/diversity pass
// zero chance to ever run. Fixed by capping each seed-salt round's own node budget by whatever's
// left of the external ceiling — confirms the probe now stays close to a small external nodeBudget
// instead of overshooting by a full round's worth (2,000,000 here).
// The one deliberately-not-stubbed test in this section (see the comment inside it): a real
// search, so real cross-tier node-budget capping arithmetic is what's actually exercised.
deepTest('the repair probe caps itself to a small external nodeBudget instead of running its full internal worst case', async () => {
    // Uses the real search, not exhaustingDispatch: this test's whole point is the cross-tier node-
    // budget capping arithmetic that decides how much of the external ceiling each round actually
    // gets to spend — a stub that reports "spent = whatever it was granted" would just replay that
    // same arithmetic back at itself and could never catch a regression in it.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        nodeBudget: 250_000, // far below one 2,000,000-node internal seed round
        // Isolates early-repair-search capping from the unrelated main-search late-suffix reserve (production
        // default-ON as of 2026-08-12), which would otherwise also shape node accounting here.
        mainSearchLateReserveFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.equal(result.nodeBudgetReached, true);
    // Without the fix, even the first ordinary seed could spend its full 2,000,000-node internal
    // allowance despite this much smaller external ceiling. With the fix, that first round itself is
    // capped by the remaining caller budget, so total work stays close to 250,000.
    assert.ok(result.nodesExpanded < 300_000, `expected nodesExpanded close to the 250,000 external ceiling (the old uncapped first round could spend ~2,000,000), got ${result.nodesExpanded}`);
});

// ── STRATEGY_REPAIR_SHRINK_RECOVERY ────────────────────────────────────
//
// Opt-in, default OFF (see REPAIR_SHRINK_RECOVERY_NODE_RESERVE_FRACTION's own comment for the
// R00408 regression it exists to repair). The shrink itself is what creates the debt, so these
// tests reuse makeRepairGatedMustTurnInfeasibleLevel + the poor-bestBadness dispatch the adaptive-
// budget tests above already establish: ordinary tier reports badness 100, so the biased tier is
// scaled to MIN_SCALE and the recovery tier has something to restore.
function shrinkRecoveryDispatch(recovered: number[], solveOnFullBudget = false) {
    return (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , budgetMs, , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) {
            out.nodesExpanded = spent;
            out.timedOut = true;
            if (config.repairMustTurnBiased && budgetMs === EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP) recovered.push(spent);
            else if (!config.repairMustTurnBiased) out.bestBadness = 100;
        }
        // Only a biased attempt granted the FULL probe budget solves — exactly the R00408 shape,
        // where the shrunken tier fails and the same config at its unshrunk budget wins.
        if (solveOnFullBudget && config.repairMustTurnBiased && spent === EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET) {
            return [0, 1] as unknown as ReturnType<typeof runAttemptSearch> extends Promise<infer R> ? R : never;
        }
        return null;
    }) as typeof runAttemptSearch;
}

test('shrink recovery is inert by default (cfg=null): no recovery attempt is ever run', async () => {
    const budgets: number[] = [];
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, nodeBudget: 40_000_000,
        attemptSearchForTesting: shrinkRecoveryDispatch(budgets),
    });
    assert.equal(result.attempts.some(a => a.stageId === 'repair-shrink-recovery'), false);
});

test('shrink recovery stays off under an explicit { FLAG: false }, and under a sparse unrelated ablation object', async () => {
    for (const ablation of [
        { STRATEGY_REPAIR_SHRINK_RECOVERY: false },
        { STRATEGY_EARLY_REPAIR_SEARCH: true },
    ]) {
        const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
            timeBudgetMs: 50, nodeBudget: 40_000_000, ablation,
            attemptSearchForTesting: shrinkRecoveryDispatch([]),
        });
        assert.equal(result.attempts.some(a => a.stageId === 'repair-shrink-recovery'), false);
    }
});

test('shrink recovery re-runs the shrunk biased config at its FULL probe budget', async () => {
    const biasedBudgets: number[] = [];
    // Ample ceiling: the reserve is min(debt, fraction x earlyTierNodeBudget) and the tier is then
    // additionally bounded by whatever headroom is actually left, so a tight ceiling tests the
    // arithmetic rather than the contract. With room to spare the full budget must be restored.
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, nodeBudget: 400_000_000,
        ablation: { STRATEGY_REPAIR_SHRINK_RECOVERY: true },
        attemptSearchForTesting: shrinkRecoveryDispatch(biasedBudgets),
    });
    const scale = Math.min(1, Math.max(EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE / 100));
    const shrunk = Math.floor(EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET * scale);
    const recovery = result.attempts.filter(a => a.stageId === 'repair-shrink-recovery');
    assert.equal(recovery.length, 1, 'exactly one recovery attempt');
    assert.equal(recovery[0].nodesExpanded, EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, 'recovered at the FULL budget, not the shrunken one');
    assert.ok((recovery[0].nodesExpanded ?? 0) > shrunk, 'strictly more than the shrunken grant');
    assert.ok(shrunk < EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, 'sanity: the shrink actually fired');
    assert.ok(biasedBudgets.includes(shrunk), 'sanity: the original probe attempt was the shrunken one');
    // Recovery attempts are identified by their canonical stage rather than a second legacy probe tag.
    assert.equal(recovery[0].stageId, 'repair-shrink-recovery');
});

test('shrink recovery can solve a level the shrink otherwise loses', async () => {
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, nodeBudget: 400_000_000,
        ablation: { STRATEGY_REPAIR_SHRINK_RECOVERY: true },
        attemptSearchForTesting: shrinkRecoveryDispatch([], true),
    });
    assert.equal(result.ok, true, 'the full-budget re-run wins');
    assert.equal(result.attempts.at(-1)?.stageId, 'repair-shrink-recovery');
});

test('shrink recovery does not run when the shrink never fired (promising ordinary bestBadness)', async () => {
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [config, , , prep, , , , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        // badness 2 is well under the gate, so the biased tier keeps its full budget and there is
        // no debt to recover — the tier must stay a strict no-op rather than re-running anything.
        if (out) { out.nodesExpanded = spent; out.timedOut = true; if (!config.repairMustTurnBiased) out.bestBadness = 2; }
        return null;
    }) as typeof runAttemptSearch;
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, nodeBudget: 40_000_000,
        ablation: { STRATEGY_REPAIR_SHRINK_RECOVERY: true },
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.attempts.some(a => a.stageId === 'repair-shrink-recovery'), false);
});

test('shrink recovery is inert when the shrink mechanism itself is disabled', async () => {
    const result = await solveLevel(makeRepairGatedMustTurnInfeasibleLevel(), {
        timeBudgetMs: 50, nodeBudget: 40_000_000,
        ablation: { STRATEGY_REPAIR_SHRINK_RECOVERY: true, STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET: false },
        attemptSearchForTesting: shrinkRecoveryDispatch([]),
    });
    assert.equal(result.attempts.some(a => a.stageId === 'repair-shrink-recovery'), false);
});
