#!/usr/bin/env node
/**
 * Stress-corpus solver benchmark.
 *
 * Solves the stress corpus with witness metadata stripped and referee-validates returned paths.
 * This is an exploratory/iteration tool, not the production-parity regression gate.
 *
 * `--skip-existing-dir` may reuse rows only from reports carrying an exact matching
 * `benchmarkProtocol`. Legacy reports without that protocol are intentionally ignored rather than
 * guessed compatible: reusing a row changes the evidence just as surely as executing a row, so its
 * solver ref, corpus, budgets, execution engine, parallelism and additive-budget overrides must all
 * match the current run.
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
import { toRaceLevelOpts } from '../solver-parallel/race-opts.mjs';
import { selectLevelsBySpec } from '../level-data-io.mjs';
import { attemptRecord } from '../portfolio-solve-sweep-lib.mjs';
import { defaultStressMeasurementOutput } from './measurement-output-path.mjs';

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
        workBudget: argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined,
        levelSpec: argMap.get('--levels') || null,
        filterMechanic: argMap.get('--filter-mechanic') || null,
        skipExistingDir: argMap.get('--skip-existing-dir') || null,
        sample: argMap.has('--sample') ? Number(argMap.get('--sample')) : null,
        seed: argMap.get('--seed') || getCommitSha(),
        repairBudgetFraction: argMap.has('--repair-budget-fraction') ? Number(argMap.get('--repair-budget-fraction')) : undefined,
        goalAttractionDisabledRetryBudgetFraction: argMap.has('--goal-attraction-disabled-retry-budget-fraction')
            ? Number(argMap.get('--goal-attraction-disabled-retry-budget-fraction'))
            : argMap.has('--attraction-diversity-budget-fraction') ? Number(argMap.get('--attraction-diversity-budget-fraction')) : undefined,
    }
    : workerData;

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();

function filterByMechanic(levels, spec) {
    if (!spec) return levels;
    const names = spec.split(',').map(s => s.trim()).filter(Boolean);
    return levels.filter(l => names.some(name => (l.stressMeta?.mechanicCounts?.[name] ?? 0) > 0));
}

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

function protocolsEqual(a, b) {
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
    const aKeys = Object.keys(a).sort();
    const bKeys = Object.keys(b).sort();
    if (aKeys.length !== bKeys.length || aKeys.some((key, i) => key !== bKeys[i])) return false;
    return aKeys.every(key => Object.is(a[key], b[key]));
}

function loadExistingRecords(logDir, benchmarkProtocol) {
    const records = new Map();
    if (!logDir) return records;
    const absDir = path.resolve(ROOT, logDir);
    if (!existsSync(absDir)) return records;
    let ignoredIncompatible = 0;
    for (const name of readdirSync(absDir)) {
        if (!name.endsWith('.json')) continue;
        let parsed;
        try { parsed = JSON.parse(readFileSync(path.join(absDir, name), 'utf8')); }
        catch { continue; }
        if (!Array.isArray(parsed?.levels)) continue;
        if (!protocolsEqual(parsed.benchmarkProtocol, benchmarkProtocol)) {
            ignoredIncompatible++;
            continue;
        }
        for (const record of parsed.levels) {
            if (typeof record?.id === 'string' && !records.has(record.id)) records.set(record.id, record);
        }
    }
    if (ignoredIncompatible > 0) {
        console.log(`  skip-existing: ignored ${ignoredIncompatible} report(s) without an exact benchmarkProtocol match.`);
    }
    return records;
}

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, cfg.corpusFile), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
let levels = sampleDeterministic(filterByMechanic(selectLevelsBySpec(corpusLevels, cfg.levelSpec), cfg.filterMechanic), cfg.sample, cfg.seed);

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

const solveSequential = (raw, level) => Solver.solveLevel(level, {
    timeBudgetMs: cfg.budgetMs,
    ...(cfg.workBudget !== undefined ? { workBudget: cfg.workBudget } : {}),
    ...(Number.isFinite(cfg.repairBudgetFraction) ? { repairAdditiveBudgetMultiplierOverride: cfg.repairBudgetFraction } : {}),
    ...(Number.isFinite(cfg.goalAttractionDisabledRetryBudgetFraction) ? { goalAttractionDisabledRetryBudgetFractionOverride: cfg.goalAttractionDisabledRetryBudgetFraction } : {}),
});

async function solveEntry(entry, solve) {
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

    let refereeValid = null;
    if (ok && Array.isArray(result.solution)) {
        const check = Solver.validateCandidatePath(level, result.solution);
        refereeValid = check.ok;
    }

    const attempts = (result.attempts || []).map(attemptRecord);
    const winner = attempts.find(a => a.ok) || null;
    const record = {
        id, batch,
        status: result.status,
        ok,
        refereeValid,
        elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
        workSpent: result.workSpent ?? null,
        // A wall-deadline truncation while deterministic work remains is indeterminate. It is
        // persisted separately and deliberately excluded from the aggregate `failed` count below.
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

if (!isMainThread) {
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
    const parallelArg = argMap.has('--parallel')
        ? (argMap.get('--parallel') === '' ? Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1) : Number(argMap.get('--parallel')))
        : 1;
    // Resolve execution mode from the original target population, before resume filtering. This
    // keeps resumed rows and newly executed rows under the same protocol even when only one row
    // remains to run.
    const parallel = Math.max(1, Math.min(parallelArg, targetLevels.length));
    const requestedEngine = argMap.get('--engine') || 'raced';
    const engine = parallel > 1 ? 'sequential' : requestedEngine;
    const poolSizeArg = argMap.get('--pool-size') ? Number(argMap.get('--pool-size')) : undefined;
    const resolvedRacePoolSize = engine === 'raced'
        ? Math.max(1, poolSizeArg ?? ((os.availableParallelism?.() ?? os.cpus().length) - 1))
        : null;
    const commitSha = getCommitSha();
    const benchmarkProtocol = Object.freeze({
        schemaVersion: 1,
        commitSha,
        corpus: cfg.corpusFile,
        corpusGeneratedAt: corpus.generatedAt ?? null,
        generatorVersion: corpus.generatorVersion ?? null,
        budgetMs: cfg.budgetMs,
        workBudget: cfg.workBudget ?? null,
        engine,
        parallel,
        racePoolSize: resolvedRacePoolSize,
        repairBudgetFraction: Number.isFinite(cfg.repairBudgetFraction) ? cfg.repairBudgetFraction : null,
        goalAttractionDisabledRetryBudgetFraction: Number.isFinite(cfg.goalAttractionDisabledRetryBudgetFraction)
            ? cfg.goalAttractionDisabledRetryBudgetFraction
            : null,
    });

    const recordById = loadExistingRecords(cfg.skipExistingDir, benchmarkProtocol);
    levels = cfg.skipExistingDir ? targetLevels.filter(level => !recordById.has(level.id)) : targetLevels;
    cfg.levelSpec = levels.map(level => level.id).join(',');

    const defaultOut = defaultStressMeasurementOutput(cfg.corpusFile, parallel > 1);
    const outFile = argMap.get('--out') || defaultOut;

    const racePool = engine === 'raced' ? createRacePool({ poolSize: resolvedRacePoolSize }) : null;
    const raceLevelOpts = racePool
        ? (() => {
            try {
                return toRaceLevelOpts({
                    timeBudgetMs: cfg.budgetMs,
                    workBudget: cfg.workBudget,
                    repairAdditiveBudgetMultiplierOverride: cfg.repairBudgetFraction,
                    goalAttractionDisabledRetryBudgetFractionOverride: cfg.goalAttractionDisabledRetryBudgetFraction,
                });
            } catch (err) {
                console.error(err.message);
                process.exit(2);
            }
        })()
        : null;
    const solve = racePool
        ? (raw) => racePool.solveLevel(raw, raceLevelOpts)
        : solveSequential;

    console.log(`Stress benchmark: ${levels.length} level(s) to solve, budget ${cfg.budgetMs}ms, corpus ${cfg.corpusFile} (v${corpus.generatorVersion}), engine ${engine}` +
        (cfg.skipExistingDir ? `; ${targetLevels.length - levels.length}/${targetLevels.length} target result(s) safely reused from ${cfg.skipExistingDir}` : '') +
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
        const truncated = completedRecords.filter(r => !r.ok && r.deadlineTruncated).length;
        const errors = completedRecords.filter(r => r.status === 'error').length;
        const failed = completedRecords.length - solved - errors - truncated;
        const out = {
            timestamp: new Date().toISOString(),
            commitSha,
            corpus: cfg.corpusFile,
            corpusGeneratedAt: corpus.generatedAt,
            generatorVersion: corpus.generatorVersion,
            budgetMs: cfg.budgetMs,
            workBudget: cfg.workBudget ?? null,
            repairBudgetFraction: benchmarkProtocol.repairBudgetFraction,
            goalAttractionDisabledRetryBudgetFraction: benchmarkProtocol.goalAttractionDisabledRetryBudgetFraction,
            benchmarkProtocol,
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
    console.log(`\nDone: ${out.solved} solved, ${out.failed} failed, ${out.errors} errors, ${out.deadlineTruncated} indeterminate deadline-truncated / ${targetLevels.length} — ${Math.round(out.totalMs / 1000)}s`);
    if (out.deadlineTruncated > 0) {
        console.log(`  [!] ${out.deadlineTruncated} row(s) were DEADLINE-TRUNCATED with work budget remaining — indeterminate, not reproducible negatives.`);
        console.log('      Re-run with --work-budget=<n> and a generous --budget-ms to get a host-independent result.');
    }
    console.log(`Results → ${outFile}`);
}
