#!/usr/bin/env node
/**
 * Curates a compact, information-dense development benchmark from Corpus 2's unsolved levels —
 * a fixed subset for iterative solver work, so a change doesn't need the full 1700-level sweep
 * (hours) to get a meaningful read on whether it helped.
 *
 * This is NOT "the N hardest levels by runtime/nodes" — that would just be a badness-sorted list,
 * already available via `stress:rank-levels`. The goal here is maximizing INFORMATION VALUE: a
 * level only earns a slot if it's likely to expose a solver weakness *distinct* from what's
 * already represented, using every signal already recorded rather than guessing from a single
 * number. Four requested properties, each mapped to an existing signal (no new solving):
 *
 *   - "exhausts search" / "times out"  -> stability class (classify-stability.mjs's classifyOne:
 *     'known-unsolved' = confidently failed, not just a budget-edge timeout, vs 'budget-edge' =
 *     still timing out, plausibly solvable with more budget — genuinely different failure modes).
 *   - "near misses"                    -> badness (rank-levels.mjs's levelBadness: min tracked
 *     distance-from-solution across all attempts).
 *   - "diverse mechanics"              -> routingRegime (features.mjs's classifyRoutingRegimeFromRaw, the
 *     solver's own attempt-ladder routing bucket) + raw mechanic counts.
 *   - "avoid redundant failure clusters" -> greedy farthest-point selection on structural distance
 *     (features.mjs's levelDistance/noveltyAgainstPool) blended with failedStrategies-set overlap,
 *     so two levels that are both structurally similar AND fail to the same attempt configs get
 *     pushed apart even if neither alone would flag the other as a near-duplicate.
 *
 * A fifth existing signal — witness-divergence.mjs's cumulativeDiscrepancy/maxStepRank (how much
 * the solver's own greedy scoring disagrees with the actual hidden solution, a "combinatorial
 * wall" signature independent of raw search difficulty) — isn't a selection axis on its own; it's
 * recorded per level in the report and folded into the diversity distance, since two levels with
 * similar badness/runtime can fail for structurally different reasons (one is just big, one
 * actively fights the solver's heuristic).
 *
 * ## Algorithm (simple, hand-auditable — see docs/solver-dev-tooling-plan.md's rank-levels.mjs
 * rationale for why a learned ranker would be over-engineering at this corpus size)
 *
 *   1. Stratify all unsolved levels by (routingRegime, stability) — up to 5x2 = 10 buckets, typically
 *      fewer populated (near-closure levels are essentially always solved, for instance).
 *   2. Give every non-empty stratum a floor (--floor, default 8) so nothing gets crowded out, then
 *      distribute the remaining budget proportional to sqrt(stratum size) — linear-proportional
 *      would let one dominant routingRegime (in this corpus, high-intersection-burden/budget-edge)
 *      swallow almost the whole benchmark; sqrt still respects size ordering but gives small,
 *      rare-but-informative strata (e.g. must-cross-heavy/known-unsolved) a meaningfully larger
 *      share than their raw count would imply.
 *   3. Within each stratum's quota, split roughly in half:
 *        - near-miss half: lowest badness-percentile-within-stratum first (the actual "almost
 *          solved" levels for that mechanic/failure-mode combination).
 *        - diversity half: greedy farthest-point selection against the GLOBALLY selected-so-far
 *          pool (not just this stratum), on a blended structural + failure-signature distance —
 *          this is what suppresses "the same failure, over and over" across the whole benchmark,
 *          not just within one routingRegime.
 *   4. Final dedup pass: any pair of selected levels closer than --dedup-threshold on the blended
 *      distance gets pruned (keep the lower-badness one) and backfilled from its stratum's
 *      remaining pool, since the near-miss half isn't diversity-filtered against itself.
 *
 * Pure JS (features.mjs/rank-levels.mjs/classify-stability.mjs are all plain-node) — runs under
 * plain node, no run-bundled.mjs wrapper needed, and does zero new solving (all inputs are
 * already-recorded telemetry):
 *   node scripts/stress/curate-dev-benchmark.mjs
 *       [--benchmark=reports/stress/solver-corpus2-latest.json]
 *       [--witness-divergence=reports/stress/witness-divergence-random.json]
 *       [--corpus=data/stress/stress-levels-random.json]
 *       [--target=112] [--floor=8] [--dedup-threshold=0.05]
 *       [--out=reports/stress/dev-benchmark-corpus2.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { levelBadness } from './rank-levels.mjs';
import { classifyOne } from './classify-stability.mjs';
import { levelFeatures, levelDistance } from './features.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const BENCHMARK_FILE = args.get('--benchmark') || 'reports/stress/solver-corpus2-latest.json';
const WITNESS_DIVERGENCE_FILE = args.get('--witness-divergence') || 'reports/stress/witness-divergence-random.json';
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const TARGET = Number(args.get('--target') || 112);
const FLOOR = Number(args.get('--floor') || 8);
const DEDUP_THRESHOLD = Number(args.get('--dedup-threshold') || 0.05);
const OUT_FILE = args.get('--out') || 'reports/stress/dev-benchmark-corpus2.json';

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));

const benchmark = readJson(BENCHMARK_FILE);
const witnessDivergence = readJson(WITNESS_DIVERGENCE_FILE);
const corpus = readJson(CORPUS_FILE);

const corpusById = new Map(corpus.levels.map(lv => [lv.id, lv]));
const witnessDivergenceById = new Map(witnessDivergence.results.map(r => [r.id, r]));

// ─── Build per-level candidate records ───────────────────────────────────────

const stabilityOf = (lv) => classifyOne(lv, benchmark.budgetMs);

function witnessPairsOf(raw) {
    const pairs = raw?.stressMeta?.witnessSolution;
    return Array.isArray(pairs) ? pairs : null;
}

const candidates = [];
for (const lv of benchmark.levels) {
    if (lv.ok) continue; // solved — not eligible for an unsolved dev benchmark
    const raw = corpusById.get(lv.id);
    if (!raw) continue; // shouldn't happen for a benchmark run against this exact corpus file
    const features = levelFeatures(raw, witnessPairsOf(raw));
    const wd = witnessDivergenceById.get(lv.id) || null;
    candidates.push({
        id: lv.id,
        routingRegime: features.routingRegime,
        stability: stabilityOf(lv),
        badness: levelBadness(lv),
        nodesExpanded: lv.nodesExpanded ?? null,
        elapsedMs: lv.elapsedMs ?? null,
        attemptCount: lv.attemptCount ?? (lv.attempts || []).length,
        status: lv.status,
        failedStrategies: new Set(lv.failedStrategies || []),
        cumulativeDiscrepancy: wd?.cumulativeDiscrepancy ?? null,
        maxStepRank: wd?.maxStepRank ?? null,
        features,
    });
}

// ─── Blended distance: structural (features.mjs) + failure-signature overlap ────────────────

function jaccardDistance(a, b) {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    for (const v of a) if (b.has(v)) inter++;
    return 1 - inter / (a.size + b.size - inter);
}

/** 0.75 structural distance + 0.25 "did these fail to the same attempt configs" distance — two
 *  levels that are both structurally similar AND die to the same profiles are the clearest case
 *  of "redundant failure cluster" this tool exists to thin out. */
function blendedDistance(a, b) {
    const structural = levelDistance(a.features, b.features);
    const failureOverlap = jaccardDistance(a.failedStrategies, b.failedStrategies);
    return 0.75 * structural + 0.25 * failureOverlap;
}

function minDistanceToPool(candidate, pool) {
    if (pool.length === 0) return 1;
    let min = Infinity;
    for (const p of pool) min = Math.min(min, blendedDistance(candidate, p));
    return min;
}

// ─── Stratify by (routingRegime, stability) ──────────────────────────────────────

const strataMap = new Map();
for (const c of candidates) {
    const key = `${c.routingRegime}/${c.stability}`;
    if (!strataMap.has(key)) strataMap.set(key, []);
    strataMap.get(key).push(c);
}
const strata = Array.from(strataMap.entries())
    .map(([key, members]) => ({ key, members }))
    .sort((a, b) => a.members.length - b.members.length); // smallest first: rare strata pick before the pool crowds

// ─── Quota: floor + sqrt-proportional remainder, capped at stratum size ─────

const sqrtSum = strata.reduce((s, st) => s + Math.sqrt(st.members.length), 0);
const floorTotal = strata.reduce((s, st) => s + Math.min(FLOOR, st.members.length), 0);
const remainder = Math.max(0, TARGET - floorTotal);

for (const st of strata) {
    const floorShare = Math.min(FLOOR, st.members.length);
    const proportionalShare = sqrtSum > 0 ? Math.round((remainder * Math.sqrt(st.members.length)) / sqrtSum) : 0;
    st.quota = Math.min(st.members.length, floorShare + proportionalShare);
}
// Rounding can drift the total slightly off TARGET — nudge the largest stratum (it has the most
// room to absorb a +/-few adjustment without materially changing its character).
let totalQuota = strata.reduce((s, st) => s + st.quota, 0);
const largest = strata.reduce((a, b) => (a.members.length > b.members.length ? a : b));
largest.quota = Math.max(0, Math.min(largest.members.length, largest.quota + (TARGET - totalQuota)));

// ─── Per-stratum selection: near-miss half + diversity half ─────────────────

const selected = []; // global pool, grows across strata
const selectionLog = new Map(); // id -> { reason, nearestId, nearestDistance }

function badnessPercentileWithinStratum(members) {
    const withBadness = members.filter(m => Number.isFinite(m.badness)).sort((a, b) => a.badness - b.badness);
    const rank = new Map(withBadness.map((m, i) => [m.id, i / Math.max(1, withBadness.length - 1)]));
    return (m) => rank.has(m.id) ? rank.get(m.id) : 1; // no badness signal at all ranks last
}

for (const st of strata) {
    if (st.quota <= 0) continue;
    const percentileOf = badnessPercentileWithinStratum(st.members);
    const remaining = new Set(st.members);

    const nearMissCount = Math.ceil(st.quota / 2);
    const nearMissPicks = Array.from(remaining)
        .sort((a, b) => percentileOf(a) - percentileOf(b))
        .slice(0, nearMissCount);
    for (const c of nearMissPicks) {
        remaining.delete(c);
        selected.push(c);
        selectionLog.set(c.id, { reason: 'near-miss', badnessPercentile: Number(percentileOf(c).toFixed(3)) });
    }

    const diverseCount = st.quota - nearMissPicks.length;
    for (let i = 0; i < diverseCount && remaining.size > 0; i++) {
        let best = null, bestScore = -1, bestNearest = null;
        for (const c of remaining) {
            let nearest = null, nearestDist = Infinity;
            for (const p of selected) {
                const d = blendedDistance(c, p);
                if (d < nearestDist) { nearestDist = d; nearest = p.id; }
            }
            const score = selected.length === 0 ? 1 : nearestDist;
            if (score > bestScore) { bestScore = score; best = c; bestNearest = nearest; }
        }
        remaining.delete(best);
        selected.push(best);
        selectionLog.set(best.id, { reason: 'diversity', nearestSelectedId: bestNearest, nearestDistance: Number(bestScore.toFixed(4)) });
    }
}

// ─── Final dedup pass: near-miss picks weren't diversity-filtered against each other ─────────

function dedupPass(selectedList) {
    let changed = true;
    while (changed) {
        changed = false;
        outer:
        for (let i = 0; i < selectedList.length; i++) {
            for (let j = i + 1; j < selectedList.length; j++) {
                const d = blendedDistance(selectedList[i], selectedList[j]);
                if (d < DEDUP_THRESHOLD) {
                    // Keep whichever has the lower (closer-to-solved) badness — more informative.
                    const bi = Number.isFinite(selectedList[i].badness) ? selectedList[i].badness : Infinity;
                    const bj = Number.isFinite(selectedList[j].badness) ? selectedList[j].badness : Infinity;
                    const dropIdx = bi <= bj ? j : i;
                    const dropped = selectedList[dropIdx];
                    const stratumKey = `${dropped.routingRegime}/${dropped.stability}`;
                    const stratum = strataMap.get(stratumKey);
                    const selectedIds = new Set(selectedList.map(s => s.id));
                    const backfillPool = stratum.filter(m => !selectedIds.has(m.id) && m.id !== dropped.id);
                    selectedList.splice(dropIdx, 1);
                    if (backfillPool.length > 0) {
                        // Backfill with the most novel remaining candidate in the same stratum.
                        let best = null, bestScore = -1;
                        for (const c of backfillPool) {
                            const score = minDistanceToPool(c, selectedList);
                            if (score > bestScore) { bestScore = score; best = c; }
                        }
                        selectedList.push(best);
                        selectionLog.set(best.id, { reason: 'dedup-backfill', replacedId: dropped.id });
                    }
                    selectionLog.delete(dropped.id);
                    changed = true;
                    break outer;
                }
            }
        }
    }
    return selectedList;
}

const finalSelection = dedupPass(selected);

// ─── Report ───────────────────────────────────────────────────────────────

const strataReport = strata.map(st => ({
    key: st.key,
    poolSize: st.members.length,
    quota: st.quota,
    selected: finalSelection.filter(c => `${c.routingRegime}/${c.stability}` === st.key).length,
}));

const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
const poolBadness = candidates.filter(c => Number.isFinite(c.badness)).map(c => c.badness);
const selectedBadness = finalSelection.filter(c => Number.isFinite(c.badness)).map(c => c.badness);

const levels = finalSelection
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(c => ({
        id: c.id,
        routingRegime: c.routingRegime,
        stability: c.stability,
        badness: c.badness,
        nodesExpanded: c.nodesExpanded,
        elapsedMs: c.elapsedMs,
        attemptCount: c.attemptCount,
        status: c.status,
        cumulativeDiscrepancy: c.cumulativeDiscrepancy,
        maxStepRank: c.maxStepRank,
        mechanicCounts: {
            mustPass: c.features.mustPass, mustCross: c.features.mustCross,
            portalPairs: c.features.portalPairs, flippers: c.features.flippers,
            surround: c.features.surround, mustTurn: c.features.mustTurn, adjTurn: c.features.adjTurn,
        },
        requiredPathCoverageRatio: Number(c.features.requiredPathCoverageRatio.toFixed(4)),
        failedStrategies: Array.from(c.failedStrategies),
        selection: selectionLog.get(c.id) || null,
    }));

const output = {
    generatedAt: new Date().toISOString(),
    description: 'Curated development benchmark: a fixed, information-dense subset of Corpus 2\'s '
        + 'unsolved levels for iterative solver work — see scripts/stress/curate-dev-benchmark.mjs '
        + 'for the selection algorithm. NOT a difficulty-sorted top-N; selected for coverage across '
        + 'failure mode (exhausted vs. timed-out), mechanic routingRegime, near-miss depth, and '
        + 'structural/failure-signature diversity.',
    sources: { benchmark: BENCHMARK_FILE, witnessDivergence: WITNESS_DIVERGENCE_FILE, corpus: CORPUS_FILE },
    params: { target: TARGET, floor: FLOOR, dedupThreshold: DEDUP_THRESHOLD },
    poolSize: candidates.length,
    selectedCount: levels.length,
    strata: strataReport,
    badnessSanityCheck: {
        meanBadnessFullUnsolvedPool: mean(poolBadness),
        meanBadnessSelected: mean(selectedBadness),
        note: 'Selected mean should sit BELOW the pool mean (near-miss halves pull it down) but '
            + 'not equal to the pool minimum (diversity halves intentionally include some levels '
            + 'that are not close misses, per the "exhausts search" / "diverse mechanics" requirements).',
    },
    levelIds: levels.map(l => l.id),
    levels,
};

writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(output, null, 1) + '\n');

const levelSpecCommand = `npm run stress:measure-solver -- --corpus=${CORPUS_FILE} --levels=${levels.map(l => l.id).join(',')}`;

const mdLines = [
    `# Curated development benchmark — Corpus 2`,
    '',
    `Generated ${output.generatedAt} by \`npm run stress:curate-dev-benchmark\`. See ` +
    '[`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) ' +
    'for the selection algorithm — NOT a difficulty-sorted top-N.',
    '',
    `- **${output.selectedCount}** levels selected from a pool of **${output.poolSize}** unsolved Corpus-2 levels.`,
    `- Mean badness — full pool: **${output.badnessSanityCheck.meanBadnessFullUnsolvedPool?.toFixed(2)}**, ` +
    `selected: **${output.badnessSanityCheck.meanBadnessSelected?.toFixed(2)}** (lower = closer to solved).`,
    `- Selection reason split: **${levels.filter(l => l.selection?.reason === 'near-miss').length}** near-miss, ` +
    `**${levels.filter(l => l.selection?.reason === 'diversity').length}** diversity, ` +
    `**${levels.filter(l => l.selection?.reason === 'dedup-backfill').length}** dedup-backfill.`,
    '',
    '## Strata coverage',
    '',
    '| Routing regime / stability | Selected | Quota | Pool |',
    '|---|---|---|---|',
    ...strataReport.map(s => `| ${s.key} | ${s.selected} | ${s.quota} | ${s.poolSize} |`),
    '',
    '## Running it',
    '',
    '```sh',
    levelSpecCommand,
    '```',
    '',
];
writeFileSync(path.resolve(ROOT, OUT_FILE.replace(/\.json$/, '-summary.md')), mdLines.join('\n'));

console.log(`Curated ${levels.length} level(s) from a pool of ${candidates.length} unsolved Corpus-2 levels.`);
console.log('\nStrata coverage:');
for (const s of strataReport) console.log(`  ${s.key}: ${s.selected}/${s.quota} selected (pool ${s.poolSize})`);
console.log(`\nMean badness — full pool: ${output.badnessSanityCheck.meanBadnessFullUnsolvedPool?.toFixed(2)}, selected: ${output.badnessSanityCheck.meanBadnessSelected?.toFixed(2)}`);
console.log(`\nWrote ${OUT_FILE}`);
console.log(`Wrote ${OUT_FILE.replace(/\.json$/, '-summary.md')}`);
console.log(`\nUse via: ${levelSpecCommand}`);
