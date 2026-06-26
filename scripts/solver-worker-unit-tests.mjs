#!/usr/bin/env node
/**
 * Unit tests for modules/solver/worker.js (handleWorkerMessage)
 * and shape-checks for solver-worker-client.js.
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
const { createSolverWorkerClient } = await import('../modules/solver/solver-worker-client.js');

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

test('cancelled id is cleaned up after SOLVE completes', async () => {
    const posts = [];
    const cancelledIds = new Set();
    await handleWorkerMessage(
        { type: 'SOLVE', id: 6, levelRaw: SIMPLE_RAW, budgetMs: 10000 },
        { postBack: (m) => posts.push(m), cancelledIds }
    );
    assert.ok(!cancelledIds.has(6), 'id should be removed from cancelledIds after solve');
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
        assert.equal(typeof client.terminate, 'function', 'client should have terminate()');
    } finally {
        if (origWorker === undefined) delete globalThis.Worker;
        else globalThis.Worker = origWorker;
    }
});

// ─── Summary ─────────────────────────────────────────────────────────────────
