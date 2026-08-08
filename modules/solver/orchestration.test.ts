import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { getTrapSpotBudgetMs, solveLevel, attemptConfigKey, attemptBudgetShare, ATTRACTION_DIVERSITY_BUDGET_FRACTION, normalizeAblationConfig } from './orchestration.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { repairPrimarySeed } from './repair-search.js';
import { workMeter } from './work-meter.js';
import { buildExperimentList, defaultConfig, FEATURES, OPT_IN_FEATURES } from '../../scripts/ablation-config.mjs';

function makeLineLevel() {
    return {
        grid: { w: 3, h: 1 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(2, 0),
        reqLen: 2,
        reqInt: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('solveLevel solves a simple prepared level', async () => {
    const result = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000 });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.deepEqual(result.solution, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
    assert.equal(result.solutions.length, 1);
    assert.equal(result.attempts.some(attempt => attempt.ok), true);
    assert.equal(typeof result.nodesExpanded, 'number');
});

test('primeAttempt: a matching winner config solves via the winner-first pre-attempt', async () => {
    const level = makeLineLevel();
    // Use a real config key from this level's own configured list (the same source solveLevel
    // matches against), so the test exercises the actual key-matching path, not a hardcoded string.
    const configKey = attemptConfigKey(getConfiguredAttemptConfigs(level, null)[0]);
    const gateKey = level.gateKeys[0];
    const primed = await solveLevel(level, { timeBudgetMs: 1000, primeAttempt: { gateKey, configKey } });
    assert.equal(primed.ok, true);
    assert.equal(primed.solvedByPrime, true, 'a matching prime config should solve via the pre-attempt');
    assert.deepEqual(primed.solution, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
    assert.equal(primed.attempts.length, 1, 'a prime hit runs exactly one attempt, not the whole ladder');
});

test('primeAttempt: an unmatched config key falls through to the normal ladder', async () => {
    const level = makeLineLevel();
    const primed = await solveLevel(level, {
        timeBudgetMs: 1000,
        primeAttempt: { gateKey: level.gateKeys[0], configKey: 'dfs:__nonexistent_profile__' },
    });
    assert.equal(primed.ok, true, 'an unmatched prime must not prevent the normal solve');
    assert.notEqual(primed.solvedByPrime, true, 'no prime hit when the config key does not match');
    assert.deepEqual(primed.solution, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

// primeAttempt.seedSalt (2026-07-23): a repair winner's success can depend on WHICH PRNG seed the
// repair search used (repairSearchFromGate seeds from repairPrimarySeed(gateKey, seedSalt)), so
// replaying just the winning config+gate at the default salt (0) can miss a winner that only solved
// at a nonzero salt. This test proves the salt is actually threaded to the underlying search (not
// silently dropped/defaulted) by checking the resulting attempt's own recorded randomSeed against a
// direct repairPrimarySeed computation — using the genuinely-unsolvable makeRepairGatedInfeasibleLevel
// so the assertion is about PLUMBING (which seed got used), not about a specific solve outcome.
test('primeAttempt.seedSalt threads through to the underlying repair search PRNG seed', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const gateKey = level.gateKeys[0];
    const repairConfig = getConfiguredAttemptConfigs(level, null).find(c => c.repair);
    const configKey = attemptConfigKey(repairConfig!);
    const seedSalt = 3;
    const result = await solveLevel(level, {
        timeBudgetMs: 50,
        primeAttempt: { gateKey, configKey, seedSalt, nodeBudget: 1000 },
    });
    assert.equal(result.attempts[0]?.repair, true, 'the prime attempt itself should be recorded first');
    assert.equal(result.attempts[0]?.seedSalt, seedSalt);
    assert.equal(result.attempts[0]?.randomSeed, repairPrimarySeed(gateKey, seedSalt),
        'the prime must seed the SAME PRNG state a cold ladder run at this salt would use');
});

test('solveLevel honors cancellation from yieldFn', async () => {
    await assert.rejects(
        () => solveLevel(makeLineLevel(), {
            timeBudgetMs: 1000,
            yieldFn: () => { throw new Error('Solver:cancelled'); },
        }),
        /Solver:cancelled/,
    );
});

function makePortalBranchLevel() {
    const portalA = PACK(1, 0);
    const portalB = PACK(1, 2);
    return {
        grid: { w: 3, h: 3 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(2, 2),
        reqLen: 2, // only reachable via the portal: direct Manhattan distance is 4
        reqInt: 0,
        blockSet: new Set(),
        portalMap: new Map([
            [portalA, { dest: portalB, color: '#fff' }],
            [portalB, { dest: portalA, color: '#fff' }],
        ]),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('solveLevel honors forcedPortalExitKey toward the only viable direction', async () => {
    const result = await solveLevel(makePortalBranchLevel(), {
        timeBudgetMs: 1000,
        forcedPortalExitKey: { from: PACK(1, 2), to: PACK(2, 2) },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.solution, [PACK(0, 0), PACK(1, 0), PACK(1, 2), PACK(2, 2)]);
});

test('solveLevel fails when forcedPortalExitKey points away from the goal', async () => {
    const result = await solveLevel(makePortalBranchLevel(), {
        timeBudgetMs: 1000,
        forcedPortalExitKey: { from: PACK(1, 2), to: PACK(0, 2) },
    });
    assert.equal(result.ok, false);
});

test('getTrapSpotBudgetMs scales with area and special mechanics within bounds', () => {
    const small = getTrapSpotBudgetMs(makeLineLevel());
    assert.equal(small, 10000);

    const large = makeLineLevel();
    large.grid = { w: 100, h: 100 };
    large.reqLen = 5000;
    large.mustPassKeys = [PACK(1, 0), PACK(2, 0)];
    large.portalMap = new Map([[PACK(0, 0), { dest: PACK(1, 0) }]]);
    const capped = getTrapSpotBudgetMs(large);
    assert.equal(capped, 120000);
});

test('getTrapSpotBudgetMs scales the search-dependent cost with gate count', () => {
    // The search runs a DFS per gate and splits the budget, so more gates => more
    // budget (until the cap), preventing later gates from being starved.
    const base = makeLineLevel();
    base.grid = { w: 10, h: 10 };
    base.reqLen = 30;
    const oneGate = getTrapSpotBudgetMs({ ...base, gateKeys: [PACK(0, 0)] });
    const threeGates = getTrapSpotBudgetMs({ ...base, gateKeys: [PACK(0, 0), PACK(9, 0), PACK(0, 9)] });
    assert.ok(threeGates > oneGate, `expected ${threeGates} > ${oneGate}`);
});

// Repair-gated (mustCross >= POLICY.REPAIR_MC_MIN, mustPass >= POLICY.REPAIR_MP_MIN — see
// attempts.ts's needsRepairFallback) and deterministically infeasible (reqLen: 1 vs. a
// gate/goal Manhattan distance of 10), so the ordinary repair probe exhausts its node budget on
// every seed rather than winning — a fast, reliable way to exercise runRepairProbe's multi-seed
// retry mechanism itself (attempt count, recorded seedSalt values, ablation gating) without
// depending on any specific level actually being rescued by a particular seed.
function makeRepairGatedInfeasibleLevel() {
    return {
        grid: { w: 6, h: 6 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(5, 5),
        reqLen: 1,
        reqInt: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [PACK(1, 1), PACK(3, 1), PACK(1, 3)],
        mustCrossKeys: [PACK(2, 2), PACK(4, 4)],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('repair probe retries the ordinary tier across REPAIR_PROBE_ORDINARY_SEED_SALTS', async () => {
    // timeBudgetMs is tiny on purpose: the probe ignores it entirely (its own node budgets
    // decide its cost — see runRepairProbe's own comment), so this only shrinks the main
    // loop/full repair fallback that runs afterward, keeping the test's wall time close to the
    // probe's own (unavoidable) cost of exhausting 5 seeds x 2,000,000 nodes.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), { timeBudgetMs: 50 });
    assert.equal(result.ok, false);
    const probeAttempts = result.attempts.filter(a => a.repair && a.allocatedBudgetMs === 30000);
    assert.equal(probeAttempts.length, 2);
    assert.deepEqual(probeAttempts.map(a => a.seedSalt ?? 0), [0, 1]);
    assert.equal(probeAttempts.every(a => a.nodesExpanded === 2_000_000), true);
});

test('STRATEGY_REPAIR_PROBE_MULTI_SEED: false restricts the probe to a single seed', async () => {
    // Must also set STRATEGY_REPAIR_PROBE: true explicitly — passing an ablation object with
    // any field set makes every OTHER unset STRATEGY_* flag read as false (see SolveOpts's
    // repairBudgetFractionOverride comment), which would otherwise silently skip the probe
    // entirely and make this test pass for the wrong reason.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        ablation: { STRATEGY_REPAIR_PROBE: true, STRATEGY_REPAIR_PROBE_MULTI_SEED: false },
    });
    assert.equal(result.ok, false);
    const probeAttempts = result.attempts.filter(a => a.repair && a.allocatedBudgetMs === 30000);
    assert.equal(probeAttempts.length, 1);
    assert.equal(probeAttempts[0].seedSalt ?? 0, 0);
});

// BUG FIXED 2026-07-17 (reports/2026-07-17-attraction-diversity-dose-response.md's flagged
// "unexplained observation" + the follow-up budget-accounting audit): the probe's cost used to be
// completely unaffected by repairBudgetFractionOverride, even at 0 — a caller explicitly asking
// for zero repair-related cost (both interactive UI call sites; any solver-testing sweep following
// this session's own documented policy) still silently paid the probe's full node-budget cost.
// Confirmed on a real corpus level (R02401): repairBudgetFractionOverride: 0 correctly zeroed the
// LATER full-budget fallback loop but the EARLY probe still ran to completion, costing ~10.7s of
// unaccounted wall time. Fixed by skipping the probe outright whenever the resolved
// repairBudgetFraction is exactly 0 — same "no repair-related cost, period" signal the later
// fallback loop already honored.
test('repairBudgetFractionOverride: 0 skips the early repair probe entirely', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        repairBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.repair), false);
});

test('repairBudgetFractionOverride: undefined (production default) still runs the probe', async () => {
    // Guards against the fix above accidentally widening beyond exactly-0 (e.g. treating any
    // falsy/undefined override as "skip") — the production default (no override at all) must
    // reach the probe exactly as before this fix.
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), { timeBudgetMs: 50 });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.repair), true);
});

// BUG FIXED 2026-07-17 (see reports/2026-07-17-repair-probe-node-budget-starvation.md): the probe
// never checked the caller's external `nodeBudget` at all, so it always ran its full internal
// worst case (here, 2 seeds x 2,000,000 = up to 4,000,000 nodes) regardless of how small an
// external ceiling the caller asked for — confirmed at scale on the real corpus-2 batch workflow,
// where the probe alone (up to ~10,000,000 nodes on must-turn levels) consistently blew through
// the workflow's 8,000,000-node ceiling by ~25%, leaving the main loop/fallback/diversity pass
// zero chance to ever run. Fixed by capping each seed-salt round's own node budget by whatever's
// left of the external ceiling — confirms the probe now stays close to a small external nodeBudget
// instead of overshooting by a full round's worth (2,000,000 here).
test('the repair probe caps itself to a small external nodeBudget instead of running its full internal worst case', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        nodeBudget: 2_500_000, // < 4,000,000 (both ordinary seeds' combined worst case)
    });
    assert.equal(result.ok, false);
    assert.equal(result.nodeBudgetReached, true);
    // Without the fix, this would run both full 2,000,000-node ordinary seeds regardless of the
    // external ceiling, landing near 4,000,000 — well past nodeBudget. With the fix, the second
    // seed's own round is capped to whatever's left, so the total stays close to the ceiling.
    assert.ok(result.nodesExpanded < 3_000_000, `expected nodesExpanded well under 3,000,000 (the fixed-budget-only worst case would be ~4,000,000), got ${result.nodesExpanded}`);
});

// Not repair-gated (no mustCross/mustPass, low reqInt — needsRepairFallback in attempts.ts stays
// false, so repairConfigs is empty and the repair loop never runs) but deterministically
// infeasible (reqLen: 2 vs. a gate/goal Manhattan distance of 6 — same PARITY as the true distance,
// so STRATEGY_PARITY_GATE_FILTER doesn't drop the gate entirely and every config actually gets to
// run, unlike an odd reqLen here which empties activeGates before any attempt starts), so every
// main-loop attempt is pruned near-instantly by the distance-bound check regardless of search
// strategy — a fast, reliable way to reach the 2026-07-16 attraction-diversity last-resort pass
// (orchestration.ts's solveLevel, after the main loop AND the empty repair loop both "fail")
// without depending on any specific level's scoring actually being rescued.
function makeAttractionDiversityGatedInfeasibleLevel() {
    return {
        grid: { w: 4, h: 4 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(3, 3),
        reqLen: 2,
        reqInt: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('attraction-diversity pass reruns the main ladder once more after both prior stages fail', async () => {
    // admissibleOrderBudgetFractionOverride: 0 isolates the pass under test from the newer
    // admissible-order-search last-resort tier (orchestration.ts), which also runs by default after
    // this pass and would otherwise inflate "mainLoopAttempts" below (its attempts carry neither
    // marker, since it's a distinct search primitive, not a rerun of mainConfigs).
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), { timeBudgetMs: 1000, admissibleOrderBudgetFractionOverride: 0 });
    assert.equal(result.ok, false);
    const diversityAttempts = result.attempts.filter(a => a.attractionDiversity === true);
    const mainLoopAttempts = result.attempts.filter(a => a.attractionDiversity !== true);
    assert.ok(diversityAttempts.length > 0, 'expected at least one attraction-diversity attempt');
    // The pass reruns the exact same mainConfigs ladder, so (this level being pruned near-instantly
    // regardless of budget, meaning neither run gets cut off partway through) it should run through
    // exactly as many configs as the main loop itself did.
    assert.equal(diversityAttempts.length, mainLoopAttempts.length);
});

test('STRATEGY_ATTRACTION_DIVERSITY: false suppresses the pass', async () => {
    // This infeasible level is pruned by distance/parity regardless of search strategy, so the
    // side effect of every OTHER unset STRATEGY_* flag also reading false here (see SolveOpts's
    // repairBudgetFractionOverride field comment) doesn't change the (still-unsolved) result.
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        ablation: { STRATEGY_ATTRACTION_DIVERSITY: false },
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.attractionDiversity === true), false);
});

test('attractionDiversityBudgetFractionOverride: 0 suppresses the pass independently of repairBudgetFractionOverride', async () => {
    // Both overrides at 0 mirrors solver-controller.ts/review-controller.ts's interactive call
    // sites — confirms the two are independently controllable (not coupled to one flag/override).
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairBudgetFractionOverride: 0,
        attractionDiversityBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.attractionDiversity === true), false);
});

test('disableExtraBudgetPasses: true suppresses the attraction-diversity pass on its own', async () => {
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.attractionDiversity === true), false);
});

test('disableExtraBudgetPasses: true also suppresses the early repair probe', async () => {
    const result = await solveLevel(makeRepairGatedInfeasibleLevel(), {
        timeBudgetMs: 50,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.repair), false);
});

test('an explicit attractionDiversityBudgetFractionOverride still wins over disableExtraBudgetPasses', async () => {
    // Precedence check: disableExtraBudgetPasses is a convenience default, not a hard override —
    // a caller isolating one pass's own cost (per attractionDiversityBudgetFractionOverride's own
    // comment) must still be able to set disableExtraBudgetPasses for "everything else off" while
    // leaving this one pass explicitly enabled.
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        disableExtraBudgetPasses: true,
        attractionDiversityBudgetFractionOverride: ATTRACTION_DIVERSITY_BUDGET_FRACTION,
    });
    assert.equal(result.ok, false);
    assert.equal(result.attempts.some(a => a.attractionDiversity === true), true);
});

// opts.nodeBudget composition with the attraction-diversity pass: gated on
// `prep._metrics.nodesExpanded < nodeBudget` (orchestration.ts) BEFORE the pass starts, then passed
// into the ladder rerun (runInterleavedAttempts/runGateSerialAttempts). Both known measured on
// makeAttractionDiversityGatedInfeasibleLevel() at a generous timeBudgetMs (so only nodeBudget,
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
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 200, // < 288 (main loop's own total) -- budget runs out before the pass's own gate check
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'node-budget-reached');
    assert.equal(result.nodeBudgetReached, true);
    assert.equal(result.attempts.some(a => a.attractionDiversity === true), false);
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
    // the main loop + diversity pass stop at ~300 instead of ~400, and the admissible-order tier
    // then spends its reserve on this (instantly-pruned) level without exhausting it. Both numbers
    // are the same "stop within a couple of nodes of the ceiling" behaviour, measured against
    // different ceilings.
    //
    // status stays 'node-budget-reached' even though 315 < 400, and that is deliberate: the ceiling
    // DID stop the early tiers at 300. See orchestration.ts's earlyTiersHitNodeCeiling -- reporting
    // 'failed' here would claim the ladder searched itself out when the budget actually truncated it.
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400, // > 288 (main loop alone) -- clears the pass's entry gate
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'node-budget-reached');
    const diversityAttempts = result.attempts.filter(a => a.attractionDiversity === true);
    assert.equal(diversityAttempts.length, 16, 'expected every config to still be attempted once past the entry gate');
    assert.equal(result.nodesExpanded, 315);
});

// The node reserve itself (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION). The bug it fixes: `nodeBudget`
// is ONE cumulative ceiling every tier checks against the same running counter, so the earlier tiers
// consumed all of it and the admissible-order tier -- last in line -- hit its own
// `nodesExpanded >= nodeBudget` guard and ran nothing. Measured on the 2026-07-30T114427Z corpus-2
// baseline: all 141 unsolved levels carrying a validated admissible-order hint terminated at the
// 20M cap, and the tier was recorded on 1 of them.
test('the node reserve is a strict no-op when no external nodeBudget is set', async () => {
    // The reserve is a share of an EXTERNAL ceiling; with none there is nothing to withhold, so
    // every production path (which passes no nodeBudget) is unaffected. Same level/budget as the
    // first diversity test above, whose attempt counts are therefore reproduced exactly.
    const withDefault = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), { timeBudgetMs: 1000 });
    const withReserveOff = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        admissibleOrderNodeReserveFractionOverride: 0,
    });
    assert.equal(withDefault.nodesExpanded, withReserveOff.nodesExpanded);
    assert.equal(withDefault.attempts.length, withReserveOff.attempts.length);
    assert.equal(withDefault.status, withReserveOff.status);
});

test('disableExtraBudgetPasses leaves the full nodeBudget to the earlier tiers', async () => {
    // Reserving for a tier that will not run would strand the nodes and shrink the effective budget
    // of every interactive/batch caller that suppresses the extra passes -- so the reserve is gated
    // on the tier's REAL run condition, not just on the fraction. 288 (main loop) < 400 and no
    // diversity/admissible-order pass runs, so the whole ceiling stays available to the main loop
    // and the level is NOT reported as node-budget-limited.
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400,
        disableExtraBudgetPasses: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.nodesExpanded, 288);
    assert.equal(result.nodeBudgetReached, false);
    assert.equal(result.status, 'failed');
});

test('the reserve withholds nodes from the early tiers and leaves them for the admissible-order tier', async () => {
    // The mechanism, stated as a comparison: same level, same ceiling, reserve off vs on. With the
    // reserve OFF the early tiers spend right up to the full 400 (402, the pre-reserve behaviour);
    // with it ON they are held to 400 - floor(400*0.25) = 300. The difference is the slice the tier
    // gets to spend, which before this fix was always zero.
    const off = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400,
        admissibleOrderNodeReserveFractionOverride: 0,
    });
    const on = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400,
    });
    assert.equal(off.nodesExpanded, 402, 'reserve off reproduces the pre-reserve total exactly');
    assert.ok(on.nodesExpanded < off.nodesExpanded, 'the reserve must hold the early tiers below the full ceiling');
    // Both are still reported as budget-limited: the ceiling stopped a tier in each case.
    assert.equal(off.nodeBudgetReached, true);
    assert.equal(on.nodeBudgetReached, true);
});

test('portfolio experiment is opt-in and records config-gate pass metadata', async () => {
    const legacy = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000 });
    assert.equal(legacy.schedulerMode, undefined);

    const result = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000, schedulerMode: 'portfolio-experiment' });
    assert.equal(result.ok, true);
    assert.equal(result.schedulerMode, 'portfolio-experiment');
    assert.equal(result.portfolio?.solvedBeforeFallback, true);
    assert.equal(result.portfolio?.fallbackAttemptCount, 0);
    assert.equal(typeof result.portfolio?.runtimeBreakdown?.prepMs, 'number');
    assert.equal(result.portfolio?.runtimeBreakdown?.fallbackSearchMs, 0);
    assert.equal(result.portfolio?.runtimeBreakdown?.totalMs, result.totalMs);
    const winningAttempt = result.attempts.find(attempt => attempt.ok);
    assert.equal(winningAttempt?.schedulerPhase, 'portfolio');
    assert.equal(winningAttempt?.passNumber, 1);
    assert.equal(typeof winningAttempt?.configKey, 'string');
    assert.equal(winningAttempt?.allocatedBudgetMs, 500);
});

/**
 * attemptBudgetShare is the solver's single attempt-budget allocation point (docs/solver-budget-
 * determinism.md Phase 1). These tests pin the arithmetic so the Phase 2 currency switch — which
 * changes the two CALL SITES, not this function — cannot silently alter allocation at the same time.
 */
test('attemptBudgetShare splits the remainder evenly when no floor applies', () => {
    assert.equal(attemptBudgetShare(1000, 4, 500, 0), 250);
    assert.equal(attemptBudgetShare(1000, 3, 500, 0), 333, 'floors rather than rounds');
    assert.equal(attemptBudgetShare(0, 4, 0, 0), 0);
});

test('attemptBudgetShare lifts a config to its minimum floor, and never below the even share', () => {
    // Floor wins: 40% of a 1000ms gate share is 400, above the 250 even split.
    assert.equal(attemptBudgetShare(1000, 4, 1000, 0.4), 400);
    // Even share wins: 10% of 1000 is 100, below the 250 even split, so the split stands.
    assert.equal(attemptBudgetShare(1000, 4, 1000, 0.1), 250);
    // The floor is computed off minFloorBase, NOT off `remaining` — this is the one thing the two
    // call sites differ in (interleaved passes a whole gate's share, sequential passes `remaining`).
    assert.equal(attemptBudgetShare(1000, 4, 200, 0.5), 250, 'floor of 100 loses to the 250 split');
});

test('attemptBudgetShare reproduces the pre-extraction inline formulas exactly', () => {
    // Differential check against the two formulas as they were written inline before extraction.
    const inlineInterleaved = (budgetLeft: number, pairsLeft: number, gates: number, minFrac: number) => {
        const pairShare = Math.floor(budgetLeft / pairsLeft);
        const gateShare = budgetLeft / gates;
        return minFrac > 0 ? Math.max(Math.floor(gateShare * minFrac), pairShare) : pairShare;
    };
    const inlineSequential = (remaining: number, attemptsLeft: number, minFrac: number) => {
        const evenShare = Math.floor(remaining / attemptsLeft);
        return minFrac > 0 ? Math.max(Math.floor(remaining * minFrac), evenShare) : evenShare;
    };
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 5000; i++) {
        const budgetLeft = Math.floor(rnd() * 60000);
        const gates = 1 + Math.floor(rnd() * 6);
        const configs = 1 + Math.floor(rnd() * 16);
        const pairsLeft = Math.max(1, Math.floor(rnd() * gates * configs) + 1);
        const attemptsLeft = 1 + Math.floor(rnd() * configs);
        const minFrac = [0, 0.1, 0.25, 0.4, 0.5, 0.75][Math.floor(rnd() * 6)];
        assert.equal(
            attemptBudgetShare(budgetLeft, pairsLeft, budgetLeft / gates, minFrac),
            inlineInterleaved(budgetLeft, pairsLeft, gates, minFrac),
            `interleaved mismatch at i=${i}`,
        );
        assert.equal(
            attemptBudgetShare(budgetLeft, attemptsLeft, budgetLeft, minFrac),
            inlineSequential(budgetLeft, attemptsLeft, minFrac),
            `sequential mismatch at i=${i}`,
        );
    }
});

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

test('timeBudgetMs alone still solves, via a workBudget derived from it', async () => {
    const level = makeLineLevel();
    const res = await solveLevel(level as unknown as NormalizedLevel, { timeBudgetMs: 2000 });
    assert.equal(res.ok, true);
});

/* Regression for a real confound (2026-08-07/08): a sparse ablation object naming ONE opt-in
 * flag must not silently flip on any OTHER opt-in flag via normalizeAblationConfig's Proxy --
 * that gap is what made a GHA STRATEGY_REPAIR_TURN_BIAS corpus-2 A/B secretly also run with
 * STRATEGY_REPAIR_ELITE_PREFIX_DFS enabled (independently validated net-negative), producing a
 * confounded -7/1700 reading. See reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md. */
test('normalizeAblationConfig defaults every OTHER opt-in-only flag to false, not true', () => {
    const cfg = normalizeAblationConfig({ STRATEGY_REPAIR_TURN_BIAS: true })!;
    assert.equal(cfg.STRATEGY_REPAIR_TURN_BIAS, true, 'the flag actually named stays as set');
    assert.equal(cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS, false, 'an unrelated opt-in flag must NOT be silently activated');
    assert.equal(cfg.PRUNE_PORTAL_PARITY_ENVELOPE, false, 'nor this one');
    assert.equal(cfg.STRATEGY_REPAIR_NOGOOD_CACHE, true, 'a standard default-on flag is unaffected');
});

test('normalizeAblationConfig: opt-in flags stay off when a DIFFERENT flag is named', () => {
    const cfg = normalizeAblationConfig({ STRATEGY_REPAIR_NOGOOD_CACHE: false })!;
    assert.equal(cfg.STRATEGY_REPAIR_TURN_BIAS, false);
    assert.equal(cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS, false);
    assert.equal(cfg.PRUNE_PORTAL_PARITY_ENVELOPE, false);
    assert.equal(cfg.PRUNE_PARITY, true, 'a standard flag still defaults to true');
});

test('normalizeAblationConfig treats explicit undefined as no override', () => {
    const cfg = normalizeAblationConfig({
        STRATEGY_REPAIR_NOGOOD_CACHE: undefined,
        STRATEGY_REPAIR_TURN_BIAS: undefined,
        ATTEMPT_ORDER: undefined,
    })!;
    assert.equal(cfg.STRATEGY_REPAIR_NOGOOD_CACHE, true, 'default-on flag keeps its production default');
    assert.equal(cfg.STRATEGY_REPAIR_TURN_BIAS, false, 'opt-in flag keeps its production default');
    assert.equal(cfg.ATTEMPT_ORDER, undefined);
    assert.equal('STRATEGY_REPAIR_NOGOOD_CACHE' in cfg, false, 'undefined is not an explicit filter override');
});

test('ablation experiment defaults match sparse solver defaults for every registered feature', () => {
    const defaults = defaultConfig();
    const normalized = normalizeAblationConfig({ _randomSeed: 1 })!;
    for (const key of Object.keys(defaults)) {
        assert.equal(defaults[key], normalized[key], `${key} default drifted between experiment tooling and solver`);
    }
    for (const key of OPT_IN_FEATURES) assert.equal(defaults[key], false, `${key} must remain opt-in`);
});

test('documented default-off features and the executable opt-in registry cannot drift', () => {
    const documented = Object.entries(FEATURES)
        .filter(([, description]) => /default-OFF/i.test(description))
        .map(([key]) => key)
        .sort();
    assert.deepEqual(documented, [...OPT_IN_FEATURES].sort());
});

test('single-feature experiments enable opt-ins without activating unrelated opt-ins', () => {
    const experiments = buildExperimentList('single-feature');
    for (const key of OPT_IN_FEATURES) {
        const experiment = experiments.find(item => item.name === `enable:${key}`);
        assert.ok(experiment, `missing enable experiment for ${key}`);
        assert.equal(experiment.config[key], true);
        for (const other of OPT_IN_FEATURES) {
            if (other !== key) assert.equal(experiment.config[other], false, `${key} also activated ${other}`);
        }
    }
});
