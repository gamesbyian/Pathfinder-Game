// Persistent raced-solver worker. Jobs are (gate, attemptConfig) pairs; level prep is reused within
// the worker. race.mjs bundles this file first because plain node cannot resolve the TS-source .js
// specifiers efficiently/correctly for this hot path.
import { parentPort } from 'node:worker_threads';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const { prepLevel } = await import('../../modules/solver/prep.js');
const { POLICY_PROFILES } = await import('../../modules/solver/policy.js');
const { runAttemptSearch } = await import('../../modules/solver/attempt-dispatch.js');

const Solver = createSolver();

// Size-1 level cache: same levelKey reuses prep; a new key replaces it.
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
        // Workers do not cooperatively yield; race cancellation terminates losing workers.
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
