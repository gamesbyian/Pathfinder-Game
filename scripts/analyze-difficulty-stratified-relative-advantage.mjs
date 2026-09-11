#!/usr/bin/env node
/**
 * Re-run the frozen technique relative-advantage contrasts within coarse generic-difficulty strata.
 *
 * This is deliberately not a production classifier. The burden score uses established static risk
 * features, then asks whether an A-only/B-only structural distinction survives among levels of
 * roughly comparable generic burden. Feature-set overrides support multicollinearity sensitivity.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeRelativeAdvantage } from './analyze-technique-relative-advantage.mjs';

export const DEFAULT_DIFFICULTY_FEATURES = [
    'constrainedObjects',
    'turnConstraintLoad',
    'constrainedObjectDensity',
    'requiredPathLength',
    'portals',
    'requiredPathCoverageRatio',
    'mustTurn',
    'surround',
    'blocks',
];

function mean(xs) {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs) {
    if (!xs.length) return null;
    const sorted = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stats(rows, feature) {
    const values = rows.map((row) => row.features?.[feature]).filter(Number.isFinite);
    if (!values.length) throw new Error(`No numeric values for difficulty feature ${feature}`);
    const m = mean(values);
    const variance = mean(values.map((value) => (value - m) ** 2));
    return { mean: m, std: Math.sqrt(variance) || 1 };
}

export function attachGenericDifficulty(rows, features = DEFAULT_DIFFICULTY_FEATURES) {
    const featureStats = Object.fromEntries(features.map((feature) => [feature, stats(rows, feature)]));
    return rows.map((row) => {
        const terms = features.map((feature) => {
            const value = row.features?.[feature];
            if (!Number.isFinite(value)) return null;
            const s = featureStats[feature];
            return (value - s.mean) / s.std;
        }).filter(Number.isFinite);
        return { row, genericDifficultyScore: terms.length ? mean(terms) : 0 };
    });
}

export function assignDifficultyStrata(rows, stratumCount = 5, features = DEFAULT_DIFFICULTY_FEATURES) {
    if (!Number.isInteger(stratumCount) || stratumCount < 2) throw new Error('stratumCount must be an integer >= 2');
    if (!Array.isArray(features) || !features.length) throw new Error('difficulty features must be a non-empty array');
    const scored = attachGenericDifficulty(rows, features)
        .sort((a, b) => a.genericDifficultyScore - b.genericDifficultyScore || String(a.row.id).localeCompare(String(b.row.id)));
    const strata = Array.from({ length: stratumCount }, (_, index) => ({ index, rows: [], minScore: null, maxScore: null }));
    scored.forEach((entry, rank) => {
        const index = Math.min(stratumCount - 1, Math.floor((rank * stratumCount) / scored.length));
        const stratum = strata[index];
        stratum.rows.push(entry.row);
        stratum.minScore = stratum.minScore === null ? entry.genericDifficultyScore : Math.min(stratum.minScore, entry.genericDifficultyScore);
        stratum.maxScore = stratum.maxScore === null ? entry.genericDifficultyScore : Math.max(stratum.maxScore, entry.genericDifficultyScore);
    });
    return strata;
}

function sign(value) {
    return value > 0 ? 1 : value < 0 ? -1 : 0;
}

function summarizeMultiplicity(rows) {
    const counts = rows.map((row) => Array.isArray(row.solvingActions) ? row.solvingActions.length : 0);
    return {
        n: counts.length,
        meanSolverCount: counts.length ? mean(counts) : null,
        medianSolverCount: median(counts),
        thinShare: counts.length ? counts.filter((count) => count <= 2).length / counts.length : null,
        broadShare: counts.length ? counts.filter((count) => count >= 6).length / counts.length : null,
    };
}

function pairMultiplicityContext(base, leftAction, rightAction) {
    const leftOnly = base.levels.filter((row) => row.solvingActions.includes(leftAction) && !row.solvingActions.includes(rightAction));
    const rightOnly = base.levels.filter((row) => row.solvingActions.includes(rightAction) && !row.solvingActions.includes(leftAction));
    return {
        leftOnly: summarizeMultiplicity(leftOnly),
        rightOnly: summarizeMultiplicity(rightOnly),
        interpretation: 'Offline confidence context only: solverCount/multiplicity is historical census evidence and is not a legal cold-solver routing input.',
    };
}

function summarizePairAcrossStrata(pairIndex, stratumResults, { minExclusivePerSide = 5, materialThreshold = 0.20 } = {}) {
    const eligible = stratumResults.map((stratum) => {
        const pair = stratum.analysis.pairs[pairIndex];
        return {
            stratum: stratum.index,
            population: stratum.population,
            minScore: stratum.minScore,
            maxScore: stratum.maxScore,
            pair,
            eligible: pair.leftOnly >= minExclusivePerSide && pair.rightOnly >= minExclusivePerSide,
        };
    }).filter((row) => row.eligible);

    const featureRows = new Map();
    for (const stratum of eligible) {
        for (const effect of stratum.pair.topEffects ?? []) {
            const bucket = featureRows.get(effect.feature) ?? [];
            bucket.push({ stratum: stratum.stratum, effect: effect.standardizedDifference });
            featureRows.set(effect.feature, bucket);
        }
    }
    const stableFeatures = [...featureRows.entries()].map(([feature, observations]) => {
        const material = observations.filter((row) => Math.abs(row.effect) >= materialThreshold);
        const directions = new Set(material.map((row) => sign(row.effect)).filter(Boolean));
        return {
            feature,
            observedEligibleStrata: observations.length,
            materialStrata: material.length,
            sameMaterialDirection: material.length >= 2 && directions.size === 1,
            effects: observations,
        };
    }).filter((row) => row.sameMaterialDirection)
        .sort((a, b) => b.materialStrata - a.materialStrata || b.observedEligibleStrata - a.observedEligibleStrata);

    const exemplar = stratumResults[0].analysis.pairs[pairIndex];
    return {
        leftAction: exemplar.leftAction,
        rightAction: exemplar.rightAction,
        eligibleStrata: eligible.length,
        stableFeatures,
        strata: stratumResults.map((stratum) => {
            const pair = stratum.analysis.pairs[pairIndex];
            return {
                stratum: stratum.index,
                population: stratum.population,
                minScore: stratum.minScore,
                maxScore: stratum.maxScore,
                leftOnly: pair.leftOnly,
                rightOnly: pair.rightOnly,
                both: pair.both,
                eligible: pair.leftOnly >= minExclusivePerSide && pair.rightOnly >= minExclusivePerSide,
                topEffects: pair.topEffects,
            };
        }),
    };
}

export function analyzeDifficultyStratifiedRelativeAdvantage(base, {
    stratumCount = 5,
    difficultyFeatures = DEFAULT_DIFFICULTY_FEATURES,
    minExclusivePerSide = 5,
    materialThreshold = 0.20,
} = {}) {
    if (!Array.isArray(base?.levels) || !base.levels.length) throw new Error('Expected non-empty base.levels');
    const strata = assignDifficultyStrata(base.levels, stratumCount, difficultyFeatures);
    const stratumResults = strata.map((stratum) => ({
        index: stratum.index,
        population: stratum.rows.length,
        minScore: stratum.minScore,
        maxScore: stratum.maxScore,
        analysis: analyzeRelativeAdvantage({ ...base, levels: stratum.rows }),
    }));
    const pairCount = stratumResults[0].analysis.pairs.length;
    const pairs = Array.from({ length: pairCount }, (_, pairIndex) => {
        const summary = summarizePairAcrossStrata(pairIndex, stratumResults, { minExclusivePerSide, materialThreshold });
        return {
            ...summary,
            multiplicityContext: pairMultiplicityContext(base, summary.leftAction, summary.rightAction),
        };
    });
    return {
        schemaVersion: 1,
        evidenceRole: 'observational-development-difficulty-stratified',
        burdenScore: {
            features: difficultyFeatures,
            construction: 'mean within-population z-score; configured features must be oriented so larger values indicate greater generic burden',
            purpose: 'coarse nuisance stratification only; not a production feature or calibrated difficulty probability',
        },
        stratumCount,
        minExclusivePerSide,
        materialThreshold,
        pairs,
        interpretationBoundary: 'Persistence within generic-burden strata weakens the explanation that a pairwise niche is merely overall difficulty. Multiplicity supplies offline fragility context. Because the burden features are correlated, decision-bearing effects should also survive a plausible reduced-feature sensitivity run. None of this establishes causality; variant-family and operational/mechanism evidence remain the next escalation for stable effects.',
    };
}

function fmt(value) {
    return Number.isFinite(value) ? value.toFixed(2) : 'n/a';
}

function pct(value) {
    return Number.isFinite(value) ? `${(100 * value).toFixed(0)}%` : 'n/a';
}

export function renderMarkdown(result, input) {
    const lines = [
        '# Difficulty-stratified technique relative advantage',
        '',
        '> **Evidence role:** observational-development; no new solver dispatch.',
        `> **Input:** \`${input}\`.`,
        `> **Generic burden:** ${result.burdenScore.features.join(', ')}.`,
        '',
        `The population is split into ${result.stratumCount} equal-count bands by the configured generic structural-burden score. Pairwise A-only/B-only effects are then recomputed inside each band. A stratum is interpretation-eligible only with at least ${result.minExclusivePerSide} exclusive wins on each side. Multiplicity is reported only as offline fragility context.`,
        '',
        '| pair | eligible strata | recurring same-direction material effects | thin share L / R |',
        '|---|---:|---|---:|',
    ];
    for (const pair of result.pairs) {
        const name = `${pair.leftAction} vs ${pair.rightAction}`.replaceAll('|', '\\|');
        const stable = pair.stableFeatures.length
            ? pair.stableFeatures.map((feature) => `${feature.feature} (${feature.materialStrata} strata)`).join('; ')
            : 'none at current thresholds';
        const thin = `${pct(pair.multiplicityContext.leftOnly.thinShare)} / ${pct(pair.multiplicityContext.rightOnly.thinShare)}`;
        lines.push(`| ${name} | ${pair.eligibleStrata} | ${stable} | ${thin} |`);
    }
    lines.push('', '## Strata', '');
    if (result.pairs[0]) {
        for (const stratum of result.pairs[0].strata) {
            lines.push(`- band ${stratum.stratum + 1}: n=${stratum.population}, burden score ${fmt(stratum.minScore)} to ${fmt(stratum.maxScore)}`);
        }
    }
    lines.push('', '## Interpretation boundary', '', result.interpretationBoundary, '');
    return lines.join('\n');
}

function args(argv) {
    return new Map(argv.map((arg) => {
        const i = arg.indexOf('=');
        return i < 0 ? [arg, true] : [arg.slice(0, i), arg.slice(i + 1)];
    }));
}

async function main() {
    const a = args(process.argv.slice(2));
    const input = a.get('--input') ?? 'reports/stress/technique-niches/2026-09-03/level-capability.json';
    const out = a.get('--out') ?? 'reports/stress/technique-niches/2026-09-03/difficulty-stratified-relative-advantage.json';
    const mdOut = a.get('--md-out') ?? 'reports/stress/technique-niches/2026-09-03/difficulty-stratified-relative-advantage.md';
    const stratumCount = Number(a.get('--strata') ?? 5);
    const minExclusivePerSide = Number(a.get('--min-exclusive-per-side') ?? 5);
    const materialThreshold = Number(a.get('--material-threshold') ?? 0.20);
    const featureArg = a.get('--difficulty-features');
    const difficultyFeatures = typeof featureArg === 'string'
        ? featureArg.split(',').map((value) => value.trim()).filter(Boolean)
        : DEFAULT_DIFFICULTY_FEATURES;
    const base = JSON.parse(readFileSync(input, 'utf8'));
    const result = analyzeDifficultyStratifiedRelativeAdvantage(base, {
        stratumCount,
        difficultyFeatures,
        minExclusivePerSide,
        materialThreshold,
    });
    writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    writeFileSync(mdOut, renderMarkdown(result, input) + '\n');
    console.log(`Wrote ${out} and ${mdOut}: ${result.pairs.length} frozen pairs across ${result.stratumCount} burden bands`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
