/** Unit tests for Solver raw-level normalization. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver, SOLVER_TESTING_API } from '../solver.js';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';


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

test('normalizeRawLevel converts 1-indexed raw coordinates to packed solver keys', () => {
  const level = normalizeRawLevel(rawLevel, 7);
  assert.equal(level.id, 6);
  assert.equal(level.level, 7);
  assert.deepEqual(level.grid, { w: 6, h: 5 });
  assert.equal(level.requiredLength, 9);
  assert.equal(level.requiredIntersections, 1);
  assert.equal(level.goalKey, PACK(5, 4));
  assert.deepEqual(level.gateKeys, [PACK(0, 0), PACK(1, 0)]);
  assert.equal(level.blockSet.has(PACK(2, 1)), true);
  assert.deepEqual(level.mustPassKeys, [PACK(3, 1)]);
  assert.deepEqual(level.mustCrossKeys, [PACK(4, 1)]);
  assert.equal(level.falseGoalKeys.has(PACK(5, 0)), true);
  assert.equal(level.gooseSet.has(PACK(0, 4)), true);
});

test('normalizeRawLevel builds bidirectional portal and axis maps', () => {
  const level = normalizeRawLevel(rawLevel);
  const portalA = PACK(0, 1);
  const portalB = PACK(5, 3);
  assert.deepEqual(level.portalMap.get(portalA), { dest: portalB, color: '#123456' });
  assert.deepEqual(level.portalMap.get(portalB), { dest: portalA, color: '#123456' });
  assert.equal(level.filterMap.get(PACK(1, 2)), 2);
  assert.equal(level.filterMap.get(PACK(2, 2)), 1, 'unexpected axes normalize to horizontal');
  assert.equal(level.flippingFilterMap.get(PACK(3, 2)), 2);
  assert.equal(level.flippingFilterMap.get(PACK(4, 2)), 1);
});

test('Solver prepareLevelForSolver delegates raw levels to extracted normalization', () => {
  const solver = createSolver();
  const viaPublicApi = solver.prepareLevelForSolver(rawLevel, { source: 'raw', levelNumber: 11 });
  const viaModule = normalizeRawLevel(rawLevel, 11);
  assert.deepEqual(viaPublicApi, viaModule);
  assert.equal(SOLVER_TESTING_API.normalizeRawLevel, normalizeRawLevel);
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
    { x: 3, y: 5, objectType: 'library',  role: 'mustTurnCcw' },
    { x: 6, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
    { x: 5, y: 6, objectType: 'lamppost', role: 'adjacentTurnCcw' },
    { x: 2, y: 6, objectType: 'market',   role: 'mustPass' },
    { x: 7, y: 3, objectType: 'statue',   role: 'decorative' },
  ],
};

test('normalizeRawLevel adds surround landmark to blockSet and surroundKeys', () => {
  const level = normalizeRawLevel(rawWithLandmarks);
  const sk = PACK(3, 3);  // (4,4) 1-indexed → (3,3) 0-indexed
  assert.ok(level.surroundKeys!.includes(sk), 'surround key present in surroundKeys');
  assert.ok(level.blockSet.has(sk), 'surround landmark added to blockSet');
  assert.deepEqual(level.landmarkMeta!.get(sk), { objectType: 'park', role: 'surround' });
});

test('normalizeRawLevel adds mustTurn landmarks to mustPassKeys and mustPassTurnDirs', () => {
  const level = normalizeRawLevel(rawWithLandmarks);
  const eitherKey = PACK(1, 2);  // (2,3) 1-indexed → (1,2) 0-indexed
  const ccwKey    = PACK(2, 4);  // (3,5) 1-indexed → (2,4) 0-indexed
  assert.ok(level.mustPassKeys.includes(eitherKey), 'mustTurn(either) in mustPassKeys');
  assert.ok(level.mustPassKeys.includes(ccwKey),    'mustTurnCcw in mustPassKeys');
  assert.equal(level.mustPassTurnDirs!.get(eitherKey), 'either');
  assert.equal(level.mustPassTurnDirs!.get(ccwKey),    'ccw');
  assert.ok(!level.blockSet.has(eitherKey), 'mustTurn cell is passable (not in blockSet)');
});

test('normalizeRawLevel adds adjacentTurn landmarks to adjacentTurnKeys and blockSet', () => {
  const level = normalizeRawLevel(rawWithLandmarks);
  const cwKey  = PACK(5, 1);  // (6,2) 1-indexed → (5,1) 0-indexed
  const ccwKey = PACK(4, 5);  // (5,6) 1-indexed → (4,5) 0-indexed
  assert.ok(level.adjacentTurnKeys!.includes(cwKey),  'adjacentTurn(cw) key present');
  assert.ok(level.adjacentTurnKeys!.includes(ccwKey), 'adjacentTurnCcw key present');
  const cwIdx  = level.adjacentTurnKeys!.indexOf(cwKey);
  const ccwIdx = level.adjacentTurnKeys!.indexOf(ccwKey);
  assert.equal(level.adjacentTurnDirs![cwIdx],  'cw');
  assert.equal(level.adjacentTurnDirs![ccwIdx], 'ccw');
  assert.ok(level.blockSet.has(cwKey),  'adjacentTurn landmark is impassable');
  assert.ok(level.blockSet.has(ccwKey), 'adjacentTurnCcw landmark is impassable');
});

test('normalizeRawLevel handles mustPass landmark role and decorative landmark', () => {
  const level = normalizeRawLevel(rawWithLandmarks);
  const mpKey  = PACK(1, 5);  // (2,6) 1-indexed → (1,5) 0-indexed
  const decKey = PACK(6, 2);  // (7,3) 1-indexed → (6,2) 0-indexed
  assert.ok(level.mustPassKeys.includes(mpKey), 'mustPass landmark in mustPassKeys');
  assert.ok(level.blockSet.has(decKey), 'decorative landmark is impassable');
  assert.ok(!level.mustPassKeys.includes(decKey), 'decorative not in mustPassKeys');
});

test('normalizeRawLevel levels without landmarks return empty landmark arrays', () => {
  const level = normalizeRawLevel(rawLevel);
  assert.deepEqual(level.surroundKeys!, []);
  assert.deepEqual(level.adjacentTurnKeys!, []);
  assert.deepEqual(level.adjacentTurnDirs!, []);
  assert.equal(level.mustPassTurnDirs!.size, 0);
  assert.equal(level.landmarkMeta!.size, 0);
});
