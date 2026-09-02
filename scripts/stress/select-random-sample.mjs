#!/usr/bin/env node
/**
 * Deterministic, seeded UNIFORM random level sample — no routing-regime/mechanic eligibility
 * gating, unlike select-routing-regime-sample.mjs / select-early-repair-search-adaptive-sample.mjs.
 * For a question that is not scoped to a particular mechanic/regime (e.g. "does this technique-menu
 * change affect coverage across the general population"), a stratified eligibility sample would
 * waste most of its draws confirming zero-effect outside scope; a plain uniform sample is the
 * correct tool when there is no such scope to exploit.
 *
 * Same seeded-PRNG convention as scripts/stress/benchmark.mjs's own hashSeed/mulberry32/
 * sampleDeterministic (FNV-1a hash -> mulberry32 -> Fisher-Yates): same corpus + same --seed always
 * produces the same sample, so a run using this population is reproducible from the seed alone.
 *
 * Usage:
 *   node scripts/stress/select-random-sample.mjs \
 *     --corpus=data/stress/stress-levels-random.json --corpus-label=corpus2 \
 *     --sample=150 --seed=<any string, e.g. a commit sha or a descriptive name> \
 *     --out=path/to/population.json
 *
 * Output: JSON array of { corpus, levelPos, levelId } rows (1-based levelPos, matching every other
 * corpus-position convention in this repo), directly consumable by
 * scripts/build-static-portfolio-plan.mjs's --population= or as loadPopulation()'s plain-array shape.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/** FNV-1a: derives a 32-bit numeric seed from an arbitrary string. Same convention as
 *  scripts/stress/benchmark.mjs's own hashSeed. */
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

/**
 * @param {Array} levels 1-indexed-position-ordered level array (levels[0] is position 1)
 * @param {number} n
 * @param {string} seedStr
 * @param {Set<string>} [excludeIds] level ids to drop from the draw pool entirely before sampling
 *   (e.g. an already-heavily-mined sample a confirmation population must stay disjoint from)
 * @returns {Array<{ index: number, level: object }>} 0-based index into `levels` plus the level itself
 */
export function sampleDeterministic(levels, n, seedStr, excludeIds = null) {
    const eligible = excludeIds ? levels.map((level, index) => ({ index, level })).filter(({ level }) => !excludeIds.has(level.id)) : levels.map((level, index) => ({ index, level }));
    if (!Number.isFinite(n) || n >= eligible.length) return eligible;
    const rng = mulberry32(hashSeed(String(seedStr)));
    const pool = eligible;
    const picked = [];
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rng() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        picked.push(pool[i]);
    }
    // Sorted by original position for a stable, human-reviewable output order (sampling order
    // itself is already captured by determinism from the seed; nothing depends on output order).
    return picked.sort((a, b) => a.index - b.index);
}

// ─── CLI ──────────────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
    const args = process.argv.slice(2);
    const argMap = new Map(args.filter((a) => a.startsWith('--') && a.includes('=')).map((a) => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
    const root = new URL('../..', import.meta.url).pathname;
    const corpusPath = argMap.get('--corpus');
    const corpusLabel = argMap.get('--corpus-label');
    const sampleSize = Number(argMap.get('--sample'));
    const seed = argMap.get('--seed');
    const outFile = argMap.get('--out');
    const excludePath = argMap.get('--exclude-ids-from');
    if (!corpusPath || !corpusLabel || !Number.isFinite(sampleSize) || !seed || !outFile) {
        console.error('Usage: --corpus=<path> --corpus-label=<corpus1|corpus2|published> --sample=<n> --seed=<string> --out=<path> [--exclude-ids-from=<path to JSON array of {levelId} or {results:[{levelId}]} rows>]');
        process.exit(1);
    }
    const raw = JSON.parse(readFileSync(path.resolve(root, corpusPath), 'utf8'));
    const levels = Array.isArray(raw) ? raw : raw.levels;
    let excludeIds = null;
    if (excludePath) {
        const excludeRaw = JSON.parse(readFileSync(path.resolve(root, excludePath), 'utf8'));
        const rows = Array.isArray(excludeRaw) ? excludeRaw : excludeRaw.results;
        excludeIds = new Set(rows.map((r) => r.levelId));
    }
    const picked = sampleDeterministic(levels, sampleSize, seed, excludeIds);
    const population = picked.map(({ index, level }) => ({ corpus: corpusLabel, levelPos: index + 1, levelId: level.id ?? null }));

    mkdirSync(path.dirname(path.resolve(root, outFile)), { recursive: true });
    writeFileSync(path.resolve(root, outFile), JSON.stringify(population, null, 2) + '\n');
    console.log(`Wrote ${outFile}: ${population.length} levels sampled from ${levels.length} (${corpusLabel}, seed="${seed}")`);
}
