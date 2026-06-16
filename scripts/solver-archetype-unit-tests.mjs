#!/usr/bin/env node
/** Unit tests for SolverV2 archetype/density classification. */
import assert from 'node:assert/strict';
import { createSolverV2 } from '../modules/SolverV2.js';
import { detectArchetype, getNavigableArea, getNavigableDensity } from '../modules/solver/archetype.js';
import { PACK } from '../modules/solver/encoding.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

function makeLevel(overrides = {}) {
  return {
    grid: { w: 10, h: 10 },
    reqLen: 50,
    reqInt: 2,
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustCrossKeys: [],
    portalMap: new Map(),
    ...overrides,
  };
}

test('getNavigableArea excludes blocked, goose, false-goal, and gate cells', () => {
  const level = makeLevel({
    grid: { w: 4, h: 4 },
    gateKeys: [PACK(0, 0), PACK(1, 0)],
    blockSet: new Set([PACK(2, 0)]),
    gooseSet: new Set([PACK(3, 0)]),
    falseGoalKeys: new Set([PACK(0, 1)]),
  });
  assert.equal(getNavigableArea(level), 11);
  assert.equal(getNavigableDensity({ ...level, reqLen: 5 }), 5 / 11);
});

test('detectArchetype preserves priority order for known buckets', () => {
  assert.equal(detectArchetype(makeLevel({ reqLen: 10, reqInt: 1 })), 'near-closure');
  assert.equal(detectArchetype(makeLevel({ reqLen: 60, reqInt: 5 })), 'high-intersection-burden');
  assert.equal(detectArchetype(makeLevel({ reqLen: 40, reqInt: 2, mustCrossKeys: [PACK(1, 1), PACK(2, 2)] })), 'must-cross-heavy');
  assert.equal(detectArchetype(makeLevel({ reqLen: 40, reqInt: 2, portalMap: new Map([[PACK(1, 1), { dest: PACK(2, 2) }], [PACK(2, 2), { dest: PACK(1, 1) }], [PACK(3, 3), { dest: PACK(4, 4) }], [PACK(4, 4), { dest: PACK(3, 3) }]]) })), 'portal-heavy');
  assert.equal(detectArchetype(makeLevel({ reqLen: 40, reqInt: 2 })), 'default');
});

test('SolverV2 exposes extracted archetype detector for compatibility', () => {
  const solver = createSolverV2();
  const level = makeLevel({ reqLen: 10, reqInt: 1 });
  assert.equal(solver._detectArchetype, detectArchetype);
  assert.equal(solver._detectArchetype(level), 'near-closure');
});

if (failed > 0) { console.error(`\nSolver archetype tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nSolver archetype tests: ${passed} passed, ${failed} failed`);
