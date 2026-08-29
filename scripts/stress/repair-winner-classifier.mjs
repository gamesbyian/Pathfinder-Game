#!/usr/bin/env node

/** Re-runs the documented binary "will repair win?" threshold probe with deterministic 5-fold CV. */
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { levelFeatures } from './features.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [key, ...value] = a.split('=');
    return [key, value.join('=')];
}));
const baselineFile = args.get('--baseline') || 'logs/stress-corpus2-baseline.json';
const corpusFile = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const folds = Number(args.get('--folds') || 5);

if (!Number.isInteger(folds) || folds < 2) throw new Error('--folds must be an integer >= 2');

const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
const corpus = JSON.parse(readFileSync(corpusFile, 'utf8'));
const rawById = new Map(corpus.levels.map(level => [level.id, level]));
const rows = baseline.levels
    .filter(result => result.ok && rawById.has(result.id))
    .map(result => ({
        id: result.id,
        repair: String(result.winningConfig || '').includes('repair'),
        features: levelFeatures(rawById.get(result.id)),
    }));

const numericFeatures = Object.keys(rows[0]?.features || {})
    .filter(key => rows.every(row => Number.isFinite(row.features[key])));

function idHash(id) {
    let hash = 2166136261;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return hash >>> 0;
}

function metrics(predictions) {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const { predicted, actual } of predictions) {
        if (predicted && actual) tp++;
        else if (predicted) fp++;
        else if (actual) fn++;
        else tn++;
    }
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return { tp, fp, fn, tn, precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 };
}

function candidates(training, feature) {
    const values = [...new Set(training.map(row => row.features[feature]))].sort((a, b) => a - b);
    return values.flatMap(threshold => [
        { threshold, direction: '<=' },
        { threshold, direction: '>=' },
    ]);
}

function predicts(row, feature, rule) {
    return rule.direction === '<='
        ? row.features[feature] <= rule.threshold
        : row.features[feature] >= rule.threshold;
}

function bestRule(training, feature) {
    return candidates(training, feature)
        .map(rule => ({ ...rule, ...metrics(training.map(row => ({ predicted: predicts(row, feature, rule), actual: row.repair }))) }))
        .sort((a, b) => b.f1 - a.f1 || b.recall - a.recall || b.precision - a.precision || a.threshold - b.threshold)[0];
}

const crossValidated = numericFeatures.map(feature => {
    const predictions = [];
    const rules = [];
    for (let fold = 0; fold < folds; fold++) {
        const training = rows.filter(row => idHash(row.id) % folds !== fold);
        const heldOut = rows.filter(row => idHash(row.id) % folds === fold);
        const rule = bestRule(training, feature);
        rules.push({ fold, threshold: rule.threshold, direction: rule.direction });
        predictions.push(...heldOut.map(row => ({ predicted: predicts(row, feature, rule), actual: row.repair })));
    }
    return { feature, ...metrics(predictions), rules };
}).sort((a, b) => b.f1 - a.f1 || b.recall - a.recall || b.precision - a.precision);

const historicalRule = { feature: 'requiredPathCoverageRatio', threshold: 0.524, direction: '<=' };
const historicalMetrics = metrics(rows.map(row => ({
    predicted: predicts(row, historicalRule.feature, historicalRule), actual: row.repair,
})));

console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    baselineFile,
    corpusFile,
    folds,
    examples: rows.length,
    repairWinners: rows.filter(row => row.repair).length,
    historicalRule: { ...historicalRule, ...historicalMetrics },
    bestCrossValidated: crossValidated[0],
    allCrossValidated: crossValidated,
}, null, 2));
