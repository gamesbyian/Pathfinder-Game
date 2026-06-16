#!/usr/bin/env node
/** Unit tests for SolverV2 raw-level normalization. */
import assert from 'node:assert/strict';
import { createSolverV2 } from '../modules/SolverV2.js';
import { PACK } from '../modules/solver/encoding.js';
import { normalizeRawLevelV2 } from '../modules/solver/normalization.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

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
  assert.equal(solver._normalizeRawLevel, normalizeRawLevelV2);
});

if (failed > 0) { console.error(`\nSolver normalization tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nSolver normalization tests: ${passed} passed, ${failed} failed`);
