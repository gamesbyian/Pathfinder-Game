import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { getFalseGoalTriggerSearchBudgetMs, solveLevel, runAttempt, attemptConfigKey, attemptBudgetShare, normalizeAblationConfig } from './orchestration.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { repairPrimarySeed } from './repair-search.js';
import { prepLevel } from './prep.js';
import { buildExperimentList, defaultConfig, FEATURES, OPT_IN_FEATURES } from './ablation-config.js';
import { makeLineLevel, makeRepairGatedInfeasibleLevel, exhaustingDispatch } from './orchestration-test-support.js';

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
