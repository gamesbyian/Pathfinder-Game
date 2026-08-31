/** Unit tests for Solver solution metrics/checks. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { areMustPassesSatisfied, getRealLengthFromState, isSolutionState } from './solution.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState } from './types.js';


function makeLevel(overrides = {}) {
  return {
    goalKey: PACK(3, 0),
    requiredLength: 3,
    requiredIntersections: 1,
    mustPassKeys: [PACK(1, 0), PACK(2, 0)],
    mustCrossKeys: [PACK(2, 0)],
    ...overrides,
  } as unknown as NormalizedLevel;
}

function makeState(overrides = {}) {
  return {
    path: [PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(3, 0)],
    portalJumps: 0,
    ints: 1,
    mustMask: 0,
    mustCrossMask: 0,
    mpVisitedMask: 0b11,
    ...overrides,
  } as unknown as SolverSearchState;
}

test('getRealLengthFromState subtracts portal jumps from path edge count', () => {
  assert.equal(getRealLengthFromState(makeState()), 3);
  assert.equal(getRealLengthFromState(makeState({ portalJumps: 1 })), 2);
});

test('areMustPassesSatisfied requires every must-pass bit in mpVisitedMask', () => {
  const level = makeLevel();
  assert.equal(areMustPassesSatisfied(makeState({ mpVisitedMask: 0b11 }), level), true);
  assert.equal(areMustPassesSatisfied(makeState({ mpVisitedMask: 0b01 }), level), false);
  assert.equal(areMustPassesSatisfied(makeState({ mpVisitedMask: 0 }), makeLevel({ mustPassKeys: [] })), true);
});

test('isSolutionState accepts exact goal, length, intersection, and objective completion', () => {
  assert.equal(isSolutionState(makeState(), makeLevel()), true);
});

test('isSolutionState rejects mismatched terminal state', () => {
  const level = makeLevel();
  assert.equal(isSolutionState(makeState({ path: [PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(2, 1)] }), level), false);
  assert.equal(isSolutionState(makeState({ portalJumps: 1 }), level), false);
  assert.equal(isSolutionState(makeState({ ints: 0 }), level), false);
  assert.equal(isSolutionState(makeState({ mustMask: 1 }), level), false);
  assert.equal(isSolutionState(makeState({ mustCrossMask: 1 }), level), false);
  assert.equal(isSolutionState(makeState({ mpVisitedMask: 0b01 }), level), false);
});
