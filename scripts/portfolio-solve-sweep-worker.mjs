#!/usr/bin/env node
/** Worker process for portfolio-solve-sweep.mjs's --workers mode (scripts/solver-worker-pool.mjs).
 *  Pure compute: prepares and solves one level per task, returns the raw SolveResult. Never
 *  touches the hints corpus — hint-saving stays single-threaded in the main process (see
 *  portfolio-solve-sweep.mjs) so concurrent workers can never race on the same hint file. */
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { runWorkerMain } from './solver-worker-pool.mjs';
import { deserializePortfolioExperiment } from './portfolio-solve-sweep-lib.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/Solver.js');
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

runWorkerMain(async (task) => {
    const { corpusPath, levelNumber, solveOpts } = task;
    const rawLevels = getRawLevels(corpusPath);
    const raw = rawLevels[levelNumber - 1];
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const resolvedSolveOpts = solveOpts.portfolioExperiment
        ? { ...solveOpts, portfolioExperiment: deserializePortfolioExperiment(solveOpts.portfolioExperiment) }
        : solveOpts;
    const result = await Solver.solve(level, resolvedSolveOpts);
    return { id: raw?.id ?? null, result };
});
