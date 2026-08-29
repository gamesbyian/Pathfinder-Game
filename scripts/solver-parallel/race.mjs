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
//
// Third phase (2026-07-16): after repair+main both exhaust, a single-queue rerun of mainConfigs
// with orchestration.ts's ATTRACTION_DIVERSITY_CANDIDATE_FLAGS forced off — the raced equivalent
// of solveLevel()'s own post-repair-loop attraction-diversity pass. Deliberately run STRICTLY
// AFTER phase 1 resolves (not reserved-and-concurrent from t=0 the way repair is): repair earns a
// concurrent reserved slice because it's known to help a real, common, feature-gated population
// from the start of the search; this last-resort phase only matters for the rare case where
// EVERYTHING else already failed, so reserving workers for it up front would only ever dilute the
// common case for no benefit on levels that solve via phase 1 anyway — the same reasoning
// REPAIR_EXTRA_BUDGET_FRACTION's own additive-after-not-during budget model already uses, just
// applied to phase 1 vs. phase 2 rather than main-loop vs. repair. Reuses the SAME persistent
// worker slots (no new spawn cost) — see runOneLevel's phase-2 block below.
//
// Determinism note: this phase adds a NEW source to the racing-vs-sequential nondeterminism
// already documented for phase 1 (see stress:benchmark's own CLI warning below and the
// Determinism Report referenced in docs/solver-architecture.md) — not just WHEN a level solves,
// but sometimes WHICH mechanism gets credit. A level whose phase-1 win is itself timing-sensitive
// (some runs solve via ordinary main-loop scheduling, others need phase 2's flag-disabled rerun)
// can report a different winningStrategy/attractionDiversity flag across repeated raced runs of
// the exact identical level — confirmed directly during this session's own verification (the same
// real corpus-2 level solved via a plain main-loop attempt in one run and via this phase in
// another). Not a correctness concern (every returned path is still independently referee-valid),
// but don't treat one raced run's specific winning attempt as a stable fact about a level the way
// you could for the deterministic sequential engine.
//
// Pool lifecycle: createRacePool(opts) spins up `poolSize` node:worker_threads ONCE and keeps
// them alive across many solveLevel() calls (a whole batch run), instead of spawning/tearing
// down a fresh pool per level. Each worker's own Node runtime/V8 isolate startup is a real cost
// that used to repeat every level — measured to make racing net-slower than sequential on 13/15
// sampled levels (only the 2 genuinely-slow outliers won), because spin-up dominated on
// already-fast levels. See docs/solver-architecture.md's "Making racing the default for batch
// runs" section for the full writeup and the re-measured aggregate numbers. A worker is only
// individually replaced (never the whole pool) when it errors, or when a level's race settles
// while that worker still has a job in flight — node:worker_threads has no cooperative mid-search
// cancellation, so a loser has to be hard-killed, and a hard-killed worker can't safely take a
// new job, so a fresh one takes its place for the next level.
import { Worker } from 'node:worker_threads';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { buildSync } from 'esbuild';
import { attemptConfigKey } from '../portfolio-solve-sweep-lib.mjs';
import { withSolverStage } from '../../modules/solver/stage-policy.js';

// The policy-level stage IDs (stage-policy.ts's SOLVER_STAGE_IDS) this raced engine actually
// implements: main-loop + repair-fallback racing concurrently (phase 1), then attraction-diversity
// (phase 2). Every other stage in the full sequential ladder (repair-probe, admissible-order,
// dedup-near-tie-retry, admissible-order-non-default-retry, connectivity-axis-exhausted-retry,
// repair-elite-prefix-dfs-retry, mc-neighbor-budget-retry, repair-late-probe, repair-probe-shrink-
// recovery) is sequential-only — this file does not reimplement a different, narrower ladder for
// them, it simply does not run them at all. A raced solve is therefore NOT a complete substitute
// for the sequential engine on a level that only solves via one of the unraced tiers; callers that
// need the full ladder's coverage should fall back to solveLevel() (orchestration.ts) after a
// raced miss, the same way scripts/solver-parallel/benchmark.mjs already does. See
// modules/solver/race-stage-parity.test.ts for the shared-stage contract this file and
// orchestration.ts both honor (same eligible stage IDs, same budget-fraction constants —
// imported from orchestration.js below, never a second hardcoded copy).
export const RACE_SUPPORTED_STAGE_IDS = Object.freeze(['main-search', 'repair-fallback', 'goal-attraction-disabled-retry']);

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

/** Materialize the dispatched configuration on a worker result without maintaining separate,
 * drifting record shapes for the ordinary and attraction-diversity phases. */
export function racedAttemptRecord(job, msg, extra = {}) {
    const cfg = job?.attemptConfig;
    return withSolverStage({
        gateKey: job?.gateKey, scoringProfileId: cfg?.scoringProfileId, orderingBiasId: cfg?.orderingBias?.id ?? null,
        beamWidth: cfg?.beamWidth ?? null,
        ...(cfg?.mechanicBucketRetention ? { mechanicBucketRetention: true } : {}),
        ...(cfg?.repair ? { repair: true } : {}),
        ...(cfg?.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
        ...(cfg?.repairTurnBiased ? { repairTurnBiased: true } : {}),
        ...(cfg?.admissibleOrder ? { admissibleOrder: true } : {}),
        ...(cfg?.admissibleOrderNoTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
        ...(cfg?.admissibleOrderLds ? { admissibleOrderLds: true } : {}),
        ...extra,
        ok: msg.ok, outcome: msg.outcome ?? (msg.ok ? 'success' : 'budget-starved'),
        ...(msg.error ? { error: {
            name: msg.error.name, message: msg.error.message, gateKey: job?.gateKey,
            configKey: attemptConfigKey({
                ...cfg,
                scoringProfileId: cfg?.scoringProfileId,
                // attemptConfigKey consumes a persisted-attempt shape, where template is its ID;
                // race jobs carry the live AttemptConfig object instead.
                orderingBiasId: cfg?.orderingBias?.id ?? null,
            }),
            scoringProfileId: cfg?.scoringProfileId ?? 'unknown',
            orderingBiasId: cfg?.orderingBias?.id ?? null,
        } } : {}),
        ...(msg.allocatedBudgetMs !== undefined ? { allocatedBudgetMs: msg.allocatedBudgetMs } : {}),
        elapsedMs: msg.elapsedMs, nodesExpanded: msg.nodesExpanded ?? 0,
    }, extra.stageId ?? (cfg?.repair ? 'repair-fallback' : 'main-search'));
}

/**
 * Create a persistent worker-thread pool for racing many levels' attempt ladders across a whole
 * batch run. Spin-up (Node runtime/V8 isolate startup per worker) happens once, here — every
 * solveLevel() call afterwards reuses the same worker instances, only paying respawn cost for a
 * worker that errored or lost a race with a job still in flight (see module comment).
 *
 * @param {object} [opts]
 * @param {number} [opts.poolSize] - worker count; default availableParallelism()-1 (min 1)
 * @returns {{ solveLevel: (rawLevel: object, levelOpts?: object) => Promise<object>, shutdown: () => Promise<void> }}
 */
export function createRacePool(opts = {}) {
    const defaultPoolSize = (os.availableParallelism?.() ?? os.cpus().length) - 1;
    const poolSize = Math.max(1, opts.poolSize ?? defaultPoolSize);
    const bundlePath = ensureWorkerBundle();

    // One "slot" per pool worker. A slot's worker is replaced (not the whole pool) when it
    // errors, or when a level's race settles while that slot still has a job in flight.
    const slots = [];

    function spawnSlot(index) {
        const worker = new Worker(bundlePath);
        const slot = { worker, busy: false, broken: false };
        slot.readyPromise = new Promise((resolveReady) => {
            const onReady = (msg) => {
                if (msg?.type === 'ready') {
                    worker.off('message', onReady);
                    resolveReady();
                }
            };
            worker.on('message', onReady);
        });
        // Permanent health listener: independent of any in-flight race's own error handling
        // (attached/detached per solveLevel() call below), so a worker that dies while the pool
        // is idle between levels is still marked broken and gets respawned on next use.
        worker.on('error', () => { slot.broken = true; });
        slots[index] = slot;
        return slot;
    }

    for (let i = 0; i < poolSize; i++) spawnSlot(i);

    async function ensureSlotReady(index) {
        let slot = slots[index];
        if (slot.broken) {
            slot.worker.terminate().catch(() => {});
            slot = spawnSlot(index);
        }
        await slot.readyPromise;
        return slot;
    }

    // Hard-kill + replace a slot whose job never resolved by the time a level's race settled
    // (the losers of an early success, or stragglers still running when the overall timeout
    // fires). Runs in the background — solveLevel() doesn't wait on this, so one level's
    // stragglers never delay the NEXT level's dispatch beyond whatever slots are already idle.
    function reapSlot(index) {
        slots[index].worker.terminate().catch(() => {});
        spawnSlot(index);
    }

    let shutdownCalled = false;
    // solveLevel() calls are serialized (a pool only ever races ONE level at a time — slots are
    // shared mutable state, not safe under concurrent races). Batch callers naturally await each
    // call in a loop already; this queue just makes that a hard guarantee instead of an assumed
    // caller discipline.
    let queue = Promise.resolve();

    async function runOneLevel(rawLevel, levelOpts) {
        if (shutdownCalled) throw new Error('createRacePool: solveLevel() called after shutdown()');
        const { getConfiguredAttemptConfigs, ATTRACTION_DIVERSITY_CANDIDATE_FLAGS } = await import('../../modules/solver/attempts.js');
        const { getActiveGates, REPAIR_EXTRA_BUDGET_FRACTION, ATTRACTION_DIVERSITY_BUDGET_FRACTION } = await import('../../modules/solver/orchestration.js');
        const { createSolver } = await import('../../modules/solver.js');
        const { defaultConfig } = await import('../../modules/solver/ablation-config.js');
        const Solver = createSolver();

        const timeBudgetMs = Number(levelOpts.timeBudgetMs) > 0 ? Number(levelOpts.timeBudgetMs) : 20000;
        // Workers need a structured-cloneable plain object, so the sequential engine's Proxy
        // normalizer cannot cross this boundary. Materialize production defaults first: passing a
        // sparse `{FLAG:false}` object directly used to make every other `cfg.STRATEGY_*` read
        // undefined/falsy, silently disabling unrelated raced phases and attempt tiers.
        const ablationCfg = levelOpts.ablation == null
            ? null
            : {
                ...defaultConfig(),
                ...Object.fromEntries(Object.entries(levelOpts.ablation).filter(([, value]) => value !== undefined)),
            };
        // levelOpts.repairBudgetFractionOverride (orchestration.ts's SolveOpts field, added for
        // offline batch-tooling cost control — see docs/solver-architecture.md's cost-gotcha
        // note): read here too so a caller's --repair-budget-fraction keeps working when composed
        // with racing, not just the sequential legacy path. Absent (every existing caller of this
        // pool) preserves REPAIR_EXTRA_BUDGET_FRACTION exactly, as before.
        //
        // Deliberately NOT read from ablationCfg (a prior version of this did, mirroring
        // orchestration.ts's own prior mistake): every ablation-gated strategy toggle in
        // orchestration.ts/repair-search.ts checks `(!cfg || cfg.STRATEGY_X)`, so passing ANY
        // ablation object — even a sparse one only setting an unrelated field — silently disables
        // every OTHER unset strategy flag. Caught via a direct reproduction (S00001, a level that
        // solves in ~1s normally, failed outright once a sparse ablation object carried this
        // override) before it could taint a real batch run. See orchestration.ts's
        // repairBudgetFractionOverride field comment for the full writeup.
        const repairFractionOverride = Number(levelOpts.repairBudgetFractionOverride);
        const repairBudgetFraction = Number.isFinite(repairFractionOverride) && repairFractionOverride >= 0
            ? repairFractionOverride
            : REPAIR_EXTRA_BUDGET_FRACTION;
        const overallBudgetMs = levelOpts.overallBudgetMs ?? Math.ceil(timeBudgetMs * (repairBudgetFraction + 1));

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
            const repairState = { totalBudget: timeBudgetMs * repairBudgetFraction, gatesLeft: numGates };
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

        const levelKey = `L${startTime}_${Math.random().toString(36).slice(2)}`;
        const spawnCount = Math.min(poolSize, jobs.length);
        const slotIndices = Array.from({ length: spawnCount }, (_, i) => i);
        const readySlots = await Promise.all(slotIndices.map(ensureSlotReady));

        const phase1Result = await new Promise((resolve) => {
            const attempts = [];
            const jobById = new Map();
            let repairIdx = 0, mainIdx = 0;
            let globalJobId = 0;
            let inFlight = 0;
            let settled = false;
            let overallTimer = null;
            const listeners = new Map(); // slot index -> { onMessage, onError }

            const totalNodes = () => attempts.reduce((sum, a) => sum + (a.nodesExpanded || 0), 0);
            const queuesExhausted = () => repairIdx >= repairJobs.length && mainIdx >= mainJobs.length;

            const detachAll = () => {
                for (const [index, { onMessage, onError }] of listeners) {
                    const slot = slots[index];
                    slot.worker.off('message', onMessage);
                    slot.worker.off('error', onError);
                }
                listeners.clear();
            };

            const cleanup = () => {
                if (overallTimer) clearTimeout(overallTimer);
                detachAll();
                // A slot still marked busy here has a job that never posted a result before this
                // race settled (an early success elsewhere, or the overall timeout) — it can't be
                // handed a new job safely (no cooperative cancellation), so hard-kill + replace it
                // in the background rather than blocking this level's return on the straggler.
                for (const index of slotIndices) {
                    if (slots[index].busy) {
                        slots[index].busy = false;
                        reapSlot(index);
                    }
                }
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

            const dispatchNext = (index, preferRepair) => {
                if (settled) return;
                const slot = slots[index];
                const job = pullJob(preferRepair);
                if (!job) {
                    slot.busy = false;
                    inFlight--;
                    if (inFlight === 0 && queuesExhausted()) {
                        finish({ ok: false, status: attempts.some(a => a.outcome === 'error') ? 'attempt-error' : 'exhausted', solution: null, solutions: [], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes() });
                    }
                    return;
                }
                const budgetMs = job.repairState ? budgetForRepairJob(job) : budgetForMainJob(job.attemptConfig);
                const jobId = globalJobId++;
                jobById.set(jobId, job);
                slot.busy = true;
                slot.worker.postMessage({
                    type: 'job', jobId, levelKey, rawLevel, gateKey: job.gateKey,
                    attemptConfig: job.attemptConfig, budgetMs, ablationCfg,
                });
            };

            for (let i = 0; i < readySlots.length; i++) {
                const index = slotIndices[i];
                const slot = readySlots[i];
                const preferRepair = i < repairWorkerCount;
                inFlight++;

                const onMessage = (msg) => {
                    if (msg?.type !== 'result') return;
                    const job = jobById.get(msg.jobId);
                    attempts.push(racedAttemptRecord(job, msg));
                    slot.busy = false;
                    if (msg.ok && !settled) {
                        finish({ ok: true, status: 'success', solution: msg.path, solutions: [msg.path], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes() });
                        return;
                    }
                    dispatchNext(index, preferRepair);
                };
                const onError = () => {
                    slot.busy = false;
                    inFlight--;
                    if (inFlight <= 0 && queuesExhausted() && !settled) {
                        finish({ ok: false, status: 'error', solution: null, solutions: [], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes() });
                    }
                };
                listeners.set(index, { onMessage, onError });
                slot.worker.on('message', onMessage);
                slot.worker.on('error', onError);
                dispatchNext(index, preferRepair);
            }

            overallTimer = setTimeout(() => {
                finish({ ok: false, status: attempts.some(a => a.outcome === 'error') ? 'attempt-error' : 'timeout', solution: null, solutions: [], attempts, totalMs: Date.now() - startTime, nodesExpanded: totalNodes() });
            }, overallBudgetMs);
        });

        if (phase1Result.ok) return phase1Result;

        // Last-resort attraction-diversity phase (2026-07-16, orchestration.ts's own
        // ATTRACTION_DIVERSITY_BUDGET_FRACTION/ATTRACTION_DIVERSITY_CANDIDATE_FLAGS) — the raced
        // equivalent of solveLevel()'s post-repair-loop pass: after phase 1 (repair + main, above)
        // fails on every gate, rerun mainConfigsList once more with the candidate SCORE_* flags
        // forced off, in its own separate additive budget, sharing the SAME persistent worker
        // slots (no new spawn cost). A single queue (no repair sub-queue — attempts.ts's diversity
        // config carries no `.repair` flag), so this reuses the simpler single-queue shape of
        // phase 1's own no-repair case rather than needing a second dual-queue implementation.
        const diversityFractionOverride = Number(levelOpts.attractionDiversityBudgetFractionOverride);
        const diversityBudgetFraction = Number.isFinite(diversityFractionOverride) && diversityFractionOverride >= 0
            ? diversityFractionOverride
            : ATTRACTION_DIVERSITY_BUDGET_FRACTION;
        const diversityGateEnabled = !ablationCfg || ablationCfg.STRATEGY_ATTRACTION_DIVERSITY;
        if (diversityBudgetFraction <= 0 || !diversityGateEnabled || mainConfigsList.length === 0) {
            return phase1Result;
        }

        // Materialized as a PLAIN, fully-populated object (defaultConfig() as the base), never a
        // sparse `{ ...ablationCfg, FLAG: false }` spread — a sparse object silently reads every
        // OTHER unset STRATEGY_*/PROFILE_*/TEMPLATE_* flag as false under the `(!cfg || cfg.FLAG)`
        // convention every ablation-gated check uses (see orchestration.ts's own near-miss on this
        // exact bug, and SolveOpts's repairBudgetFractionOverride field comment). Also required
        // here for a second reason orchestration.ts's Proxy-based fix doesn't have to deal with: a
        // Proxy can't cross the worker postMessage boundary (structured clone drops functions), so
        // this has to be a plain, fully-materialized object regardless.
        const diversityAblationCfg = {
            ...defaultConfig(),
            ...(ablationCfg ?? {}),
            ...Object.fromEntries(ATTRACTION_DIVERSITY_CANDIDATE_FLAGS.map(flag => [flag, false])),
        };

        const diversityBudgetMs = timeBudgetMs * diversityBudgetFraction;
        const diversityJobs = [];
        for (const attemptConfig of mainConfigsList) {
            for (const gateKey of activeGates) diversityJobs.push({ gateKey, attemptConfig });
        }
        const diversityState = { pairsLeft: diversityJobs.length };
        const diversityWorkerCount = Math.max(1, Math.min(poolSize, diversityJobs.length));
        function budgetForDiversityJob(diversityStart) {
            const elapsed = Date.now() - diversityStart;
            const remaining = diversityBudgetMs - elapsed;
            const share = (remaining * diversityWorkerCount) / Math.max(1, diversityState.pairsLeft);
            diversityState.pairsLeft--;
            return Math.max(50, Math.floor(share));
        }

        const diversitySpawnCount = Math.min(poolSize, diversityJobs.length);
        const diversitySlotIndices = Array.from({ length: diversitySpawnCount }, (_, i) => i);
        const diversityReadySlots = await Promise.all(diversitySlotIndices.map(ensureSlotReady));
        const diversityLevelKey = `${levelKey}_diversity`;

        const phase2Result = await new Promise((resolve) => {
            const attempts = [];
            const jobById = new Map();
            let jobIdx = 0;
            let globalJobId = 0;
            let inFlight = 0;
            let settled = false;
            let overallTimer = null;
            const listeners = new Map();
            const diversityStart = Date.now();

            const totalNodes = () => attempts.reduce((sum, a) => sum + (a.nodesExpanded || 0), 0);
            const queueExhausted = () => jobIdx >= diversityJobs.length;

            const detachAll = () => {
                for (const [index, { onMessage, onError }] of listeners) {
                    const slot = slots[index];
                    slot.worker.off('message', onMessage);
                    slot.worker.off('error', onError);
                }
                listeners.clear();
            };

            const cleanup = () => {
                if (overallTimer) clearTimeout(overallTimer);
                detachAll();
                for (const index of diversitySlotIndices) {
                    if (slots[index].busy) {
                        slots[index].busy = false;
                        reapSlot(index);
                    }
                }
            };

            const finish = (result) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(result);
            };

            const dispatchNext = (index) => {
                if (settled) return;
                const slot = slots[index];
                if (jobIdx >= diversityJobs.length) {
                    slot.busy = false;
                    inFlight--;
                    if (inFlight === 0 && queueExhausted()) {
                        finish({ ok: false, status: attempts.some(a => a.outcome === 'error') ? 'attempt-error' : 'exhausted', solution: null, solutions: [], attempts, totalMs: Date.now() - diversityStart, nodesExpanded: totalNodes() });
                    }
                    return;
                }
                const job = diversityJobs[jobIdx++];
                const budgetMs = budgetForDiversityJob(diversityStart);
                const jobId = globalJobId++;
                jobById.set(jobId, job);
                slot.busy = true;
                slot.worker.postMessage({
                    type: 'job', jobId, levelKey: diversityLevelKey, rawLevel, gateKey: job.gateKey,
                    attemptConfig: job.attemptConfig, budgetMs, ablationCfg: diversityAblationCfg,
                });
            };

            for (let i = 0; i < diversityReadySlots.length; i++) {
                const index = diversitySlotIndices[i];
                const slot = diversityReadySlots[i];
                inFlight++;

                const onMessage = (msg) => {
                    if (msg?.type !== 'result') return;
                    const job = jobById.get(msg.jobId);
                    attempts.push(racedAttemptRecord(job, msg, { stageId: 'goal-attraction-disabled-retry' }));
                    slot.busy = false;
                    if (msg.ok && !settled) {
                        finish({ ok: true, status: 'success', solution: msg.path, solutions: [msg.path], attempts, totalMs: Date.now() - diversityStart, nodesExpanded: totalNodes() });
                        return;
                    }
                    dispatchNext(index);
                };
                const onError = () => {
                    slot.busy = false;
                    inFlight--;
                    if (inFlight <= 0 && queueExhausted() && !settled) {
                        finish({ ok: false, status: 'error', solution: null, solutions: [], attempts, totalMs: Date.now() - diversityStart, nodesExpanded: totalNodes() });
                    }
                };
                listeners.set(index, { onMessage, onError });
                slot.worker.on('message', onMessage);
                slot.worker.on('error', onError);
                dispatchNext(index);
            }

            overallTimer = setTimeout(() => {
                finish({ ok: false, status: attempts.some(a => a.outcome === 'error') ? 'attempt-error' : 'timeout', solution: null, solutions: [], attempts, totalMs: Date.now() - diversityStart, nodesExpanded: totalNodes() });
            }, Math.ceil(diversityBudgetMs));
        });

        const combinedAttempts = [...phase1Result.attempts, ...phase2Result.attempts];
        return {
            ...phase2Result,
            status: !phase2Result.ok && combinedAttempts.some(a => a.outcome === 'error') ? 'attempt-error' : phase2Result.status,
            attempts: combinedAttempts,
            totalMs: phase1Result.totalMs + phase2Result.totalMs,
            nodesExpanded: phase1Result.nodesExpanded + phase2Result.nodesExpanded,
        };
    }

    function solveLevel(rawLevel, levelOpts = {}) {
        const run = queue.then(() => runOneLevel(rawLevel, levelOpts));
        // Keep the chain alive even if this level's race rejects (it shouldn't — runOneLevel only
        // resolves — but a broken worker's bundle/import error would otherwise wedge every
        // subsequent solveLevel() call behind a permanently-rejected queue promise).
        queue = run.then(() => {}, () => {});
        return run;
    }

    async function shutdown() {
        shutdownCalled = true;
        await queue.catch(() => {});
        await Promise.all(slots.filter(Boolean).map(s => s.worker.terminate().catch(() => {})));
    }

    return { solveLevel, shutdown };
}

/**
 * Race a single level's policy-selected attempts across a one-shot worker pool (spun up for this
 * call, torn down before returning). Convenience wrapper over createRacePool for callers that
 * only need one level — batch callers processing many levels should use createRacePool directly
 * and share one pool across every solveLevel() call instead, which avoids paying each worker's
 * Node runtime/V8 isolate startup cost per level (see the module comment above).
 *
 * @param {object} rawLevel - wire-format level (source:'raw', same shape stress:benchmark/
 *   solver:bench pass to Solver.prepareLevelForSolver)
 * @param {object} [opts]
 * @param {number} [opts.timeBudgetMs=20000] - per main-loop-job budget (repair jobs get this * REPAIR_EXTRA_BUDGET_FRACTION)
 * @param {object|null} [opts.ablation=null] - same shape as Solver.solve's opts.ablation
 * @param {number} [opts.poolSize] - worker count; default availableParallelism()-1 (min 1)
 * @param {number} [opts.overallBudgetMs] - hard wall-clock cap for phase 1 (main+repair) only;
 *   default timeBudgetMs*(REPAIR_EXTRA_BUDGET_FRACTION+1). The attraction-diversity phase (below)
 *   runs AFTER this and has its own separate timer, so the true worst-case wall time is this plus
 *   timeBudgetMs*attractionDiversityBudgetFractionOverride (or *ATTRACTION_DIVERSITY_BUDGET_
 *   FRACTION if unset) — not folded into overallBudgetMs itself, mirroring how orchestration.ts's
 *   sequential engine also times its post-repair-loop pass separately from timeBudgetMs.
 * @param {number} [opts.repairBudgetFractionOverride] - overrides REPAIR_EXTRA_BUDGET_FRACTION for
 *   this call only; see orchestration.ts's SolveOpts field of the same name.
 * @param {number} [opts.attractionDiversityBudgetFractionOverride] - overrides
 *   ATTRACTION_DIVERSITY_BUDGET_FRACTION for this call only, independent of the repair override
 *   above; 0 disables the phase entirely. See orchestration.ts's SolveOpts field of the same name.
 * @returns {Promise<{ok: boolean, status: string, solution: number[]|null, solutions: number[][], attempts: object[], totalMs: number, nodesExpanded: number}>}
 */
export async function solveLevelRaced(rawLevel, opts = {}) {
    const pool = createRacePool(opts);
    try {
        return await pool.solveLevel(rawLevel, opts);
    } finally {
        await pool.shutdown();
    }
}
