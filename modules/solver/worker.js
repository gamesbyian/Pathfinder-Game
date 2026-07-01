// Pathfinder solver Web Worker.
// Loaded as a module worker: new Worker(url, { type: 'module' })
//
// Inbound message types:
//   { type: 'SOLVE',  id, levelRaw, budgetMs }  — solve a raw (1-indexed) level
//   { type: 'CANCEL', id }                       — abort an in-flight solve
//
// Outbound message types:
//   { type: 'RESULT', id, ok, solution, elapsedMs, nodesExpanded, attempts, cancelled? }
//   { type: 'ERROR',  id, message }
//
// The exported handleWorkerMessage() function contains all logic so it can be
// unit-tested in Node.js without a real Worker environment.

import { normalizeRawLevel } from './normalization.js';
import { solveLevel } from './orchestration.js';

// cancelledIds: Set<id> shared between the message handler and the CANCEL branch.
export async function handleWorkerMessage(data, { postBack, cancelledIds }) {
    const { type, id } = data;

    if (type === 'CANCEL') {
        cancelledIds.add(id);
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
