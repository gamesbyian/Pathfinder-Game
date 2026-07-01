/** Unit tests for Solver mutable search-state and neighbor helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AXIS_H, AXIS_NONE, AXIS_V, PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { applyMove, createState, getNeighbors, isMoveDynamicallyValid, undoMove } from './search-state.js';
import type { NormalizedLevel } from '../domain/types.js';


function makeLevel(overrides = {}) {
  return {
    grid: { w: 5, h: 5 },
    reqLen: 6,
    reqInt: 1,
    goalKey: PACK(4, 2),
    gateKeys: [PACK(0, 2)],
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

test('createState applies start-cell must-pass, must-cross, and flipper effects', () => {
  const start = PACK(0, 2);
  const level = makeLevel({
    gateKeys: [start],
    mustPassKeys: [start, PACK(2, 2)],
    mustCrossKeys: [start],
    flippingFilterMap: new Map([[start, AXIS_H]]),
  });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  assert.equal(state.path[0], start);
  assert.equal(state.visited[start], 1);
  assert.equal(state.mpVisitedMask & 1, 1);
  assert.equal(state.crossCounts[0], 1);
  assert.equal(state.mustCrossMask & 1, 1);
  assert.equal(state.flipperUsedMask & 1, 1);
});

test('applyMove and undoMove restore mutable search state exactly', () => {
  const start = PACK(0, 2);
  const mp = PACK(1, 2);
  const level = makeLevel({ gateKeys: [start], mustPassKeys: [mp] });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  const before = {
    path: state.path.slice(),
    visitedStart: state.visited[start],
    visitedMp: state.visited[mp],
    edgeStart: state.edgeUsage[start],
    edgeMp: state.edgeUsage[mp],
    ints: state.ints,
    mpVisitedMask: state.mpVisitedMask,
    lastWasPortalJump: state.lastWasPortalJump,
  };
  const undo = applyMove(mp, state, level, prep, false);
  assert.equal(state.path.at(-1), mp);
  assert.equal(state.visited[mp], 1);
  assert.equal(state.edgeUsage[start] & AXIS_H, AXIS_H);
  assert.equal(state.edgeUsage[mp] & AXIS_H, AXIS_H);
  assert.equal(state.mpVisitedMask & 1, 1);

  undoMove(undo, state);
  assert.deepEqual(state.path, before.path);
  assert.equal(state.visited[start], before.visitedStart);
  assert.equal(state.visited[mp], before.visitedMp);
  assert.equal(state.edgeUsage[start], before.edgeStart);
  assert.equal(state.edgeUsage[mp], before.edgeMp);
  assert.equal(state.ints, before.ints);
  assert.equal(state.mpVisitedMask, before.mpVisitedMask);
  assert.equal(state.lastWasPortalJump, before.lastWasPortalJump);
});

test('getNeighbors forces portal destinations and prevents immediate portal chaining', () => {
  const start = PACK(0, 2);
  const portalA = PACK(1, 2);
  const portalB = PACK(4, 4);
  const level = makeLevel({
    gateKeys: [start],
    portalMap: new Map([
      [portalA, { dest: portalB, color: '#fff' }],
      [portalB, { dest: portalA, color: '#fff' }],
    ]),
  });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  applyMove(portalA, state, level, prep, false);
  assert.deepEqual(getNeighbors(portalA, state, level, prep), [portalB]);
  applyMove(portalB, state, level, prep, true);
  assert.notDeepEqual(getNeighbors(portalB, state, level, prep), [portalA]);
});

test('getNeighbors honors prep._forcedPortalExitKey only at the forced portal destination', () => {
  const start = PACK(0, 2);
  const portalA = PACK(1, 2);
  const portalB = PACK(3, 2);
  const level = makeLevel({
    grid: { w: 5, h: 5 },
    gateKeys: [start],
    portalMap: new Map([
      [portalA, { dest: portalB, color: '#fff' }],
      [portalB, { dest: portalA, color: '#fff' }],
    ]),
  });
  const prep = prepLevel(level);
  prep._forcedPortalExitKey = { from: portalB, to: PACK(3, 1) };

  const state = createState(start, level, prep);
  applyMove(portalA, state, level, prep, false); // steps onto portal A
  applyMove(portalB, state, level, prep, true);  // forced jump A -> B
  const forced = getNeighbors(portalB, state, level, prep);
  assert.deepEqual(forced, [PACK(3, 1)], 'only the forced exit direction should survive');
});

test('getNeighbors ignores prep._forcedPortalExitKey when not arriving via a portal jump', () => {
  const start = PACK(0, 2);
  const portalA = PACK(1, 2);
  const level = makeLevel({
    grid: { w: 5, h: 5 },
    gateKeys: [start],
    portalMap: new Map(),
  });
  const prep = prepLevel(level);
  prep._forcedPortalExitKey = { from: start, to: PACK(0, 1) };

  const state = createState(start, level, prep);
  const neighbors = getNeighbors(start, state, level, prep);
  assert.ok(neighbors.includes(portalA), 'forcing should not apply when lastWasPortalJump is false');
});

test('isMoveDynamicallyValid blocks edge reuse and must-cross axis locks', () => {
  const start = PACK(0, 2);
  const mc = PACK(1, 2);
  const level = makeLevel({ gateKeys: [start], mustCrossKeys: [mc] });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  applyMove(mc, state, level, prep, false);

  assert.equal(isMoveDynamicallyValid(mc, start, state, level, prep, AXIS_H, AXIS_H), false, 'used horizontal edge should be blocked');
  assert.equal(isMoveDynamicallyValid(mc, PACK(1, 3), state, level, prep, AXIS_H, AXIS_V), false, 'turning at one-cross must-cross should be blocked');
});

test('isMoveDynamicallyValid enforces flipping filter entry orientation', () => {
  const start = PACK(0, 2);
  const flipper = PACK(1, 2);
  const level = makeLevel({ gateKeys: [start], flippingFilterMap: new Map([[flipper, AXIS_H]]) });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  assert.equal(isMoveDynamicallyValid(start, flipper, state, level, prep, AXIS_NONE, AXIS_H), true);
  assert.equal(isMoveDynamicallyValid(PACK(1, 1), flipper, state, level, prep, AXIS_NONE, AXIS_V), false);
});
