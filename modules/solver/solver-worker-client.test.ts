import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildWorkerSolveOpts, createSolverWorkerClient, normalizeSolveWorkerResult } from './solver-worker-client.js';
import { normalizeRawLevel } from './normalization.js';

test('normalizeSolveWorkerResult removes transport envelope and restores direct timing field', () => {
    assert.deepEqual(normalizeSolveWorkerResult({
        type: 'RESULT',
        id: 9,
        ok: false,
        status: 'timeout',
        elapsedMs: 42,
        nodesExpanded: 10,
        attempts: [],
        solution: null,
        solutions: [],
        nodeBudgetReached: undefined,
    }), {
        ok: false,
        status: 'timeout',
        nodesExpanded: 10,
        attempts: [],
        solution: null,
        solutions: [],
        totalMs: 42,
    });
});

class FakeWorker {
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    messages: any[] = [];

    postMessage(message: any) { this.messages.push(message); }
    terminate() {}
    emit(data: any) { this.onmessage?.({ data }); }
}

test('worker SolveOpts serializer preserves data and rejects callback-shaped options explicitly', () => {
    assert.deepEqual(buildWorkerSolveOpts({
        timeBudgetMs: 1000,
        nodeBudget: 123,
        schedulerMode: 'production',
        ablation: { STRATEGY_PRIME: false } as any,
    }), {
        nodeBudget: 123,
        schedulerMode: 'production',
        ablation: { STRATEGY_PRIME: false },
    });

    assert.throws(() => buildWorkerSolveOpts({
        attemptSearchForTesting: (() => null) as any,
    }), /attemptSearchForTesting/);

    assert.throws(() => buildWorkerSolveOpts({
        failureProgressObserver: { observe() {} },
    }), /failureProgressObserver\.observe/);
});

test('solveLevel transports one normalized contract and returns direct SolveResult shape', async () => {
    const worker = new FakeWorker();
    const client = createSolverWorkerClient(worker as any);
    const raw = {
        grid: { w: 2, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 2, y: 3 },
        reqLen: 3,
        reqInt: 0,
    };

    const normalized = normalizeRawLevel(raw);
    const solvePromise: any = client.solveLevel(normalized, { timeBudgetMs: 1234 });
    const request = worker.messages.find(m => m.type === 'SOLVE');
    assert.ok(request);
    assert.equal(request.budgetMs, 1234);
    assert.equal(Object.hasOwn(request, 'levelRaw'), false);
    assert.ok(Array.isArray(request.level.gateKeys));
    assert.ok(request.level.portalMap instanceof Map);
    assert.equal(request.level.requiredLength, 3);

    worker.emit({
        type: 'RESULT',
        id: request.id,
        ok: true,
        status: 'success',
        solution: [1, 2, 3],
        solutions: [[1, 2, 3]],
        elapsedMs: 10,
        nodesExpanded: 7,
        attempts: [],
    });
    const result = await solvePromise;
    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.deepEqual(result.solution, [1, 2, 3]);
    assert.equal(result.totalMs, 10);
    assert.equal(Object.hasOwn(result, 'elapsedMs'), false, 'historical transport timing name must not leak into public solve result');
    assert.equal(Object.hasOwn(result, 'type'), false, 'worker routing type must not leak into public solve result');
    assert.equal(Object.hasOwn(result, 'id'), false, 'worker routing id must not leak into public solve result');

    assert.throws(() => client.solveLevel(raw as any), /requires a normalized level/);
});

test('solve is a raw-level convenience adapter over canonical solveLevel transport', async () => {
    const worker = new FakeWorker();
    const client = createSolverWorkerClient(worker as any);
    const raw = {
        grid: { w: 2, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 2, y: 3 },
        reqLen: 3,
        reqInt: 0,
    };
    const promise: any = client.solve(raw, { timeBudgetMs: 321 });
    const request = worker.messages.find(m => m.type === 'SOLVE');
    assert.ok(request);
    assert.equal(request.budgetMs, 321);
    assert.ok(request.level.portalMap instanceof Map);
    assert.equal(Object.hasOwn(request, 'levelRaw'), false);
    worker.emit({
        type: 'RESULT',
        id: request.id,
        ok: false,
        status: 'exhausted',
        solution: null,
        solutions: [],
        elapsedMs: 4,
        nodesExpanded: 2,
        attempts: [],
    });
    const result = await promise;
    assert.equal(result.totalMs, 4);

    assert.throws(() => client.solve({
        grid: { w: 16, h: 16 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 16, y: 16 },
        reqLen: 30,
        reqInt: 0,
    }), /Solver: invalid raw level:.*grid\.w must not exceed 15/);
});

test('false-goal worker client round-trips only the canonical worker protocol', async () => {
    const worker = new FakeWorker();
    const client = createSolverWorkerClient(worker as any);
    const progress: any[] = [];

    const promise: any = client.findTriggerableFalseGoalCells({ grid: { w: 1, h: 1 } }, {
        timeLimitMs: 1234,
        onProgress: (p: any) => progress.push(p),
    });

    const request = worker.messages.find(m => m.type === 'FALSE_GOAL_TRIGGER_SEARCH');
    assert.ok(request, 'client single-writes the canonical request type');
    assert.equal(request.budgetMs, 1234);

    worker.emit({
        type: 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS',
        id: request.id,
        newTriggerableCells: [11, 22],
        gatesProcessed: 1,
        gatesCompleted: 0,
        totalGates: 2,
    });
    assert.equal(progress.length, 1);
    assert.equal(progress[0].type, 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS');
    assert.deepEqual(progress[0].newTriggerableCells, [11, 22]);

    worker.emit({
        type: 'FALSE_GOAL_TRIGGER_SEARCH_RESULT',
        id: request.id,
        status: 'partial',
        triggerableCells: [11, 22, 33],
        gatesProcessed: 2,
        gatesCompleted: 1,
        totalGates: 2,
        elapsedMs: 50,
        timeLimitMs: 1234,
    });

    const result = await promise;
    assert.equal(result.type, 'FALSE_GOAL_TRIGGER_SEARCH_RESULT');
    assert.equal(result.status, 'partial');
    assert.deepEqual([...result.triggerableCells], [11, 22, 33]);
    assert.equal(result.timeLimitMs, 1234);
});
