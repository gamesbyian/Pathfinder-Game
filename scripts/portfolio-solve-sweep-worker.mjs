#!/usr/bin/env node
// Portfolio-sweep worker: pure per-level compute. Hint saving stays in the main process.
// `racePoolSize > 0` lazily creates and reuses one nested raced-solver pool.
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { runWorkerMain } from './solver-worker-pool.mjs';
import { deserializePortfolioExperiment } from './portfolio-solve-sweep-lib.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const { createRacePool } = await import('./solver-parallel/race.mjs');
const Solver = createSolver();

const corpusCache = new Map();
function getRawLevels(corpusPath) {
    let levels = corpusCache.get(corpusPath);
    if (!levels) {
        const parsed = JSON.parse(readFileSync(corpusPath, 'utf8'));
        levels = Array.isArray(parsed) ? parsed : parsed.levels;
        corpusCache.set(corpusPath, levels);
    }
    return levels;
}

let racePool = null;
function getRacePool(poolSize) {
    if (!racePool) racePool = createRacePool({ poolSize });
    return racePool;
}

runWorkerMain(async (task) => {
    const { corpusPath, levelNumber, solveOpts, racePoolSize } = task;
    const rawLevels = getRawLevels(corpusPath);
    const raw = rawLevels[levelNumber - 1];
    const t0 = Date.now();
    let result;
    try {
        if (racePoolSize > 0) {
            const pool = getRacePool(racePoolSize);
            result = await pool.solveLevel(raw, {
                timeBudgetMs: solveOpts.timeBudgetMs,
                repairBudgetFractionOverride: solveOpts.repairBudgetFractionOverride,
                attractionDiversityBudgetFractionOverride: solveOpts.attractionDiversityBudgetFractionOverride,
                ablation: solveOpts.ablation, // race.mjs consumes levelOpts.ablation; thread it explicitly.
            });
        } else {
            const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
            const resolvedSolveOpts = solveOpts.portfolioExperiment
                ? { ...solveOpts, portfolioExperiment: deserializePortfolioExperiment(solveOpts.portfolioExperiment) }
                : solveOpts;
            result = await Solver.solve(level, resolvedSolveOpts);
        }
    } catch (err) {
        // Per-level solve errors are ordinary results; runWorkerMain errors are pool-fatal.
        result = { ok: false, status: 'error', error: err?.message ?? String(err), totalMs: Date.now() - t0, attempts: [] };
    }
    return { id: raw?.id ?? null, result };
}, async () => {
    if (racePool) await racePool.shutdown();
});
