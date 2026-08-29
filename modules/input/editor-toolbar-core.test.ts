// Unit tests for modules/input/editor-toolbar-core.ts — DOM-free editor decisions from
// editor-toolbar-controller (grid-resize feasibility/shift planning, trap retry budget).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { planGridResize, computeFalseGoalTriggerRetryBudget } from './editor-toolbar-core.js';

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
    assert.equal((plan as any).pathOutOfBounds, true);
});

test('planGridResize: in-bounds path is not flagged', () => {
    const plan = planGridResize(9, -1, null, [], [{ x: 0, y: 0 }, { x: 7, y: 7 }]);
    assert.equal((plan as any).pathOutOfBounds, false);
});

// --- computeFalseGoalTriggerRetryBudget ---

test('computeFalseGoalTriggerRetryBudget: doubles the previous limit', () => {
    assert.equal(computeFalseGoalTriggerRetryBudget(30000, 30000), 60000);
});

test('computeFalseGoalTriggerRetryBudget: falls back to the base budget when no previous limit', () => {
    assert.equal(computeFalseGoalTriggerRetryBudget(undefined, 25000), 50000);
    assert.equal(computeFalseGoalTriggerRetryBudget(null, 25000), 50000);
    assert.equal(computeFalseGoalTriggerRetryBudget(0, 25000), 50000);
});

test('computeFalseGoalTriggerRetryBudget: floors at 10s', () => {
    assert.equal(computeFalseGoalTriggerRetryBudget(1000, 1000), 10000);
});

test('computeFalseGoalTriggerRetryBudget: caps at 480s', () => {
    assert.equal(computeFalseGoalTriggerRetryBudget(300000, 30000), 480000);
});

// ── §3 additions: false-goal-trigger report decision + variant popup placement ─────────────────

import { decideFalseGoalTriggerReport, computeVariantPopupPosition } from './editor-toolbar-core.js';

test('decideFalseGoalTriggerReport: aborted searches warn and never offer a retry', () => {
  assert.deepEqual(decideFalseGoalTriggerReport({ status: 'aborted' }, 0),
    { message: 'Search cancelled.', tone: 'warning', offerRetry: false });
  const partial = decideFalseGoalTriggerReport({ status: 'aborted' }, 3);
  assert.match(partial.message, /3 spots found so far \(incomplete\)/);
  assert.equal(partial.offerRetry, false);
});

test('decideFalseGoalTriggerReport: complete searches report found/none without a retry', () => {
  assert.deepEqual(decideFalseGoalTriggerReport({ status: 'complete' }, 1),
    { message: 'Found 1 spot.', tone: 'info', offerRetry: false });
  const none = decideFalseGoalTriggerReport({ status: 'complete' }, 0);
  assert.match(none.message, /No valid trap spots/);
  assert.equal(none.tone, 'warning');
  assert.equal(none.offerRetry, false);
});

test('decideFalseGoalTriggerReport: a canonical partial sweep is always surfaced as incomplete and offers a retry', () => {
  const withSpots = decideFalseGoalTriggerReport({ status: 'partial', gatesCompleted: 1, totalGates: 3 }, 2);
  // "fully swept" (not "after N/M gates"): gatesCompleted counts exhaustively-proven
  // gates, so spots can be found while the count is still 0.
  assert.match(withSpots.message, /Found 2 spots so far.*only 1 of 3 gates fully swept/);
  assert.equal(withSpots.tone, 'warning');
  assert.equal(withSpots.offerRetry, true);

  const noSpots = decideFalseGoalTriggerReport({ status: 'partial', gatesCompleted: 0, totalGates: 2 }, 0);
  assert.match(noSpots.message, /0 of 2 gates fully swept and no spots found yet/);
  assert.equal(noSpots.offerRetry, true);

  // The retry path is a button re-press (escalated budget), not a popup — the
  // message must carry that guidance itself.
  assert.match(withSpots.message, /press Trap Spots again/);
  assert.match(noSpots.message, /press Trap Spots again/);
});


test('decideFalseGoalTriggerReport: historical done/timeout payloads normalize to canonical behavior', () => {
  assert.deepEqual(
    decideFalseGoalTriggerReport({ status: 'done', timedOut: false }, 1),
    decideFalseGoalTriggerReport({ status: 'complete' }, 1),
  );
  assert.deepEqual(
    decideFalseGoalTriggerReport({ status: 'timeout', timedOut: true, gatesCompleted: 1, totalGates: 2 }, 1),
    decideFalseGoalTriggerReport({ status: 'partial', gatesCompleted: 1, totalGates: 2 }, 1),
  );
});

test('computeVariantPopupPosition: centered above the anchor, flipping and clamping at edges', () => {
  const anchor = { top: 100, bottom: 140, left: 200, width: 40 };
  assert.deepEqual(computeVariantPopupPosition(anchor, 100, 50, 800),
    { top: 100 - 50 - 8, left: 200 + 20 - 50 });
  // No headroom → flips below the anchor.
  assert.equal(computeVariantPopupPosition({ ...anchor, top: 20 }, 100, 50, 800).top, 140 + 8);
  // Clamped to the left margin.
  assert.equal(computeVariantPopupPosition({ ...anchor, left: 0 }, 100, 50, 800).left, 8);
  // Clamped to the right margin.
  assert.equal(computeVariantPopupPosition({ ...anchor, left: 780 }, 100, 50, 800).left, 800 - 100 - 8);
});
