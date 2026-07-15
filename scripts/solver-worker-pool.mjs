/**
 * Generic child_process worker pool for offline solver batch tooling. Real OS-level parallelism
 * (child_process.fork, separate V8 isolates) — not Promise concurrency, which would only
 * interleave CPU-bound solver work on a single core. Two callers use this: portfolio-solve-sweep's
 * --workers (parallelize across levels) and repair-direct-probe's --races (parallelize across
 * seeds for one level). Node-tooling only; never imported by any browser/production code path.
 */
import { fork } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Bundles a worker entry the same way scripts/run-bundled.mjs bundles a CLI entry (local .ts
 *  source inlined, npm deps left external) — required because child_process.fork() launches the
 *  given file path directly under plain node, bypassing whatever bundling/loader ran the PARENT
 *  script. Without this, a worker that imports modules/*.ts fails with ERR_MODULE_NOT_FOUND (no
 *  loader present to resolve TypeScript at runtime in the child process). Cached per workerScript
 *  path for the lifetime of the process — one bundle serves every worker instance in the pool. */
const bundleCache = new Map();
function bundleWorkerScript(workerScript) {
    const resolved = path.resolve(repoRoot, workerScript);
    let outFile = bundleCache.get(resolved);
    if (outFile) return outFile;
    const outDir = path.join(repoRoot, '.solver-tools');
    mkdirSync(outDir, { recursive: true });
    outFile = path.join(outDir, `${path.basename(resolved).replace(/\.(mjs|cjs|ts|js)$/u, '')}.worker-bundle.mjs`);
    buildSync({
        entryPoints: [resolved], bundle: true, platform: 'node', format: 'esm', target: 'node22',
        outfile: outFile, logLevel: 'warning', packages: 'external',
    });
    bundleCache.set(resolved, outFile);
    return outFile;
}

/**
 * Runs `tasks` across a pool of `concurrency` child processes running `workerScript` (a module
 * that calls `runWorkerMain` below). Tasks are dispatched on-demand (a worker that finishes early
 * immediately gets the next task, not a fixed static partition), so uneven per-task cost doesn't
 * leave workers idle. `onResult(index, result)` fires as each result arrives, in whatever order
 * workers finish (NOT task order) — callers needing task order should index into the final
 * returned array instead. Resolves with a full `results` array, indexed by original task order.
 *
 * `stopAfter(index, result)` — optional; if it returns true, every other in-flight/pending task is
 * cancelled and the pool shuts down immediately (used for first-to-succeed racing). Untouched
 * task slots stay `undefined` in the returned array.
 */
export function runWorkerPool({ workerScript, workerArgs = [], tasks, concurrency, onResult, stopAfter }) {
    return new Promise((resolve, reject) => {
        if (tasks.length === 0) { resolve([]); return; }
        const bundledWorkerScript = bundleWorkerScript(workerScript);
        const results = new Array(tasks.length);
        let nextIndex = 0;
        let completed = 0;
        let stopped = false;
        let settled = false;
        const n = Math.max(1, Math.min(concurrency || os.cpus().length, tasks.length));
        const workers = [];

        const finish = () => {
            if (settled) return;
            settled = true;
            for (const w of workers) { try { w.kill(); } catch { /* already exited */ } }
            resolve(results);
        };
        const fail = (err) => {
            if (settled) return;
            settled = true;
            for (const w of workers) { try { w.kill(); } catch { /* already exited */ } }
            reject(err instanceof Error ? err : new Error(String(err)));
        };

        const dispatchNext = (worker) => {
            if (stopped || settled) return;
            if (nextIndex >= tasks.length) { worker.send({ type: 'shutdown' }); return; }
            const index = nextIndex++;
            worker.send({ type: 'task', index, task: tasks[index] });
        };

        for (let w = 0; w < n; w++) {
            const worker = fork(bundledWorkerScript, workerArgs, { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
            workers.push(worker);
            worker.on('message', (msg) => {
                if (settled) return;
                if (msg.type === 'ready') { dispatchNext(worker); return; }
                if (msg.type === 'result') {
                    results[msg.index] = msg.result;
                    completed += 1;
                    if (onResult) onResult(msg.index, msg.result);
                    if (stopAfter && stopAfter(msg.index, msg.result)) { stopped = true; finish(); return; }
                    if (completed === tasks.length) { finish(); return; }
                    dispatchNext(worker);
                    return;
                }
                if (msg.type === 'error') { fail(new Error(`worker task ${msg.index} failed: ${msg.error}`)); }
            });
            worker.on('error', fail);
            worker.on('exit', (code) => {
                if (settled || stopped) return;
                if (code !== 0 && completed < tasks.length) fail(new Error(`worker exited with code ${code} before finishing all dispatched tasks`));
            });
        }
    });
}

/** Worker-side harness: call once at the top of a worker script. `handler(task)` runs one task
 *  and returns its result (may be async); throwing fails the whole pool run (see runWorkerPool's
 *  'error' handling) rather than silently dropping a task. */
export function runWorkerMain(handler) {
    process.send({ type: 'ready' });
    process.on('message', async (msg) => {
        if (msg.type === 'shutdown') { process.exit(0); }
        if (msg.type !== 'task') return;
        try {
            const result = await handler(msg.task);
            process.send({ type: 'result', index: msg.index, result });
        } catch (err) {
            process.send({ type: 'error', index: msg.index, error: err?.stack || err?.message || String(err) });
        }
    });
}

export function defaultConcurrency() {
    return os.cpus().length;
}
