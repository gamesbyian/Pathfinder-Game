#!/usr/bin/env node
// Plans runtime-balanced shards for the high-budget unsolved sweep. Predict each Corpus-2 id's
// runtime from EMA ms/giganode telemetry scaled to this node budget; unknown ids use the median.
// Seeded first-fit-decreasing packing targets a wall-time budget at `workers` concurrency, while
// severe outliers get solo shards. Corpus-1 stragglers are folded into early shards separately.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const root = process.cwd();
const req = (name) => {
    const v = args.get(name);
    if (!v) { console.error(`Missing required ${name}`); process.exit(2); }
    return v;
};
const idsFile = req('--ids-file');
const corpus1IdsFile = args.get('--corpus1-ids-file') || null;
const corpus2Path = req('--corpus2');
const corpus1Path = args.get('--corpus1') || null;
const telemetryPath = args.get('--telemetry') || null;
const nodeBudget = Number(req('--node-budget'));
const workers = args.has('--workers') ? Number(args.get('--workers')) : 4;
const targetWallMinutes = args.has('--target-wall-minutes') ? Number(args.get('--target-wall-minutes')) : 18;
const soloThresholdMultiplier = args.has('--solo-threshold-multiplier') ? Number(args.get('--solo-threshold-multiplier')) : 2.5;
const seed = args.get('--seed') || new Date().toISOString().slice(0, 10);
// GHA matrix runs cap at 256 jobs; keep a small default margin.
const maxShards = args.has('--max-shards') ? Number(args.get('--max-shards')) : 250;
const outPath = req('--out');

// Deterministic PRNG keeps a given seed reproducible while varying fallback-bucket grouping by seed.
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hashSeed(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; }
    return h;
}
function seededShuffle(arr, seedStr) {
    const rand = mulberry32(hashSeed(seedStr));
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const readLines = (p) => readFileSync(path.resolve(root, p), 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
const readJson = (p) => JSON.parse(readFileSync(path.resolve(root, p), 'utf8'));

const ids = readLines(idsFile);
const corpus1Ids = corpus1IdsFile ? readLines(corpus1IdsFile) : [];
const corpus2 = readJson(corpus2Path);
const corpus1 = corpus1Path ? readJson(corpus1Path) : null;
const telemetry = telemetryPath && (() => { try { return readJson(telemetryPath); } catch { return null; } })();

const posByIdC2 = new Map(corpus2.levels.map((lv, i) => [lv.id, i + 1]).filter(([id]) => id));
const posByIdC1 = corpus1 ? new Map(corpus1.levels.map((lv, i) => [lv.id, i + 1]).filter(([id]) => id)) : new Map();

const missingC2 = ids.filter(id => !posByIdC2.has(id));
if (missingC2.length > 0) { console.error(`--ids-file: ${missingC2.length} id(s) not found in --corpus2 (e.g. ${missingC2.slice(0, 5).join(', ')})`); process.exit(1); }
const missingC1 = corpus1Ids.filter(id => !posByIdC1.has(id));
if (missingC1.length > 0) { console.error(`--corpus1-ids-file: ${missingC1.length} id(s) not found in --corpus1 (e.g. ${missingC1.slice(0, 5).join(', ')})`); process.exit(1); }

const telemetryById = telemetry?.levels ?? {};
const knownPredictions = ids
    .map(id => telemetryById[id]?.emaMsPerGiganode)
    .filter(v => Number.isFinite(v))
    .map(v => v * (nodeBudget / 1e9))
    .sort((a, b) => a - b);
const fallbackMs = knownPredictions.length > 0
    ? knownPredictions[Math.floor(knownPredictions.length / 2)]
    : targetWallMinutes * 60_000;

const predictedMsById = new Map(ids.map(id => {
    const t = telemetryById[id];
    const ms = Number.isFinite(t?.emaMsPerGiganode) ? t.emaMsPerGiganode * (nodeBudget / 1e9) : fallbackMs;
    return [id, ms];
}));

const shardCapacityMs = targetWallMinutes * 60_000 * workers;
// Only true tail outliers go solo; moderate slow ids still benefit from packing.
const soloThresholdMs = targetWallMinutes * 60_000 * soloThresholdMultiplier;

const soloIds = ids.filter(id => predictedMsById.get(id) >= soloThresholdMs);
const packableIds = ids.filter(id => predictedMsById.get(id) < soloThresholdMs);

// Shuffle before stable weight sorting so equal/fallback weights do not always share a shard.
const shuffled = seededShuffle(packableIds, seed);
const sorted = shuffled.slice().sort((a, b) => predictedMsById.get(b) - predictedMsById.get(a));

const bins = [];
for (const id of sorted) {
    const ms = predictedMsById.get(id);
    let placed = false;
    for (const bin of bins) {
        if (bin.sumMs + ms <= shardCapacityMs) { bin.ids.push(id); bin.sumMs += ms; placed = true; break; }
    }
    if (!placed) bins.push({ ids: [id], sumMs: ms });
}

if (bins.length + soloIds.length > maxShards) {
    console.error(`Planned ${bins.length + soloIds.length} shards, exceeding --max-shards=${maxShards}. Raise --target-wall-minutes or --max-shards.`);
    process.exit(1);
}

const shardDefs = [];
for (const id of soloIds) {
    const ms = predictedMsById.get(id);
    const wallMinutes = Math.ceil(ms / 60_000);
    shardDefs.push({ ids: [id], predictedWallMinutes: wallMinutes, timeoutMinutes: Math.max(30, Math.ceil(wallMinutes * 1.5) + 10) });
}
for (const bin of bins) {
    const wallMinutes = Math.ceil(bin.sumMs / workers / 60_000);
    shardDefs.push({ ids: bin.ids, predictedWallMinutes: wallMinutes, timeoutMinutes: Math.max(30, Math.ceil(wallMinutes * 1.5) + 10) });
}

// Corpus-1 stragglers run sequentially before Corpus-2 in their assigned jobs and have no C2 EMA,
// so add a conservative target-wall-sized timeout allowance.
const c1TimeoutMinutes = Math.max(30, Math.ceil(targetWallMinutes * 1.5));

const shard = shardDefs.map((d, i) => {
    const idx = String(i + 1).padStart(3, '0');
    const levels = d.ids.map(id => `pos:${posByIdC2.get(id)}`).join(',');
    const c1Id = corpus1Ids[i] ?? null;
    return {
        idx,
        ids: d.ids,
        levels,
        c1Id,
        c1Levels: c1Id ? `pos:${posByIdC1.get(c1Id)}` : null,
        c1TimeoutMinutes: c1Id ? c1TimeoutMinutes : 0,
        predictedWallMinutes: d.predictedWallMinutes + (c1Id ? c1TimeoutMinutes : 0),
        timeoutMinutes: d.timeoutMinutes,
        jobTimeoutMinutes: d.timeoutMinutes + (c1Id ? c1TimeoutMinutes : 0),
    };
});

writeFileSync(path.resolve(root, outPath), JSON.stringify({ shard }, null, 2) + '\n');

const wallMinutesList = shard.map(s => s.predictedWallMinutes).sort((a, b) => a - b);
const pctl = (p) => wallMinutesList[Math.min(wallMinutesList.length - 1, Math.floor(wallMinutesList.length * p))];
const waves = Math.ceil(shard.length / 20);
console.log(`Planned ${shard.length} shard(s) (${soloIds.length} solo, ${bins.length} packed) from ${ids.length} ids + ${corpus1Ids.length} corpus-1 straggler(s).`);
console.log(`Predicted wall minutes/shard: min=${wallMinutesList[0]} p50=${pctl(0.5)} p90=${pctl(0.9)} max=${wallMinutesList[wallMinutesList.length - 1]}`);
console.log(`At max-parallel=20: ${waves} wave(s); rough total wall estimate (sum of the slowest shard per wave, optimistic) needs the actual matrix run to confirm.`);
console.log(`Wrote ${outPath}.`);
