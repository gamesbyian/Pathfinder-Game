#!/usr/bin/env node
/**
 * Materialize the frozen, reach-conditioned confirmation-002 population for
 * STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL.
 *
 * Selection source is historical control-side lifecycle evidence only:
 * reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json
 * buckets.starved.ids. Prior candidate exposure is excluded before the seeded
 * draw, preserving the preflight's independence contract.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sampleDeterministic } from './select-random-sample.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rel = (p) => path.join(root, p);
const readText = (p) => readFileSync(rel(p), 'utf8');
const readJson = (p) => JSON.parse(readText(p));
const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const idsFromText = (text) => text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

const SOURCE = 'reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json';
const CORPUS = 'data/stress/stress-levels-random.json';
const DEVELOPMENT_IDS = 'data/stress/goal-attraction-disabled-retry-fresh-work-pool-ab-001-ids.txt';
const CONFIRMATION_001_IDS = 'data/stress/goal-attraction-fresh-work-pool-confirmation-001-ids.txt';
const OUT_POPULATION = 'data/stress/goal-attraction-fresh-work-pool-confirmation-002-population.json';
const OUT_IDS = 'data/stress/goal-attraction-fresh-work-pool-confirmation-002-ids.txt';
const OUT_MANIFEST = 'data/stress/goal-attraction-fresh-work-pool-confirmation-002-selection-manifest.json';
const SEED = 'goal-attraction-fresh-work-pool-confirmation-002';
const SAMPLE_SIZE = 150;

const sourceText = readText(SOURCE);
const source = JSON.parse(sourceText);
const historicalStarvedIds = source?.buckets?.starved?.ids;
if (!Array.isArray(historicalStarvedIds)) {
    throw new Error(`${SOURCE}: expected buckets.starved.ids array`);
}
if (source?.buckets?.starved?.levels !== historicalStarvedIds.length) {
    throw new Error(`${SOURCE}: starved level count does not match ids length`);
}

const corpusRaw = readJson(CORPUS);
const levels = Array.isArray(corpusRaw) ? corpusRaw : corpusRaw.levels;
if (!Array.isArray(levels)) throw new Error(`${CORPUS}: expected level array`);

const developmentText = readText(DEVELOPMENT_IDS);
const confirmation001Text = readText(CONFIRMATION_001_IDS);
const developmentIds = idsFromText(developmentText);
const confirmation001Ids = idsFromText(confirmation001Text);

// R00355 is the explicitly reproduced/tuned development gain. It is already in
// DEVELOPMENT_IDS, but keeping it explicit makes the frozen selection contract
// auditable even if that file is later refactored.
const explicitTuningIds = ['R00355'];
const priorExposure = new Set([...developmentIds, ...confirmation001Ids, ...explicitTuningIds]);
const starvedSet = new Set(historicalStarvedIds);

if (starvedSet.size !== historicalStarvedIds.length) {
    throw new Error(`${SOURCE}: duplicate ids in historical starved cohort`);
}

const eligibleCandidateIds = historicalStarvedIds.filter((id) => !priorExposure.has(id));
if (eligibleCandidateIds.length < SAMPLE_SIZE) {
    throw new Error(`Only ${eligibleCandidateIds.length} unexposed historical-starved ids remain; expected at least ${SAMPLE_SIZE}`);
}

// sampleDeterministic operates over the full corpus so its returned indexes stay
// true Corpus-2 positions. Exclude every non-candidate plus every prior exposure.
const sampleExclusions = new Set(priorExposure);
for (const level of levels) {
    if (!starvedSet.has(level.id)) sampleExclusions.add(level.id);
}
const picked = sampleDeterministic(levels, SAMPLE_SIZE, SEED, sampleExclusions);
const population = picked.map(({ index, level }) => ({
    corpus: 'corpus2',
    levelPos: index + 1,
    levelId: level.id ?? null,
}));

if (population.some(({ levelId }) => !starvedSet.has(levelId) || priorExposure.has(levelId))) {
    throw new Error('Selection invariant failed: sampled id is non-starved or previously exposed');
}
if (new Set(population.map(({ levelId }) => levelId)).size !== population.length) {
    throw new Error('Selection invariant failed: duplicate sampled id');
}

const populationText = `${JSON.stringify(population, null, 2)}\n`;
const idsText = `${population.map(({ levelId }) => levelId).join('\n')}\n`;
const manifest = {
    experiment: 'goal-attraction-fresh-work-pool-confirmation-002',
    corpus: 'corpus2',
    seed: SEED,
    sampleSize: SAMPLE_SIZE,
    selectionSource: {
        path: SOURCE,
        bucket: 'buckets.starved.ids',
        historicalCandidateCount: historicalStarvedIds.length,
        contentSha256: sha256(sourceText),
    },
    exclusions: {
        files: [
            {
                path: DEVELOPMENT_IDS,
                ids: developmentIds.length,
                contentSha256: sha256(developmentText),
            },
            {
                path: CONFIRMATION_001_IDS,
                ids: confirmation001Ids.length,
                contentSha256: sha256(confirmation001Text),
            },
        ],
        explicitTuningIds,
        distinctPriorExposureIds: priorExposure.size,
    },
    eligibleHistoricalStarvedIdsAfterExclusions: eligibleCandidateIds.length,
    outputs: {
        population: { path: OUT_POPULATION, sha256: sha256(populationText) },
        ids: { path: OUT_IDS, sha256: sha256(idsText) },
    },
    invariants: {
        allSampledIdsHistoricallyStarved: true,
        overlapWithPriorExposure: 0,
        uniqueSampledIds: population.length,
    },
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

for (const out of [OUT_POPULATION, OUT_IDS, OUT_MANIFEST]) mkdirSync(path.dirname(rel(out)), { recursive: true });
writeFileSync(rel(OUT_POPULATION), populationText);
writeFileSync(rel(OUT_IDS), idsText);
writeFileSync(rel(OUT_MANIFEST), manifestText);

console.log(`Historical starved: ${historicalStarvedIds.length}`);
console.log(`Distinct prior exposure: ${priorExposure.size}`);
console.log(`Eligible after exclusions: ${eligibleCandidateIds.length}`);
console.log(`Selected: ${population.length} (seed="${SEED}")`);
console.log(`Wrote ${OUT_POPULATION}`);
console.log(`Wrote ${OUT_IDS}`);
console.log(`Wrote ${OUT_MANIFEST}`);
