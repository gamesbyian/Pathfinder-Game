import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { getTrapSpotBudgetMs, solveLevelV2 } from './orchestration.js';

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

test('solveLevelV2 solves a simple prepared level', async () => {
    const result = await solveLevelV2(makeLineLevel(), { timeBudgetMs: 1000 });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.deepEqual(result.solution, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
    assert.equal(result.solutions.length, 1);
    assert.equal(result.attempts.some(attempt => attempt.ok), true);
    assert.equal(typeof result.nodesExpanded, 'number');
});

test('solveLevelV2 honors cancellation from yieldFn', async () => {
    await assert.rejects(
        () => solveLevelV2(makeLineLevel(), {
            timeBudgetMs: 1000,
            yieldFn: () => { throw new Error('SolverV2:cancelled'); },
        }),
        /SolverV2:cancelled/,
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

test('solveLevelV2 honors forcedPortalExitKey toward the only viable direction', async () => {
    const result = await solveLevelV2(makePortalBranchLevel(), {
        timeBudgetMs: 1000,
        forcedPortalExitKey: { from: PACK(1, 2), to: PACK(2, 2) },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(result.solution, [PACK(0, 0), PACK(1, 0), PACK(1, 2), PACK(2, 2)]);
});

test('solveLevelV2 fails when forcedPortalExitKey points away from the goal', async () => {
    const result = await solveLevelV2(makePortalBranchLevel(), {
        timeBudgetMs: 1000,
        forcedPortalExitKey: { from: PACK(1, 2), to: PACK(0, 2) },
    });
    assert.equal(result.ok, false);
});

test('getTrapSpotBudgetMs scales with area and special mechanics within bounds', () => {
    const small = getTrapSpotBudgetMs(makeLineLevel());
    assert.equal(small, 3000);

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
