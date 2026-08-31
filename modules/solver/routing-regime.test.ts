/** Unit tests for Solver routing-regime / required-path-coverage classification. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SOLVER_TESTING_API } from '../solver.js';
import {
  classifyRoutingRegime,
  getNonGateWinningPathCellCount,
  getRequiredPathCoverageRatio,
  normalizeRoutingRegime,
} from './routing-regime.js';
import { PACK } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';

function makeLevel(overrides = {}) {
  return {
    grid: { w: 10, h: 10 },
    requiredLength: 50,
    requiredIntersections: 2,
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustCrossKeys: [],
    portalMap: new Map(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

test('getNonGateWinningPathCellCount preserves the historical denominator exactly', () => {
  const level = makeLevel({
    grid: { w: 4, h: 4 },
    gateKeys: [PACK(0, 0), PACK(1, 0)],
    blockSet: new Set([PACK(2, 0)]),
    gooseSet: new Set([PACK(3, 0)]),
    falseGoalKeys: new Set([PACK(0, 1)]),
  });
  assert.equal(getNonGateWinningPathCellCount(level), 11);
  assert.equal(getRequiredPathCoverageRatio({ ...level, requiredLength: 5 }), 5 / 11);
});

test('classifyRoutingRegime preserves the historical first-match routing buckets', () => {
  assert.equal(classifyRoutingRegime(makeLevel({ requiredLength: 10, requiredIntersections: 1 })), 'sparse-low-intersection');
  assert.equal(classifyRoutingRegime(makeLevel({ requiredLength: 60, requiredIntersections: 5 })), 'intersection-heavy');
  assert.equal(classifyRoutingRegime(makeLevel({
    requiredLength: 40, requiredIntersections: 2, mustCrossKeys: [PACK(1, 1), PACK(2, 2)],
  })), 'must-cross-heavy');
  assert.equal(classifyRoutingRegime(makeLevel({
    requiredLength: 40, requiredIntersections: 2,
    portalMap: new Map([
      [PACK(1, 1), { dest: PACK(2, 2) }],
      [PACK(2, 2), { dest: PACK(1, 1) }],
      [PACK(3, 3), { dest: PACK(4, 4) }],
      [PACK(4, 4), { dest: PACK(3, 3) }],
    ]),
  })), 'multi-portal');
  assert.equal(classifyRoutingRegime(makeLevel({ requiredLength: 40, requiredIntersections: 2 })), 'general');
});

test('normalizeRoutingRegime dual-reads every historical persisted value', () => {
  assert.equal(normalizeRoutingRegime('default'), 'general');
  assert.equal(normalizeRoutingRegime('near-closure'), 'sparse-low-intersection');
  assert.equal(normalizeRoutingRegime('high-intersection-burden'), 'intersection-heavy');
  assert.equal(normalizeRoutingRegime('must-cross-heavy'), 'must-cross-heavy');
  assert.equal(normalizeRoutingRegime('portal-heavy'), 'multi-portal');
  assert.equal(normalizeRoutingRegime('intersection-heavy'), 'intersection-heavy');
  assert.throws(() => normalizeRoutingRegime('not-a-routing-regime'), /Unknown solver routing regime/);
});

test('SOLVER_TESTING_API exposes canonical routing helpers', () => {
  const level = makeLevel({ requiredLength: 10, requiredIntersections: 1 });
  assert.equal(SOLVER_TESTING_API.classifyRoutingRegime, classifyRoutingRegime);
  assert.equal(SOLVER_TESTING_API.classifyRoutingRegime(level), 'sparse-low-intersection');
  assert.equal(SOLVER_TESTING_API.normalizeRoutingRegime('near-closure'), 'sparse-low-intersection');
});
