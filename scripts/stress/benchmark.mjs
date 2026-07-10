#!/usr/bin/env node
/**
 * Stress-corpus solver benchmark.
 *
 * Runs the PRODUCTION solver over the stress corpus with the witness metadata
 * stripped (the solver never sees witnessSolution or any stressMeta), records
 * per-level runtime, node expansions, attempt ladders, winning/failed strategies,
 * and referee-validates every returned solution.
 *
 * Run via the esbuild wrapper (imports the TS solver):
 *   node scripts/run-bundled.mjs scripts/stress/benchmark.mjs
 *       [--corpus=data/stress/stress-levels.json] [--budget-ms=20000]
 *       [--out=reports/stress/benchmark-latest.json] [--levels=S001,S005|1-20]
 *       [--parallel[=N]]
 *
 * --parallel runs levels across N worker threads (default: availableParallelism-1)
 * for ITERATION SPEED ONLY. Per-level timings under parallel mode are inflated by
 * CPU contention and MUST NOT be compared against sequential runs or committed as
 * benchmark-latest.json — the output is stamped with `parallel: N` and the default
 * output path is redirected so an official report can't be overwritten by accident.
 * Solve/fail results (the solved set) are budget-dependent and can flip near the
 * budget edge under contention; treat parallel failures as "re-check sequentially".
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const ROOT = process.cwd();

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
    }
    : workerData;

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
const Solver = createSolver();

function selectLevels(levels, levelSpec) {
    if (!levelSpec) return levels;
    const wanted = new Set();
    for (const part of levelSpec.split(',')) {
        const t = part.trim();
        if (/^S\d+$/i.test(t)) { wanted.add(t.toUpperCase()); continue; }
        if (t.includes('-')) {
            const [a, b] = t.split('-').map(Number);
            for (let i = Math.min(a, b); i <= Math.max(a, b); i++) wanted.add(`S${String(i).padStart(3, '0')}`);
        } else if (Number.isFinite(Number(t))) wanted.add(`S${String(Number(t)).padStart(3, '0')}`);
    }
    return levels.filter(l => wanted.has(l.id));
}

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, cfg.corpusFile), 'utf8'));
const levels = selectLevels(corpus.levels, cfg.levelSpec);

const attemptLabel = a => `${a.profile}${a.template ? `/${a.template}` : ''}${a.beamWidth ? `@beam${a.beamWidth}` : '@dfs'}` +
    (a.diverseBeam ? '(diverse)' : '') + (a.repair ? (a.repairMustTurnBiased ? '(repair-biased)' : '(repair)') : '');

/** Solve one corpus entry and build its report record + console line. Shared verbatim by the
 *  sequential loop and the worker-pool path so both modes measure exactly the same thing. */
async function solveEntry(entry) {
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
        result = await Solver.solve(level, { timeBudgetMs: cfg.budgetMs });
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
    parentPort.on('message', async msg => {
        if (msg?.type !== 'solve') return;
        const { record, line } = await solveEntry(levels[msg.index]);
        parentPort.postMessage({ type: 'result', index: msg.index, record, line });
    });
} else {
    await main();
}

async function main() {
    const parallelArg = argMap.has('--parallel')
        ? (argMap.get('--parallel') === '' ? Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1) : Number(argMap.get('--parallel')))
        : 1;
    const parallel = Math.max(1, Math.min(parallelArg, levels.length));
    // Parallel runs must not silently replace the official (sequential) report.
    const defaultOut = parallel > 1 ? 'reports/stress/benchmark-parallel.json' : 'reports/stress/benchmark-latest.json';
    const outFile = argMap.get('--out') || defaultOut;

    console.log(`Stress benchmark: ${levels.length} levels, budget ${cfg.budgetMs}ms, corpus ${cfg.corpusFile} (v${corpus.generatorVersion})` +
        (parallel > 1 ? `, ${parallel} workers` : '') + '.');
    if (parallel > 1) {
        console.log('  !! parallel mode: timings are CPU-contended — for iteration only, not comparable to sequential runs.');
    }

    const runStart = Date.now();
    const records = new Array(levels.length);

    if (parallel === 1) {
        for (let i = 0; i < levels.length; i++) {
            const { record, line } = await solveEntry(levels[i]);
            records[i] = record;
            console.log(line);
        }
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
                    records[msg.index] = msg.record;
                    console.log(msg.line);
                    doneCount++;
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

    const totalMs = Date.now() - runStart;
    const solved = records.filter(r => r.ok).length;
    const errors = records.filter(r => r.status === 'error').length;
    const failed = records.length - solved - errors;
    console.log(`\nDone: ${solved} solved, ${failed} failed, ${errors} errors / ${levels.length} — ${Math.round(totalMs / 1000)}s`);

    const getCommitSha = () => {
        if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
        try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
    };
    const out = {
        timestamp: new Date().toISOString(),
        commitSha: getCommitSha(),
        corpus: cfg.corpusFile,
        corpusGeneratedAt: corpus.generatedAt,
        generatorVersion: corpus.generatorVersion,
        budgetMs: cfg.budgetMs,
        witnessAccess: 'none — stressMeta stripped before prepareLevelForSolver',
        ...(parallel > 1 ? { parallel, parallelWarning: 'timings CPU-contended; not comparable to sequential runs' } : {}),
        solved, failed, errors, total: levels.length, totalMs,
        levels: records,
    };
    mkdirSync(path.dirname(path.resolve(ROOT, outFile)), { recursive: true });
    writeFileSync(path.resolve(ROOT, outFile), JSON.stringify(out, null, 1));
    console.log(`Results → ${outFile}`);
}
