#!/usr/bin/env node
/**
 * For a sample of UNSOLVED corpus-2 levels, finds the nearest SOLVED levels by static feature
 * vector (the same `levelFeatures()` extractor feature-solvability-analysis.mjs uses) and reports
 * which features actually differ. Complements that script's aggregate/bucket analysis with a
 * per-level view: "of everything solved, what's the closest thing to this failure, and how is it
 * different?"
 *
 * Read-only, no solving — joins the compiled baseline's ok labels against levelFeatures().
 *
 * METHOD. Feature vector: reqLen, reqInt, requiredPathCoverageRatio, mustPass, mustCross, portalPairs, flippers,
 * staticFilters, geese, falseGoals, surround, mustTurn, adjTurn — the same components
 * feature-solvability-analysis.mjs measures discriminative power for. Each feature is z-scored
 * using the FULL corpus's own mean/stddev (not just the solved or unsolved subset) so distances
 * aren't distorted by whichever subset happens to be sampled. Nearest neighbors are found by plain
 * Euclidean distance in this standardized space — a simple, interpretable choice, not claimed to be
 * the "correct" metric (features are correlated, as feature-solvability-analysis.mjs's own
 * Limitations section notes; this tool inherits that caveat).
 *
 * TARGET SELECTION: by default, the N unsolved levels with the LOWEST best-badness (min over every
 * attempt in the level's ladder) — the "near miss" population feature-solvability-analysis.mjs's
 * Finding 4 calls "the natural rescue target". Override with --target=<id> for a specific level.
 *
 * Usage:
 *   node scripts/stress/nearest-solved-neighbor.mjs \
 *       --baseline=logs/stress-corpus2-baseline.json \
 *       --corpus=data/stress/stress-levels-random.json \
 *       [--count=5] [--k=3] [--target=<id>] [--out=<file.json>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { levelFeatures } from './features.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const BASELINE_FILE = args.get('--baseline');
const CORPUS_FILE = args.get('--corpus');
const COUNT = Number(args.get('--count') || 5);
const K = Number(args.get('--k') || 3);
const TARGET_ID = args.get('--target') || null;
const OUT_FILE = args.get('--out') || null;

if (!BASELINE_FILE || !CORPUS_FILE) {
    console.error('Usage: nearest-solved-neighbor.mjs --baseline=<compiled baseline> --corpus=<levels.json> [--count=5] [--k=3] [--target=<id>] [--out=<file>]');
    process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));
const baseline = readJson(BASELINE_FILE);
const corpus = readJson(CORPUS_FILE);
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;

const byId = new Map(baseline.levels.map(l => [l.id, l]));

const FEATURE_KEYS = ['reqLen', 'reqInt', 'requiredPathCoverageRatio', 'mustPass', 'mustCross', 'portalPairs', 'flippers', 'staticFilters', 'geese', 'falseGoals', 'surround', 'mustTurn', 'adjTurn'];

const rows = [];
for (const raw of corpusLevels) {
    const id = raw.id;
    const baseRow = byId.get(id);
    if (!baseRow) continue;
    const f = levelFeatures(raw);
    const bestBadness = baseRow.ok ? null : Math.min(...(baseRow.attempts || []).map(a => Number.isFinite(a.finalBadness) ? a.finalBadness : Infinity), Infinity);
    rows.push({ id, ok: baseRow.ok, bestBadness: Number.isFinite(bestBadness) ? bestBadness : null, features: f });
}

// z-score normalization using the FULL corpus's own mean/stddev per feature.
const stats = {};
for (const key of FEATURE_KEYS) {
    const vals = rows.map(r => r.features[key]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    stats[key] = { mean, std: Math.sqrt(variance) || 1 };
}

function zVector(features) {
    return FEATURE_KEYS.map(key => (features[key] - stats[key].mean) / stats[key].std);
}

for (const r of rows) r.z = zVector(r.features);

function euclidean(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
}

const solvedRows = rows.filter(r => r.ok);
let targets;
if (TARGET_ID) {
    const t = rows.find(r => r.id === TARGET_ID);
    if (!t) { console.error(`Target level ${TARGET_ID} not found in baseline/corpus join.`); process.exit(1); }
    targets = [t];
} else {
    targets = rows.filter(r => !r.ok && r.bestBadness !== null)
        .sort((a, b) => a.bestBadness - b.bestBadness)
        .slice(0, COUNT);
}

console.log(`nearest-solved-neighbor: ${targets.length} target(s), ${solvedRows.length} solved levels to search, k=${K}.\n`);

const report = [];
for (const target of targets) {
    const dists = solvedRows.map(s => ({ s, d: euclidean(target.z, s.z) })).sort((a, b) => a.d - b.d).slice(0, K);
    console.log(`Target ${target.id} (bestBadness=${target.bestBadness}):`);
    console.log(`  features: ${FEATURE_KEYS.map(k => `${k}=${target.features[k]}`).join(', ')}`);
    const neighbors = dists.map(({ s, d }) => {
        const diffs = FEATURE_KEYS
            .map(k => ({ key: k, target: target.features[k], neighbor: s.features[k], delta: s.features[k] - target.features[k] }))
            .filter(x => x.delta !== 0)
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
        console.log(`  -> ${s.id} (dist=${d.toFixed(3)}): ${diffs.map(x => `${x.key} ${x.target}->${x.neighbor} (${x.delta > 0 ? '+' : ''}${x.delta})`).join(', ') || 'IDENTICAL feature vector'}`);
        return { id: s.id, distance: d, diffs };
    });
    report.push({ target: target.id, bestBadness: target.bestBadness, targetFeatures: target.features, neighbors });
    console.log('');
}

if (OUT_FILE) {
    const abs = path.resolve(ROOT, OUT_FILE);
    writeFileSync(abs, JSON.stringify({ featureKeys: FEATURE_KEYS, stats, report }, null, 2) + '\n');
    console.log(`Wrote ${OUT_FILE}`);
}
