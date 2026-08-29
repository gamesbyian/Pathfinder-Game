import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolverWorkerClient } from './solver-worker-client.js';

class FakeWorker {
    onmessage: ((event: any) => void) | null = null;
    onerror: ((event: any) => void) | null = null;
    messages: any[] = [];

    postMessage(message: any) { this.messages.push(message); }
    terminate() {}
    emit(data: any) { this.onmessage?.({ data }); }
}

test('false-goal worker client dual-reads legacy TRAP progress/result payloads into canonical shapes', async () => {
    const worker = new FakeWorker();
    const client = createSolverWorkerClient(worker as any);
    const progress: any[] = [];

    const promise: any = client.findTriggerableFalseGoalCells({ grid: { w: 1, h: 1 } }, {
        timeLimitMs: 1234,
        onProgress: (p: any) => progress.push(p),
    });

    const request = worker.messages.find(m => m.type === 'FALSE_GOAL_TRIGGER_SEARCH');
    assert.ok(request, 'client should still single-write the canonical request type');
    assert.equal(request.budgetMs, 1234);

    worker.emit({
        type: 'TRAP_PROGRESS',
        id: request.id,
        newSpots: [11, 22],
        gatesProcessed: 1,
        gatesCompleted: 0,
        totalGates: 2,
    });
    assert.equal(progress.length, 1);
    assert.equal(progress[0].type, 'FALSE_GOAL_TRIGGER_SEARCH_PROGRESS');
    assert.deepEqual(progress[0].newTriggerableCells, [11, 22]);

    worker.emit({
        type: 'TRAP_RESULT',
        id: request.id,
        status: 'timeout',
        spots: [11, 22, 33],
        timedOut: true,
        gatesProcessed: 2,
        gatesCompleted: 1,
        totalGates: 2,
        elapsedMs: 50,
        timeLimit: 1234,
    });

    const result = await promise;
    assert.equal(result.type, 'FALSE_GOAL_TRIGGER_SEARCH_RESULT');
    assert.equal(result.status, 'partial');
    assert.deepEqual([...result.triggerableCells], [11, 22, 33]);
    assert.equal(result.timeLimitMs, 1234);
    assert.equal(Object.hasOwn(result, 'spots'), false);
    assert.equal(Object.hasOwn(result, 'timedOut'), false);
    assert.equal(Object.hasOwn(result, 'timeLimit'), false);
});
