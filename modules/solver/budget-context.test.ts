import assert from 'node:assert/strict';
import { test } from 'vitest';
import { boundedWorkCap, withWorkCapScope } from './budget-context.js';
import type { PrepLevel } from './types.js';

function prep(): PrepLevel {
    return { _workMeter: { units: 10 } } as PrepLevel;
}

test('withWorkCapScope restores the previous cap after success and failure', async () => {
    const p = prep();
    p._workCap = 100;
    const value = await withWorkCapScope(p, 250, async () => {
        assert.equal(p._workCap, 250);
        return 7;
    });
    assert.equal(value, 7);
    assert.equal(p._workCap, 100);

    await assert.rejects(withWorkCapScope(p, 300, async () => {
        assert.equal(p._workCap, 300);
        throw new Error('boom');
    }), /boom/);
    assert.equal(p._workCap, 100);
});

test('boundedWorkCap never escapes a strict whole-solve cap', async () => {
    const p = prep();
    p._strictWorkCap = 180;
    assert.equal(boundedWorkCap(p, 250), 180);
    await withWorkCapScope(p, 250, async () => {
        assert.equal(p._workCap, 180);
    });
    assert.equal(p._workCap, undefined);
});
