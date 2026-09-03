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
// Defaults calibrated (see reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md's
// "Finding 1"/"Finding 2") rather than guessed:
// - width=200 (<=256): captureContinuationOnBudgetExit can only ever land at the top-of-loop
//   check, never the separate mid-phase one (every 256 frontier nodes, independent of the work
//   cap's size) -- see search.ts's own "CAVEAT" comment on beamSearchFromGate. beamWidth=200 keeps
//   every organically-grown phase under that 256 threshold; the real named production configs use
//   beamWidth=5000/2000 (BEAM.WIDE/BEAM.STANDARD), which this pilot cannot use as-is without that
//   mid-phase check silently swallowing every capture attempt.
// - w1=20,000: a direct uncapped-run survey across 10 of this population's un-easy levels (both
//   profiles) found natural exhaustion (frontier collapses to empty, `cands.length === 0 break`)
//   between ~68,000 and ~173,000 work units at width=200 -- comfortably above 20,000, so a smaller
//   population than surveyed landing below that floor is the main residual risk, not the norm.
// - work=300,000: 15x w1, comfortably above every surveyed exhaustion point too, so A-only/B-only
//   at the full envelope are close to each policy's own natural (uncapped) ceiling rather than an
//   arbitrary truncation.
const W = Number(args.get('work') || 300_000);
const WIDTH = Number(args.get('width') || 200);
const LIMIT = args.get('limit') ? Number(args.get('limit')) : Infinity;
const OUT = args.get('out');
// W1 (the switch point) defaults to a value found (see above) to sit safely below observed
// natural-exhaustion points at the default width -- pass a smaller/larger --w1 to recalibrate for
// a different width or population. Always clamped to <= W/2 (runLevel takes the min).
const W1_OVERRIDE = args.get('w1') ? Number(args.get('w1')) : 20_000;

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

    const W1 = Math.min(W1_OVERRIDE, Math.floor(W / 2));
    const prepAB = freshPrep(level);
    const stage1 = await runArm(level, gateKey, prepAB, PROFILE_A, W1, { captureContinuationOnBudgetExit: true });
    const alreadySolvedByW1 = stage1.result !== null;
    // A genuine handoff requires the work cap to have actually fired WHILE the frontier was still
    // alive (out.pausedContinuation populated) -- NOT that A merely failed to solve. A's own search
    // can naturally exhaust (frontier collapses to empty, the unrelated `cands.length === 0 break`
    // exit) well before ever reaching W1, in which case there is nothing left to hand off and a
    // "resumed" run degrades silently into an ordinary fresh-from-gate run on whatever work remains
    // -- see reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md's "Finding 1" for
    // the calibration run that discovered this the hard way.
    const liveHandoff = !alreadySolvedByW1 && !!stage1.out.pausedContinuation;

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
        liveHandoff,
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
    console.log(`[${n}/${Math.min(population.length, LIMIT)}] ${entry.levelId} ${row.skipped ? `SKIPPED (${row.skipped})` : `informative=${row.informative} liveHandoff=${row.liveHandoff} workSpentA=${row.workSpentA} A=${row.armA.solved} B=${row.armB.solved} fresh=${row.armFresh.solved}/${row.armFresh.workSpent} resumed=${row.armResumed.solved}/${row.armResumed.workSpent}`} (${row.elapsedMs}ms)`);
}

const usable = rows.filter(r => !r.skipped);
const informative = usable.filter(r => r.informative);
const liveHandoff = usable.filter(r => r.liveHandoff);
const naturallyExhausted = informative.filter(r => !r.liveHandoff);
function tally(rows, key) { return rows.filter(r => r[key].solved).length; }
function fewerFreshThanResumed(rows) { return rows.filter(r => r.armFresh.solved && !r.armResumed.solved).length; }
function fewerResumedThanFresh(rows) { return rows.filter(r => r.armResumed.solved && !r.armFresh.solved).length; }
const summary = {
    work: W, width: WIDTH, w1Override: W1_OVERRIDE, profileA: PROFILE_A_NAME, profileB: PROFILE_B_NAME,
    population: population.length, usable: usable.length, skippedMultiGate: rows.length - usable.length,
    // informative: A did not already solve within W1. liveHandoff (the subset that actually tests
    // anything): additionally, the work cap genuinely fired while A's frontier was still alive, not
    // via natural exhaustion (see runLevel's own comment on why the two are not the same thing).
    informative: informative.length,
    liveHandoff: liveHandoff.length,
    naturallyExhaustedBeforeW1: naturallyExhausted.length,
    coverageAll: {
        armA: tally(usable, 'armA'), armB: tally(usable, 'armB'),
        armFresh: tally(usable, 'armFresh'), armResumed: tally(usable, 'armResumed'),
    },
    coverageLiveHandoff: {
        armA: tally(liveHandoff, 'armA'), armB: tally(liveHandoff, 'armB'),
        armFresh: tally(liveHandoff, 'armFresh'), armResumed: tally(liveHandoff, 'armResumed'),
        resumedWonWhereFreshDidnt: fewerFreshThanResumed(liveHandoff),
        freshWonWhereResumedDidnt: fewerResumedThanFresh(liveHandoff),
    },
};
console.log('\n=== Summary ===');
console.log(JSON.stringify(summary, null, 2));

if (OUT) {
    writeFileSync(path.resolve(OUT), JSON.stringify({ summary, rows }, null, 2));
    console.log(`\nWrote ${OUT}`);
}
