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

// Regression test for the 2026-07-16 nodesExpanded instrumentation gap (reports/
// 2026-07-16-beam-nodesexpanded-instrumentation-gap.md): a timed-out beam attempt used to always
// report nodesExpanded === 0, regardless of how much real work it did, because the metrics
// increment only ever ran on the natural-exhaustion/solved-candidate exit paths, never on any of
// the three timeout exit paths. A large open grid with generous slack (reqLen far above the
// Manhattan distance, so the beam has many non-revisiting directions to wander through and never
// naturally exhausts its frontier) forces multiple real phases before a small budgetMs interrupts
// it. Timing-dependent in principle; calibrated against actual measurements (not guessed) to stay
// robust in practice: cold-process runs of this exact level solve in ~22-25ms, so a 10ms budget
// keeps a >2x margin below that (5/5 cold-start runs at 10ms: always timedOut, 18-30 nodes
// credited, never solved) — a materially bigger margin than an earlier 2ms version that saw an
// occasional 0-credit false negative under full-suite CPU contention (the outer per-phase check
// tripping before phase 1 even completes is itself CORRECT behavior for "no time elapsed yet", not
// a regression, but too easy to hit by accident at 2ms). The assertion only constrains the
// TIMED-OUT case, so an occasional fast solve under lighter load doesn't fail the test, it just
// skips the assertion for that run.
//
// Multi-attempt shape (added when `npm run ci` started running its three phases in parallel,
// which raised contention enough for even the 10ms margin to false-fail occasionally): a single
// timed-out sample can't distinguish the regression (EVERY timed-out attempt reports 0 — the bug
// was 100%-correlated, per the report) from one legitimate "budget expired before phase 1 started"
// stall. So take up to a few timed-out samples and fail only if ALL of them report 0: the real
// bug still fails deterministically on the first pass through, while an isolated stall is
// outvoted by the next timed-out attempt (JIT-warm by then, so it reliably expands real nodes
// inside 10ms). Solved (non-timed-out) attempts skip the assertion exactly as before.
test('beamSearchFromGate credits nodesExpanded even when it times out mid-search', async () => {
  const w = 9, h = 9;
  const level = makeLevel({
    grid: { w, h },
    reqLen: 40, // far above the Manhattan distance (16) from (0,0) to (8,8) -- lots of slack to wander
    goalKey: PACK(8, 8),
    gateKeys: [PACK(0, 0)],
  });
  const prep = prepLevel(level);
  prep._cfg = null;
  let timedOutSamples = 0;
  let sawCreditedTimeout = false;
  for (let attempt = 0; attempt < 10 && timedOutSamples < 3 && !sawCreditedTimeout; attempt++) {
    prep._metrics = { nodesExpanded: 0 };
    const out: { timedOut?: boolean; finalBadness?: number } = {};
    const path = await beamSearchFromGate(PACK(0, 0), level, prep, POLICY_PROFILES.default, 10, Date.now(), null, 40, null, false, out);
    if (!out.timedOut) continue;
    assert.equal(path, null);
    timedOutSamples += 1;
    if (prep._metrics!.nodesExpanded > 0) sawCreditedTimeout = true;
  }
  if (timedOutSamples > 0) {
    assert.ok(sawCreditedTimeout, `expected at least one of ${timedOutSamples} timed-out attempts to credit real search work, got 0 from all of them`);
  }
});

// Regression test for the SUCCESS-path half of the beam nodesExpanded gap (the timeout half is
// covered above). Beam credited only the CURRENT phase's frontierIndex and reset it each phase, so a
// multi-phase solve that finished early in its last phase reported a near-zero node count despite
// seconds of real work (observed on corpus level R02052: a 7.5 s beam solve recorded nodesExpanded=4).
// The fix accumulates every completed phase into nodesExpandedTotal. A wandering solve (reqLen far
// above the Manhattan distance) needs ~reqLen phases, each processing >=1 frontier node, so the
// credited count must far exceed any single phase's frontier (bounded here by beamWidth). Beam is
// deterministic (no RNG without diverseBeam), so this is a stable lower bound, not a timing guess.
test('beamSearchFromGate credits all phases nodesExpanded on a multi-phase success (not just the last)', async () => {
  const level = makeLevel({
    grid: { w: 9, h: 9 },
    reqLen: 40, // Manhattan distance (0,0)->(8,8) is 16 -- 24 steps of slack forces many phases
    goalKey: PACK(8, 8),
    gateKeys: [PACK(0, 0)],
  });
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const beamWidth = 16;
  const path = await beamSearchFromGate(PACK(0, 0), level, prep, POLICY_PROFILES.default, 5000, Date.now(), null, beamWidth, null, false);
  assert.ok(path, 'expected the beam to solve within the generous budget');
  assert.equal(path!.length, level.reqLen + 1);
  // A 41-node solution required >=40 completed phases; pre-fix credited only the final phase
  // (<= beamWidth + neighbors), so anything comfortably above beamWidth proves multi-phase accrual.
  assert.ok(prep._metrics!.nodesExpanded > beamWidth * 2,
    `expected accumulated multi-phase node count, got ${prep._metrics!.nodesExpanded} (<= ~beamWidth means only the last phase was credited)`);
});

// Regression test for the DFS analog of the beam nodesExpanded gap above, found in the same
// audit sweep: dfsFromGate's OWN timeout exit path (search.ts, the `(++nodesExpanded & 255) === 0`
// budget check) set out.nodesExpanded but never incremented prep._metrics.nodesExpanded --
// identical bug shape, and empirically the SAME 100%-correlated pattern (a direct before/after
// comparison on this exact level/budget showed every timedOut:true trial reporting exactly 0
// pre-fix, real nonzero counts post-fix). This is the MORE consequential of the two instances:
// dfsFromGateLDS's probe waves are specifically designed to often hit their own bounded node/time
// budget (that's the whole point of cheap-then-escalating LDS probing), so a large fraction of
// real DFS attempts' nodesExpanded were silently zeroed by this, not just an edge case.
//
// STRATEGY_LDS: false bypasses the probe-wave ladder entirely, collapsing dfsFromGateLDS down to
// ONE plain dfsFromGate call (Infinity node budget, so only the wall-clock check can time it out)
// -- deliberately avoiding LDS's normal multi-wave mix of "some waves exhaust naturally (already
// correctly credited), one may time out (the bug)", which made a raw multi-wave run's aggregate
// nodesExpanded too noisy to assert on cleanly.
test('dfsFromGateLDS (STRATEGY_LDS bypassed) credits nodesExpanded even when it times out', async () => {
  const w = 9, h = 9;
  const level = makeLevel({
    grid: { w, h },
    reqLen: 40, // far above the Manhattan distance (16) from (0,0) to (8,8) -- lots of slack to wander
    goalKey: PACK(8, 8),
    gateKeys: [PACK(0, 0)],
  });
  const prep = prepLevel(level);
  prep._cfg = { STRATEGY_LDS: false };
  prep._metrics = { nodesExpanded: 0 };
  const out: { timedOut?: boolean; finalBadness?: number } = {};
  const path = await dfsFromGateLDS(PACK(0, 0), level, prep, POLICY_PROFILES.default, 10, Date.now(), null, null, out);
  if (out.timedOut) {
    assert.equal(path, null);
    assert.ok(prep._metrics!.nodesExpanded > 0, `expected a timed-out attempt to still credit real search work, got ${prep._metrics!.nodesExpanded}`);
  }
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
