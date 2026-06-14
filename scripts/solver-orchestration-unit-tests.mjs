import assert from 'node:assert/strict';
import { PACK } from '../modules/solver/encoding.js';
import { getTrapSpotBudgetMs, solveLevelV2 } from '../modules/solver/orchestration.js';

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`ok - ${name}`);
    } catch (err) {
        failed++;
        console.error(`not ok - ${name}`);
        console.error(err);
    }
}

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
    };
}

await test('solveLevelV2 solves a simple prepared level', async () => {
    const result = await solveLevelV2(makeLineLevel(), { timeBudgetMs: 1000 });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.deepEqual(result.solution, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
    assert.equal(result.solutions.length, 1);
    assert.equal(result.attempts.some(attempt => attempt.ok), true);
    assert.equal(typeof result.nodesExpanded, 'number');
});

await test('solveLevelV2 honors cancellation from yieldFn', async () => {
    await assert.rejects(
        () => solveLevelV2(makeLineLevel(), {
            timeBudgetMs: 1000,
            yieldFn: () => { throw new Error('SolverV2:cancelled'); },
        }),
        /SolverV2:cancelled/,
    );
});

await test('getTrapSpotBudgetMs scales with area and special mechanics within bounds', () => {
    const small = getTrapSpotBudgetMs(makeLineLevel());
    assert.equal(small, 3000);

    const large = makeLineLevel();
    large.grid = { w: 100, h: 100 };
    large.reqLen = 5000;
    large.mustPassKeys = [PACK(1, 0), PACK(2, 0)];
    large.portalMap = new Map([[PACK(0, 0), PACK(1, 0)]]);
    const capped = getTrapSpotBudgetMs(large);
    assert.equal(capped, 120000);
});

console.log(`solver orchestration tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
