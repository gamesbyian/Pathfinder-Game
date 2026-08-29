#!/usr/bin/env node
/**
 * Stress-corpus solver benchmark.
 *
 * Solves the stress corpus with the witness metadata stripped (the solver never sees
 * witnessSolution or any stressMeta), records per-level runtime, node expansions,
 * attempt ladders, winning/failed strategies, and referee-validates every returned
 * solution. This is an EXPLORATORY/ITERATION tool, not the regression gate — that's
 * `npm run solver:bench` (scripts/solver-bench.mjs), which stays strictly sequential
 * for production-parity and is never touched by the engine choice here.
 *
 * Run via the esbuild wrapper (imports the TS solver):
 *   node scripts/run-bundled.mjs scripts/stress/benchmark.mjs
 *       [--corpus=data/stress/stress-levels.json] [--budget-ms=20000]
 *       [--out=reports/stress/benchmark-latest.json] [--levels=S001,S005|id:1-20]
 *       [--engine=raced|sequential] [--pool-size=N] [--parallel[=N]]
 *       [--filter-mechanic=mustCross,portalPairs] [--sample=N] [--seed=<value>]
 *       [--repair-budget-fraction=<n>] [--attraction-diversity-budget-fraction=<n>]
 *
 * --repair-budget-fraction=<n> overrides REPAIR_EXTRA_BUDGET_FRACTION (default 6x, the repair
 * fallback's extra wall-clock allowance ON TOP of --budget-ms) via SolveOpts.
 * repairBudgetFractionOverride for this whole run. Solver-TESTING workflows (this tool's usual
 * job) should pass 0 here — a full corpus-1 sweep measured the default 6x costing ~2.8x the total
 * wall time (51min -> 18min at fraction=0) for solves that only ever land at 35-115s anyway (well
 * past any interactive-use threshold), while previously-multi-minute failures resolve just as
 * correctly, only much faster. The extension is still worth keeping for actual hint-DISCOVERY
 * runs (--save-hints elsewhere, e.g. portfolio-solve-sweep.mjs/hint-workbench.mjs) where a
 * slow-but-eventual find becomes a permanent hint — leave this flag unset there. Omit entirely to
 * keep the default 6x (matches this tool's historical behavior exactly).
 *
 * --attraction-diversity-budget-fraction=<n> overrides GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION
 * (default 1.0x, the 2026-07-16 fragile-group last-resort pass's own separate extra wall-clock
 * allowance) via SolveOpts.attractionDiversityBudgetFractionOverride — a DEDICATED override, NOT
 * the same flag as --repair-budget-fraction above, specifically so a sweep can isolate one
 * extension's cost from the other's (see orchestration.ts's SolveOpts comment on why they're
 * separate). Same solver-testing-vs-hint-discovery guidance as --repair-budget-fraction: pass 0
 * here for ordinary solver-testing sweeps, leave unset for hint-discovery runs. Takes effect under
 * both --engine=sequential and the default --engine=raced (race.mjs's own single-queue phase 2,
 * added the same day as the sequential pass — see race.mjs's module comment).
 *
 * --filter-mechanic=<name>[,<name>...] (docs/solver-dev-tooling-plan.md Component C): keeps only
 * levels where stressMeta.mechanicCounts[<name>] > 0 for ANY of the given names (OR, not AND) —
 * both stress corpora already carry this metadata, so this is a pure filter over existing data,
 * never a new computation. Composes with --levels (applied after it). NOT a substitute for a
 * full run when the change touches shared orchestration/scoring/pruning code that every level
 * exercises regardless of mechanics — see docs/testing.md's "Solver stress tiers" table for which
 * tier a given change actually needs.
 *
 * --sample=N: deterministic rotating sample of N levels (Fisher-Yates, seeded), applied AFTER
 * --levels/--filter-mechanic — this is Tier 3's "100 levels per change, different deterministic
 * shard per commit" from the original regression-testing brainstorm: run a repeatable subset of a
 * huge corpus instead of the full sweep every time, without ever losing reproducibility. Default
 * seed is the current commit SHA (or $GITHUB_SHA under CI), so two runs on the same commit sample
 * the same levels; pass --seed=<any string> explicitly to pin or vary the sample independent of
 * the commit (e.g. --seed=daily-2026-07-10 for a once-a-day rotating shard). Omit --sample to run
 * every selected level, as before.
 *
 * --engine (default: raced) selects which engine solves each level:
 *   - raced: worker-thread attempt racing via a persistent pool shared across the whole
 *     run (scripts/solver-parallel/race.mjs's createRacePool) — races the SAME
 *     policy-selected attempts a sequential solveLevel() would run, just scheduled
 *     concurrently across --pool-size workers (default availableParallelism()-1).
 *     Faster in aggregate for a full-corpus run (see docs/solver-architecture.md's
 *     "Making racing the default for batch runs" for the measured numbers), but a
 *     winning strategy under racing is "whichever config's worker finished first", not
 *     "first in ladder order that succeeded" — treat winningStrategy/attempt timings as
 *     approximate, and use --engine=sequential when you need exact production numbers
 *     (e.g. before comparing against solver:bench).
 *   - sequential: the exact single-threaded PRODUCTION solveLevel(), one level at a time.
 *
 * --parallel runs levels across N worker threads (default: availableParallelism-1) for
 * ITERATION SPEED ONLY — parallelizes ACROSS levels, orthogonal to --engine=raced's
 * within-level racing. The two are not combined (nested worker pools would oversubscribe
 * CPU): passing both forces --engine=sequential inside each outer worker. Per-level
 * timings under parallel mode are inflated by CPU contention and MUST NOT be compared
 * against sequential runs or committed as benchmark-latest.json — the output is stamped
 * with `parallel: N` and the default output path is redirected so an official report
 * can't be overwritten by accident. Solve/fail results (the solved set) are
 * budget-dependent and can flip near the budget edge under contention; treat parallel
 * failures as "re-check sequentially".
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { formatAttemptIdentityKey } from '../../modules/solver/attempt-identity.mjs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createRacePool } from '../solver-parallel/race.mjs';
import { selectLevelsBySpec } from '../level-data-io.mjs';
import { attemptRecord } from '../portfolio-solve-sweep-lib.mjs';

const ROOT = process.cwd();

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

// Workers receive their config via workerData (a worker's process.argv is not the CLI's).
const argMap = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const cfg = isMainThread
    ? {
        corpusFile: argMap.get('--corpus') || 'data/stress/stress-levels.json',
        budgetMs: Number(argMap.get('--budget-ms') || 20000),
        // The machine-independent bound (modules/solver/work-meter.ts). Pass it for a run whose
        // solved set must be reproducible; without it one is derived from budgetMs.
        workBudget: argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined,
        levelSpec: argMap.get('--levels') || null,
        filterMechanic: argMap.get('--filter-mechanic') || null,
        skipExistingDir: argMap.get('--skip-existing-dir') || null,
        sample: argMap.has('--sample') ? Number(argMap.get('--sample')) : null,
        seed: argMap.get('--seed') || getCommitSha(),
        repairBudgetFraction: argMap.has('--repair-budget-fraction') ? Number(argMap.get('--repair-budget-fraction')) : undefined,
        attractionDiversityBudgetFraction: argMap.has('--attraction-diversity-budget-fraction') ? Number(argMap.get('--attraction-diversity-budget-fraction')) : undefined,
    }
    : workerData;

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();

/** Keeps only levels touching ANY of the named mechanics (see stressMeta.mechanicCounts) — a
 *  pure filter over metadata every stress-corpus level already carries, no new computation. */
function filterByMechanic(levels, spec) {
    if (!spec) return levels;
    const names = spec.split(',').map(s => s.trim()).filter(Boolean);
    return levels.filter(l => names.some(name => (l.stressMeta?.mechanicCounts?.[name] ?? 0) > 0));
}

/** FNV-1a: derives a 32-bit numeric seed from an arbitrary string (a commit SHA by default, or
 *  any --seed value) for mulberry32 below — same seeded-PRNG convention as repair-search.ts /
 *  scripts/solver-oracle/generate.mjs. */
function hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
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

/** Deterministic rotating sample (docs/solver-dev-tooling-plan.md tail item "seeded sampling"):
 *  Fisher-Yates partial shuffle seeded from `seedStr` (default: the current commit SHA), so a
 *  Tier-3 "N levels of the 1700-level corpus" run is reproducible from the seed alone — rerun the
 *  same --seed to replay exactly the same sample, or omit --sample entirely to run the full set. */
function sampleDeterministic(levels, n, seedStr) {
    if (!Number.isFinite(n) || n >= levels.length) return levels;
    const rng = mulberry32(hashSeed(String(seedStr)));
    const pool = levels.slice();
    const picked = [];
    for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rng() * (pool.length - i));
        [pool[i], pool[j]] = [pool[j], pool[i]];
        picked.push(pool[i]);
    }
    return picked;
}

function loadExistingRecords(logDir) {
    const records = new Map();
    if (!logDir) return records;
    const absDir = path.resolve(ROOT, logDir);
    if (!existsSync(absDir)) return records;
    for (const name of readdirSync(absDir)) {
        if (!name.endsWith('.json')) continue;
        let parsed;
        try { parsed = JSON.parse(readFileSync(path.join(absDir, name), 'utf8')); }
        catch { continue; }
        if (!Array.isArray(parsed?.levels)) continue;
        for (const record of parsed.levels) {
            if (typeof record?.id === 'string' && !records.has(record.id)) records.set(record.id, record);
        }
    }
    return records;
}

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, cfg.corpusFile), 'utf8'));
// A bare-array corpus (e.g. family-generate.mjs's own output, which has no {levels: [...]}
// wrapper) has no `.levels` property -- fall back to the parsed value itself, matching
// level-data-io.mjs's readers.
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
let levels = sampleDeterministic(filterByMechanic(selectLevelsBySpec(corpusLevels, cfg.levelSpec), cfg.filterMechanic), cfg.sample, cfg.seed);

// Current console/summary output uses the same canonical config identity as persisted reports.
const attemptLabel = a => formatAttemptIdentityKey({
    scoringProfileId: a.scoringProfileId ?? a.profile ?? 'unknown',
    orderingBiasId: a.orderingBiasId ?? a.template ?? null,
    beamWidth: a.beamWidth,
    mechanicBucketRetention: a.mechanicBucketRetention ?? a.diverseBeam,
    repair: a.repair,
    repairMustTurnBiased: a.repairMustTurnBiased,
    repairTurnBiased: a.repairTurnBiased,
    admissibleOrder: a.admissibleOrder,
    admissibleOrderNoTieBreak: a.admissibleOrderNoTieBreak,
    admissibleOrderLds: a.admissibleOrderLds,
});

/** Sequential engine: the exact single-threaded PRODUCTION solveLevel(). */
const solveSequential = (raw, level) => Solver.solveLevel(level, {
    timeBudgetMs: cfg.budgetMs,
    ...(cfg.workBudget !== undefined ? { workBudget: cfg.workBudget } : {}),
    ...(Number.isFinite(cfg.repairBudgetFraction) ? { repairBudgetFractionOverride: cfg.repairBudgetFraction } : {}),
    ...(Number.isFinite(cfg.attractionDiversityBudgetFraction) ? { attractionDiversityBudgetFractionOverride: cfg.attractionDiversityBudgetFraction } : {}),
});

/** Solve one corpus entry and build its report record + console line. Shared verbatim by the
 *  sequential loop, the raced-pool loop, and the across-levels worker-pool path so all modes
 *  measure/report the same shape. `solve(raw, level)` is the pluggable engine adapter — sequential
 *  ignores `raw` (needs the already-normalized `level`), raced ignores `level` (createRacePool's
 *  solveLevel() does its own prepareLevelForSolver internally, matching production's own path). */
async function solveEntry(entry, solve) {
    // Strip everything the solver must not see: the id and the entire stressMeta
    // (which contains the hidden witness). What remains is plain wire format.
    const { id, stressMeta, ...raw } = entry;
    const batch = stressMeta?.generationBatch ?? '?';

    let level;
    try {
        level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    } catch (err) {
        return { record: { id, batch, status: 'error', error: `normalize: ${err?.message}` }, line: `  ${id} ERROR — ${err?.message}` };
    }

    const t0 = Date.now();
    let result;
    try {
        result = await solve(raw, level);
    } catch (err) {
        return {
            record: { id, batch, status: 'error', error: `solve: ${err?.message}`, elapsedMs: Date.now() - t0 },
            line: `  ${id} ERROR — ${err?.message}`,
        };
    }
    const elapsedMs = Date.now() - t0;
    const ok = !!result?.ok;

    // Referee check: the solver's own solution must satisfy PLAY rules. The solver
    // intentionally ignores geese/false goals (MoveContext.SOLVER), so a refereeValid=false
    // on a hazard-padded level is a *finding*, not a bug in the benchmark.
    let refereeValid = null;
    if (ok && Array.isArray(result.solution)) {
        const check = Solver.validateCandidatePath(level, result.solution);
        refereeValid = check.ok;
    }

    // Shared with portfolio-solve-sweep-lib.mjs rather than duplicated here. This file kept its own
    // hand-maintained copy of the same field whitelist, and the two drifted TWICE: it never carried
    // repairTurnBiased/randomSeed/seedSalt (so a stress:benchmark repair winner was not replayable,
    // and a turn-biased repair winner was indistinguishable from an ordinary one), and neither copy
    // ever carried the admissible-order flags. One projection, one place to update when the solver
    // gains a new diagnostic field.
    const attempts = (result.attempts || []).map(attemptRecord);
    const winner = attempts.find(a => a.ok) || null;
    const record = {
        id, batch,
        status: result.status,
        ok,
        refereeValid,
        elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
        // Machine-independent cost (modules/solver/work-meter.ts) — comparable across techniques
        // and across hosts, unlike nodesExpanded/elapsedMs.
        workSpent: result.workSpent ?? null,
        // A run the wall-clock deadline cut short while work budget remained is INDETERMINATE, not
        // a reproducible negative. Recorded explicitly so downstream analysis can exclude it rather
        // than bank a host-dependent "unsolved". See docs/solver-budget-determinism.md.
        deadlineTruncated: result.deadlineTruncated ?? false,
        attemptCount: attempts.length,
        winningStrategy: winner ? attemptLabel(winner) : null,
        failedStrategies: attempts.filter(a => !a.ok).map(attemptLabel),
        attempts,
    };
    const line = `  ${id} [${batch}] ${ok ? '✓' : '✗'} ${elapsedMs}ms ${ok ? (winner ? winner.scoringProfileId : '?') : result.status}` +
        (refereeValid === false ? '  !! solver path fails PLAY referee' : '');
    return { record, line };
}

// ---------------------------------------------------------------------------
// Worker mode: solve indices the main thread hands us, one at a time.
// ---------------------------------------------------------------------------
if (!isMainThread) {
    // --engine=raced is not combined with --parallel (see header comment) — an across-levels
    // worker always solves sequentially, regardless of the main thread's --engine choice.
    parentPort.on('message', async msg => {
        if (msg?.type !== 'solve') return;
        const { record, line } = await solveEntry(levels[msg.index], solveSequential);
        parentPort.postMessage({ type: 'result', index: msg.index, record, line });
    });
} else {
    await main();
}

async function main() {
    const targetLevels = levels;
    const recordById = loadExistingRecords(cfg.skipExistingDir);
    levels = cfg.skipExistingDir ? targetLevels.filter(level => !recordById.has(level.id)) : targetLevels;
    cfg.levelSpec = levels.map(level => level.id).join(',');

    const parallelArg = argMap.has('--parallel')
        ? (argMap.get('--parallel') === '' ? Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1) : Number(argMap.get('--parallel')))
        : 1;
    const parallel = Math.max(1, Math.min(parallelArg, levels.length));
    // Parallel runs must not silently replace the official (sequential) report.
    const defaultOut = parallel > 1 ? 'reports/stress/benchmark-parallel.json' : 'reports/stress/benchmark-latest.json';
    const outFile = argMap.get('--out') || defaultOut;

    // --engine=raced (within-level worker-thread attempt racing, via a pool shared across the
    // WHOLE run) is the default — see header comment. Not combined with --parallel (across-level
    // worker threads spawning their own nested racing pools would oversubscribe CPU).
    const requestedEngine = argMap.get('--engine') || 'raced';
    const engine = parallel > 1 ? 'sequential' : requestedEngine;
    const poolSizeArg = argMap.get('--pool-size') ? Number(argMap.get('--pool-size')) : undefined;
    const racePool = engine === 'raced' ? createRacePool({ poolSize: poolSizeArg }) : null;
    const solve = racePool
        ? (raw) => racePool.solveLevel(raw, {
            timeBudgetMs: cfg.budgetMs,
            ...(cfg.workBudget !== undefined ? { workBudget: cfg.workBudget } : {}),
    ...(cfg.workBudget !== undefined ? { workBudget: cfg.workBudget } : {}),
            ...(Number.isFinite(cfg.repairBudgetFraction) ? { repairBudgetFractionOverride: cfg.repairBudgetFraction } : {}),
            ...(Number.isFinite(cfg.attractionDiversityBudgetFraction) ? { attractionDiversityBudgetFractionOverride: cfg.attractionDiversityBudgetFraction } : {}),
        })
        : solveSequential;

    console.log(`Stress benchmark: ${levels.length} level(s) to solve, budget ${cfg.budgetMs}ms, corpus ${cfg.corpusFile} (v${corpus.generatorVersion}), engine ${engine}` +
        (cfg.skipExistingDir ? `; ${targetLevels.length - levels.length}/${targetLevels.length} target result(s) already present in ${cfg.skipExistingDir}` : '') +
        (parallel > 1 ? `, ${parallel} workers` : '') + '.');
    if (parallel > 1) {
        console.log('  !! parallel mode: timings are CPU-contended — for iteration only, not comparable to sequential runs.');
        if (requestedEngine === 'raced') console.log('  !! --engine=raced ignored under --parallel; solving sequentially inside each outer worker instead.');
    }
    if (engine === 'raced') {
        console.log('  !! raced engine: winningStrategy/attempt timings reflect worker-thread scheduling, not the sequential ladder order — use --engine=sequential for exact production numbers.');
    }

    const runStart = Date.now();

    const writeReport = ({ partial = false, abortReason = null } = {}) => {
        const completedRecords = targetLevels.map(level => recordById.get(level.id)).filter(Boolean);
        const totalMs = Date.now() - runStart;
        const solved = completedRecords.filter(r => r.ok).length;
        // Deadline-truncated failures are indeterminate, not negatives — surfaced so a run whose
        // "unsolved" set is partly host-dependent can't be mistaken for a clean one.
        const truncated = completedRecords.filter(r => !r.ok && r.deadlineTruncated).length;
        const errors = completedRecords.filter(r => r.status === 'error').length;
        const failed = completedRecords.length - solved - errors;
        const out = {
            timestamp: new Date().toISOString(),
            commitSha: getCommitSha(),
            corpus: cfg.corpusFile,
            corpusGeneratedAt: corpus.generatedAt,
            generatorVersion: corpus.generatorVersion,
            budgetMs: cfg.budgetMs,
            workBudget: cfg.workBudget ?? null,
            witnessAccess: 'none — stressMeta stripped before prepareLevelForSolver',
            engine,
            ...(engine === 'raced' ? { engineWarning: 'worker-thread attempt racing — winningStrategy/attempt timings reflect scheduling, not sequential ladder order; use --engine=sequential for exact production numbers' } : {}),
            ...(parallel > 1 ? { parallel, parallelWarning: 'timings CPU-contended; not comparable to sequential runs' } : {}),
            ...(partial ? { partial: true } : {}),
            ...(abortReason ? { abortReason } : {}),
            solved, failed, errors, deadlineTruncated: truncated, completed: completedRecords.length, total: targetLevels.length, totalMs,
            levels: completedRecords,
        };
        mkdirSync(path.dirname(path.resolve(ROOT, outFile)), { recursive: true });
        writeFileSync(path.resolve(ROOT, outFile), JSON.stringify(out, null, 1));
        return out;
    };

    const handleAbort = signal => {
        const out = writeReport({ partial: true, abortReason: signal });
        console.log(`\n${signal}: saved partial results (${out.completed}/${targetLevels.length}) → ${outFile}`);
        racePool?.shutdown().catch(() => {});
        process.exit(signal === 'SIGTERM' ? 143 : 130);
    };
    process.once('SIGINT', handleAbort);
    process.once('SIGTERM', handleAbort);

    // Create the output file before the first long solve attempt so CI/artifact
    // upload has a partial report even if the run is killed before any level finishes.
    writeReport({ partial: true });

    if (parallel === 1) {
        for (let i = 0; i < levels.length; i++) {
            const { record, line } = await solveEntry(levels[i], solve);
            recordById.set(record.id, record);
            console.log(line);
            writeReport({ partial: true });
        }
        await racePool?.shutdown();
    } else {
        await new Promise((resolve, reject) => {
            let nextIndex = 0;
            let doneCount = 0;
            const workers = [];
            const shutdown = () => workers.forEach(w => w.terminate());
            for (let w = 0; w < parallel; w++) {
                const worker = new Worker(fileURLToPath(import.meta.url), { workerData: cfg });
                workers.push(worker);
                worker.on('error', err => { shutdown(); reject(err); });
                worker.on('message', msg => {
                    if (msg?.type !== 'result') return;
                    recordById.set(msg.record.id, msg.record);
                    console.log(msg.line);
                    doneCount++;
                    writeReport({ partial: true });
                    if (nextIndex < levels.length) {
                        worker.postMessage({ type: 'solve', index: nextIndex++ });
                    } else if (doneCount === levels.length) {
                        shutdown();
                        resolve();
                    }
                });
                if (nextIndex < levels.length) worker.postMessage({ type: 'solve', index: nextIndex++ });
                else worker.terminate();
            }
        });
    }

    process.removeListener('SIGINT', handleAbort);
    process.removeListener('SIGTERM', handleAbort);

    const out = writeReport();
    console.log(`\nDone: ${out.solved} solved, ${out.failed} failed, ${out.errors} errors / ${targetLevels.length} — ${Math.round(out.totalMs / 1000)}s`);
    if (out.deadlineTruncated > 0) {
        console.log(`  [!] ${out.deadlineTruncated} of those failures were DEADLINE-TRUNCATED with work budget remaining — indeterminate, not reproducible negatives.`);
        console.log(`      Re-run with --work-budget=<n> and a generous --budget-ms to get a host-independent result.`);
    }
    console.log(`Results → ${outFile}`);
}
