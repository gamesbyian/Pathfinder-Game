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
