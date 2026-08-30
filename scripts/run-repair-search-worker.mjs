#!/usr/bin/env node
/** Worker process for run-repair-search.mjs's --races mode. Pure compute: prepares the level
 *  and runs one repairSearchFromGate call with the given seedSalt, returns solution or failure
 *  diagnostics. */
import { readFileSync } from 'node:fs';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { runWorkerMain } from './solver-worker-pool.mjs';

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const { prepLevel } = await import('../modules/solver/prep.js');
const { repairSearchFromGate } = await import('../modules/solver/repair-search.js');
const { SCORING_PROFILES } = await import('../modules/solver/policy.js');
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
    const { corpusPath, levelNumber, gateIndex, budgetMs, nodeBudget, mustTurnBiased, seedSalt } = task;
    const rawLevels = getRawLevels(corpusPath);
    const raw = rawLevels[levelNumber - 1];
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const gateKey = level.gateKeys[gateIndex];
    const profile = SCORING_PROFILES.repair ?? SCORING_PROFILES.default;
    const prep = prepLevel(level);
    prep._metrics = { nodesExpanded: 0 };
    const out = {};
    const start = Date.now();
    const solution = await repairSearchFromGate(
        gateKey, level, prep, profile, budgetMs, start, null, null, !!mustTurnBiased,
        Number.isFinite(nodeBudget) ? nodeBudget : Infinity, out, seedSalt,
    );
    return { solution, elapsedMs: Date.now() - start, nodesExpanded: out.nodesExpanded ?? null, bestBadness: out.bestBadness ?? null };
});
