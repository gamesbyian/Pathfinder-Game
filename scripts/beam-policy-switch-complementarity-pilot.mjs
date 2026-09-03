#!/usr/bin/env node
/**
 * Rung 2 of docs/solver-search-resumability.md's research ladder: "same beam frontier, changed
 * beam policy: fixed-work complementarity test." Rung 1 (2026-09-03,
 * reports/2026-09-03-beam-resumability-feasibility-pilot-001.md) proved beamSearchFromGate's
 * resumeFrom/pauseAfterPhases/captureContinuationOnBudgetExit mechanism reproduces an
 * uninterrupted SAME-policy run exactly. This script asks the doc's own rung-2 question for a
 * CHANGED policy (scoring profile only, holding orderingBias/width/retention fixed):
 *
 *   Does policy B add more value when inheriting policy A's frontier than either A or B obtains
 *   by spending the same total work from the gate?
 *
 * Four arms, one shared fixed work envelope W per level, split W1=W/2 / W2=W-W1:
 *   A-only@W       — policy A alone, full W.
 *   B-only@W       — policy B alone, full W.
 *   fresh A-then-B — policy A for W1 (paid, then DISCARDED), policy B started FRESH FROM THE GATE
 *                    for the remaining W2. Isolates "does B need A's frontier, or would B do just
 *                    as well only having a smaller total budget."
 *   resumed A->B   — policy A for W1, then policy B RESUMES from A's actual paused frontier for W2
 *                    (the treatment).
 *
 * Policies: SCORING_PROFILES.intersectionHarvest and .objectiveFirst — the same two named,
 * production-used beam configs referenced throughout docs/solver-optimization-workstreams.md
 * (beam:objectiveFirst@beam5000 / beam:intersectionHarvest@beam5000), here at a shared bounded
 * width for a fast local pilot rather than production's 5000. orderingBias=null,
 * mechanicBucketRetention=false for both arms in every stage — this is a pure "future-expansion
 * scoring" switch, not a mechanism/retention change, matching the doc's own "possible switches"
 * list (scoring profile is item 1).
 *
 * Deliberately NOT a confirmation-grade sweep: this is a first, bounded, local development-tier
 * pilot (uniform seeded sample from corpus2, no mechanic/regime gating per
 * docs/solver-scheduling-policy.md's "use select-random-sample.mjs ... for a portfolio-cardinality
 * question that is not scoped to a particular mechanic/regime"). All corpus2 levels are
 * single-gate (verified against data/stress/stress-levels-random.json before writing this), so no
 * multi-gate budget-splitting logic is needed.
 *
 * Usage (must run through the esbuild wrapper — see scripts/run-bundled.mjs's own header for why):
 *   node scripts/run-bundled.mjs scripts/beam-policy-switch-complementarity-pilot.mjs \
 *     --population=<path from scripts/stress/select-random-sample.mjs> \
 *     --work=2000000 --width=2000 [--limit=N] [--out=path.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k.replace(/^--/, ''), v.join('=')];
}));

const POPULATION_FILE = args.get('population');
if (!POPULATION_FILE) { console.error('Usage: --population=<select-random-sample.mjs output> [--work=N] [--width=N] [--limit=N] [--out=path.json]'); process.exit(1); }
const W = Number(args.get('work') || 2_000_000);
const WIDTH = Number(args.get('width') || 2000);
const LIMIT = args.get('limit') ? Number(args.get('limit')) : Infinity;
const OUT = args.get('out');

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
const { beamSearchFromGate, prepLevel, SCORING_PROFILES } = SOLVER_TESTING_API;
const Solver = createSolver();

const CORPUS_FILES = { published: 'data/levels.json', corpus1: 'data/stress/stress-levels.json', corpus2: 'data/stress/stress-levels-random.json' };
const corpusCache = new Map();
function getRawLevel(corpus, pos) {
    if (!corpusCache.has(corpus)) {
        const raw = JSON.parse(readFileSync(path.resolve(CORPUS_FILES[corpus]), 'utf8'));
        corpusCache.set(corpus, Array.isArray(raw) ? raw : raw.levels);
    }
    return corpusCache.get(corpus)[pos - 1];
}

const PROFILE_A_NAME = 'intersectionHarvest';
const PROFILE_B_NAME = 'objectiveFirst';
const PROFILE_A = SCORING_PROFILES[PROFILE_A_NAME];
const PROFILE_B = SCORING_PROFILES[PROFILE_B_NAME];

function freshPrep(level) {
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    return prep;
}

async function runArm(level, gateKey, prep, profile, workCap, opts = {}) {
    prep._workCap = workCap;
    const out = {};
    const result = await beamSearchFromGate(
        gateKey, level, prep, profile, 600_000, Date.now(), null, WIDTH, null, false,
        out, Infinity, opts.resumeFrom, undefined, opts.captureContinuationOnBudgetExit,
    );
    return { result, out, workSpent: prep._workMeter.units };
}

async function runLevel(population, entry) {
    const rawEntry = getRawLevel(entry.corpus, entry.levelPos);
    const { id: _id, stressMeta: _sm, ...rawLevel } = rawEntry;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    if (level.gateKeys.length !== 1) return { levelId: entry.levelId, skipped: 'multi-gate' };
    const gateKey = level.gateKeys[0];

    const armA = await runArm(level, gateKey, freshPrep(level), PROFILE_A, W);
    const armB = await runArm(level, gateKey, freshPrep(level), PROFILE_B, W);

    const W1 = Math.floor(W / 2);
    const prepAB = freshPrep(level);
    const stage1 = await runArm(level, gateKey, prepAB, PROFILE_A, W1, { captureContinuationOnBudgetExit: true });
    const alreadySolvedByW1 = stage1.result !== null;

    let armFresh, armResumed, workSpentA;
    if (alreadySolvedByW1) {
        workSpentA = stage1.workSpent;
        armFresh = { result: stage1.result, workSpent: stage1.workSpent };
        armResumed = { result: stage1.result, workSpent: stage1.workSpent };
    } else {
        workSpentA = stage1.workSpent;
        const remaining = Math.max(0, W - workSpentA);
        const freshPrepB = freshPrep(level);
        const freshStage = await runArm(level, gateKey, freshPrepB, PROFILE_B, remaining);
        armFresh = { result: freshStage.result, workSpent: workSpentA + freshStage.workSpent };

        const resumedStage = await runArm(level, gateKey, prepAB, PROFILE_B, W, { resumeFrom: stage1.out.pausedContinuation });
        armResumed = { result: resumedStage.result, workSpent: resumedStage.workSpent };
    }

    return {
        levelId: entry.levelId, corpus: entry.corpus, levelPos: entry.levelPos,
        requiredLength: level.requiredLength,
        informative: !alreadySolvedByW1,
        workSpentA,
        armA: { solved: armA.result !== null, workSpent: armA.workSpent },
        armB: { solved: armB.result !== null, workSpent: armB.workSpent },
        armFresh: { solved: armFresh.result !== null, workSpent: armFresh.workSpent },
        armResumed: { solved: armResumed.result !== null, workSpent: armResumed.workSpent },
    };
}

const population = JSON.parse(readFileSync(path.resolve(POPULATION_FILE), 'utf8'));
const rows = [];
let n = 0;
for (const entry of population) {
    if (n >= LIMIT) break;
    const t0 = Date.now();
    const row = await runLevel(population, entry);
    row.elapsedMs = Date.now() - t0;
    rows.push(row);
    n++;
    console.log(`[${n}/${Math.min(population.length, LIMIT)}] ${entry.levelId} ${row.skipped ? `SKIPPED (${row.skipped})` : `informative=${row.informative} A=${row.armA.solved} B=${row.armB.solved} fresh=${row.armFresh.solved} resumed=${row.armResumed.solved}`} (${row.elapsedMs}ms)`);
}

const usable = rows.filter(r => !r.skipped);
const informative = usable.filter(r => r.informative);
function tally(rows, key) { return rows.filter(r => r[key].solved).length; }
const summary = {
    work: W, width: WIDTH, profileA: PROFILE_A_NAME, profileB: PROFILE_B_NAME,
    population: population.length, usable: usable.length, skippedMultiGate: rows.length - usable.length,
    informative: informative.length,
    coverageAll: {
        armA: tally(usable, 'armA'), armB: tally(usable, 'armB'),
        armFresh: tally(usable, 'armFresh'), armResumed: tally(usable, 'armResumed'),
    },
    coverageInformative: {
        armA: tally(informative, 'armA'), armB: tally(informative, 'armB'),
        armFresh: tally(informative, 'armFresh'), armResumed: tally(informative, 'armResumed'),
    },
};
console.log('\n=== Summary ===');
console.log(JSON.stringify(summary, null, 2));

if (OUT) {
    writeFileSync(path.resolve(OUT), JSON.stringify({ summary, rows }, null, 2));
    console.log(`\nWrote ${OUT}`);
}
