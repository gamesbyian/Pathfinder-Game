#!/usr/bin/env node
/** Unit tests for SolverV2 topology, trap-search, and DFS/beam search loops. */
import assert from 'node:assert/strict';
import { PACK } from '../modules/solver/encoding.js';
import { POLICY_PROFILES } from '../modules/solver/policy.js';
import { prepLevel } from '../modules/solver/prep.js';
import { beamSearchFromGate, dfsFromGateLDS } from '../modules/solver/search.js';
import { createState } from '../modules/solver/search-state.js';
import { findTrapSpotsV2 } from '../modules/solver/trap-search.js';
import { isConnected } from '../modules/solver/topology.js';

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

function makeLevel(overrides = {}) {
  return {
    grid: { w: 3, h: 1 },
    reqLen: 2,
    reqInt: 0,
    goalKey: PACK(2, 0),
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
    ...overrides,
  };
}

await test('isConnected reports reachable goal and blocks disconnected regions', () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  assert.equal(isConnected(PACK(0, 0), createState(PACK(0, 0), level, prep), level, prep), true);

  const blocked = makeLevel({ blockSet: new Set([PACK(1, 0)]) });
  const blockedPrep = prepLevel(blocked);
  assert.equal(isConnected(PACK(0, 0), createState(PACK(0, 0), blocked, blockedPrep), blocked, blockedPrep), false);
});

await test('dfsFromGateLDS solves a simple line level through the extracted search module', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await dfsFromGateLDS(PACK(0, 0), level, prep, POLICY_PROFILES.default, 1000, Date.now(), null, null);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

await test('beamSearchFromGate solves a simple line level through the extracted search module', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await beamSearchFromGate(PACK(0, 0), level, prep, POLICY_PROFILES.default, 1000, Date.now(), null, 8, null, false);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

await test('findTrapSpotsV2 returns valid one-step false-goal cells', async () => {
  const level = makeLevel({ reqLen: 1 });
  const result = await findTrapSpotsV2(level, { timeLimit: 1000 });
  assert.equal(result.ok, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.spots.has(PACK(1, 0)), true);
  assert.equal(result.spots.has(PACK(2, 0)), false, 'the real goal is not a valid false-goal spot');
});

if (failed > 0) { console.error(`\nSolver search tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nSolver search tests: ${passed} passed, ${failed} failed`);
