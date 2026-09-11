#!/usr/bin/env node
/**
 * Post-1,029 residual atlas: per-level five-class rescuer breakdown for the current 671 Corpus-2
 * misses, joining the frozen T1 isolated-technique census against this exact production run's own
 * per-attempt dispatch log, per-level lifecycle reach/starvation telemetry, structural/fingerprint
 * features, and hint-store provenance/history evidence.
 *
 * This performs no new solving. It only rejoins already-registered research assets:
 *   - reports/stress/capability-runs/<run>/per-level-corpus2.json  (production baseline + exact
 *     per-attempt `failedStrategies` dispatch log for this run)
 *   - reports/stress/capability-runs/<run>/lifecycle-failure-map-corpus2.json (per-level
 *     reachedTechniques/starvedTechniques)
 *   - reports/stress/technique-census/<census>/combined-cells.json (frozen base-T1 isolated census)
 *   - data/stress/hints-random/<id>.json (hint/provenance store, for the no-T1-winner cross-check)
 *   - data/stress/stress-levels-random.json (structural features + routing regime)
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/stress/analyze-post-1029-residual-atlas.mjs -- \
 *     --baseline=reports/stress/capability-runs/34531412380/per-level-corpus2.json \
 *     --lifecycle=reports/stress/capability-runs/34531412380/lifecycle-failure-map-corpus2.json \
 *     --census=reports/stress/technique-census/33717910218/combined-cells.json \
 *     --hints-dir=data/stress/hints-random \
 *     --out=tmp/post-1029-residual-atlas.json
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { normalizeAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';
import { classifyProvenanceClass } from './provenance-classes.mjs';

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

// --- load inputs -----------------------------------------------------------------------------
const baselineDoc = readJson(BASELINE);
const baselineRows = baselineDoc.rows;
const lifecycleDoc = readJson(LIFECYCLE);
const lifecycleRows = lifecycleDoc.levels;
const censusDoc = readJson(CENSUS);
const censusRows = censusDoc.results ?? [];
const corpusDoc = readJson(CORPUS);
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;

const Solver = createSolver();
const { getAttemptConfigs, attemptConfigKey, classifyRoutingRegime } = SOLVER_TESTING_API;

const baselineById = new Map(baselineRows.map(row => [row.id, row]));
const lifecycleById = new Map(lifecycleRows.map(row => [row.id, row]));
const corpusById = new Map(corpusRows.map((row, index) => [row.id, { row, pos: index + 1 }]));

const currentResidual = baselineRows.filter(row => row.ok === false).map(row => row.id).sort();

function isBaseT1(row) {
    return row?.corpus === 'corpus2'
        && row.tier === 'T1'
        && row.techniqueKeys?.length === 1
        && !row.variantLabel
        && !row.flagExperiment
        && !row.pairLabel
        && !row.ablation;
}

const t1WinsByLevel = new Map();
for (const row of censusRows) {
    if (!isBaseT1(row)) continue;
    if (!(row.ok === true && row.refereeValid !== false)) continue;
    const id = row.levelId ?? corpusRows[(row.levelPos ?? 0) - 1]?.id;
    if (!id) continue;
    const identity = normalizeAttemptIdentityKey(row.techniqueKeys[0]);
    if (!t1WinsByLevel.has(id)) t1WinsByLevel.set(id, []);
    t1WinsByLevel.get(id).push({ identity, nodes: row.nodesExpanded ?? null, gate: row.winningGate ?? null });
}

// Retry-tier stages, for reconciling "no exact dispatch match" against the coarser reached/starved
// lifecycle telemetry. Repair/admissible-order retry tiers do not carry one fixed base-T1 identity
// the way static beam/dfs ladder configs do (seed/tiebreak vary per dispatch), so their offered-ness
// is judged by stage reach rather than literal ladder membership.
const FAMILY_STAGES = {
    repair: ['early-repair-search', 'late-repair-search', 'repair-fallback', 'late-repair-multiseed-retry',
        'repair-elite-prefix-dfs-retry'],
    'admissible-order': ['admissible-order-fallback', 'admissible-order-alternate-tiebreak-retry'],
};
function familyOf(identity) {
    return identity.split('|', 1)[0];
}

function classifyWin(win, { offeredLadder, dispatchedIdentities, reachedSet, starvedSet }) {
    const family = familyOf(win.identity);
    const dispatched = dispatchedIdentities.has(win.identity);
    let cls;
    let familyReached = null;
    let familyStarved = null;
    let offered = null;
    if (family === 'beam' || family === 'dfs') {
        // Static ladder config: literal plan membership is the sharp offered/not-offered signal.
        offered = offeredLadder.has(win.identity);
        if (!offered) cls = 1;
        else if (!dispatched) cls = 2; // planned but the ladder never actually reached it this run
        else cls = 3; // planned and dispatched; production attempt failed despite isolated capability
    } else {
        const stages = FAMILY_STAGES[family] ?? [];
        familyReached = stages.some(s => reachedSet.has(s));
        familyStarved = stages.some(s => starvedSet.has(s));
        if (!familyReached && !dispatched) cls = 1;
        else if (dispatched && !familyStarved) cls = 3;
        else cls = 2; // stage nominally reached but this exact config not dispatched, or stage starved
    }
    return { ...win, family, offered, dispatched, familyReached, familyStarved, class: cls };
}

// --- hint-store provenance cross-check for zero-T1-winner levels -----------------------------
function coldCapabilityRescuer(id) {
    const file = path.join(HINTS_DIR, `${id}.json`);
    if (!existsSync(file)) return null;
    let doc;
    try { doc = readJson(file); } catch { return null; }
    const hints = doc.hints ?? [];
    for (const hint of hints) {
        for (const entry of hint.provenance ?? []) {
            if (classifyProvenanceClass(entry, { standard: 'strict' }) === 'cold-capability') {
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
    }
    return null;
}

// --- per-level rows ----------------------------------------------------------------------------
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
        .map(s => { try { return normalizeAttemptIdentityKey(s); } catch { return s; } }));
    const reachedSet = new Set(lifecycle?.reachedTechniques ?? []);
    const starvedSet = new Set(lifecycle?.starvedTechniques ?? []);

    const t1Wins = t1WinsByLevel.get(id) ?? [];
    const classifiedWins = t1Wins.map(win => classifyWin(win, { offeredLadder, dispatchedIdentities, reachedSet, starvedSet }));

    const hasClass1 = classifiedWins.some(w => w.class === 1);
    const hasClass2 = classifiedWins.some(w => w.class === 2);
    const hasClass3 = classifiedWins.some(w => w.class === 3);

    let provenanceRescuer = null;
    let hasClass4 = false;
    let hasClass5 = false;
    if (t1Wins.length === 0) {
        provenanceRescuer = coldCapabilityRescuer(id);
        if (provenanceRescuer) hasClass4 = true; else hasClass5 = true;
    }

    const primaryClass = hasClass1 ? 1 : hasClass2 ? 2 : hasClass3 ? 3 : hasClass4 ? 4 : 5;
    const multiplicity = t1Wins.length;

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
        t1WinMultiplicity: multiplicity,
        t1Wins: classifiedWins,
        provenanceRescuer,
        primaryClass,
        classes: { 1: hasClass1, 2: hasClass2, 3: hasClass3, 4: hasClass4, 5: hasClass5 },
    });
}

// --- summaries -----------------------------------------------------------------------------
function count(pred) { return rows.filter(pred).length; }
const classCounts = {
    1: { label: 'known rescuer not offered', primary: count(r => r.primaryClass === 1), any: count(r => r.classes[1]) },
    2: { label: 'known rescuer offered but not reached or materially starved', primary: count(r => r.primaryClass === 2), any: count(r => r.classes[2]) },
    3: { label: 'known rescuer reached with comparable work but failed', primary: count(r => r.primaryClass === 3), any: count(r => r.classes[3]) },
    4: { label: 'no T1 winner but another historical/provenance rescuer exists', primary: count(r => r.primaryClass === 4), any: count(r => r.classes[4]) },
    5: { label: 'no known rescuer after cross-evidence reconciliation', primary: count(r => r.primaryClass === 5), any: count(r => r.classes[5]) },
};

function structuralOverlap(pred) {
    const subset = rows.filter(pred);
    return {
        n: subset.length,
        portalBearing: subset.filter(r => r.features.portals > 0).length,
        mustCrossBearing: subset.filter(r => r.features.mustCross > 0).length,
        intersectionHeavy: subset.filter(r => r.routingRegime === 'intersection-heavy').length,
        mustCrossHeavyRegime: subset.filter(r => r.routingRegime === 'must-cross-heavy').length,
        multiPortalRegime: subset.filter(r => r.routingRegime === 'multi-portal').length,
        tripleOverlap: subset.filter(r => r.features.portals > 0 && r.features.mustCross > 0
            && r.routingRegime === 'intersection-heavy').length,
    };
}

const byRoutingRegime = {};
for (const r of rows) {
    byRoutingRegime[r.routingRegime] = byRoutingRegime[r.routingRegime] ?? { total: 0, byClass: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    byRoutingRegime[r.routingRegime].total++;
    byRoutingRegime[r.routingRegime].byClass[r.primaryClass]++;
}

const lowMultiplicity = rows.filter(r => r.t1WinMultiplicity > 0 && r.t1WinMultiplicity <= 2)
    .map(r => ({ id: r.id, multiplicity: r.t1WinMultiplicity, primaryClass: r.primaryClass, routingRegime: r.routingRegime }))
    .sort((a, b) => a.multiplicity - b.multiplicity || a.id.localeCompare(b.id));

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'development-rejoin / gate-1 residual atlas',
    baseline: BASELINE,
    lifecycle: LIFECYCLE,
    census: CENSUS,
    corpus: CORPUS,
    hintsDir: HINTS_DIR,
    currentResidualLevels: currentResidual.length,
    classCounts,
    structuralOverlap: {
        class1: structuralOverlap(r => r.primaryClass === 1),
        class2: structuralOverlap(r => r.primaryClass === 2),
        class3: structuralOverlap(r => r.primaryClass === 3),
        class4: structuralOverlap(r => r.primaryClass === 4),
        class5: structuralOverlap(r => r.primaryClass === 5),
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
for (const [k, v] of Object.entries(classCounts)) console.log(`  ${k}. ${v.label}: ${v.primary} (any-rescuer membership: ${v.any})`);
console.log(`Low-multiplicity (<=2 isolated T1 winners) misses: ${lowMultiplicity.length}`);
console.log('By routing regime (primary class 1..5):');
for (const [regime, data] of Object.entries(byRoutingRegime))
    console.log(`  ${regime}: total=${data.total} classes=${JSON.stringify(data.byClass)}`);
console.log(`Wrote ${OUT}`);
