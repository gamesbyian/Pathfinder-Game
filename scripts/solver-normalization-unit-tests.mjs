#!/usr/bin/env node
/** Unit tests for SolverV2 raw-level normalization. */
import assert from 'node:assert/strict';
import { test, run } from './test-lib/harness.mjs';
import { createSolverV2, SOLVER_TESTING_API } from '../modules/SolverV2.js';
import { PACK } from '../modules/solver/encoding.js';
import { normalizeRawLevelV2 } from '../modules/solver/normalization.js';


const rawLevel = {
  id: 41,
  grid: { w: 6, h: 5 },
  goal: { x: 6, y: 5 },
  gates: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
  reqLen: '9',
  reqInt: '1',
  blocks: [{ x: 3, y: 2 }],
  mustPass: [{ x: 4, y: 2 }],
  mustCross: [{ x: 5, y: 2 }],
  falseGoals: [{ x: 6, y: 1 }],
  geese: [{ x: 1, y: 5 }],
  filters: [{ x: 2, y: 3, axis: 2 }, { x: 3, y: 3, axis: 99 }],
  flippingFilters: [{ x: 4, y: 3, axis: 2 }, { x: 5, y: 3, axis: 1 }],
  portals: [{ x1: 1, y1: 2, x2: 6, y2: 4, color: '#123456' }],
  hints: [[[1, 1], [2, 1]]],
};

test('normalizeRawLevelV2 converts 1-indexed raw coordinates to packed solver keys', () => {
  const level = normalizeRawLevelV2(rawLevel, 7);
  assert.equal(level.id, 6);
  assert.equal(level.level, 7);
  assert.deepEqual(level.grid, { w: 6, h: 5 });
  assert.equal(level.reqLen, 9);
  assert.equal(level.reqInt, 1);
  assert.equal(level.goalKey, PACK(5, 4));
  assert.deepEqual(level.gateKeys, [PACK(0, 0), PACK(1, 0)]);
  assert.equal(level.blockSet.has(PACK(2, 1)), true);
  assert.deepEqual(level.mustPassKeys, [PACK(3, 1)]);
  assert.deepEqual(level.mustCrossKeys, [PACK(4, 1)]);
  assert.equal(level.falseGoalKeys.has(PACK(5, 0)), true);
  assert.equal(level.gooseSet.has(PACK(0, 4)), true);
});

test('normalizeRawLevelV2 builds bidirectional portal and axis maps', () => {
  const level = normalizeRawLevelV2(rawLevel);
  const portalA = PACK(0, 1);
  const portalB = PACK(5, 3);
  assert.deepEqual(level.portalMap.get(portalA), { dest: portalB, color: '#123456' });
  assert.deepEqual(level.portalMap.get(portalB), { dest: portalA, color: '#123456' });
  assert.equal(level.filterMap.get(PACK(1, 2)), 2);
  assert.equal(level.filterMap.get(PACK(2, 2)), 1, 'unexpected axes normalize to horizontal');
  assert.equal(level.flippingFilterMap.get(PACK(3, 2)), 2);
  assert.equal(level.flippingFilterMap.get(PACK(4, 2)), 1);
});

test('SolverV2 prepareLevelForSolver delegates raw levels to extracted normalization', () => {
  const solver = createSolverV2();
  const viaPublicApi = solver.prepareLevelForSolver(rawLevel, { source: 'raw', levelNumber: 11 });
  const viaModule = normalizeRawLevelV2(rawLevel, 11);
  assert.deepEqual(viaPublicApi, viaModule);
  assert.equal(SOLVER_TESTING_API.normalizeRawLevel, normalizeRawLevelV2);
});

const rawWithLandmarks = {
  grid: { w: 7, h: 7 },
  goal: { x: 7, y: 7 },
  gates: [{ x: 1, y: 1 }],
  reqLen: 20,
  reqInt: 0,
  landmarks: [
    { x: 4, y: 4, objectType: 'park',     role: 'surround' },
    { x: 2, y: 3, objectType: 'library',  role: 'mustTurn',  turn: 'either' },
    { x: 3, y: 5, objectType: 'library',  role: 'mustTurnLeft' },
    { x: 6, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'right' },
    { x: 5, y: 6, objectType: 'lamppost', role: 'adjacentTurnLeft' },
    { x: 2, y: 6, objectType: 'market',   role: 'mustPass' },
    { x: 7, y: 3, objectType: 'statue',   role: 'decorative' },
  ],
};

test('normalizeRawLevelV2 adds surround landmark to blockSet and surroundKeys', () => {
  const level = normalizeRawLevelV2(rawWithLandmarks);
  const sk = PACK(3, 3);  // (4,4) 1-indexed → (3,3) 0-indexed
  assert.ok(level.surroundKeys.includes(sk), 'surround key present in surroundKeys');
  assert.ok(level.blockSet.has(sk), 'surround landmark added to blockSet');
  assert.deepEqual(level.landmarkMeta.get(sk), { objectType: 'park', role: 'surround' });
});

test('normalizeRawLevelV2 adds mustTurn landmarks to mustPassKeys and mustPassTurnDirs', () => {
  const level = normalizeRawLevelV2(rawWithLandmarks);
  const eitherKey = PACK(1, 2);  // (2,3) 1-indexed → (1,2) 0-indexed
  const leftKey   = PACK(2, 4);  // (3,5) 1-indexed → (2,4) 0-indexed
  assert.ok(level.mustPassKeys.includes(eitherKey), 'mustTurn(either) in mustPassKeys');
  assert.ok(level.mustPassKeys.includes(leftKey),   'mustTurnLeft in mustPassKeys');
  assert.equal(level.mustPassTurnDirs.get(eitherKey), 'either');
  assert.equal(level.mustPassTurnDirs.get(leftKey),   'left');
  assert.ok(!level.blockSet.has(eitherKey), 'mustTurn cell is passable (not in blockSet)');
});

test('normalizeRawLevelV2 adds adjacentTurn landmarks to adjacentTurnKeys and blockSet', () => {
  const level = normalizeRawLevelV2(rawWithLandmarks);
  const rightKey = PACK(5, 1);  // (6,2) 1-indexed → (5,1) 0-indexed
  const leftKey  = PACK(4, 5);  // (5,6) 1-indexed → (4,5) 0-indexed
  assert.ok(level.adjacentTurnKeys.includes(rightKey), 'adjacentTurn(right) key present');
  assert.ok(level.adjacentTurnKeys.includes(leftKey),  'adjacentTurnLeft key present');
  const rightIdx = level.adjacentTurnKeys.indexOf(rightKey);
  const leftIdx  = level.adjacentTurnKeys.indexOf(leftKey);
  assert.equal(level.adjacentTurnDirs[rightIdx], 'right');
  assert.equal(level.adjacentTurnDirs[leftIdx],  'left');
  assert.ok(level.blockSet.has(rightKey), 'adjacentTurn landmark is impassable');
  assert.ok(level.blockSet.has(leftKey),  'adjacentTurnLeft landmark is impassable');
});

test('normalizeRawLevelV2 handles mustPass landmark role and decorative landmark', () => {
  const level = normalizeRawLevelV2(rawWithLandmarks);
  const mpKey  = PACK(1, 5);  // (2,6) 1-indexed → (1,5) 0-indexed
  const decKey = PACK(6, 2);  // (7,3) 1-indexed → (6,2) 0-indexed
  assert.ok(level.mustPassKeys.includes(mpKey), 'mustPass landmark in mustPassKeys');
  assert.ok(level.blockSet.has(decKey), 'decorative landmark is impassable');
  assert.ok(!level.mustPassKeys.includes(decKey), 'decorative not in mustPassKeys');
});

test('normalizeRawLevelV2 levels without landmarks return empty landmark arrays', () => {
  const level = normalizeRawLevelV2(rawLevel);
  assert.deepEqual(level.surroundKeys, []);
  assert.deepEqual(level.adjacentTurnKeys, []);
  assert.deepEqual(level.adjacentTurnDirs, []);
  assert.equal(level.mustPassTurnDirs.size, 0);
  assert.equal(level.landmarkMeta.size, 0);
});

await run('Solver normalization tests');
