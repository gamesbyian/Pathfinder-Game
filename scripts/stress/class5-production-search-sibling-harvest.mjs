#!/usr/bin/env node
/**
 * Production-search-quality sibling constructor — the handoff gate named by
 * docs/solver-fresh-dead-sibling-harvest-preflight.md's result (reports/2026-09-17-fresh-dead-
 * sibling-harvest-result-001.md): a naive seeded goal-distance-greedy legal walk found 0/99 exact-
 * LIVE Class-5 siblings across every tested depth (including depth-fraction 0.1, ~8 steps from the
 * gate), while a gate-only CP-SAT feasibility check on the same parents confirmed real reachable
 * LIVE capacity the walk simply could not find — a construction-method artifact, not a residual-
 * structure finding. That result named the fix directly: "a materially better sibling-construction
 * method... using the real production search technique/scorer, not a naive heuristic walk."
 *
 * This uses the REAL production beam search unmodified (modules/solver/search.ts's
 * beamSearchFromGate, profile=intersectionHarvest, width=5000/BEAM.WIDE — the single most-tried
 * production beam config per modules/solver/attempts.ts) via its already-audited, already-tested
 * research-only pause/resume primitive (docs/solver-search-resumability.md: `pauseAfterPhases`,
 * `resumeFrom` — proven to reproduce uninterrupted execution exactly, see
 * reports/2026-09-03-beam-resumability-feasibility-pilot-001.md). No solver-internal code is
 * touched: this is a pure external caller of an existing, stable API, exactly the "instrumenting
 * the production dispatch to capture intermediate states" path the handoff report described,
 * minus needing to build it — it already exists for a different research line (beam continuation
 * pilots) and was simply never pointed at this problem.
 *
 * Design: for each parent, run ONE continuous beamSearchFromGate trajectory (profile/width fixed
 * throughout, matching how production actually runs a single beam attempt), pausing at each of the
 * SAME three depth-fraction checkpoints (0.35/0.55/0.75 of requiredLength) the naive walk used, by
 * chaining `resumeFrom` across checkpoints. At each pause the live frontier (every candidate path
 * the ACTUAL production coarse-state-merge/score-width cull retained at that depth — see search.ts
 * around its `pool.sort((a,b) => b.score-a.score)` cull) is captured; one candidate is drawn via a
 * seeded uniform pick over the frontier (neutral -- not the top-scored node specifically, so the
 * population is not biased toward whatever the scorer currently likes best) and reconstructed into
 * a full legal prefix by walking its parent-pointer chain (mirrors search.ts's own internal
 * `_reconstructBeamPath`, not exported, so reimplemented here from the same BeamNode.prev/.depth
 * contract).
 *
 * This differs structurally from the naive walk's per-checkpoint INDEPENDENT restarts: chaining
 * means a parent's three depth-fraction siblings share search ancestry (one real trajectory sampled
 * three times), not three unrelated walks. That is a deliberate, disclosed choice — it is what a
 * real production beam attempt actually does (one continuous run), and it is cheaper (one beam
 * run per parent instead of three) — but it means within-parent depth-fraction rows are not
 * independent draws the way the naive walk's were. The independent unit for any downstream
 * LIVE/DEAD analysis remains the PARENT, exactly as the preflight already requires.
 *
 * Parent selection is IDENTICAL to the naive walk's (same source population file, same seed,
 * same parent count) purely by reusing the same shuffle -- this is deliberate: holding the parent
 * set fixed isolates construction method as the only varying factor, giving a clean, directly
 * comparable side-by-side against the already-committed 75/75-DEAD naive population instead of a
 * fresh population whose difference could be attributed to parent variance instead.
 *
 * Three outcomes are possible at any checkpoint and are recorded distinctly, never silently merged:
 *   - solved: beamSearchFromGate returned a real solution before the checkpoint. Recorded and the
 *     parent's remaining checkpoints are skipped (no further frontier exists to sample).
 *   - naturally exhausted: the frontier collapsed to empty (cands.length === 0) before the
 *     checkpoint -- out.pausedContinuation is absent, out.timedOut === false. No further
 *     checkpoints are attempted for this parent.
 *   - paused (the normal case): out.pausedContinuation is populated; one sibling is drawn and the
 *     next checkpoint resumes from the full captured continuation (not from the drawn sibling
 *     alone -- the whole frontier's search state is what a real production run would carry).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class5-production-search-sibling-harvest.mjs -- \
 *     --population=reports/stress/class5-separator-census-population-2026-09-17.json \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --parents=25 --seed=class5-fresh-sibling-pilot-001 \
 *     --profile=intersectionHarvest --width=5000 \
 *     --out=reports/stress/class5-production-search-sibling-harvest-population-2026-09-17.json \
 *     --cases-out=reports/stress/class5-production-search-sibling-harvest-cases-2026-09-17.json
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const POPULATION_FILE = arg('population', 'reports/stress/class5-separator-census-population-2026-09-17.json');
const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const PARENT_COUNT = Number(arg('parents', 25));
const SEED = arg('seed', 'class5-fresh-sibling-pilot-001');
const DEPTH_FRACTIONS = (arg('depth-fractions', '0.35,0.55,0.75')).split(',').map(Number);
const PROFILE_NAME = arg('profile', 'intersectionHarvest');
const WIDTH = Number(arg('width', 5000));
const BUDGET_MS = Number(arg('budget-ms', 600_000));
const OUT_FILE = arg('out', null);
const CASES_OUT_FILE = arg('cases-out', null);

function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}
function mulberry32(seed) {
    let a = seed;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function seededRng(seedStr) { const h = xmur3(seedStr); return mulberry32(h()); }
function shuffleWithSeed(arr, seedStr) {
    const rng = seededRng(seedStr);
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

installBrowserStubs();
const Solver = createSolver();
const { prepLevel, beamSearchFromGate, SCORING_PROFILES } = SOLVER_TESTING_API;
const PROFILE = SCORING_PROFILES[PROFILE_NAME];
if (!PROFILE) { console.error(`Unknown profile: ${PROFILE_NAME}`); process.exit(1); }

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));
const population = readJson(POPULATION_FILE);
const corpusDoc = readJson(CORPUS_FILE);
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const corpusById = new Map(corpusRows.map((row) => [row.id, row]));

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

// Identical parent selection to the naive walk's (same population file, same seed key, same
// count) -- see this file's header for why holding the parent set fixed is deliberate.
const parentIds = shuffleWithSeed(population.ids, `${SEED}:parents`).slice(0, PARENT_COUNT);

/** Mirrors search.ts's own internal `_reconstructBeamPath` exactly (parent-pointer walk to a
 *  fresh array), since that helper is not exported for production use outside its own test seam. */
function reconstructBeamPath(node) {
    const len = node.depth + 1;
    const out = new Array(len);
    let cur = node;
    for (let i = len - 1; i >= 0; i--) {
        out[i] = cur.key;
        cur = cur.prev;
    }
    return out;
}

function pendingObligations(level, path) {
    // Replay the reconstructed path with a throwaway state to recover pending obligations exactly
    // like the naive walk's own pendingObligations helper did (same createState/applyMove
    // primitives), rather than trusting any bookkeeping field on the BeamNode itself.
    const { createState, applyMove } = SOLVER_TESTING_API;
    const prep = prepLevel(level);
    prep._cfg = null;
    const state = createState(path[0], level, prep);
    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const portal = level.portalMap.get(prev);
        const isJump = !!(portal && !state.lastWasPortalJump && portal.dest === path[i]);
        applyMove(path[i], state, level, prep, isJump);
    }
    const mustCrossPending = [];
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask >> i) & 1) mustCrossPending.push(level.mustCrossKeys[i]);
    }
    const mustPassPending = [];
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!((state.mpVisitedMask >> i) & 1)) mustPassPending.push(level.mustPassKeys[i]);
    }
    return { mustCrossPending, mustPassPending, currentIntersections: state.ints };
}

function freshPrep(level) {
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    return prep;
}

const rows = [];
const skipped = [];
const solvedDuringConstruction = [];

for (const levelId of parentIds) {
    const raw = corpusById.get(levelId);
    if (!raw) { skipped.push({ levelId, reason: 'missing-from-corpus' }); continue; }
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const gate = level.gateKeys[0];
    const prep = freshPrep(level);

    const checkpoints = DEPTH_FRACTIONS.map((f) => Math.max(1, Math.round(level.requiredLength * f)));
    let resumeFrom;
    let got = 0;
    let stoppedEarly = null;

    for (let ci = 0; ci < checkpoints.length; ci++) {
        const pauseAfterPhases = checkpoints[ci];
        const out = {};
        const result = await beamSearchFromGate(
            gate, level, prep, PROFILE, BUDGET_MS, Date.now(), null, WIDTH, null, false,
            out, Infinity, resumeFrom, pauseAfterPhases,
        );
        if (result) {
            solvedDuringConstruction.push({ levelId, atDepthFraction: DEPTH_FRACTIONS[ci], solutionLength: result.length });
            stoppedEarly = 'solved-during-construction';
            break;
        }
        if (!out.pausedContinuation) { stoppedEarly = 'naturally-exhausted'; break; }

        const frontier = out.pausedContinuation.frontier;
        const rng = seededRng(`${SEED}:${levelId}:sibling-pick:${ci}`);
        const pickIdx = Math.floor(rng() * frontier.length);
        const picked = frontier[pickIdx];
        const prefix = reconstructBeamPath(picked);
        const { mustCrossPending, mustPassPending, currentIntersections } = pendingObligations(level, prefix);

        rows.push({
            levelId,
            siblingIndex: ci,
            prefixLength: prefix.length,
            remainingLength: level.requiredLength - (prefix.length - 1),
            currentIntersections,
            remainingIntersections: Math.max(0, level.requiredIntersections - currentIntersections),
            mustCrossPendingCount: mustCrossPending.length,
            mustPassPendingCount: mustPassPending.length,
            mustCrossPending,
            mustPassPending,
            portals: level.portalMap.size,
            filters: level.filterMap.size,
            flippingFilters: level.flippingFilterMap.size,
            prefix,
            frontierSizeAtPick: frontier.length,
            beamNodeScore: picked.score,
            selectionReason: 'production-beam-search-frontier-pick(intersectionHarvest,width=5000,seeded-uniform)',
            stratum: `depth-fraction=${DEPTH_FRACTIONS[ci]}`,
            productionScoreRank: null,
        });
        got++;
        resumeFrom = out.pausedContinuation;
    }

    if (got === 0) skipped.push({ levelId, reason: stoppedEarly ?? 'no-sibling-reached-target-depth' });
    console.log(`  ${levelId}: ${got}/${checkpoints.length} siblings${stoppedEarly ? ` (stopped: ${stoppedEarly})` : ''}`);
}

const populationRecord = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'production-search-quality sibling construction -- frozen population, before exact labelling. Directly comparable to the naive-walk population (same 25 parents, same seed, same depth fractions) with construction method as the only deliberately varied factor.',
    sourceCommit,
    sourcePopulation: POPULATION_FILE,
    sourcePopulationCount: population.ids.length,
    corpus: CORPUS_FILE,
    seed: SEED,
    parentCount: PARENT_COUNT,
    depthFractions: DEPTH_FRACTIONS,
    profile: PROFILE_NAME,
    width: WIDTH,
    method: 'real production beamSearchFromGate (unmodified) chained across depth-fraction checkpoints via the audited resumeFrom/pauseAfterPhases research primitive (docs/solver-search-resumability.md); one sibling per checkpoint drawn by seeded-uniform pick over the actual captured frontier',
    parentIds,
    skipped,
    solvedDuringConstruction,
    siblingCount: rows.length,
    rows,
};

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(populationRecord, null, 1));
    console.log(`Wrote ${OUT_FILE} (${rows.length} sibling states, ${parentIds.length} parents, ${skipped.length} skipped, ${solvedDuringConstruction.length} solved-during-construction)`);
}

if (CASES_OUT_FILE) {
    const cases = rows.map((r) => ({
        id: `${r.levelId}:prod-sibling-${r.siblingIndex}`,
        levelId: r.levelId,
        prefix: r.prefix,
    }));
    const casesDoc = { corpus: CORPUS_FILE, cases };
    const abs2 = path.resolve(ROOT, CASES_OUT_FILE);
    mkdirSync(path.dirname(abs2), { recursive: true });
    writeFileSync(abs2, JSON.stringify(casesDoc, null, 1));
    console.log(`Wrote ${CASES_OUT_FILE} (${cases.length} CP-SAT cases)`);
}
