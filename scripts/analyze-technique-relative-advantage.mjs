#!/usr/bin/env node
/**
 * Compact relative-advantage analysis over the committed technique-niche base artifact.
 * Development evidence only: outcome-selected action pairs nominate hypotheses, not routing rules.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_PAIRS = [
    ['ida:default', 'ida:mustCrossFirst'],
    ['dfs:harvestThenFinish', 'dfs:portalFirstTransfer'],
    ['beam:objectiveFirst@beam2000', 'beam:objectiveFirst@beam5000'],
    ['beam:intersectionHarvest@beam2000', 'beam:intersectionHarvest@beam5000'],
    ['beam:objectiveFirst@beam5000', 'beam:objectiveFirst@beam5000(diverse)'],
    ['beam:intersectionHarvest@beam5000', 'beam:intersectionHarvest@beam5000(diverse)'],
    ['beam:perimeterSweep/perimeterCW@beam2000', 'beam:perimeterSweep/perimeterCCW@beam2000'],
    ['dfs:perimeterSweep/perimeterCW', 'dfs:perimeterSweep/perimeterCCW'],
];

const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const variance = (xs, m) => xs.length ? xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length : null;

function standardizedDifference(left, right, feature) {
    const a = left.map((row) => row.features[feature]).filter(Number.isFinite);
    const b = right.map((row) => row.features[feature]).filter(Number.isFinite);
    if (!a.length || !b.length) return null;
    const ma = mean(a), mb = mean(b);
    const pooled = Math.sqrt((variance(a, ma) + variance(b, mb)) / 2);
    return {
        feature,
        leftMean: ma,
        rightMean: mb,
        standardizedDifference: pooled ? (ma - mb) / pooled : 0,
    };
}

export function analyzeRelativeAdvantage(base, pairs = DEFAULT_PAIRS) {
    if (!Array.isArray(base.levels) || !base.levels.length) throw new Error('Expected non-empty base.levels');
    const numeric = Object.keys(base.levels[0].features).filter((key) => typeof base.levels[0].features[key] === 'number');
    const pairResults = pairs.map(([leftAction, rightAction]) => {
        const leftOnly = base.levels.filter((row) => row.solvingActions.includes(leftAction) && !row.solvingActions.includes(rightAction));
        const rightOnly = base.levels.filter((row) => row.solvingActions.includes(rightAction) && !row.solvingActions.includes(leftAction));
        const both = base.levels.filter((row) => row.solvingActions.includes(leftAction) && row.solvingActions.includes(rightAction));
        const neither = base.levels.length - leftOnly.length - rightOnly.length - both.length;
        const effects = numeric
            .map((feature) => standardizedDifference(leftOnly, rightOnly, feature))
            .filter(Boolean)
            .sort((a, b) => Math.abs(b.standardizedDifference) - Math.abs(a.standardizedDifference));
        return {
            leftAction, rightAction,
            leftOnly: leftOnly.length, rightOnly: rightOnly.length, both: both.length, neither,
            topEffects: effects.slice(0, 8),
            maxAbsoluteStandardizedDifference: effects.length ? Math.abs(effects[0].standardizedDifference) : null,
            evidenceRole: 'outcome-selected-development',
        };
    });
    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development',
        baseSchemaVersion: base.schemaVersion ?? null,
        pairs: pairResults,
    };
}

async function main() {
    const args = new Map(process.argv.slice(2).map((arg) => arg.split('=', 2)));
    const input = args.get('--input') ?? 'reports/stress/technique-niches/2026-09-01/level-capability.json';
    const output = args.get('--out') ?? 'reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json';
    const base = JSON.parse(readFileSync(input, 'utf8'));
    const result = analyzeRelativeAdvantage(base);
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
    console.log(`Wrote ${output}: ${result.pairs.length} prespecified pair summaries`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
