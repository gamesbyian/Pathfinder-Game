// Pathfinder solver Web Worker.
// Loaded as a module worker: new Worker(url, { type: 'module' })
//
// Inbound message types:
//   { type: 'SOLVE',     id, levelRaw, budgetMs }  — solve a raw (1-indexed) level
//   { type: 'TRAP',      id, level, budgetMs }      — trap-spot search on a NORMALIZED level
//                                                     (0-indexed keys; postMessage's structured
//                                                     clone carries its Sets/Maps intact, so the
//                                                     worker sees exactly what the editor sees)
//   { type: 'ENUMERATE', id, levelKey, level, gateKey, rootChildren, nodeBudget }
//                                                  — complete-mode (deterministic, unbounded by
//                                                    default) enumeration of one shard of one
//                                                    gate's search tree — see hint-enumeration.ts's
//                                                    rootChildren doc. `level` is a NORMALIZED level
//                                                    (0-indexed keys; structured clone carries its
//                                                    Sets/Maps intact, same convention as TRAP).
//                                                    `levelKey` caches the prepped level across
//                                                    calls with the same key (many shards of one
//                                                    "Find all" run share a level), mirroring
//                                                    scripts/solver-parallel/worker-source.mjs's
//                                                    cachedLevelKey pattern.
//   { type: 'CANCEL',    id }                       — abort an in-flight search
//
// Outbound message types:
//   { type: 'RESULT',            id, ok, solution, elapsedMs, nodesExpanded, attempts, cancelled? }
//   { type: 'TRAP_PROGRESS',     id, newSpots: number[], gatesProcessed?, gatesCompleted?, totalGates? }
//                                — streamed while the trap search runs: newly-found spot keys
//                                  (flushed at most every ~100ms) and per-gate sweep progress
//   { type: 'TRAP_RESULT',       id, ok, status, spots: number[], timedOut,
//                                gatesProcessed, gatesCompleted, totalGates, elapsedMs, timeLimit }
//   { type: 'ENUMERATE_PROGRESS', id, paths: number[][] }  — batch of found candidate paths
//                                (flushed at most every ~100ms; NOT yet PLAY-validated/deduped —
//                                the caller does that, identical to the single-thread session's own
//                                consider(), so off-thread enumeration changes WHERE the DFS runs,
//                                never how a candidate gets accepted)
//   { type: 'ENUMERATE_RESULT',   id, exhausted, nodes }
//   { type: 'ERROR',              id, message }
//
// The exported handleWorkerMessage() function contains all logic so it can be
// unit-tested in Node.js without a real Worker environment.

import { normalizeRawLevel } from './normalization.js';
import { solveLevel } from './orchestration.js';
import { findTrapSpots } from './trap-search.js';
import { prepLevel } from './prep.js';
import { enumerateFromGate } from './hint-enumeration.js';

// Cache the last-seen ENUMERATE level's prep, keyed by the caller-supplied levelKey — many shard
// jobs for the SAME "Find all" run share this worker's lifetime, so repeat BFS precomputation is
// avoided the same way worker-source.mjs's per-job solveLevelRaced jobs already do. A size-1
// cache with a simple equality check, not a state-keyed correctness-sensitive one (see CLAUDE.md's
// memoization gotcha for why that distinction matters).
let cachedLevelKey = null, cachedPrep = null;
function getEnumeratePrep(levelKey, level) {
    if (cachedLevelKey !== levelKey) {
        cachedPrep = prepLevel(level);
        cachedLevelKey = levelKey;
    }
    return cachedPrep;
}

// cancelledIds: Set<id> shared between the message handler and the CANCEL branch.
export async function handleWorkerMessage(data, { postBack, cancelledIds }) {
    const { type, id } = data;

    if (type === 'CANCEL') {
        cancelledIds.add(id);
        return;
    }

    if (type === 'ENUMERATE') {
        const { levelKey, level, gateKey, rootChildren, nodeBudget = Infinity } = data;
        try {
            const prep = getEnumeratePrep(levelKey, level);
            let pending = [];
            let lastFlush = 0;
            const flush = () => {
                if (pending.length === 0) return;
                postBack({ type: 'ENUMERATE_PROGRESS', id, paths: pending });
                pending = [];
                lastFlush = Date.now();
            };
            const result = await enumerateFromGate(level, prep, gateKey, {
                rng: null, // deterministic — required for a shard's `exhausted` to mean "this subtree, fully drained"
                nodeBudget,
                rootChildren,
                onSolution: (path) => pending.push(path),
                shouldStop: () => cancelledIds.has(id),
                // Real macrotask hop so a queued CANCEL is actually processed mid-search, same as TRAP.
                yieldFn: async () => {
                    if (pending.length > 0 && Date.now() - lastFlush >= 100) flush();
                    await new Promise((r) => setTimeout(r, 0));
                },
            });
            flush();
            cancelledIds.delete(id);
            postBack({ type: 'ENUMERATE_RESULT', id, exhausted: result.exhausted, nodes: result.nodes });
        } catch (err) {
            cancelledIds.delete(id);
            postBack({ type: 'ERROR', id, message: err?.message ?? String(err) });
        }
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
