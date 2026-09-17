#!/usr/bin/env node
/**
 * Lane G cheapest falsifier, stage 1: solution-manifold tightness, per
 * docs/solver-future-work.md's complete-path LNS entry ("relaxed whole-path candidates show
 * accepted solutions are locally reachable by structural surgery; run only the bounded cheapest
 * falsifier before implementation"). Before building or even simulating a relaxed-candidate
 * generator, ask the cheaper prerequisite question purely from already-committed data: how close
 * are INDEPENDENTLY-DISCOVERED accepted solutions for the SAME level to each other? If real,
 * fully-valid solutions for one level are already far apart, a relaxed (non-solving) candidate has
 * no particular reason to land near any specific one, undermining LNS's premise before any new
 * compute. If real solutions cluster tightly, that is a necessary (not sufficient) condition for
 * local-surgery credibility, and earns the second-stage falsifier (an actual relaxed-candidate
 * distance-to-nearest-solution measurement).
 *
 * Zero new solver compute: this is a pure re-analysis of already-committed hint data.
 *
 * Distance metric: normalized symmetric difference of each path's VISITED CELL SET (Jaccard
 * distance), |A symdiff B| / |A union B| -- O(n) per pair, directly relevant to local-surgery
 * credibility (surgery operates on specific cells/segments, so "do two solutions use mostly the
 * same cells" is the right cheap proxy; full sequence edit-distance is reserved for a follow-up if
 * this coarser measure is inconclusive).
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/lane-g-solution-manifold-tightness.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --hints-dir=data/stress/hints-random \
 *     --levels=25 --hints-per-level=15 --seed=lane-g-manifold-pilot-001 \
 *     --out=reports/stress/lane-g-solution-manifold-tightness-2026-09-17.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { readLevelsWithHints } from '../level-data-io.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const HINTS_DIR = arg('hints-dir', 'data/stress/hints-random');
const LEVEL_COUNT = Number(arg('levels', 25));
const HINTS_PER_LEVEL = Number(arg('hints-per-level', 15));
const MIN_HINTS = Number(arg('min-hints', 5));
const SEED = arg('seed', 'lane-g-manifold-pilot-001');
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

const levels = readLevelsWithHints(path.resolve(ROOT, CORPUS_FILE), { hintsDir: HINTS_DIR });
const eligible = levels.filter(l => (l.hintRecords?.length ?? 0) >= MIN_HINTS);
console.log(`Eligible levels (>=${MIN_HINTS} hints): ${eligible.length}/${levels.length}`);

const selectedIds = shuffleWithSeed(eligible.map(l => l.id), `${SEED}:levels`).slice(0, LEVEL_COUNT);
const selectedSet = new Set(selectedIds);
const selected = eligible.filter(l => selectedSet.has(l.id));

const perLevel = [];
const allNormalizedDistances = [];
for (const level of selected) {
    const hintPaths = shuffleWithSeed(level.hintRecords.map(h => h.path), `${SEED}:${level.id}:hints`).slice(0, HINTS_PER_LEVEL);
    const distances = [];
    for (let i = 0; i < hintPaths.length; i++) {
        for (let j = i + 1; j < hintPaths.length; j++) {
            distances.push(jaccardDistance(hintPaths[i], hintPaths[j]));
        }
    }
    distances.sort((a, b) => a - b);
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    const median = distances[Math.floor(distances.length / 2)];
    perLevel.push({
        id: level.id,
        totalHints: level.hintRecords.length,
        sampledHints: hintPaths.length,
        pairsCompared: distances.length,
        meanJaccardDistance: mean,
        medianJaccardDistance: median,
        minJaccardDistance: distances[0],
        maxJaccardDistance: distances[distances.length - 1],
    });
    allNormalizedDistances.push(...distances);
    console.log(`  ${level.id}: ${hintPaths.length} hints, ${distances.length} pairs, mean=${mean.toFixed(3)} median=${median.toFixed(3)} min=${distances[0].toFixed(3)} max=${distances[distances.length - 1].toFixed(3)}`);
}

allNormalizedDistances.sort((a, b) => a - b);
const overall = {
    totalPairs: allNormalizedDistances.length,
    mean: allNormalizedDistances.reduce((a, b) => a + b, 0) / allNormalizedDistances.length,
    median: allNormalizedDistances[Math.floor(allNormalizedDistances.length / 2)],
    p10: allNormalizedDistances[Math.floor(allNormalizedDistances.length * 0.1)],
    p90: allNormalizedDistances[Math.floor(allNormalizedDistances.length * 0.9)],
    min: allNormalizedDistances[0],
    max: allNormalizedDistances[allNormalizedDistances.length - 1],
};

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Lane G cheapest-falsifier stage 1 -- solution-manifold tightness, zero new solver compute',
    corpus: CORPUS_FILE,
    hintsDir: HINTS_DIR,
    seed: SEED,
    minHints: MIN_HINTS,
    levelsRequested: LEVEL_COUNT,
    hintsPerLevelCap: HINTS_PER_LEVEL,
    eligibleLevels: eligible.length,
    levelsSampled: selected.length,
    distanceMetric: 'Jaccard distance (1 - |A intersect B| / |A union B|) over each path\'s visited-cell SET',
    overall,
    perLevel,
};

console.log('\nOverall (all pairs pooled):', JSON.stringify(overall, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
