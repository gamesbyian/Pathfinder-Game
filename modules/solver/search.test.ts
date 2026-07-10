/** Unit tests for Solver topology, trap-search, and DFS/beam search loops. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { beamSearchFromGate, dfsFromGateLDS, getLdsProbeNodeBudget } from './search.js';
import { createState } from './search-state.js';
import { findTrapSpots, classifyFalseGoals, isParityReachableEndpoint } from './trap-search.js';
import { isConnected } from './topology.js';
import type { NormalizedLevel } from '../domain/types.js';

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
  } as unknown as NormalizedLevel;
}

test('isConnected reports reachable goal and blocks disconnected regions', () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  assert.equal(isConnected(PACK(0, 0), createState(PACK(0, 0), level, prep), level, prep), true);

  const blocked = makeLevel({ blockSet: new Set([PACK(1, 0)]) });
  const blockedPrep = prepLevel(blocked);
  assert.equal(isConnected(PACK(0, 0), createState(PACK(0, 0), blocked, blockedPrep), blocked, blockedPrep), false);
});

test('dfsFromGateLDS solves a simple line level through the extracted search module', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await dfsFromGateLDS(PACK(0, 0), level, prep, POLICY_PROFILES.default, 1000, Date.now(), null, null);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('getLdsProbeNodeBudget scales with area/reqLen/special within bounds', () => {
  const tiny = getLdsProbeNodeBudget({ ...makeLevel(), grid: { w: 1, h: 1 }, reqLen: 0 });
  assert.equal(tiny, 30000);

  const large = makeLevel();
  large.grid = { w: 100, h: 100 };
  large.reqLen = 5000;
  large.mustPassKeys = [PACK(1, 0), PACK(2, 0)];
  large.portalMap = new Map([[PACK(0, 0), { dest: PACK(1, 0) }]]);
  const capped = getLdsProbeNodeBudget(large);
  assert.equal(capped, 4000000);

  const midA = getLdsProbeNodeBudget({ ...makeLevel(), grid: { w: 10, h: 10 }, reqLen: 20 });
  const midB = getLdsProbeNodeBudget({ ...makeLevel(), grid: { w: 20, h: 20 }, reqLen: 20 });
  assert.ok(midB > midA, `expected larger area to grow the budget: ${midB} > ${midA}`);
});

test('beamSearchFromGate solves a simple line level through the extracted search module', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await beamSearchFromGate(PACK(0, 0), level, prep, POLICY_PROFILES.default, 1000, Date.now(), null, 8, null, false);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('findTrapSpots returns valid one-step false-goal cells', async () => {
  const level = makeLevel({ reqLen: 1 });
  const result = await findTrapSpots(level, { timeLimit: 1000 });
  assert.equal(result.ok, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.spots.has(PACK(1, 0)), true);
  assert.equal(result.spots.has(PACK(2, 0)), false, 'the real goal is not a valid false-goal spot');
});


test('findTrapSpots highlights an already-placed false goal when it is a valid endpoint', async () => {
  const falseGoal = PACK(1, 0);
  const level = makeLevel({ reqLen: 1, falseGoalKeys: new Set([falseGoal]) });
  const result = await findTrapSpots(level, { timeLimit: 1000 });
  assert.equal(result.ok, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.spots.has(falseGoal), true);
});

test('findTrapSpots does not route through existing false goals before the endpoint', async () => {
  const falseGoal = PACK(1, 0);
  const beyondFalseGoal = PACK(2, 0);
  const level = makeLevel({
    grid: { w: 4, h: 1 },
    reqLen: 2,
    goalKey: PACK(3, 0),
    falseGoalKeys: new Set([falseGoal]),
  });
  const result = await findTrapSpots(level, { timeLimit: 1000 });
  assert.equal(result.ok, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.spots.has(beyondFalseGoal), false);
});

test('findTrapSpots attempts every gate (per-gate budget, no break on a slow gate)', async () => {
  // Two gates; with even a tiny per-gate slice both are reached and fully enumerated.
  const level = makeLevel({ grid: { w: 5, h: 1 }, reqLen: 2, goalKey: PACK(2, 0), gateKeys: [PACK(0, 0), PACK(4, 0)] });
  const result = await findTrapSpots(level, { timeLimit: 1000 });
  assert.equal(result.totalGates, 2);
  assert.equal(result.gatesProcessed, 2);
  assert.equal(result.gatesCompleted, 2);
  assert.equal(result.timedOut, false);
});

test('findTrapSpots emits per-gate progress', async () => {
  const level = makeLevel({ grid: { w: 5, h: 1 }, reqLen: 2, goalKey: PACK(2, 0), gateKeys: [PACK(0, 0), PACK(4, 0)] });
  const progress: any[] = [];
  await findTrapSpots(level, { timeLimit: 1000, onProgress: (p: any) => { progress.push(p); } });
  assert.equal(progress.length, 2);
  assert.equal(progress[1].gatesProcessed, 2);
  assert.equal(progress[1].totalGates, 2);
});

test('isParityReachableEndpoint rules out wrong-parity cells on portal-free levels', () => {
  // gate (0,0) parity 0, reqLen 1 (odd) => endpoints must have parity 1.
  const level = makeLevel({ grid: { w: 5, h: 1 }, reqLen: 1, goalKey: PACK(4, 0), gateKeys: [PACK(0, 0)] });
  assert.equal(isParityReachableEndpoint(level, PACK(1, 0)), true);  // parity 1 — possible
  assert.equal(isParityReachableEndpoint(level, PACK(2, 0)), false); // parity 0 — impossible
});

test('isParityReachableEndpoint is conservative (returns true) for a parity-flipping portal', () => {
  // Portal connects opposite-parity cells (1,0)↔(2,0) — a jump can flip end parity.
  const level = makeLevel({ grid: { w: 5, h: 1 }, reqLen: 1, goalKey: PACK(4, 0), portalMap: new Map([[PACK(1, 0), { dest: PACK(2, 0) }]]) });
  assert.equal(isParityReachableEndpoint(level, PACK(2, 0)), true);
});

test('isParityReachableEndpoint still rules cells out when all portals are parity-preserving', () => {
  // Portal connects same-parity cells (1,0)↔(3,0) — cannot change end parity.
  const level = makeLevel({ grid: { w: 7, h: 1 }, reqLen: 1, goalKey: PACK(6, 0), portalMap: new Map([[PACK(1, 0), { dest: PACK(3, 0) }]]) });
  assert.equal(isParityReachableEndpoint(level, PACK(2, 0)), false); // wrong parity, ruled out despite the portal
  assert.equal(isParityReachableEndpoint(level, PACK(5, 0)), true);  // correct parity
});

test('classifyFalseGoals: reachable, parity-dead, and distance-dead false goals', async () => {
  const reachableFG = PACK(1, 0);   // parity 1, reachable in 1 step
  const parityDeadFG = PACK(2, 0);  // parity 0 — wrong parity, never an endpoint
  const distanceDeadFG = PACK(3, 0); // parity 1 but unreachable in exactly 1 step
  const level = makeLevel({
    grid: { w: 5, h: 1 }, reqLen: 1, goalKey: PACK(4, 0),
    falseGoalKeys: new Set([reachableFG, parityDeadFG, distanceDeadFG]),
  });
  const result = await findTrapSpots(level, { timeLimit: 1000 });
  assert.equal(result.timedOut, false, 'search completes');
  const classes = classifyFalseGoals(level, result);
  assert.equal(classes.get(reachableFG), 'reachable');
  assert.equal(classes.get(parityDeadFG), 'unreachable');
  assert.equal(classes.get(distanceDeadFG), 'unreachable');
});

test('classifyFalseGoals: a parity-compatible miss is "unknown" when the search is incomplete', () => {
  const fg = PACK(3, 0); // parity 1 — parity-compatible, so parity can't rule it out
  const level = makeLevel({ grid: { w: 5, h: 1 }, reqLen: 1, goalKey: PACK(4, 0), falseGoalKeys: new Set([fg]) });
  // Simulate a partial sweep: not all gates completed, spot not found.
  const partial = { spots: new Set<number>(), timedOut: true, gatesCompleted: 0, totalGates: 1 };
  assert.equal(classifyFalseGoals(level, partial).get(fg), 'unknown');
});
