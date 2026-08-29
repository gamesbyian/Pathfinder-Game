#!/usr/bin/env node
/**
 * Unit tests for modules/solver/worker.js (handleWorkerMessage)
 * and shape-checks for solver-worker-client.ts.
 *
 * Tests run entirely in Node.js — no actual Web Worker is created.
 * handleWorkerMessage is exported for direct invocation with mock adapters.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { makeRawLevel } from './test-lib/fixtures.mjs';

globalThis.window = globalThis;
// Prevent the Worker bootstrap at the bottom of worker.js from running in Node.
// WorkerGlobalScope is not defined in Node, so the guard is naturally false.

const { handleWorkerMessage } = await import('../modules/solver/worker.js');
const { createSolverWorkerClient, createEnumerationPoolClient } = await import('../modules/solver/solver-worker-client.js');
const { normalizeRawLevel } = await import('../modules/solver/normalization.js');
const { prepLevel } = await import('../modules/solver/prep.js');

// Minimal raw level fixture (1-indexed coords, always solvable).
const SIMPLE_RAW = makeRawLevel({ grid: { w: 5, h: 5 } });

// ─── handleWorkerMessage: unknown type ───────────────────────────────────────

test('ignores unknown message type silently', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage({ type: 'UNKNOWN', id: 1 }, { postBack: (m) => posts.push(m), cancelledIds });
    assert.equal(posts.length, 0, 'no message should be posted for unknown type');
});

// ─── handleWorkerMessage: CANCEL ─────────────────────────────────────────────

test('CANCEL adds id to cancelledIds', async () => {
    const cancelledIds = new Set();
    await handleWorkerMessage({ type: 'CANCEL', id: 99 }, { postBack: () => {}, cancelledIds });
    assert.ok(cancelledIds.has(99), 'id 99 should be in cancelledIds after CANCEL');
});

// ─── handleWorkerMessage: SOLVE ───────────────────────────────────────────────

test('SOLVE posts a RESULT message', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 1, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts.length, 1);
    assert.equal(posts[0].type, 'RESULT');
    assert.equal(posts[0].id, 1);
});

test('SOLVE result has expected ok and solution fields', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 2, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const result = posts[0];
    assert.equal(typeof result.ok, 'boolean');
    assert.ok(result.ok === true, 'simple level should solve');
    assert.ok(Array.isArray(result.solution), 'solution should be an array');
    assert.ok(result.solution.length > 0, 'solution should be non-empty');
});

test('SOLVE result has numeric elapsedMs and nodesExpanded', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 3, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const result = posts[0];
    assert.equal(typeof result.elapsedMs, 'number');
    assert.ok(result.elapsedMs >= 0);
    assert.equal(typeof result.nodesExpanded, 'number');
    assert.ok(result.nodesExpanded >= 0);
});

test('SOLVE result has attempts array', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 4, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.ok(Array.isArray(posts[0].attempts));
    assert.equal(posts[0].status, 'success');
    assert.equal(posts[0].attempts.every(a => typeof a.outcome === 'string'), true);
});

test('SOLVE result carries the full SolveResult shape, not a fixed subset (regression, fixed 2026-08-20)', async () => {
    // buildSolveWorkerResult used to include only ok/status/solution/elapsedMs/nodesExpanded/
    // attempts/deadlineTruncated, silently dropping every other SolveResult field -- breaking the
    // worker client's own "drop-in swap for on-thread solving" promise for any caller reading them.
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 42, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const result = posts[0];
    assert.ok(Array.isArray(result.solutions), 'solutions must be present');
    assert.equal(typeof result.workSpent, 'number', 'workSpent must be present');
    assert.equal(typeof result.workBudget, 'number', 'workBudget must be present');
    // nodeBudgetReached/solvedByPrime/stageLifecycle/schedulerMode/legacyLatencyPortfolioExperiment are all legitimately
    // undefined on an ordinary successful solve (their own SolveResult fields are optional) -- the
    // point is they're no longer STRIPPED by the serializer, which `'x' in result` (not a value
    // check) verifies regardless of whether this particular solve populated them.
    for (const field of ['nodeBudgetReached', 'solvedByPrime', 'stageLifecycle', 'schedulerMode', 'legacyLatencyPortfolioExperiment']) {
        assert.ok(field in result, `${field} must survive the worker result serializer`);
    }
});

test('SOLVE with pre-cancelled id posts RESULT with cancelled:true', async () => {
    const posts = [];
    const cancelledIds = new Set([10]);
    await handleWorkerMessage(
        { type: 'SOLVE', id: 10, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts.length, 1);
    assert.equal(posts[0].type, 'RESULT');
    assert.equal(posts[0].ok, false);
    assert.equal(posts[0].cancelled, true);
});

test('SOLVE with invalid raw level posts ERROR message', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 5, levelRaw: null, budgetMs: 5000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts.length, 1);
    assert.equal(posts[0].type, 'ERROR');
    assert.equal(posts[0].id, 5);
    assert.equal(typeof posts[0].message, 'string');
});

test('SOLVE threads solveOpts through to the real solveLevel() call (regression, fixed 2026-08-20)', async () => {
    // Before the fix, the worker's SOLVE handler only ever passed { timeBudgetMs, yieldFn } to
    // solveLevel() -- any other option the caller sent was silently discarded. lifecycleTelemetry
    // is a clean, verifiable signal: it only ever appears on the result when solveLevel() actually
    // received it, so a populated stageLifecycle here proves solveOpts genuinely reached the
    // real solver, not just that the worker accepted the field without using it.
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 40, levelRaw: SIMPLE_RAW, budgetMs: 10000, solveOpts: { lifecycleTelemetry: true } },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts[0].type, 'RESULT');
    assert.equal(posts[0].ok, true);
    assert.ok(posts[0].stageLifecycle && typeof posts[0].stageLifecycle === 'object',
        'lifecycleTelemetry from solveOpts must have reached the real solveLevel() call');
});

test('SOLVE omitting solveOpts entirely still works (backward compatible)', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 41, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts[0].type, 'RESULT');
    assert.equal(posts[0].ok, true);
});

test('cancelled id is cleaned up after SOLVE completes', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 6, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.ok(!cancelledIds.has(6), 'id should be removed from cancelledIds after solve');
});

// ─── handleWorkerMessage: FALSE_GOAL_TRIGGER_SEARCH ───────────────────────────────────────────────
// FALSE_GOAL_TRIGGER_SEARCH takes a NORMALIZED level (structured clone carries Sets/Maps in a real
// Worker; in these Node tests we pass the normalized object directly).

test('FALSE_GOAL_TRIGGER_SEARCH posts a canonical result for a complete sweep', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'FALSE_GOAL_TRIGGER_SEARCH', id: 20, level: normalizeRawLevel(SIMPLE_RAW), budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const result = posts.at(-1);
    assert.equal(result.type, 'FALSE_GOAL_TRIGGER_SEARCH_RESULT');
    assert.equal(result.id, 20);
    assert.equal(result.status, 'complete');
    assert.ok(Array.isArray(result.triggerableCells) && result.triggerableCells.length > 0, 'open grid should have triggerable false-goal cells');
    assert.equal(result.gatesCompleted, result.totalGates);
});

test('FALSE_GOAL_TRIGGER_SEARCH streams every found spot through FALSE_GOAL_TRIGGER_SEARCH_PROGRESS before the result', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'FALSE_GOAL_TRIGGER_SEARCH', id: 21, level: normalizeRawLevel(SIMPLE_RAW), budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const progress = posts.filter((m) => m.type === 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS');
    assert.ok(progress.length > 0, 'per-gate progress should be posted');
    const streamed = new Set(progress.flatMap((m) => m.newTriggerableCells));
    const final = new Set(posts.at(-1).triggerableCells);
    assert.deepEqual(streamed, final, 'streamed spots must equal the final spot set');
});

test('FALSE_GOAL_TRIGGER_SEARCH with an invalid level posts ERROR', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'FALSE_GOAL_TRIGGER_SEARCH', id: 22, level: null, budgetMs: 5000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts.length, 1);
    assert.equal(posts[0].type, 'ERROR');
    assert.equal(posts[0].id, 22);
});

// ─── handleWorkerMessage: ENUMERATE ──────────────────────────────────────────
// ENUMERATE takes a NORMALIZED level (same convention as FALSE_GOAL_TRIGGER_SEARCH). Fixture: 3x3 grid, gate (0,0),
// goal (2,2), reqLen 4, reqInt 0 — exactly 6 monotone-lattice solutions, 2 real root neighbors
// (right and up), matching modules/solver/hint-enumeration.test.ts's shared oracle.
const TINY_GRID_LEVEL = normalizeRawLevel({ grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4, reqInt: 0 }, 1);
const GATE_KEY = TINY_GRID_LEVEL.gateKeys[0];

test('ENUMERATE with no shard finds all 6 solutions and reports exhausted', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'ENUMERATE', id: 30, levelKey: 'k1', level: TINY_GRID_LEVEL, gateKey: GATE_KEY },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const result = posts.at(-1);
    assert.equal(result.type, 'ENUMERATE_RESULT');
    assert.equal(result.id, 30);
    assert.equal(result.exhausted, true);
    const progress = posts.filter((m) => m.type === 'ENUMERATE_PROGRESS');
    const paths = progress.flatMap((m) => m.paths);
    assert.equal(paths.length, 6);
});

test('ENUMERATE streams every found path through ENUMERATE_PROGRESS before the result', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'ENUMERATE', id: 31, levelKey: 'k1', level: TINY_GRID_LEVEL, gateKey: GATE_KEY },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts.at(-1).type, 'ENUMERATE_RESULT', 'ENUMERATE_RESULT is always posted last');
    const progress = posts.filter((m) => m.type === 'ENUMERATE_PROGRESS');
    assert.ok(progress.length > 0, 'at least one progress batch');
    for (const m of progress) assert.ok(Array.isArray(m.paths) && m.paths.length > 0);
});

test('ENUMERATE with a rootChildren shard restricts the search and stays exhausted for that shard', async () => {
    const posts = [];
    const cancelledIds = new Set();
    const right = TINY_GRID_LEVEL.gateKeys[0] + 1; // PACK(x+1,y) == key+1 in this codec — see encoding.ts
    await handleWorkerMessage(
        { type: 'ENUMERATE', id: 32, levelKey: 'k1', level: TINY_GRID_LEVEL, gateKey: GATE_KEY, rootChildren: [right] },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const result = posts.at(-1);
    assert.equal(result.exhausted, true, 'this shard\'s own subtree is fully drained');
    const found = posts.filter((m) => m.type === 'ENUMERATE_PROGRESS').flatMap((m) => m.paths);
    assert.ok(found.length > 0 && found.length < 6, 'a proper subset of the full 6 solutions');
    for (const entry of found) {
        assert.equal(entry.path[1], right);
        assert.equal(typeof entry.nodes, 'number');
        assert.equal(typeof entry.elapsedMs, 'number');
    }
});

test('ENUMERATE with a pre-cancelled id stops without finding everything and reports NOT exhausted', async () => {
    const posts = [];
    const cancelledIds = new Set([33]);
    await handleWorkerMessage(
        { type: 'ENUMERATE', id: 33, levelKey: 'k1', level: TINY_GRID_LEVEL, gateKey: GATE_KEY },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    const result = posts.at(-1);
    assert.equal(result.type, 'ENUMERATE_RESULT');
    assert.equal(result.exhausted, false);
});

test('ENUMERATE with an invalid level posts ERROR', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'ENUMERATE', id: 34, levelKey: 'k2', level: null, gateKey: GATE_KEY },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.equal(posts.length, 1);
    assert.equal(posts[0].type, 'ERROR');
    assert.equal(posts[0].id, 34);
});

test('the per-worker prep cache is reused across ENUMERATE calls with the same levelKey (same solution set both times)', async () => {
    const postsA = [], postsB = [];
    const cancelledIds = new Set();
    await handleWorkerMessage({ type: 'ENUMERATE', id: 35, levelKey: 'k3', level: TINY_GRID_LEVEL, gateKey: GATE_KEY }, { postBack: (m) => postsA.push(m), cancelledIds });
    await handleWorkerMessage({ type: 'ENUMERATE', id: 36, levelKey: 'k3', level: TINY_GRID_LEVEL, gateKey: GATE_KEY }, { postBack: (m) => postsB.push(m), cancelledIds });
    const pathsA = postsA.filter((m) => m.type === 'ENUMERATE_PROGRESS').flatMap((m) => m.paths);
    const pathsB = postsB.filter((m) => m.type === 'ENUMERATE_PROGRESS').flatMap((m) => m.paths);
    assert.equal(pathsA.length, 6);
    assert.equal(pathsB.length, 6);
});

// ─── createSolverWorkerClient: API shape ─────────────────────────────────────
// Worker is not constructable in Node.js, so we verify the factory signature.

test('createSolverWorkerClient is a function', () => {
    assert.equal(typeof createSolverWorkerClient, 'function');
});

test('createSolverWorkerClient with mock Worker returns object with solve and terminate', () => {
    // Stub Worker to avoid "Worker is not defined" in Node
    const fakeWorker = { onmessage: null, onerror: null, postMessage() {}, terminate() {} };
    const origWorker = globalThis.Worker;
    globalThis.Worker = class { constructor() { Object.assign(this, fakeWorker); } };
    try {
        const client = createSolverWorkerClient(new URL('file:///mock-worker.js'));
        assert.equal(typeof client.solve, 'function', 'client should have solve()');
        assert.equal(typeof client.findTriggerableFalseGoalCells, 'function', 'client should have findTriggerableFalseGoalCells()');
        assert.equal(typeof client.terminate, 'function', 'client should have terminate()');
    } finally {
        if (origWorker === undefined) delete globalThis.Worker;
        else globalThis.Worker = origWorker;
    }
});

test('client.solve() forwards the full SolveOpts as solveOpts, minus timeBudgetMs/yieldFn/functions (regression, fixed 2026-08-20)', () => {
    // Before the fix, only { timeBudgetMs, yieldFn } ever reached postMessage -- ablation,
    // nodeBudget, workBudget, disableExtraBudgetPasses, and every other SolveOpts field were
    // silently dropped, breaking the "drop-in swap for on-thread solving" promise for any caller
    // relying on them.
    const sent = [];
    const fakeWorker = { onmessage: null, onerror: null, postMessage: (m) => sent.push(m), terminate() {} };
    const client = createSolverWorkerClient(fakeWorker);
    const ablation = { STRATEGY_REPAIR_PROBE: false };
    const attemptSearchForTesting = () => null;
    client.solve({ fake: 'level' }, {
        timeBudgetMs: 5000,
        yieldFn: async () => {},
        ablation,
        nodeBudget: 12345,
        disableExtraBudgetPasses: true,
        lifecycleTelemetry: true,
        attemptSearchForTesting,
    });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].type, 'SOLVE');
    assert.equal(sent[0].budgetMs, 5000, 'timeBudgetMs still reaches the dedicated budgetMs field');
    assert.deepEqual(sent[0].solveOpts.ablation, ablation);
    assert.equal(sent[0].solveOpts.nodeBudget, 12345);
    assert.equal(sent[0].solveOpts.disableExtraBudgetPasses, true);
    assert.equal(sent[0].solveOpts.lifecycleTelemetry, true);
    assert.ok(!('timeBudgetMs' in sent[0].solveOpts), 'timeBudgetMs must not be duplicated into solveOpts');
    assert.ok(!('yieldFn' in sent[0].solveOpts), 'yieldFn cannot cross structured-clone and must be stripped');
    assert.ok(!('attemptSearchForTesting' in sent[0].solveOpts), 'function-valued options must be stripped, not just yieldFn specifically');
});

test('createSolverWorkerClient accepts an already-constructed Worker instance', async () => {
    // The app passes a Worker built inline (new Worker(new URL(...), { type: 'module' }))
    // so Vite can statically bundle the worker module.
    const sent = [];
    const fakeWorker = { onmessage: null, onerror: null, postMessage: (m) => sent.push(m), terminate() {} };
    const client = createSolverWorkerClient(fakeWorker);
    const resultPromise = client.findTriggerableFalseGoalCells({ fake: 'level' }, { timeLimitMs: 1234 });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].type, 'FALSE_GOAL_TRIGGER_SEARCH');
    assert.equal(sent[0].budgetMs, 1234);

    // Round-trip: a FALSE_GOAL_TRIGGER_SEARCH_PROGRESS is routed to onProgress; FALSE_GOAL_TRIGGER_SEARCH_RESULT resolves with a Set.
    fakeWorker.onmessage({ data: { type: 'FALSE_GOAL_TRIGGER_SEARCH_RESULT', id: sent[0].id, status: 'complete', triggerableCells: [7, 9] } });
    const res = await resultPromise;
    assert.ok(res.triggerableCells instanceof Set);
    assert.deepEqual([...res.triggerableCells].sort(), [7, 9]);
});

test('client routes FALSE_GOAL_TRIGGER_SEARCH_PROGRESS payloads to onProgress without settling the call', async () => {
    const sent = [];
    const fakeWorker = { onmessage: null, onerror: null, postMessage: (m) => sent.push(m), terminate() {} };
    const client = createSolverWorkerClient(fakeWorker);
    const progress = [];
    const resultPromise = client.findTriggerableFalseGoalCells({ fake: 'level' }, { timeLimitMs: 1000, onProgress: (p) => progress.push(p) });
    const id = sent[0].id;
    fakeWorker.onmessage({ data: { type: 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS', id, newTriggerableCells: [3], gatesProcessed: 1, totalGates: 2 } });
    fakeWorker.onmessage({ data: { type: 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS', id, newTriggerableCells: [5] } });
    assert.equal(progress.length, 2);
    assert.deepEqual(progress[0].newTriggerableCells, [3]);
    fakeWorker.onmessage({ data: { type: 'FALSE_GOAL_TRIGGER_SEARCH_RESULT', id, status: 'complete', triggerableCells: [3, 5] } });
    const res = await resultPromise;
    assert.deepEqual([...res.triggerableCells].sort(), [3, 5]);
});

// ─── createEnumerationPoolClient: end-to-end through the REAL ENUMERATE protocol ────────────────
// FakeWorker routes postMessage into the real handleWorkerMessage (async, matching a real Worker's
// message delivery) instead of mocking worker.js itself — this exercises the actual wire protocol
// both directions, not just the client's own bookkeeping.
class FakeWorker {
    constructor() {
        this._listeners = { message: [], error: [] };
        this._cancelledIds = new Set();
    }
    addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
    removeEventListener(type, fn) { this._listeners[type] = (this._listeners[type] || []).filter((f) => f !== fn); }
    postMessage(msg) {
        Promise.resolve().then(() => handleWorkerMessage(msg, {
            postBack: (data) => this._listeners.message.forEach((fn) => fn({ data })),
            cancelledIds: this._cancelledIds,
        }));
    }
    terminate() {}
}

// Same 3x3-grid oracle as the ENUMERATE tests above: 6 solutions, 2 gate neighbors -> 2 jobs.
function tinyPoolLevel() { return normalizeRawLevel({ grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4, reqInt: 0 }, 1); }

test('pool finds all 6 solutions across 2 workers and reports exhaustive', async () => {
    const pool = createEnumerationPoolClient(() => new FakeWorker(), 2);
    try {
        const res = await pool.runComplete(tinyPoolLevel(), [], { maxHints: 1000, target: 100 });
        assert.equal(res.outcome, 'exhaustive');
        assert.equal(res.savedCount, 6);
        assert.equal(res.newlySaved.length, 6);
        assert.equal(new Set(res.newlySaved.map((p) => p.join(','))).size, 6, 'no duplicates across shards');
    } finally { pool.terminate(); }
});

test('pool works with a single worker too (jobs queue behind it)', async () => {
    const pool = createEnumerationPoolClient(() => new FakeWorker(), 1);
    try {
        const res = await pool.runComplete(tinyPoolLevel(), [], { maxHints: 1000, target: 100 });
        assert.equal(res.outcome, 'exhaustive');
        assert.equal(res.savedCount, 6);
    } finally { pool.terminate(); }
});

test('pool does not re-report an existing hint, but it still seeds dedup', async () => {
    const level = tinyPoolLevel();
    const prep = prepLevel(level);
    // Grab one real solution via a direct enumeration to use as a pre-existing hint.
    const { enumerateFromGate } = await import('../modules/solver/hint-enumeration.js');
    const known = [];
    await enumerateFromGate(level, prep, level.gateKeys[0], { onSolution: (p) => known.push(p), rng: null, nodeBudget: 1 });
    // nodeBudget:1 may find 0; fall back to a full run for a guaranteed seed.
    if (known.length === 0) await enumerateFromGate(level, prep, level.gateKeys[0], { onSolution: (p) => known.push(p), rng: null });
    const seed = known[0];

    const pool = createEnumerationPoolClient(() => new FakeWorker(), 2);
    try {
        const res = await pool.runComplete(level, [seed], { maxHints: 1000, target: 100 });
        assert.equal(res.outcome, 'exhaustive');
        assert.equal(res.savedCount, 5, 'the other five, not the one already-known solution');
        assert.ok(!res.newlySaved.some((p) => p.join(',') === seed.join(',')));
    } finally { pool.terminate(); }
});

test('pool stops at maxHints and reports capped', async () => {
    const pool = createEnumerationPoolClient(() => new FakeWorker(), 2);
    try {
        const res = await pool.runComplete(tinyPoolLevel(), [], { maxHints: 3, target: 100 });
        assert.equal(res.outcome, 'capped');
        assert.equal(res.savedCount, 3, 'stopped at the cap');
    } finally { pool.terminate(); }
});

test('pool honors isCancelled and reports cancelled, not exhaustive', async () => {
    const pool = createEnumerationPoolClient(() => new FakeWorker(), 2);
    try {
        // Cancelled from the start: dispatch() must refuse to hand out any job, and the outcome
        // classification must prefer 'cancelled' over the (stale-true) allExhausted default.
        const res = await pool.runComplete(tinyPoolLevel(), [], { maxHints: 1000, target: 100, isCancelled: () => true });
        assert.equal(res.outcome, 'cancelled');
        assert.equal(res.savedCount, 0, 'no shard ever got dispatched');
    } finally { pool.terminate(); }
});

test('pool reports savedCount/curatedCount progress as it goes', async () => {
    const pool = createEnumerationPoolClient(() => new FakeWorker(), 2);
    try {
        const progress = [];
        await pool.runComplete(tinyPoolLevel(), [], { maxHints: 1000, target: 100, onProgress: (e) => progress.push(e) });
        assert.ok(progress.length > 0, 'at least one progress callback');
        assert.ok(progress.every((e) => typeof e.savedCount === 'number'));
    } finally { pool.terminate(); }
});

test('runComplete throws after terminate()', async () => {
    const pool = createEnumerationPoolClient(() => new FakeWorker(), 1);
    pool.terminate();
    await assert.rejects(() => pool.runComplete(tinyPoolLevel(), [], { maxHints: 10, target: 10 }));
});

// ─── Summary ─────────────────────────────────────────────────────────────────
