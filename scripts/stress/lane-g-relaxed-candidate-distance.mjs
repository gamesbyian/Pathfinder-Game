#!/usr/bin/env node
/**
 * Lane G cheapest falsifier, stage 2: relaxed-candidate-to-nearest-solution distance, per
 * docs/solver-future-work.md's complete-path LNS entry. Stage 1
 * (lane-g-solution-manifold-tightness.mjs) found real accepted solutions for the same level
 * already cluster fairly tightly (median Jaccard distance ~0.11 over a 25-level/2,235-pair
 * sample) -- a necessary prerequisite for local-surgery credibility. This stage asks the actual
 * question: does a NAIVE, non-solving, level-blind "relaxed complete path" (built by the same
 * seeded goal-distance-guided legal walk used for the fresh Class-5 sibling harvest, run to
 * completion instead of stopping partway, with NO strict enforcement of requiredLength/requiredIntersections/mustPass --
 * that is the "relaxed" part) land close, by the same distance metric, to at least one real
 * accepted solution for that level? If yes, a basin plausibly exists for bounded local surgery to
 * exploit; if the naive candidate is systematically much farther from every real solution than
 * real solutions are from each other, that undermines LNS's premise before any implementation.
 *
 * Zero CP-SAT/exact compute. Reuses only the native solver's legal-move primitives
 * (getNeighbors/applyMove) and the existing goal-distance heuristic (buildDistMap), exactly like
 * the sibling harvest's construction method -- already known from that work to be a poor SOLVER
 * (it could not find LIVE continuations on Class-5), which is precisely why it is an honest,
 * non-cherry-picked "naive relaxed candidate" generator for this different question.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const HINTS_DIR = arg('hints-dir', 'data/stress/hints-random');
const LEVEL_COUNT = Number(arg('levels', 25));
const HINTS_PER_LEVEL = Number(arg('hints-per-level', 15));
const MIN_HINTS = Number(arg('min-hints', 5));
const SEED = arg('seed', 'lane-g-manifold-pilot-001'); // same seed as stage 1 -> same level/hint sample
const MAX_STEPS = Number(arg('max-steps', 400));
const OUT_FILE = arg('out', null);

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
function jaccardDistance(pathA, pathB) {
    const setA = new Set(pathA);
    const setB = new Set(pathB);
    let intersection = 0;
    for (const c of setA) if (setB.has(c)) intersection++;
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : 1 - intersection / union;
}

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { buildDistMap } = await import('../../modules/solver/distance.js');
const Solver = createSolver();
const { prepLevel, createState, getNeighbors, applyMove } = SOLVER_TESTING_API;

const levels = readLevelsWithHints(path.resolve(ROOT, CORPUS_FILE), { hintsDir: HINTS_DIR });
const eligible = levels.filter(l => (l.hintRecords?.length ?? 0) >= MIN_HINTS);
const selectedIds = shuffleWithSeed(eligible.map(l => l.id), `${SEED}:levels`).slice(0, LEVEL_COUNT);
const selectedSet = new Set(selectedIds);
const selected = eligible.filter(l => selectedSet.has(l.id));

function buildRelaxedCandidate(level, prep, distMap) {
    // Two-phase, NON-BACKTRACKING greedy walk (a naive relaxed-candidate generator should be
    // cheap, not a combinatorial search -- backtracking DFS was tried first and rejected: once
    // its shared node budget was exhausted mid-search, backtracking unwound the ENTIRE path back
    // to the gate instead of keeping the best partial progress, collapsing most runs to length 1).
    // A pure goal-distance-greedy walk also just beelines to the goal (the shortest path is far
    // shorter than requiredLength on these levels -- an earlier pilot found candidate lengths of
    // 2-28 cells against required lengths of 60-128), making any distance-to-a-real-solution
    // comparison meaningless. So "relaxed" here means relaxed on MECHANIC obligations
    // (requiredIntersections/mustPass/mustCross), not on the fundamental requiredLength target:
    //   phase 1 ("wander"): the goal is blocked as a candidate move; mildly prefer unvisited
    //     cells (tolerant of revisits once fresh territory runs low, since requiredLength commonly
    //     exceeds the board's free-cell count) until the path is within goal-distance of it;
    //   phase 2 ("seek"): unblock the goal and switch to the same distance-to-goal-guided,
    //     intersection-averse heuristic used elsewhere in this line.
    // A true dead end (no legal move at all) simply stops the walk early -- reported as
    // reachedGoal=false with whatever partial length was reached, not silently discarded.
    const gate = level.gateKeys[0];
    const state = createState(gate, level, prep);
    const walkPath = [gate];
    const rng = seededRng(`${SEED}:${level.id}:relaxed-candidate`);

    function distTo(k) { return distMap.get(k) ?? Infinity; }

    for (let step = 0; step < MAX_STEPS; step++) {
        const pos = walkPath[walkPath.length - 1];
        if (pos === level.goalKey) break;
        const distToGoal = distTo(pos);
        const wandering = walkPath.length + distToGoal < level.requiredLength;
        const pAtPos = level.portalMap.get(pos);
        let candidates = getNeighbors(pos, state, level, prep)
            .filter((c) => wandering ? c !== level.goalKey : true);
        if (candidates.length === 0) break; // genuine dead end -- stop, don't backtrack

        candidates = candidates
            .map((c) => {
                const wouldAddInt = state.visited[c] > 0 && c !== level.goalKey && !prep.gateFlags[c];
                const intPenalty = wouldAddInt ? (wandering ? 3 : 1000) : 0;
                const goalTerm = wandering ? -rng() * 4 : distTo(c) - rng() * 2;
                return { c, key: goalTerm + intPenalty };
            })
            .sort((a, b) => a.key - b.key)
            .map((e) => e.c);
        const next = candidates[0];
        const isJump = !!(pAtPos && !state.lastWasPortalJump && pAtPos.dest === next);
        applyMove(next, state, level, prep, isJump);
        walkPath.push(next);
    }

    return { reachedGoal: walkPath[walkPath.length - 1] === level.goalKey, path: walkPath };
}

const perLevel = [];
const reachedResults = [];
for (const level of selected) {
    const hintPaths = shuffleWithSeed(level.hintRecords.map(h => h.path), `${SEED}:${level.id}:hints`).slice(0, HINTS_PER_LEVEL);
    const { id: _id, stressMeta: _sm, ...rawLevel } = level;
    const prepared = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(prepared);
    prep._cfg = null;
    const distMap = buildDistMap(prepared, [prepared.goalKey]);

    const { reachedGoal, path: candidatePath } = buildRelaxedCandidate(prepared, prep, distMap);
    const row = { id: level.id, reachedGoal, candidateLength: candidatePath.length, requiredLength: prepared.requiredLength };
    if (reachedGoal) {
        const distances = hintPaths.map(h => jaccardDistance(candidatePath, h));
        distances.sort((a, b) => a - b);
        row.nearestDistance = distances[0];
        row.medianDistanceToAllHints = distances[Math.floor(distances.length / 2)];
        reachedResults.push(row.nearestDistance);
    }
    perLevel.push(row);
    console.log(`  ${level.id}: reachedGoal=${reachedGoal} candidateLen=${candidatePath.length}/${prepared.requiredLength}${reachedGoal ? ` nearestDist=${row.nearestDistance.toFixed(3)}` : ''}`);
}

reachedResults.sort((a, b) => a - b);
const overall = reachedResults.length ? {
    reachedCount: reachedResults.length,
    totalLevels: perLevel.length,
    reachRate: reachedResults.length / perLevel.length,
    meanNearestDistance: reachedResults.reduce((a, b) => a + b, 0) / reachedResults.length,
    medianNearestDistance: reachedResults[Math.floor(reachedResults.length / 2)],
    p10: reachedResults[Math.floor(reachedResults.length * 0.1)],
    p90: reachedResults[Math.floor(reachedResults.length * 0.9)],
    min: reachedResults[0],
    max: reachedResults[reachedResults.length - 1],
} : { reachedCount: 0, totalLevels: perLevel.length, reachRate: 0 };

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Lane G cheapest-falsifier stage 2 -- naive relaxed-candidate distance to nearest real solution',
    corpus: CORPUS_FILE, hintsDir: HINTS_DIR, seed: SEED,
    maxSteps: MAX_STEPS,
    method: 'seeded goal-distance-guided, intersection-avoiding legal walk to completion (same construction as the fresh Class-5 sibling harvest, run to the goal instead of a fixed depth fraction)',
    distanceMetric: 'Jaccard distance over visited-cell SET, same as stage 1',
    levelsSampled: perLevel.length,
    overall,
    perLevel,
};
console.log('\nOverall:', JSON.stringify(overall, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
