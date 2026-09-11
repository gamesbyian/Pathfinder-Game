import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver } from './solver.js';

function rawLevelWithMustCrossCount(count: number) {
    const cells: Array<{ x: number; y: number }> = [];
    for (let y = 1; y <= 6 && cells.length < count; y++) {
        for (let x = 1; x <= 6 && cells.length < count; x++) {
            if ((x === 1 && y === 1) || (x === 6 && y === 6)) continue;
            cells.push({ x, y });
        }
    }
    return {
        grid: { w: 6, h: 6 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 6, y: 6 },
        reqLen: 10,
        reqInt: 0,
        mustCross: cells,
    };
}

test('public raw solver boundary rejects levels that would overflow mechanic masks', () => {
    const solver = createSolver();
    assert.throws(
        () => solver.prepareLevelForSolver(rawLevelWithMustCrossCount(31), { source: 'raw' }),
        /mustCross count \(31\) exceeds the maximum of 30/,
    );
});

test('public raw solver boundary still accepts schema-valid raw levels', () => {
    const solver = createSolver();
    const normalized = solver.prepareLevelForSolver(rawLevelWithMustCrossCount(2), { source: 'raw' });
    assert.equal(normalized.mustCrossKeys.length, 2);
    assert.equal(normalized.gateKeys.length, 1);
});

test('public raw solver boundary preserves rectangular synthetic levels supported by the solver core', () => {
    const solver = createSolver();
    const normalized = solver.prepareLevelForSolver({
        grid: { w: 4, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 4, y: 3 },
        reqLen: 5,
        reqInt: 0,
    }, { source: 'raw' });
    assert.deepEqual(normalized.grid, { w: 4, h: 3 });
});
