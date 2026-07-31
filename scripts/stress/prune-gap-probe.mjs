#!/usr/bin/env node
/**
 * Localises the solver's MISSING GLOBAL INFERENCE, by asking one question at every decision point
 * along a known solution: of the branches our prune gauntlet lets through, how many were already
 * provably dead?
 *
 * WHY THIS QUESTION. Three results now line up (reports/2026-07-31-cpsat-encoding-bug-and-external-
 * hints.md): move ordering is NOT the deficit on the failing population (68.1% first-choice accuracy
 * unsolved vs 65.1% solved), CP-SAT solves several of those levels in 24-40s once its encoding is
 * fixed, and our solver still burns its whole node budget on them. Good local ordering plus no
 * global propagation still loses. So the gap is not "which child do we try first" but "which
 * subtrees do we enter at all" — and that is measurable rather than arguable.
 *
 * METHOD. Walk a stored, referee-valid solution. At each sampled decision point, take every
 * alternative move `getNeighbors` offers (i.e. every sibling of the solution's own next move) and
 * cross two facts:
 *   1. does OUR gauntlet prune it?  -> modules/solver/prune-gauntlet.ts's evaluatePrunedMove, the
 *      real function dfsFromGate calls, not a reimplementation of it.
 *   2. is it ACTUALLY dead?         -> cpsat-full-probe.py --prefix=<path+alt>, asking whether any
 *      valid completion exists from that partial path.
 * which gives a 2x2:
 *   dead + pruned    our prunes are doing their job
 *   dead + PASSED    THE GAP: search enters a subtree with no solution in it
 *   alive + pruned   UNSOUND PRUNE — a correctness bug, and this probe is a free audit for it
 *   alive + passed   correct behaviour, genuinely has to be searched
 *
 * An oracle timeout is reported as UNKNOWN and excluded from the table. It is not "alive": treating
 * an indeterminate result as a negative is exactly the mistake docs/solver-budget-determinism.md
 * warns about for deadlineTruncated runs.
 *
 * SCOPE. Needs the CP-SAT model, so it inherits its scope: no portals / filters / flipping filters.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/prune-gap-probe.mjs -- \
 *     --level=R00044 [--every=6] [--oracle-limit=45] [--out=reports/stress/prune-gap-R00044.json]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/Solver.ts';
import { evaluatePrunedMove } from '../../modules/solver/prune-gauntlet.ts';
import { undoMove } from '../../modules/solver/search-state.ts';
import { getRealLengthFromState } from '../../modules/solver/solution.ts';
import { UNPACK } from '../../modules/domain/cell-key.ts';

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, createState, getNeighbors, applyMove } = SOLVER_TESTING_API;

const root = (() => {
    let d = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(d, 'package.json')) && path.dirname(d) !== d) d = path.dirname(d);
    return d;
})();
const CORPUS = path.join(root, 'data/stress/stress-levels-random.json');
const PROBE = path.join(root, 'scripts/stress/cpsat-full-probe.py');

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const levelId = arg('level', null);
if (!levelId) { console.error('--level=<id> is required.'); process.exit(1); }
const every = Number(arg('every', '6'));
const oracleLimit = Number(arg('oracle-limit', '45'));
const outFile = arg('out', null);

const levels = readLevelsWithHints(CORPUS);
const idx = levels.findIndex(l => l.id === levelId);
if (idx < 0) { console.error(`${levelId}: not in the corpus.`); process.exit(1); }
const raw = levels[idx];
const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: idx + 1 });
const prep = prepLevel(level);
prep._cfg = null;                 // production defaults: every prune enabled (see normalizeAblationConfig's doc)
prep._metrics = { nodesExpanded: 0 };

// Walk a stored, referee-valid solution. Any one will do — the oracle question is about the
// prefix, not about which solution reaches it — but a real solution guarantees the prefix is alive.
const solution = (raw.hintRecords || [])[0]?.path;
if (!solution) { console.error(`${levelId}: no stored hint to walk.`); process.exit(1); }
const xy = k => { const p = UNPACK(k); return [p.x + 1, p.y + 1]; };   // probe wants 1-indexed pairs

/** cpsat-full-probe.py as a prefix-feasibility oracle. Returns 'dead' | 'alive' | 'unknown'. */
function oracle(prefixKeys) {
    try {
        const out = execFileSync('python3',
            [PROBE, levelId, String(oracleLimit), `--prefix=${JSON.stringify(prefixKeys.map(xy))}`],
            { encoding: 'utf8', cwd: root, maxBuffer: 1 << 28, timeout: (oracleLimit + 90) * 1000 });
        if (/-> INFEASIBLE/.test(out)) return 'dead';
        if (/-> (OPTIMAL|FEASIBLE)/.test(out)) return 'alive';
        return 'unknown';
    } catch { return 'unknown'; }
}

console.log(`${levelId}: reqLen=${level.reqLen} reqInt=${level.reqInt} solution=${solution.length} nodes; sampling every ${every} steps, oracle limit ${oracleLimit}s`);

const state = createState(solution[0], level, prep);
const tally = { deadPruned: 0, deadPassed: 0, alivePruned: 0,alivePassed: 0, unknown: 0 };
const gaps = [], unsound = [];

for (let step = 1; step < solution.length; step++) {
    const pos = solution[step - 1];
    const nextOnPath = solution[step];

    if ((step - 1) % every === 0) {
        for (const alt of getNeighbors(pos, state, level, prep)) {
            if (alt === nextOnPath) continue;
            const pAtPos = level.portalMap.get(pos);
            const isJump = !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === alt);
            const undo = applyMove(alt, state, level, prep, isJump);
            // runConnectivity: true — ask for the strongest verdict the gauntlet can give, so a
            // "passed" here is a genuine miss rather than an artifact of the search's own
            // every-8-steps connectivity schedule.
            const verdict = evaluatePrunedMove(alt, getRealLengthFromState(state), state, level, prep, null, true);
            undoMove(undo, state);

            const pruned = verdict === 'reject';
            const truth = oracle([...solution.slice(0, step), alt]);
            if (truth === 'unknown') { tally.unknown++; continue; }
            if (truth === 'dead' && pruned) tally.deadPruned++;
            else if (truth === 'dead' && !pruned) { tally.deadPassed++; gaps.push({ step, from: xy(pos), alt: xy(alt) }); }
            else if (truth === 'alive' && pruned) { tally.alivePruned++; unsound.push({ step, from: xy(pos), alt: xy(alt) }); }
            else tally.alivePassed++;
        }
        const done = tally.deadPruned + tally.deadPassed + tally.alivePruned + tally.alivePassed;
        console.log(`  step ${step}/${solution.length - 1}: classified ${done}, gap ${tally.deadPassed}, unsound ${tally.alivePruned}, unknown ${tally.unknown}`);
    }

    const pAtPos = level.portalMap.get(pos);
    applyMove(nextOnPath, state, level, prep, !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === nextOnPath));
}

const dead = tally.deadPruned + tally.deadPassed;
console.log(`\n${levelId} prune-gap:`);
console.log(`  dead branches:  ${dead}  (pruned ${tally.deadPruned}, MISSED ${tally.deadPassed}${dead ? ` — ${(100 * tally.deadPassed / dead).toFixed(0)}% of dead branches entered` : ''})`);
console.log(`  alive branches: ${tally.alivePruned + tally.alivePassed}  (passed ${tally.alivePassed}, WRONGLY PRUNED ${tally.alivePruned})`);
console.log(`  oracle unknown: ${tally.unknown} (excluded)`);
if (unsound.length) console.log(`  !! UNSOUND PRUNE on ${unsound.length} branch(es): ${JSON.stringify(unsound.slice(0, 5))}`);

if (outFile) {
    const abs = path.resolve(root, outFile);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify({ level: levelId, every, oracleLimit, tally, gaps, unsound }, null, 1));
    console.log(`Wrote ${outFile}`);
}
