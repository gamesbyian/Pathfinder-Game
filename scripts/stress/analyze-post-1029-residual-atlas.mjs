#!/usr/bin/env node
/**
 * Post-1,029 residual atlas: per-level five-class rescuer breakdown for the current Corpus-2
 * misses, joining the frozen T1 isolated-technique census against the production run's dispatch
 * log, lifecycle reach/starvation telemetry, structural features, and hint provenance evidence.
 *
 * This performs no new solving. Five-class semantics live in residual-classification-lib.mjs;
 * this file assembles evidence and presentation around that authority.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { normalizeAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';
import { isProductionContextEvidence } from './provenance-source-taxonomy.mjs';
import {
    RESIDUAL_CLASSIFICATION_SCHEMA_VERSION,
    classifyResidualLevel,
    isBaseT1CensusRow,
    summarizeResidualClasses,
} from './residual-classification-lib.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [key, ...value] = a.split('=');
    return [key, value.join('=')];
}));

const BASELINE = args.get('--baseline')
    || 'reports/stress/capability-runs/34531412380/per-level-corpus2.json';
const LIFECYCLE = args.get('--lifecycle')
    || 'reports/stress/capability-runs/34531412380/lifecycle-failure-map-corpus2.json';
const CENSUS = args.get('--census')
    || 'reports/stress/technique-census/33717910218/combined-cells.json';
const CORPUS = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const HINTS_DIR = args.get('--hints-dir') || 'data/stress/hints-random';
const OUT = args.get('--out') || 'tmp/post-1029-residual-atlas.json';

const readJson = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));

const baselineDoc = readJson(BASELINE);
const baselineRows = baselineDoc.rows;
const lifecycleRows = readJson(LIFECYCLE).levels;
const censusRows = readJson(CENSUS).results ?? [];
const corpusDoc = readJson(CORPUS);
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;

const Solver = createSolver();
const { getAttemptConfigs, attemptConfigKey, classifyRoutingRegime } = SOLVER_TESTING_API;

const baselineById = new Map(baselineRows.map(row => [row.id, row]));
const lifecycleById = new Map(lifecycleRows.map(row => [row.id, row]));
const corpusById = new Map(corpusRows.map((row, index) => [row.id, { row, pos: index + 1 }]));
const currentResidual = baselineRows.filter(row => row.ok === false).map(row => row.id).sort();

// The canonical predicate intentionally does not exclude variantLabel. Clean promoted T1 entries
// such as turn-biased repair carry one; ablation is the modified-condition signal. This distinction
// is the 2026-09-12 correction that moved 25 current-residual rows back out of classes 4/5.
const t1WinsByLevel = new Map();
for (const row of censusRows) {
    if (!isBaseT1CensusRow(row)) continue;
    if (!(row.ok === true && row.refereeValid !== false)) continue;
    const id = row.levelId ?? corpusRows[(row.levelPos ?? 0) - 1]?.id;
    if (!id) continue;
    const identity = normalizeAttemptIdentityKey(row.techniqueKeys[0]);
    if (!t1WinsByLevel.has(id)) t1WinsByLevel.set(id, []);
    t1WinsByLevel.get(id).push({ identity, nodes: row.nodesExpanded ?? null, gate: row.winningGate ?? null });
}

function historicalProductionContextCandidate(id) {
    const file = path.join(HINTS_DIR, `${id}.json`);
    if (!existsSync(file)) return null;
    let doc;
    try { doc = readJson(file); } catch { return null; }
    for (const hint of doc.hints ?? []) {
        for (const entry of hint.provenance ?? []) {
            if (!isProductionContextEvidence(entry)) continue;
            return {
                technique: entry.solver?.technique ?? null,
                scoringProfileId: entry.solver?.scoringProfileId ?? null,
                beamWidth: entry.solver?.beamWidth ?? null,
                gateKey: entry.solver?.gateKey ?? null,
                nodesExpanded: entry.search?.nodesExpanded ?? null,
                termination: entry.search?.termination ?? null,
                foundAt: entry.foundAt ?? entry.context?.foundAt ?? null,
            };
        }
    }
    return null;
}

const rows = [];
for (const id of currentResidual) {
    const corpusEntry = corpusById.get(id);
    if (!corpusEntry) throw new Error(`Residual level ${id} missing from corpus ${CORPUS}`);
    const { row: raw } = corpusEntry;
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const routingRegime = classifyRoutingRegime(level);
    const offeredLadder = new Set(getAttemptConfigs(level, null)
        .filter(config => !config.repair && !config.admissibleOrder)
        .map(attemptConfigKey));
    const features = {
        reqLen: level.requiredLength,
        reqInt: level.requiredIntersections,
        gates: level.gateKeys?.length ?? 0,
        mustPass: level.mustPassKeys?.length ?? 0,
        mustCross: level.mustCrossKeys?.length ?? 0,
        portals: level.portalMap?.size ?? 0,
        flippers: level.flipperKeys?.length ?? level.flippingFilterKeys?.length ?? 0,
    };

    const baseline = baselineById.get(id);
    const lifecycle = lifecycleById.get(id);
    const dispatchedIdentities = new Set((baseline?.failedStrategies ?? [])
        .map(value => { try { return normalizeAttemptIdentityKey(value); } catch { return value; } }));
    const reachedSet = new Set(lifecycle?.reachedTechniques ?? []);
    const starvedSet = new Set(lifecycle?.starvedTechniques ?? []);
    const t1Wins = t1WinsByLevel.get(id) ?? [];
    const provenanceRescuer = t1Wins.length === 0 ? historicalProductionContextCandidate(id) : null;
    const classification = classifyResidualLevel({
        t1Wins, provenanceRescuer, offeredLadder, dispatchedIdentities, reachedSet, starvedSet,
    });

    rows.push({
        id,
        routingRegime,
        features,
        bucket: lifecycle?.bucket ?? null,
        bestBadnessTechnique: lifecycle?.bestBadnessTechnique ?? null,
        productionNodes: baseline?.nodesExpanded ?? null,
        productionWork: baseline?.workSpent ?? null,
        productionStatus: baseline?.status ?? null,
        productionAttemptCount: baseline?.attemptCount ?? null,
        t1WinMultiplicity: classification.t1WinMultiplicity,
        t1Wins: classification.t1Wins,
        provenanceRescuer: classification.provenanceRescuer,
        primaryClass: classification.primaryClass,
        classes: classification.classes,
    });
}

const classCounts = summarizeResidualClasses(rows);

function structuralOverlap(pred) {
    const subset = rows.filter(pred);
    return {
        n: subset.length,
        portalBearing: subset.filter(row => row.features.portals > 0).length,
        mustCrossBearing: subset.filter(row => row.features.mustCross > 0).length,
        intersectionHeavy: subset.filter(row => row.routingRegime === 'intersection-heavy').length,
        mustCrossHeavyRegime: subset.filter(row => row.routingRegime === 'must-cross-heavy').length,
        multiPortalRegime: subset.filter(row => row.routingRegime === 'multi-portal').length,
        tripleOverlap: subset.filter(row => row.features.portals > 0 && row.features.mustCross > 0
            && row.routingRegime === 'intersection-heavy').length,
    };
}

const byRoutingRegime = {};
for (const row of rows) {
    byRoutingRegime[row.routingRegime] = byRoutingRegime[row.routingRegime]
        ?? { total: 0, byClass: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    byRoutingRegime[row.routingRegime].total++;
    byRoutingRegime[row.routingRegime].byClass[row.primaryClass]++;
}

const lowMultiplicity = rows.filter(row => row.t1WinMultiplicity > 0 && row.t1WinMultiplicity <= 2)
    .map(row => ({
        id: row.id, multiplicity: row.t1WinMultiplicity,
        primaryClass: row.primaryClass, routingRegime: row.routingRegime,
    }))
    .sort((a, b) => a.multiplicity - b.multiplicity || a.id.localeCompare(b.id));

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'development-rejoin / gate-1 residual atlas',
    residualClassificationSchemaVersion: RESIDUAL_CLASSIFICATION_SCHEMA_VERSION,
    baseline: BASELINE,
    lifecycle: LIFECYCLE,
    census: CENSUS,
    corpus: CORPUS,
    hintsDir: HINTS_DIR,
    currentResidualLevels: currentResidual.length,
    classCounts,
    structuralOverlap: {
        class1: structuralOverlap(row => row.primaryClass === 1),
        class2: structuralOverlap(row => row.primaryClass === 2),
        class3: structuralOverlap(row => row.primaryClass === 3),
        class4: structuralOverlap(row => row.primaryClass === 4),
        class5: structuralOverlap(row => row.primaryClass === 5),
        all: structuralOverlap(() => true),
    },
    byRoutingRegime,
    lowMultiplicityCount: lowMultiplicity.length,
    lowMultiplicitySample: lowMultiplicity.slice(0, 60),
    rows,
};

mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(result, null, 2));

console.log(`Residual: ${currentResidual.length}`);
console.log('Primary-class breakdown:');
for (const [key, value] of Object.entries(classCounts))
    console.log(`  ${key}. ${value.label}: ${value.primary} (any-rescuer membership: ${value.any})`);
console.log(`Low-multiplicity (<=2 isolated T1 winners) misses: ${lowMultiplicity.length}`);
console.log('By routing regime (primary class 1..5):');
for (const [regime, data] of Object.entries(byRoutingRegime))
    console.log(`  ${regime}: total=${data.total} classes=${JSON.stringify(data.byClass)}`);
console.log(`Wrote ${OUT}`);
