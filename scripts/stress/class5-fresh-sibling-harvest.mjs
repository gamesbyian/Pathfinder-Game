#!/usr/bin/env node
/**
 * Fresh exact LIVE/DEAD sibling harvest — per
 * docs/solver-fresh-dead-sibling-harvest-preflight.md. Selects parent levels from the frozen
 * current Class-5 residual (before any exact label is computed), then constructs sibling prefixes
 * via a bounded, seeded, goal-distance-guided legal walk: at every step, prefer the legal neighbor
 * (via the real `getNeighbors`/`applyMove`, so every move obeys full mechanic legality) that most
 * reduces BFS distance-to-goal (`buildDistMap`, the same sound generic primitive `search.ts`'s own
 * guidance uses), breaking ties and occasionally deviating via a per-siblingindex seeded RNG so
 * repeated runs on the same parent diverge into genuinely different siblings; backtracks on a
 * local dead-end up to a bounded node budget. This is NOT the production scorer/search technique —
 * it is a small, self-contained, fully-legal generic walk whose only purpose is to produce
 * realistic in-progress states for exact labelling, per the preflight's construction requirement.
 *
 * Selection/construction is entirely neutral to exact outcome: parents are chosen by a fixed seed
 * from the frozen residual list, sibling walks stop at a FIXED depth fraction of requiredLength
 * decided before any label is computed, and nothing here inspects CP-SAT results to pick further
 * candidates (see docs/solver-fresh-dead-sibling-harvest-preflight.md's selection contract).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/class5-fresh-sibling-harvest.mjs -- \
 *     --population=reports/stress/class5-separator-census-population-2026-09-17.json \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --parents=20 --siblings-per-parent=3 --seed=class5-fresh-sibling-pilot-001 \
 *     --out=reports/stress/class5-fresh-sibling-harvest-population-2026-09-17.json \
 *     --cases-out=reports/stress/class5-fresh-sibling-harvest-cases-2026-09-17.json
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { buildDistMap } from '../../modules/solver/distance.js';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const POPULATION_FILE = arg('population', 'reports/stress/class5-separator-census-population-2026-09-17.json');
const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const PARENT_COUNT = Number(arg('parents', 20));
const SIBLINGS_PER_PARENT = Number(arg('siblings-per-parent', 3));
const SEED = arg('seed', 'class5-fresh-sibling-pilot-001');
// Multiple fixed depth-fraction checkpoints (not one), so within-parent siblings span shallow
// (more likely LIVE) to deep (more likely DEAD) without conditioning on any observed label --
// per the preflight's requirement to permit both outcomes within one parent.
const DEPTH_FRACTIONS = (arg('depth-fractions', '0.35,0.55,0.75')).split(',').map(Number);
const NODE_BUDGET = Number(arg('node-budget', 4000));
const OUT_FILE = arg('out', null);
const CASES_OUT_FILE = arg('cases-out', null);

// Deterministic xmur3+sfc32 seeded RNG — self-contained, no dependency, reproducible per seed string.
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
const { prepLevel, createState, getNeighbors, applyMove, undoMove } = SOLVER_TESTING_API;

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));
const population = readJson(POPULATION_FILE);
const corpusDoc = readJson(CORPUS_FILE);
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const corpusById = new Map(corpusRows.map((row) => [row.id, row]));

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

// Parent selection: seeded shuffle of the frozen residual id list, take the first N. Neutral to
// any label/outcome -- purely a function of the frozen id list and the fixed seed string.
const parentIds = shuffleWithSeed(population.ids, `${SEED}:parents`).slice(0, PARENT_COUNT);

function pendingObligations(level, state) {
    const mustCrossPending = [];
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask >> i) & 1) mustCrossPending.push(level.mustCrossKeys[i]);
    }
    const mustPassPending = [];
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!((state.mpVisitedMask >> i) & 1)) mustPassPending.push(level.mustPassKeys[i]);
    }
    return { mustCrossPending, mustPassPending };
}

function walkOneSibling(levelId, raw, level, prep, distMap, siblingIndex, depthFraction) {
    const rng = seededRng(`${SEED}:${levelId}:${siblingIndex}`);
    const targetDepth = Math.max(1, Math.round(level.requiredLength * depthFraction));
    const gate = level.gateKeys[0];
    const state = createState(gate, level, prep);
    const path = [gate];
    let nodes = 0;
    let reachedTargetDepth = false;

    function distTo(k) { return distMap.get(k) ?? Infinity; }

    function dfs(depth) {
        if (depth >= targetDepth) { reachedTargetDepth = true; return true; }
        if (nodes++ > NODE_BUDGET) return false;
        const pos = path[path.length - 1];
        const pAtPos = level.portalMap.get(pos);
        let candidates = getNeighbors(pos, state, level, prep);
        if (candidates.length === 0) return false;
        // Sort by goal-distance (ascending) with a seeded random jitter, so the walk is
        // heuristically forward-making but not identical across sibling indices. A move that would
        // create an intersection (revisiting an already-visited non-goal/non-gate cell, mirroring
        // search-state.ts's own wasIntAdded rule) is heavily deprioritized -- an intersection-blind
        // greedy walk burns the level's fixed intersection budget early and manufactures spurious
        // DEAD outcomes late (observed in an initial pilot: 15/15 siblings DEAD at depth-fraction
        // 0.6 before this penalty existed), which is a construction artifact, not a real signal.
        candidates = candidates
            .map((c) => {
                const wouldAddInt = state.visited[c] > 0 && c !== level.goalKey && !prep.gateFlags[c];
                return { c, key: distTo(c) - rng() * 2 + (wouldAddInt ? 1000 : 0) };
            })
            .sort((a, b) => a.key - b.key)
            .map((e) => e.c);
        for (const next of candidates) {
            const isJump = !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === next);
            const undo = applyMove(next, state, level, prep, isJump);
            path.push(next);
            if (dfs(depth + 1)) return true;
            path.pop();
            undoMove(undo, state);
        }
        return false;
    }

    dfs(0);
    if (!reachedTargetDepth || path.length < 2) return null;

    const { mustCrossPending, mustPassPending } = pendingObligations(level, state);
    return {
        levelId,
        siblingIndex,
        prefixLength: path.length,
        remainingLength: level.requiredLength - (path.length - 1),
        currentIntersections: state.ints,
        remainingIntersections: Math.max(0, level.requiredIntersections - state.ints),
        mustCrossPendingCount: mustCrossPending.length,
        mustPassPendingCount: mustPassPending.length,
        mustCrossPending,
        mustPassPending,
        portals: level.portalMap.size,
        filters: level.filterMap.size,
        flippingFilters: level.flippingFilterMap.size,
        prefix: [...path],
        selectionReason: 'seeded-goal-distance-guided-legal-walk-intersection-budget-aware',
        stratum: `depth-fraction=${depthFraction}`,
        productionScoreRank: null, // descriptive metadata only -- this is not a production dispatch
    };
}

const rows = [];
const skipped = [];
for (const levelId of parentIds) {
    const raw = corpusById.get(levelId);
    if (!raw) { skipped.push({ levelId, reason: 'missing-from-corpus' }); continue; }
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = null;
    const distMap = buildDistMap(level, [level.goalKey]);

    let got = 0;
    for (let i = 0; i < SIBLINGS_PER_PARENT; i++) {
        const depthFraction = DEPTH_FRACTIONS[i % DEPTH_FRACTIONS.length];
        const sib = walkOneSibling(levelId, raw, level, prep, distMap, i, depthFraction);
        if (sib) { rows.push(sib); got++; }
    }
    if (got === 0) skipped.push({ levelId, reason: 'no-sibling-reached-target-depth' });
    console.log(`  ${levelId}: ${got}/${SIBLINGS_PER_PARENT} siblings`);
}

const populationRecord = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'fresh exact LIVE/DEAD sibling harvest -- frozen population, before exact labelling',
    sourceCommit,
    sourcePopulation: POPULATION_FILE,
    sourcePopulationCount: population.ids.length,
    corpus: CORPUS_FILE,
    seed: SEED,
    parentCount: PARENT_COUNT,
    siblingsPerParentRequested: SIBLINGS_PER_PARENT,
    depthFractions: DEPTH_FRACTIONS,
    nodeBudget: NODE_BUDGET,
    method: 'seeded goal-distance-guided, intersection-budget-aware legal walk via getNeighbors/applyMove (buildDistMap heuristic, no production scorer)',
    parentIds,
    skipped,
    siblingCount: rows.length,
    rows,
};

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(populationRecord, null, 1));
    console.log(`Wrote ${OUT_FILE} (${rows.length} sibling states, ${parentIds.length} parents, ${skipped.length} skipped)`);
}

if (CASES_OUT_FILE) {
    const cases = rows.map((r) => ({
        id: `${r.levelId}:fresh-sibling-${r.siblingIndex}`,
        levelId: r.levelId,
        prefix: r.prefix,
    }));
    const casesDoc = { corpus: CORPUS_FILE, cases };
    const abs2 = path.resolve(ROOT, CASES_OUT_FILE);
    mkdirSync(path.dirname(abs2), { recursive: true });
    writeFileSync(abs2, JSON.stringify(casesDoc, null, 1));
    console.log(`Wrote ${CASES_OUT_FILE} (${cases.length} CP-SAT cases)`);
}
