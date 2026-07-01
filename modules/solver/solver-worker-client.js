// Client-side adapter that runs the Pathfinder solver in a Web Worker.
// Exposes a solve() method compatible with Solver.solve(), making it a
// drop-in swap for on-thread solving.
//
// Usage:
//   import { createSolverWorkerClient } from './modules/solver/solver-worker-client.js';
//   const workerUrl = new URL('./worker.js', import.meta.url);
//   const client = createSolverWorkerClient(workerUrl);
//   const result = await client.solve(rawLevel, { timeBudgetMs: 30000, yieldFn });
//   // result: { ok, solution, elapsedMs, nodesExpanded, attempts }
//
// The levelRaw must be in wire format (1-indexed coords); normalization
// happens inside the worker to avoid serializing Maps and Sets.

let _nextId = 1;

export function createSolverWorkerClient(workerUrl) {
    const worker = new Worker(workerUrl, { type: 'module' });
    const _pending = new Map(); // id → { resolve, reject, pollTimer }

    worker.onmessage = ({ data }) => {
        const handlers = _pending.get(data.id);
        if (!handlers) return;
        _pending.delete(data.id);
        if (handlers.pollTimer) clearInterval(handlers.pollTimer);
        if (data.type === 'ERROR') {
            handlers.reject(new Error(data.message));
        } else {
            handlers.resolve(data);
        }
    };

    worker.onerror = (err) => {
        for (const h of _pending.values()) {
            if (h.pollTimer) clearInterval(h.pollTimer);
            h.reject(err);
        }
        _pending.clear();
    };

    return {
        solve(levelRaw, opts = {}) {
            const id = _nextId++;
            const budgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;

            return new Promise((resolve, reject) => {
                let pollTimer = null;

                if (typeof opts.yieldFn === 'function') {
                    // Poll the caller's yieldFn; if it throws, send CANCEL to the worker.
                    pollTimer = setInterval(() => {
                        try { opts.yieldFn(); }
                        catch (_) {
                            clearInterval(pollTimer);
                            pollTimer = null;
                            worker.postMessage({ type: 'CANCEL', id });
                        }
                    }, 50);
                }

                _pending.set(id, { resolve, reject, pollTimer });
                worker.postMessage({ type: 'SOLVE', id, levelRaw, budgetMs });
            });
        },

        terminate() { worker.terminate(); },
    };
}
