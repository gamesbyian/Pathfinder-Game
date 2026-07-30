/** Unit tests for Solver level precomputation. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SOLVER_TESTING_API } from '../Solver.js';
import { AXIS_H, AXIS_V, KEY_SPACE, PACK } from './encoding.js';
import { getDistanceFromArray } from './distance.js';
import { prepLevel } from './prep.js';
import type { NormalizedLevel } from '../domain/types.js';


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
  } as unknown as NormalizedLevel;
}

test('prepLevel builds index maps, distance mirrors, and objective lists', () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  assert.equal(prep.mustPassIndex[PACK(2, 1)], 0);
  assert.equal(prep.mustCrossIndex[PACK(2, 2)], 0);
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
  assert.equal(prep.mcApproachDistMaps!.length, 1);
  assert.equal(getDistanceFromArray(prep.mcApproachDistMaps![0].v, PACK(2, 1)), 0);
  assert.equal(prep.flipperIndexMap[flipper], 0);
  assert.equal(prep.flipperInitAxes[0], AXIS_H);
  assert.equal(prep.flipperApproachEven.length, 1);
  assert.equal(prep.flipperApproachOdd.length, 1);
});

test('prepLevel static neighbors respect blocks, gates, and filter axes', () => {
  const center = PACK(1, 1);
  const right = PACK(2, 1);
  const down = PACK(1, 2);
  const up = PACK(1, 0);
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
  // Fixed direction order (encoding.ts's NEIGHBOR_DX/DY): 0=right, 1=left, 2=down, 3=up.
  const base = center * 4;
  // Entries are the neighbour key PLUS ONE, with 0 meaning "no neighbour" — the +1 bias is what
  // lets prepLevel skip a 4.2M-entry fill(-1) per level (see prep.ts / distance.ts).
  assert.equal(prep.staticNeighborKeys[base + 0], 0); // right: blocked
  assert.equal(prep.staticNeighborKeys[base + 1], 0); // left (0,1): a gate cell
  assert.equal(prep.staticNeighborKeys[base + 2], down + 1); // down: filter axis matches on both ends
  assert.equal(prep.staticNeighborKeys[base + 3], up + 1); // up: filter axis matches, target unfiltered
});

test('SOLVER_TESTING_API exposes the extracted prepLevel', () => {
  assert.equal(SOLVER_TESTING_API.prepLevel, prepLevel);
});
