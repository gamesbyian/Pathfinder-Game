#!/usr/bin/env node
/**
 * Holdout-replication check for a standardized-difference feature ranking against
 * a level-level boolean split (default: productionSolved), computed independently
 * within each half of a second, orthogonal split (default: corpus1 vs corpus2).
 *
 * Exists because scripts/analyze-technique-relative-advantage.mjs's standardized-difference
 * helper is hardwired to a fixed set of action-pair solvingActions comparisons, not an
 * arbitrary level-level boolean grouping -- this script generalizes that computation to any
 * two grouping fields on a technique-niches level-capability.json snapshot's per-level
 * rows, so a broadly-scanned ranking (e.g. the 17-feature production risk-factor ranking in
 * reports/2026-09-04-production-structural-risk-factors-full-replication-001.md) can be
 * re-derived on each half of a natural holdout and compared, guarding against treating an
 * exploratory, multiple-comparisons-exposed ranking as confirmed without a replication check.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const variance = (xs, m) => xs.length ? xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length : null;

function standardizedDifference(left, right, feature) {
    const a = left.map((row) => row.features?.[feature]).filter(Number.isFinite);
    const b = right.map((row) => row.features?.[feature]).filter(Number.isFinite);
    if (!a.length || !b.length) return null;
    const ma = mean(a), mb = mean(b);
    const pooled = Math.sqrt((variance(a, ma) + variance(b, mb)) / 2);
    return { feature, leftMean: ma, rightMean: mb, leftN: a.length, rightN: b.length, standardizedDifference: pooled ? (ma - mb) / pooled : 0 };
}

function rankFeatures(levels, groupField) {
    const truthy = levels.filter((row) => row[groupField] === true);
    const falsy = levels.filter((row) => row[groupField] === false);
    const numeric = Object.keys(levels[0].features).filter((key) => typeof levels[0].features[key] === 'number');
    return numeric
        .map((feature) => standardizedDifference(truthy, falsy, feature))
        .filter(Boolean)
        .sort((a, b) => Math.abs(b.standardizedDifference) - Math.abs(a.standardizedDifference));
}

function spearman(rankA, rankB) {
    const order = rankA.map((r) => r.feature);
    const posA = new Map(order.map((f, i) => [f, i]));
    const posB = new Map(rankB.map((r, i) => [r.feature, i]));
    const shared = order.filter((f) => posB.has(f));
    const n = shared.length;
    if (n < 2) return null;
    const dSquaredSum = shared.reduce((sum, f) => sum + (posA.get(f) - posB.get(f)) ** 2, 0);
    return 1 - (6 * dSquaredSum) / (n * (n ** 2 - 1));
}

export function analyzeHoldoutReplication(base, { groupField = 'productionSolved', splitField = 'corpus', splitValues } = {}) {
    if (!Array.isArray(base.levels) || !base.levels.length) throw new Error('Expected non-empty base.levels');
    const values = splitValues ?? [...new Set(base.levels.map((row) => row[splitField]))].sort();
    if (values.length !== 2) throw new Error(`Expected exactly 2 split values for ${splitField}, found ${JSON.stringify(values)}`);
    const [splitA, splitB] = values;
    const halfA = base.levels.filter((row) => row[splitField] === splitA);
    const halfB = base.levels.filter((row) => row[splitField] === splitB);
    const rankA = rankFeatures(halfA, groupField);
    const rankB = rankFeatures(halfB, groupField);
    const topN = 8;
    const topA = new Set(rankA.slice(0, topN).map((r) => r.feature));
    const topB = new Set(rankB.slice(0, topN).map((r) => r.feature));
    const topOverlap = [...topA].filter((f) => topB.has(f));
    return {
        schemaVersion: 1,
        evidenceRole: 'holdout-replication-check',
        groupField, splitField,
        splitA: { value: splitA, n: halfA.length, ranking: rankA },
        splitB: { value: splitB, n: halfB.length, ranking: rankB },
        spearmanRankCorrelation: spearman(rankA, rankB),
        topNCompared: topN,
        topOverlapCount: topOverlap.length,
        topOverlapFeatures: topOverlap,
    };
}

async function main() {
    const args = new Map(process.argv.slice(2).map((arg) => arg.split('=', 2)));
    const input = args.get('--input') ?? 'reports/stress/technique-niches/2026-09-03/level-capability.json';
    const output = args.get('--out') ?? null;
    const groupField = args.get('--group-field') ?? 'productionSolved';
    const splitField = args.get('--split-field') ?? 'corpus';
    const splitValuesArg = args.get('--split-values');
    const splitValues = splitValuesArg ? splitValuesArg.split(',') : undefined;
    const base = JSON.parse(readFileSync(input, 'utf8'));
    const result = analyzeHoldoutReplication(base, { groupField, splitField, splitValues });
    console.log(`${splitField}=${result.splitA.value} (n=${result.splitA.n}) vs ${splitField}=${result.splitB.value} (n=${result.splitB.n})`);
    console.log(`Spearman rank correlation across ${result.splitA.ranking.length} shared features: ${result.spearmanRankCorrelation?.toFixed(3)}`);
    console.log(`Top-${result.topNCompared} overlap: ${result.topOverlapCount}/${result.topNCompared} (${result.topOverlapFeatures.join(', ')})`);
    if (output) {
        writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
        console.log(`Wrote ${output}`);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
