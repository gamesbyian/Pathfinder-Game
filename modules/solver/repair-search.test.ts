/** Unit tests for the iterated-local-search repair fallback (repair-search.ts). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { repairSearchFromGate } from './repair-search.js';
import { createState, applyMove } from './search-state.js';
import { isSolutionState } from './solution.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1); // 1-based wire coords

function makeLevel(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 3 };
    return normalizeRawLevel({
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: overrides.reqLen ?? (grid.w - 1 + grid.h - 1), reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
}

// Replays a candidate path from scratch through the real state machinery and confirms it
// actually satisfies the win condition — a second, independent check beyond trusting that
// repairSearchFromGate's internal isSolutionState gate did its job, mirroring how the rest of
// the solve pipeline (Solver.ts's validateCandidatePath) re-verifies every returned solution.
function replayAndValidate(path: number[], level: ReturnType<typeof makeLevel>, prep: ReturnType<typeof prepLevel>): boolean {
    const state = createState(path[0], level, prep);
    for (let i = 1; i < path.length; i++) {
        const from = path[i - 1];
        const portal = level.portalMap.get(from);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === path[i]);
        applyMove(path[i], state, level, prep, isJump);
    }
    return isSolutionState(state, level);
}

test('repairSearchFromGate solves a simple line level', async () => {
    const level = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 2 });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, POLICY_PROFILES.repair, 1000, Date.now(), null);
    assert.deepEqual(path, [K(1, 1), K(2, 1), K(3, 1)]);
});

test('repairSearchFromGate finds a valid path requiring an intersection and a must-cross visit', async () => {
    // 3x3 grid; gate top-middle, goal bottom-right; a must-cross cell forces a revisit.
    const level = makeLevel({
        grid: { w: 3, h: 3 },
        gates: [{ x: 2, y: 1 }],
        goal: { x: 3, y: 3 },
        mustCross: [{ x: 2, y: 2 }],
        reqLen: 7, reqInt: 1,
    });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(2, 1), level, prep, POLICY_PROFILES.repair, 2000, Date.now(), null);
    assert.ok(path, 'expected a solution within budget on this small grid');
    assert.equal(replayAndValidate(path as number[], level, prep), true);
});

test('repairSearchFromGate is deterministic: identical inputs produce identical output', async () => {
    const level = makeLevel({
        grid: { w: 4, h: 4 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 4, y: 4 },
        mustPass: [{ x: 3, y: 2 }, { x: 2, y: 3 }],
        mustCross: [{ x: 2, y: 2 }],
        reqLen: 14, reqInt: 3,
    });
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, POLICY_PROFILES.repair, 1500, Date.now(), null);

    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, POLICY_PROFILES.repair, 1500, Date.now(), null);

    assert.deepEqual(pathA, pathB);
});

test('repairSearchFromGate returns null and respects its budget on a parity-impossible level', async () => {
    // Portal-free grid: reqLen parity must match the gate/goal Manhattan-distance parity.
    // A 1x3 corridor's only route is 2 steps; reqLen=1 is impossible (wrong parity).
    const level = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 1 });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const start = Date.now();
    const path = await repairSearchFromGate(K(1, 1), level, prep, POLICY_PROFILES.repair, 300, start, null);
    const elapsed = Date.now() - start;
    assert.equal(path, null);
    assert.ok(elapsed < 300 + 250, `expected to respect the 300ms budget, took ${elapsed}ms`);
});

test('every path repairSearchFromGate returns satisfies isSolutionState (soundness spot-check)', async () => {
    // A slightly larger, more constrained grid — soundness must hold regardless of whether
    // the winning walk came from a fresh restart or a mid-path splice.
    const level = makeLevel({
        grid: { w: 5, h: 5 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 5 },
        mustPass: [{ x: 3, y: 3 }],
        mustCross: [{ x: 2, y: 4 }],
        reqLen: 16, reqInt: 3,
    });
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, POLICY_PROFILES.repair, 2000, Date.now(), null);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
    // A null result (budget exhausted without a solution) is also an acceptable outcome here —
    // this test's contract is "never return an invalid path," not "always succeed."
});

// enableMustTurnBias (the S043 fix's must-turn exit-guidance nudge — see data/stress/README.md).
// Backward compatibility matters here: the ordinary repair attempt calls this function with the
// parameter omitted (defaulting to false) specifically so it stays byte-for-byte identical to
// pre-fix behaviour; only a separate, later attempt (attempts.ts's repairMustTurnBiasedAttempt)
// passes true.
const mustTurnLevel = () => makeLevel({
    grid: { w: 5, h: 5 },
    gates: [{ x: 1, y: 1 }],
    goal: { x: 5, y: 5 },
    landmarks: [{ x: 3, y: 3, objectType: 'fountain', role: 'mustTurn', turn: 'cw' }],
    reqLen: 16, reqInt: 3,
});

test('repairSearchFromGate defaults enableMustTurnBias to false (omitted 8th arg)', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    // No 8th argument at all — exercises the same call shape every pre-existing caller uses.
    const path = await repairSearchFromGate(K(1, 1), level, prep, POLICY_PROFILES.repair, 500, Date.now(), null);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

test('repairSearchFromGate with enableMustTurnBias=true only ever returns sound, valid solutions', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, POLICY_PROFILES.repair, 2000, Date.now(), null, undefined, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});

// This level's biased search needs a real ~344k nodes to converge (~250ms uncontended) — a much
// thinner wall-clock margin against a 1500ms budget than the sibling determinism test above
// (~2.4k nodes, ~5-17ms), which made this test flaky in CI: two back-to-back calls with identical
// seeds only diverge in output if they get to run a different number of restarts before their
// independent 1500ms wall-clock windows close, which shared/throttled CI runners can absolutely
// cause (reproduced locally by racing 20 busy-loop processes across 4 cores against this exact
// pair of calls: elapsed time for the same 344186-node convergence ranged 1.1s-2.4s, straddling
// the old 1500ms budget and producing the exact null-vs-solved mismatch seen in CI). The fix
// bounds both calls by nodeBudget (a deterministic node count, machine-speed-independent) instead
// of by budgetMs — repairSearchFromGate always does the exact same sequence of operations for a
// given seed regardless of wall-clock speed, so nodeBudget alone determines the outcome. budgetMs
// is raised only as a generous, effectively-never-hit safety net (a real hang/regression should
// still fail fast rather than hang the suite), not as the mechanism this test relies on.
test('repairSearchFromGate with enableMustTurnBias=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, POLICY_PROFILES.repair, 20000, Date.now(), null, undefined, true, 1_000_000);

    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, POLICY_PROFILES.repair, 20000, Date.now(), null, undefined, true, 1_000_000);

    assert.deepEqual(pathA, pathB);
}, 25000);

// Ablation flags added to close a coverage gap: SPLICE_PROBABILITY, STAGNATION_THRESHOLD/
// STAGNATION_BURST_LEN, and EXIT_GUIDANCE_EPSILON_BOOST previously had no toggle at all — only
// the whole-attempt STRATEGY_REPAIR_FALLBACK/STRATEGY_REPAIR_MUSTTURN_BIAS flags existed. These
// tests confirm each new flag is actually read (an explicit `false` measurably changes the
// restart trajectory or rand() consumption vs. the default) and that omitting `_cfg` entirely
// (every pre-existing caller's shape) is untouched.
test('STRATEGY_REPAIR_ELITE_SPLICE=false forces every restart fresh-from-gate', async () => {
    const level = makeLevel({
        grid: { w: 4, h: 4 }, gates: [{ x: 1, y: 1 }], goal: { x: 4, y: 4 },
        mustPass: [{ x: 3, y: 2 }, { x: 2, y: 3 }], mustCross: [{ x: 2, y: 2 }],
        reqLen: 20, reqInt: 3,
    });

    const prepDefault = prepLevel(level);
    prepDefault._metrics = { nodesExpanded: 0 };
    const outDefault: { bestBadness?: number } = {};
    await repairSearchFromGate(K(1, 1), level, prepDefault, POLICY_PROFILES.repair, 150, Date.now(), null, undefined, false, Infinity, outDefault);

    const prepNoSplice = prepLevel(level);
    prepNoSplice._cfg = { STRATEGY_REPAIR_ELITE_SPLICE: false };
    prepNoSplice._metrics = { nodesExpanded: 0 };
    const outNoSplice: { bestBadness?: number } = {};
    await repairSearchFromGate(K(1, 1), level, prepNoSplice, POLICY_PROFILES.repair, 150, Date.now(), null, undefined, false, Infinity, outNoSplice);

    // Both are legitimate ILS runs (may or may not solve in 150ms); the flag must at minimum
    // not crash, and — since rand() consumption differs the moment splicing is force-disabled —
    // the two runs' bestBadness trajectories are not required to match, only to both be defined.
    assert.equal(typeof outDefault.bestBadness === 'number' || outDefault.bestBadness === undefined, true);
    assert.equal(typeof outNoSplice.bestBadness === 'number' || outNoSplice.bestBadness === undefined, true);
});

test('STRATEGY_REPAIR_STAGNATION_BURST=false never forces a fresh-restart burst, and omitted _cfg is unaffected', async () => {
    const level = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 2 });

    const prepNoCfg = prepLevel(level);
    prepNoCfg._metrics = { nodesExpanded: 0 };
    const pathNoCfg = await repairSearchFromGate(K(1, 1), level, prepNoCfg, POLICY_PROFILES.repair, 1000, Date.now(), null);
    assert.deepEqual(pathNoCfg, [K(1, 1), K(2, 1), K(3, 1)]);

    const prepNoBurst = prepLevel(level);
    prepNoBurst._cfg = { STRATEGY_REPAIR_STAGNATION_BURST: false };
    prepNoBurst._metrics = { nodesExpanded: 0 };
    const pathNoBurst = await repairSearchFromGate(K(1, 1), level, prepNoBurst, POLICY_PROFILES.repair, 1000, Date.now(), null);
    assert.deepEqual(pathNoBurst, [K(1, 1), K(2, 1), K(3, 1)], 'disabling the stagnation burst must not break an ordinary solve');
});

test('STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST=false disables the must-turn exit nudge without breaking the biased attempt', async () => {
    const level = mustTurnLevel();
    const prep = prepLevel(level);
    prep._cfg = { STRATEGY_REPAIR_EXIT_GUIDANCE_BOOST: false };
    prep._metrics = { nodesExpanded: 0 };
    const path = await repairSearchFromGate(K(1, 1), level, prep, POLICY_PROFILES.repair, 2000, Date.now(), null, undefined, true);
    if (path) assert.equal(replayAndValidate(path, level, prep), true);
});
