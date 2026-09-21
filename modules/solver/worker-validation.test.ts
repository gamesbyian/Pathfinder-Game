import assert from 'node:assert/strict';
import { test } from 'vitest';
import { handleWorkerMessage } from './worker.js';
import { normalizeRawLevel } from './normalization.js';

test('worker SOLVE rejects non-normalized requests instead of guessing their representation', async () => {
    const posted: any[] = [];
    await handleWorkerMessage({
        type: 'SOLVE',
        id: 17,
        budgetMs: 100,
        level: {
            grid: { w: 2, h: 2 },
            gates: [{ x: 1, y: 1 }],
            goal: { x: 2, y: 2 },
        },
    }, {
        postBack: (message: any) => posted.push(message),
        cancelledIds: new Set<number>(),
    });

    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, 'ERROR');
    assert.equal(posted[0].id, 17);
    assert.match(posted[0].message, /requires a normalized level/);
});

test('worker SOLVE preserves solver-supported rectangular normalized fixtures', async () => {
    const posted: any[] = [];
    const level = normalizeRawLevel({
        grid: { w: 2, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 2, y: 3 },
        reqLen: 3,
        reqInt: 0,
    });
    await handleWorkerMessage({
        type: 'SOLVE',
        id: 18,
        budgetMs: 1000,
        level,
    }, {
        postBack: (message: any) => posted.push(message),
        cancelledIds: new Set<number>(),
    });

    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, 'RESULT');
    assert.equal(posted[0].id, 18);
    assert.equal(posted[0].ok, true);
});
