import assert from 'node:assert/strict';
import { test } from 'vitest';

import { PACK, UNPACK } from './encoding.js';
import { describeStaticOrientationStructure } from './orientation-structure.js';
import type { NormalizedLevel } from '../domain/types.js';

function level(overrides: Partial<NormalizedLevel> = {}): NormalizedLevel {
    return {
        grid: { w: 5, h: 5 },
        goalKey: PACK(4, 4),
        gateKeys: [PACK(0, 0)],
        blockSet: new Set([PACK(1, 3)]),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        portalMap: new Map([
            [PACK(1, 1), { dest: PACK(3, 2) }],
            [PACK(3, 2), { dest: PACK(1, 1) }],
        ]),
        filterMap: new Map(),
        flippingFilterMap: new Map([[PACK(4, 1), 1]]),
        mustPassKeys: [PACK(1, 2)],
        mustCrossKeys: [PACK(3, 1)],
        requiredLength: 8,
        requiredIntersections: 0,
        surroundKeys: [],
        adjacentTurnKeys: [],
        ...overrides,
    };
}

function mirrorKeyHorizontal(key: number, width: number): number {
    const { x, y } = UNPACK(key);
    return PACK(width - 1 - x, y);
}

function mirrorHorizontal(source: NormalizedLevel): NormalizedLevel {
    const mirror = (key: number) => mirrorKeyHorizontal(key, source.grid.w);
    const mapKeys = (keys: Iterable<number>) => [...keys].map(mirror);
    const portalMap = new Map<number, { dest: number }>();
    for (const [key, exit] of source.portalMap) portalMap.set(mirror(key), { dest: mirror(exit.dest) });

    return {
        ...source,
        goalKey: mirror(source.goalKey),
        gateKeys: mapKeys(source.gateKeys),
        blockSet: new Set(mapKeys(source.blockSet)),
        gooseSet: new Set(mapKeys(source.gooseSet)),
        falseGoalKeys: new Set(mapKeys(source.falseGoalKeys)),
        portalMap,
        filterMap: new Map([...source.filterMap].map(([key, value]) => [mirror(key), value])),
        flippingFilterMap: new Map([...source.flippingFilterMap].map(([key, value]) => [mirror(key), value])),
        mustPassKeys: mapKeys(source.mustPassKeys),
        mustCrossKeys: mapKeys(source.mustCrossKeys),
        surroundKeys: mapKeys(source.surroundKeys ?? []),
        adjacentTurnKeys: mapKeys(source.adjacentTurnKeys ?? []),
    };
}

test('static orientation signed features flip under horizontal reflection', () => {
    const original = describeStaticOrientationStructure(level());
    const mirrored = describeStaticOrientationStructure(mirrorHorizontal(level()));

    assert.equal(mirrored.gateGoalDxMean, -original.gateGoalDxMean);
    assert.equal(mirrored.gateGoalDyMean, original.gateGoalDyMean);
    assert.equal(mirrored.gateGoalCenterSideBalance, -original.gateGoalCenterSideBalance);

    for (const key of ['blocks', 'mustPass', 'mustCross', 'portalTerminals', 'flippers', 'constrained'] as const) {
        assert.equal(mirrored[key].observations, original[key].observations);
        assert.equal(mirrored[key].sideBalance, -original[key].sideBalance, key);
        assert.equal(mirrored[key].signedMoment, -original[key].signedMoment, key);
        assert.equal(mirrored[key].absoluteMoment, original[key].absoluteMoment, key);
        assert.equal(mirrored[key].left, original[key].right, key);
        assert.equal(mirrored[key].right, original[key].left, key);
    }
});

test('static orientation returns neutral signed summaries when no gates exist', () => {
    const structure = describeStaticOrientationStructure(level({ gateKeys: [] }));
    assert.equal(structure.gateCount, 0);
    assert.equal(structure.gateGoalCenterSideBalance, 0);
    assert.equal(structure.constrained.sideBalance, 0);
    assert.equal(structure.constrained.signedMoment, 0);
});
