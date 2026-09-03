#!/usr/bin/env node
/**
 * Rung 3 of docs/solver-search-resumability.md's research ladder: "shared beam frontier among
 * multiple beam policies." Rung 2 (2026-09-03,
 * reports/2026-09-03-beam-policy-switch-complementarity-pilot-001.md) found a real, if small
 * (2/60 sampled levels), one-directional complementarity effect from a SINGLE A->B frontier
 * handoff. The doc's own framing of what a positive rung-2 result could support is explicit:
 *
 *   "It could support staged beam policies such as broad early exploration followed by specialist
 *   exploitation, or ALTERNATING OPERATORS WITHIN ONE FIXED WORK ENVELOPE."
 *
 * This script tests exactly that generalization: does REPEATEDLY alternating between two policies
 * on one continuously-evolving shared frontier add more value than either policy alone, or than a
 * single one-time switch (rung 2's own treatment)? This is the minimal extension from "one switch"
 * to "multiple policies sharing one frontier" -- do not read it as license to skip to N>2 policies
 * or non-alternating schedules before this simplest multi-segment form has a result.
 *
 * Five arms, one shared fixed work envelope W per level, sliced into segments of size S=W1 (reuses
 * rung 2's own calibrated split point as the segment size, for direct comparability):
 *   A-only@W        — policy A alone, full W (identical arm to rung 2's).
 *   B-only@W        — policy B alone, full W (identical arm to rung 2's).
 *   single switch    — policy A for one segment S, then policy B RESUMES from A's frontier for the
 *                      rest of W (rung 2's own treatment, recomputed here for a directly comparable
 *                      table rather than cross-referencing a separate run).
 *   alternating      — A for segment 1, B resumes for segment 2, A resumes for segment 3, ... on
 *                      ONE continuously-evolving shared frontier/prep, until solved, naturally
 *                      exhausted, or the full W is spent.
 *
 * Policies/width/segment-size/work envelope: identical to rung 2's calibrated values
 * (SCORING_PROFILES.intersectionHarvest / .objectiveFirst, beamWidth<=256 so
 * captureContinuationOnBudgetExit's top-of-loop capture is reachable -- see search.ts's own
 * "CAVEAT" comment -- W1=20,000-per-segment, W=300,000 total).
 *
 * Deliberately NOT a confirmation-grade sweep: reuses rung 2's own two independent 30-level
 * uniform corpus2 samples for direct level-by-level comparability with that result, rather than
 * drawing fresh levels.
 *
 * Usage (must run through the esbuild wrapper — see scripts/run-bundled.mjs's own header for why):
 *   node scripts/run-bundled.mjs scripts/beam-alternating-policy-schedule-pilot.mjs \
 *     --population=<path from scripts/stress/select-random-sample.mjs> \
 *     --work=300000 --width=200 --segment=20000 [--limit=N] [--out=path.json]
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
if (!POPULATION_FILE) { console.error('Usage: --population=<select-random-sample.mjs output> [--work=N] [--width=N] [--segment=N] [--limit=N] [--out=path.json]'); process.exit(1); }
// Same calibrated defaults as rung 2's pilot (see its own report's Finding 1/2) -- width<=256 is
// required for captureContinuationOnBudgetExit to ever land at the top-of-loop check instead of
// the separate mid-phase one; segment=20,000 sits safely below this population's surveyed
// natural-exhaustion range (~68,000-173,000 at width=200); work=300,000 gives 15 segments.
const W = Number(args.get('work') || 300_000);
const WIDTH = Number(args.get('width') || 200);
const SEGMENT = Number(args.get('segment') || 20_000);
const LIMIT = args.get('limit') ? Number(args.get('limit')) : Infinity;
const OUT = args.get('out');
const MAX_SEGMENTS = Math.ceil(W / SEGMENT);

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
const PROFILES = [SCORING_PROFILES[PROFILE_A_NAME], SCORING_PROFILES[PROFILE_B_NAME]];
const PROFILE_NAMES = [PROFILE_A_NAME, PROFILE_B_NAME];

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

// Runs a scheduled sequence of policies (one entry per segment, cycled) on ONE continuously-shared
// prep/frontier, each segment capped at a cumulative work ceiling `segmentIndex * segmentSize`
// (clamped to `totalWork`), stopping at the first solve, the first natural exhaustion (no
// continuation to carry forward), or once `totalWork` is reached. Rung 2's single switch is the
// degenerate two-segment case of this (schedule = [A, B], effectively capped at 2 segments by
// totalWork/segmentSize working out that way for this pilot's own parameters) -- this function
// generalizes it to run for as many segments as fit in totalWork.
async function runSchedule(level, gateKey, schedule, segmentSize, totalWork) {
    const prep = freshPrep(level);
    let continuation;
    let result = null;
    let segmentsRun = 0;
    let stoppedReason = 'exhausted-total-work';
    for (let i = 0; i < MAX_SEGMENTS; i++) {
        const cumulativeCap = Math.min((i + 1) * segmentSize, totalWork);
        const isFinalSegment = cumulativeCap >= totalWork;
        const profile = schedule[i % schedule.length];
        const stage = await runArm(level, gateKey, prep, profile, cumulativeCap, {
            resumeFrom: continuation,
            captureContinuationOnBudgetExit: !isFinalSegment,
        });
        segmentsRun = i + 1;
        if (stage.result !== null) { result = stage.result; stoppedReason = 'solved'; break; }
        if (isFinalSegment) { stoppedReason = 'exhausted-total-work'; break; }
        if (!stage.out.pausedContinuation) { stoppedReason = 'naturally-exhausted'; break; }
        continuation = stage.out.pausedContinuation;
    }
    return { result, workSpent: prep._workMeter.units, segmentsRun, stoppedReason };
}

async function runLevel(entry) {
    const rawEntry = getRawLevel(entry.corpus, entry.levelPos);
    const { id: _id, stressMeta: _sm, ...rawLevel } = rawEntry;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    if (level.gateKeys.length !== 1) return { levelId: entry.levelId, skipped: 'multi-gate' };
    const gateKey = level.gateKeys[0];

    const armA = await runArm(level, gateKey, freshPrep(level), PROFILES[0], W);
    const armB = await runArm(level, gateKey, freshPrep(level), PROFILES[1], W);
    // runSchedule cycles a schedule array via `i % schedule.length` -- passing the raw 2-element
    // PROFILES array for both this arm and the alternating one below would conflate them, so the
    // single-switch arm gets its own explicit schedule instead: segment 0 = A, every subsequent
    // segment = B (never switching back), matching rung 2 exactly.
    const singleSwitchSchedule = Array.from({ length: MAX_SEGMENTS }, (_, i) => PROFILES[i === 0 ? 0 : 1]);
    const singleSwitchArm = await runSchedule(level, gateKey, singleSwitchSchedule, SEGMENT, W);
    const alternatingArm = await runSchedule(level, gateKey, PROFILES, SEGMENT, W);

    // informative/liveHandoff mirror rung 2's own definitions exactly, both keyed off segment 1
    // (pure policy A, cap=SEGMENT) since every schedule variant here starts identically there.
    // runSchedule's loop only ever proceeds past segment 1 (segmentsRun > 1) when segment 1 itself
    // produced neither a solve nor a natural exhaustion -- i.e. a genuine cap-triggered handoff --
    // so segmentsRun alone (not the aggregate, whole-run stoppedReason, which reflects whichever
    // segment the run actually stopped at) is what to check here.
    const seg1Solved = singleSwitchArm.segmentsRun === 1 && singleSwitchArm.result !== null;
    const seg1LiveHandoff = !seg1Solved && singleSwitchArm.segmentsRun > 1;

    return {
        levelId: entry.levelId, corpus: entry.corpus, levelPos: entry.levelPos,
        requiredLength: level.requiredLength,
        informative: !seg1Solved,
        liveHandoff: seg1LiveHandoff,
        armA: { solved: armA.result !== null, workSpent: armA.workSpent },
        armB: { solved: armB.result !== null, workSpent: armB.workSpent },
        armSwitch: { solved: singleSwitchArm.result !== null, workSpent: singleSwitchArm.workSpent, segmentsRun: singleSwitchArm.segmentsRun, stoppedReason: singleSwitchArm.stoppedReason },
        armAlternating: { solved: alternatingArm.result !== null, workSpent: alternatingArm.workSpent, segmentsRun: alternatingArm.segmentsRun, stoppedReason: alternatingArm.stoppedReason },
    };
}

const population = JSON.parse(readFileSync(path.resolve(POPULATION_FILE), 'utf8'));
const rows = [];
let n = 0;
for (const entry of population) {
    if (n >= LIMIT) break;
    const t0 = Date.now();
    const row = await runLevel(entry);
    row.elapsedMs = Date.now() - t0;
    rows.push(row);
    n++;
    console.log(`[${n}/${Math.min(population.length, LIMIT)}] ${entry.levelId} ${row.skipped ? `SKIPPED (${row.skipped})` : `informative=${row.informative} liveHandoff=${row.liveHandoff} A=${row.armA.solved} B=${row.armB.solved} switch=${row.armSwitch.solved}/${row.armSwitch.segmentsRun}seg alternating=${row.armAlternating.solved}/${row.armAlternating.segmentsRun}seg`} (${row.elapsedMs}ms)`);
}

const usable = rows.filter(r => !r.skipped);
const liveHandoff = usable.filter(r => r.liveHandoff);
function tally(rows, key) { return rows.filter(r => r[key].solved).length; }
function onlyIn(rows, winnerKey, loserKeys) { return rows.filter(r => r[winnerKey].solved && loserKeys.every(k => !r[k].solved)).length; }
const summary = {
    work: W, width: WIDTH, segment: SEGMENT, maxSegments: MAX_SEGMENTS, profileA: PROFILE_NAMES[0], profileB: PROFILE_NAMES[1],
    population: population.length, usable: usable.length, skippedMultiGate: rows.length - usable.length,
    liveHandoff: liveHandoff.length,
    coverageAll: {
        armA: tally(usable, 'armA'), armB: tally(usable, 'armB'),
        armSwitch: tally(usable, 'armSwitch'), armAlternating: tally(usable, 'armAlternating'),
    },
    coverageLiveHandoff: {
        armA: tally(liveHandoff, 'armA'), armB: tally(liveHandoff, 'armB'),
        armSwitch: tally(liveHandoff, 'armSwitch'), armAlternating: tally(liveHandoff, 'armAlternating'),
        // The comparisons that actually answer rung 3's question: does alternating solve anything
        // NEITHER the single switch NOR either constituent alone can, and vice versa.
        alternatingOnlyWins: onlyIn(liveHandoff, 'armAlternating', ['armA', 'armB', 'armSwitch']),
        switchOnlyWins: onlyIn(liveHandoff, 'armSwitch', ['armA', 'armB', 'armAlternating']),
    },
};
console.log('\n=== Summary ===');
console.log(JSON.stringify(summary, null, 2));

if (OUT) {
    writeFileSync(path.resolve(OUT), JSON.stringify({ summary, rows }, null, 2));
    console.log(`\nWrote ${OUT}`);
}
