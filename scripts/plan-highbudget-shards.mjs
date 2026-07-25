#!/usr/bin/env node
/**
 * Plans weighted, runtime-balanced shards for the high-budget unsolved-only sweep
 * (.github/workflows/solver-highbudget-unsolved-sweep.yml), replacing the original fixed
 * 20-shard even-count split. That split let a shard's wall time vary hugely by chance (round 2:
 * ideal perfectly-balanced wall time was ~152min, actual was ~220min -- a ~45% tail-latency loss
 * purely from 20 fixed-size shards finishing at wildly different times while idle lanes waited).
 *
 * Instead: predict each id's runtime from logs/solver-stress-refresh/corpus2-runtime-telemetry.json
 * (an EMA of "ms per billion nodes" observed when that id hit the round's node-budget ceiling --
 * see update-highbudget-telemetry.mjs) scaled to THIS round's --node-budget, then bin-pack ids into
 * shards sized to a target WALL-clock (--target-wall-minutes, default 18) assuming --workers
 * (default 4) run concurrently within a shard. Feed the result to a dynamic GitHub Actions matrix
 * with strategy.max-parallel: 20: as small shards finish, the next queued shard starts immediately,
 * instead of being stuck behind 20 fixed lanes.
 *
 * Ids with no telemetry yet (first round, or newly added to the unsolved set) fall back to the
 * median predicted ms among ids that DO have telemetry (or a flat default if telemetry is empty).
 * Ids individually predicted to already meet or exceed the per-shard wall target get their own
 * solo shard (never packed alongside others) with a proportionally larger timeout, rather than
 * dragging down a shared bin. A seeded shuffle runs before packing so ids with equal/near-equal
 * predicted weight (overwhelmingly the no-telemetry fallback bucket) don't always land in the same
 * shard/co-worker grouping round after round -- pass --seed=<any string> to control it; omitting it
 * defaults to today's date, so re-running the same day is reproducible but each new day reshuffles.
 *
 * Usage:
 *   node scripts/plan-highbudget-shards.mjs \
 *       --ids-file=logs/solver-stress-refresh/corpus2-unsolved-highbudget-2026-07-24.txt \
 *       --corpus1-ids-file=logs/solver-stress-refresh/corpus1-unsolved-highbudget-2026-07-24.txt \
 *       --corpus2=data/stress/stress-levels-random.json --corpus1=data/stress/stress-levels.json \
 *       --telemetry=logs/solver-stress-refresh/corpus2-runtime-telemetry.json \
 *       --node-budget=600000000 [--workers=4] [--target-wall-minutes=18] [--seed=2026-07-26] \
 *       [--max-shards=250] --out=logs/solver-stress-refresh/shard-plan-latest.json
 */
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
// GitHub Actions hard-caps a single workflow run's matrix at 256 jobs -- exceeding it fails the
// whole run outright, not just a warning. 250 leaves a small margin; never raise this past 256.
const maxShards = args.has('--max-shards') ? Number(args.get('--max-shards')) : 250;
const outPath = req('--out');

// Deterministic seeded PRNG (mulberry32) so a given --seed always produces the same shuffle --
// reproducible for debugging, but differs run to run when --seed changes (defaults to the date).
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

// Predicted ms for this round's --node-budget, from telemetry's budget-independent throughput figure.
const telemetryById = telemetry?.levels ?? {};
const knownPredictions = ids
    .map(id => telemetryById[id]?.emaMsPerGiganode)
    .filter(v => Number.isFinite(v))
    .map(v => v * (nodeBudget / 1e9))
    .sort((a, b) => a - b);
const fallbackMs = knownPredictions.length > 0
    ? knownPredictions[Math.floor(knownPredictions.length / 2)] // median of known ids
    : targetWallMinutes * 60_000; // no telemetry at all yet (first-ever round): assume "typical"

const predictedMsById = new Map(ids.map(id => {
    const t = telemetryById[id];
    const ms = Number.isFinite(t?.emaMsPerGiganode) ? t.emaMsPerGiganode * (nodeBudget / 1e9) : fallbackMs;
    return [id, ms];
}));

const shardCapacityMs = targetWallMinutes * 60_000 * workers;
// A moderately-slow id (say 1.2x the target) still packs fine alongside 2-3 similar ids without
// badly blowing the shard's wall-clock target -- only a genuine tail outlier, whose OWN time would
// already dominate any bin it joined, needs pulling out. --solo-threshold-multiplier controls where
// that line is; too low (e.g. 1x) turns "moderately slow" into "everything is exceptional" once a
// round's node-budget grows enough that the typical id's predicted time approaches the target itself.
const soloThresholdMs = targetWallMinutes * 60_000 * soloThresholdMultiplier;

const soloIds = ids.filter(id => predictedMsById.get(id) >= soloThresholdMs);
const packableIds = ids.filter(id => predictedMsById.get(id) < soloThresholdMs);

// Seeded shuffle BEFORE the stable descending sort, so ids tied (or near-tied) on predicted weight
// -- overwhelmingly the no-telemetry fallback bucket -- land in randomized relative order instead
// of always the same id/position order, satisfying "don't always share process-level conditions."
const shuffled = seededShuffle(packableIds, seed);
const sorted = shuffled.slice().sort((a, b) => predictedMsById.get(b) - predictedMsById.get(a));

// First-fit-decreasing bin packing.
const bins = []; // { ids: string[], sumMs: number }
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

// Assemble final shard list: solo shards first (each its own generous timeout), then packed bins.
// Corpus-1's small straggler set rides along on the first N shards, one id each (same spirit as
// the original fixed-20-shard workflow's fold-in, just no longer tied to a specific shard count).
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

// A shard carrying a corpus-1 straggler runs it as its own sequential sweep step BEFORE the
// corpus-2 step (see the workflow), on top of whatever corpus-2 work this shard was already sized
// for -- the plan's own timeoutMinutes above only budgeted for the corpus-2 portion. corpus-1's 5
// stragglers aren't covered by this file's telemetry (that's corpus-2-only), and historically never
// solve within a round (they've burned their full --budget-ms/--node-budget allotment every time),
// so a flat targetWallMinutes-sized allocation is a reasonable, simple estimate for "one more
// level's worth of worst-case time" -- c1TimeoutMinutes/jobTimeoutMinutes exist so the workflow
// never has to do this arithmetic itself in bash/YAML.
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
