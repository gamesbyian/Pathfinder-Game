/** Unit tests for the documented Solver testing/analysis import path. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver, SOLVER_TESTING_API as SOLVER_TESTING_API_FROM_FACADE } from '../solver.js';
import { PACK } from './encoding.js';
import { SOLVER_TESTING_API, createSolverTestingApi } from './testing-api.js';
import type { NormalizedLevel } from '../domain/types.js';
import { getDistanceFromArray } from './distance.js';

function makeLevel() {
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
    } as unknown as NormalizedLevel;
}

test('SOLVER_TESTING_API exposes stable analysis helpers', () => {
    assert.equal(typeof SOLVER_TESTING_API.normalizeRawLevel, 'function');
    assert.equal(typeof SOLVER_TESTING_API.buildDistMap, 'function');
    assert.equal(typeof SOLVER_TESTING_API.detectArchetype, 'function');
    assert.equal(typeof SOLVER_TESTING_API.getAttemptConfigs, 'function');
    assert.equal(typeof SOLVER_TESTING_API.prepLevel, 'function');
    assert.equal(typeof SOLVER_TESTING_API.beamSearchFromGate, 'function');
    assert.equal(typeof SOLVER_TESTING_API.WinningPrefixIndex, 'function');
    assert.equal(typeof SOLVER_TESTING_API.WinningLineageObserver, 'function');
    assert.equal(typeof SOLVER_TESTING_API.evaluatePrunedMove, 'function');
    assert.equal(typeof SOLVER_TESTING_API.getRealLengthFromState, 'function');
    assert.equal(typeof SOLVER_TESTING_API.scoreMove, 'function');
    assert.equal(Object.isFrozen(SOLVER_TESTING_API), true);
});

test('solver.js re-exports the canonical SOLVER_TESTING_API surface', () => {
    assert.equal(SOLVER_TESTING_API_FROM_FACADE, SOLVER_TESTING_API);
});

test('createSolverTestingApi returns an isolated frozen helper facade', () => {
    const api = createSolverTestingApi();
    assert.notEqual(api, SOLVER_TESTING_API);
    assert.equal(Object.isFrozen(api), true);
    assert.equal(api.prepLevel, SOLVER_TESTING_API.prepLevel);
});

test('Solver instance no longer exposes the deprecated underscore aliases', () => {
    const solver = createSolver();
    for (const prop of ['_normalizeRawLevel', '_buildDistMap', '_detectArchetype', '_getAttemptConfigs', '_prepLevel']) {
        assert.equal((solver as any)[prop], undefined, `${prop} was removed — use SOLVER_TESTING_API instead`);
    }
});

test('testing API helpers can prepare and inspect a simple level', () => {
    const level = makeLevel();
    const prep = SOLVER_TESTING_API.prepLevel(level);
    // Read through the accessor, not the raw slot: distance arrays store distance+1 so that 0 can
    // mean "unreachable" and prepLevel can skip a 1M-entry fill per map (see distance.ts).
    assert.equal(getDistanceFromArray(prep.goalDistArr, PACK(2, 0), prep.gridW), 0);
    assert.equal(SOLVER_TESTING_API.buildDistMap(level, [PACK(0, 0)]).get(PACK(2, 0)), 2);
    assert.equal(typeof SOLVER_TESTING_API.detectArchetype(level), 'string');
    assert.equal(Array.isArray(SOLVER_TESTING_API.getAttemptConfigs(level)), true);
});
