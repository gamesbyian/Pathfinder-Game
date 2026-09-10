#!/usr/bin/env node
/**
 * Materialize the frozen, reach-conditioned population for the
 * late-repair-multiseed-retry 7-vs-6 seed-count confirmation
 * (reports/2026-09-05-repair-late-probe-six-seed-confirmation-preflight.md).
 *
 * Selection source is legal, level-blind, CONTROL-SIDE lifecycle evidence only:
 * reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json
 * (workflow "Solver stress-corpus refresh (level-blind capability)", run 33841017634,
 * production defaults -- node_budget=50000000, strict_total_work_budget=false, no
 * enable/disable flags, so the full seven-salt REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS
 * ran). A level qualifies iff its per-level `reachedTechniques` includes
 * 'late-repair-multiseed-retry' -- whether the stage is exercised at all is a structural/
 * routing property of the level under CONTROL settings, not an outcome of the six-seed
 * treatment, so conditioning on it does not leak treatment information (same legality shape
 * as the goal-attraction-disabled-retry confirmation-002 materializer's buckets.starved.ids
 * conditioning).
 *
 * Prior exposure excluded: the 40-level discovery population reused by
 * reports/2026-09-04-repair-late-probe-multi-seed-retry-tail-audit-001.md
 * (data/stress/static-portfolio-entrypoint-production-ab-001-population.json). No development
 * A/B or other candidate-specific population exists for this line (the preflight goes directly
 * from discovery to confirmation).
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

const SOURCE = 'reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json';
const SOURCE_GHA_PROVENANCE = 'reports/stress/capability-runs/33841017634/gha-source-run.json';
const CORPUS = 'data/stress/stress-levels-random.json';
const DISCOVERY_POPULATION = 'data/stress/static-portfolio-entrypoint-production-ab-001-population.json';
const TARGET_TECHNIQUE = 'late-repair-multiseed-retry';
const OUT_POPULATION = 'data/stress/repair-late-probe-six-seed-confirmation-001-population.json';
const OUT_IDS = 'data/stress/repair-late-probe-six-seed-confirmation-001-ids.txt';
const OUT_MANIFEST = 'data/stress/repair-late-probe-six-seed-confirmation-001-selection-manifest.json';
const SEED = 'repair-late-probe-six-seed-confirmation-001';
const SAMPLE_SIZE = 150;

const sourceText = readText(SOURCE);
const source = JSON.parse(sourceText);

const ghaProvenanceText = readText(SOURCE_GHA_PROVENANCE);
const ghaProvenance = JSON.parse(ghaProvenanceText);
if (!/level-blind/i.test(ghaProvenance.workflow || '')) {
    throw new Error(`${SOURCE_GHA_PROVENANCE}: expected a level-blind capability workflow, got "${ghaProvenance.workflow}"`);
}
if (ghaProvenance.dispatchInputs?.strict_total_work_budget !== 'false'
    || String(ghaProvenance.dispatchInputs?.corpus2_node_budget) !== '50000000') {
    throw new Error(`${SOURCE_GHA_PROVENANCE}: expected production-default node_budget=50000000/strict_total_work_budget=false dispatch`);
}

const levelsById = source?.levels;
if (!levelsById || typeof levelsById !== 'object') throw new Error(`${SOURCE}: expected an object keyed by level id under "levels"`);
const allLevelRows = Object.values(levelsById);
if (source?.population?.levels !== allLevelRows.length) {
    throw new Error(`${SOURCE}: level row count does not match population.levels`);
}

const corpusRaw = readJson(CORPUS);
const levels = Array.isArray(corpusRaw) ? corpusRaw : corpusRaw.levels;
if (!Array.isArray(levels)) throw new Error(`${CORPUS}: expected level array`);

const discoveryText = readText(DISCOVERY_POPULATION);
const discoveryRows = JSON.parse(discoveryText);
const discoveryIds = discoveryRows.map((row) => row.levelId).filter(Boolean);
if (new Set(discoveryIds).size !== discoveryIds.length) {
    throw new Error(`${DISCOVERY_POPULATION}: duplicate ids in discovery population`);
}

// Control-side reach conditioning: a level qualifies iff late-repair-multiseed-retry appears in
// its own reachedTechniques row -- a structural property of the level under CONTROL (seven-seed
// production default) settings, computed before any treatment (six-seed) outcome exists.
const reachedRows = allLevelRows.filter((row) => Array.isArray(row.reachedTechniques) && row.reachedTechniques.includes(TARGET_TECHNIQUE));
const reachedIds = reachedRows.map((row) => row.id);
if (new Set(reachedIds).size !== reachedIds.length) {
    throw new Error(`${SOURCE}: duplicate ids among levels reaching ${TARGET_TECHNIQUE}`);
}

const priorExposure = new Set(discoveryIds);
const reachedSet = new Set(reachedIds);

const eligibleCandidateIds = reachedIds.filter((id) => !priorExposure.has(id));
if (eligibleCandidateIds.length < SAMPLE_SIZE) {
    throw new Error(`Only ${eligibleCandidateIds.length} unexposed reach-conditioned ids remain; expected at least ${SAMPLE_SIZE}`);
}

// sampleDeterministic operates over the full corpus so its returned indexes stay true Corpus-2
// positions. Exclude every non-candidate plus every prior exposure.
const sampleExclusions = new Set(priorExposure);
for (const level of levels) {
    if (!reachedSet.has(level.id)) sampleExclusions.add(level.id);
}
const picked = sampleDeterministic(levels, SAMPLE_SIZE, SEED, sampleExclusions);
const population = picked.map(({ index, level }) => ({
    corpus: 'corpus2',
    levelPos: index + 1,
    levelId: level.id ?? null,
}));

if (population.some(({ levelId }) => !reachedSet.has(levelId) || priorExposure.has(levelId))) {
    throw new Error('Selection invariant failed: sampled id does not reach the target technique under control, or was previously exposed');
}
if (new Set(population.map(({ levelId }) => levelId)).size !== population.length) {
    throw new Error('Selection invariant failed: duplicate sampled id');
}

const populationText = `${JSON.stringify(population, null, 2)}\n`;
const idsText = `${population.map(({ levelId }) => levelId).join('\n')}\n`;
const manifest = {
    experiment: 'repair-late-probe-six-seed-confirmation-001',
    corpus: 'corpus2',
    seed: SEED,
    sampleSize: SAMPLE_SIZE,
    targetTechnique: TARGET_TECHNIQUE,
    selectionSource: {
        path: SOURCE,
        ghaProvenancePath: SOURCE_GHA_PROVENANCE,
        ghaRunUrl: ghaProvenance.runUrl,
        conditioning: 'reachedTechniques includes late-repair-multiseed-retry (control-side, level-blind, production-default seven-seed dispatch)',
        totalCorpusLevels: allLevelRows.length,
        reachedCount: reachedIds.length,
        contentSha256: sha256(sourceText),
    },
    exclusions: {
        files: [
            {
                path: DISCOVERY_POPULATION,
                ids: discoveryIds.length,
                contentSha256: sha256(discoveryText),
            },
        ],
        distinctPriorExposureIds: priorExposure.size,
        overlapBetweenDiscoveryAndReached: discoveryIds.filter((id) => reachedSet.has(id)).length,
    },
    eligibleReachConditionedIdsAfterExclusions: eligibleCandidateIds.length,
    outputs: {
        population: { path: OUT_POPULATION, sha256: sha256(populationText) },
        ids: { path: OUT_IDS, sha256: sha256(idsText) },
    },
    invariants: {
        allSampledIdsReachLateRepairMultiSeedRetryUnderControl: true,
        overlapWithPriorExposure: 0,
        uniqueSampledIds: population.length,
    },
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;

for (const out of [OUT_POPULATION, OUT_IDS, OUT_MANIFEST]) mkdirSync(path.dirname(rel(out)), { recursive: true });
writeFileSync(rel(OUT_POPULATION), populationText);
writeFileSync(rel(OUT_IDS), idsText);
writeFileSync(rel(OUT_MANIFEST), manifestText);

console.log(`Total corpus2 levels in source: ${allLevelRows.length}`);
console.log(`Reached ${TARGET_TECHNIQUE} under control: ${reachedIds.length}`);
console.log(`Distinct prior exposure (40-level discovery pop): ${priorExposure.size}`);
console.log(`Eligible after exclusions: ${eligibleCandidateIds.length}`);
console.log(`Selected: ${population.length} (seed="${SEED}")`);
console.log(`Wrote ${OUT_POPULATION}`);
console.log(`Wrote ${OUT_IDS}`);
console.log(`Wrote ${OUT_MANIFEST}`);
