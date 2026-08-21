// Persistent solver worker: installs browser stubs once, then processes "job" messages — one
// job = one (gate, attemptConfig) pair run to completion or its own budget. Reused across many
// jobs (not spawned per-job) so the solver bundle's own load cost, and repeat BFS precomputation
// for the same level, are paid once per worker rather than once per attempt.
//
// This file is NOT run directly by plain node (it imports .js-specifier paths that actually point
// to .ts source, same as every other CLI entry in this repo) — race.mjs esbuild-bundles it first,
// mirroring scripts/run-bundled.mjs's own rationale (tsx runs the solver hot path ~5x slower).
import { parentPort } from 'node:worker_threads';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { POLICY_PROFILES } = await import('../../modules/solver/policy.js');
// Dispatch to the right search primitive via the ONE shared dispatcher orchestration.ts's
// runAttempt() also uses (modules/solver/attempt-dispatch.ts) — never a hand-rolled repair/beam/DFS
// branch here, so this raced path can't drift from the sequential ladder on config routing or
// argument threading. See CLAUDE.md's "behavior leaked into scripts" audit.
const { runAttemptSearch } = await import('../../modules/solver/attempt-dispatch.js');

const Solver = createSolver();

// Cache the last-seen level's normalized+prepped form, keyed by the caller-supplied levelKey
// (one solveLevelRaced() call uses one constant key for every job in that batch) — repeated jobs
// for the SAME level within one worker's lifetime (different gate/config) reuse the BFS
// precomputation instead of redoing it per job. Deliberately NOT a shared/pooled buffer across
// levelKeys (a fresh prepLevel() per distinct key) — see CLAUDE.md's memoization gotcha; this is
// a size-1 cache with a simple equality check, not a state-keyed correctness-sensitive one.
let cachedLevelKey = null, cachedLevel = null, cachedPrep = null;

function getPrepped(levelKey, rawLevel, ablationCfg) {
    if (cachedLevelKey !== levelKey) {
        cachedLevel = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
        cachedPrep = prepLevel(cachedLevel);
        cachedLevelKey = levelKey;
    }
    cachedPrep._cfg = ablationCfg ?? null;
    cachedPrep._metrics = { nodesExpanded: 0 };
    return { level: cachedLevel, prep: cachedPrep };
}

parentPort.on('message', async (msg) => {
    if (msg?.type !== 'job') return;
    const { jobId, levelKey, rawLevel, gateKey, attemptConfig, budgetMs, ablationCfg } = msg;
    const t0 = Date.now();
    let prep;
    try {
        const prepared = getPrepped(levelKey, rawLevel, ablationCfg);
        const level = prepared.level;
        prep = prepared.prep;
        const profile = POLICY_PROFILES[attemptConfig.profileName] ?? POLICY_PROFILES.default;
        // yieldFn: null — no cooperative-yield/cancellation needed inside a worker (blocking the
        // worker's own event loop doesn't block anything else); the race orchestrator cancels
        // losers via Worker.terminate() instead. nodeBudget/out/seedSalt left at defaults: the
        // race path is wall-clock-budgeted and reads nodesExpanded back off prep._metrics below.
        const out = {};
        const solved = await runAttemptSearch(attemptConfig, gateKey, level, prep, profile, budgetMs, Date.now(), null, Infinity, out);
        parentPort.postMessage({
            type: 'result', jobId, ok: !!solved, path: solved ?? null,
            outcome: solved ? 'success' : out.timedOut === true ? 'timed-out' : out.timedOut === false ? 'exhausted' : 'budget-starved',
            allocatedBudgetMs: budgetMs, elapsedMs: Date.now() - t0, nodesExpanded: prep._metrics.nodesExpanded,
        });
    } catch (err) {
        const bounded = (value, fallback, max) => {
            let string;
            try { string = typeof value === 'string' ? value : value == null ? fallback : String(value); }
            catch { string = fallback; }
            return string.slice(0, max);
        };
        const safeField = (key) => { try { return err?.[key]; } catch { return undefined; } };
        parentPort.postMessage({
            type: 'result', jobId, ok: false, path: null,
            outcome: 'error', allocatedBudgetMs: budgetMs, elapsedMs: Date.now() - t0,
            nodesExpanded: prep?._metrics?.nodesExpanded ?? 0,
            error: {
                name: bounded(safeField('name'), 'Error', 120),
                message: bounded(safeField('message') ?? err, 'Unknown attempt error', 500),
            },
        });
    }
});

parentPort.postMessage({ type: 'ready' });
