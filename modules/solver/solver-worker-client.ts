// Client-side adapter that runs the Pathfinder solver in a Web Worker.
// Exposes a solve() method compatible with Solver.solve() plus a
// findTrapSpots() method compatible with Solver.findTrapSpots(), making it
// a drop-in swap for on-thread solving.
//
// Usage:
//   import { createSolverWorkerClient } from './modules/solver/solver-worker-client.js';
//   // Pass a constructed Worker so Vite statically bundles the worker module:
//   const client = createSolverWorkerClient(new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }));
//   const result = await client.solve(rawLevel, { timeBudgetMs: 30000, yieldFn });
//   // result: { ok, solution, elapsedMs, nodesExpanded, attempts }
//   (A URL argument is also accepted and constructed here — used by tests.)
//
// solve()'s levelRaw must be in wire format (1-indexed coords); normalization
// happens inside the worker. findTrapSpots() takes a NORMALIZED level —
// postMessage's structured clone carries its Sets/Maps intact.

interface SolveWorkerOpts { timeBudgetMs?: number; yieldFn?: () => void; }
interface TrapWorkerOpts {
    timeLimit?: number;
    onProgress?: (p: any) => void;
    shouldCancel?: () => boolean;
}
/** id → in-flight call bookkeeping. */
interface PendingCall { resolve: (msg: any) => void; reject: (err: any) => void; pollTimer: any; onProgress?: (p: any) => void; }

let _nextId = 1;

export function createSolverWorkerClient(workerOrUrl: Worker | URL | string) {
    const worker: Worker = (workerOrUrl && typeof (workerOrUrl as Worker).postMessage === 'function')
        ? (workerOrUrl as Worker)
        : new Worker(workerOrUrl as URL | string, { type: 'module' });
    const _pending = new Map<number, PendingCall>();

    worker.onmessage = ({ data }: MessageEvent) => {
        const handlers = _pending.get(data.id);
        if (!handlers) return;
        if (data.type === 'TRAP_PROGRESS') {
            if (handlers.onProgress) handlers.onProgress(data);
            return;
        }
        _pending.delete(data.id);
        if (handlers.pollTimer) clearInterval(handlers.pollTimer);
        if (data.type === 'ERROR') {
            handlers.reject(new Error(data.message));
        } else {
            handlers.resolve(data);
        }
    };

    worker.onerror = (err: any) => {
        for (const h of _pending.values()) {
            if (h.pollTimer) clearInterval(h.pollTimer);
            h.reject(err);
        }
        _pending.clear();
    };

    return {
        solve(levelRaw: any, opts: SolveWorkerOpts = {}) {
            const id = _nextId++;
            const budgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;

            return new Promise((resolve, reject) => {
                let pollTimer: any = null;

                if (typeof opts.yieldFn === 'function') {
                    // Poll the caller's yieldFn; if it throws, send CANCEL to the worker.
                    pollTimer = setInterval(() => {
                        try { opts.yieldFn!(); }
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

        // Trap-spot search on a normalized level. opts:
        //   timeLimit    — search budget in ms
        //   onProgress   — receives every TRAP_PROGRESS payload ({ newSpots, gate counters })
        //   shouldCancel — polled every 50ms; returning true sends CANCEL (the search then
        //                  resolves normally with status 'aborted' and its partial spots)
        // Resolves to the TRAP_RESULT payload with `spots` rebuilt as a Set<number>.
        findTrapSpots(level: any, opts: TrapWorkerOpts = {}) {
            const id = _nextId++;
            const budgetMs = Number(opts.timeLimit) > 0 ? Number(opts.timeLimit) : 30000;

            return new Promise((resolve, reject) => {
                let pollTimer: any = null;

                if (typeof opts.shouldCancel === 'function') {
                    pollTimer = setInterval(() => {
                        if (!opts.shouldCancel!()) return;
                        clearInterval(pollTimer);
                        pollTimer = null;
                        worker.postMessage({ type: 'CANCEL', id });
                    }, 50);
                }

                _pending.set(id, {
                    resolve: (msg: any) => resolve({ ...msg, spots: new Set(msg.spots) }),
                    reject,
                    pollTimer,
                    onProgress: opts.onProgress,
                });
                worker.postMessage({ type: 'TRAP', id, level, budgetMs });
            });
        },

        terminate() { worker.terminate(); },
    };
}
