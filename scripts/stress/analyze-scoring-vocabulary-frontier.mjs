#!/usr/bin/env node
/** Join a completed witness scorer-vocabulary diagnostic to a residual atlas by level id. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { summarizeVocabularyByAtlasClass } from './scoring-vocabulary-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
const diagnosticPath = args.get('--diagnostic');
const atlasPath = args.get('--atlas');
const outPath = args.get('--out');
if (!diagnosticPath || !atlasPath) {
    console.error('usage: node scripts/stress/analyze-scoring-vocabulary-frontier.mjs --diagnostic=<json> --atlas=<atlas.json> [--out=<json>]');
    process.exit(2);
}

const diagnostic = JSON.parse(readFileSync(diagnosticPath, 'utf8'));
const atlas = JSON.parse(readFileSync(atlasPath, 'utf8'));
if (!Array.isArray(diagnostic.levels)) throw new Error('diagnostic.levels must be an array');
if (!Array.isArray(atlas.rows)) throw new Error('atlas.rows must be an array');

const summary = summarizeVocabularyByAtlasClass(diagnostic.levels, atlas.rows, [4, 5]);
const result = {
    schemaVersion: 1,
    diagnostic: diagnosticPath,
    atlas: atlasPath,
    diagnosticPopulation: diagnostic.population ?? null,
    diagnosticCorpus: diagnostic.corpus ?? null,
    epsilon: diagnostic.epsilon ?? null,
    reconstructionFailures: diagnostic.totals?.reconstructionFailures ?? null,
    ...summary,
};

for (const classId of [4, 5]) {
    const row = result.classes[classId];
    console.log(`class ${classId}: coverage ${row.scoredLevels}/${row.atlasLevels} levels; collision levels ${row.levelsWithCollision}/${row.scoredLevels}; collision decisions ${row.collisionDecisions}/${row.branchingDecisions}`);
    console.log(`class ${classId}: fixed alternative-preference levels ${row.levelsWithWeightInvariantAlternativePreferred}/${row.scoredLevels}; decisions ${row.weightInvariantAlternativePreferredDecisions}/${row.branchingDecisions}`);
}
console.log('class5 - class4 level collision-rate difference:', result.class5MinusClass4?.levelCollisionRateDifference);
console.log('class5 - class4 decision collision-rate difference:', result.class5MinusClass4?.decisionCollisionRateDifference);
console.log('class5 - class4 fixed-preference level-rate difference:', result.class5MinusClass4?.levelWeightInvariantAlternativePreferredRateDifference);
console.log('class5 - class4 fixed-preference decision-rate difference:', result.class5MinusClass4?.decisionWeightInvariantAlternativePreferredRateDifference);
if ((result.reconstructionFailures ?? 0) > 0) {
    console.error('WARNING: source diagnostic has reconstruction failures; do not interpret scorer-vocabulary rates until decomposition is fixed.');
}

if (outPath) {
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Wrote ${outPath}`);
}
