/** Unit tests for shared Solver encoding and distance primitives. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildAxisApproachMap, buildDistMap, distMapToArray, getDistanceFromArray } from './distance.js';
import { AXIS_H, AXIS_NONE, AXIS_V, KEY_SPACE, PACK, popcount } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';


function makeLevel(overrides = {}) {
  return {
    grid: { w: 4, h: 4 },
    blockSet: new Set(),
    portalMap: new Map(),
    gooseSet: new Set(),
    gateKeys: [],
    falseGoalKeys: new Set(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

test('PACK and axis constants preserve Solver coordinate contracts', () => {
  assert.equal(PACK(0, 0), 0);
  assert.equal(PACK(14, 14), 917518);
  assert.equal(PACK(3, 5) & 0xFFFF, 3);
  assert.equal((PACK(3, 5) >>> 16) & 0xFFFF, 5);
  assert.equal(KEY_SPACE, 1 << 20);
  assert.equal(AXIS_H, 1);
  assert.equal(AXIS_V, 2);
  assert.equal(AXIS_NONE, 0);
});

test('popcount counts set bits in unsigned masks', () => {
  assert.equal(popcount(0), 0);
  assert.equal(popcount(0b101101), 4);
  assert.equal(popcount(0xFFFFFFFF), 32);
});

test('buildDistMap respects blocks and portal zero-cost edges', () => {
  const source = PACK(0, 0);
  const portalA = PACK(1, 0);
  const portalB = PACK(3, 3);
  const blocked = PACK(0, 1);
  const level = makeLevel({
    blockSet: new Set([blocked]),
    portalMap: new Map([
      [portalA, { dest: portalB, color: '#fff' }],
      [portalB, { dest: portalA, color: '#fff' }],
    ]),
  });

  const dist = buildDistMap(level, [source]);
  assert.equal(dist.get(source), 0);
  assert.equal(dist.has(blocked), false);
  assert.equal(dist.get(portalA), 1);
  assert.equal(dist.get(portalB), 1, 'portal destination should inherit zero-cost portal traversal');
});


test('distMapToArray and getDistanceFromArray preserve finite and unreachable distances', () => {
  const source = PACK(0, 0);
  const reachable = PACK(2, 0);
  const map = new Map([[source, 0], [reachable, 2], [PACK(3, 0), 0xFFFF + 10]]);
  // Dense arrays now: distMapToArray takes the grid dims, and reads take the width as stride.
  const W = 5, H = 5;
  const arr = distMapToArray(map, W, H);
  assert.equal(getDistanceFromArray(arr, source, W), 0);
  assert.equal(getDistanceFromArray(arr, reachable, W), 2);
  assert.equal(getDistanceFromArray(arr, PACK(1, 1), W), Infinity);
  assert.equal(getDistanceFromArray(arr, PACK(3, 0), W), 0xFFFE);
});

test('buildAxisApproachMap selects only filtered approach cells for the requested axis', () => {
  const targetX = 1;
  const targetY = 1;
  const level = makeLevel();
  const vertical = buildAxisApproachMap(level, targetX, targetY, AXIS_V, k => k !== PACK(1, 0));
  assert.notEqual(vertical.get(PACK(1, 0)), 0, 'filtered-out approach cell should not be a zero-distance source');
  assert.equal(vertical.get(PACK(1, 2)), 0);
  assert.equal(vertical.get(PACK(1, 1)), 1);

  const horizontal = buildAxisApproachMap(level, targetX, targetY, AXIS_H, k => k === PACK(0, 1));
  assert.equal(horizontal.get(PACK(0, 1)), 0);
  assert.notEqual(horizontal.get(PACK(2, 1)), 0, 'filtered-out approach cell should not be a zero-distance source');
});

test('the extracted distance map primitive computes BFS distances', () => {
  const source = PACK(0, 0);
  const level = makeLevel();
  assert.equal(buildDistMap(level, [source]).get(PACK(3, 3)), 6);
});

test('buildDistMap treats a gate as a reachable sink: assignable a distance, but not a through-node', () => {
  // 3x1 corridor (0,0)-(1,0)-(2,0), a gate sits in the middle. No real path can route THROUGH a
  // gate mid-walk ("invalid-gate-reentry"), so from the goal-side source at (2,0), the gate at
  // (1,0) must still get a real distance (a real path CAN start there), but (0,0) must be
  // unreachable — the only grid route to it passes through the gate.
  const gate = PACK(1, 0);
  const level = makeLevel({ grid: { w: 3, h: 1 }, gateKeys: [gate] });
  const dist = buildDistMap(level, [PACK(2, 0)]);
  assert.equal(dist.get(gate), 1, 'the gate itself is a reachable position');
  assert.equal(dist.has(PACK(0, 0)), false, 'no route to the far side without stepping through the gate');

  // But used as an explicit SOURCE (not discovered via a move), the same gate propagates
  // normally — starting there and walking away is exactly what every real solve does.
  const fromGate = buildDistMap(level, [gate]);
  assert.equal(fromGate.get(PACK(2, 0)), 1);
  assert.equal(fromGate.get(PACK(0, 0)), 1);
});

test('buildDistMap treats an unarmed false goal the same way, and allowFalseGoalNeighbors lifts it', () => {
  // Same corridor shape, but with a false goal instead of a gate in the middle. Landing on an
  // unarmed false goal locks the path from moving further ("invalid-false-goal-lock"), so by
  // default it's a sink too: reachable, but not a through-node.
  const fg = PACK(1, 0);
  const level = makeLevel({ grid: { w: 3, h: 1 }, falseGoalKeys: new Set([fg]) });
  const dist = buildDistMap(level, [PACK(2, 0)]);
  assert.equal(dist.get(fg), 1);
  assert.equal(dist.has(PACK(0, 0)), false);

  // Trap search's own prep opts in via allowFalseGoalNeighbors, matching staticNeighborKeys'
  // allowance — with it set, the false goal is a normal passable cell, not a sink.
  const allowed = buildDistMap(level, [PACK(2, 0)], { allowFalseGoalNeighbors: true });
  assert.equal(allowed.get(PACK(0, 0)), 2);
});
