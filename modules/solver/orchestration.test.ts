import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { getTrapSpotBudgetMs, solveLevel, ATTRACTION_DIVERSITY_BUDGET_FRACTION } from './orchestration.js';

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
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), { timeBudgetMs: 1000 });
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
    // still < 400), so the pass STARTS and every one of its 16 configs is still attempted. But as of
    // the 2026-07-23 per-attempt node-budget threading, each attempt's search is capped at the
    // remaining budget (runInterleavedAttempts/runGateSerialAttempts recompute nodeBudget -
    // nodesExpanded before each runAttempt), so once the cumulative reaches 400 the tail configs
    // expand ~0 nodes: total lands at 402 (a 2-node overshoot from the search's own check
    // granularity), NOT the 576 it used to run to when the budget was only checked once per gate and
    // every config ran to full completion. This is the whole point of the fix -- tight adherence to
    // the node budget instead of a 44% overshoot -- and the entry gate the *previous* bug-guard test
    // above protects (the pass still starts at all) is unchanged: diversityAttempts is still 16.
    const result = await solveLevel(makeAttractionDiversityGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        nodeBudget: 400, // > 288 (main loop alone) -- clears the pass's entry gate
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'node-budget-reached'); // 402 total ends up >= 400
    const diversityAttempts = result.attempts.filter(a => a.attractionDiversity === true);
    assert.equal(diversityAttempts.length, 16, 'expected every config to still be attempted once past the entry gate');
    assert.equal(result.nodesExpanded, 402);
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
