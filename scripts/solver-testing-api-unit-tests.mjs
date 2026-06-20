#!/usr/bin/env node
/** Unit tests for the documented SolverV2 testing/analysis import path. */
import assert from 'node:assert/strict';
import { createSolverV2, SOLVER_TESTING_API as SOLVER_TESTING_API_FROM_FACADE } from '../modules/SolverV2.js';
import { PACK } from '../modules/solver/encoding.js';
import { SOLVER_TESTING_API, createSolverTestingApi } from '../modules/solver/testing-api.js';

let passed = 0;
let failed = 0;
async function test(name, fn) {
    try { await fn(); console.log(`  ✓ ${name}`); passed += 1; }
    catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

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
    };
}

await test('SOLVER_TESTING_API exposes stable analysis helpers', () => {
    assert.equal(typeof SOLVER_TESTING_API.normalizeRawLevel, 'function');
    assert.equal(typeof SOLVER_TESTING_API.buildDistMap, 'function');
    assert.equal(typeof SOLVER_TESTING_API.detectArchetype, 'function');
    assert.equal(typeof SOLVER_TESTING_API.getAttemptConfigs, 'function');
    assert.equal(typeof SOLVER_TESTING_API.prepLevel, 'function');
    assert.equal(Object.isFrozen(SOLVER_TESTING_API), true);
});

await test('SolverV2.js re-exports the canonical SOLVER_TESTING_API surface', () => {
    assert.equal(SOLVER_TESTING_API_FROM_FACADE, SOLVER_TESTING_API);
});

await test('createSolverTestingApi returns an isolated frozen helper facade', () => {
    const api = createSolverTestingApi();
    assert.notEqual(api, SOLVER_TESTING_API);
    assert.equal(Object.isFrozen(api), true);
    assert.equal(api.prepLevel, SOLVER_TESTING_API.prepLevel);
});

await test('SolverV2 compatibility hooks delegate to the testing API helpers', () => {
    const solver = createSolverV2();
    assert.equal(solver._normalizeRawLevel, SOLVER_TESTING_API.normalizeRawLevel);
    assert.equal(solver._buildDistMap, SOLVER_TESTING_API.buildDistMap);
    assert.equal(solver._detectArchetype, SOLVER_TESTING_API.detectArchetype);
    assert.equal(solver._getAttemptConfigs, SOLVER_TESTING_API.getAttemptConfigs);
    assert.equal(solver._prepLevel, SOLVER_TESTING_API.prepLevel);
});

await test('testing API helpers can prepare and inspect a simple level', () => {
    const level = makeLevel();
    const prep = SOLVER_TESTING_API.prepLevel(level);
    assert.equal(prep.goalDistArr[PACK(2, 0)], 0);
    assert.equal(SOLVER_TESTING_API.buildDistMap(level, [PACK(0, 0)]).get(PACK(2, 0)), 2);
    assert.equal(typeof SOLVER_TESTING_API.detectArchetype(level, prep), 'string');
    assert.equal(Array.isArray(SOLVER_TESTING_API.getAttemptConfigs(level)), true);
});

if (failed > 0) { console.error(`\nSolver testing API tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nSolver testing API tests: ${passed} passed, ${failed} failed`);
