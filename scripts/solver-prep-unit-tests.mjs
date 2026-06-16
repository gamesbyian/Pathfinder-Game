#!/usr/bin/env node
/** Unit tests for SolverV2 level precomputation. */
import assert from 'node:assert/strict';
import { createSolverV2 } from '../modules/SolverV2.js';
import { AXIS_H, AXIS_V, KEY_SPACE, PACK } from '../modules/solver/encoding.js';
import { getDistanceFromArray } from '../modules/solver/distance.js';
import { prepLevel } from '../modules/solver/prep.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

function makeLevel(overrides = {}) {
  return {
    grid: { w: 5, h: 5 },
    reqLen: 8,
    reqInt: 1,
    goalKey: PACK(4, 4),
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [PACK(2, 1)],
    mustCrossKeys: [PACK(2, 2)],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
    ...overrides,
  };
}

test('prepLevel builds index maps, distance mirrors, and objective lists', () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  assert.equal(prep.mustPassIndex.get(PACK(2, 1)), 0);
  assert.equal(prep.mustCrossIndex.get(PACK(2, 2)), 0);
  assert.deepEqual(prep.objectiveKeys, [PACK(2, 1), PACK(2, 2)]);
  assert.equal(prep.goalDistArr.length, KEY_SPACE);
  assert.equal(getDistanceFromArray(prep.goalDistArr, level.goalKey), 0);
  assert.equal(getDistanceFromArray(prep.mpDistArrs[0], PACK(2, 1)), 0);
  assert.equal(getDistanceFromArray(prep.mcDistArrs[0], PACK(2, 2)), 0);
});

test('prepLevel prepares masks and dense-level must-pass scoring behavior', () => {
  const sparse = prepLevel(makeLevel({ reqLen: 8 }));
  assert.equal(sparse.initialMustMask, 1);
  assert.equal(sparse.initialMustCrossMask, 1);
  assert.equal(sparse.mustMaskForDFS, 1);

  const dense = prepLevel(makeLevel({ reqLen: 20 }));
  assert.equal(dense.initialMustMask, 1);
  assert.equal(dense.mustMaskForDFS, 0);
});

test('prepLevel builds approach maps for must-cross and flipping filters', () => {
  const flipper = PACK(3, 2);
  const level = makeLevel({ flippingFilterMap: new Map([[flipper, AXIS_H]]) });
  const prep = prepLevel(level);
  assert.equal(prep.mcApproachDistMaps.length, 1);
  assert.equal(prep.mcApproachDistMaps[0].v.get(PACK(2, 1)), 0);
  assert.equal(prep.flipperIndexMap.get(flipper), 0);
  assert.equal(prep.flipperInitAxes[0], AXIS_H);
  assert.equal(prep.flipperApproachEven.length, 1);
  assert.equal(prep.flipperApproachOdd.length, 1);
});

test('prepLevel static neighbors respect blocks, gates, and filter axes', () => {
  const center = PACK(1, 1);
  const right = PACK(2, 1);
  const down = PACK(1, 2);
  const level = makeLevel({
    grid: { w: 4, h: 4 },
    goalKey: PACK(3, 3),
    gateKeys: [PACK(0, 0), PACK(0, 1)],
    blockSet: new Set([right]),
    filterMap: new Map([[center, AXIS_V], [down, AXIS_V]]),
    mustPassKeys: [],
    mustCrossKeys: [],
  });
  const prep = prepLevel(level);
  const pairs = Array.from(prep.staticNeighbors.get(center));
  assert.deepEqual(pairs, [down, AXIS_V, PACK(1, 0), AXIS_V]);
});

test('SolverV2 exposes extracted prepLevel for compatibility', () => {
  const solver = createSolverV2();
  assert.equal(solver._prepLevel, prepLevel);
});

if (failed > 0) { console.error(`\nSolver prep tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nSolver prep tests: ${passed} passed, ${failed} failed`);
