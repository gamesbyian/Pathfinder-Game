#!/usr/bin/env node
/**
 * Materialize the frozen confirmation-001 population for the
 * repair-late-probe multi-seed retry 7 -> 6 repricing test.
 *
 * This is an outcome-blind uniform Corpus-2 draw. It excludes the 40-level
 * discovery population that nominated the candidate and the concurrently
 * consumed goal-attraction fresh-work-pool confirmation-002 population, so
 * neither inspected development evidence nor the parallel 2A closeout can
 * leak into this confirmation population.
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

const CORPUS = 'data/stress/stress-levels-random.json';
const DISCOVERY_POPULATION = 'data/stress/static-portfolio-entrypoint-production-ab-001-population.json';
const PARALLEL_2A_IDS = 'data/stress/goal-attraction-fresh-work-pool-confirmation-002-ids.txt';
const OUT_POPULATION = 'data/stress/repair-late-probe-six-seed-confirmation-001-population.json';
const OUT_IDS = 'data/stress/repair-late-probe-six-seed-confirmation-001-ids.txt';
const OUT_MANIFEST = 'data/stress/repair-late-probe-six-seed-confirmation-001-selection-manifest.json';
const SEED = 'repair-late-probe-six-seed-confirmation-001';
const SAMPLE_SIZE = 150;

const corpusText = readText(CORPUS);
const corpusRaw = JSON.parse(corpusText);
const levels = Array.isArray(corpusRaw) ? corpusRaw : corpusRaw.levels;
if (!Array.isArray(levels)) throw new Error(`${CORPUS}: expected level array`);

const discoveryText = readText(DISCOVERY_POPULATION);
const discoveryRows = JSON.parse(discoveryText);
if (!Array.isArray(discoveryRows)) throw new Error(`${DISCOVERY_POPULATION}: expected array`);
const discoveryIds = discoveryRows.map((row) => row?.levelId).filter(Boolean);
if (discoveryIds.length !== discoveryRows.length || new Set(discoveryIds).size !== discoveryIds.length) {
    throw new Error(`${DISCOVERY_POPULATION}: missing or duplicate levelId`);
}

const parallel2AText = readText(PARALLEL_2A_IDS);
const parallel2AIds = idsFromText(parallel2AText);
if (new Set(parallel2AIds).size !== parallel2AIds.length) {
    throw new Error(`${PARALLEL_2A_IDS}: duplicate ids`);
}

const exclusions = new Set([...discoveryIds, ...parallel2AIds]);
const corpusIds = new Set(levels.map((level) => level?.id).filter(Boolean));
for (const id of exclusions) {
    if (!corpusIds.has(id)) throw new Error(`Excluded id ${id} is not present in ${CORPUS}`);
}
if (levels.length - exclusions.size < SAMPLE_SIZE) {
    throw new Error(`Only ${levels.length - exclusions.size} eligible levels remain; expected at least ${SAMPLE_SIZE}`);
}

const picked = sampleDeterministic(levels, SAMPLE_SIZE, SEED, exclusions);
const population = picked.map(({ index, level }) => ({
    corpus: 'corpus2',
    levelPos: index + 1,
    levelId: level.id ?? null,
}));
const selectedIds = population.map(({ levelId }) => levelId);

if (selectedIds.some((id) => exclusions.has(id))) {
    throw new Error('Selection invariant failed: sampled id overlaps an excluded population');
}
if (new Set(selectedIds).size !== selectedIds.length) {
    throw new Error('Selection invariant failed: duplicate sampled id');
}

const populationText = `${JSON.stringify(population, null, 2)}\n`;
const idsText = `${selectedIds.join('\n')}\n`;
const manifest = {
    experiment: 'repair-late-probe-six-seed-confirmation-001',
    corpus: 'corpus2',
    selection: 'uniform deterministic draw from Corpus 2 after prespecified exclusions; no reach, solve, hint, capability, or treatment outcome used',
    seed: SEED,
    sampleSize: SAMPLE_SIZE,
    corpusSource: {
        path: CORPUS,
        levels: levels.length,
        contentSha256: sha256(corpusText),
    },
    exclusions: {
        files: [
            {
                path: DISCOVERY_POPULATION,
                reason: '40-level discovery population that nominated the 7 -> 6 candidate',
                ids: discoveryIds.length,
                contentSha256: sha256(discoveryText),
            },
            {
                path: PARALLEL_2A_IDS,
                reason: 'parallel goal-attraction confirmation-002 population; excluded to avoid cross-closeout inspection/tuning contamination',
                ids: parallel2AIds.length,
                contentSha256: sha256(parallel2AText),
            },
        ],
        distinctIds: exclusions.size,
    },
    eligibleCorpusIdsAfterExclusions: levels.length - exclusions.size,
    outputs: {
        population: { path: OUT_POPULATION, sha256: sha256(populationText) },
        ids: { path: OUT_IDS, sha256: sha256(idsText) },
    },
    invariants: {
        overlapWithDiscoveryPopulation: 0,
        overlapWithParallel2APopulation: 0,
        uniqueSampledIds: selectedIds.length,
    },
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

for (const out of [OUT_POPULATION, OUT_IDS, OUT_MANIFEST]) mkdirSync(path.dirname(rel(out)), { recursive: true });
writeFileSync(rel(OUT_POPULATION), populationText);
writeFileSync(rel(OUT_IDS), idsText);
writeFileSync(rel(OUT_MANIFEST), manifestText);

console.log(`Corpus levels: ${levels.length}`);
console.log(`Distinct exclusions: ${exclusions.size}`);
console.log(`Eligible after exclusions: ${levels.length - exclusions.size}`);
console.log(`Selected: ${population.length} (seed="${SEED}")`);
console.log(`Wrote ${OUT_POPULATION}`);
console.log(`Wrote ${OUT_IDS}`);
console.log(`Wrote ${OUT_MANIFEST}`);
