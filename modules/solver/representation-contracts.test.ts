import assert from 'node:assert/strict';
import { test } from 'vitest';
import { NEIGHBOR_DX, NEIGHBOR_DY, PACK } from './encoding.js';
import { denseIndex } from './distance.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

function makeLevel(overrides: Record<string, unknown> = {}) {
    return normalizeRawLevel({
        grid: { w: 4, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 4, y: 3 },
        reqLen: 5,
        reqInt: 0,
        blocks: [],
        geese: [],
        falseGoals: [],
        mustPass: [],
        mustCross: [],
        filters: [],
        flippingFilters: [],
        portals: [],
        landmarks: [],
        hints: [],
        ...overrides,
    });
}

test('prep index arrays use +1 bias with zero as the absent sentinel', () => {
    const level = makeLevel({
        mustPass: [{ x: 2, y: 2 }],
        mustCross: [{ x: 3, y: 2 }],
        flippingFilters: [{ x: 2, y: 1, axis: 1 }],
    });
    const prep = prepLevel(level);

    // Index zero must be representable, so stored entries are index+1 and untouched typed-array
    // cells stay zero. Consumers must subtract one before comparing with -1 or using the index.
    assert.equal(prep.mustPassIndex[K(2, 2)], 1);
    assert.equal(prep.mustCrossIndex[K(3, 2)], 1);
    assert.equal(prep.flipperIndexMap[K(2, 1)], 1);

    assert.equal(prep.mustPassIndex[K(4, 1)], 0);
    assert.equal(prep.mustCrossIndex[K(4, 1)], 0);
    assert.equal(prep.flipperIndexMap[K(4, 1)], 0);

    assert.equal(prep.mustPassIndex[K(2, 2)] - 1, 0);
    assert.equal(prep.mustCrossIndex[K(3, 2)] - 1, 0);
    assert.equal(prep.flipperIndexMap[K(2, 1)] - 1, 0);
    assert.equal(prep.flipperIndexMap[K(4, 1)] - 1, -1);
});

test('staticNeighborKeys uses neighborKey+1 with zero as no-neighbor', () => {
    const level = makeLevel({ grid: { w: 3, h: 2 }, goal: { x: 3, y: 2 }, reqLen: 3 });
    const prep = prepLevel(level);
    const origin = K(1, 1);
    const base = denseIndex(origin, prep.gridW) * 4;

    const rightDir = NEIGHBOR_DX.findIndex((dx, i) => dx === 1 && NEIGHBOR_DY[i] === 0);
    const leftDir = NEIGHBOR_DX.findIndex((dx, i) => dx === -1 && NEIGHBOR_DY[i] === 0);
    assert.notEqual(rightDir, -1, 'encoding must expose a right-neighbor direction');
    assert.notEqual(leftDir, -1, 'encoding must expose a left-neighbor direction');

    assert.equal(prep.staticNeighborKeys[base + rightDir], K(2, 1) + 1);
    assert.equal(prep.staticNeighborKeys[base + leftDir], 0);

    // The decode convention is deliberately the same as buildIndexArr: subtract one exactly once.
    assert.equal(prep.staticNeighborKeys[base + rightDir] - 1, K(2, 1));
    assert.equal(prep.staticNeighborKeys[base + leftDir] - 1, -1);
});
