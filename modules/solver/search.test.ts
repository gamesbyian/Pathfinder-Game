/** Unit tests for Solver topology, trap-search, and DFS/beam search loops. */
import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import { PACK } from './encoding.js';
import { SCORING_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import { __pruneFirstStepNeighborsForTests, __reconstructBeamPathForTests, beamSearchFromGate, dfsFromGateLDS, getLdsProbeNodeBudget } from './search.js';
import { applyMove, createState } from './search-state.js';
import { findTrapSpots, classifyFalseGoals, isParityReachableEndpoint } from './trap-search.js';
import { isConnected } from './topology.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PruneDiagnostics } from './prune-gauntlet.js';
import type { PruneId } from './prune-gauntlet.js';
import { validateCandidatePath } from '../domain/path-validator.js';

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

function diagnoseCandidate(level: NormalizedLevel, id: PruneId) {
  const prep = prepLevel(level);
  const state = createState(PACK(0, 0), level, prep);
  applyMove(PACK(1, 0), state, level, prep, false);
  const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
  const verdict = evaluatePrunedMove(PACK(1, 0), 1, state, level, prep, { [id]: true }, false, { diagnostics });
  return { verdict, reached: diagnostics.reached[id] ?? 0, rejected: diagnostics.rejected[id] ?? 0 };
}

test('isConnected reports reachable goal and blocks disconnected regions', () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  assert.equal(isConnected(PACK(0, 0), createState(PACK(0, 0), level, prep), level, prep), true);

  const blocked = makeLevel({ blockSet: new Set([PACK(1, 0)]) });
  const blockedPrep = prepLevel(blocked);
  assert.equal(isConnected(PACK(0, 0), createState(PACK(0, 0), blocked, blockedPrep), blocked, blockedPrep), false);
});

test('prune diagnostics prove the distance-bound branch passes a feasible control and fires first for an infeasible control', () => {
  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 2 }), 'PRUNE_DISTANCE_BOUND'),
    { verdict: 'pass', reached: 1, rejected: 0 }, 'oracle path 0→1→2 fits exactly');
  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 1 }), 'PRUNE_DISTANCE_BOUND'),
    { verdict: 'reject', reached: 1, rejected: 1 }, 'distance is the isolated first firing prune');
});

test('parity, MC-ceiling, and intersection-deficit diagnostics have isolated positive and feasible controls', () => {
  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 2 }), 'PRUNE_PARITY'),
    { verdict: 'pass', reached: 1, rejected: 0 }, 'exact two-edge path has compatible parity');
  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 3 }), 'PRUNE_PARITY'),
    { verdict: 'reject', reached: 1, rejected: 1 }, 'odd extra budget has impossible endpoint parity');

  const mc = PACK(1, 0);
  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 4, reqInt: 1, mustCrossKeys: [mc] }), 'PRUNE_MC_CEILING'),
    { verdict: 'pass', reached: 1, rejected: 0 }, 'one reserved crossing fits one intersection');
  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 4, reqInt: 0, mustCrossKeys: [mc] }), 'PRUNE_MC_CEILING'),
    { verdict: 'reject', reached: 1, rejected: 1 }, 'reserved crossing exceeds the zero-intersection ceiling');

  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 2, reqInt: 1 }), 'PRUNE_INTERSECTION_DEFICIT'),
    { verdict: 'pass', reached: 1, rejected: 0 }, 'one remaining step can supply one intersection');
  assert.deepEqual(diagnoseCandidate(makeLevel({ reqLen: 2, reqInt: 2 }), 'PRUNE_INTERSECTION_DEFICIT'),
    { verdict: 'reject', reached: 1, rejected: 1 }, 'one step cannot supply a two-intersection deficit');
});

test('portal-parity envelope only fires after every parity-twisting portal is consumed', () => {
  const a = PACK(1, 0), b = PACK(3, 1);
  const level = makeLevel({
    grid: { w: 5, h: 2 }, gateKeys: [PACK(0, 1)], goalKey: PACK(4, 0), reqLen: 2,
    portalMap: new Map([[a, { dest: b }], [b, { dest: a }]]),
  });
  const prep = prepLevel(level);
  assert.equal(prep.parityPortalDistMaps?.length, 1, 'fixture contains a parity-twisting portal pair');
  const state = createState(PACK(0, 1), level, prep);
  applyMove(PACK(0, 0), state, level, prep, false);
  const run = () => {
    const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
    const verdict = evaluatePrunedMove(PACK(0, 0), 1, state, level, prep,
      { PRUNE_PORTAL_PARITY_ENVELOPE: true }, false, { diagnostics });
    return { verdict, reached: diagnostics.reached.PRUNE_PORTAL_PARITY_ENVELOPE ?? 0,
      rejected: diagnostics.rejected.PRUNE_PORTAL_PARITY_ENVELOPE ?? 0 };
  };

  state.visited[a] = 1;
  assert.deepEqual(run(), { verdict: 'pass', reached: 1, rejected: 0 },
    'an unconsumed twist portal keeps both endpoint parities feasible');
  state.visited[b] = 1;
  assert.deepEqual(run(), { verdict: 'reject', reached: 1, rejected: 1 },
    'after both terminals are consumed the isolated envelope rule fires first');
});

test('forced-first-move diagnostics count rejected alternatives and preserve the forced candidate', () => {
  const level = makeLevel({ grid: { w: 3, h: 2 }, gateKeys: [PACK(0, 0)] });
  const prep = prepLevel(level);
  prep._cfg = { PRUNE_MC_FORCED_FIRST_MOVE: true };
  prep.gateForcedFirstStepKey.set(PACK(0, 0), PACK(1, 0));
  const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
  assert.deepEqual(__pruneFirstStepNeighborsForTests(PACK(0, 0), [PACK(1, 0), PACK(0, 1)], prep, diagnostics),
    [PACK(1, 0)]);
  assert.equal(diagnostics.reached.PRUNE_MC_FORCED_FIRST_MOVE, 1);
  assert.equal(diagnostics.rejected.PRUNE_MC_FORCED_FIRST_MOVE, 1);

  const feasible: PruneDiagnostics = { reached: {}, rejected: {} };
  assert.deepEqual(__pruneFirstStepNeighborsForTests(PACK(0, 0), [PACK(1, 0)], prep, feasible), [PACK(1, 0)],
    'the forced candidate itself is a feasible negative control');
  assert.equal(feasible.reached.PRUNE_MC_FORCED_FIRST_MOVE, 1, 'negative control reaches the rule');
  assert.equal(feasible.rejected.PRUNE_MC_FORCED_FIRST_MOVE, undefined);
});

test('dfsFromGateLDS solves a simple line level through the extracted search module', async () => {
  const level = makeLevel();
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const path = await dfsFromGateLDS(PACK(0, 0), level, prep, SCORING_PROFILES.default, 1000, Date.now(), null, null);
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
  const path = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 1000, Date.now(), null, 8, null, false);
  assert.deepEqual(path, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
});

test('beam research observation is behaviorally inert and sees real boundaries', async () => {
  const level = makeLevel();
  const off = prepLevel(level); off._cfg = null; off._metrics = { nodesExpanded: 0 };
  const offPath = await beamSearchFromGate(PACK(0, 0), level, off, SCORING_PROFILES.default, 1000, Date.now(), null, 8, null, false);
  const records: Array<{ stage: string; paths: number[][] }> = [];
  const on = prepLevel(level); on._cfg = null; on._metrics = { nodesExpanded: 0 };
  on._beamResearchObserver = { observe: record => records.push({ stage: record.stage, paths: record.paths }) };
  const onPath = await beamSearchFromGate(PACK(0, 0), level, on, SCORING_PROFILES.default, 1000, Date.now(), null, 8, null, false);
  assert.deepEqual(onPath, offPath);
  assert.equal(on._metrics.nodesExpanded, off._metrics.nodesExpanded);
  assert.ok(records.some(record => record.stage === 'incoming-frontier'));
  assert.ok(records.some(record => record.stage === 'generated'));
  assert.ok(records.every(record => record.paths.every(path => path[0] === PACK(0, 0))));
});

test('beam reconstruction scratch handles long, tiny, shifted, then long paths like fresh invariants', async () => {
  type N = { key: number; prev: N | null; depth: number };
  const chain = (keys: number[]): N => keys.reduce<N | null>((prev, key, depth) => ({ key, prev, depth }), null)!;
  const scratch: number[] = [];
  const sequences = [
    Array.from({ length: 15 }, (_, i) => PACK(i, 0)),
    [PACK(4, 2)],
    [PACK(3, 1), PACK(2, 1), PACK(1, 1)],
    Array.from({ length: 15 }, (_, i) => PACK(i, 0)),
  ];
  for (const expected of sequences) {
    assert.equal(__reconstructBeamPathForTests(chain(expected), scratch), scratch);
    assert.deepEqual(scratch, expected, 'reused reconstruction buffer must exactly match a fresh path');
  }

  const line = (length: number, reversed = false) => {
    const start = PACK(reversed ? length - 1 : 0, 0);
    const goal = PACK(reversed ? 0 : length - 1, 0);
    return makeLevel({ grid: { w: length, h: 1 }, gateKeys: [start], goalKey: goal, reqLen: length - 1 });
  };
  for (const [length, reversed] of [[15, false], [2, false], [7, true], [15, false]] as const) {
    const level = line(length, reversed);
    const prep = prepLevel(level); prep._cfg = null;
    const start = level.gateKeys[0];
    const path = await beamSearchFromGate(start, level, prep, SCORING_PROFILES.default, 2000, Date.now(), null, 8, null, false);
    assert.ok(path, `${length}-cell beam must solve`);
    assert.equal(path.length, length, 'reconstruction length must not retain a prior longer tail');
    assert.equal(path[0], start); assert.equal(path.at(-1), level.goalKey);
    assert.equal(new Set(path).size, path.length, 'line reference has no revisits');
    for (let i = 1; i < path.length; i++) assert.equal(Math.abs(path[i] - path[i - 1]), 1);
  }
});

// Regression test for the 2026-07-16 nodesExpanded instrumentation gap. The clock is mocked
// deliberately: this is a correctness test for the wall-deadline exit path, not a benchmark.
// Real 2ms/10ms versions of this test became load-sensitive under CI contention and required
// retries, which made the test itself reproduce the wall-clock ambiguity the solver contract
// is designed to avoid.
test('beamSearchFromGate credits nodesExpanded even when it times out mid-search', async () => {
  const level = makeLevel({
    grid: { w: 9, h: 9 },
    reqLen: 40,
    goalKey: PACK(8, 8),
    gateKeys: [PACK(0, 0)],
  });
  const prep = prepLevel(level);
  prep._cfg = null;
  prep._metrics = { nodesExpanded: 0 };
  const out: { timedOut?: boolean; finalBadness?: number } = {};
  const clock = vi.spyOn(Date, 'now');
  try {
    // First outer budget check passes at t=0. One beam phase then completes; the next
    // outer check sees the 10ms deadline exactly and must take the timeout return path.
    clock.mockReturnValueOnce(0).mockReturnValue(10);
    const path = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 10, 0, null, 40, null, false, out);
    assert.equal(path, null);
    assert.equal(out.timedOut, true);
    assert.ok(prep._metrics.nodesExpanded > 0,
      `expected a timed-out attempt to credit completed search work, got ${prep._metrics.nodesExpanded}`);
  } finally {
    clock.mockRestore();
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
  const path = await beamSearchFromGate(PACK(0, 0), level, prep, SCORING_PROFILES.default, 5000, Date.now(), null, beamWidth, null, false);
  assert.ok(path, 'expected the beam to solve within the generous budget');
  assert.equal(path!.length, level.reqLen + 1);
  // A 41-node solution required >=40 completed phases; pre-fix credited only the final phase
  // (<= beamWidth + neighbors), so anything comfortably above beamWidth proves multi-phase accrual.
  assert.ok(prep._metrics!.nodesExpanded > beamWidth * 2,
    `expected accumulated multi-phase node count, got ${prep._metrics!.nodesExpanded} (<= ~beamWidth means only the last phase was credited)`);
});

// Regression test for the DFS analog of the beam nodesExpanded gap above. dfsFromGate checks
// its deadline every 256 nodes, so a fixed mocked time beyond the deadline deterministically
// exercises that exact exit after real search work, independent of runner speed.
test('dfsFromGateLDS (STRATEGY_LDS bypassed) credits nodesExpanded even when it times out', async () => {
  const level = makeLevel({
    grid: { w: 9, h: 9 },
    reqLen: 40,
    goalKey: PACK(8, 8),
    gateKeys: [PACK(0, 0)],
  });
  const prep = prepLevel(level);
  prep._cfg = { STRATEGY_LDS: false };
  prep._metrics = { nodesExpanded: 0 };
  const out: { timedOut?: boolean; finalBadness?: number } = {};
  const clock = vi.spyOn(Date, 'now').mockReturnValue(11);
  try {
    const path = await dfsFromGateLDS(PACK(0, 0), level, prep, SCORING_PROFILES.default, 10, 0, null, null, out);
    assert.equal(path, null);
    assert.equal(out.timedOut, true);
    assert.ok(prep._metrics.nodesExpanded >= 256,
      `deadline check should occur only after real DFS work, got ${prep._metrics.nodesExpanded} nodes`);
  } finally {
    clock.mockRestore();
  }
});

// nodeBudget threading (2026-07-23): beam/DFS gained a cumulative-remaining node cap so a finite
// SolveOpts.nodeBudget (offline batch tooling) stops a single main-search attempt mid-search instead
// of only being caught between attempts after it has run its full time slice. Two contracts per
// primitive: (1) a cap below the solve cost stops the search near the cap without solving, and
// (2) a cap comfortably above the solve cost is inert (identical solve, identical node count) --
// which is why production (nodeBudget defaults to Infinity) is byte-for-byte unchanged. Both
// searches are deterministic here (no diverseBeam / no RNG), so the node counts are stable bounds.
test('beamSearchFromGate honors a finite nodeBudget (caps below solve cost stop it; caps above are inert)', async () => {
  const level = makeLevel({ grid: { w: 9, h: 9 }, reqLen: 40, goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)] });
  const base = prepLevel(level); base._cfg = null; base._metrics = { nodesExpanded: 0 };
  const basePath = await beamSearchFromGate(PACK(0, 0), level, base, SCORING_PROFILES.default, 5000, Date.now(), null, 40, null, false, {}, Infinity);
  assert.ok(basePath, 'unbudgeted baseline should solve');
  const solveNodes = base._metrics!.nodesExpanded;

  const capped = prepLevel(level); capped._cfg = null; capped._metrics = { nodesExpanded: 0 };
  const cap = Math.floor(solveNodes / 2);
  const out: { timedOut?: boolean } = {};
  const cappedPath = await beamSearchFromGate(PACK(0, 0), level, capped, SCORING_PROFILES.default, 5000, Date.now(), null, 40, null, false, out, cap);
  assert.equal(cappedPath, null, 'a cap below the solve cost must prevent the solve');
  assert.equal(out.timedOut, true, 'a node-budget exit reports timedOut, matching dfsFromGate');
  assert.ok(capped._metrics!.nodesExpanded >= cap && capped._metrics!.nodesExpanded < cap + 512,
    `capped run should stop just past the cap (${cap}), got ${capped._metrics!.nodesExpanded}`);

  const slack = prepLevel(level); slack._cfg = null; slack._metrics = { nodesExpanded: 0 };
  const slackPath = await beamSearchFromGate(PACK(0, 0), level, slack, SCORING_PROFILES.default, 5000, Date.now(), null, 40, null, false, {}, solveNodes * 4);
  assert.ok(slackPath, 'a cap above the solve cost must still solve');
  assert.equal(slack._metrics!.nodesExpanded, solveNodes, 'a slack cap must not change the node count (production stays byte-identical)');
});

// Differential test for the fast numeric dedup/diversity key (search.ts's beamNumericDedupKey):
// exercises must-pass/must-cross/flipper mechanics together (all 7 dedup fields nonzero at some
// point) on an open grid wide enough to blow past a small beamWidth every phase, forcing the
// dedup/near-tie-retention/diverse-select machinery to run repeatedly. Runs the identical search
// twice -- once through the default numeric path, once forced onto the delimited-string fallback
// via prep._forceBeamCoarseStateStringKeyForTests -- and asserts byte-identical nodesExpanded and an
// identical solved path, proving the numeric encoding reproduces the string encoding's dedup/
// diversity decisions exactly, not just "solves the same level." See beamNumericDedupKey's own
// comment in search.ts and reports/2026-08-23-beam-dedup-numeric-key-arena.md.
test('beamSearchFromGate numeric dedup key reproduces the string-key fallback exactly (diverseBeam off)', async () => {
  const level = makeLevel({
    grid: { w: 9, h: 9 }, reqLen: 40, reqInt: 0, goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)],
    mustPassKeys: [PACK(2, 2), PACK(4, 4), PACK(6, 6)],
    flippingFilterMap: new Map([[PACK(3, 3), 1], [PACK(5, 5), 2]]),
  });
  const beamWidth = 16;

  const numeric = prepLevel(level); numeric._cfg = null; numeric._metrics = { nodesExpanded: 0 };
  const numericPath = await beamSearchFromGate(PACK(0, 0), level, numeric, SCORING_PROFILES.default, 5000, Date.now(), null, beamWidth, null, false);

  const stringKey = prepLevel(level); stringKey._cfg = null; stringKey._metrics = { nodesExpanded: 0 };
  stringKey._forceBeamCoarseStateStringKeyForTests = true;
  const stringPath = await beamSearchFromGate(PACK(0, 0), level, stringKey, SCORING_PROFILES.default, 5000, Date.now(), null, beamWidth, null, false);

  assert.ok(numericPath, 'expected the beam to solve within the generous budget');
  assert.deepEqual(numericPath, stringPath, 'numeric and string dedup keys must reach an identical solution path');
  assert.equal(numeric._metrics!.nodesExpanded, stringKey._metrics!.nodesExpanded,
    'numeric and string dedup keys must expand an identical number of nodes (proves identical merge decisions, not just identical final answer)');
});

// Same differential, with diverseBeam on: exercises _diverseSelect's numeric (flipperUsedMask,
// mustCrossMask) bucketing key together with the dedup key in the same run.
test('beamSearchFromGate numeric dedup key reproduces the string-key fallback exactly (diverseBeam on)', async () => {
  const level = makeLevel({
    grid: { w: 9, h: 9 }, reqLen: 40, reqInt: 0, goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)],
    mustPassKeys: [PACK(2, 2), PACK(4, 4), PACK(6, 6)],
    flippingFilterMap: new Map([[PACK(3, 3), 1], [PACK(5, 5), 2]]),
  });
  const beamWidth = 16;

  const numeric = prepLevel(level); numeric._cfg = null; numeric._metrics = { nodesExpanded: 0 };
  const numericPath = await beamSearchFromGate(PACK(0, 0), level, numeric, SCORING_PROFILES.default, 5000, Date.now(), null, beamWidth, null, true);

  const stringKey = prepLevel(level); stringKey._cfg = null; stringKey._metrics = { nodesExpanded: 0 };
  stringKey._forceBeamCoarseStateStringKeyForTests = true;
  const stringPath = await beamSearchFromGate(PACK(0, 0), level, stringKey, SCORING_PROFILES.default, 5000, Date.now(), null, beamWidth, null, true);

  assert.ok(numericPath, 'expected the beam to solve within the generous budget');
  assert.deepEqual(numericPath, stringPath, 'numeric and string dedup keys must reach an identical solution path with diverseBeam on');
  assert.equal(numeric._metrics!.nodesExpanded, stringKey._metrics!.nodesExpanded,
    'numeric and string dedup keys must expand an identical number of nodes with diverseBeam on');
});

test('dfsFromGateLDS honors a finite nodeBudget (it bounds the otherwise-unbounded final DFS wave)', async () => {
  const level = makeLevel({ grid: { w: 9, h: 9 }, reqLen: 40, goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)] });

  // Prove independently that the fixture is genuinely solvable without spending ~2M DFS nodes
  // merely to establish that prerequisite. This fixed simple path has exactly 40 ordinary moves,
  // no revisits, and is checked by the domain referee rather than by the search under test.
  const knownSolutionCoords = [
    [0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[7,0],[8,0],
    [8,1],[7,1],[6,1],[5,1],[4,1],[3,1],[2,1],[1,1],[0,1],
    [0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[8,2],
    [8,3],[7,3],[6,3],[5,3],[4,3],[4,4],[5,4],[6,4],[7,4],[8,4],
    [8,5],[8,6],[8,7],[8,8],
  ];
  const knownSolution = knownSolutionCoords.map(([x, y]) => PACK(x, y));
  assert.equal(validateCandidatePath(level, knownSolution).ok, true, 'budget fixture must be independently solvable');

  const cap = 20000;
  const capped = prepLevel(level); capped._cfg = null; capped._metrics = { nodesExpanded: 0 };
  const out: { timedOut?: boolean } = {};
  const cappedPath = await dfsFromGateLDS(PACK(0, 0), level, capped, SCORING_PROFILES.default, 120000, Date.now(), null, null, out, cap);
  assert.equal(cappedPath, null, 'a 20k-node cap must interrupt this solvable fixture before DFS finds its solution');
  assert.equal(out.timedOut, true);
  assert.ok(capped._metrics!.nodesExpanded >= cap && capped._metrics!.nodesExpanded < cap + 4096,
    `capped run should stop near the cap (${cap}), got ${capped._metrics!.nodesExpanded}`);
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

test('findTrapSpots rejects a length/intersection-matching endpoint that leaves a surround landmark unsatisfied', async () => {
  // 3x3 grid, surround object at the center (1,1) — impassable, all 8 neighbors must be visited.
  // Gate at (0,0); a single step to (1,0) matches reqLen/reqInt but visits only 1 of 8 required
  // neighbors, so it must NOT be certified as a valid trap spot.
  const center = PACK(1, 1);
  const baseline = makeLevel({
    grid: { w: 3, h: 3 }, reqLen: 1, reqInt: 0, goalKey: PACK(2, 2), gateKeys: [PACK(0, 0)],
  });
  const baselineResult = await findTrapSpots(baseline, { timeLimit: 1000 });
  assert.equal(baselineResult.spots.has(PACK(1, 0)), true, 'sanity: (1,0) is a valid one-step endpoint without the landmark');

  const withSurround = makeLevel({
    grid: { w: 3, h: 3 }, reqLen: 1, reqInt: 0, goalKey: PACK(2, 2), gateKeys: [PACK(0, 0)],
    blockSet: new Set([center]), surroundKeys: [center],
  });
  const result = await findTrapSpots(withSurround, { timeLimit: 1000 });
  assert.equal(result.spots.has(PACK(1, 0)), false,
    'a path that stops one step short must not certify as a trap spot while the surround landmark is unsatisfied');
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
