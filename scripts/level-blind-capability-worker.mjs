#!/usr/bin/env node
/** Dedicated worker for level-blind capability measurement.
 *
 * The parent supplies a temporary mechanics-only corpus with exact-level identity/history removed.
 * This worker deliberately does not accept a level id/position for solver preparation: every raw
 * level is normalized with no corpus identity, then solved from its puzzle mechanics alone.
 */
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { runWorkerMain } from './solver-worker-pool.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();
const corpusCache = new Map();

function corpusAt(file) {
    let levels = corpusCache.get(file);
    if (!levels) {
        const parsed = JSON.parse(readFileSync(file, 'utf8'));
        levels = Array.isArray(parsed) ? parsed : parsed.levels;
        if (!Array.isArray(levels)) throw new Error(`${file}: expected level array`);
        corpusCache.set(file, levels);
    }
    return levels;
}

runWorkerMain(async ({ solveCorpusPath, levelIndex, solveOpts }) => {
    const raw = corpusAt(solveCorpusPath)[levelIndex];
    if (!raw) throw new Error(`level-blind worker: missing level index ${levelIndex}`);
    // No opts.levelNumber / level id: normalized solver identity is constant/anonymous rather than
    // a corpus-position signal that a future seed/order policy could accidentally exploit.
    const prepared = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const result = await Solver.solveLevel(prepared, solveOpts);
    if (result?.ok && Array.isArray(result.solution) && result.solution.length > 0) {
        result.refereeValid = Solver.validateCandidatePath(prepared, result.solution).ok;
    }
    return { result };
});
