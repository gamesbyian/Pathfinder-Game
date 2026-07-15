#!/usr/bin/env node
/** Worker process for portfolio-solve-sweep.mjs's --workers mode (scripts/solver-worker-pool.mjs).
 *  Pure compute: prepares and solves one level per task, returns the raw SolveResult. Never
 *  touches the hints corpus — hint-saving stays single-threaded in the main process (see
 *  portfolio-solve-sweep.mjs) so concurrent workers can never race on the same hint file.
 *
 *  When a task carries racePoolSize > 0 (composed cross-level + within-level parallelism — see
 *  docs/solver-architecture.md's "Fast portfolio scheduler experiment" section), this worker
 *  lazily creates ONE persistent scripts/solver-parallel/race.mjs pool of worker_threads on its
 *  first task and reuses it for every subsequent level it's dispatched, instead of calling
 *  Solver.solve() directly — same spin-up-cost rationale as race.mjs's own module doc. Only valid
 *  for schedulerMode 'legacy' (enforced by the main script before tasks are ever built). */
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { runWorkerMain } from './solver-worker-pool.mjs';
import { deserializePortfolioExperiment } from './portfolio-solve-sweep-lib.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/Solver.js');
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
    let result;
    if (racePoolSize > 0) {
        const pool = getRacePool(racePoolSize);
        result = await pool.solveLevel(raw, { timeBudgetMs: solveOpts.timeBudgetMs, repairBudgetFractionOverride: solveOpts.repairBudgetFractionOverride });
    } else {
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
        const resolvedSolveOpts = solveOpts.portfolioExperiment
            ? { ...solveOpts, portfolioExperiment: deserializePortfolioExperiment(solveOpts.portfolioExperiment) }
            : solveOpts;
        result = await Solver.solve(level, resolvedSolveOpts);
    }
    return { id: raw?.id ?? null, result };
}, async () => {
    if (racePool) await racePool.shutdown();
});
