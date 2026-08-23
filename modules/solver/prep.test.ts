/** Unit tests for Solver level precomputation. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SOLVER_TESTING_API } from '../solver.js';
import {AXIS_H, AXIS_V, PACK } from './encoding.js';
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
  // Index arrays store i+1 so that 0 means "absent" and prepLevel can skip a per-array fill;
  // every read site subtracts 1, which maps 0 back to the historical -1. See prep.ts.
  assert.equal(prep.mustPassIndex[PACK(2, 1)] - 1, 0);
  assert.equal(prep.mustPassIndex[PACK(0, 0)] - 1, -1, 'a non-must-pass cell still reads as -1');
  assert.equal(prep.mustCrossIndex[PACK(2, 2)] - 1, 0);
  assert.deepEqual(prep.objectiveKeys, [PACK(2, 1), PACK(2, 2)]);
  // Distance arrays are dense (gridW * gridH), not KEY_SPACE-sized — a 15x15 level's maps are 225
  // entries instead of 1,048,576, and a level builds 11+ of them. See distance.ts's denseIndex.
  assert.equal(prep.goalDistArr.length, level.grid.w * level.grid.h);
  assert.equal(prep.gridW, level.grid.w, 'gridW is the stride every dense read needs');
  assert.equal(getDistanceFromArray(prep.goalDistArr, level.goalKey, prep.gridW), 0);
  assert.equal(getDistanceFromArray(prep.mpDistArrs[0], PACK(2, 1), prep.gridW), 0);
  assert.equal(getDistanceFromArray(prep.mcDistArrs[0], PACK(2, 2), prep.gridW), 0);
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
  assert.equal(getDistanceFromArray(prep.mcApproachDistMaps![0].v, PACK(2, 1), prep.gridW), 0);
  assert.equal(prep.flipperIndexMap[flipper] - 1, 0);
  assert.equal(prep.flipperInitAxes[0], AXIS_H);
  assert.equal(prep.flipperApproachEven.length, 1);
  assert.equal(prep.flipperApproachOdd.length, 1);
});

// A flipping filter must be crossed straight through, so crossing it needs BOTH neighbours on one
// axis. The test is deliberately ORIENTATION-BLIND: a flipper flips between H and V, and other
// flippers' usage can change its parity, so "dead" may only ever mean "neither axis is
// geometrically available" — never "its current axis is unavailable". See prep.ts.
test('prepLevel marks only flippers with neither axis traversable as dead', () => {
  const corner = PACK(0, 0);            // both axes run off the grid edge
  const edge = PACK(2, 0);              // vertical blocked by the edge, horizontal is open
  const boxed = PACK(2, 2);             // blocks close off both axes
  const open = PACK(4, 2);              // hemmed vertically only; horizontal pair is open
  const level = makeLevel({
    grid: { w: 7, h: 7 },
    goalKey: PACK(6, 6),
    gateKeys: [PACK(0, 6)],
    mustPassKeys: [], mustCrossKeys: [],
    blockSet: new Set([PACK(1, 2), PACK(3, 2), PACK(2, 1), PACK(2, 3)]),
    flippingFilterMap: new Map([[corner, AXIS_H], [edge, AXIS_H], [boxed, AXIS_V], [open, AXIS_V]]),
  });
  const prep = prepLevel(level);
  assert.equal(prep.deadFlipperKeys.has(corner), true, 'a corner flipper can be entered but never left');
  assert.equal(prep.deadFlipperKeys.has(boxed), true, 'blocks on all four sides kill both axes');
  assert.equal(prep.deadFlipperKeys.has(edge), false, 'one dead axis is not enough — it may flip to the open one');
  assert.equal(prep.deadFlipperKeys.has(open), false, 'an open horizontal pair keeps it alive');
  // Dead cells are impassable for the connectivity BFS...
  assert.equal(prep.reachBlockedArr[corner], 1);
  assert.equal(prep.reachBlockedArr[boxed], 1);
  assert.equal(prep.reachBlockedArr[edge], 0);
  // ...but deliberately still reachable in move generation: excluding them there was measured
  // net-negative (see prep.ts). Slot 1 is "left", so PACK(1,0)'s left neighbour is the dead corner.
  // staticNeighborKeys is dense-indexed via cellDenseIndex, not directly by packed key.
  assert.equal(prep.staticNeighborKeys[(prep.cellDenseIndex[PACK(1, 0)] - 1) * 4 + 1], corner + 1,
    'dead flippers stay in staticNeighborKeys');
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
  // staticNeighborKeys is dense-indexed via cellDenseIndex, not directly by packed key.
  const base = (prep.cellDenseIndex[center] - 1) * 4;
  // Entries are the neighbour key PLUS ONE, with 0 meaning "no neighbour" — the +1 bias is what
  // lets prepLevel skip a fill(-1) per level (see prep.ts / distance.ts).
  assert.equal(prep.staticNeighborKeys[base + 0], 0); // right: blocked
  assert.equal(prep.staticNeighborKeys[base + 1], 0); // left (0,1): a gate cell
  assert.equal(prep.staticNeighborKeys[base + 2], down + 1); // down: filter axis matches on both ends
  assert.equal(prep.staticNeighborKeys[base + 3], up + 1); // up: filter axis matches, target unfiltered
});

test('SOLVER_TESTING_API exposes the extracted prepLevel', () => {
  assert.equal(SOLVER_TESTING_API.prepLevel, prepLevel);
});

// gateForcedFirstStepKey (reports/2026-07-31-mustcross-forced-structure.md's step 3): a gate can
// never be re-entered, so if it is orthogonally adjacent to EXACTLY ONE must-cross cell, the very
// first move out of it is forced onto that cell — falsified against every stored solution
// (0 violations across all three corpora as of this writing).
test('gateForcedFirstStepKey forces the move when a gate has exactly one must-cross neighbor', () => {
  const level = makeLevel({
    gateKeys: [PACK(0, 0)],
    mustCrossKeys: [PACK(1, 0)], // east of the gate
  });
  const prep = prepLevel(level);
  assert.equal(prep.gateForcedFirstStepKey.get(PACK(0, 0)), PACK(1, 0));
});

test('gateForcedFirstStepKey has no entry when the gate has no must-cross neighbor', () => {
  const level = makeLevel({
    gateKeys: [PACK(0, 0)],
    mustCrossKeys: [PACK(2, 2)], // not adjacent to the gate
  });
  const prep = prepLevel(level);
  assert.equal(prep.gateForcedFirstStepKey.has(PACK(0, 0)), false);
});

test('gateForcedFirstStepKey deliberately leaves a gate unforced when it has TWO must-cross neighbors', () => {
  const level = makeLevel({
    gateKeys: [PACK(1, 1)], // interior cell — has all 4 orthogonal neighbors
    mustCrossKeys: [PACK(2, 1), PACK(1, 2)], // east AND south both must-cross
  });
  const prep = prepLevel(level);
  assert.equal(prep.gateForcedFirstStepKey.has(PACK(1, 1)), false,
    'ambiguous which neighbor wins the one available first move — not determined by this rule alone');
});
