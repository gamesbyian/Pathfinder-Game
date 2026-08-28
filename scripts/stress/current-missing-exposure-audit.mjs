#!/usr/bin/env node
/**
 * Rebuild the current residual's "known isolated solver not offered by production" map.
 *
 * This intentionally consumes the frozen T1 technique census as development evidence and a named
 * production baseline as the residual source. It does not claim same-revision causal value. Its job
 * is to nominate the smallest missing-exposure A/B after later promotions have changed the ladder.
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/stress/current-missing-exposure-audit.mjs -- \
 *     --baseline=reports/stress/capability-runs/32835403128/per-level-corpus2.json \
 *     --census=reports/stress/technique-census/32240161854/combined-cells.json \
 *     --exclude-solved=R02151,R00817,R02010 \
 *     --out=tmp/current-missing-exposure-audit.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [key, ...value] = a.split('=');
    return [key, value.join('=')];
}));

const BASELINE = args.get('--baseline')
    || 'reports/stress/capability-runs/32835403128/per-level-corpus2.json';
const CENSUS = args.get('--census')
    || 'reports/stress/technique-census/32240161854/combined-cells.json';
const CORPUS = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const OUT = args.get('--out') || 'tmp/current-missing-exposure-audit.json';
const EXCLUDE_SOLVED = new Set((args.get('--exclude-solved') || '')
    .split(',').map(x => x.trim()).filter(Boolean));

const readJson = file => JSON.parse(readFileSync(path.resolve(file), 'utf8'));
const rowsOf = document => Array.isArray(document) ? document : (document.levels ?? document.results ?? []);
const baselineRows = rowsOf(readJson(BASELINE));
const censusDocument = readJson(CENSUS);
const censusRows = censusDocument.results ?? [];
const corpusDocument = readJson(CORPUS);
const corpusRows = Array.isArray(corpusDocument) ? corpusDocument : corpusDocument.levels;

const Solver = createSolver();
const { getAttemptConfigs, attemptConfigKey, detectArchetype } = SOLVER_TESTING_API;

const baselineUnsolved = new Set(baselineRows
    .filter(row => row && row.ok === false)
    .map(row => row.id ?? row.levelId)
    .filter(Boolean));
for (const id of EXCLUDE_SOLVED) baselineUnsolved.delete(id);

const corpusById = new Map(corpusRows.map((row, index) => [row.id, { row, pos: index + 1 }]));
const currentResidual = [...baselineUnsolved].filter(id => corpusById.has(id)).sort();
if (currentResidual.length !== baselineUnsolved.size) {
    const missing = [...baselineUnsolved].filter(id => !corpusById.has(id));
    throw new Error(`Residual contains ${missing.length} id(s) absent from corpus: ${missing.slice(0, 10).join(', ')}`);
}

function isBaseT1(row) {
    return row?.corpus === 'corpus2'
        && row.tier === 'T1'
        && row.techniqueKeys?.length === 1
        && !row.variantLabel
        && !row.flagExperiment
        && !row.pairLabel
        && !row.ablation;
}

const censusByLevelTechnique = new Map();
const techniques = new Set();
for (const row of censusRows) {
    if (!isBaseT1(row)) continue;
    const id = row.levelId ?? corpusRows[(row.levelPos ?? 0) - 1]?.id;
    const technique = row.techniqueKeys[0];
    if (!id || !technique) continue;
    const key = `${id}\0${technique}`;
    const prior = censusByLevelTechnique.get(key);
    if (prior && (prior.ok !== row.ok || prior.status !== row.status
        || prior.nodesExpanded !== row.nodesExpanded || prior.winningGate !== row.winningGate)) {
        throw new Error(`Conflicting base T1 census rows for ${id}/${technique}`);
    }
    if (!prior) censusByLevelTechnique.set(key, row);
    techniques.add(technique);
}

const levelInfo = new Map();
for (const id of currentResidual) {
    const { row: raw } = corpusById.get(id);
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const offered = new Set(getAttemptConfigs(level, null)
        .filter(config => !config.repair && !config.admissibleOrder)
        .map(attemptConfigKey));
    const archetype = detectArchetype(level);
    levelInfo.set(id, {
        id,
        archetype,
        offered,
        features: {
            reqLen: level.reqLen,
            reqInt: level.reqInt,
            gates: level.gateKeys?.length ?? 0,
            mustPass: level.mustPassKeys?.length ?? 0,
            mustCross: level.mustCrossKeys?.length ?? 0,
            portals: level.portalMap?.size ?? 0,
            flippers: level.flipperKeys?.length ?? level.flippingFilterKeys?.length ?? 0,
        },
    });
    for (const [key, cell] of censusByLevelTechnique) {
        if (key.startsWith(id + '\0')) techniques.add(cell.techniqueKeys[0]);
    }
}

const aggregate = [];
for (const technique of [...techniques].sort()) {
    const absent = currentResidual.filter(id => !levelInfo.get(id).offered.has(technique));
    if (!absent.length) continue;
    const observed = absent
        .map(id => ({ id, row: censusByLevelTechnique.get(`${id}\0${technique}`) }))
        .filter(x => x.row);
    const wins = observed.filter(x => x.row.ok && x.row.refereeValid !== false);
    if (!wins.length) continue;
    const nodeSpend = observed.reduce((sum, x) => sum + Number(x.row.nodesExpanded ?? 0), 0);
    const byArchetype = new Map();
    for (const id of absent) {
        const arch = levelInfo.get(id).archetype;
        if (!byArchetype.has(arch)) byArchetype.set(arch, []);
        byArchetype.get(arch).push(id);
    }
    for (const [archetype, ids] of byArchetype) {
        const obs = ids
            .map(id => ({ id, row: censusByLevelTechnique.get(`${id}\0${technique}`) }))
            .filter(x => x.row);
        const archWins = obs.filter(x => x.row.ok && x.row.refereeValid !== false);
        if (!archWins.length) continue;
        const spend = obs.reduce((sum, x) => sum + Number(x.row.nodesExpanded ?? 0), 0);
        aggregate.push({
            technique,
            archetype,
            absentResidualLevels: ids.length,
            censusObservedLevels: obs.length,
            isolatedSolves: archWins.length,
            censusNodes: spend,
            nodesPerObservedSolve: archWins.length ? Math.round(spend / archWins.length) : null,
            winsAtOrBelow250k: archWins.filter(x => x.row.nodesExpanded <= 250_000).length,
            winsAtOrBelow500k: archWins.filter(x => x.row.nodesExpanded <= 500_000).length,
            winsAtOrBelow1m: archWins.filter(x => x.row.nodesExpanded <= 1_000_000).length,
            winningIds: archWins
                .map(x => ({
                    id: x.id,
                    nodes: x.row.nodesExpanded,
                    gate: x.row.winningGate ?? null,
                    features: levelInfo.get(x.id).features,
                }))
                .sort((a, b) => a.nodes - b.nodes),
        });
    }
    aggregate.push({
        technique,
        archetype: '*',
        absentResidualLevels: absent.length,
        censusObservedLevels: observed.length,
        isolatedSolves: wins.length,
        censusNodes: nodeSpend,
        nodesPerObservedSolve: wins.length ? Math.round(nodeSpend / wins.length) : null,
        winsAtOrBelow250k: wins.filter(x => x.row.nodesExpanded <= 250_000).length,
        winsAtOrBelow500k: wins.filter(x => x.row.nodesExpanded <= 500_000).length,
        winsAtOrBelow1m: wins.filter(x => x.row.nodesExpanded <= 1_000_000).length,
        winningIds: wins
            .map(x => ({
                id: x.id,
                nodes: x.row.nodesExpanded,
                gate: x.row.winningGate ?? null,
                archetype: levelInfo.get(x.id).archetype,
                features: levelInfo.get(x.id).features,
            }))
            .sort((a, b) => a.nodes - b.nodes),
    });
}

const ranked = aggregate
    .filter(row => row.archetype !== '*')
    .sort((a, b) => b.isolatedSolves - a.isolatedSolves
        || a.nodesPerObservedSolve - b.nodesPerObservedSolve
        || a.absentResidualLevels - b.absentResidualLevels
        || a.technique.localeCompare(b.technique));

const overall = aggregate
    .filter(row => row.archetype === '*')
    .sort((a, b) => b.isolatedSolves - a.isolatedSolves
        || a.nodesPerObservedSolve - b.nodesPerObservedSolve);

const result = {
    generatedAt: new Date().toISOString(),
    evidenceRole: 'development-rejoin',
    baseline: BASELINE,
    census: CENSUS,
    corpus: CORPUS,
    excludedAsNowSolved: [...EXCLUDE_SOLVED].sort(),
    baselineUnsolvedBeforeExclusion: baselineRows.filter(row => row?.ok === false).length,
    currentResidualLevels: currentResidual.length,
    censusPartialShards: censusDocument.partialShards ?? [],
    rankingSemantics: 'technique x current detectArchetype; only current residual levels where production getAttemptConfigs() lacks the exact base technique key; frozen base T1 census only',
    rankedTechniqueArchetypeCandidates: ranked,
    overallTechniqueCandidates: overall,
};

mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), JSON.stringify(result, null, 2));

console.log(`Current residual: ${currentResidual.length} level(s); excluded now-solved: ${[...EXCLUDE_SOLVED].sort().join(', ') || 'none'}`);
console.log(`Base T1 census rows indexed: ${censusByLevelTechnique.size}; partial shards: ${(censusDocument.partialShards ?? []).join(', ') || 'none'}`);
console.log('');
console.log('TOP TECHNIQUE × ARCHETYPE MISSING-EXPOSURE CANDIDATES');
for (const row of ranked.slice(0, 20)) {
    console.log([
        row.technique,
        `arch=${row.archetype}`,
        `absent=${row.absentResidualLevels}`,
        `observed=${row.censusObservedLevels}`,
        `wins=${row.isolatedSolves}`,
        `<=250k=${row.winsAtOrBelow250k}`,
        `<=500k=${row.winsAtOrBelow500k}`,
        `<=1m=${row.winsAtOrBelow1m}`,
        `nodes/win=${row.nodesPerObservedSolve}`,
        `ids=${row.winningIds.map(x => x.id + ':' + x.nodes).join(',')}`,
    ].join(' | '));
}
console.log('');
console.log('OVERALL MISSING TECHNIQUES');
for (const row of overall.slice(0, 16)) {
    console.log([
        row.technique,
        `absent=${row.absentResidualLevels}`,
        `observed=${row.censusObservedLevels}`,
        `wins=${row.isolatedSolves}`,
        `nodes/win=${row.nodesPerObservedSolve}`,
        `ids=${row.winningIds.map(x => x.id + ':' + x.nodes).join(',')}`,
    ].join(' | '));
}
console.log(`Wrote ${OUT}`);
