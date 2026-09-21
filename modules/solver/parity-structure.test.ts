import assert from 'node:assert/strict';
import { test } from 'vitest';

import { PACK } from './encoding.js';
import { describeStaticParityStructure } from './parity-structure.js';
import type { NormalizedLevel } from '../domain/types.js';

function level(overrides: Partial<NormalizedLevel> = {}): NormalizedLevel {
    return {
        grid: { w: 5, h: 5 },
        goalKey: PACK(4, 4),
        gateKeys: [PACK(0, 0)],
        blockSet: new Set(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredLength: 8,
        requiredIntersections: 0,
        ...overrides,
    };
}

test('describeStaticParityStructure classifies twist and same-parity portal pairs once', () => {
    const twistA = PACK(0, 1);
    const twistB = PACK(1, 1);
    const sameA = PACK(2, 0);
    const sameB = PACK(4, 0);
    const structure = describeStaticParityStructure(level({
        portalMap: new Map([
            [twistA, { dest: twistB }],
            [twistB, { dest: twistA }],
            [sameA, { dest: sameB }],
            [sameB, { dest: sameA }],
        ]),
    }));

    assert.equal(structure.portalPairs.length, 2);
    assert.deepEqual(structure.twistPortalPairs.map(({ a, b }) => [a, b]), [[twistA, twistB]]);
    assert.deepEqual(structure.sameParityPortalPairs.map(({ a, b }) => [a, b]), [[sameA, sameB]]);
});

test('describeStaticParityStructure computes exact gate twist demand', () => {
    const even = describeStaticParityStructure(level({
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(4, 4),
        requiredLength: 8,
    }));
    assert.equal(even.gateDemand, 'all-even');
    assert.equal(even.gateRequiredTwistParity[0].requiredTwistParity, 0);

    const odd = describeStaticParityStructure(level({
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(4, 4),
        requiredLength: 7,
    }));
    assert.equal(odd.gateDemand, 'all-odd');
    assert.equal(odd.gateRequiredTwistParity[0].requiredTwistParity, 1);

    const mixed = describeStaticParityStructure(level({
        gateKeys: [PACK(0, 0), PACK(1, 0)],
        goalKey: PACK(4, 4),
        requiredLength: 8,
    }));
    assert.equal(mixed.gateDemand, 'mixed');
    assert.deepEqual(mixed.gateRequiredTwistParity.map(row => row.requiredTwistParity), [0, 1]);
});

test('describeStaticParityStructure does not claim portal availability or solvability', () => {
    const structure = describeStaticParityStructure(level({
        gateKeys: [],
        portalMap: new Map(),
    }));
    assert.equal(structure.gateDemand, 'no-gates');
    assert.deepEqual(structure.portalPairs, []);
    assert.deepEqual(structure.gateRequiredTwistParity, []);
});
