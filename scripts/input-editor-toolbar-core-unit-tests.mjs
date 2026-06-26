// Unit tests for modules/input/editor-toolbar-core.ts — DOM-free editor decisions from
// editor-toolbar-controller (grid-resize feasibility/shift planning, trap retry budget).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { planGridResize, computeTrapRetryBudget } from '../modules/input/editor-toolbar-core.js';

// --- planGridResize: bounds limits ---

test('planGridResize: rejects shrinking below the minimum (6)', () => {
    const plan = planGridResize(6, -1, null, [], []);
    assert.deepEqual(plan, { ok: false, reason: 'limit', message: 'Size limit reached' });
});

test('planGridResize: rejects growing above the maximum (15)', () => {
    const plan = planGridResize(15, 1, null, [], []);
    assert.equal(plan.ok, false);
    assert.equal(plan.reason, 'limit');
});

// --- planGridResize: grow / empty grid ---

test('planGridResize: grow with no bounds → no shift, path in bounds', () => {
    const plan = planGridResize(8, 1, null, [], []);
    assert.deepEqual(plan, { ok: true, newSize: 9, shiftX: 0, shiftY: 0, pathOutOfBounds: false });
});

// --- planGridResize: shrink feasibility ---

test('planGridResize: shrink blocked when occupied content cannot fit', () => {
    // content spans x 0..7 (width 8); shrinking to 7 cannot fit it.
    const bounds = { minX: 0, maxX: 7, minY: 0, maxY: 3 };
    const plan = planGridResize(8, -1, bounds, [], []);
    assert.equal(plan.ok, false);
    assert.equal(plan.reason, 'blocking');
});

test('planGridResize: shrink computes the shift needed to keep content in-bounds', () => {
    // Grid 8→7. Content at far edge (maxX=7) must shift left by 1 to fit within 0..6.
    const bounds = { minX: 1, maxX: 7, minY: 0, maxY: 2 };
    const plan = planGridResize(8, -1, bounds, [], []);
    assert.equal(plan.ok, true);
    assert.equal(plan.newSize, 7);
    assert.equal(plan.shiftX, -1); // 7 - 1 - 7
    assert.equal(plan.shiftY, 0);
});

test('planGridResize: shrink computes a vertical shift when content hugs the bottom edge', () => {
    // Grid 8→7. maxY=7 must shift up by 1; x fits without shifting.
    const bounds = { minX: 0, maxX: 2, minY: 1, maxY: 7 };
    const plan = planGridResize(8, -1, bounds, [], []);
    assert.equal(plan.ok, true);
    assert.equal(plan.shiftX, 0);
    assert.equal(plan.shiftY, -1); // 7 - 1 - 7
});

test('planGridResize: shrink rejected when a must-cross would land on the new edge', () => {
    // No shift needed (content fits), but a must-cross sits at x=6 == newSize-1 after shrink to 7.
    const bounds = { minX: 0, maxX: 6, minY: 0, maxY: 6 };
    const mustCross = [{ x: 6, y: 3 }];
    const plan = planGridResize(8, -1, bounds, mustCross, []);
    assert.equal(plan.ok, false);
    assert.equal(plan.reason, 'mustcross-edge');
});

test('planGridResize: shrink rejected when a must-cross sits on the top edge (y == 0)', () => {
    const bounds = { minX: 0, maxX: 4, minY: 0, maxY: 4 };
    const mustCross = [{ x: 2, y: 0 }];
    const plan = planGridResize(8, -1, bounds, mustCross, []);
    assert.equal(plan.ok, false);
    assert.equal(plan.reason, 'mustcross-edge');
});

test('planGridResize: must-cross edge check ignores grow (delta > 0)', () => {
    const bounds = { minX: 0, maxX: 6, minY: 0, maxY: 6 };
    const mustCross = [{ x: 0, y: 0 }]; // on edge, but growing
    const plan = planGridResize(8, 1, bounds, mustCross, []);
    assert.equal(plan.ok, true);
});

// --- planGridResize: path out-of-bounds reporting ---

test('planGridResize: reports a path cell falling outside the new bounds', () => {
    const plan = planGridResize(9, -1, null, [], [{ x: 0, y: 0 }, { x: 8, y: 1 }]);
    // newSize 8 → cell at x=8 is out of bounds (valid range 0..7).
    assert.equal(plan.ok, true);
    assert.equal(plan.pathOutOfBounds, true);
});

test('planGridResize: in-bounds path is not flagged', () => {
    const plan = planGridResize(9, -1, null, [], [{ x: 0, y: 0 }, { x: 7, y: 7 }]);
    assert.equal(plan.pathOutOfBounds, false);
});

// --- computeTrapRetryBudget ---

test('computeTrapRetryBudget: doubles the previous limit', () => {
    assert.equal(computeTrapRetryBudget(30000, 30000), 60000);
});

test('computeTrapRetryBudget: falls back to the base budget when no previous limit', () => {
    assert.equal(computeTrapRetryBudget(undefined, 25000), 50000);
    assert.equal(computeTrapRetryBudget(null, 25000), 50000);
    assert.equal(computeTrapRetryBudget(0, 25000), 50000);
});

test('computeTrapRetryBudget: floors at 10s', () => {
    assert.equal(computeTrapRetryBudget(1000, 1000), 10000);
});

test('computeTrapRetryBudget: caps at 480s', () => {
    assert.equal(computeTrapRetryBudget(300000, 30000), 480000);
});
