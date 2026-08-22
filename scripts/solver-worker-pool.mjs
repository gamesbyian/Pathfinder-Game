// Generic child-process pool for offline solver tooling. Uses separate V8 isolates for real CPU
// parallelism; tasks are dynamically scheduled so fast workers immediately take more work.
import { fork } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Bundle a worker entry for plain-node fork(); cached by workerScript for this process. */
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

/** Run tasks dynamically across child workers. Results are indexed by original task order;
 * `onResult` fires in completion order. `stopAfter` may cancel the remaining pool early. */
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

/** Worker-side IPC harness. Handler errors fail the pool; optional shutdown cleanup is awaited. */
export function runWorkerMain(handler, onShutdown = null) {
    process.send({ type: 'ready' });
    process.on('message', async (msg) => {
        if (msg.type === 'shutdown') {
            if (onShutdown) { try { await onShutdown(); } catch { /* exiting regardless */ } }
            process.exit(0);
        }
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
