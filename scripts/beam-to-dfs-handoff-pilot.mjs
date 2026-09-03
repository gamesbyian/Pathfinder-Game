#!/usr/bin/env node
/**
 * Rung 4 of docs/solver-search-resumability.md's research ladder: "bounded beam -> DFS handoff
 * from selected frontier states." Unlike rungs 1-3 (all beam-to-beam, same underlying
 * SolverSearchState/BeamNode representation), this is CROSS-METHOD state handoff: the doc's own
 * "Cross-method state handoff" section requires a typed contract covering which state is handed
 * off, how producer work is charged, whether the consumer can reconstruct state cheaply, and
 * whether the handoff is genuinely novel rather than cheaply rediscoverable. This script's design
 * answers each of those explicitly (see the comments below).
 *
 * The handoff mechanism: beamSearchFromGate's own live `ws` (a SolverSearchState — the SAME
 * representation dfsFromGate itself builds via createState/applyMove in search-state.ts; beam and
 * DFS differ only in search STRATEGY, not in state representation) is captured via
 * captureContinuationOnBudgetExit (rung 2's mechanism), then handed directly to a minimal external
 * DFS loop that starts walking depth-first from `ws`'s EXACT current position — no path replay, no
 * re-derivation, zero extra work charged for the handoff itself. This directly answers the doc's
 * "whether the consumer can reconstruct required internal state cheaply and exactly" (yes, for
 * free, because both search families already share one state representation) and "how work
 * already spent by the producer is charged" (via the same prep._workMeter.units used everywhere,
 * shared by reusing one prep across both stages, exactly like rungs 1-3).
 *
 * The external DFS loop (dfsFromStateOnce/dfsFromStateLDS below) is a deliberately minimal
 * reimplementation of dfsFromGate/dfsFromGateLDS's own logic (modules/solver/search.ts) — no debug
 * instrumentation, no cooperative yielding (this runs synchronously in a script, not the browser)
 * — built from SOLVER_TESTING_API's own exposed primitives (getNeighbors, applyMove, undoMove
 * [added this session specifically for this pilot], scoreAndSort, evaluatePrunedMove,
 * getRealLengthFromState) rather than duplicating dfsFromGate's internals or modifying dfsFromGate
 * itself to accept a resume state — the doc's own "do not build a general blackboard or universal
 * shared-state substrate from this possibility alone" argues against touching the hot,
 * heavily-tuned production DFS loop for a first bounded pilot. Plain best-first (no LDS) was tried
 * first and found unable to solve ANYTHING on this population even at 20,000,000 work — LDS is not
 * optional cosmetic fidelity here, it is what makes "DFS" a real technique on this corpus at all
 * (production DFS is exclusively reached via dfsFromGateLDS, never plain best-first).
 *
 * Five arms, one shared fixed work envelope W (default 300,000 work at width=200 was recalibrated
 * for beam-only/beam-vs-beam rungs 2-3; a much larger W is needed here — see the report — since
 * DFS/LDS needs far more work than beam to find anything at all), split W1=20,000/W2=W-W1 for the
 * beam stage (beamWidth<=256 still required for captureContinuationOnBudgetExit's top-of-loop
 * capture; see search.ts's own "CAVEAT" comment):
 *   beam-only@W       — beamSearchFromGate(intersectionHarvest) alone, full W.
 *   dfs-only@W        — dfsFromStateLDS(objectiveFirst) from a FRESH state at the gate, full W.
 *   fresh dfs-after-beam — beam for W1 (paid, then DISCARDED), DFS started FRESH FROM THE GATE
 *                          for the remaining W2. Isolates "does DFS need beam's specific residual
 *                          state, or would DFS do just as well with a smaller total budget."
 *   handoff (the treatment) — beam for W1, then DFS continues from beam's EXACT residual `ws` for
 *                          the remaining W2 — zero extra work charged for the handoff itself.
 *
 * Deliberately NOT a confirmation-grade sweep: reuses rung 2/3's exact two populations for direct
 * comparability, one bounded check, no further parameter sweep planned from this script alone.
 *
 * Usage (must run through the esbuild wrapper — see scripts/run-bundled.mjs's own header for why):
 *   node scripts/run-bundled.mjs scripts/beam-to-dfs-handoff-pilot.mjs \
 *     --population=<path from scripts/stress/select-random-sample.mjs> \
 *     --work=<see report for the calibrated value> --width=200 --w1=20000 [--limit=N] [--out=path.json]
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
if (!POPULATION_FILE) { console.error('Usage: --population=<select-random-sample.mjs output> [--work=N] [--width=N] [--w1=N] [--limit=N] [--out=path.json]'); process.exit(1); }
const W = Number(args.get('work') || 300_000);
const WIDTH = Number(args.get('width') || 200);
const W1 = Number(args.get('w1') || 20_000);
const LIMIT = args.get('limit') ? Number(args.get('limit')) : Infinity;
const OUT = args.get('out');

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
const { beamSearchFromGate, createState, getNeighbors, applyMove, undoMove, scoreAndSort, evaluatePrunedMove, getRealLengthFromState, prepLevel, SCORING_PROFILES } = SOLVER_TESTING_API;
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

const BEAM_PROFILE_NAME = 'intersectionHarvest';
const DFS_PROFILE_NAME = 'objectiveFirst';
const BEAM_PROFILE = SCORING_PROFILES[BEAM_PROFILE_NAME];
const DFS_PROFILE = SCORING_PROFILES[DFS_PROFILE_NAME];

function freshPrep(level) {
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    return prep;
}

// Minimal best-first DFS from an ARBITRARY already-positioned SolverSearchState `ws` (no debug
// instrumentation, no cooperative yielding). Mirrors dfsFromGate's own core loop (modules/solver/
// search.ts) closely enough to be a faithful comparison, built entirely from exposed primitives
// rather than touching dfsFromGate itself. The root stack frame's undoInfo is deliberately null
// (matching dfsFromGate's own root-frame convention) — when every child of `ws`'s starting
// position is exhausted, the loop stops rather than backtracking into whatever path led to that
// position, exactly the "DFS pays only for drilling deeper from the inherited state" contract the
// doc calls for. `maxDiscrepancy` supports the LDS ladder below (dfsFromGate's own LDS parameter,
// same semantics: a child costs its own index in discrepancies on top of its parent's).
//
// CRITICAL for composability with dfsFromStateLDS below: on a mid-search timeout, the function
// unwinds its ENTIRE stack (undoing every applied move) before returning, rather than leaving `ws`
// wherever the timeout happened to land. Without this, a caller running several bounded waves in
// sequence from the same `ws` (exactly what the LDS ladder does) would have each later wave
// silently start from a random partially-explored position instead of the true shared root —
// dfsFromGate itself never has this problem because every LDS probe wave gets its OWN fresh
// `createState`, but reusing one live inherited `ws` across waves is exactly this pilot's whole
// point, so the unwind has to be done explicitly here.
function dfsFromStateOnce(ws, level, prep, profile, workCap, maxDiscrepancy = Infinity) {
    prep._workCap = workCap;
    const startPos = ws.path[ws.path.length - 1];
    const rootChildren = getNeighbors(startPos, ws, level, prep);
    scoreAndSort(rootChildren, startPos, ws, level, prep, profile, null);
    const stack = [{ key: startPos, children: rootChildren, childIdx: 0, undoInfo: null, disc: 0 }];
    let nodesExpanded = 0;
    const unwind = () => { while (stack.length > 0) { const f = stack.pop(); if (f.undoInfo) undoMove(f.undoInfo, ws); } };
    while (stack.length > 0) {
        if (prep._workMeter.units >= prep._workCap) { unwind(); return { result: null, timedOut: true, nodesExpanded }; }
        const top = stack[stack.length - 1];
        if (top.childIdx >= top.children.length) {
            if (top.undoInfo) undoMove(top.undoInfo, ws);
            stack.pop();
            continue;
        }
        const ci = top.childIdx++;
        const childDisc = top.disc + ci;
        if (childDisc > maxDiscrepancy) { top.childIdx = top.children.length; continue; }
        const next = top.children[ci];
        const portal = level.portalMap.get(top.key);
        const isPortalJump = !!(portal && !ws.lastWasPortalJump && portal.dest === next);
        const undo = applyMove(next, ws, level, prep, isPortalJump);
        nodesExpanded++;
        const realLen = getRealLengthFromState(ws);
        const rSteps = level.requiredLength - realLen;
        const runConnectivity = rSteps <= 10 || (nodesExpanded & 63) === 0;
        const verdict = evaluatePrunedMove(next, realLen, ws, level, prep, null, runConnectivity);
        if (verdict === 'solution') return { result: ws.path.slice(), timedOut: false, nodesExpanded };
        if (verdict === 'reject') { undoMove(undo, ws); continue; }
        const nextNeighbors = getNeighbors(next, ws, level, prep);
        if (nextNeighbors.length === 0 && rSteps > 0) { undoMove(undo, ws); continue; }
        scoreAndSort(nextNeighbors, next, ws, level, prep, profile, null);
        stack.push({ key: next, children: nextNeighbors, childIdx: 0, undoInfo: undo, disc: childDisc });
    }
    return { result: null, timedOut: false, nodesExpanded };
}

// Minimal LDS wrapper mirroring dfsFromGateLDS's own two-phase shape (modules/solver/search.ts):
// a ladder of cheap discrepancy-bounded probe waves, then an unbounded best-first fallback with
// whatever work remains. dfsFromGateLDS is NOT reused directly (it always starts a fresh
// createState from a startKey, with no resume parameter) — real production DFS is exclusively
// reached via this LDS wrapper, not plain unbounded best-first, so testing "DFS" without it would
// be comparing against a much weaker baseline than production ever actually runs, not a fair
// proxy. Uses WORK (not dfsFromGateLDS's node-count) as the shared probe-ladder currency, matching
// every other budget in this whole research thread; the probe/final split (30%/70%) is a
// disclosed, uncalibrated choice for this pilot, not dfsFromGateLDS's own tuned 0.6 constant
// (which is sized for wall-clock ms budgets at a different scale).
const LDS_PROBE_K = [0, 1, 2, 4, 8];
const LDS_PROBE_FRACTION = 0.3;
// `workCap` here is a DELTA (how much MORE work this call may spend on top of prep's current
// prep._workMeter.units), NOT an absolute ceiling like dfsFromStateOnce's own `workCap` param —
// found the hard way: the first version of this pilot passed the full remaining total budget `W`
// here for the handoff arm even though `prep` already carried workSpentA from the beam stage,
// silently letting that arm spend W + workSpentA in total instead of W. Callers reusing a prep
// that already has spend on it (the handoff arm) must pass the REMAINING budget, not the total.
function dfsFromStateLDS(ws, level, prep, profile, workCap) {
    const workBefore = prep._workMeter.units;
    const probeCeiling = workBefore + Math.floor(workCap * LDS_PROBE_FRACTION);
    for (const k of LDS_PROBE_K) {
        if (prep._workMeter.units >= probeCeiling) break;
        const stage = dfsFromStateOnce(ws, level, prep, profile, probeCeiling, k);
        if (stage.result) return stage;
        if (stage.timedOut) break; // shared probe ceiling reached -- stop the ladder, protect the unbounded wave's share
    }
    return dfsFromStateOnce(ws, level, prep, profile, workBefore + workCap, Infinity);
}

async function runLevel(entry) {
    const rawEntry = getRawLevel(entry.corpus, entry.levelPos);
    const { id: _id, stressMeta: _sm, ...rawLevel } = rawEntry;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    if (level.gateKeys.length !== 1) return { levelId: entry.levelId, skipped: 'multi-gate' };
    const gateKey = level.gateKeys[0];

    // beam-only@W
    const beamPrep = freshPrep(level);
    beamPrep._workCap = W;
    const beamOut = {};
    const beamResult = await beamSearchFromGate(gateKey, level, beamPrep, BEAM_PROFILE, 600_000, Date.now(), null, WIDTH, null, false, beamOut, Infinity);
    const armBeam = { solved: beamResult !== null, workSpent: beamPrep._workMeter.units };

    // dfs-only@W — a fresh state at the gate.
    const dfsPrep = freshPrep(level);
    const dfsWs = createState(gateKey, level, dfsPrep);
    const dfsOnly = dfsFromStateLDS(dfsWs, level, dfsPrep, DFS_PROFILE, W);
    const armDfs = { solved: dfsOnly.result !== null, workSpent: dfsPrep._workMeter.units };

    // Stage 1: beam for W1, capturing a genuine cap-triggered continuation (not natural exhaustion).
    const stagePrep = freshPrep(level);
    stagePrep._workCap = W1;
    const stageOut = {};
    const stageResult = await beamSearchFromGate(gateKey, level, stagePrep, BEAM_PROFILE, 600_000, Date.now(), null, WIDTH, null, false, stageOut, Infinity, undefined, undefined, true);
    const alreadySolvedByW1 = stageResult !== null;
    const workSpentA = stagePrep._workMeter.units;
    const liveHandoff = !alreadySolvedByW1 && !!stageOut.pausedContinuation;

    let armFreshDfs, armHandoff;
    if (alreadySolvedByW1) {
        armFreshDfs = { solved: true, workSpent: workSpentA };
        armHandoff = { solved: true, workSpent: workSpentA };
    } else if (!liveHandoff) {
        // Beam exhausted naturally before W1 -- nothing to hand off. Both arms degrade to "no
        // further search possible on this path"; report as unsolved with beam's own natural cost.
        armFreshDfs = { solved: false, workSpent: workSpentA };
        armHandoff = { solved: false, workSpent: workSpentA };
    } else {
        const remaining = Math.max(0, W - workSpentA);
        const freshDfsPrep = freshPrep(level);
        const freshDfsWs = createState(gateKey, level, freshDfsPrep);
        const freshDfsStage = dfsFromStateLDS(freshDfsWs, level, freshDfsPrep, DFS_PROFILE, remaining);
        armFreshDfs = { solved: freshDfsStage.result !== null, workSpent: workSpentA + freshDfsPrep._workMeter.units };

        // dfsFromStateLDS's own workCap is a DELTA added to the prep's current workMeter.units
        // (see its own comment) -- stagePrep already carries workSpentA from stage 1, so passing
        // `remaining` (not `W`) here keeps the handoff arm's TOTAL absolute spend at W, matching
        // every other arm's envelope exactly instead of silently overshooting to W + workSpentA.
        const continuation = stageOut.pausedContinuation;
        const handoffStage = dfsFromStateLDS(continuation.ws, level, stagePrep, DFS_PROFILE, remaining);
        armHandoff = { solved: handoffStage.result !== null, workSpent: stagePrep._workMeter.units };
    }

    return {
        levelId: entry.levelId, corpus: entry.corpus, levelPos: entry.levelPos,
        requiredLength: level.requiredLength,
        informative: !alreadySolvedByW1, liveHandoff, workSpentA,
        armBeam, armDfs, armFreshDfs, armHandoff,
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
    console.log(`[${n}/${Math.min(population.length, LIMIT)}] ${entry.levelId} ${row.skipped ? `SKIPPED (${row.skipped})` : `informative=${row.informative} liveHandoff=${row.liveHandoff} beam=${row.armBeam.solved} dfs=${row.armDfs.solved} freshDfs=${row.armFreshDfs.solved}/${row.armFreshDfs.workSpent} handoff=${row.armHandoff.solved}/${row.armHandoff.workSpent}`} (${row.elapsedMs}ms)`);
}

const usable = rows.filter(r => !r.skipped);
const liveHandoff = usable.filter(r => r.liveHandoff);
function tally(rows, key) { return rows.filter(r => r[key].solved).length; }
function onlyIn(rows, winnerKey, loserKeys) { return rows.filter(r => r[winnerKey].solved && loserKeys.every(k => !r[k].solved)).length; }
const summary = {
    work: W, width: WIDTH, w1: W1, beamProfile: BEAM_PROFILE_NAME, dfsProfile: DFS_PROFILE_NAME,
    population: population.length, usable: usable.length, skippedMultiGate: rows.length - usable.length,
    liveHandoff: liveHandoff.length,
    coverageAll: {
        armBeam: tally(usable, 'armBeam'), armDfs: tally(usable, 'armDfs'),
        armFreshDfs: tally(usable, 'armFreshDfs'), armHandoff: tally(usable, 'armHandoff'),
    },
    coverageLiveHandoff: {
        armBeam: tally(liveHandoff, 'armBeam'), armDfs: tally(liveHandoff, 'armDfs'),
        armFreshDfs: tally(liveHandoff, 'armFreshDfs'), armHandoff: tally(liveHandoff, 'armHandoff'),
        handoffOnlyWins: onlyIn(liveHandoff, 'armHandoff', ['armBeam', 'armDfs', 'armFreshDfs']),
        freshDfsOnlyWins: onlyIn(liveHandoff, 'armFreshDfs', ['armBeam', 'armDfs', 'armHandoff']),
    },
};
console.log('\n=== Summary ===');
console.log(JSON.stringify(summary, null, 2));

if (OUT) {
    writeFileSync(path.resolve(OUT), JSON.stringify({ summary, rows }, null, 2));
    console.log(`\nWrote ${OUT}`);
}
