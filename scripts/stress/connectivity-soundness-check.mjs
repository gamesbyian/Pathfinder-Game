#!/usr/bin/env node
/**
 * Differential soundness gate for the connectivity prune.
 *
 * A prune is unsound if it can reject a state from which a solution is still reachable. Every
 * stored hint is a referee-valid solution, so EVERY prefix of one is a state with a known valid
 * completion — and `isConnected` must therefore return true at every one of them. If it ever
 * returns false, the prune would have cut a reachable solution out of the search.
 *
 * That makes the whole hint corpus a soundness oracle: tens of thousands of real solution prefixes
 * across all three corpora, for free. This is the rigor CLAUDE.md requires of any new prune on
 * solver state — the MST scratch-buffer bug and the unsound nogood signature are both in exactly
 * this class, and both looked fine until differentially tested.
 *
 * Added with PRUNE_CONNECTIVITY_AXIS_EXHAUSTED (treating both-axes-spent cells as walls in the
 * flood fill), but it is not specific to that flag: run it after ANY change to topology.ts.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/connectivity-soundness-check.mjs [-- --corpus=...]
 * Exits non-zero on the first unsound state found, printing the level, hint index and step.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.ts';
import { isConnected } from '../../modules/solver/topology.ts';

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, createState, applyMove } = SOLVER_TESTING_API;

const root = (() => {
    let d = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(d, 'package.json')) && path.dirname(d) !== d) d = path.dirname(d);
    return d;
})();

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const corpora = arg('corpus', 'data/levels.json,data/stress/stress-levels.json,data/stress/stress-levels-random.json')
    .split(',').map(s => s.trim()).filter(Boolean);

let checkedPaths = 0, checkedStates = 0, violations = 0;
const failures = [];

for (const rel of corpora) {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) { console.log(`(skipping ${rel} — not present)`); continue; }
    const levels = readLevelsWithHints(abs);
    let corpusPaths = 0, corpusStates = 0;

    levels.forEach((raw, i) => {
        const records = raw.hintRecords || [];
        if (records.length === 0) return;
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: i + 1 });
        const prep = prepLevel(level);
        prep._cfg = null;                       // production defaults: prune enabled
        prep._metrics = { nodesExpanded: 0 };

        for (let hi = 0; hi < records.length; hi++) {
            const p = records[hi].path;
            if (!Array.isArray(p) || p.length < 2) continue;
            const st = createState(p[0], level, prep);
            corpusPaths++;
            // Stop before the final node: once the path is complete there is nothing left to
            // connect to, and isConnected is never consulted at a finished state by the search.
            for (let s = 1; s < p.length - 1; s++) {
                const from = p[s - 1];
                const portal = level.portalMap.get(from);
                const isJump = !!(portal && !st.lastWasPortalJump && portal.dest === p[s]);
                applyMove(p[s], st, level, prep, isJump);
                corpusStates++;
                if (!isConnected(p[s], st, level, prep)) {
                    violations++;
                    if (failures.length < 10) failures.push({ corpus: rel, level: raw.id ?? i + 1, hint: hi, step: s });
                }
            }
        }
    });
    checkedPaths += corpusPaths; checkedStates += corpusStates;
    console.log(`${rel}: ${corpusPaths} solution paths, ${corpusStates} prefix states`);
}

console.log(`\nTotal: ${checkedPaths} paths, ${checkedStates} states with a known valid completion.`);
if (violations > 0) {
    console.error(`UNSOUND: isConnected rejected ${violations} state(s) that lie on a valid solution.`);
    for (const f of failures) console.error(`  ${f.corpus} level ${f.level} hint#${f.hint} step ${f.step}`);
    process.exit(1);
}
console.log('SOUND: the connectivity prune never rejected a state on a known-valid solution.');
