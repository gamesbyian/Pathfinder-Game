#!/usr/bin/env node
/**
 * Solver-RESPONSE comparison for near-static-twin solved/unsolved pairs (the follow-up
 * reports/2026-08-06-corpus2-nearest-solved-neighbor.md's own recommendation calls for: static
 * features run out at the individual-pair level, so look at how the solver's SEARCH behaved
 * differently instead — per solver-next-frontier-2026-08-02.md's Part I item 6 ("family analysis
 * should use solver-response vectors, not only static level features").
 *
 * Read-only, no solving. For each of the closest solved/unsolved pairs (by the same z-scored
 * feature distance nearest-solved-neighbor.mjs uses), reports:
 *   - the solved twin's WINNING technique (winningConfig), attempt count, nodes/time to solve;
 *   - the unsolved twin's FULL attempt ladder (scoringProfileId/orderingBiasId/beamWidth/finalBadness/
 *     nodesExpanded/timedOut per attempt);
 *   - whether the solved twin's winning technique was even ATTEMPTED on the unsolved twin, and if
 *     so, how far it got (finalBadness) compared to a clean win (badness 0).
 *
 * This distinguishes two very different failure shapes that look identical from static features
 * alone: (a) the winning technique was never tried on the unsolved twin at all (a routing/policy
 * gap — the attempt ladder's own ordering logic, keyed on level features, sent it down a different
 * path), vs (b) it WAS tried and still failed at real distance (a genuine per-level algorithmic
 * limit despite near-identical statics).
 *
 * Usage:
 *   node scripts/stress/near-twin-response-comparison.mjs \
 *       --baseline=logs/stress-corpus2-baseline.json \
 *       --corpus=data/stress/stress-levels-random.json \
 *       [--count=8] [--out=<file.json>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { levelFeatures } from './features.mjs';
import { attemptRecord } from '../portfolio-solve-sweep-lib.mjs';
import { parseAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const BASELINE_FILE = args.get('--baseline');
const CORPUS_FILE = args.get('--corpus');
const COUNT = Number(args.get('--count') || 8);
const OUT_FILE = args.get('--out') || null;

if (!BASELINE_FILE || !CORPUS_FILE) {
    console.error('Usage: near-twin-response-comparison.mjs --baseline=<compiled baseline> --corpus=<levels.json> [--count=8] [--out=<file>]');
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
    const baseRow = byId.get(raw.id);
    if (!baseRow) continue;
    rows.push({ id: raw.id, ok: baseRow.ok, base: baseRow, features: levelFeatures(raw) });
}
const stats = {};
for (const key of FEATURE_KEYS) {
    const vals = rows.map(r => r.features[key]);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    stats[key] = { mean, std: Math.sqrt(variance) || 1 };
}
const zVec = (f) => FEATURE_KEYS.map(k => (f[k] - stats[k].mean) / stats[k].std);
for (const r of rows) r.z = zVec(r.features);

function euclidean(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); }

const solvedRows = rows.filter(r => r.ok);
const unsolvedRows = rows.filter(r => !r.ok);

const nearestPairs = unsolvedRows.map(u => {
    let best = null, bestD = Infinity;
    for (const s of solvedRows) {
        const d = euclidean(u.z, s.z);
        if (d < bestD) { bestD = d; best = s; }
    }
    return { unsolved: u, solved: best, distance: bestD };
}).sort((a, b) => a.distance - b.distance).slice(0, COUNT);

console.log(`near-twin-response-comparison: ${nearestPairs.length} closest solved/unsolved pairs corpus-wide.\n`);

const report = [];
// winningConfig may be canonical or historical. Route both through the shared attempt-identity
// parser rather than slicing compact strings locally.
function extractScoringProfileId(winningConfig) {
    if (!winningConfig) return null;
    try { return parseAttemptIdentityKey(winningConfig).scoringProfileId; }
    catch { return null; }
}

for (const { unsolved, solved, distance } of nearestPairs) {
    const uBase = unsolved.base, sBase = solved.base;
    const winningTechnique = sBase.winningConfig;
    const winningScoringProfileId = extractScoringProfileId(winningTechnique);
    const attempts = (uBase.attempts || []).map(a => {
        const projected = attemptRecord(a);
        return {
            // Retain the canonical persisted Attempt shape instead of rebuilding a smaller
            // whitelist here. These two normalized defaults are this report's only specialization.
            ...projected,
            finalBadness: projected.finalBadness ?? null,
            timedOut: !!projected.timedOut,
        };
    });
    const bestBadness = Math.min(...attempts.map(a => Number.isFinite(a.finalBadness) ? a.finalBadness : Infinity), Infinity);
    const matchingAttempts = attempts.filter(a => winningScoringProfileId && a.scoringProfileId === winningScoringProfileId);
    // A "matching" attempt with zero nodesExpanded got no real budget at all -- present in the
    // ladder in name only, not a genuine attempt at the technique. Distinguishing this from a
    // real, node-spending attempt matters: the former is specialist starvation (a scheduling
    // problem, same shape as the already-documented ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION fix),
    // the latter is a real per-level algorithmic limit even with the right technique running.
    const realMatchingAttempts = matchingAttempts.filter(a => (a.nodesExpanded || 0) > 0);
    const category = matchingAttempts.length === 0 ? 'never-attempted'
        : realMatchingAttempts.length === 0 ? 'starved-zero-nodes'
        : 'real-attempt';

    console.log(`${unsolved.id} (bestBadness=${Number.isFinite(bestBadness) ? bestBadness : 'n/a'}, dist=${distance.toFixed(3)}) vs solved ${solved.id}:`);
    console.log(`  solved twin won via: ${winningTechnique} (scoringProfileId=${winningScoringProfileId}), ${sBase.attemptCount ?? 1} attempt(s), ${sBase.nodesExpanded} nodes, ${sBase.totalMs}ms`);
    console.log(`  unsolved twin's ladder: ${attempts.length} attempts, best badness ${Number.isFinite(bestBadness) ? bestBadness : 'n/a'}, category=${category}`);
    if (category === 'never-attempted') {
        console.log(`  -> the solved twin's winning PROFILE (${winningScoringProfileId}) was NEVER ATTEMPTED on the unsolved twin (routing gap)`);
    } else if (category === 'starved-zero-nodes') {
        console.log(`  -> the winning profile appears in the ladder (${matchingAttempts.length}x) but got ZERO nodesExpanded every time (starved of budget, not a real attempt)`);
    } else {
        const bestMatch = realMatchingAttempts.reduce((a, b) => (a.finalBadness ?? Infinity) < (b.finalBadness ?? Infinity) ? a : b);
        console.log(`  -> the winning profile WAS genuinely attempted (${realMatchingAttempts.length} real, ${matchingAttempts.length - realMatchingAttempts.length} starved), best result: badness ${bestMatch.finalBadness ?? 'n/a'} (${bestMatch.timedOut ? 'timed out' : 'exhausted'}, ${bestMatch.nodesExpanded} nodes)`);
    }
    report.push({ unsolvedId: unsolved.id, solvedId: solved.id, distance, bestBadness: Number.isFinite(bestBadness) ? bestBadness : null, winningTechnique, winningScoringProfileId, attempts, category });
    console.log('');
}

const counts = { 'never-attempted': 0, 'starved-zero-nodes': 0, 'real-attempt': 0 };
for (const r of report) counts[r.category]++;
console.log(`Summary (${report.length} pairs): never-attempted=${counts['never-attempted']}, starved-zero-nodes=${counts['starved-zero-nodes']}, real-attempt=${counts['real-attempt']}`);

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({ featureKeys: FEATURE_KEYS, report }, null, 2) + '\n');
    console.log(`Wrote ${OUT_FILE}`);
}
