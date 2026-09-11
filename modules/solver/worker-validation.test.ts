import assert from 'node:assert/strict';
import { test } from 'vitest';
import { handleWorkerMessage } from './worker.js';

test('worker SOLVE rejects representation-unsafe raw levels before normalization/search', async () => {
    const posted: any[] = [];
    await handleWorkerMessage({
        type: 'SOLVE',
        id: 17,
        budgetMs: 100,
        levelRaw: {
            grid: { w: 16, h: 16 },
            gates: [{ x: 1, y: 1 }],
            goal: { x: 16, y: 16 },
            reqLen: 30,
            reqInt: 0,
        },
    }, {
        postBack: (message: any) => posted.push(message),
        cancelledIds: new Set<number>(),
    });

    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, 'ERROR');
    assert.equal(posted[0].id, 17);
    assert.match(posted[0].message, /^Solver: invalid raw level:/);
    assert.match(posted[0].message, /grid\.w must not exceed 15/);
});

test('worker SOLVE preserves solver-supported rectangular raw fixtures', async () => {
    const posted: any[] = [];
    await handleWorkerMessage({
        type: 'SOLVE',
        id: 18,
        budgetMs: 1000,
        levelRaw: {
            grid: { w: 2, h: 3 },
            gates: [{ x: 1, y: 1 }],
            goal: { x: 2, y: 3 },
            reqLen: 3,
            reqInt: 0,
        },
    }, {
        postBack: (message: any) => posted.push(message),
        cancelledIds: new Set<number>(),
    });

    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, 'RESULT');
    assert.equal(posted[0].id, 18);
    assert.equal(posted[0].ok, true);
});
