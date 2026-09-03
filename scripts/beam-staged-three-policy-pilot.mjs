#!/usr/bin/env node
/**
 * Follow-up to rung 3 of docs/solver-search-resumability.md's research ladder ("shared beam
 * frontier among multiple beam policies"). Rung 3's cyclic 2-policy form
 * (reports/2026-09-03-beam-alternating-policy-schedule-pilot-001.md) closed negative across a
 * 12x segment-size range: repeating [A, B, A, B, ...] never beat a single A->B switch. This
 * script tests the doc's OTHER suggested shape instead of another cyclic variant: a STAGED,
 * non-cyclic schedule — broad exploration, then a first specialist, then a second specialist,
 * never returning to an earlier policy — using a genuine THIRD scoring profile so this is not
 * just rung 2's own A->B switch again.
 *
 * Policies: SCORING_PROFILES.intersectionHarvest (A), .objectiveFirst (B), .perimeterSweep (C) —
 * C is weight-distinct from A/B (perimeterBiasWeight 2.05 vs 1.15/1.1 — see modules/solver/
 * policy.ts) and is itself a real, named, production-used beam config (beam('perimeterSweep',
 * BEAM.STANDARD, perimeterCCW), modules/solver/attempts.ts).
 *
 * Five arms, one shared fixed work envelope W=300,000 per level, segments of S=20,000 (same
 * calibration as rung 2/3 — beamWidth<=256 required for captureContinuationOnBudgetExit's
 * top-of-loop capture to be reachable; see search.ts's own "CAVEAT" comment):
 *   A-only@W / B-only@W / C-only@W — each policy alone, full W.
 *   two-stage switch  — segment 1 = A, every remaining segment = B (rung 2's own treatment,
 *                       recomputed here for a directly comparable table).
 *   three-stage staged — segment 1 = A, segment 2 = B, every remaining segment = C. Never
 *                        returns to A or B — this is the "broad exploration, then specialist,
 *                        then a second specialist" shape, not cyclic alternation.
 *
 * Question: does the third stage (C) solve anything the two-stage switch (which already gets to
 * use the full W, just without ever trying C) could not?
 *
 * Deliberately NOT a confirmation-grade sweep: one bounded check, same two populations already
 * used for rungs 2/3 for direct comparability, no further parameter sweep planned from this
 * script alone.
 *
 * Usage (must run through the esbuild wrapper — see scripts/run-bundled.mjs's own header for why):
 *   node scripts/run-bundled.mjs scripts/beam-staged-three-policy-pilot.mjs \
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

const NAMES = ['intersectionHarvest', 'objectiveFirst', 'perimeterSweep'];
const [A, B, C] = NAMES.map(n => SCORING_PROFILES[n]);

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

// Same runSchedule shape as beam-alternating-policy-schedule-pilot.mjs: walks a fixed per-segment
// policy list (NOT cycled here — schedule.length === MAX_SEGMENTS, one explicit entry per
// segment) on one continuously-shared prep/frontier.
async function runSchedule(level, gateKey, schedule, segmentSize, totalWork) {
    const prep = freshPrep(level);
    let continuation, result = null, segmentsRun = 0;
    for (let i = 0; i < MAX_SEGMENTS; i++) {
        const cumulativeCap = Math.min((i + 1) * segmentSize, totalWork);
        const isFinalSegment = cumulativeCap >= totalWork;
        const stage = await runArm(level, gateKey, prep, schedule[i], cumulativeCap, {
            resumeFrom: continuation,
            captureContinuationOnBudgetExit: !isFinalSegment,
        });
        segmentsRun = i + 1;
        if (stage.result !== null) { result = stage.result; break; }
        if (isFinalSegment || !stage.out.pausedContinuation) break;
        continuation = stage.out.pausedContinuation;
    }
    return { result, workSpent: prep._workMeter.units, segmentsRun };
}

async function runLevel(entry) {
    const rawEntry = getRawLevel(entry.corpus, entry.levelPos);
    const { id: _id, stressMeta: _sm, ...rawLevel } = rawEntry;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    if (level.gateKeys.length !== 1) return { levelId: entry.levelId, skipped: 'multi-gate' };
    const gateKey = level.gateKeys[0];

    const armA = await runArm(level, gateKey, freshPrep(level), A, W);
    const armB = await runArm(level, gateKey, freshPrep(level), B, W);
    const armC = await runArm(level, gateKey, freshPrep(level), C, W);

    const twoStageSchedule = Array.from({ length: MAX_SEGMENTS }, (_, i) => (i === 0 ? A : B));
    const threeStageSchedule = Array.from({ length: MAX_SEGMENTS }, (_, i) => (i === 0 ? A : i === 1 ? B : C));
    const twoStage = await runSchedule(level, gateKey, twoStageSchedule, SEGMENT, W);
    const threeStage = await runSchedule(level, gateKey, threeStageSchedule, SEGMENT, W);

    return {
        levelId: entry.levelId, corpus: entry.corpus, levelPos: entry.levelPos,
        armA: { solved: armA.result !== null }, armB: { solved: armB.result !== null }, armC: { solved: armC.result !== null },
        twoStage: { solved: twoStage.result !== null, workSpent: twoStage.workSpent, segmentsRun: twoStage.segmentsRun },
        threeStage: { solved: threeStage.result !== null, workSpent: threeStage.workSpent, segmentsRun: threeStage.segmentsRun },
    };
}

const population = JSON.parse(readFileSync(path.resolve(POPULATION_FILE), 'utf8'));
const rows = [];
let n = 0;
for (const entry of population) {
    if (n >= LIMIT) break;
    const row = await runLevel(entry);
    rows.push(row);
    n++;
    console.log(`[${n}/${Math.min(population.length, LIMIT)}] ${entry.levelId} ${row.skipped ? `SKIPPED (${row.skipped})` : `A=${row.armA.solved} B=${row.armB.solved} C=${row.armC.solved} twoStage=${row.twoStage.solved}/${row.twoStage.segmentsRun}seg threeStage=${row.threeStage.solved}/${row.threeStage.segmentsRun}seg`}`);
}

const usable = rows.filter(r => !r.skipped);
function tally(rows, key) { return rows.filter(r => r[key].solved).length; }
function onlyIn(rows, winnerKey, loserKeys) { return rows.filter(r => r[winnerKey].solved && loserKeys.every(k => !r[k].solved)).length; }
const summary = {
    work: W, width: WIDTH, segment: SEGMENT, profiles: NAMES,
    population: population.length, usable: usable.length,
    coverage: { armA: tally(usable, 'armA'), armB: tally(usable, 'armB'), armC: tally(usable, 'armC'), twoStage: tally(usable, 'twoStage'), threeStage: tally(usable, 'threeStage') },
    threeStageOnlyWins: onlyIn(usable, 'threeStage', ['armA', 'armB', 'armC', 'twoStage']),
    twoStageOnlyWins: onlyIn(usable, 'twoStage', ['armA', 'armB', 'armC', 'threeStage']),
};
console.log('\n=== Summary ===');
console.log(JSON.stringify(summary, null, 2));

if (OUT) {
    writeFileSync(path.resolve(OUT), JSON.stringify({ summary, rows }, null, 2));
    console.log(`\nWrote ${OUT}`);
}
