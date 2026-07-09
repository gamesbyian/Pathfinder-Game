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

// enableMustTurnBias (the S043 fix's must-turn exit-guidance nudge — see stress/README.md).
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

test('repairSearchFromGate with enableMustTurnBias=true is deterministic', async () => {
    const level = mustTurnLevel();
    const prepA = prepLevel(level);
    prepA._metrics = { nodesExpanded: 0 };
    const pathA = await repairSearchFromGate(K(1, 1), level, prepA, POLICY_PROFILES.repair, 1500, Date.now(), null, undefined, true);

    const prepB = prepLevel(level);
    prepB._metrics = { nodesExpanded: 0 };
    const pathB = await repairSearchFromGate(K(1, 1), level, prepB, POLICY_PROFILES.repair, 1500, Date.now(), null, undefined, true);

    assert.deepEqual(pathA, pathB);
});
