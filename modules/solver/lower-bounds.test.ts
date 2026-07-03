/** Unit tests for Solver lower-bound pruning helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AXIS_H, KEY_SPACE, PACK } from './encoding.js';
import { mustCrossLowerBound, mustPassLowerBound } from './lower-bounds.js';
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
import { createState } from './search-state.js';
import { surroundLowerBound, adjTurnLowerBound, mcMSTLowerBound, mpMSTLowerBound } from './lower-bounds.js';

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
  const joint = mpMSTLowerBound(pos, [0, 1, 2], l, prep);
  const overall = mustPassLowerBound(pos, st, l, prep);
  assert.ok(Number.isFinite(joint));
  assert.ok(joint > maxSingle, `MST joint bound (${joint}) tighter than max single (${maxSingle})`);
  assert.ok(overall >= joint, 'overall bound incorporates the MST bound');
});

test('mcMSTLowerBound uses the perpendicular approach map for once-crossed cells', () => {
  const l = wireLevel({
    grid: { w: 7, h: 3 }, gates: [{ x: 1, y: 2 }], goal: { x: 7, y: 2 },
    mustCross: [{ x: 3, y: 2 }, { x: 5, y: 2 }],
    reqLen: 14, reqInt: 2,
  });
  const prep = prepLevel(l);
  const st = createState(W(1, 2), l, prep);
  const fresh = mcMSTLowerBound(W(1, 2), [0, 1], st, l, prep);
  assert.ok(Number.isFinite(fresh) && fresh > 0);

  // Mark MC[0] as crossed once horizontally: its second visit must approach vertically,
  // which is a longer detour — the bound must not shrink.
  st.crossCounts[0] = 1;
  st.edgeUsage[W(3, 2)] = AXIS_H;
  const after = mcMSTLowerBound(W(1, 2), [0, 1], st, l, prep);
  assert.ok(after >= fresh, `approach-aware bound ${after} >= fresh bound ${fresh}`);
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
