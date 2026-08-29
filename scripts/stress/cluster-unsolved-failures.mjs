#!/usr/bin/env node
/**
 * Buckets every unsolved level in a benchmark-shaped result file by failure SIGNATURE (not just
 * badness/stability), using only telemetry already recorded per attempt — no new solving. Built
 * to seed a family/variant deep-dive: rather than guessing which levels deserve denser sibling
 * generation, this mines the corpus-wide attempts data for shared bottleneck patterns first.
 *
 * Signatures (a level can match more than one; buckets are diagnostic tags, not exclusive):
 *   beam-collapse   every non-repair beam attempt is timedOut with nodesExpanded below
 *                   --collapse-threshold (default 50). **CONFIRMED NOT A SEARCH-QUALITY SIGNAL —
 *                   DO NOT TREAT THIS BUCKET AS EVIDENCE OF R02248-STYLE FRONTIER LOCKUP.**
 *                   search.ts's beamSearchFromGate only increments prep._metrics.nodesExpanded on
 *                   two paths: finding the goal, or the frontier naturally emptying (a genuine
 *                   dead-end, timedOut:false) — never on any of the three timeout exit paths
 *                   (per-phase budget check, mid-phase 256-node check, maxPhases limit). Verified
 *                   corpus-wide: every single timed-out beam attempt in a benchmark-shaped file
 *                   shows nodesExpanded===0 (1681/1681 in the 2026-07-16 corpus-2 refresh) and
 *                   every non-timed-out one shows >0 (951/951) — a 100% structural correlation
 *                   with zero exceptions, confirmed to persist on a clean local single-threaded
 *                   re-solve (rules out CPU contention from a --workers>1 source run as the
 *                   cause). This bucket therefore just measures "had a beam attempt that timed
 *                   out," not "genuinely got stuck early" -- those are indistinguishable with
 *                   current telemetry. R02248/R01465's actual diagnosis used the _BEAM_DEBUG
 *                   introspection counters (which do track unconditionally), not this field --
 *                   that finding stands on its own terms, it just isn't corpus-searchable this
 *                   way yet. Fix candidate: increment nodesExpanded on every frontier-node touch
 *                   (not only at full-phase-completion) before trusting this bucket for anything.
 *   repair-close    the level has at least one repair attempt (repair-gated per attempts.ts's
 *                   needsRepairFallback), and the lowest bestBadness among *repair* attempts
 *                   specifically is <= --repair-close-threshold (default 5) -- "almost there"
 *                   under the existing repair mechanism, as opposed to repair-far (structurally
 *                   stuck even there). Not mutually exclusive with dfs-plain: since the
 *                   2026-07-17 repair-probe budget fixes, a repair-gated level's attempt ladder
 *                   routinely also includes non-repair DFS/beam attempts (the probe no longer
 *                   silently eats the whole external nodeBudget), so a level can legitimately
 *                   carry both tags. (Before that fix, "every attempt is repair" was an accurate
 *                   proxy for repair-gated; it no longer is -- don't revert to that condition.)
 *   repair-far      has repair attempts, but the best repair-specific badness exceeds the
 *                   threshold.
 *   dfs-plain       has a non-repair, non-beam (plain DFS) attempt that timed out with a
 *                   substantial nodesExpanded (genuinely exhausted its search, not collapsed).
 *   unclassified    none of the above matched (mixed ladders, zero attempts, etc).
 *
 * Usage:
 *   node scripts/stress/cluster-unsolved-failures.mjs --in=reports/stress/benchmark-latest-random.json
 *       --corpus=data/stress/stress-levels-random.json [--collapse-threshold=50]
 *       [--repair-close-threshold=5] [--out=reports/stress/unsolved-failure-clusters.json]
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

const IN_FILE = args.get('--in');
const CORPUS_FILE = args.get('--corpus');
const OUT_FILE = args.get('--out') || 'reports/stress/unsolved-failure-clusters.json';
const COLLAPSE_THRESHOLD = Number(args.get('--collapse-threshold') || 50);
const REPAIR_CLOSE_THRESHOLD = Number(args.get('--repair-close-threshold') || 5);

if (!IN_FILE || !CORPUS_FILE) {
    console.error('Usage: cluster-unsolved-failures.mjs --in=<benchmark-shaped file> --corpus=<levels.json> [--collapse-threshold=50] [--repair-close-threshold=5] [--out=<file>]');
    process.exit(2);
}

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));
const benchmark = readJson(IN_FILE);
const corpus = readJson(CORPUS_FILE);
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const corpusById = new Map(corpusLevels.map(lv => [lv.id, lv]));

function levelBadnessOf(lv) {
    let best = Infinity;
    for (const a of lv.attempts || []) {
        const b = a.bestBadness ?? a.finalBadness;
        if (Number.isFinite(b) && b < best) best = b;
    }
    return Number.isFinite(best) ? best : null;
}

function classify(lv) {
    const attempts = lv.attempts || [];
    if (attempts.length === 0) return { tags: ['unclassified'], badness: null };

    const beamAttempts = attempts.filter(a => a.beamWidth && !a.repair);
    const repairAttempts = attempts.filter(a => a.repair);
    const dfsPlainAttempts = attempts.filter(a => !a.beamWidth && !a.repair);

    const tags = [];
    if (beamAttempts.length > 0 && beamAttempts.every(a => a.timedOut && (a.nodesExpanded ?? 0) < COLLAPSE_THRESHOLD)) {
        tags.push('beam-collapse');
    }
    if (repairAttempts.length > 0) {
        const bestRepairBadness = Math.min(...repairAttempts.map(a => a.bestBadness ?? Infinity));
        tags.push(Number.isFinite(bestRepairBadness) && bestRepairBadness <= REPAIR_CLOSE_THRESHOLD ? 'repair-close' : 'repair-far');
    }
    if (dfsPlainAttempts.some(a => a.timedOut && (a.nodesExpanded ?? 0) >= COLLAPSE_THRESHOLD)) {
        tags.push('dfs-plain');
    }
    if (tags.length === 0) tags.push('unclassified');
    return { tags, badness: levelBadnessOf(lv) };
}

const clusters = new Map(); // tag -> array of {id, badness, routingRegime, features}
const unsolved = benchmark.levels.filter(lv => !lv.ok);

for (const lv of unsolved) {
    const raw = corpusById.get(lv.id);
    if (!raw) continue;
    const features = levelFeatures(raw);
    const { tags, badness } = classify(lv);
    for (const tag of tags) {
        if (!clusters.has(tag)) clusters.set(tag, []);
        clusters.get(tag).push({ id: lv.id, badness, routingRegime: features.routingRegime, requiredPathCoverageRatio: features.requiredPathCoverageRatio, reqInt: features.reqInt, mustCross: features.mustCross, mustPass: features.mustPass, surround: features.surround });
    }
}

const summary = {};
for (const [tag, members] of clusters) {
    members.sort((a, b) => (a.badness ?? Infinity) - (b.badness ?? Infinity));
    const byRoutingRegime = {};
    for (const m of members) byRoutingRegime[m.routingRegime] = (byRoutingRegime[m.routingRegime] ?? 0) + 1;
    summary[tag] = { count: members.length, byRoutingRegime, closestMisses: members.slice(0, 10).map(m => m.id) };
}

const engineNote = benchmark.engine || null;
const out = {
    generatedAt: new Date().toISOString(),
    inputFile: IN_FILE,
    inputEngine: engineNote,
    collapseThreshold: COLLAPSE_THRESHOLD,
    repairCloseThreshold: REPAIR_CLOSE_THRESHOLD,
    totalUnsolved: unsolved.length,
    summary,
    clusters: Object.fromEntries(clusters),
};

writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(out, null, 1));

console.log(`Clustered ${unsolved.length} unsolved level(s) from ${IN_FILE} (engine: ${engineNote ?? 'unknown'}).\n`);
if (clusters.has('beam-collapse')) {
    console.error('  !! beam-collapse is NOT a search-quality signal -- confirmed structural instrumentation gap');
    console.error('  !! (nodesExpanded is never recorded for a timed-out beam attempt). See this script\'s own');
    console.error('  !! doc comment and reports/2026-07-16-beam-nodesexpanded-instrumentation-gap.md.\n');
}
for (const [tag, s] of Object.entries(summary)) {
    console.log(`${tag}: ${s.count} level(s)`);
    console.log(`  by routingRegime: ${JSON.stringify(s.byRoutingRegime)}`);
    console.log(`  closest misses: ${s.closestMisses.join(',')}`);
}
console.log(`\nWrote ${OUT_FILE}`);
