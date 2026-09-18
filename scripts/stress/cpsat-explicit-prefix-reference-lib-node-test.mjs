#!/usr/bin/env node
import assert from 'node:assert/strict';
import { extractExplicitPrefixCases, normalizeCoordinate } from './cpsat-explicit-prefix-reference-lib.mjs';

// normalizeCoordinate: packed key, raw [x,y], and {x,y} all normalize to the same 1-based [x,y].
{
    const packedKey = (0 << 16) | 1; // internal 0-based (x=1,y=0) -> raw [2,1]
    assert.deepEqual(normalizeCoordinate(packedKey), [2, 1]);
    assert.deepEqual(normalizeCoordinate([2, 1]), [2, 1]);
    assert.deepEqual(normalizeCoordinate({ x: 2, y: 1 }), [2, 1]);
}

// `pin` (existing event-pinning hook): absent by default, threaded through when present.
{
    const [withoutPin] = extractExplicitPrefixCases({
        cases: [{ levelId: 'L1', prefix: [[1, 1], [2, 1]] }],
    });
    assert.equal(withoutPin.pin, null);
    assert.equal(withoutPin.pinRevisit, null);

    const [withPin] = extractExplicitPrefixCases({
        cases: [{ levelId: 'L1', prefix: [[1, 1], [2, 1]], pin: [3, 1] }],
    });
    assert.deepEqual(withPin.pin, [3, 1]);
}

// `pinRevisit`: normalizes every cell in the array, accepts mixed coordinate shapes, and stays
// null when absent/empty so a plain prefix-feasibility query is unaffected.
{
    const [withRevisit] = extractExplicitPrefixCases({
        cases: [{
            levelId: 'L1',
            prefix: [[1, 1], [2, 1], [3, 1]],
            pinRevisit: [[2, 1], { x: 1, y: 1 }],
        }],
    });
    assert.deepEqual(withRevisit.pinRevisit, [[2, 1], [1, 1]]);

    const [emptyRevisit] = extractExplicitPrefixCases({
        cases: [{ levelId: 'L1', prefix: [[1, 1]], pinRevisit: [] }],
    });
    assert.equal(emptyRevisit.pinRevisit, null);
}

// pin and pinRevisit are independent hooks and may coexist on one case.
{
    const [both] = extractExplicitPrefixCases({
        cases: [{ levelId: 'L1', prefix: [[1, 1], [2, 1]], pin: [4, 4], pinRevisit: [[2, 1]] }],
    });
    assert.deepEqual(both.pin, [4, 4]);
    assert.deepEqual(both.pinRevisit, [[2, 1]]);
}

console.log('cpsat-explicit-prefix-reference-lib-node-test: ok');
