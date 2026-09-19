#!/usr/bin/env node
/**
 * Lane G stage 2, real-frontier variant: does a REAL production beam-search frontier state (not a
 * naive greedy/backtracking construction) land closer to a real accepted solution than the naive
 * relaxed-candidate attempts already tried in lane-g-relaxed-candidate-distance.mjs (which reached
 * the goal 0/25, 5/25, and 25/25-but-meaninglessly-short times across three independent attempts,
 * per reports/2026-09-17-lane-g-complete-path-lns-falsifier-result-001.md)?
 *
 * Same 25-level/15-hint-per-level sample (identical seed) and identical Jaccard-distance metric as
 * stage 1/2, for direct comparability. The "relaxed candidate" here is a genuine beam-search
 * frontier node reconstructed via scripts/stress/production-search-frontier-sampler-lib.mjs's own
 * reconstructBeamPath, at a high depth fraction of requiredLength -- reusing that already-built,
 * already-tested sampler machinery rather than inventing a fourth bespoke construction method.
 *
 * Zero new solver mechanism: this is the same beamSearchFromGate the production solver's own
 * main-search stage already runs, only paused early and read out, exactly as
 * production-search-frontier-sampler.mjs already does for other research questions.
 */
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { reconstructBeamPath, seededRng } from './production-search-frontier-sampler-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const HINTS_DIR = arg('hints-dir', 'data/stress/hints-random');
const LEVEL_COUNT = Number(arg('levels', 25));
const HINTS_PER_LEVEL = Number(arg('hints-per-level', 15));
const MIN_HINTS = Number(arg('min-hints', 5));
const SEED = arg('seed', 'lane-g-manifold-pilot-001'); // same seed as stage 1/2 -> same level/hint sample
const DEPTH_FRACTION = Number(arg('depth-fraction', 0.8));
const WIDTH = Number(arg('width', 2000));
const PROFILE_NAME = arg('profile', 'intersectionHarvest');
const BUDGET_MS = Number(arg('budget-ms', 60_000));

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
function seededRngLocal(seedStr) { const h = xmur3(seedStr); return mulberry32(h()); }
function shuffleWithSeed(arr, seedStr) {
    const rng = seededRngLocal(seedStr);
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
const Solver = createSolver();
const { prepLevel, beamSearchFromGate, SCORING_PROFILES } = SOLVER_TESTING_API;
const profile = SCORING_PROFILES[PROFILE_NAME];
if (!profile) throw new Error(`unknown scoring profile: ${PROFILE_NAME}`);

const levels = readLevelsWithHints(path.resolve(ROOT, CORPUS_FILE), { hintsDir: HINTS_DIR });
const eligible = levels.filter(l => (l.hintRecords?.length ?? 0) >= MIN_HINTS);
const selectedIds = shuffleWithSeed(eligible.map(l => l.id), `${SEED}:levels`).slice(0, LEVEL_COUNT);
const selectedSet = new Set(selectedIds);
const selected = eligible.filter(l => selectedSet.has(l.id));

const perLevel = [];
const reachedResults = [];
for (const level of selected) {
    const hintPaths = shuffleWithSeed(level.hintRecords.map(h => h.path), `${SEED}:${level.id}:hints`).slice(0, HINTS_PER_LEVEL);
    const { id: _id, stressMeta: _sm, ...rawLevel } = level;
    const prepared = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(prepared);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const gate = prepared.gateKeys[0];

    const pauseAfterPhases = Math.max(1, Math.round(prepared.requiredLength * DEPTH_FRACTION));
    const out = {};
    const result = await beamSearchFromGate(
        gate, prepared, prep, profile, BUDGET_MS, Date.now(), null, WIDTH,
        null, false, out, Infinity, undefined, pauseAfterPhases,
    );

    const row = { id: level.id, requiredLength: prepared.requiredLength, depthTarget: pauseAfterPhases };
    if (result) {
        row.status = 'solved-before-checkpoint';
    } else if (!out.pausedContinuation) {
        row.status = 'exhausted-before-checkpoint';
    } else {
        const frontier = out.pausedContinuation.frontier;
        const rng = seededRng(`${SEED}:${level.id}:frontier-pick`);
        const pickIndex = Math.floor(rng() * frontier.length);
        const candidatePath = reconstructBeamPath(frontier[pickIndex]);
        const distances = hintPaths.map(h => jaccardDistance(candidatePath, h));
        distances.sort((a, b) => a - b);
        row.status = 'sampled';
        row.frontierSize = frontier.length;
        row.candidateLength = candidatePath.length;
        row.nearestDistance = distances[0];
        row.medianDistanceToAllHints = distances[Math.floor(distances.length / 2)];
        reachedResults.push(row.nearestDistance);
    }
    perLevel.push(row);
    console.log(`  ${level.id}: status=${row.status} depthTarget=${pauseAfterPhases}/${prepared.requiredLength}${row.nearestDistance !== undefined ? ` nearestDist=${row.nearestDistance.toFixed(3)}` : ''}`);
}

reachedResults.sort((a, b) => a - b);
const overall = reachedResults.length ? {
    sampledCount: reachedResults.length,
    totalLevels: perLevel.length,
    sampleRate: reachedResults.length / perLevel.length,
    meanNearestDistance: reachedResults.reduce((a, b) => a + b, 0) / reachedResults.length,
    medianNearestDistance: reachedResults[Math.floor(reachedResults.length / 2)],
    p10: reachedResults[Math.floor(reachedResults.length * 0.1)],
    p90: reachedResults[Math.floor(reachedResults.length * 0.9)],
    min: reachedResults[0],
    max: reachedResults[reachedResults.length - 1],
} : { sampledCount: 0, totalLevels: perLevel.length, sampleRate: 0 };

console.log(JSON.stringify({ depthFraction: DEPTH_FRACTION, width: WIDTH, profile: PROFILE_NAME, overall, perLevel }, null, 2));

const OUT_FILE = arg('out', null);
if (OUT_FILE) {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const absolute = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify({ seed: SEED, depthFraction: DEPTH_FRACTION, width: WIDTH, profile: PROFILE_NAME, overall, perLevel }, null, 2)}\n`);
}
