#!/usr/bin/env node
/**
 * Witness-trace divergence report.
 *
 * Every stress-corpus level (both data/stress/stress-levels.json and
 * stress-levels-random.json) is constructed from a hidden witness path
 * (stressMeta.witnessSolution) that is withheld from the solver at solve time. This replays
 * that witness move-by-move through the REAL search-core primitives (getNeighbors/scoreAndSort/
 * applyMove — the exact code the production DFS/beam/repair search runs, not a reimplementation)
 * and measures how far each witness move is from what the solver's own scoring would have
 * picked greedily. This is the technique that explained the batch-B cluster (S030/S042/etc. —
 * see data/stress/README.md's "Future solver work" section, "cumulative discrepancy 22/35") but
 * was a one-off, not-checked-in diagnostic at the time; this is that technique made reusable and
 * batchable, so it can run over all 1700 currently-unsolved random-corpus levels cheaply — it's
 * a pure replay (no search/backtracking), not a solve, so it costs nothing like a real budget.
 *
 * Per level, reports:
 *   - cumulativeDiscrepancy: sum over every witness step of that move's rank among scored
 *     candidates (0 = greedy-best). High = the witness repeatedly needed a locally-"worse"
 *     move than the solver's own scoring would pick — the combinatorial-wall signature.
 *   - maxStepRank / meanStepRank: worst single step / average.
 *   - invalidAtStep: index of the first witness move that ISN'T even offered by getNeighbors at
 *     that point (or null). This is NOT a difficulty signal — it means the witness and the
 *     solver's search-core disagree about move legality, which should never happen for a
 *     validly-constructed level and is worth its own investigation if it ever fires.
 *   - finalStateIsSolution: sanity check (should always be true).
 *
 * Uses only POLICY_PROFILES.default / no structural template — a single common baseline for
 * comparability across the whole corpus, not the exact profile/template mix a real solve
 * attempt would use for that level's features.
 *
 * Run via the esbuild wrapper (imports TS modules):
 *   node scripts/run-bundled.mjs scripts/stress/witness-divergence.mjs
 *       [--corpus=data/stress/stress-levels-random.json] [--levels=R0001,id:1-50]
 *       [--filter-mechanic=mustCross,portalPairs] [--out=reports/stress/witness-divergence-random.json] [--top=30]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { selectLevelsBySpec } from '../level-data-io.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const OUT_FILE = args.get('--out') || 'reports/stress/witness-divergence-random.json';
const LEVEL_SPEC = args.get('--levels') || null;
const FILTER_MECHANIC = args.get('--filter-mechanic') || null;
const TOP_N = Number(args.get('--top') || 30);

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const Solver = createSolver();
const { prepLevel, createState, getNeighbors, applyMove, scoreAndSort, isSolutionState, POLICY_PROFILES, PACK } = SOLVER_TESTING_API;

/** --filter-mechanic=<name>[,<name>...] (docs/solver-dev-tooling-plan.md Component C): keeps only
 *  levels touching ANY of the named mechanics (stressMeta.mechanicCounts), no new computation. */
function filterByMechanic(levels) {
    if (!FILTER_MECHANIC) return levels;
    const names = FILTER_MECHANIC.split(',').map(s => s.trim()).filter(Boolean);
    return levels.filter(l => names.some(name => (l.stressMeta?.mechanicCounts?.[name] ?? 0) > 0));
}

function traceWitness(entry) {
    const { id, stressMeta, ...raw } = entry;
    const witness = stressMeta?.witnessSolution;
    if (!Array.isArray(witness) || witness.length < 2) {
        return { id, error: 'missing or trivial witnessSolution' };
    }
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = prepLevel(level);
    const keys = witness.map(([x, y]) => PACK(x - 1, y - 1));
    const profile = POLICY_PROFILES.default;

    const state = createState(keys[0], level, prep);
    let cumulativeDiscrepancy = 0;
    let maxStepRank = 0;
    let scoredSteps = 0;
    let invalidAtStep = null;

    for (let i = 1; i < keys.length; i++) {
        const pos = state.path[state.path.length - 1];
        const nextKey = keys[i];
        const neighbors = getNeighbors(pos, state, level, prep);
        if (!neighbors.includes(nextKey)) {
            if (invalidAtStep === null) invalidAtStep = i;
            // Still walk forward using the real applyMove so the rest of the trace stays
            // meaningful (rare/expected only if this fires at all) — portal-jump detection
            // below still applies.
        } else if (neighbors.length > 1) {
            scoreAndSort(neighbors, pos, state, level, prep, profile, null);
            const rank = neighbors.indexOf(nextKey);
            cumulativeDiscrepancy += rank;
            if (rank > maxStepRank) maxStepRank = rank;
            scoredSteps++;
        }
        const portalEntry = level.portalMap.get(pos);
        const isPortalJump = !!(portalEntry && portalEntry.dest === nextKey);
        applyMove(nextKey, state, level, prep, isPortalJump);
    }

    return {
        id,
        steps: keys.length - 1,
        cumulativeDiscrepancy,
        maxStepRank,
        meanStepRank: scoredSteps > 0 ? Number((cumulativeDiscrepancy / scoredSteps).toFixed(3)) : 0,
        invalidAtStep,
        finalStateIsSolution: isSolutionState(state, level),
        mechanicCounts: stressMeta?.mechanicCounts ?? null,
        navDensity: stressMeta?.navDensity ?? null,
    };
}

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const levels = filterByMechanic(selectLevelsBySpec(corpusLevels, LEVEL_SPEC));
console.log(`Witness-divergence trace: ${levels.length} level(s), corpus ${CORPUS_FILE} (v${corpus.generatorVersion}).`);

const results = [];
let invalidCount = 0, nonSolutionCount = 0, errorCount = 0;
for (const entry of levels) {
    let r;
    try { r = traceWitness(entry); }
    catch (err) { r = { id: entry.id, error: err?.message ?? String(err) }; }
    if (r.error) errorCount++;
    else {
        if (r.invalidAtStep !== null) invalidCount++;
        if (!r.finalStateIsSolution) nonSolutionCount++;
    }
    results.push(r);
}

results.sort((a, b) => (b.cumulativeDiscrepancy ?? -1) - (a.cumulativeDiscrepancy ?? -1));

console.log(`\nTraced ${results.length}: ${errorCount} error(s), ${invalidCount} with an invalid witness step, ` +
    `${nonSolutionCount} whose final state isn't isSolutionState (should be 0).`);
console.log(`\nTop ${Math.min(TOP_N, results.length)} by cumulative discrepancy (hardest-looking first):`);
for (const r of results.slice(0, TOP_N)) {
    if (r.error) { console.log(`  ${r.id} ERROR — ${r.error}`); continue; }
    console.log(`  ${r.id}  discrepancy=${r.cumulativeDiscrepancy}  maxStep=${r.maxStepRank}  ` +
        `mean=${r.meanStepRank}  steps=${r.steps}` +
        (r.invalidAtStep !== null ? `  !! invalid witness step at ${r.invalidAtStep}` : '') +
        (!r.finalStateIsSolution ? '  !! final state not isSolutionState' : ''));
}

mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({
    corpus: CORPUS_FILE,
    generatedAt: new Date().toISOString(),
    profile: 'default (no structural template) — a common baseline, not each level\'s real attempt policy',
    total: results.length,
    errors: errorCount,
    invalidWitnessSteps: invalidCount,
    nonSolutionFinalStates: nonSolutionCount,
    results,
}, null, 2) + '\n');
console.log(`\nWrote ${OUT_FILE}`);
