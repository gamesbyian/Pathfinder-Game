import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';

// Fast/deep test-tier gate (see docs/testing.md's "Fast and deep gates" and
// modules/solver/lower-bounds.test.ts's identical gate for the full rationale).
const deepTest = process.env.SOLVER_DEEP_TESTS === '0' ? test.skip : test;
import { PACK } from './encoding.js';
import { getFalseGoalTriggerSearchBudgetMs, solveLevel, runAttempt, attemptConfigKey, attemptBudgetShare, GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION, COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION, ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION, CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION, normalizeAblationConfig, EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP, EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE } from './orchestration.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { repairPrimarySeed } from './repair-search.js';
import { workMeter } from './work-meter.js';
import { prepLevel } from './prep.js';
import { buildExperimentList, defaultConfig, FEATURES, OPT_IN_FEATURES } from './ablation-config.js';

function makeLineLevel() {
    return {
        grid: { w: 3, h: 1 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(2, 0),
        requiredLength: 2,
        requiredIntersections: 0,
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
        attemptSearchForTesting: exhaustingDispatch,
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

test('attempt exceptions are recorded and the ladder continues to a later success', async () => {
    let calls = 0;
    const dispatch = ((...args: Parameters<typeof runAttemptSearch>) => {
        if (++calls === 1) throw new TypeError('deterministic dispatch failure');
        return runAttemptSearch(...args);
    });
    const result = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000, attemptSearchForTesting: dispatch });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.equal(result.attempts[0].outcome, 'error');
    assert.deepEqual(result.attempts[0].error, {
        name: 'TypeError', message: 'deterministic dispatch failure',
        gateKey: result.attempts[0].gateKey,
        configKey: attemptConfigKey(getConfiguredAttemptConfigs(makeLineLevel(), null)[0]),
        scoringProfileId: result.attempts[0].scoringProfileId, orderingBiasId: result.attempts[0].orderingBiasId,
    });
    assert.equal(result.attempts.some(a => a.outcome === 'success'), true);
});

test('an unsuccessful solve with a failed technique reports attempt-error, not exhaustion', async () => {
    const dispatch = async (...args: Parameters<typeof runAttemptSearch>) => {
        const searchOut = args[9];
        if (searchOut) {
            searchOut.timedOut = true;
            searchOut.bestBadness = 7;
            searchOut.finalBadness = 8;
        }
        throw new Error('broken technique');
    };
    const result = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000, attemptSearchForTesting: dispatch });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'attempt-error');
    assert.equal(result.attempts.every(a => a.outcome === 'error'), true);
    assert.equal(result.attempts.every(a => a.timedOut === undefined), true);
    assert.equal(result.attempts.every(a => a.bestBadness === undefined && a.finalBadness === undefined), true,
        'partial diagnostic output from a crashing technique must not classify its error as a search result');
});

test('an error attempt preserves repair identity, allocation, node usage, and seed fields', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const repairConfig = getConfiguredAttemptConfigs(level, null).find(config => config.repair)!;
    const gateKey = level.gateKeys[0];
    const seedSalt = 3;
    const result = await solveLevel(level, {
        timeBudgetMs: 50,
        disableExtraBudgetPasses: true,
        primeAttempt: { gateKey, configKey: attemptConfigKey(repairConfig), nodeBudget: 123, seedSalt },
        attemptSearchForTesting: async (...args) => {
            const prep = args[3];
            if (prep._metrics) prep._metrics.nodesExpanded += 7;
            throw new Error('repair dispatch failed');
        },
    });
    const attempt = result.attempts[0];
    assert.equal(attempt.outcome, 'error');
    assert.equal(attempt.gateKey, gateKey);
    assert.equal(attempt.scoringProfileId, repairConfig.scoringProfileId);
    assert.equal(attempt.orderingBiasId, repairConfig.orderingBias?.id ?? null);
    assert.equal(attempt.repair, true);
    assert.equal(attempt.allocatedBudgetMs, 50);
    assert.equal(attempt.nodesExpanded, 7);
    assert.equal(attempt.seedSalt, seedSalt);
    assert.equal(attempt.randomSeed, repairPrimarySeed(gateKey, seedSalt));
});

test('canonical cancellation still escapes a fault-injected dispatch', async () => {
    const dispatch = async () => { throw new Error('Solver:cancelled'); };
    await assert.rejects(() => solveLevel(makeLineLevel(), { timeBudgetMs: 1000, attemptSearchForTesting: dispatch }), /Solver:cancelled/);
});

test('fault injection is scoped to one solve and cannot contaminate a concurrent solve', async () => {
    const failingDispatch = async () => { throw new Error('scoped failure'); };
    const [faulted, normal] = await Promise.all([
        solveLevel(makeLineLevel(), { timeBudgetMs: 100, disableExtraBudgetPasses: true, attemptSearchForTesting: failingDispatch }),
        solveLevel(makeLineLevel(), { timeBudgetMs: 100 }),
    ]);
    assert.equal(faulted.status, 'attempt-error');
    assert.equal(normal.status, 'success');
    assert.equal(normal.attempts.some(a => a.outcome === 'error'), false);
});

test('an admissible-order-fallback search that drains its space is marked exhausted, not budget-starved', async () => {
    const level = { ...makeLineLevel(), requiredLength: 4 } as NormalizedLevel;
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const config = { scoringProfileId: 'default', orderingBias: null, admissibleOrder: true };
    const result = await runAttempt(level.gateKeys[0], level, prep, config, 1000, Date.now(), null);
    assert.equal(result.path, null);
    assert.equal(result.attempt.outcome, 'exhausted');
    assert.equal(result.attempt.timedOut, false);
});

test('a hostile non-Error throw is safely recorded instead of escaping error serialization', async () => {
    const hostile = Object.create(null, {
        name: { get() { throw new Error('name getter'); } },
        message: { get() { throw new Error('message getter'); } },
    });
    const dispatch = async () => { throw hostile; };
    const result = await solveLevel(makeLineLevel(), { timeBudgetMs: 50, disableExtraBudgetPasses: true, attemptSearchForTesting: dispatch });
    assert.equal(result.status, 'attempt-error');
    assert.equal(result.attempts[0].error?.name, 'Error');
    assert.equal(result.attempts[0].error?.message, 'Unknown attempt error');
    assert.doesNotThrow(() => JSON.stringify(result.attempts));
});

test('portfolio errors remain visible when its ordinary fallback is also unsuccessful', async () => {
    const level = { ...makeLineLevel(), requiredLength: 4 } as NormalizedLevel;
    let calls = 0;
    const dispatch = ((...args: Parameters<typeof runAttemptSearch>) => {
        if (++calls === 1) throw new Error('portfolio technique failed');
        return runAttemptSearch(...args);
    });
    const result = await solveLevel(level, {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        schedulerMode: 'legacy-latency-portfolio-experiment',
        legacyLatencyPortfolioExperiment: {
            pass1Ms: 10, pass2Ms: 10, pass3Ms: 10,
            pass2Configs: new Set(), pass3Configs: new Set(),
        },
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'attempt-error');
    assert.equal(result.attempts[0].outcome, 'error');
    assert.equal(result.attempts.some(a => a.schedulerPhase === 'fallback' && a.outcome !== 'error'), true);
});

function makePortalBranchLevel() {
    const portalA = PACK(1, 0);
    const portalB = PACK(1, 2);
    return {
        grid: { w: 3, h: 3 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(2, 2),
        requiredLength: 2, // only reachable via the portal: direct Manhattan distance is 4
        requiredIntersections: 0,
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
        repairLateProbeNodeBudgetOverride: 0,
        forcedPortalExitKey: { from: PACK(1, 2), to: PACK(0, 2) },
    });
    assert.equal(result.ok, false);
});

test('getFalseGoalTriggerSearchBudgetMs scales with area and special mechanics within bounds', () => {
    const small = getFalseGoalTriggerSearchBudgetMs(makeLineLevel());
    assert.equal(small, 10000);

    const large = makeLineLevel();
    large.grid = { w: 100, h: 100 };
    large.requiredLength = 5000;
    large.mustPassKeys = [PACK(1, 0), PACK(2, 0)];
    large.portalMap = new Map([[PACK(0, 0), { dest: PACK(1, 0) }]]);
    const capped = getFalseGoalTriggerSearchBudgetMs(large);
    assert.equal(capped, 120000);
});

test('getFalseGoalTriggerSearchBudgetMs scales the search-dependent cost with gate count', () => {
    // The search runs a DFS per gate and splits the budget, so more gates => more
    // budget (until the cap), preventing later gates from being starved.
    const base = makeLineLevel();
    base.grid = { w: 10, h: 10 };
    base.requiredLength = 30;
    const oneGate = getFalseGoalTriggerSearchBudgetMs({ ...base, gateKeys: [PACK(0, 0)] });
    const threeGates = getFalseGoalTriggerSearchBudgetMs({ ...base, gateKeys: [PACK(0, 0), PACK(9, 0), PACK(0, 9)] });
    assert.ok(threeGates > oneGate, `expected ${threeGates} > ${oneGate}`);
});

// Repair-gated (mustCross >= POLICY.REPAIR_MC_MIN, mustPass >= POLICY.REPAIR_MP_MIN — see
// attempts.ts's needsRepairFallback) and deterministically infeasible (requiredLength: 1 vs. a
// gate/goal Manhattan distance of 10), so the ordinary repair probe exhausts its node budget on
// every seed rather than winning — a fast, reliable way to exercise runEarlyRepairSearch's multi-seed
// retry mechanism itself (attempt count, recorded seedSalt values, ablation gating) without
// depending on any specific level actually being rescued by a particular seed.
function makeRepairGatedInfeasibleLevel() {
    return {
        grid: { w: 6, h: 6 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(5, 5),
        requiredLength: 1,
        requiredIntersections: 0,
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

// A stub attempt dispatcher for tests whose assertion is about orchestration bookkeeping (attempt
// scheduling, seed/flag routing, node-budget capping) rather than an actual solve outcome: it never
// finds a solution, but honestly reports nodesExpanded as whatever nodeBudget it was granted
// (simulating a search that exhausts its allotted round rather than idling), so real accounting
// logic under test — orchestration.ts's own budget apportionment, not this file's search cost —
// still sees genuine numbers. Using this in place of a real repair/DFS search turns a multi-second
// node-budget-bound solve into a sub-millisecond one without touching the orchestration code being
// tested; see the sibling STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET tests above for the same
// pattern applied by hand.
const exhaustingDispatch: typeof runAttemptSearch = (async (...args: Parameters<typeof runAttemptSearch>) => {
    const prep = args[3];
    const nodeBudget = args[8];
    const out = args[9];
    const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
    if (prep._metrics) prep._metrics.nodesExpanded += spent;
    if (out) out.nodesExpanded = spent;
    return null;
}) as typeof runAttemptSearch;

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

// Not repair-gated (no mustCross/mustPass, low requiredIntersections — needsRepairFallback in attempts.ts stays
// false, so repairConfigs is empty and the repair loop never runs) but deterministically
// infeasible (requiredLength: 2 vs. a gate/goal Manhattan distance of 6 — same PARITY as the true distance,
// so STRATEGY_PARITY_GATE_FILTER doesn't drop the gate entirely and every config actually gets to
// run, unlike an odd requiredLength here which empties activeGates before any attempt starts), so every
// main-search attempt is pruned near-instantly by the distance-bound check regardless of search
// strategy — a fast, reliable way to reach the 2026-07-16 goal-attraction-disabled-retry last-resort pass
// (orchestration.ts's solveLevel, after the main loop AND the empty repair loop both "fail")
// without depending on any specific level's scoring actually being rescued.
function makeGoalAttractionDisabledRetryGatedInfeasibleLevel() {
    return {
        grid: { w: 4, h: 4 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(3, 3),
        requiredLength: 2,
        requiredIntersections: 0,
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
        nodeBudget: 200, // < 288 (main loop's own total) -- budget runs out before the pass's own gate check
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

// STRATEGY_REPAIR_FALLBACK_NODE_RESERVE (opt-in, default OFF — see REPAIR_FALLBACK_NODE_RESERVE_
// FRACTION's own comment for the two-revision history this test suite is meant to prevent a third
// instance of). Fixture: makeRepairGatedInfeasibleLevel() has exactly 1 repair config (ordinary,
// no must-turn-biased tier) and 16 main configs (confirmed by direct inspection); the probe is
// disabled via STRATEGY_EARLY_REPAIR_SEARCH: false so it contributes zero nodes, isolating the mechanism
// under test (main loop vs. repair fallback loop) from the probe's own fixed-cost budget entirely.
// The mock dispatch consumes exactly the nodeBudget it is given for every attempt and never solves,
// mirroring the main-search-late-reserve tests' own established pattern.
function repairFallbackReserveDispatch(): typeof runAttemptSearch {
    return (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep, , , , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) { out.nodesExpanded = spent; out.timedOut = true; }
        return null;
    }) as typeof runAttemptSearch;
}

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

// STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE (opt-in, default OFF — see GOAL_ATTRACTION_DISABLED_RETRY_NODE_
// RESERVE_FRACTION's own comment). Reuses repairFallbackReserveDispatch() and
// makeRepairGatedInfeasibleLevel() above: this reserve nests inside the SAME mainSearchLateReserve
// pool as the sibling reserve, one layer deeper, so the fixture and mock dispatch are identical.

test('goal-attraction-disabled-retry reserve is inert by default (cfg=null) even with its sibling reserve on', async () => {
    // Same opt-in-convention check as the sibling reserve's own first test: cfg is non-null here
    // (both STRATEGY_EARLY_REPAIR_SEARCH and STRATEGY_REPAIR_FALLBACK_NODE_RESERVE are set), but THIS flag
    // is unset within it — the opt-in Proxy must resolve it to false regardless of what else is set.
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
    // Diversity itself is NOT disabled (its own fraction is unaffected by this flag), but with this
    // reserve off, repairFallbackNodeCeiling equals the unprotected earlyTierNodeBudget, so the main
    // loop (850) + repair fallback (150) already exhaust the whole 1000 before diversity's own gate
    // (`nodesExpanded < earlyTierNodeBudget`) is even checked -- it never gets a single node, whether
    // that shows up as zero attempts or all-zero-node attempts depends only on exact timing, so assert
    // the node total, which is what this flag is actually supposed to leave unchanged when off.
    const diversityAttempts = result.attempts.filter(a => a.stageId === 'goal-attraction-disabled-retry');
    assert.equal(diversityAttempts.every(a => (a.nodesExpanded ?? 0) === 0), true, 'no room was withheld for diversity: the sibling reserve alone already exhausted earlyTierNodeBudget');
    assert.equal(result.nodesExpanded, 1000, 'byte-identical total to the sibling reserve running alone (this flag contributes nothing when unset)');
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

test('historical scheduler modes remain readable but normalize to canonical behavior', async () => {
    const production = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000, schedulerMode: 'legacy' });
    assert.equal(production.ok, true);
    assert.equal(production.schedulerMode, undefined, 'historical legacy mode reads as canonical production scheduling');

    const historicalPortfolio = await solveLevel(makeLineLevel(), {
        timeBudgetMs: 1000,
        schedulerMode: 'portfolio-experiment',
        portfolioExperiment: {
            pass1Ms: 500,
            pass2Ms: 1000,
            pass3Ms: 2000,
            pass2Configs: new Set(),
            pass3Configs: new Set(),
            conditionalPasses: [],
        },
    });
    assert.equal(historicalPortfolio.ok, true);
    assert.equal(historicalPortfolio.schedulerMode, 'legacy-latency-portfolio-experiment');
    assert.equal(historicalPortfolio.attempts.find(attempt => attempt.ok)?.schedulerPhase, 'legacy-latency-portfolio');
});

test('portfolio experiment is opt-in and records config-gate pass metadata', async () => {
    const legacy = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000 });
    assert.equal(legacy.schedulerMode, undefined);

    const result = await solveLevel(makeLineLevel(), { timeBudgetMs: 1000, schedulerMode: 'legacy-latency-portfolio-experiment' });
    assert.equal(result.ok, true);
    assert.equal(result.schedulerMode, 'legacy-latency-portfolio-experiment');
    assert.equal(result.legacyLatencyPortfolioExperiment?.solvedBeforeFallback, true);
    assert.equal(result.legacyLatencyPortfolioExperiment?.fallbackAttemptCount, 0);
    assert.equal(typeof result.legacyLatencyPortfolioExperiment?.runtimeBreakdown?.prepMs, 'number');
    assert.equal(result.legacyLatencyPortfolioExperiment?.runtimeBreakdown?.fallbackSearchMs, 0);
    assert.equal(result.legacyLatencyPortfolioExperiment?.runtimeBreakdown?.totalMs, result.totalMs);
    const winningAttempt = result.attempts.find(attempt => attempt.ok);
    assert.equal(winningAttempt?.schedulerPhase, 'legacy-latency-portfolio');
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

test('normalizeAblationConfig dual-reads the legacy routing flag and single-writes the canonical name', () => {
    const cfg = normalizeAblationConfig({ STRATEGY_ARCHETYPE_ROUTING: false })!;
    assert.equal(cfg.STRATEGY_ROUTING_REGIME_SELECTION, false);
    assert.equal(Object.hasOwn(cfg, 'STRATEGY_ROUTING_REGIME_SELECTION'), true);
    assert.equal(Object.hasOwn(cfg, 'STRATEGY_ARCHETYPE_ROUTING'), false);
    assert.deepEqual(
        Object.keys({ ...cfg }).filter(key => key.includes('ROUTING')),
        ['STRATEGY_ROUTING_REGIME_SELECTION'],
    );
});

test('normalizeAblationConfig rejects conflicting legacy/canonical routing flag values', () => {
    assert.throws(
        () => normalizeAblationConfig({
            STRATEGY_ARCHETYPE_ROUTING: false,
            STRATEGY_ROUTING_REGIME_SELECTION: true,
        }),
        /Conflicting ablation values for canonical feature STRATEGY_ROUTING_REGIME_SELECTION/,
    );
});


test('normalizeAblationConfig dual-reads the legacy near-tie retry flag and single-writes the canonical name', () => {
    const cfg = normalizeAblationConfig({ STRATEGY_DEDUP_NEAR_TIE_RETRY: false })!;
    assert.equal(cfg.STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY, false);
    assert.equal(Object.hasOwn(cfg, 'STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY'), true);
    assert.equal(Object.hasOwn(cfg, 'STRATEGY_DEDUP_NEAR_TIE_RETRY'), false);
});

test('normalizeAblationConfig rejects conflicting legacy/canonical near-tie retry values', () => {
    assert.throws(
        () => normalizeAblationConfig({
            STRATEGY_DEDUP_NEAR_TIE_RETRY: false,
            STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY: true,
        }),
        /Conflicting ablation values for canonical feature STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY/,
    );
});

test('ablation defaults emit only the canonical routing flag name', () => {
    const defaults = defaultConfig();
    assert.equal(defaults.STRATEGY_ROUTING_REGIME_SELECTION, true);
    assert.equal(Object.hasOwn(defaults, 'STRATEGY_ARCHETYPE_ROUTING'), false);
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

test('a sparse unrelated ablation object leaves the promoted default-ON pass active (the normalizeAblationConfig sparse-default fix this promotion now depends on)', async () => {
    // Since promotion, this flag is unset-means-true (the standard `!cfg || cfg.FLAG` convention),
    // so a sparse config that only touches a DIFFERENT flag (STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION here)
    // must still leave THIS one active — the opposite assertion from the pre-promotion opt-in test
    // this replaces, and exactly the normalizeAblationConfig sparse-default behavior CLAUDE.md's own
    // gotcha describes (an under-registered opt-in flag silently defaulting to true; here the flag is
    // correctly registered as default-ON so a sparse object must NOT silently disable it either).
    const result = await solveLevel(makeGoalAttractionDisabledRetryGatedInfeasibleLevel(), {
        timeBudgetMs: 1000,
        repairLateProbeNodeBudgetOverride: 0,
        ablation: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION: false },
        goalAttractionDisabledRetryBudgetFractionOverride: 0,
        admissibleOrderBudgetFractionOverride: 0,
    });
    assert.equal(result.ok, false);
    assert.ok(result.attempts.some(a => a.stageId === 'coarse-state-near-tie-retention-disabled-retry'), 'expected the promoted tier to still run: only an unrelated flag was set');
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

test('a sparse unrelated ablation object leaves the promoted default-ON connectivity-axis-prune-disabled-retry pass active', async () => {
    // Since promotion, this flag is unset-means-true (the standard `!cfg || cfg.FLAG` convention),
    // so a sparse config that only touches a DIFFERENT flag (PRUNE_CONNECTIVITY_AXIS_EXHAUSTED here,
    // the mechanism this tier disables INTERNALLY once it starts, not the tier's own on/off switch)
    // must still leave THIS one active — same check as the coarse-state-near-tie-retention-disabled-retry/admissible-order-fallback-
    // non-default-retry suites' own equivalent tests.
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
    assert.ok(result.attempts.some(a => a.stageId === 'connectivity-axis-prune-disabled-retry'), 'expected the promoted tier to still run: only an unrelated flag was set');
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
