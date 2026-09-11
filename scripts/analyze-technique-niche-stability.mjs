#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareTechniqueNicheSummaries } from './technique-niche-stability-lib.mjs';

function argMap(argv) {
    return new Map(argv.map((arg) => {
        const idx = arg.indexOf('=');
        return idx < 0 ? [arg, true] : [arg.slice(0, idx), arg.slice(idx + 1)];
    }));
}

function fmt(value, digits = 3) {
    return Number.isFinite(value) ? value.toFixed(digits) : 'n/a';
}

export function renderTechniqueNicheStabilityMarkdown(result, { oldPath, freshPath }) {
    const lines = [
        '# Technique structural-niche temporal stability',
        '',
        '> **Evidence role:** observational-development extension of `reports/2026-09-05-relative-advantage-pairs-temporal-drift-001.md`.',
        `> **Compared:** \`${oldPath}\` -> \`${freshPath}\`.`,
        `> **Persistent threshold:** same effect direction with |standardized difference| >= ${result.persistentThreshold.toFixed(2)} in both snapshots.`,
        '',
        'The Sep-5 report already established that 5/8 pairs changed their single leading structural feature while divergence counts stayed fairly stable. This extension asks the stricter follow-up: whether any material same-direction separator persists anywhere in the stored top-eight effect set.',
        '',
        `Compared ${result.comparedPairCount} frozen action pairs; ${result.persistentPairCount} retain at least one material same-direction structural separator among the top-eight effects stored in both summaries.`,
        '',
        '| pair | disagreement old -> fresh | leader old -> fresh | persistent shared effects | reading |',
        '|---|---:|---|---|---|',
    ];
    for (const row of result.comparisons) {
        const pair = `${row.leftAction} vs ${row.rightAction}`.replaceAll('|', '\\|');
        const leaders = `${row.oldLeader?.feature ?? 'n/a'} (${fmt(row.oldLeader?.effect)}) -> ${row.freshLeader?.feature ?? 'n/a'} (${fmt(row.freshLeader?.effect)})`;
        const persistent = row.persistentFeatures.length
            ? row.persistentFeatures.map((effect) => `${effect.feature} ${fmt(effect.oldEffect)}->${fmt(effect.freshEffect)}`).join('; ')
            : 'none';
        lines.push(`| ${pair} | ${row.oldDisagreement} -> ${row.freshDisagreement} | ${leaders} | ${persistent} | ${row.interpretation} |`);
    }
    lines.push(
        '',
        '## Interpretation boundary',
        '',
        result.interpretationBoundary,
        '',
        'The source summaries retain only the top eight univariate effects per pair. A feature dropping out of the common set is therefore censored evidence, not proof that its association disappeared. Recompute full pair effects from the base capability artifacts before making a decision that depends on a missing feature.',
        '',
    );
    return lines.join('\n');
}

async function main() {
    const args = argMap(process.argv.slice(2));
    const oldPath = args.get('--old') ?? 'reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json';
    const freshPath = args.get('--fresh') ?? 'reports/stress/technique-niches/2026-09-03/relative-advantage-summary.json';
    const outPath = args.get('--out') ?? 'reports/stress/technique-niches/2026-09-03/relative-advantage-temporal-stability.json';
    const mdPath = args.get('--md-out') ?? 'reports/stress/technique-niches/2026-09-03/relative-advantage-temporal-stability.md';
    const persistentThreshold = Number(args.get('--persistent-threshold') ?? 0.30);
    if (!Number.isFinite(persistentThreshold) || persistentThreshold < 0) throw new Error('Invalid --persistent-threshold');

    const oldSummary = JSON.parse(readFileSync(oldPath, 'utf8'));
    const freshSummary = JSON.parse(readFileSync(freshPath, 'utf8'));
    const result = compareTechniqueNicheSummaries(oldSummary, freshSummary, { persistentThreshold });
    writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
    writeFileSync(mdPath, renderTechniqueNicheStabilityMarkdown(result, { oldPath, freshPath }) + '\n');
    console.log(`Wrote ${outPath} and ${mdPath}: ${result.comparedPairCount} pairs, ${result.persistentPairCount} persistent`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
