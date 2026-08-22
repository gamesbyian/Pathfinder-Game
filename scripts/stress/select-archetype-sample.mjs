#!/usr/bin/env node
/**
 * Selects a deterministic, seeded stratified Corpus-2 sample for A/B testing an archetype-gated
 * ATTEMPT_POLICY routing change (modules/solver/attempts.ts) — the general form of
 * select-repair-probe-adaptive-sample.mjs's eligibility-sample pattern, generalized from one
 * hardcoded mechanic predicate to any set of detectArchetype() archetypes.
 *
 * An ATTEMPT_POLICY rule change can only ever affect a level's outcome if the level's detected
 * archetype matches one of the rules the change touches (attempts.ts routes purely on
 * detectArchetype(level)/LevelFeatures — see attempts.ts's own "pure function of level features"
 * doc comment). A uniform random Corpus-2 sample would waste most of its compute re-confirming
 * zero-effect on every other archetype. This draws a deterministic seeded subsample from the
 * ELIGIBLE population (the named archetypes) specifically, plus a small control sample from every
 * other archetype, to empirically catch anything outside the intended scope, not just to trust the
 * archetype list.
 *
 * Unlike select-repair-probe-adaptive-sample.mjs's looksRepairGated() (a sample-selection-only
 * APPROXIMATION of a mechanic predicate, since the real predicate needs a full solve to evaluate),
 * detectArchetype() is exactly what production routing calls — SOLVER_TESTING_API exposes it
 * directly and it takes only normalized level data, no solve. This selector's "eligible" population
 * is therefore exact, not an approximation.
 *
 * Uses the exact same seeded-sampling convention as scripts/stress/benchmark.mjs and
 * select-repair-probe-adaptive-sample.mjs (FNV-1a hash -> mulberry32 -> Fisher-Yates): same corpus +
 * same --seed always produces the same sample.
 *
 * Usage:
 *   node scripts/stress/select-archetype-sample.mjs \
 *     --corpus=data/stress/stress-levels-random.json \
 *     --archetypes=high-intersection-burden,must-cross-heavy \
 *     --eligible-sample=250 --control-sample=50 --seed=<commit-sha-or-any-string> \
 *     --out=logs/solver-archetype-sample/sample.txt
 *
 * Output: TWO files, same shape as select-repair-probe-adaptive-sample.mjs.
 *   --out=<path>.txt        one "pos:N" token per line (plan-ab-corpus-shards.mjs's
 *                            --corpus2-sample= expects this), eligible sample first then control.
 *   <path>.ids.txt          the same rows as level ids + detected archetype, for human review and
 *                            provenance — never fed to the solver directly.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

// This script imports modules/solver.js (detectArchetype needs the real TS solver code, unlike
// select-repair-probe-adaptive-sample.mjs's raw-JSON-only looksRepairGated approximation), so it
// must run through scripts/run-bundled.mjs, not plain node. run-bundled.mjs bundles the entry into
// .solver-tools/ (ONE level under the repo root — see its own header comment), so ROOT is one
// `..` from the running file's own directory, not two.
const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const argMap = new Map();
for (const arg of process.argv.slice(2)) {
    const eq = arg.indexOf('=');
    if (arg.startsWith('--') && eq > 0) argMap.set(arg.slice(0, eq), arg.slice(eq + 1));
}

const corpusFile = argMap.get('--corpus') || 'data/stress/stress-levels-random.json';
const archetypesArg = argMap.get('--archetypes');
if (!archetypesArg) { console.error('--archetypes is required (comma-separated detectArchetype() values)'); process.exit(2); }
const archetypes = new Set(archetypesArg.split(',').map(s => s.trim()).filter(Boolean));
const eligibleSampleSize = Number(argMap.get('--eligible-sample') || 250);
const controlSampleSize = Number(argMap.get('--control-sample') || 50);
const seedStr = argMap.get('--seed') || process.env.GITHUB_SHA || 'archetype-sample';
const outFile = argMap.get('--out');
if (!outFile) { console.error('--out is required'); process.exit(2); }

// Same convention as scripts/stress/benchmark.mjs's hashSeed/mulberry32/sampleDeterministic (also
// used by select-repair-probe-adaptive-sample.mjs).
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

installBrowserStubs();
const { SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { normalizeRawLevel, detectArchetype } = SOLVER_TESTING_API;

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, corpusFile), 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;

// { id, pos, arch } triples -- pos is the 1-indexed array position level-blind-capability-sweep.mjs
// and plan-ab-corpus-shards.mjs both key on (parseLevelSpec has no id-resolution).
const eligible = [];
const ineligible = [];
const archCounts = new Map();
levels.forEach((raw, i) => {
    const level = normalizeRawLevel(raw, i + 1);
    const arch = detectArchetype(level);
    archCounts.set(arch, (archCounts.get(arch) ?? 0) + 1);
    const entry = { id: raw.id, pos: i + 1, arch };
    (archetypes.has(arch) ? eligible : ineligible).push(entry);
});

const eligibleSeed = hashSeed(`${seedStr}:eligible`);
const controlSeed = hashSeed(`${seedStr}:control`);
const eligibleSample = sampleDeterministic(eligible, eligibleSampleSize, eligibleSeed);
const controlSample = sampleDeterministic(ineligible, controlSampleSize, controlSeed);
const combined = [...eligibleSample, ...controlSample];

console.log(`Archetype distribution across ${levels.length} levels: ${[...archCounts.entries()].map(([a, c]) => `${a}=${c}`).join(', ')}`);
console.log(`Eligible population (archetype in {${[...archetypes].join(', ')}}): ${eligible.length} / ${levels.length}`);
console.log(`Eligible sample drawn: ${eligibleSample.length} (seed=${seedStr}:eligible -> ${eligibleSeed})`);
console.log(`Control sample drawn: ${controlSample.length} (seed=${seedStr}:control -> ${controlSeed})`);

const outPath = path.resolve(ROOT, outFile);
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, combined.map(e => `pos:${e.pos}`).join('\n') + '\n');
const idsPath = outPath.replace(/\.txt$/, '.ids.txt');
writeFileSync(idsPath, combined.map(e => `${e.id}\t${e.arch}`).join('\n') + '\n');
console.log(`Wrote ${combined.length} position tokens to ${outFile}`);
console.log(`Wrote ${combined.length} ids+archetypes (for review only) to ${idsPath}`);
