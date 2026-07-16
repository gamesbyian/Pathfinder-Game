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
 *       [--out=reports/stress/benchmark-latest.json] [--levels=S001,S005|1-20]
 *       [--engine=raced|sequential] [--pool-size=N] [--parallel[=N]]
 *       [--filter-mechanic=mustCross,portalPairs] [--sample=N] [--seed=<value>]
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
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createRacePool } from '../solver-parallel/race.mjs';
import { selectLevelsBySpec } from '../level-data-io.mjs';

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
        levelSpec: argMap.get('--levels') || null,
        filterMechanic: argMap.get('--filter-mechanic') || null,
        skipExistingDir: argMap.get('--skip-existing-dir') || null,
        sample: argMap.has('--sample') ? Number(argMap.get('--sample')) : null,
        seed: argMap.get('--seed') || getCommitSha(),
    }
    : workerData;

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
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

const attemptLabel = a => `${a.profile}${a.template ? `/${a.template}` : ''}${a.beamWidth ? `@beam${a.beamWidth}` : '@dfs'}` +
    (a.diverseBeam ? '(diverse)' : '') + (a.repair ? (a.repairMustTurnBiased ? '(repair-biased)' : '(repair)') : '');

/** Sequential engine: the exact single-threaded PRODUCTION solveLevel(). */
const solveSequential = (raw, level) => Solver.solve(level, { timeBudgetMs: cfg.budgetMs });

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

    const attempts = (result.attempts || []).map(a => ({
        gateKey: a.gateKey, profile: a.profile, template: a.template, beamWidth: a.beamWidth,
        ok: a.ok, elapsedMs: a.elapsedMs,
        ...(a.nodesExpanded !== undefined ? { nodesExpanded: a.nodesExpanded } : {}),
        ...(a.timedOut !== undefined ? { timedOut: a.timedOut } : {}),
        ...(a.bestBadness !== undefined ? { bestBadness: a.bestBadness } : {}),
        ...(a.finalBadness !== undefined ? { finalBadness: a.finalBadness } : {}),
        ...(a.diverseBeam ? { diverseBeam: true } : {}),
        ...(a.repair ? { repair: true } : {}),
        ...(a.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
    }));
    const winner = attempts.find(a => a.ok) || null;
    const record = {
        id, batch,
        status: result.status,
        ok,
        refereeValid,
        elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
        attemptCount: attempts.length,
        winningStrategy: winner ? attemptLabel(winner) : null,
        failedStrategies: attempts.filter(a => !a.ok).map(attemptLabel),
        attempts,
    };
    const line = `  ${id} [${batch}] ${ok ? '✓' : '✗'} ${elapsedMs}ms ${ok ? (winner ? winner.profile : '?') : result.status}` +
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
        ? (raw) => racePool.solveLevel(raw, { timeBudgetMs: cfg.budgetMs })
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
        const errors = completedRecords.filter(r => r.status === 'error').length;
        const failed = completedRecords.length - solved - errors;
        const out = {
            timestamp: new Date().toISOString(),
            commitSha: getCommitSha(),
            corpus: cfg.corpusFile,
            corpusGeneratedAt: corpus.generatedAt,
            generatorVersion: corpus.generatorVersion,
            budgetMs: cfg.budgetMs,
            witnessAccess: 'none — stressMeta stripped before prepareLevelForSolver',
            engine,
            ...(engine === 'raced' ? { engineWarning: 'worker-thread attempt racing — winningStrategy/attempt timings reflect scheduling, not sequential ladder order; use --engine=sequential for exact production numbers' } : {}),
            ...(parallel > 1 ? { parallel, parallelWarning: 'timings CPU-contended; not comparable to sequential runs' } : {}),
            ...(partial ? { partial: true } : {}),
            ...(abortReason ? { abortReason } : {}),
            solved, failed, errors, completed: completedRecords.length, total: targetLevels.length, totalMs,
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
    console.log(`Results → ${outFile}`);
}
