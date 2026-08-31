#!/usr/bin/env node
/**
 * Regression coverage for scripts/portfolio-solve-sweep-worker.mjs's raced-solve dispatch: the
 * worker used to forward only the legacy `attractionDiversityBudgetFractionOverride` field into
 * the nested race-pool `solveLevel()` options object, silently dropping a caller's
 * canonical-only `goalAttractionDisabledRetryBudgetFractionOverride`. race.mjs itself correctly
 * dual-reads both names (see scripts/solver-parallel-unit-tests.mjs), but that dual-read is dead
 * code from the worker's perspective if the worker never puts the canonical field on the object
 * it hands to the pool. Spins up a real forked+esbuild-bundled worker via runWorkerPool (same
 * mechanism scripts/portfolio-solve-sweep.mjs's own `--race-pool-size` path uses), so this is
 * slower than a pure-function test but exercises the actual production dispatch path rather than
 * race.mjs in isolation.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runWorkerPool } from './solver-worker-pool.mjs';

// Same parity-preserving-but-infeasible shape as solver-parallel-unit-tests.mjs's own
// parityPreservingInfeasibleLevel(): phase 1 exhausts without solving, so the raced engine falls
// through to the goal-attraction-disabled-retry phase UNLESS its budget fraction override is 0.
function parityPreservingInfeasibleRawLevel() {
    return {
        grid: { w: 4, h: 4 }, gates: [{ x: 1, y: 1 }], goal: { x: 4, y: 4 }, reqLen: 2, reqInt: 0,
        blocks: [], mustPass: [], mustCross: [], falseGoals: [], geese: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [],
        designerName: '', description: '', difficulty: null, hints: [],
    };
}

function repairEligibleInfeasibleRawLevel() {
    return {
        grid: { w: 6, h: 6 }, gates: [{ x: 1, y: 1 }], goal: { x: 6, y: 6 }, reqLen: 1, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], filters: [], flippingFilters: [], portals: [], landmarks: [],
        mustPass: [{ x: 2, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 4 }],
        mustCross: [{ x: 3, y: 3 }, { x: 5, y: 5 }],
        designerName: '', description: '', difficulty: null, hints: [],
    };
}

function adjacentGoalRawLevel(reqLen, reqInt) {
    return {
        grid: { w: 4, h: 4 }, gates: [{ x: 1, y: 1 }], goal: { x: 2, y: 1 }, reqLen, reqInt,
        blocks: [], geese: [], falseGoals: [], filters: [], flippingFilters: [], portals: [], landmarks: [],
        mustPass: [], mustCross: [], designerName: '', description: '', difficulty: null, hints: [],
    };
}

const dir = mkdtempSync(path.join(tmpdir(), 'portfolio-solve-sweep-worker-test-'));
const corpusPath = path.join(dir, 'corpus.json');
writeFileSync(corpusPath, JSON.stringify([parityPreservingInfeasibleRawLevel()]));

let passed = 0;
async function test(name, fn) {
    try { await fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack || err.message}`); process.exitCode = 1; }
}

async function raceLevel(solveOpts) {
    const [{ result }] = await runWorkerPool({
        workerScript: 'scripts/portfolio-solve-sweep-worker.mjs',
        tasks: [{ corpusPath, levelNumber: 1, solveOpts, racePoolSize: 2 }],
        concurrency: 1,
    });
    return result;
}

await test('a canonical-only goalAttractionDisabledRetryBudgetFractionOverride reaches the raced solver through the worker', async () => {
    const result = await raceLevel({ timeBudgetMs: 500, goalAttractionDisabledRetryBudgetFractionOverride: 0 });
    assert.equal(result.ok, false);
    const diversityAttempts = (result.attempts || []).filter(a => a.stageId === 'goal-attraction-disabled-retry');
    assert.equal(diversityAttempts.length, 0,
        'goalAttractionDisabledRetryBudgetFractionOverride: 0 must suppress the raced diversity phase even when only the canonical field name is set (no legacy attractionDiversityBudgetFractionOverride)');
});

await test('without an override the raced diversity phase still runs (control for the test above)', async () => {
    const result = await raceLevel({ timeBudgetMs: 500 });
    assert.equal(result.ok, false);
    const diversityAttempts = (result.attempts || []).filter(a => a.stageId === 'goal-attraction-disabled-retry');
    assert.ok(diversityAttempts.length > 0, 'expected the raced diversity phase to run without a suppressing override');
});

await test('the repair budget override is preserved at both raced portfolio reconstruction boundaries', async () => {
    const parentSource = readFileSync('scripts/portfolio-solve-sweep.mjs', 'utf8');
    const workerSource = readFileSync('scripts/portfolio-solve-sweep-worker.mjs', 'utf8');
    const raceSource = readFileSync('scripts/solver-parallel/race.mjs', 'utf8');

    assert.match(parentSource,
        /repairAdditiveBudgetMultiplierOverride:\s*solveOpts\.repairAdditiveBudgetMultiplierOverride/,
        'the portfolio parent must include the override in its manually reconstructed raced solve options');
    assert.match(workerSource,
        /repairAdditiveBudgetMultiplierOverride:\s*solveOpts\.repairAdditiveBudgetMultiplierOverride/,
        'the forked worker must include the override in its nested race-pool solve options');
    assert.match(raceSource,
        /Number\(levelOpts\.repairAdditiveBudgetMultiplierOverride\)/,
        'the race pool must consume the same override field forwarded by the parent and worker');
});

await test('an explicit repair override controls the real worker-race repair allocation without sibling substitution', async () => {
    writeFileSync(corpusPath, JSON.stringify([repairEligibleInfeasibleRawLevel()]));
    const solveOpts = { timeBudgetMs: 1000, repairAdditiveBudgetMultiplierOverride: 3 };
    assert.equal('repairBudgetFraction' in solveOpts, false);
    assert.equal('legacyRepairBudgetFractionOverride' in solveOpts, false);

    const result = await raceLevel(solveOpts);
    assert.equal(result.ok, false);
    const repairAttempts = (result.attempts || []).filter(a => a.stageId === 'repair-fallback');
    assert.ok(repairAttempts.length > 0, 'repair-eligible fixture must reach the raced repair solver');
    for (const attempt of repairAttempts) {
        assert.ok(attempt.allocatedBudgetMs > 0 && attempt.allocatedBudgetMs <= 3000,
            `expected a positive remainder no larger than the supplied 3 × 1000ms repair allocation after dispatch elapsed time, got ${attempt.allocatedBudgetMs}`);
    }
});

await test('raw challenge metrics survive the real parent-worker-race transport and constrain the solve', async () => {
    writeFileSync(corpusPath, JSON.stringify([adjacentGoalRawLevel(1, 0)]));
    const control = await raceLevel({ timeBudgetMs: 500 });
    assert.equal(control.ok, true, 'adjacent goal is solvable with its transported length/intersection metrics');
    assert.equal(control.solution.length, 2, 'returned path includes gate plus the transported one-cell requirement');

    writeFileSync(corpusPath, JSON.stringify([adjacentGoalRawLevel(2, 0)]));
    const impossibleLength = await raceLevel({ timeBudgetMs: 500 });
    assert.equal(impossibleLength.ok, false, 'changing only transported reqLen changes the worker solve result');

    writeFileSync(corpusPath, JSON.stringify([adjacentGoalRawLevel(1, 1)]));
    const impossibleIntersection = await raceLevel({ timeBudgetMs: 500 });
    assert.equal(impossibleIntersection.ok, false, 'changing only transported reqInt changes the worker solve result');
});

console.log(`\nportfolio-solve-sweep-worker tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
