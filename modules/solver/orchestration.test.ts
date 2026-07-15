import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { getTrapSpotBudgetMs, solveLevel } from './orchestration.js';

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
    assert.equal(probeAttempts.length, 3);
    assert.deepEqual(probeAttempts.map(a => a.seedSalt ?? 0), [0, 1, 2]);
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
