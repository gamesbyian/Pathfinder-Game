#!/usr/bin/env node
/**
 * Offline class-5 frontier characterization against class 4 and the remaining residual.
 * Consumes the checked post-1,029 residual atlas; performs no solving.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { levelFeatures } from './features.mjs';
import { buildFrontierContrast, STATIC_FEATURE_KEYS } from './frontier-contrast-lib.mjs';

const args = new Map(process.argv.slice(2)
    .filter(arg => arg.startsWith('--') && arg.includes('='))
    .map(arg => {
        const [key, ...value] = arg.split('=');
        return [key, value.join('=')];
    }));

const ATLAS = args.get('--atlas')
    || 'reports/stress/residual-atlas/2026-09-11-post-1029-671/atlas.json';
const CORPUS = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const OUT = args.get('--out') || 'tmp/post-1029-frontier-contrast.json';

const readJson = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
const atlas = readJson(ATLAS);
const corpusDoc = readJson(CORPUS);
const corpus = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const rawById = new Map(corpus.map(level => [level.id, level]));

const rows = atlas.rows.map(row => {
    const raw = rawById.get(row.id);
    if (!raw) throw new Error(`Frontier contrast: level ${row.id} missing from ${CORPUS}`);
    const extracted = levelFeatures(raw);
    return {
        ...row,
        staticFeatures: Object.fromEntries(STATIC_FEATURE_KEYS.map(key => [key, extracted[key]])),
    };
});

const class4 = rows.filter(row => row.primaryClass === 4);
const class5 = rows.filter(row => row.primaryClass === 5);
const nonFrontier = rows.filter(row => row.primaryClass !== 5);

function stratified(name, predicate) {
    const control = class4.filter(predicate);
    const frontier = class5.filter(predicate);
    return {
        name,
        contrast: buildFrontierContrast(control, frontier, `class 4 within ${name}`),
    };
}

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'development-characterization / algorithmic-frontier contrast',
    atlas: ATLAS,
    corpus: CORPUS,
    classCounts: { class4: class4.length, class5: class5.length, nonFrontier: nonFrontier.length },
    primaryClass5VsClass4: buildFrontierContrast(
        class4,
        class5,
        'class 4: zero T1 winners but another historical/provenance rescuer exists',
    ),
    secondaryClass5VsAllOtherResidual: buildFrontierContrast(
        nonFrontier,
        class5,
        'classes 1-4 combined: all other current residual levels',
    ),
    compositionControlled: [
        stratified('portal-bearing levels', row => (row.staticFeatures?.portalPairs ?? 0) > 0),
        stratified('intersection-heavy levels', row => row.routingRegime === 'intersection-heavy'),
        stratified(
            'portal-bearing intersection-heavy levels',
            row => (row.staticFeatures?.portalPairs ?? 0) > 0 && row.routingRegime === 'intersection-heavy',
        ),
    ],
};

mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(result, null, 2) + '\n');

console.log(`class4=${class4.length} class5=${class5.length}`);
console.log('Largest class-5 vs class-4 static effects:');
for (const effect of result.primaryClass5VsClass4.staticNumericEffects.slice(0, 8)) {
    console.log(`  ${effect.feature}: control=${effect.controlMean?.toFixed(3)} frontier=${effect.frontierMean?.toFixed(3)} d=${effect.standardizedDifference?.toFixed(3)}`);
}
console.log('Largest presence/routing differences:');
for (const effect of result.primaryClass5VsClass4.staticPresenceContrasts.slice(0, 6)) {
    console.log(`  ${effect.feature}: control=${effect.controlRate?.toFixed(3)} frontier=${effect.frontierRate?.toFixed(3)} diff=${effect.rateDifference?.toFixed(3)} OR=${effect.oddsRatioFrontierVsControl?.toFixed(3)}`);
}
console.log(`Wrote ${OUT}`);
