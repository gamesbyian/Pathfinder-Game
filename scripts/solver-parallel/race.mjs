// Races the SAME policy-selected attempts (getConfiguredAttemptConfigs/getActiveGates — the
// identical attempt ladder the sequential solveLevel() uses) across a pool of worker threads
// instead of running them one at a time. First success wins; every other in-flight worker is
// terminated. This is purely a scheduling change: it does not add, remove, or reorder which
// attempts the policy selects, only WHEN they run relative to each other.
//
// Node-only (node:worker_threads) — deliberately lives under scripts/, never imported by
// modules/solver/*.ts (which is also bundled for the browser via Vite), so this carries zero
// risk to the production single-threaded path. See docs/solver-architecture.md for the
// production/CLI split rationale.
//
// Budget model: mirrors orchestration.ts's own budget-SHARING model (runInterleavedAttempts's
// pairShare, and the repair loop's repairBudget) rather than giving every job its own full
// timeBudgetMs. Sequential deliberately shares ONE window across every (config, gate) pair so
// trying many configs quickly isn't crowded out by one combo consuming the whole budget — an
// earlier version of this file gave every job a full, undivided budget on the theory that true
// concurrency removes the need to share a timeslice; that reasoning was backwards. Concurrency
// lets the SAME total budget mass run on separate cores instead of serially — it does not
// entitle every job to its own full-length copy of the budget. Giving every job a full budget
// inflates total provisioned work by a factor of configs×gates, which on a 4-gate level (S118 —
// the exact level orchestration.ts's ADAPTIVE_GATE_THRESHOLD comment documents as the original
// dilution-discovery level) blew through the overall wall-clock cap before the config ladder
// ever reached the combo that actually solves it. Per-job budgets here:
//   - main-loop (DFS/beam) jobs: timeBudgetMs shared across (mainConfigs × activeGates) pairs,
//     honoring each config's minBudgetFraction floor exactly as runInterleavedAttempts does
//     (just evaluated once, at round 0/elapsed-0, rather than adaptively re-weighted per round —
//     racing doesn't have "rounds" the same way, since jobs run to completion independently)
//   - repair jobs: (timeBudgetMs * REPAIR_EXTRA_BUDGET_FRACTION) shared across activeGates only
//     (mirrors the repair loop's own repairBudget split — repair configs are NOT divided against
//     each other, only within one config across gates, same as sequential)
// Scheduling: two independent queues (repair, main), each in the same priority order the policy
// already produces, with a bounded slice of the worker pool reserved for repair so it runs
// CONCURRENTLY with the main-loop ladder instead of strictly after — see the long comment below
// for why a single combined priority-ordered queue (repair sorted last, as the policy naturally
// produces it) measurably regressed levels where repair is fast.
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { buildSync } from 'esbuild';

// process.cwd(), not import.meta.url-relative math: this module is usually loaded as a
// dependency of some OTHER entry that scripts/run-bundled.mjs esbuild-bundles, which flattens
// everything into one output file under .solver-tools/ — import.meta.url would then resolve to
// that bundle's location, not this source file's, making path math unreliable. process.cwd()
// matches the convention every other CLI entry in this repo already uses (benchmark.mjs,
// run-ablation.mjs, ...), and assumes invocation from the repo root, same as those.
const ROOT = process.cwd();
const WORKER_SOURCE = path.resolve(ROOT, 'scripts/solver-parallel/worker-source.mjs');
const WORKER_BUNDLE = path.join(ROOT, '.solver-tools', 'solver-parallel-worker.bundle.mjs');

let workerBundleReady = false;
function ensureWorkerBundle() {
    if (workerBundleReady) return WORKER_BUNDLE;
    mkdirSync(path.dirname(WORKER_BUNDLE), { recursive: true });
    buildSync({
        entryPoints: [WORKER_SOURCE],
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: 'node22',
        outfile: WORKER_BUNDLE,
        logLevel: 'warning',
        packages: 'external',
    });
    workerBundleReady = true;
    return WORKER_BUNDLE;
}

/**
 * Race a level's policy-selected attempts across a worker pool.
 *
 * @param {object} rawLevel - wire-format level (source:'raw', same shape stress:benchmark/
 *   solver:bench pass to Solver.prepareLevelForSolver)
 * @param {object} [opts]
 * @param {number} [opts.timeBudgetMs=20000] - per main-loop-job budget (repair jobs get this * REPAIR_EXTRA_BUDGET_FRACTION)
 * @param {object|null} [opts.ablation=null] - same shape as Solver.solve's opts.ablation
 * @param {number} [opts.poolSize] - worker count; default availableParallelism()-1 (min 1)
 * @param {number} [opts.overallBudgetMs] - hard wall-clock cap; default timeBudgetMs*(REPAIR_EXTRA_BUDGET_FRACTION+1)
 * @returns {Promise<{ok: boolean, status: string, solution: number[]|null, solutions: number[][], attempts: object[], totalMs: number, nodesExpanded: number}>}
 */
export async function solveLevelRaced(rawLevel, opts = {}) {
    const { getConfiguredAttemptConfigs } = await import('../../modules/solver/attempts.js');
    const { getActiveGates, REPAIR_EXTRA_BUDGET_FRACTION } = await import('../../modules/solver/orchestration.js');
    const { createSolver } = await import('../../modules/Solver.js');
    const Solver = createSolver();

    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 20000;
    const ablationCfg = opts.ablation ?? null;
    const defaultPoolSize = (os.availableParallelism?.() ?? os.cpus().length) - 1;
    const poolSize = Math.max(1, opts.poolSize ?? defaultPoolSize);
    const overallBudgetMs = opts.overallBudgetMs ?? Math.ceil(timeBudgetMs * (REPAIR_EXTRA_BUDGET_FRACTION + 1));

    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const baseConfigs = getConfiguredAttemptConfigs(level, ablationCfg);
    const gateKeys = Array.isArray(level.gateKeys) ? level.gateKeys : [];
    const activeGates = getActiveGates(level, gateKeys, ablationCfg);

    // Two independent queues, not one priority-ordered list. Sequential solveLevel() runs
    // repair strictly LAST (see orchestration.ts's REPAIR_EXTRA_BUDGET_FRACTION comment) so it
    // never dilutes the main loop's shared time budget — a real concern on a single thread, but
    // not one that exists here (concurrent jobs run on separate cores, not separate timeslices).
    // A first version of this file kept repair jobs in strict priority order anyway (they sort
    // last in getConfiguredAttemptConfigs's own output) and measured a real regression: on
    // levels where a repair attempt is fast (a few seconds), it still had to wait in the FIFO
    // queue behind every main-loop config ahead of it, because repair jobs don't fail fast the
    // way DFS/beam do (no natural "exhausted" signal — an iterated-local-search that's going to
    // fail burns its FULL budget before giving up) — so reordering repair to the FRONT of one
    // shared queue would risk the opposite problem, starving the main loop's worker slots on the
    // (much more common) levels where repair never had a chance to begin with.
    // Fix: reserve a small, bounded slice of the pool exclusively for repair jobs — run
    // concurrently with (not before or after) the main-loop ladder — so repair gets a genuine
    // head start without starving the common case. A worker whose OWN queue empties pulls from
    // the other queue instead of idling, so no worker sits unused while jobs remain.
    const numGates = Math.max(1, activeGates.length);
    const repairConfigsList = baseConfigs.filter(c => c.repair);
    const mainConfigsList = baseConfigs.filter(c => !c.repair);
    const mainPairCount = Math.max(1, mainConfigsList.length * numGates);

    // Repair jobs are grouped per repair config, each sharing its OWN full repair budget across
    // its gates (dynamically reallocated as gates are dispatched, see budgetForRepairJob below) —
    // mirrors orchestration.ts's repair loop, where a 2nd repair config (must-turn-biased) only
    // ever runs after the 1st fully fails, with its own fresh repairTotalBudget. Concurrently
    // here, both configs' gate shares are computed independently of each other; they just happen
    // to execute at the same time instead of strictly one after the other.
    const repairJobs = [];
    for (const attemptConfig of repairConfigsList) {
        const repairState = { totalBudget: timeBudgetMs * REPAIR_EXTRA_BUDGET_FRACTION, gatesLeft: numGates };
        for (const gateKey of activeGates) repairJobs.push({ gateKey, attemptConfig, repairState });
    }

    // Main-loop jobs share ONE (config × gate) pair pool, dynamically reallocated exactly like
    // runInterleavedAttempts's pairShare (see budgetForMainJob below) — pairsLeft shrinks and
    // remaining time is recomputed at EACH dispatch, so slack from jobs that finish (fail) early
    // flows to jobs dispatched later, not just split evenly up front. A flat up-front split
    // under-provisioned every job past the first and measurably regressed S118 (a 4-gate level)
    // — see the budget-model comment at the top of this file.
    const mainState = { pairsLeft: mainPairCount };
    const mainJobs = [];
    for (const attemptConfig of mainConfigsList) {
        for (const gateKey of activeGates) mainJobs.push({ gateKey, attemptConfig });
    }
    const jobs = [...repairJobs, ...mainJobs];

    const startTime = Date.now();
    if (jobs.length === 0) {
        return { ok: false, status: 'no-attempts', solution: null, solutions: [], attempts: [], totalMs: 0, nodesExpanded: 0 };
    }

    // Reserve up to poolSize-1 workers for repair (never all of them, never more than exist) —
    // only when there's at least one repair job AND at least 2 workers to split between the two
    // queues; otherwise every worker pulls from a single combined (main-first) queue, matching
    // the simpler single-worker/no-repair case.
    const repairWorkerCount = (repairJobs.length > 0 && poolSize >= 2)
        ? Math.min(repairJobs.length, poolSize - 1)
        : 0;
    const mainWorkerCount = Math.max(1, poolSize - repairWorkerCount);

    // pairShare/share below are each multiplied by their queue's own worker count. Sequential's
    // pairShare (remaining/pairsLeft) sizes a job's budget assuming ONE thread processes pairsLeft
    // jobs one at a time — under true concurrency, mainWorkerCount jobs run at once, so pairsLeft
    // jobs only need ceil(pairsLeft/mainWorkerCount) sequential "waves" to all be tried, not
    // pairsLeft of them. Multiplying by mainWorkerCount gives each job a share sized for that
    // shorter wave count instead of the single-thread count — worst case (every job burns its
    // full share) still finishes within timeBudgetMs, but a job that actually needs more than a
    // single-thread-equivalent sliver to succeed (observed on S118: a config solvable in under a
    // second given a real share, but starved into "exhausted" by a razor-thin 1/(configs×gates)
    // slice) gets enough room to actually complete the search that would have solved it.
    function budgetForMainJob(attemptConfig) {
        const elapsed = Date.now() - startTime;
        const remaining = timeBudgetMs - elapsed;
        const pairShare = (remaining * mainWorkerCount) / Math.max(1, mainState.pairsLeft);
        mainState.pairsLeft--;
        const minFrac = attemptConfig.minBudgetFraction ?? 0;
        const budget = minFrac > 0 ? Math.max(remaining / numGates * minFrac, pairShare) : pairShare;
        return Math.max(50, Math.floor(budget));
    }

    // repairState.gatesLeft/totalBudget are per-repair-config (see repairJobs above); elapsed is
    // measured from the shared race startTime rather than a repair-specific clock — sequential
    // starts a fresh clock when its (strictly serial) repair loop begins, but reserved repair
    // workers here start pulling from the repair queue within milliseconds of the race starting,
    // so the race clock is a close enough proxy without extra per-config clock bookkeeping.
    // Multiplied by repairWorkerCount for the same reason budgetForMainJob multiplies by
    // mainWorkerCount — repairWorkerCount reserved workers process gatesLeft jobs concurrently,
    // not one at a time.
    function budgetForRepairJob(job) {
        const state = job.repairState;
        const elapsed = Date.now() - startTime;
        const remaining = state.totalBudget - elapsed;
        const share = (remaining * Math.max(1, repairWorkerCount)) / Math.max(1, state.gatesLeft);
        state.gatesLeft--;
        return Math.max(50, Math.floor(share));
    }

    const bundlePath = ensureWorkerBundle();
    const levelKey = `L${startTime}_${Math.random().toString(36).slice(2)}`;

    return new Promise((resolve) => {
        const workers = [];
        const attempts = [];
        const jobById = new Map();
        let repairIdx = 0, mainIdx = 0;
        let globalJobId = 0;
        let inFlight = 0;
        let settled = false;
        let overallTimer = null;

        const totalNodes = () => attempts.reduce((sum, a) => sum + (a.nodesExpanded || 0), 0);
        const queuesExhausted = () => repairIdx >= repairJobs.length && mainIdx >= mainJobs.length;

        const cleanup = () => {
            if (overallTimer) clearTimeout(overallTimer);
            for (const w of workers) w.terminate().catch(() => {});
        };

        const finish = (result) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve(result);
        };

        // preferRepair: this worker's home queue — tried first, falls back to the other queue
        // if its home queue is empty, so no worker ever idles while jobs remain elsewhere.
        const pullJob = (preferRepair) => {
            if (preferRepair) {
                if (repairIdx < repairJobs.length) return repairJobs[repairIdx++];
                if (mainIdx < mainJobs.length) return mainJobs[mainIdx++];
            } else {
                if (mainIdx < mainJobs.length) return mainJobs[mainIdx++];
                if (repairIdx < repairJobs.length) return repairJobs[repairIdx++];
            }
            return null;
        };

        const dispatchNext = (worker, preferRepair) => {
            if (settled) return;
            const job = pullJob(preferRepair);
            if (!job) {
                inFlight--;
                if (inFlight === 0 && queuesExhausted()) {
                    finish({ ok: false, status: 'exhausted', solution: null, solutions: [], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes() });
                }
                return;
            }
            const budgetMs = job.repairState ? budgetForRepairJob(job) : budgetForMainJob(job.attemptConfig);
            const jobId = globalJobId++;
            jobById.set(jobId, job);
            worker.postMessage({
                type: 'job', jobId, levelKey, rawLevel, gateKey: job.gateKey,
                attemptConfig: job.attemptConfig, budgetMs, ablationCfg,
            });
        };

        const spawnCount = Math.min(poolSize, jobs.length);
        for (let i = 0; i < spawnCount; i++) {
            const worker = new Worker(bundlePath);
            const preferRepair = i < repairWorkerCount;
            workers.push(worker);
            inFlight++;
            worker.on('message', (msg) => {
                if (msg?.type === 'ready') { dispatchNext(worker, preferRepair); return; }
                if (msg?.type !== 'result') return;
                const job = jobById.get(msg.jobId);
                const cfg = job?.attemptConfig;
                attempts.push({
                    gateKey: job?.gateKey, profile: cfg?.profileName, template: cfg?.template?.id ?? null,
                    beamWidth: cfg?.beamWidth ?? null,
                    ...(cfg?.diverseBeam ? { diverseBeam: true } : {}),
                    ...(cfg?.repair ? { repair: true } : {}),
                    ...(cfg?.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
                    ok: msg.ok, elapsedMs: msg.elapsedMs, nodesExpanded: msg.nodesExpanded ?? 0,
                });
                if (msg.ok && !settled) {
                    finish({ ok: true, status: 'success', solution: msg.path, solutions: [msg.path], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes() });
                    return;
                }
                dispatchNext(worker, preferRepair);
            });
            worker.on('error', (err) => {
                inFlight--;
                if (inFlight <= 0 && queuesExhausted() && !settled) {
                    finish({ ok: false, status: 'error', solution: null, solutions: [], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes(), error: err?.message });
                }
            });
        }

        overallTimer = setTimeout(() => {
            finish({ ok: false, status: 'timeout', solution: null, solutions: [], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes() });
        }, overallBudgetMs);
    });
}
