// Pathfinder solver Web Worker.
// Loaded as a module worker: new Worker(url, { type: 'module' })
//
// Inbound message types:
//   { type: 'SOLVE',  id, levelRaw, budgetMs }  — solve a raw (1-indexed) level
//   { type: 'TRAP',   id, level, budgetMs }      — trap-spot search on a NORMALIZED level
//                                                  (0-indexed keys; postMessage's structured
//                                                  clone carries its Sets/Maps intact, so the
//                                                  worker sees exactly what the editor sees)
//   { type: 'CANCEL', id }                       — abort an in-flight search
//
// Outbound message types:
//   { type: 'RESULT',        id, ok, solution, elapsedMs, nodesExpanded, attempts, cancelled? }
//   { type: 'TRAP_PROGRESS', id, newSpots: number[], gatesProcessed?, gatesCompleted?, totalGates? }
//                            — streamed while the trap search runs: newly-found spot keys
//                              (flushed at most every ~100ms) and per-gate sweep progress
//   { type: 'TRAP_RESULT',   id, ok, status, spots: number[], timedOut,
//                            gatesProcessed, gatesCompleted, totalGates, elapsedMs, timeLimit }
//   { type: 'ERROR',         id, message }
//
// The exported handleWorkerMessage() function contains all logic so it can be
// unit-tested in Node.js without a real Worker environment.

import { normalizeRawLevel } from './normalization.js';
import { solveLevel } from './orchestration.js';
import { findTrapSpots } from './trap-search.js';

// cancelledIds: Set<id> shared between the message handler and the CANCEL branch.
export async function handleWorkerMessage(data, { postBack, cancelledIds }) {
    const { type, id } = data;

    if (type === 'CANCEL') {
        cancelledIds.add(id);
        return;
    }

    if (type === 'TRAP') {
        const { level, budgetMs = 30000 } = data;
        try {
            let pendingSpots = [];
            let lastFlush = 0;
            const flush = (progress = null) => {
                if (pendingSpots.length === 0 && !progress) return;
                postBack({ type: 'TRAP_PROGRESS', id, newSpots: pendingSpots, ...(progress || {}) });
                pendingSpots = [];
                lastFlush = Date.now();
            };
            const result = await findTrapSpots(level, {
                timeLimit: budgetMs,
                onSpot: (k) => pendingSpots.push(k),
                onProgress: (p) => flush(p),
                // The real macrotask hop (not just a microtask) lets queued CANCEL
                // messages be processed while the search runs.
                yieldFn: async () => {
                    if (cancelledIds.has(id)) throw new Error('Solver:cancelled');
                    if (pendingSpots.length > 0 && Date.now() - lastFlush >= 100) flush();
                    await new Promise((r) => setTimeout(r, 0));
                },
            });
            cancelledIds.delete(id);
            postBack({
                type: 'TRAP_RESULT',
                id,
                ok:             result.ok,
                status:         result.status,
                spots:          [...result.spots],
                timedOut:       result.timedOut,
                gatesProcessed: result.gatesProcessed,
                gatesCompleted: result.gatesCompleted,
                totalGates:     result.totalGates,
                elapsedMs:      result.elapsedMs,
                timeLimit:      result.timeLimit,
            });
        } catch (err) {
            cancelledIds.delete(id);
            postBack({ type: 'ERROR', id, message: err?.message ?? String(err) });
        }
        return;
    }

    if (type !== 'SOLVE') return;

    const { levelRaw, budgetMs = 30000 } = data;

    try {
        const level = normalizeRawLevel(levelRaw);
        const yieldFn = () => {
            if (cancelledIds.has(id)) throw new Error('Solver:cancelled');
        };
        const result = await solveLevel(level, { timeBudgetMs: budgetMs, yieldFn });
        cancelledIds.delete(id);
        postBack({
            type: 'RESULT',
            id,
            ok:            result.ok,
            solution:      result.solution,
            elapsedMs:     result.totalMs,
            nodesExpanded: result.nodesExpanded,
            attempts:      result.attempts,
        });
    } catch (err) {
        cancelledIds.delete(id);
        if (err?.message === 'Solver:cancelled') {
            postBack({ type: 'RESULT', id, ok: false, solution: null, elapsedMs: 0, nodesExpanded: 0, attempts: [], cancelled: true });
        } else {
            postBack({ type: 'ERROR', id, message: err?.message ?? String(err) });
        }
    }
}

// Bootstrap: only run in an actual Worker context.
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
    const _cancelledIds = new Set();
    self.onmessage = ({ data }) => handleWorkerMessage(data, { postBack: (msg) => self.postMessage(msg), cancelledIds: _cancelledIds });
}
