// Client-side adapter that runs the Pathfinder solver in a Web Worker.
// Exposes solve()/findTriggerableFalseGoalCells() methods that run the same search as
// Solver.solve()/Solver.findTriggerableFalseGoalCells(), but this is NOT a drop-in swap: it
// implements only these two methods (not the full SolverApi surface), and
// its public solve() is a raw-level convenience boundary, while the worker transport itself now
// carries the same normalized level shape consumed by direct solveLevel(). A caller may keep
// passing raw wire levels here; normalization happens before postMessage, not inside the worker.
//
// Usage:
//   import { createSolverWorkerClient } from './modules/solver/solver-worker-client.js';
//   // Pass a constructed Worker so Vite statically bundles the worker module:
//   const client = createSolverWorkerClient(new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }));
//   const result = await client.solve(rawLevel, { timeBudgetMs: 30000, yieldFn });
//   // result: the full SolveResult shape (orchestration.ts) plus `type`/`id` — ok, status,
//   // solution, solutions, elapsedMs, nodesExpanded, attempts, deadlineTruncated,
//   // nodeBudgetReached, workSpent, workBudget, solvedByPrime, stageLifecycle,
//   // schedulerMode, legacyLatencyPortfolioExperiment. See worker-result-serialization.mjs's buildSolveWorkerResult.
//   (A URL argument is also accepted and constructed here — used by tests.)
//
// Input-format note: this public solve() accepts RAW wire format (1-indexed coords) for convenience.
// It validates + normalizes locally, then sends a NORMALIZED level to the worker. The worker SOLVE
// branch and direct solveLevel() therefore share one internal level contract. findTriggerableFalseGoalCells()
// likewise transports a normalized level; structured clone carries Sets/Maps intact.
//
// solve() accepts the FULL SolveOpts the direct/on-thread solver does (fixed 2026-08-20 — it used
// to silently forward only timeBudgetMs/yieldFn, dropping ablation/nodeBudget/baseWorkBudget/workBudget/
// disableExtraBudgetPasses/lifecycleTelemetry/every *BudgetFractionOverride field/etc., breaking
// the "drop-in swap" promise above for any caller relying on them). timeBudgetMs and yieldFn stay
// specially handled (a dedicated postMessage field and client-side polling, respectively) since
// neither can cross structured-clone as-is; every other option is forwarded verbatim. Function-
// valued options besides yieldFn (e.g. attemptSearchForTesting — explicitly test-only/internal per
// its own doc comment in orchestration.ts, never meant to cross a real worker boundary) are
// rejected before postMessage rather than silently stripped or left to throw a DataCloneError.

import type { SolveOpts } from './orchestration.js';
import { validateRawLevel } from '../domain/level-schema.js';
import { normalizeRawLevel } from './normalization.js';

function firstFunctionPath(value: unknown, path: string, seen = new Set<unknown>()): string | null {
    if (typeof value === 'function') return path;
    if (!value || typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
            const nested = firstFunctionPath(value[i], `${path}[${i}]`, seen);
            if (nested) return nested;
        }
        return null;
    }
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        const nested = firstFunctionPath(nestedValue, `${path}.${key}`, seen);
        if (nested) return nested;
    }
    return null;
}

/**
 * Build the serializable portion of a worker solve request.
 * timeBudgetMs has its dedicated budgetMs transport and yieldFn has its cancellation bridge.
 * Any other function anywhere in SolveOpts is direct/on-thread-only and is rejected explicitly.
 */
export function buildWorkerSolveOpts(opts: SolveOpts = {}): Record<string, unknown> {
    const solveOpts: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(opts)) {
        if (key === 'timeBudgetMs' || key === 'yieldFn') continue;
        const functionPath = firstFunctionPath(value, key);
        if (functionPath) {
            throw new Error(
                `Solver worker cannot transport function-valued SolveOpts at ${functionPath}; use direct solveLevel() for observer/test callback options`,
            );
        }
        solveOpts[key] = value;
    }
    return solveOpts;
}

interface FalseGoalTriggerWorkerOpts {
    timeLimitMs?: number;
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
        if (data.type === 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS') {
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
        solve(levelRaw: any, opts: SolveOpts = {}) {
            const validation = validateRawLevel(levelRaw);
            const solverBoundaryErrors = validation.errors.filter(error => !error.startsWith('grid must be square '));
            if (solverBoundaryErrors.length > 0) {
                throw new Error(`Solver: invalid raw level: ${solverBoundaryErrors.join('; ')}`);
            }
            const level = normalizeRawLevel(levelRaw);
            const id = _nextId++;
            const budgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
            // Build the canonical serializable option payload. Direct/on-thread-only callback
            // options fail loudly rather than being silently stripped or left for postMessage to
            // discover as a DataCloneError.
            const solveOpts = buildWorkerSolveOpts(opts);

            return new Promise((resolve, reject) => {
                let pollTimer: any = null;

                if (typeof opts.yieldFn === 'function') {
                    // Poll the caller's yieldFn; if it throws (or its returned promise rejects —
                    // SolveOpts.yieldFn is typed `() => Promise<void>`, so a real caller's yieldFn
                    // may do either), send CANCEL to the worker. The async IIFE + await is required
                    // for correctness, not just to satisfy the linter: the previous plain
                    // `try { opts.yieldFn!(); } catch {}` never actually caught anything from a
                    // genuinely async yieldFn, since an async function's internal throw becomes a
                    // rejected promise, not a synchronous exception to the caller.
                    pollTimer = setInterval(() => {
                        void (async () => {
                            try { await opts.yieldFn!(); }
                            catch (_) {
                                clearInterval(pollTimer);
                                pollTimer = null;
                                worker.postMessage({ type: 'CANCEL', id });
                            }
                        })();
                    }, 50);
                }

                _pending.set(id, { resolve, reject, pollTimer });
                worker.postMessage({ type: 'SOLVE', id, level, budgetMs, solveOpts });
            });
        },

        // False-goal triggerability search on a normalized level. opts:
        //   timeLimitMs  — search budget in ms
        //   onProgress   — receives every FALSE_GOAL_TRIGGER_SEARCH_PROGRESS payload ({ newTriggerableCells, gate counters })
        //   shouldCancel — polled every 50ms; returning true sends CANCEL (the search then
        //                  resolves normally with status 'aborted' and its partial triggerable cells)
        // Resolves to the FALSE_GOAL_TRIGGER_SEARCH_RESULT payload with `triggerableCells` rebuilt as a Set<number>.
        findTriggerableFalseGoalCells(level: any, opts: FalseGoalTriggerWorkerOpts = {}) {
            const id = _nextId++;
            const budgetMs = Number(opts.timeLimitMs) > 0 ? Number(opts.timeLimitMs) : 30000;

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
                    resolve: (msg: any) => {
                        resolve({
                            type: 'FALSE_GOAL_TRIGGER_SEARCH_RESULT',
                            id: msg.id,
                            status: msg.status,
                            triggerableCells: new Set(msg.triggerableCells ?? []),
                            gatesProcessed: msg.gatesProcessed,
                            gatesCompleted: msg.gatesCompleted,
                            totalGates: msg.totalGates,
                            elapsedMs: msg.elapsedMs,
                            timeLimitMs: msg.timeLimitMs,
                        });
                    },
                    reject,
                    pollTimer,
                    onProgress: opts.onProgress,
                });
                worker.postMessage({ type: 'FALSE_GOAL_TRIGGER_SEARCH', id, level, budgetMs });
            });
        },

        terminate() { worker.terminate(); },
    };
}

// ─── Enumeration pool: parallel "Find all" complete-mode enumeration ────────────────────────────
//
// Distinct from createSolverWorkerClient above (which wraps ONE worker for SOLVE/FALSE_GOAL_TRIGGER_SEARCH): this
// spins up a POOL of workers and races them not for first-success (that's
// scripts/solver-parallel/race.mjs's Node-only CLI job) but to ACCUMULATE every solution every
// worker finds — the shape "Find all" needs. Profiling (docs/solve-button-variety.md) found
// complete-mode enumeration is 84-92% raw DFS time on real levels, i.e. genuinely single-thread
// CPU-bound, unlike the targeted tiers where curation recompute dominates — so this pool only
// targets complete mode.
//
// Sharding: one job per (gate, root-child) pair — the root's immediate neighbors (getNeighbors on
// the gate) partition its search tree into disjoint subtrees. This is sound with NO cross-worker
// coordination needed beyond dedup against pre-existing hints: every path from one gate shares
// cell 0 (the gate) but diverges at cell 1 (the shard's own first move), so pathSignature
// (path.join(',')) can never collide across two shards of the same gate — see
// modules/solver/hint-enumeration.test.ts's "union of shards" test for the proof. PLAY validation
// and dedup happen HERE on the main thread (never in the worker), identical to
// variety-search.ts's own consider() — moving the DFS off-thread changes WHERE it runs, never how
// a candidate becomes an accepted, saved solution.
import { prepLevel } from './prep.js';
import { createState, getNeighbors } from './search-state.js';
import { getRequiredPathCoverageRatio } from './routing-regime.js';
import { validateCanonicalPath } from '../domain/path-validator.js';
import { selectDisplayHints } from '../domain/hint-selection.js';
import { pathSignature } from '../domain/path-features.js';

export type EnumeratePoolOutcome = 'exhaustive' | 'capped' | 'cancelled';
export interface EnumeratePoolResult {
    newlySaved: number[][];
    /** Aligned 1:1 with newlySaved — each worker's own real nodesExpanded/elapsedMs for that find,
     *  same as variety-search.ts's VarietySavedMeta (technique is always 'enumerate-complete-pooled'
     *  here, distinguishing pooled off-thread finds from the main-thread session's own). */
    newlySavedMeta: { nodesExpanded: number | null; elapsedMs: number | null; technique: string }[];
    shown: number[][];
    savedCount: number;
    curatedCount: number;
    outcome: EnumeratePoolOutcome;
}
export interface EnumeratePoolRunOpts {
    /** hard save cap for this run (see docs/solve-button-variety.md's "Find all" two-stage caps). */
    maxHints: number;
    /** curator-confidence cap for the final `shown` preview (not a stopping condition here). */
    target: number;
    isCancelled?: () => boolean;
    onProgress?: (e: { savedCount: number; curatedCount: number }) => void;
}

let _poolJobId = 1;

/** Create a pool of `poolSize` workers (each built by `workerFactory`, e.g.
 *  `() => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })` so Vite can
 *  statically bundle the worker module) for parallel complete-mode enumeration. */
export function createEnumerationPoolClient(workerFactory: () => Worker, poolSize: number) {
    const workers: Worker[] = Array.from({ length: Math.max(1, poolSize) }, () => workerFactory());
    let destroyed = false;

    async function runComplete(level: any, existingHints: number[][], opts: EnumeratePoolRunOpts): Promise<EnumeratePoolResult> {
        if (destroyed) throw new Error('createEnumerationPoolClient: runComplete() called after terminate()');
        const prep = prepLevel(level);
        const requiredPathCoverageRatio = getRequiredPathCoverageRatio(level);
        const mcKeys = level.mustCrossKeys;
        const levelKey = `pool_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const pool: number[][] = [...existingHints];
        const sigs = new Set(pool.map(pathSignature));
        const newlySaved: number[][] = [];
        const newlySavedMeta: { nodesExpanded: number | null; elapsedMs: number | null; technique: string }[] = [];
        let capped = false;
        let allExhausted = true;

        interface Job { gateKey: number; rootChild: number; }
        const jobs: Job[] = [];
        for (const gateKey of level.gateKeys) {
            const state = createState(gateKey, level, prep);
            for (const child of getNeighbors(gateKey, state, level, prep)) jobs.push({ gateKey, rootChild: child });
        }

        const finish = (): EnumeratePoolResult => {
            const sel = selectDisplayHints(pool.slice(), { cap: opts.target, requiredPathCoverageRatio, mustCrossKeys: mcKeys });
            const outcome: EnumeratePoolOutcome = capped ? 'capped' : (opts.isCancelled?.() ? 'cancelled' : (allExhausted ? 'exhaustive' : 'cancelled'));
            return {
                newlySaved: newlySaved.slice(), newlySavedMeta: newlySavedMeta.slice(), shown: sel.indices.map((i) => pool[i]),
                savedCount: newlySaved.length, curatedCount: sel.indices.length, outcome,
            };
        };

        if (jobs.length === 0) return finish();

        const considerBatch = (found: { path: number[]; nodes: number; elapsedMs: number }[]) => {
            for (const { path: candidate, nodes, elapsedMs } of found) {
                if (capped) break;
                if (sigs.has(pathSignature(candidate))) continue;
                const v = validateCanonicalPath(level, candidate);
                if (!v.ok) continue;
                const sig = pathSignature(v.path);
                if (sigs.has(sig)) continue;
                sigs.add(sig);
                pool.push(v.path);
                newlySaved.push(v.path);
                newlySavedMeta.push({ nodesExpanded: nodes ?? null, elapsedMs: elapsedMs ?? null, technique: 'enumerate-complete-pooled' });
                if (pool.length >= opts.maxHints) capped = true;
            }
            opts.onProgress?.({ savedCount: newlySaved.length, curatedCount: 0 });
        };

        await new Promise<void>((resolve) => {
            let nextJob = 0;
            let inFlight = 0;
            const currentJobId = new Map<Worker, number>();
            const listeners = new Map<Worker, { onMessage: (e: MessageEvent) => void; onError: () => void }>();

            const broadcastCancel = () => {
                for (const w of workers) { const id = currentJobId.get(w); if (id != null) w.postMessage({ type: 'CANCEL', id }); }
            };
            let cancelPoll: any = null;
            if (opts.isCancelled) {
                cancelPoll = setInterval(() => { if (opts.isCancelled!()) { broadcastCancel(); clearInterval(cancelPoll); cancelPoll = null; } }, 100);
            }

            const cleanup = () => {
                if (cancelPoll) { clearInterval(cancelPoll); cancelPoll = null; }
                for (const [w, l] of listeners) { w.removeEventListener('message', l.onMessage); w.removeEventListener('error', l.onError); }
                listeners.clear();
            };
            const finishIfIdle = () => { if (inFlight === 0) { cleanup(); resolve(); } };

            const dispatch = (worker: Worker) => {
                if (capped || opts.isCancelled?.()) { finishIfIdle(); return; }
                if (nextJob >= jobs.length) { finishIfIdle(); return; }
                const job = jobs[nextJob++];
                const id = _poolJobId++;
                currentJobId.set(worker, id);
                inFlight++;
                worker.postMessage({ type: 'ENUMERATE', id, levelKey, level, gateKey: job.gateKey, rootChildren: [job.rootChild] });
            };

            for (const worker of workers) {
                const onMessage = ({ data }: MessageEvent) => {
                    if (data?.type === 'ENUMERATE_PROGRESS') {
                        considerBatch(data.paths);
                        if (capped) broadcastCancel();
                        return;
                    }
                    if (data?.type === 'ENUMERATE_RESULT') {
                        if (!data.exhausted) allExhausted = false;
                        inFlight--;
                        dispatch(worker);
                    } else if (data?.type === 'ERROR') {
                        allExhausted = false;
                        inFlight--;
                        dispatch(worker);
                    }
                };
                const onError = () => { allExhausted = false; inFlight--; dispatch(worker); };
                listeners.set(worker, { onMessage, onError });
                worker.addEventListener('message', onMessage);
                worker.addEventListener('error', onError);
                dispatch(worker);
            }
        });

        return finish();
    }

    function terminate() { destroyed = true; workers.forEach((w) => w.terminate()); }

    return { runComplete, terminate };
}
