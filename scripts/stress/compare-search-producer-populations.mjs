#!/usr/bin/env node
/** Observation-only beam-survivor versus repair-elite search producer population comparison. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { compareProducerPopulations } from './research-analysis-lib.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('='); return [key, rest.join('=')];
}));
const levelsFile = args.get('--levels') ?? 'data/stress/stress-levels-random.json';
const limit = Number(args.get('--limit-levels') ?? 3);
const nodeBudget = Number(args.get('--node-budget') ?? 30000);
const beamWidth = Number(args.get('--beam-width') ?? 100);
const outFile = args.get('--out') ?? 'reports/stress/compare-search-producer-populations.json';
const includeArtifacts = args.has('--include-artifacts');
// Deterministic stratified draw (2026-08-13, reports/2026-08-11-beam-repair-producer-population-
// pilot.md's own "one bounded, stratified follow-up" ask -- the original pilot took only the first
// 3 file-order levels). Same FNV-1a -> mulberry32 -> Fisher-Yates convention as
// scripts/stress/benchmark.mjs and select-repair-fallback-reserve-sample.mjs, so the same
// --sample=N --seed=X always reproduces the same draw. Omit --sample to keep the original
// first-N-in-file-order behavior (limit alone).
const sampleSize = args.has('--sample') ? Number(args.get('--sample')) : null;
const seedStr = args.get('--seed') ?? 'producer-population-pilot';
function hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
}
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function sampleDeterministic(items, n, seed) {
    if (!Number.isFinite(n) || n >= items.length) return items.slice();
    const rng = mulberry32(seed);
    const pool = items.slice();
    const picked = [];
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rng() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        picked.push(pool[i]);
    }
    return picked;
}

const projection = (pathKeys, level, unpack) => {
    const points = pathKeys.map(unpack);
    let turns = 0;
    for (let i = 2; i < points.length; i++) {
        const a = points[i - 2], b = points[i - 1], c = points[i];
        if ((b.x - a.x) !== (c.x - b.x) || (b.y - a.y) !== (c.y - b.y)) turns++;
    }
    const visits = new Set(pathKeys);
    const obligations = [];
    for (const key of pathKeys) {
        if (level.mustPassKeys.includes(key)) obligations.push(`mp:${level.mustPassKeys.indexOf(key)}`);
        if (level.mustCrossKeys.includes(key)) obligations.push(`mc:${level.mustCrossKeys.indexOf(key)}`);
        if (level.mustTurnKeys?.includes(key)) obligations.push(`mt:${level.mustTurnKeys.indexOf(key)}`);
    }
    return { depthBucket: Math.floor(10 * (pathKeys.length - 1) / Math.max(1, level.requiredLength)),
        uniqueCells: visits.size, revisits: pathKeys.length - visits.size, turns, obligationOrder: obligations };
};

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API: api } = await import('../../modules/solver.ts');
const { UNPACK } = await import('../../modules/domain/cell-key.ts');
const { repairSearchFromGate } = await import('../../modules/solver/repair-search.ts');
const Solver = createSolver();
const hintBearing = readLevelsWithHints(levelsFile).filter(level => level.hints?.length > 0);
const selected = sampleSize != null
    ? sampleDeterministic(hintBearing, sampleSize, hashSeed(seedStr))
    : hintBearing.slice(0, limit);
const rows = [];
for (const raw of selected) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const gateKey = raw.hints[0][0];
    const beamArtifacts = [];
    const seenDepthBucket = new Set();
    const beamPrep = api.prepLevel(level); beamPrep._cfg = null; beamPrep._metrics = { nodesExpanded: 0 };
    beamPrep._beamResearchObserver = { observe: record => {
        if (!['post-score-width-cull', 'post-mechanic-bucket-selection'].includes(record.stage)) return;
        const bucket = Math.floor(10 * record.depth / Math.max(1, level.requiredLength));
        if (seenDepthBucket.has(bucket)) return;
        seenDepthBucket.add(bucket);
        for (const candidate of record.paths.slice(0, 5)) beamArtifacts.push({ producer: 'beam', path: candidate,
            arrivalWork: record.work, metrics: projection(candidate, level, UNPACK) });
    } };
    await api.beamSearchFromGate(gateKey, level, beamPrep, api.SCORING_PROFILES.default, 120000, Date.now(), null,
        beamWidth, null, false, {}, nodeBudget);

    const repairArtifacts = [];
    const repairPrep = api.prepLevel(level); repairPrep._cfg = null; repairPrep._metrics = { nodesExpanded: 0 };
    repairPrep._repairEliteResearchObserver = { observe: record => repairArtifacts.push({ ...record,
        arrivalWork: record.arrivalNodes, metrics: projection(record.path, level, UNPACK) }) };
    await repairSearchFromGate(gateKey, level, repairPrep, api.SCORING_PROFILES.repair, 120000, Date.now(), null,
        null, false, nodeBudget, {});
    const comparison = compareProducerPopulations(beamArtifacts, repairArtifacts);
    rows.push({ levelId: raw.id, gateKey, nodeBudget, beamWidth, beamNodes: beamPrep._metrics.nodesExpanded,
        repairNodes: repairPrep._metrics.nodesExpanded, beamArtifacts, repairArtifacts, comparison });
    console.error(`${raw.id}: beam=${beamArtifacts.length} repair=${repairArtifacts.length} exact=${comparison.exactPrefixOverlap}`);
}
const document = { schemaVersion: 1, generatedAt: new Date().toISOString(), levelsFile,
    sampling: sampleSize != null ? { mode: 'stratified', sampleSize, seed: seedStr } : { mode: 'first-n', limit },
    scope: 'observation only; no cross-technique consumption', levels: rows,
    summary: { levels: rows.length, beamArtifacts: rows.reduce((n, x) => n + x.beamArtifacts.length, 0),
        repairArtifacts: rows.reduce((n, x) => n + x.repairArtifacts.length, 0),
        exactPrefixOverlap: rows.reduce((n, x) => n + x.comparison.exactPrefixOverlap, 0),
        metricProjectionOverlap: rows.reduce((n, x) => n + x.comparison.metricProjectionOverlap, 0) } };
if (!includeArtifacts) for (const row of document.levels) {
    row.beamArtifactCount = row.beamArtifacts.length;
    row.repairArtifactCount = row.repairArtifacts.length;
    delete row.beamArtifacts;
    delete row.repairArtifacts;
    delete row.comparison.beamNovel;
}
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Wrote ${outFile}`);
