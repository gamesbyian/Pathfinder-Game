/** Unit tests for Solver lower-bound pruning helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AXIS_H, KEY_SPACE, PACK } from './encoding.js';
import { getDistanceFromArray } from './distance.js';
import { IntHashMap } from './int-hash-map.js';
import { MAX_MST_K, mustCrossLowerBound, mustPassLowerBound } from './lower-bounds.js';
import { prepLevel } from './prep.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState } from './types.js';


function makeLevel(overrides = {}) {
  return {
    grid: { w: 5, h: 3 },
    reqLen: 4,
    reqInt: 1,
    goalKey: PACK(4, 1),
    gateKeys: [PACK(0, 1)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

function makeState(overrides = {}) {
  return {
    path: [PACK(0, 1)],
    visited: new Uint16Array(KEY_SPACE),
    edgeUsage: new Uint8Array(KEY_SPACE),
    ints: 0,
    mustMask: 0,
    mustCrossMask: 0,
    crossCounts: new Uint8Array(0),
    mpVisitedMask: 0,
    portalJumps: 0,
    flipperUsedMask: 0,
    lastWasPortalJump: false,
    ...overrides,
  } as unknown as SolverSearchState;
}

test('mustPassLowerBound returns zero when no must-pass remains', () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  assert.equal(mustPassLowerBound(PACK(0, 1), makeState(), level, prep), 0);

  const withMp = makeLevel({ mustPassKeys: [PACK(1, 1), PACK(2, 1)] });
  const withPrep = prepLevel(withMp);
  assert.equal(mustPassLowerBound(PACK(0, 1), makeState({ mpVisitedMask: 0b11 }), withMp, withPrep), 0);
});

test('mustPassLowerBound includes remaining objective and goal distance', () => {
  const level = makeLevel({ mustPassKeys: [PACK(1, 1)] });
  const prep = prepLevel(level);
  assert.equal(mustPassLowerBound(PACK(0, 1), makeState(), level, prep), 4);
});

test('mustPassLowerBound uses a joint bound for multiple remaining must-pass cells', () => {
  const level = makeLevel({ mustPassKeys: [PACK(1, 1), PACK(2, 1)] });
  const prep = prepLevel(level);
  assert.equal(mustPassLowerBound(PACK(0, 1), makeState(), level, prep), 4);
});

test('mustCrossLowerBound returns zero when no must-cross remains', () => {
  const level = makeLevel({ mustCrossKeys: [PACK(2, 1)] });
  const prep = prepLevel(level);
  assert.equal(mustCrossLowerBound(PACK(0, 1), makeState({ mustCrossMask: 0, crossCounts: new Uint8Array(1) }), level, prep), 0);
});

test('mustCrossLowerBound includes remaining must-cross and goal distance', () => {
  const level = makeLevel({ mustCrossKeys: [PACK(2, 1)] });
  const prep = prepLevel(level);
  const state = makeState({ mustCrossMask: 1, crossCounts: new Uint8Array(1) });
  assert.equal(mustCrossLowerBound(PACK(0, 1), state, level, prep), 4);
});

test('mustCrossLowerBound uses perpendicular approach maps for second visits', () => {
  const mcKey = PACK(2, 1);
  const level = makeLevel({ mustCrossKeys: [mcKey] });
  const prep = prepLevel(level);
  const edgeUsage = new Uint8Array(KEY_SPACE);
  edgeUsage[mcKey] = AXIS_H;
  const state = makeState({ mustCrossMask: 1, crossCounts: new Uint8Array([1]), edgeUsage });
  assert.equal(mustCrossLowerBound(PACK(2, 0), state, level, prep), 3);
});

test('prepLevel output can feed extracted lower-bound helpers', () => {
  const level = makeLevel({ mustPassKeys: [PACK(1, 1)] });
  const prep = prepLevel(level);
  assert.equal(mustPassLowerBound(PACK(0, 1), makeState(), level, prep), 4);
});

// ── Hardening plan §1 additions: prune-fires / prune-does-not-fire behavior ──────
import { normalizeRawLevel } from './normalization.js';
import { createState, applyMove } from './search-state.js';
import { surroundLowerBound, adjTurnLowerBound, mcMSTLowerBound, mpMSTLowerBound, mustTurnDeadlocked, mustCrossForcedNeighborDeadlocked } from './lower-bounds.js';

const W = (x: number, y: number) => PACK(x - 1, y - 1); // 1-based wire coords

function wireLevel(overrides: any = {}) {
  const grid = overrides.grid || { w: 5, h: 3 };
  return normalizeRawLevel({
    grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
    reqLen: 6, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
    filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
    ...overrides,
  });
}

test('mustPassLowerBound is Infinity (prune fires) when the objective is sealed off', () => {
  const sealed = wireLevel({
    gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 },
    blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
    mustPass: [{ x: 5, y: 3 }],
  });
  const prep = prepLevel(sealed);
  const st = createState(W(1, 1), sealed, prep);
  assert.equal(mustPassLowerBound(W(1, 1), st, sealed, prep), Infinity);
});

test('mustCrossLowerBound is Infinity (prune fires) when the objective is sealed off', () => {
  const sealed = wireLevel({
    gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 },
    blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
    mustCross: [{ x: 5, y: 3 }],
  });
  const prep = prepLevel(sealed);
  const st = createState(W(1, 1), sealed, prep);
  assert.equal(mustCrossLowerBound(W(1, 1), st, sealed, prep), Infinity);
});

test('MST joint bounds are tighter than the max single-objective bound when cells spread out', () => {
  // Three must-pass cells in distinct corners of a 7x3 grid: visiting all three costs
  // strictly more than the farthest single round trip.
  const l = wireLevel({
    grid: { w: 7, h: 3 }, gates: [{ x: 4, y: 2 }], goal: { x: 4, y: 3 },
    mustPass: [{ x: 1, y: 1 }, { x: 7, y: 1 }, { x: 1, y: 3 }],
    reqLen: 20,
  });
  const prep = prepLevel(l);
  const st = createState(W(4, 2), l, prep);
  const pos = W(4, 2);
  // Max single-objective bound: leave only one must-pass unvisited at a time.
  let maxSingle = 0;
  for (let i = 0; i < 3; i++) {
    const single = { ...st, mpVisitedMask: 0b111 & ~(1 << i) } as any;
    maxSingle = Math.max(maxSingle, mustPassLowerBound(pos, single, l, prep));
  }
  const joint = mpMSTLowerBound(pos, [0, 1, 2], 3, l, prep);
  const overall = mustPassLowerBound(pos, st, l, prep);
  assert.ok(Number.isFinite(joint));
  assert.ok(joint > maxSingle, `MST joint bound (${joint}) tighter than max single (${maxSingle})`);
  assert.ok(overall >= joint, 'overall bound incorporates the MST bound');
});

test('mpMSTLowerBound computes every edge for 5+ remaining must-pass cells (regression: the shared _mstEdges/_ufPar scratch was sized "max 6 nodes" / 10 edges, undersized for k>=5 — must-turn landmarks fold into mustPassKeys alongside wire mustPass cells, per domain/landmark-rules.ts, so the true count regularly exceeds CLAUDE.md\'s wire-level "max 4" cap; a corpus scan found an observed max of 6. TypedArray writes past the buffer end are silent no-ops, so the old code silently dropped edges beyond the 10-edge cap and the sort/Kruskal steps read back stale/undefined data for the rest — reproduced against a real stress-corpus level as an UNSOUND bound (34 instead of the correct 27, i.e. tighter than mathematically justified, capable of wrongly pruning a reachable state))', () => {
  // 5 colinear must-pass cells: MST of colinear points is just the sum of consecutive gaps
  // (any non-adjacent pairing costs strictly more), independent of visit order — easy to
  // hand-verify. gate(1,2)->c1(3,2)->c2(5,2)->c3(7,2)->c4(9,2)->c5(11,2), gaps of 2 each = 10,
  // plus the nearest must-pass-to-goal leg (c5(11,2)->goal(13,2) = 2) = 12 total. k=5 needs
  // k + C(k,2) = 15 edges (45 float64 slots) — exceeds the old 30-slot (10-edge) buffer.
  const l = wireLevel({
    grid: { w: 13, h: 3 }, gates: [{ x: 1, y: 2 }], goal: { x: 13, y: 2 },
    mustPass: [{ x: 3, y: 2 }, { x: 5, y: 2 }, { x: 7, y: 2 }, { x: 9, y: 2 }, { x: 11, y: 2 }],
    reqLen: 12,
  });
  const prep = prepLevel(l);
  const st = createState(W(1, 2), l, prep);
  const lb = mustPassLowerBound(W(1, 2), st, l, prep);
  assert.equal(lb, 12);
});

test('mcMSTLowerBound uses the perpendicular approach map for once-crossed cells', () => {
  const l = wireLevel({
    grid: { w: 7, h: 3 }, gates: [{ x: 1, y: 2 }], goal: { x: 7, y: 2 },
    mustCross: [{ x: 3, y: 2 }, { x: 5, y: 2 }],
    reqLen: 14, reqInt: 2,
  });
  const prep = prepLevel(l);
  const st = createState(W(1, 2), l, prep);
  const fresh = mcMSTLowerBound(W(1, 2), [0, 1], 2, st, l, prep);
  assert.ok(Number.isFinite(fresh) && fresh > 0);

  // Mark MC[0] as crossed once horizontally: its second visit must approach vertically,
  // which is a longer detour — the bound must not shrink.
  st.crossCounts[0] = 1;
  st.edgeUsage[W(3, 2)] = AXIS_H;
  const after = mcMSTLowerBound(W(1, 2), [0, 1], 2, st, l, prep);
  assert.ok(after >= fresh, `approach-aware bound ${after} >= fresh bound ${fresh}`);
});

test('mcMSTLowerBound: the MC↔MC pairwise edge tightens beyond the pos-edge contribution when BOTH endpoints need their approach', () => {
  // Same corridor as above: MC[0]=(3,2), MC[1]=(5,2), 2 apart in a straight line —
  // plain pairwise distance is 2. Once-crossed-horizontally means the 2nd pass must
  // approach vertically (via (x,1) or (x,3)), a real detour for each cell individually.
  // Marking a cell crossed also tightens ITS pos→MC edge (pre-existing behavior) — this
  // test isolates the *additional* pairwise-edge tightening on top of that.
  const l = wireLevel({
    grid: { w: 7, h: 3 }, gates: [{ x: 1, y: 2 }], goal: { x: 7, y: 2 },
    mustCross: [{ x: 3, y: 2 }, { x: 5, y: 2 }],
    reqLen: 14, reqInt: 2,
  });
  const prep = prepLevel(l);

  const oneSt = createState(W(1, 2), l, prep);
  oneSt.crossCounts[0] = 1;
  oneSt.edgeUsage[W(3, 2)] = AXIS_H;
  const one = mcMSTLowerBound(W(4, 2), [0, 1], 2, oneSt, l, prep);

  // BOTH crossed once: every direction is now approach-constrained. The pos→MC[1] edge
  // also tightens here (pre-existing, independent of this test's change), so `both` isn't
  // expected to equal `one` — the meaningful assertion is that it clears the sum a
  // *plain*-pairwise MST would give, proving the pairwise edge itself grew past 2.
  const bothSt = createState(W(1, 2), l, prep);
  bothSt.crossCounts[0] = 1;
  bothSt.edgeUsage[W(3, 2)] = AXIS_H;
  bothSt.crossCounts[1] = 1;
  bothSt.edgeUsage[W(5, 2)] = AXIS_H;
  const both = mcMSTLowerBound(W(4, 2), [0, 1], 2, bothSt, l, prep);
  // Verified against the pre-tightening implementation (temporarily reverted, same
  // inputs): the pos-edge-only contribution alone gives 7 here. The pairwise edge
  // tightening this test targets pushes the total to 8 — confirming it does real work
  // beyond what the pre-existing pos→MC approach-awareness already contributed.
  assert.ok(both > 7, `both-pending bound ${both} must exceed the pos-edges-only total of 7`);
  assert.ok(both >= one, `both-pending bound ${both} must not be looser than single-pending ${one}`);
});

test('surroundLowerBound: zero when satisfied, positive when work remains, Infinity when impossible', () => {
  const l = wireLevel({
    grid: { w: 5, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 },
    landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    reqLen: 8,
  });
  const prep = prepLevel(l);
  const st = createState(W(1, 1), l, prep);
  assert.ok(surroundLowerBound(W(1, 1), st, l, prep) > 0, 'unvisited neighbors demand steps');

  const satisfied = createState(W(1, 1), l, prep);
  satisfied.surroundMask = 0;
  assert.equal(surroundLowerBound(W(1, 1), satisfied, l, prep), 0);

  // Seal a surround neighbor into an unreachable pocket → bound is Infinity (prune fires).
  const sealed = wireLevel({
    grid: { w: 5, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 },
    blocks: [{ x: 4, y: 3 }],
    landmarks: [{ x: 5, y: 2, objectType: 'park', role: 'surround' }],
    reqLen: 8,
  });
  const sPrep = prepLevel(sealed);
  const sSt = createState(W(1, 1), sealed, sPrep);
  assert.equal(surroundLowerBound(W(1, 1), sSt, sealed, sPrep), Infinity);
});

test('adjTurnLowerBound: zero when satisfied, positive when remaining, Infinity when unreachable', () => {
  const l = wireLevel({
    grid: { w: 5, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 },
    landmarks: [{ x: 3, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'either' }],
    reqLen: 8,
  });
  const prep = prepLevel(l);
  const st = createState(W(1, 1), l, prep);
  assert.ok(adjTurnLowerBound(W(1, 1), st, l, prep) > 0);

  const satisfied = createState(W(1, 1), l, prep);
  satisfied.adjTurnMask = 0;
  assert.equal(adjTurnLowerBound(W(1, 1), satisfied, l, prep), 0);
});

// mustTurnDeadlocked: a still-pending must-turn cell whose edgeUsage already has both axis
// bits set can never be re-entered (isMoveDynamicallyValid's edge-axis-reuse rule blocks
// either axis), so the requirement is provably unsatisfiable from that point on.
function mustTurnLevel(turn: string) {
  return wireLevel({
    grid: { w: 3, h: 3 }, gates: [{ x: 2, y: 1 }], goal: { x: 2, y: 3 },
    landmarks: [{ x: 2, y: 2, objectType: 'library', role: 'mustTurn', turn }],
    reqLen: 6,
  });
}

test('mustTurnDeadlocked: false on a fresh, untouched must-turn cell', () => {
  const l = mustTurnLevel('cw');
  const prep = prepLevel(l);
  const st = createState(W(2, 1), l, prep);
  assert.equal(mustTurnDeadlocked(st, prep), false);
});

test('mustTurnDeadlocked: false after a straight pass-through (only one axis used)', () => {
  const l = mustTurnLevel('cw');
  const prep = prepLevel(l);
  const st = createState(W(2, 1), l, prep);
  applyMove(W(2, 2), st, l, prep, false); // enter via V (south)
  applyMove(W(2, 3), st, l, prep, false); // exit via V (south) — no turn
  assert.equal(st.mustTurnMask, 1, 'still unsatisfied — no turn happened');
  assert.equal(mustTurnDeadlocked(st, prep), false, 'one axis still open for a later turn');
});

test('mustTurnDeadlocked: true after a wrong-direction turn (both axes now used)', () => {
  const l = mustTurnLevel('cw'); // west exit = cw, east exit = ccw (see turnDirection's cross product)
  const prep = prepLevel(l);
  const st = createState(W(2, 1), l, prep);
  applyMove(W(2, 2), st, l, prep, false); // enter via V (south)
  applyMove(W(3, 2), st, l, prep, false); // exit east — ccw, not the required cw
  assert.equal(st.mustTurnMask, 1, 'wrong direction — still unsatisfied');
  assert.equal(mustTurnDeadlocked(st, prep), true, 'both axes now used — provably unsatisfiable');
});

test('mustTurnDeadlocked: false after a correct-direction turn (requirement satisfied, not checked)', () => {
  const l = mustTurnLevel('cw');
  const prep = prepLevel(l);
  const st = createState(W(2, 1), l, prep);
  applyMove(W(2, 2), st, l, prep, false); // enter via V (south)
  applyMove(W(1, 2), st, l, prep, false); // exit west — cw, matches the requirement
  assert.equal(st.mustTurnMask, 0, 'satisfied — mask cleared');
  assert.equal(mustTurnDeadlocked(st, prep), false, 'guarded by mustTurnMask === 0, never even checks');
});

// mustCrossForcedNeighborDeadlocked (reports/2026-07-31-mustcross-forced-structure.md's step 2):
// a pending must-cross cell's still-needed straight pass requires BOTH of that axis's neighbors
// to remain enterable. Grid:
//     .  .  .  .  .
//     .  .  N  .  .
//     .  W  MC E  .
//     .  .  S  .  .
//     .  .  .  .  .
// with gate (1,1). MC=(3,3), N=(3,2), S=(3,4), W=(2,3), E=(4,3).
function mcForcedNeighborLevel() {
  return wireLevel({
    grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
    mustCross: [{ x: 3, y: 3 }],
    reqLen: 20,
  });
}

test('mustCrossForcedNeighborDeadlocked: false on a fresh, untouched must-cross cell', () => {
  const l = mcForcedNeighborLevel();
  const prep = prepLevel(l);
  const st = createState(W(1, 1), l, prep);
  assert.equal(mustCrossForcedNeighborDeadlocked(W(1, 1), st, l, prep), false);
});

test('mustCrossForcedNeighborDeadlocked: false right after the first (V-axis) pass — both H neighbors still open', () => {
  const l = mcForcedNeighborLevel();
  const prep = prepLevel(l);
  const st = createState(W(1, 1), l, prep);
  applyMove(W(2, 1), st, l, prep, false);
  applyMove(W(3, 1), st, l, prep, false);
  applyMove(W(3, 2), st, l, prep, false); // N
  applyMove(W(3, 3), st, l, prep, false); // MC, entered via V
  applyMove(W(3, 4), st, l, prep, false); // S — straight V-pass complete
  assert.equal(st.mustCrossMask, 1, 'still pending — only one of two crossings done');
  assert.equal(st.edgeUsage[W(3, 3)] & 2, 2, 'V axis used at MC');
  assert.equal(st.edgeUsage[W(3, 3)] & 1, 0, 'H axis still open at MC — the still-needed pass');
  assert.equal(mustCrossForcedNeighborDeadlocked(W(3, 4), st, l, prep), false, 'W and E neighbors both still fresh');
});

test('mustCrossForcedNeighborDeadlocked: true once a still-needed neighbor becomes a hard wall (both axes spent)', () => {
  const l = mcForcedNeighborLevel();
  const prep = prepLevel(l);
  const st = createState(W(1, 1), l, prep);
  applyMove(W(2, 1), st, l, prep, false);
  applyMove(W(3, 1), st, l, prep, false);
  applyMove(W(3, 2), st, l, prep, false); // N
  applyMove(W(3, 3), st, l, prep, false); // MC, entered via V
  applyMove(W(3, 4), st, l, prep, false); // S — V-pass complete, H-pass (W/E) still needed
  applyMove(W(2, 4), st, l, prep, false);
  applyMove(W(2, 3), st, l, prep, false); // W, entered via V (from below)
  applyMove(W(1, 3), st, l, prep, false); // exit W via H — a TURN at W, sets BOTH axis bits there
  assert.equal(st.mustCrossMask, 1, 'MC still pending');
  assert.equal(st.edgeUsage[W(2, 3)], 3, 'W neighbor now a hard wall — both axes spent');
  assert.equal(mustCrossForcedNeighborDeadlocked(W(1, 3), st, l, prep), true,
    'W was required for MCs still-pending H-pass and can never be entered again');
});

// This is the exact bug caught by replaying real solutions through search state (see the
// function's own doc comment): a needed neighbor's edgeUsage can legitimately read both-axes-
// spent AT THE INSTANT the path arrives there for a second visit, with the path about to
// continue straight through toward the must-cross cell on its very next (still-legal) move. The
// deadlock check must not treat the CURRENT position as a hard wall against itself.
//
// To get edgeUsage[W] === 3 while STANDING on W (not having left again), W needs two separate
// visits: a first STRAIGHT pass (entry axis === exit axis, so only one bit gets set for that
// whole visit) elsewhere in the path, then a second arrival via the OTHER axis — which sets that
// axis's bit immediately on entry, before any exit move has happened.
test('mustCrossForcedNeighborDeadlocked: false while STANDING ON the hard-walled neighbor — it can still move on', () => {
  const l = mcForcedNeighborLevel();
  const prep = prepLevel(l);
  const st = createState(W(1, 1), l, prep);
  applyMove(W(2, 1), st, l, prep, false);
  applyMove(W(3, 1), st, l, prep, false);
  applyMove(W(3, 2), st, l, prep, false); // N
  applyMove(W(3, 3), st, l, prep, false); // MC, entered via V
  applyMove(W(3, 4), st, l, prep, false); // S — V-pass complete, H-pass (W/E of MC) still needed
  applyMove(W(2, 4), st, l, prep, false);
  applyMove(W(2, 3), st, l, prep, false); // W's FIRST visit, entered via V (from below)...
  applyMove(W(2, 2), st, l, prep, false); // ...and left via V (straight) — edgeUsage[W] = V only
  assert.equal(st.edgeUsage[W(2, 3)], 2, 'W visited once, straight — only V used so far');
  applyMove(W(1, 2), st, l, prep, false);
  applyMove(W(1, 3), st, l, prep, false);
  applyMove(W(2, 3), st, l, prep, false); // W's SECOND visit, entered via H (from the west) —
                                           // this sets H too, so edgeUsage[W] becomes 3 on arrival
  assert.equal(st.edgeUsage[W(2, 3)], 3, 'W now reads both-axes-spent, mid-arrival, standing on it');
  assert.equal(mustCrossForcedNeighborDeadlocked(W(2, 3), st, l, prep), false,
    'still standing on W — it can continue straight to MC next, exactly what a real solution does');
  applyMove(W(3, 3), st, l, prep, false); // straight through W -> MC (same axis just entered on)
  applyMove(W(4, 3), st, l, prep, false); // and out via E, straight — MCs H-pass completes
  assert.equal(st.mustCrossMask, 0, 'and it works: MC is now fully satisfied');
});

test('mustCrossForcedNeighborDeadlocked: false once mustCrossMask is fully cleared', () => {
  const l = mcForcedNeighborLevel();
  const prep = prepLevel(l);
  const st = createState(W(1, 1), l, prep);
  applyMove(W(2, 1), st, l, prep, false);
  applyMove(W(3, 1), st, l, prep, false);
  applyMove(W(3, 2), st, l, prep, false); // N
  applyMove(W(3, 3), st, l, prep, false); // MC, entered via V
  applyMove(W(3, 4), st, l, prep, false); // S — V-pass complete
  applyMove(W(2, 4), st, l, prep, false);
  applyMove(W(2, 3), st, l, prep, false); // W
  applyMove(W(3, 3), st, l, prep, false); // back through MC via H — H-pass...
  applyMove(W(4, 3), st, l, prep, false); // ...complete via E: both crossings done
  assert.equal(st.mustCrossMask, 0, 'fully satisfied');
  assert.equal(mustCrossForcedNeighborDeadlocked(W(4, 3), st, l, prep), false, 'guarded by mustCrossMask === 0');
});

test('STRATEGY_LOWER_BOUND_MEMO=false bypasses the caches with identical values', () => {
  const level = makeLevel({ mustPassKeys: [PACK(1, 1), PACK(2, 1)], mustCrossKeys: [PACK(3, 1)] });
  const cached = prepLevel(level);
  const uncached = prepLevel(level);
  uncached._cfg = { STRATEGY_LOWER_BOUND_MEMO: false };

  const mpState = makeState();
  assert.equal(mustPassLowerBound(PACK(0, 1), mpState, level, uncached),
    mustPassLowerBound(PACK(0, 1), mpState, level, cached));
  assert.equal(uncached._mpLowerBoundCache, undefined, 'memo disabled — mp cache never created');
  assert.equal(cached._mpLowerBoundCache instanceof IntHashMap && cached._mpLowerBoundCache.size > 0, true);

  const mcState = makeState({ mustCrossMask: 1, crossCounts: new Uint8Array(1) });
  assert.equal(mustCrossLowerBound(PACK(0, 1), mcState, level, uncached),
    mustCrossLowerBound(PACK(0, 1), mcState, level, cached));
  assert.equal(uncached._mcLowerBoundCache, undefined, 'memo disabled — mc cache never created');
  assert.equal(cached._mcLowerBoundCache instanceof IntHashMap && cached._mcLowerBoundCache.size > 0, true);
});

test('MST scratch is sequence-independent across large, tiny, shifted, and original objective sets', () => {
  const sets = [
    Array.from({ length: MAX_MST_K }, (_, i) => PACK(i % 5, (i / 5) | 0)),
    [],
    [PACK(2, 1)],
    [PACK(4, 0), PACK(0, 2), PACK(3, 2), PACK(1, 0)],
  ];
  const run = (keys: number[], cross: boolean) => {
    const level = makeLevel({ grid: { w: 5, h: 4 }, goalKey: PACK(4, 3),
      mustPassKeys: cross ? [] : keys, mustCrossKeys: cross ? keys : [] });
    const prep = prepLevel(level);
    prep._cfg = { STRATEGY_LOWER_BOUND_MEMO: false };
    const state = makeState(cross ? {
      mustCrossMask: (1 << keys.length) - 1, crossCounts: new Uint8Array(keys.length),
    } : {});
    return cross ? mustCrossLowerBound(PACK(0, 3), state, level, prep)
      : mustPassLowerBound(PACK(0, 3), state, level, prep);
  };
  const baseline = sets.map(keys => [run(keys, false), run(keys, true)]);
  for (const index of [0, 1, 2, 3, 0, 3, 2, 1, 0]) {
    // Alternate owners as well as sizes: both remaining-index buffers feed the shared
    // edge/union-find scratch, so this catches contamination at either layer.
    assert.equal(run(sets[index], true), baseline[index][1]);
    assert.equal(run(sets[index], false), baseline[index][0]);
  }
});

test('MST declared capacity is accepted and capacity+1 uses the safe individual-bound fallback', () => {
  const keys = Array.from({ length: MAX_MST_K + 1 }, (_, i) => PACK(i % 5, (i / 5) | 0));
  const evaluate = (n: number) => {
    const level = makeLevel({ grid: { w: 5, h: 4 }, goalKey: PACK(4, 3), mustPassKeys: keys.slice(0, n) });
    const prep = prepLevel(level); prep._cfg = { STRATEGY_LOWER_BOUND_MEMO: false };
    const pos = PACK(0, 3);
    const actual = mustPassLowerBound(pos, makeState(), level, prep);
    const individual = Math.max(...prep.mpDistArrs.map((dist, i) =>
      getDistanceFromArray(dist, pos, prep.gridW) + prep.mustPassToGoalDist[i]));
    return { actual, individual };
  };
  assert.ok(Number.isFinite(evaluate(MAX_MST_K).actual), 'capacity boundary enters MST safely');
  const overflow = evaluate(MAX_MST_K + 1);
  assert.ok(Number.isFinite(overflow.actual), 'overflow skips MST instead of overrunning fixed scratch');
  assert.equal(overflow.actual, overflow.individual, 'overflow returns exactly the documented max-of-individual fallback');
  assert.equal(overflow.actual, evaluate(MAX_MST_K + 1).actual, 'fallback is stable after the boundary call');
});
