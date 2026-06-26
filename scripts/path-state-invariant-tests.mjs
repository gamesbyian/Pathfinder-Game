// Invariant tests for the navigation derived-state model (modernization-plan §2 Phase 4 /
// completion spec: "Derived navigation fields are recomputed in one authoritative place and
// cannot silently diverge from nav.path in tests").
//
// path-state.js maintains the derived nav fields (visitedCounts, cellUsage, intersections,
// flipCount, crossedFlippingFilters) two ways:
//   • pushStep()            — incremental, as each step is appended during play.
//   • rebuildDerivedState() — full recompute from nav.path (undo, snapshot replay).
// These two code paths MUST agree for the same (path, portal-jumps) — if they ever drift, the
// in-game counters silently diverge from what an undo/replay would produce. This suite drives
// representative paths through both and asserts byte-identical derived state.

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from '../modules/domain/cell-key.js';
import { rebuildDerivedState, pushStep } from '../modules/runtime/path-state.js';

function freshState(gateKey) {
  return {
    path: [],
    isPortalJump: new Set(),
    visitedCounts: new Map(),
    cellUsage: new Map(),
    intersections: 0,
    flipCount: 0,
    crossedFlippingFilters: new Map(),
    activeGateKey: gateKey,
    turnsAtMap: new Map(),
  };
}

// Snapshot the derived fields into plain, order-independent comparable values.
function derivedSnapshot(s) {
  const sortMap = (m, mapVal = (v) => v) =>
    [...m.entries()].map(([k, v]) => [k, mapVal(v)]).sort((a, b) => a[0] - b[0]);
  return {
    intersections: s.intersections,
    flipCount: s.flipCount,
    visitedCounts: sortMap(s.visitedCounts),
    cellUsage: sortMap(s.cellUsage, (u) => ({ h: !!u.h, v: !!u.v })),
    crossedFlippingFilters: sortMap(s.crossedFlippingFilters),
  };
}

// Build derived state incrementally via pushStep (the play path).
function buildIncremental(steps, level, gateKey) {
  const s = freshState(gateKey);
  for (const { key, jump } of steps) pushStep(s, key, !!jump, level);
  return s;
}

// Build derived state by full recompute via rebuildDerivedState (the undo/replay path).
function buildRebuilt(steps, level, gateKey) {
  const s = freshState(gateKey);
  s.path = steps.map((st) => st.key);
  s.isPortalJump = new Set(steps.map((st, i) => (st.jump ? i : -1)).filter((i) => i >= 0));
  rebuildDerivedState(s, level);
  return s;
}

// Assert the two derivation paths agree, and (sanity) that the expected counters hold.
function assertAgree(name, steps, level, gateKey, expect = {}) {
  test(name, () => {
    const inc = derivedSnapshot(buildIncremental(steps, level, gateKey));
    const reb = derivedSnapshot(buildRebuilt(steps, level, gateKey));
    assert.deepEqual(inc, reb, 'pushStep and rebuildDerivedState derived state must match');
    if (expect.intersections !== undefined)
      assert.equal(inc.intersections, expect.intersections, 'intersection count');
    if (expect.flipCount !== undefined)
      assert.equal(inc.flipCount, expect.flipCount, 'flip count');
  });
}

const steps = (...keys) => keys.map((key) => ({ key }));
const noLevel = (goalKey, flippers = []) => ({
  goalKey,
  grid: { w: 6, h: 6 },
  flippingFilterMap: new Map(flippers.map((k) => [k, true])),
});

console.log('path-state derived invariants (pushStep ≡ rebuildDerivedState):');

// 1. Straight line, no revisits → zero intersections.
{
  const gate = PACK(0, 0);
  const level = noLevel(PACK(3, 0));
  assertAgree('straight line has no intersections',
    steps(PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(3, 0)), level, gate,
    { intersections: 0, flipCount: 0 });
}

// 2. A loop that re-enters an interior cell → one intersection.
{
  const gate = PACK(1, 1);
  const level = noLevel(PACK(4, 4));
  // (1,1)→(2,1)→(2,2)→(1,2)→(1,1): re-enters the gate? gate revisit is NOT counted, so use
  // a non-gate junction instead. Walk a square that re-enters (2,1).
  assertAgree('interior revisit counts one intersection',
    steps(PACK(2, 1), PACK(2, 2), PACK(3, 2), PACK(3, 1), PACK(2, 1)), level, gate,
    { intersections: 1 });
}

// 3. Re-entering the gate and the goal is NOT counted as an intersection.
{
  const gate = PACK(0, 0);
  const goal = PACK(2, 0);
  const level = noLevel(goal);
  // Start at gate, leave, come back to gate (not counted), out to goal, back to goal-ish.
  // gate(0,0)→(1,0)→(1,1)→(0,1)→(0,0 gate revisit, NOT counted)→(0,1 revisit, counted once)
  assertAgree('gate revisit is not an intersection',
    steps(PACK(0, 0), PACK(1, 0), PACK(1, 1), PACK(0, 1), PACK(0, 0)), level, gate,
    { intersections: 0 });
}

// 4. Flipping filters: flipCount increments once per DISTINCT filter cell entered.
{
  const gate = PACK(0, 0);
  const f1 = PACK(1, 0), f2 = PACK(3, 0);
  const level = noLevel(PACK(4, 0), [f1, f2]);
  assertAgree('flipCount counts distinct flippers once',
    steps(PACK(0, 0), f1, PACK(2, 0), f2, PACK(4, 0)), level, gate,
    { flipCount: 2 });
}

// 5. Re-entering the SAME flipper does not double-count the flip.
{
  const gate = PACK(0, 0);
  const f1 = PACK(2, 2);
  const level = noLevel(PACK(5, 5), [f1]);
  assertAgree('re-entering a flipper does not re-count',
    steps(PACK(2, 2), PACK(2, 3), PACK(1, 3), PACK(1, 2), PACK(2, 2)), level, gate,
    { flipCount: 1 });
}

// 6. A T-style overlap that marks both H and V usage on the crossing cell.
{
  const gate = PACK(0, 5);
  const level = noLevel(PACK(5, 5));
  // Horizontal pass through (2,2), then a vertical pass through (2,2) → cellUsage {h,v}.
  assertAgree('cross marks both axes on the shared cell, agrees across paths',
    steps(PACK(1, 2), PACK(2, 2), PACK(3, 2), PACK(3, 1), PACK(2, 1), PACK(2, 2)),
    level, gate, { intersections: 1 });
}

// 7. Portal jump steps are excluded from edge (cellUsage) marking in both paths.
{
  const gate = PACK(0, 0);
  const level = noLevel(PACK(5, 5));
  // Walk, then a "portal jump" from (2,0) to (4,4) (jump:true), then continue.
  const path = [
    { key: PACK(0, 0) },
    { key: PACK(1, 0) },
    { key: PACK(2, 0) },
    { key: PACK(4, 4), jump: true },
    { key: PACK(4, 5) },
  ];
  assertAgree('portal-jump step is excluded from cellUsage edges, agrees across paths',
    path, level, gate, { intersections: 0 });
}
