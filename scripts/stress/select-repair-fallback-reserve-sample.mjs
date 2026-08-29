#!/usr/bin/env node
/**
 * Selects a deterministic, seeded stratified Corpus-2 sample for A/B testing
 * STRATEGY_REPAIR_FALLBACK_NODE_RESERVE (see modules/solver/orchestration.ts's
 * REPAIR_FALLBACK_NODE_RESERVE_FRACTION comment).
 *
 * The flag can only ever change a level's node count/outcome if the level is repair-gated
 * (attempts.ts's needsRepairFallback -- approximated here from raw mechanicCounts, since this is
 * SAMPLE SELECTION, not a solver input; the real solve still uses the exact production predicate).
 * Unlike STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET (which additionally requires a must-turn
 * cell), this flag has no further requirement -- it withholds a slice from mainLoopLateReserve for
 * ANY repair-gated level, regardless of must-turn. That population is considerably larger (~919/1700
 * on corpus-2 by this approximation, vs. 512/1700 for the must-turn-gated flag), so stratified
 * sampling still saves real compute over a uniform random draw even though a majority of the corpus
 * is eligible.
 *
 * Uses the exact same seeded-sampling convention as scripts/stress/benchmark.mjs
 * (FNV-1a hash -> mulberry32 -> Fisher-Yates) for consistency and reproducibility: same corpus +
 * same --seed always produces the same sample.
 *
 * Usage:
 *   node scripts/stress/select-repair-fallback-reserve-sample.mjs \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --eligible-sample=250 --control-sample=50 --seed=<commit-sha-or-any-string> \
 *     --out=logs/solver-stress-refresh/repair-fallback-reserve-sample-2026-08-13.txt
 *
 * Output: TWO files.
 *   --out=<path>.txt        one "pos:N" token per line (portfolio-solve-sweep.mjs's --levels=
 *                            selects by array POSITION only, not id -- see level-data-io.mjs's
 *                            stripPositionPrefix), eligible sample first then control sample.
 *                            A workflow step joins these with commas to build --levels=.
 *   --out=<path>.txt with a sibling <path>.ids.txt   the same rows as level ids, for human review
 *                            and provenance -- never fed to the solver directly.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

const argMap = new Map();
for (const arg of process.argv.slice(2)) {
    const eq = arg.indexOf('=');
    if (arg.startsWith('--') && eq > 0) argMap.set(arg.slice(0, eq), arg.slice(eq + 1));
}

const corpusFile = argMap.get('--corpus') || 'data/stress/stress-levels-random.json';
const eligibleSampleSize = Number(argMap.get('--eligible-sample') || 250);
const controlSampleSize = Number(argMap.get('--control-sample') || 50);
const seedStr = argMap.get('--seed') || process.env.GITHUB_SHA || 'repair-fallback-reserve-sample';
const outFile = argMap.get('--out');
if (!outFile) { console.error('--out is required'); process.exit(2); }

// Same convention as scripts/stress/benchmark.mjs's hashSeed/mulberry32/sampleDeterministic.
function hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function sampleDeterministic(items, n, seed) {
    if (!Number.isFinite(n) || n >= items.length) return items.slice();
    const rng = mulberry32(seed);
    const pool = items.slice();
    const picked = [];
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rng() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        picked.push(pool[i]);
    }
    return picked;
}

// Sample-selection-only approximation of attempts.ts's needsRepairFallback -- the real solve
// during the A/B still uses the exact production predicate; this just informs which levels are
// WORTH spending A/B compute on. Erring slightly broad/narrow here only costs/saves a little
// sample efficiency, never correctness of the eventual A/B result.
function looksRepairGated(mc) {
    return (mc.mustCross >= 2 && mc.mustPass >= 3) || false;
}

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, corpusFile), 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;

// { id, pos } pairs -- pos is the 1-indexed array position portfolio-solve-sweep.mjs's --levels=
// actually requires (see stripPositionPrefix; it has no id-resolution).
const eligible = [];
const ineligible = [];
levels.forEach((lvl, i) => {
    const mc = lvl.stressMeta?.mechanicCounts;
    const reqInt = lvl.reqInt ?? 0;
    const repairGated = mc ? (looksRepairGated(mc) || reqInt >= 7) : false;
    const entry = { id: lvl.id, pos: i + 1 };
    if (repairGated) eligible.push(entry);
    else ineligible.push(entry);
});

const eligibleSeed = hashSeed(`${seedStr}:eligible`);
const controlSeed = hashSeed(`${seedStr}:control`);
const eligibleSample = sampleDeterministic(eligible, eligibleSampleSize, eligibleSeed);
const controlSample = sampleDeterministic(ineligible, controlSampleSize, controlSeed);
const combined = [...eligibleSample, ...controlSample];

console.log(`Eligible population (repair-gated): ${eligible.length} / ${levels.length}`);
console.log(`Eligible sample drawn: ${eligibleSample.length} (seed=${seedStr}:eligible -> ${eligibleSeed})`);
console.log(`Control sample drawn: ${controlSample.length} (seed=${seedStr}:control -> ${controlSeed})`);

const outPath = path.resolve(ROOT, outFile);
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, combined.map(e => `pos:${e.pos}`).join('\n') + '\n');
const idsPath = outPath.replace(/\.txt$/, '.ids.txt');
writeFileSync(idsPath, combined.map(e => e.id).join('\n') + '\n');
console.log(`Wrote ${combined.length} position tokens to ${outFile}`);
console.log(`Wrote ${combined.length} ids (for review only) to ${idsPath}`);
