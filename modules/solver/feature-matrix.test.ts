/**
 * Solver feature-matrix integration (hardening plan §1): solve one tiny level per game
 * mechanic through the public facade and check every returned solution against the
 * PLAY referee. This exercises the real attempt policy → DFS/beam → pruning → scoring
 * pipeline on each mechanic, not just isolated helpers. Levels are small (≤ 7×4) so the
 * whole suite solves in milliseconds.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver } from '../Solver.js';
import { validateCandidatePath } from '../domain/path-validator.js';
import { parseRawLevel } from '../domain/level-codec.js';
import { PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { applyMove, createState } from './search-state.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import type { PruneDiagnostics } from './prune-gauntlet.js';

const solver = createSolver();
const K = (x: number, y: number) => PACK(x - 1, y - 1);

function raw(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 4 };
    return {
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: grid.w - 1 + grid.h - 1, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    };
}

async function solveAndReferee(rawLevel: any, { refereeCheck = true }: any = {}) {
    const level = solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const result = await solver.solve(level, { timeBudgetMs: 10000 });
    assert.equal(result.ok, true, `solver must solve: ${result.status}`);
    assert.ok(Array.isArray(result.solution) && result.solution.length > 1);
    if (refereeCheck) {
        const playLevel = parseRawLevel(rawLevel);
        assert.ok(playLevel);
        const verdict = validateCandidatePath(playLevel!, result.solution!);
        assert.equal(verdict.ok, true, `referee must accept the solver's path: ${(verdict as any).reason}`);
    }
    return result;
}

test('baseline: corridor with turns', async () => {
    await solveAndReferee(raw());
});

test('exact intersections: solver produces the required self-crossings', async () => {
    await solveAndReferee(raw({ grid: { w: 5, h: 4 }, reqLen: 13, reqInt: 1 }));
});

test('must-pass cells are routed through', async () => {
    await solveAndReferee(raw({ mustPass: [{ x: 1, y: 4 }, { x: 5, y: 1 }], reqLen: 13, reqInt: 0 }));
});

test('must-cross cells are crossed twice on perpendicular axes', async () => {
    await solveAndReferee(raw({ grid: { w: 5, h: 4 }, mustCross: [{ x: 3, y: 2 }], reqLen: 13, reqInt: 1 }));
});

test('portals force the jump and cost zero length', async () => {
    // Portal (2,1)→(4,4); direct gate→portal→goal solve.
    await solveAndReferee(raw({
        grid: { w: 5, h: 4 },
        portals: [{ x1: 2, y1: 1, x2: 4, y2: 4 }],
        reqLen: 2, reqInt: 0,
    }));
});

test('regular + flipping filters constrain the crossing axes', async () => {
    await solveAndReferee(raw({
        grid: { w: 5, h: 4 },
        filters: [{ x: 3, y: 1, axis: 1 }],
        flippingFilters: [{ x: 3, y: 3, axis: 1 }],
        reqLen: 7, reqInt: 0,
    }));
});

test('landmark constraints: surround + must-turn + adjacent-turn', async () => {
    await solveAndReferee(raw({
        grid: { w: 5, h: 4 },
        gates: [{ x: 1, y: 4 }],
        goal: { x: 5, y: 4 },
        landmarks: [
            { x: 2, y: 2, objectType: 'park', role: 'surround' },
            { x: 4, y: 4, objectType: 'library', role: 'mustTurn', turn: 'either' },
        ],
        reqLen: 14, reqInt: 0,
    }));
});

test('hazards: solver ignores geese and false goals (MoveContext.SOLVER) but avoids ending on them', async () => {
    const rawLevel = raw({
        grid: { w: 5, h: 4 },
        geese: [{ x: 3, y: 2 }],
        falseGoals: [{ x: 5, y: 1 }],
        reqLen: 7, reqInt: 0,
    });
    const level = solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const result = await solver.solve(level, { timeBudgetMs: 10000 });
    assert.equal(result.ok, true, result.status);
    const solution = result.solution!;
    assert.equal(solution[solution.length - 1], K(5, 4), 'ends on the true goal');
    assert.equal(solution.length - 1, 7, 'exact counted length (no portals here)');
});

test('multi-gate: solver may start from any gate and the referee accepts the start', async () => {
    await solveAndReferee(raw({
        grid: { w: 5, h: 4 },
        gates: [{ x: 1, y: 1 }, { x: 1, y: 4 }],
        reqLen: 7, reqInt: 0,
    }));
});

test('dense near-Hamiltonian level engages the DFS ordering regime', async () => {
    // 4x4, path covers 15 of 16 cells (navDensity ≈ 0.94 ≥ DENSE_LEVEL_NAV_DENSITY).
    await solveAndReferee(raw({
        grid: { w: 4, h: 4 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 4, y: 4 },
        reqLen: 14, reqInt: 0,
    }));
});

test('infeasible level: solver reports failure rather than a bogus path', async () => {
    // Parity-impossible: gate and goal parities cannot meet in an odd reqLen. (3x3,
    // gate (1,1) parity 0, goal (3,3) parity 0, reqLen 5 → odd — unreachable exactly.)
    const impossibleRaw = raw({
        grid: { w: 3, h: 3 }, goal: { x: 3, y: 3 }, reqLen: 5, reqInt: 0,
    });
    const level = solver.prepareLevelForSolver(impossibleRaw, { source: 'raw' });
    const prep = prepLevel(level);
    const state = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), state, level, prep, false);
    const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
    assert.equal(evaluatePrunedMove(K(2, 1), 1, state, level, prep,
        { PRUNE_PARITY: true }, false, { diagnostics }), 'reject');
    assert.equal(diagnostics.reached.PRUNE_PARITY, 1, 'integration fixture reaches the parity branch');
    assert.equal(diagnostics.rejected.PRUNE_PARITY, 1, 'parity is the isolated first firing rule');

    const feasible = solver.prepareLevelForSolver({ ...impossibleRaw, reqLen: 4 }, { source: 'raw' });
    const feasiblePrep = prepLevel(feasible), feasibleState = createState(K(1, 1), feasible, feasiblePrep);
    applyMove(K(2, 1), feasibleState, feasible, feasiblePrep, false);
    const feasibleDiagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
    assert.equal(evaluatePrunedMove(K(2, 1), 1, feasibleState, feasible, feasiblePrep,
        { PRUNE_PARITY: true }, false, { diagnostics: feasibleDiagnostics }), 'pass');
    assert.equal(feasibleDiagnostics.reached.PRUNE_PARITY, 1);
    assert.equal(feasibleDiagnostics.rejected.PRUNE_PARITY, undefined,
        'the exact four-edge oracle path remains available');

    const result = await solver.solve(level, { timeBudgetMs: 2000 });
    assert.equal(result.ok, false);
    assert.equal(result.solution, null);
});

test('trap search finds viable false-goal spots and classifies dead ones', async () => {
    const rawLevel = raw({ grid: { w: 4, h: 3 }, reqLen: 5, reqInt: 0 });
    const level = solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const budget = solver.getTrapSpotBudgetMs(level);
    assert.ok(budget > 0);
    const res = await solver.findTrapSpots(level, { timeLimit: Math.min(budget, 3000) });
    assert.equal(res.ok, true);
    assert.ok(res.spots instanceof Set && res.spots.size > 0, 'an open 4x3 grid has viable trap endpoints');
    assert.ok(!res.spots.has(K(4, 3)), 'the true goal is never a trap spot');

    // classifyFalseGoals: a false goal parked on a found spot classifies as reachable;
    // one in a sealed pocket classifies as dead (unreachable).
    const spotKey: number = res.spots.values().next().value;
    const withFg = solver.prepareLevelForSolver({
        ...rawLevel,
        falseGoals: [{ x: (spotKey & 0xFFFF) + 1, y: ((spotKey >>> 16) & 0xFFFF) + 1 }],
    }, { source: 'raw' });
    const classified = solver.classifyFalseGoals(withFg, await solver.findTrapSpots(withFg, { timeLimit: 3000 }));
    assert.equal(classified.get(spotKey), 'reachable');
});
