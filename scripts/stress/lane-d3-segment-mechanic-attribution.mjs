#!/usr/bin/env node
/**
 * Per-segment tightening of reports/2026-09-17-lane-d3-mechanic-conditioned-breakdown-result-001.md's
 * level-scale finding (0% commutativity on any level containing a flipping filter). That breakdown
 * bucketed by the LEVEL's static mechanic inventory, not by whether the specific spliced SEGMENT
 * itself touches a flipper/portal cell -- leaving open whether flipper-bearing levels are 0% only
 * because their segments happen to touch a flipper, or whether the whole board is somehow harder
 * regardless of what the segment itself touches.
 *
 * Re-runs the exact same deterministic mining/splice/validate pipeline as
 * lane-d-residual-interface-commutativity.mjs (same seed, same inputs -- reproduces the identical
 * candidate set, verified against the committed totals) but additionally tags each candidate's own
 * segment paths with flipper/portal cell touches, using the segment paths mineResidualInterfaces
 * already returns. Zero new solver compute beyond what the original D3 run already did.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/lane-d3-segment-mechanic-attribution.mjs -- \
 *     --out=reports/stress/lane-d3-segment-mechanic-attribution-2026-09-17.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { mineResidualInterfaces } from './research-analysis-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const HINTS_DIR = arg('hints-dir', 'data/stress/hints-random');
const LEVEL_COUNT = Number(arg('levels', 25));
const HINTS_PER_LEVEL = Number(arg('hints-per-level', 20));
const MIN_HINTS = Number(arg('min-hints', 8));
const MAX_SPAN = Number(arg('max-span', 25));
const SEED = arg('seed', 'lane-d-commutativity-wide-001');
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

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { validateCandidatePath } = await import('../../modules/domain/path-validator.ts');
const Solver = createSolver();
const { prepLevel, createState, applyMove } = SOLVER_TESTING_API;

const levels = readLevelsWithHints(path.resolve(ROOT, CORPUS_FILE), { hintsDir: HINTS_DIR });
const eligible = levels.filter((l) => (l.hintRecords?.length ?? 0) >= MIN_HINTS);
const selectedIds = shuffleWithSeed(eligible.map((l) => l.id), `${SEED}:levels`).slice(0, LEVEL_COUNT);
const selectedSet = new Set(selectedIds);
const selected = eligible.filter((l) => selectedSet.has(l.id));

function annotateSolution(fullPath, level, prep) {
    const gate = fullPath[0];
    const state = createState(gate, level, prep);
    const mustPass = new Set(level.mustPassKeys);
    const mustCross = new Set(level.mustCrossKeys);
    const obligations = [null];
    const intersections = [0];
    for (let i = 1; i < fullPath.length; i++) {
        const prev = fullPath[i - 1];
        const next = fullPath[i];
        const pAtPrev = level.portalMap.get(prev);
        const isJump = !!(pAtPrev && !state.lastWasPortalJump && pAtPrev.dest === next);
        applyMove(next, state, level, prep, isJump);
        intersections.push(state.ints);
        obligations.push(mustPass.has(next) ? 'mustPass' : mustCross.has(next) ? 'mustCross' : null);
    }
    return { intersections, obligations };
}

const bucketRows = [];
let totalCandidates = 0, totalLegal = 0;
let verifyTotalCandidates = 0, verifyTotalLegal = 0; // sanity check against the committed D3 totals

for (const level of selected) {
    const hintPaths = shuffleWithSeed(level.hintRecords.map((h) => h.path), `${SEED}:${level.id}:hints`).slice(0, HINTS_PER_LEVEL);
    const { id: _id, stressMeta: _sm, ...rawLevel } = level;
    const prepared = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(prepared);
    prep._cfg = null;

    const flipperKeySet = new Set(prepared.flippingFilterMap.keys());
    const portalKeySet = new Set(prepared.portalMap.keys());
    const levelBucket = flipperKeySet.size && portalKeySet.size ? 'level:portal-and-flipper'
        : flipperKeySet.size ? 'level:flipper-only'
        : portalKeySet.size ? 'level:portal-only'
        : 'level:mechanic-free';

    const solutionRecords = hintPaths.map((p, idx) => {
        const { intersections, obligations } = annotateSolution(p, prepared, prep);
        return { id: `${level.id}:h${idx}`, path: p, intersections, obligations };
    });

    const mined = mineResidualInterfaces(solutionRecords, { maxSpan: MAX_SPAN });
    const commutingPairs = mined.interfaces.flatMap((iface) => iface.pairs.filter((p) => p.commutingCandidate));

    const bySolution = new Map(solutionRecords.map((r) => [r.id, r.path]));
    for (const pair of commutingPairs) {
        const { a, b } = pair;
        const basePath = bySolution.get(a.solution);
        const splicedPath = [...basePath.slice(0, a.from), ...b.path, ...basePath.slice(a.to + 1)];
        const verdict = validateCandidatePath(prepared, splicedPath);
        verifyTotalCandidates++;
        if (verdict.ok) verifyTotalLegal++;

        if (a.length !== b.length) continue; // length-matched only, matching the mechanic breakdown's cleanest comparison
        const touches = (segPath, keySet) => segPath.some((k) => keySet.has(k));
        const segmentTouchesFlipper = touches(a.path, flipperKeySet) || touches(b.path, flipperKeySet);
        const segmentTouchesPortal = touches(a.path, portalKeySet) || touches(b.path, portalKeySet);
        const bucket = segmentTouchesFlipper ? 'segment-touches-flipper' : segmentTouchesPortal ? 'segment-touches-portal-only' : 'segment-touches-neither';
        bucketRows.push({ levelId: level.id, levelBucket, bucket, crossTab: `${levelBucket} x ${bucket}`, legal: verdict.ok });
        totalCandidates++;
        if (verdict.ok) totalLegal++;
    }
}

function aggregate(rows, keyFn) {
    const map = new Map();
    for (const row of rows) {
        const key = keyFn(row);
        if (!map.has(key)) map.set(key, { total: 0, legal: 0, levels: new Set() });
        const b = map.get(key);
        b.total++;
        if (row.legal) b.legal++;
        b.levels.add(row.levelId);
    }
    return [...map.entries()].map(([key, b]) => ({
        key, levelsInBucket: b.levels.size, candidates: b.total, legal: b.legal,
        legalRate: b.total ? b.legal / b.total : null,
    }));
}

const segmentBuckets = aggregate(bucketRows, (r) => r.bucket);
const levelBuckets = aggregate(bucketRows, (r) => r.levelBucket);
const crossTab = aggregate(bucketRows, (r) => r.crossTab);

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'Per-segment tightening of the Lane D3 mechanic-conditioned breakdown -- does commutativity failure track the SEGMENT touching a flipper cell, not just the level containing one',
    corpus: CORPUS_FILE, hintsDir: HINTS_DIR, seed: SEED, maxSpan: MAX_SPAN,
    sanityCheck: {
        note: 'full (not just length-matched) totals, should match the original D3 run exactly',
        totalCommutingCandidates: verifyTotalCandidates, totalLegalAfterSplice: verifyTotalLegal,
        matchesCommittedD3: verifyTotalCandidates === 12277 && verifyTotalLegal === 1653,
    },
    lengthMatchedTotalCandidates: totalCandidates, lengthMatchedTotalLegal: totalLegal,
    segmentBuckets, levelBuckets, crossTab,
};
console.log('sanityCheck:', JSON.stringify(summary.sanityCheck, null, 2));
console.log('segmentBuckets:', JSON.stringify(segmentBuckets, null, 2));
console.log('levelBuckets:', JSON.stringify(levelBuckets, null, 2));
console.log('crossTab:', JSON.stringify(crossTab, null, 2));

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${OUT_FILE}`);
}
