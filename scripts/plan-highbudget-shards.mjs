#!/usr/bin/env node
// Plans runtime-balanced shards for the high-budget unsolved sweep. Predict each Corpus-2 id's
// runtime from EMA ms/giganode telemetry scaled to this node budget; unknown/weak-evidence ids get
// an uncertainty-multiplied conservative fallback rather than an ordinary median (see
// classifyTelemetry's own comment for why, and docs/solver-scheduling-policy.md for the incident
// history this was calibrated against). A cheap longest-processing-time-first (LPT) simulation of
// the real `workers`-way concurrent queue -- not sum(predicted)/workers -- estimates each shard's
// makespan, which both drives bin-packing capacity checks and the reported/timeout wall time.
// Corpus-1 stragglers are folded into early shards separately.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

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

// Longest-processing-time-first (LPT) list scheduling: sort durations longest-first, always assign
// the next one to whichever of `workers` virtual workers currently has the least accumulated load.
// This is the textbook cheap approximation of an NP-hard makespan-minimization problem (never more
// than 4/3 - 1/(3*workers) times the true optimum) and is a far closer model of what
// level-blind-capability-sweep.mjs's own `--workers=N` cross-level pool actually does than
// sum(durations)/workers, which is only correct when every duration is identical. Exported for
// direct unit testing.
export function simulateMakespan(durationsMs, workerCount) {
    const loads = new Array(Math.max(1, workerCount)).fill(0);
    const sorted = durationsMs.slice().sort((a, b) => b - a);
    for (const d of sorted) {
        let minIdx = 0;
        for (let i = 1; i < loads.length; i++) if (loads[i] < loads[minIdx]) minIdx = i;
        loads[minIdx] += d;
    }
    return { makespanMs: Math.max(0, ...loads), workerLoadsMs: loads };
}

// Bin-packs `ids` (by decreasing predicted ms, after a seeded shuffle so equal/fallback weights do
// not always land together) into shards whose SIMULATED makespan (not summed/averaged predicted
// cost) stays under `capacityMs`, optionally also capping shard size at `maxGroupSize` regardless
// of how much makespan headroom remains. First-fit: an id joins the first existing bin it fits in
// makespan-wise, else starts a new bin.
export function packByMakespan(ids, predictedMsById, { workerCount, capacityMs, maxGroupSize = Infinity, seedStr }) {
    const shuffled = seededShuffle(ids, seedStr);
    const sorted = shuffled.slice().sort((a, b) => predictedMsById.get(b) - predictedMsById.get(a));
    const bins = [];
    for (const id of sorted) {
        const ms = predictedMsById.get(id);
        let placed = false;
        for (const bin of bins) {
            if (bin.ids.length >= maxGroupSize) continue;
            const { makespanMs } = simulateMakespan([...bin.ids.map(i => predictedMsById.get(i)), ms], workerCount);
            if (makespanMs <= capacityMs) { bin.ids.push(id); placed = true; break; }
        }
        if (!placed) bins.push({ ids: [id] });
    }
    return bins;
}

export function canonicalConfigKey(enableFlags, disableFlags) {
    const norm = (s) => (s || '').split(',').map(x => x.trim()).filter(Boolean).sort().join(',');
    return `${norm(enableFlags)}|${norm(disableFlags)}`;
}

// Classifies one id's telemetry (if any) into a confidence tier, and returns the RAW (unmultiplied)
// telemetry-linear-scaled ms prediction when telemetry exists at all, for the caller to apply the
// appropriate uncertainty multiplier to. Two independent, empirically-discovered mismatch causes
// (2026-09-10, connectivity-volume-portal-ab-001 control and treatment arms -- see
// data/stress/shard-runtime-backtest-cases.json) are checked, worse case wins:
//
// 1. SCALE mismatch: corpus2-runtime-telemetry.json is written exclusively by
//    solver-highbudget-unsolved-sweep.yml at its own --node-budget (historically ~1.2 BILLION), then
//    linearly extrapolated (`emaMsPerGiganode * (nodeBudget/1e9)`) to whatever --node-budget a
//    DIFFERENT caller (e.g. solver-level-blind-targeted-sweep.yml) actually requests. That linear
//    scaling assumption is false in general: several production retry tiers have a FLAT node-count
//    ceiling or a fixed budget FRACTION rather than a --node-budget-proportional one (see
//    reports/2026-08-28-additive-tier-participation-audit.md), so a flat-cost tier is a much larger
//    relative share of a small requested budget than of the large budget telemetry was measured at
//    -- extrapolating DOWN in scale systematically UNDERESTIMATES real cost, not the reverse.
// 2. CONFIG mismatch: telemetry carries no record of which enable/disable ablation flags were active
//    when a sample was taken (historically always production-default, since
//    solver-highbudget-unsolved-sweep.yml never varies flags) versus THIS dispatch's own flags. A
//    flag that changes pruning/retry behavior can change real cost by an amount telemetry never
//    measured.
export function classifyTelemetry(id, { telemetryById, nodeBudget: requestedNodeBudget, configKey, scaleTolerance: tolerance }) {
    const t = telemetryById[id];
    if (!Number.isFinite(t?.emaMsPerGiganode)) return { tier: 'none', rawMs: null };
    const rawMs = t.emaMsPerGiganode * (requestedNodeBudget / 1e9);
    // Missing configKey on an entry means it predates this field; every such entry was written by
    // solver-highbudget-unsolved-sweep.yml, which never passes ablation flags, so treating a missing
    // key as the production-default key ('|') is precise, not a guess.
    const entryConfigKey = t.configKey ?? '|';
    if (entryConfigKey !== configKey) return { tier: 'config-mismatch', rawMs };
    const telemetryNodeBudget = Number.isFinite(t.lastNodeBudget) && t.lastNodeBudget > 0 ? t.lastNodeBudget : null;
    if (telemetryNodeBudget) {
        const ratio = Math.max(requestedNodeBudget, telemetryNodeBudget) / Math.min(requestedNodeBudget, telemetryNodeBudget);
        if (ratio > tolerance) return { tier: 'scale-mismatch', rawMs };
    }
    return { tier: 'confident', rawMs };
}

function main() {
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
    const DEFAULT_TELEMETRY_PATH = 'logs/solver-stress-refresh/corpus2-runtime-telemetry.json';
    const telemetryPath = args.get('--telemetry') || (existsSync(path.resolve(root, DEFAULT_TELEMETRY_PATH)) ? DEFAULT_TELEMETRY_PATH : null);
    const nodeBudget = Number(req('--node-budget'));
    const workers = args.has('--workers') ? Number(args.get('--workers')) : 4;
    const targetWallMinutes = args.has('--target-wall-minutes') ? Number(args.get('--target-wall-minutes')) : 18;
    const soloThresholdMultiplier = args.has('--solo-threshold-multiplier') ? Number(args.get('--solo-threshold-multiplier')) : 2.5;
    // Floor under every shard's timeout, regardless of how low its telemetry-predicted wall time is.
    // Was a hardcoded 30 with no override until 2026-09-10: a telemetry-vs-real-cost mismatch this
    // severe recurred twice in one day on the same research line (connectivity-volume-*) -- once on
    // a packed multi-level bin (control-arm gap-fill, run 34414099319) and once on a population-wide
    // dispatch where even single-level solo-shard costs plausibly exceed 30 minutes (treatment arm,
    // run 34425486566: one 23-level packed shard completed only 5 levels in 40 minutes at 4-way
    // concurrency, ~32 worker-minutes/level). A caller that already knows a population's real cost
    // exceeds the default floor needs a way to raise it without also having to fabricate fake
    // telemetry or pack multiple levels together (which only compounds the underestimate).
    const minTimeoutMinutes = args.has('--min-timeout-minutes') ? Number(args.get('--min-timeout-minutes')) : 30;
    // Bypasses telemetry-based capacity packing in favor of fixed-size groups -- see the usage note
    // at this flag's consumption site below for why and when to reach for it.
    const fixedGroupSize = args.has('--fixed-group-size') ? Number(args.get('--fixed-group-size')) : null;
    // This dispatch's own resolved flags, used only to detect a TELEMETRY CONFIG mismatch (see
    // classifyTelemetry) -- not passed through to any solve, which reads its own
    // --enable-flags/--disable-flags arguments from the workflow separately.
    const enableFlagsArg = args.get('--enable-flags') || '';
    const disableFlagsArg = args.get('--disable-flags') || '';
    // See docs/solver-scheduling-policy.md's "shard runtime estimation" section and
    // data/stress/shard-runtime-backtest-cases.json for how these two defaults were calibrated
    // (scripts/backtest-shard-runtime-policy.mjs) rather than picked by feel. Re-run that script and
    // update these defaults after adding a new backtest case.
    const scaleMismatchMultiplier = args.has('--scale-mismatch-multiplier') ? Number(args.get('--scale-mismatch-multiplier')) : 8;
    const noMatchMultiplier = args.has('--no-telemetry-or-config-mismatch-multiplier') ? Number(args.get('--no-telemetry-or-config-mismatch-multiplier')) : 11;
    // A telemetry entry recorded at a --node-budget more than this many times larger or smaller than
    // what THIS dispatch requests is evidence at the wrong scale, not confident evidence -- see
    // classifyTelemetry.
    const scaleTolerance = args.has('--scale-tolerance') ? Number(args.get('--scale-tolerance')) : 3;
    // Caps how many WEAK-evidence ids (no telemetry, or telemetry that failed the config/scale
    // check) can share one shard, independent of the makespan capacity check. Confident-telemetry
    // ids have no such cap (a correct makespan estimate is enough justification to pack them
    // tightly); uncertain ids get this belt-and-suspenders limit because several of them being
    // simultaneously wrong in the same (worse-than-multiplied) direction is a correlated risk the
    // makespan model alone cannot see. Default keeps 4 workers busy for ~3 waves of packed
    // uncertain ids, per the standing scheduling policy of small multi-wave shards over one-level
    // shards for exactly this population.
    const maxUncertainGroupSize = args.has('--max-uncertain-group-size') ? Number(args.get('--max-uncertain-group-size')) : workers * 3;
    const seed = args.get('--seed') || new Date().toISOString().slice(0, 10);
    // GHA matrix runs cap at 256 jobs; keep a small default margin.
    const maxShards = args.has('--max-shards') ? Number(args.get('--max-shards')) : 250;
    const outPath = req('--out');

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
    const requestedConfigKey = canonicalConfigKey(enableFlagsArg, disableFlagsArg);

    const classById = new Map(ids.map(id => [id, classifyTelemetry(id, { telemetryById, nodeBudget, configKey: requestedConfigKey, scaleTolerance })]));

    const confidentRawMs = ids
        .map(id => classById.get(id))
        .filter(c => c.tier === 'confident')
        .map(c => c.rawMs)
        .sort((a, b) => a - b);
    // Median of CONFIDENT (matching scale + config) predictions only -- an unconfident entry has
    // already been shown (see classifyTelemetry) to be a poor estimator of real cost at this
    // scale/config, so it must not silently drag the population fallback toward its own wrong
    // number.
    const fallbackMs = confidentRawMs.length > 0
        ? confidentRawMs[Math.floor(confidentRawMs.length / 2)]
        : targetWallMinutes * 60_000;

    // Only multiply a fallback that is itself grounded in real (confident) evidence from this same
    // population. When NOTHING in the population has confident telemetry, fallbackMs collapses to
    // targetWallMinutes*60_000 -- a placeholder, not a measurement -- and multiplying a placeholder
    // by noMatchMultiplier is a self-referential inflation with no real information content (it
    // would make --target-wall-minutes alone decide whether every id blows past the solo threshold,
    // independent of --max-uncertain-group-size). In that fully-blind case, --max-uncertain-group-
    // size is the real defense instead: leave the placeholder unmultiplied and let the group-size
    // cap bound the blast radius directly.
    const hasGroundedFallback = confidentRawMs.length > 0;
    const predictedMsById = new Map(ids.map(id => {
        const c = classById.get(id);
        let ms;
        if (c.tier === 'confident') ms = c.rawMs;
        else if (c.tier === 'scale-mismatch') ms = c.rawMs * scaleMismatchMultiplier;
        else ms = hasGroundedFallback ? fallbackMs * noMatchMultiplier : fallbackMs; // 'none' or 'config-mismatch'
        return [id, ms];
    }));

    const shardDefs = [];
    let soloCount = 0;
    let packedCount = 0;
    if (fixedGroupSize) {
        // Bypass telemetry-driven capacity packing entirely: group ids into fixed-size chunks of
        // exactly --fixed-group-size, matched to --workers so every id in a shard runs on its own
        // worker concurrently rather than queueing sequentially behind the first `workers` of them.
        // For a population where telemetry is already known (from a prior run) to underestimate
        // real cost, the normal sum-of-predicted-ms-vs-capacity bin packer keeps packing "supposedly
        // cheap" ids together regardless of --target-wall-minutes -- exactly what produced a
        // 23-level shard that completed only 5 levels in 40 minutes on 2026-09-10
        // (connectivity-volume-portal-ab-001 treatment arm, run 34425486566). A fixed group size
        // sized to --workers keeps each shard's real wall time close to ONE id's real cost
        // regardless of how wrong the telemetry is, with --min-timeout-minutes (not a
        // telemetry-derived estimate) as the sole timeout basis.
        const shuffled = seededShuffle(ids, seed);
        for (let i = 0; i < shuffled.length; i += fixedGroupSize) {
            shardDefs.push({ ids: shuffled.slice(i, i + fixedGroupSize), predictedWallMinutes: minTimeoutMinutes, timeoutMinutes: minTimeoutMinutes, confidence: 'bypassed' });
        }
        packedCount = shardDefs.length;
        if (shardDefs.length > maxShards) {
            console.error(`Planned ${shardDefs.length} shards, exceeding --max-shards=${maxShards}. Raise --fixed-group-size or --max-shards.`);
            process.exit(1);
        }
    } else {
        // Makespan capacity is now a PER-WORKER (bottleneck) budget, not a total-across-workers
        // one: packByMakespan simulates the real 4-way queue and compares its max worker load
        // against this.
        const shardCapacityMs = targetWallMinutes * 60_000;
        // Only true tail outliers go solo; moderate slow ids still benefit from packing. Uses the
        // uncertainty-adjusted predicted ms, so an uncertain id is more readily pushed solo than a
        // confident one predicting the same raw number -- appropriately, since its true cost is
        // less knowable either way.
        const soloThresholdMs = targetWallMinutes * 60_000 * soloThresholdMultiplier;

        const soloIds = ids.filter(id => predictedMsById.get(id) >= soloThresholdMs);
        const packableIds = ids.filter(id => predictedMsById.get(id) < soloThresholdMs);
        const packableConfident = packableIds.filter(id => classById.get(id).tier === 'confident');
        const packableUncertain = packableIds.filter(id => classById.get(id).tier !== 'confident');

        // Confident ids: no group-size cap, pure makespan-capacity packing -- "known-runtime shards
        // can remain larger when the makespan model supports it."
        const confidentBins = packByMakespan(packableConfident, predictedMsById, {
            workerCount: workers, capacityMs: shardCapacityMs, seedStr: `${seed}:confident`,
        });
        // Uncertain ids: makespan-capacity packing PLUS a hard group-size cap, since several
        // simultaneously-wrong-in-the-same-direction estimates is a correlated risk the makespan
        // model (which only reasons about the numbers it was given) cannot see on its own.
        const uncertainBins = packByMakespan(packableUncertain, predictedMsById, {
            workerCount: workers, capacityMs: shardCapacityMs, maxGroupSize: maxUncertainGroupSize, seedStr: `${seed}:uncertain`,
        });

        if (soloIds.length + confidentBins.length + uncertainBins.length > maxShards) {
            console.error(`Planned ${soloIds.length + confidentBins.length + uncertainBins.length} shards, exceeding --max-shards=${maxShards}. Raise --target-wall-minutes or --max-shards.`);
            process.exit(1);
        }

        for (const id of soloIds) {
            const ms = predictedMsById.get(id);
            const wallMinutes = Math.ceil(ms / 60_000);
            shardDefs.push({ ids: [id], predictedWallMinutes: wallMinutes, timeoutMinutes: Math.max(minTimeoutMinutes, Math.ceil(wallMinutes * 1.5) + 10), confidence: classById.get(id).tier === 'confident' ? 'high' : 'low' });
        }
        for (const bin of [...confidentBins, ...uncertainBins]) {
            const { makespanMs } = simulateMakespan(bin.ids.map(id => predictedMsById.get(id)), workers);
            const wallMinutes = Math.ceil(makespanMs / 60_000);
            const confidence = bin.ids.every(id => classById.get(id).tier === 'confident') ? 'high' : 'low';
            shardDefs.push({ ids: bin.ids, predictedWallMinutes: wallMinutes, timeoutMinutes: Math.max(minTimeoutMinutes, Math.ceil(wallMinutes * 1.5) + 10), confidence });
        }
        soloCount = soloIds.length;
        packedCount = confidentBins.length + uncertainBins.length;
    }

    // Corpus-1 stragglers run sequentially before Corpus-2 in their assigned jobs and have no C2
    // EMA, so add a conservative target-wall-sized timeout allowance.
    const c1TimeoutMinutes = Math.max(minTimeoutMinutes, Math.ceil(targetWallMinutes * 1.5));

    const shard = shardDefs.map((d, i) => {
        const idx = String(i + 1).padStart(3, '0');
        const levels = d.ids.map(id => `pos:${posByIdC2.get(id)}`).join(',');
        const c1Id = corpus1Ids[i] ?? null;
        const uncertainIds = fixedGroupSize ? d.ids.slice() : d.ids.filter(id => classById.get(id).tier !== 'confident');
        const tierCounts = { confident: 0, 'scale-mismatch': 0, 'config-mismatch': 0, none: 0 };
        if (!fixedGroupSize) for (const id of d.ids) tierCounts[classById.get(id).tier]++;
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
            confidence: d.confidence,
            telemetryCoverage: fixedGroupSize
                ? { total: d.ids.length, note: 'telemetry bypassed by --fixed-group-size' }
                : { total: d.ids.length, ...tierCounts },
            uncertainIds,
        };
    });

    writeFileSync(path.resolve(root, outPath), JSON.stringify({
        planning: {
            telemetryPath,
            telemetryKnownIds: confidentRawMs.length,
            telemetryRequestedIds: ids.length,
            fallbackMs,
            uncertaintyPolicy: {
                configKey: requestedConfigKey,
                scaleTolerance,
                scaleMismatchMultiplier,
                noTelemetryOrConfigMismatchMultiplier: noMatchMultiplier,
                maxUncertainGroupSize,
                calibratedFrom: 'data/stress/shard-runtime-backtest-cases.json (scripts/backtest-shard-runtime-policy.mjs)',
            },
        },
        shard,
    }, null, 2) + '\n');

    const lowConfidenceShards = shard.filter(s => s.confidence === 'low' || s.confidence === 'bypassed');
    const uncertainIdCount = ids.length - confidentRawMs.length;
    const wallMinutesList = shard.map(s => s.predictedWallMinutes).sort((a, b) => a - b);
    const pctl = (p) => wallMinutesList[Math.min(wallMinutesList.length - 1, Math.floor(wallMinutesList.length * p))];
    const waves = Math.ceil(shard.length / 20);
    console.log(`Planning telemetry: ${telemetryPath ?? '(none)'}; ${confidentRawMs.length}/${ids.length} requested id(s) have CONFIDENT (matching scale+config) runtime estimates; fallback=${Math.round(fallbackMs / 1000)}s.`);
    console.log(`Planned ${shard.length} shard(s) (${soloCount} solo, ${packedCount} packed${fixedGroupSize ? `, fixed group size ${fixedGroupSize}` : ''}) from ${ids.length} ids + ${corpus1Ids.length} corpus-1 straggler(s).`);
    console.log(`Predicted wall minutes/shard: min=${wallMinutesList[0]} p50=${pctl(0.5)} p90=${pctl(0.9)} max=${wallMinutesList[wallMinutesList.length - 1]}`);
    console.log(`At max-parallel=20: ${waves} wave(s); rough total wall estimate (sum of the slowest shard per wave, optimistic) needs the actual matrix run to confirm.`);
    if (uncertainIdCount > 0 || lowConfidenceShards.length > 0) {
        console.log(`⚠ LOW-CONFIDENCE PLAN: ${uncertainIdCount}/${ids.length} id(s) lack confident (matching scale+config) telemetry and used a ${fixedGroupSize ? 'bypassed' : `${noMatchMultiplier}x/${scaleMismatchMultiplier}x-multiplied`} conservative estimate; ${lowConfidenceShards.length}/${shard.length} shard(s) are low-confidence. See planning.uncertaintyPolicy and each shard's telemetryCoverage/uncertainIds in ${outPath} for detail.`);
    }
    console.log(`Wrote ${outPath}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
