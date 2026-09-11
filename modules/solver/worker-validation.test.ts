import assert from 'node:assert/strict';
import { test } from 'vitest';
import { handleWorkerMessage } from './worker.js';

test('worker SOLVE rejects raw levels that violate the canonical schema before normalization/search', async () => {
    const posted: any[] = [];
    await handleWorkerMessage({
        type: 'SOLVE',
        id: 17,
        budgetMs: 100,
        levelRaw: {
            grid: { w: 2, h: 3 },
            gates: [{ x: 1, y: 1 }],
            goal: { x: 2, y: 3 },
            reqLen: 4,
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
    assert.match(posted[0].message, /grid must be square/);
});
