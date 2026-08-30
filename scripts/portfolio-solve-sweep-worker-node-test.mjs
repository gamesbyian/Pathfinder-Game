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
        /repairBudgetFractionOverride:\s*solveOpts\.repairBudgetFractionOverride/,
        'the portfolio parent must include the override in its manually reconstructed raced solve options');
    assert.match(workerSource,
        /repairBudgetFractionOverride:\s*solveOpts\.repairBudgetFractionOverride/,
        'the forked worker must include the override in its nested race-pool solve options');
    assert.match(raceSource,
        /Number\(levelOpts\.repairBudgetFractionOverride\)/,
        'the race pool must consume the same override field forwarded by the parent and worker');
});

console.log(`\nportfolio-solve-sweep-worker tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
