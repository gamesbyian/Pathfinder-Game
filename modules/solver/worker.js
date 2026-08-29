// Pathfinder solver Web Worker.
import { buildSolveWorkerResult } from './worker-result-serialization.mjs';
// Loaded as a module worker: new Worker(url, { type: 'module' })
//
// Inbound message types:
//   { type: 'SOLVE',     id, levelRaw, budgetMs, solveOpts? }  — solve a raw (1-indexed) level.
//                                                    solveOpts carries every other SolveOpts field
//                                                    (see orchestration.ts) the caller wants
//                                                    forwarded — ablation/nodeBudget/baseWorkBudget/workBudget/
//                                                    disableExtraBudgetPasses/lifecycleTelemetry/
//                                                    etc. timeBudgetMs and yieldFn are NOT part of
//                                                    it; they stay the dedicated budgetMs param and
//                                                    this worker's own cancellation-checking yieldFn.
//   { type: 'FALSE_GOAL_TRIGGER_SEARCH', id, level, budgetMs } — false-goal triggerability search on a NORMALIZED level
//                                                     (legacy inbound alias `TRAP` is also accepted;
//                                                      0-indexed keys; postMessage's structured
//                                                     clone carries its Sets/Maps intact, so the
//                                                     worker sees exactly what the editor sees)
//   { type: 'ENUMERATE', id, levelKey, level, gateKey, rootChildren, nodeBudget }
//                                                  — complete-mode (deterministic, unbounded by
//                                                    default) enumeration of one shard of one
//                                                    gate's search tree — see hint-enumeration.ts's
//                                                    rootChildren doc. `level` is a NORMALIZED level
//                                                    (0-indexed keys; structured clone carries its
//                                                    Sets/Maps intact, same convention as FALSE_GOAL_TRIGGER_SEARCH).
//                                                    `levelKey` caches the prepped level across
//                                                    calls with the same key (many shards of one
//                                                    "Find all" run share a level), mirroring
//                                                    scripts/solver-parallel/worker-source.mjs's
//                                                    cachedLevelKey pattern.
//   { type: 'CANCEL',    id }                       — abort an in-flight search
//
// Outbound message types:
//   { type: 'RESULT',            id, ok, status, solution, solutions, elapsedMs, nodesExpanded,
//                                attempts, deadlineTruncated?, nodeBudgetReached?, workSpent?,
//                                workBudget?, solvedByPrime?, stageLifecycle?, schedulerMode?,
//                                legacyLatencyPortfolioExperiment?, cancelled? } — see buildSolveWorkerResult's own
//                                comment (worker-result-serialization.mjs) for why this mirrors the
//                                full on-thread SolveResult shape.
//   { type: 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS', id, newTriggerableCells: number[], gatesProcessed?, gatesCompleted?, totalGates? }
//                                — streamed while the false-goal trigger search runs: newly-confirmed cell keys
//                                  (flushed at most every ~100ms) and per-gate sweep progress
//   { type: 'FALSE_GOAL_TRIGGER_SEARCH_RESULT', id, status, triggerableCells: number[],
//                                gatesProcessed, gatesCompleted, totalGates, elapsedMs, timeLimitMs }
//   { type: 'ENUMERATE_PROGRESS', id, paths: {path: number[], nodes: number, elapsedMs: number}[] }
//                                — batch of found candidates, each with the DFS's own real
//                                nodesExpanded/elapsedMs at the moment it was found (same values
//                                completeFromState's onSolution callback always provided — this
//                                worker just used to discard them before this batch was posted)
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
import { findTriggerableFalseGoalCells } from './false-goal-trigger-search.js';
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
                onSolution: (path, nodes, elapsedMs) => pending.push({ path, nodes, elapsedMs }),
                shouldStop: () => cancelledIds.has(id),
                // Real macrotask hop so a queued CANCEL is actually processed mid-search, same as FALSE_GOAL_TRIGGER_SEARCH.
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

    if (type === 'FALSE_GOAL_TRIGGER_SEARCH' || type === 'TRAP') {
        const { level, budgetMs = 30000 } = data;
        try {
            let pendingTriggerableCells = [];
            let lastFlush = 0;
            const flush = (progress = null) => {
                if (pendingTriggerableCells.length === 0 && !progress) return;
                postBack({ type: 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS', id, newTriggerableCells: pendingTriggerableCells, ...(progress || {}) });
                pendingTriggerableCells = [];
                lastFlush = Date.now();
            };
            const result = await findTriggerableFalseGoalCells(level, {
                timeLimitMs: budgetMs,
                onTriggerableCell: (k) => pendingTriggerableCells.push(k),
                onProgress: (p) => flush(p),
                // The real macrotask hop (not just a microtask) lets queued CANCEL
                // messages be processed while the search runs.
                yieldFn: async () => {
                    if (cancelledIds.has(id)) throw new Error('Solver:cancelled');
                    if (pendingTriggerableCells.length > 0 && Date.now() - lastFlush >= 100) flush();
                    await new Promise((r) => setTimeout(r, 0));
                },
            });
            cancelledIds.delete(id);
            postBack({
                type: 'FALSE_GOAL_TRIGGER_SEARCH_RESULT',
                id,
                status:         result.status,
                triggerableCells: [...result.triggerableCells],
                gatesProcessed: result.gatesProcessed,
                gatesCompleted: result.gatesCompleted,
                totalGates:     result.totalGates,
                elapsedMs:      result.elapsedMs,
                timeLimitMs:    result.timeLimitMs,
            });
        } catch (err) {
            cancelledIds.delete(id);
            postBack({ type: 'ERROR', id, message: err?.message ?? String(err) });
        }
        return;
    }

    if (type !== 'SOLVE') return;

    // solveOpts carries every other SolveOpts field the client-side adapter was asked to forward
    // (ablation, nodeBudget, baseWorkBudget/workBudget, disableExtraBudgetPasses, lifecycleTelemetry, the various
    // *BudgetFractionOverride fields, etc.) — see solver-worker-client.ts's own comment for why this
    // exists (fixed 2026-08-20: the adapter used to silently drop everything but timeBudgetMs).
    // timeBudgetMs/yieldFn are still handled via the dedicated budgetMs param and this worker's own
    // cancellation-checking yieldFn below, exactly as before — spread FIRST so neither can be
    // overridden by a stray same-named key in solveOpts.
    const { levelRaw, budgetMs = 30000, solveOpts = {} } = data;

    try {
        const level = normalizeRawLevel(levelRaw);
        const yieldFn = () => {
            if (cancelledIds.has(id)) throw new Error('Solver:cancelled');
        };
        const result = await solveLevel(level, { ...solveOpts, timeBudgetMs: budgetMs, yieldFn });
        cancelledIds.delete(id);
        postBack(buildSolveWorkerResult(id, result));
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
