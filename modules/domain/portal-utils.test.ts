/** Behavior tests for portal helpers and the gate/portal parity analysis (hardening plan §1). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './cell-key.js';
import { parseRawLevel } from './level-codec.js';
import {
    resolvePortal, getPortalPairIndex, getPortalDisplayColor, expCoords,
    hasParitySwitchingPortal, getParityInvalidKeys,
} from './portal-utils.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

function level(overrides: any = {}) {
    const grid = overrides.grid || { w: 6, h: 6 };
    const l = parseRawLevel({
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: 10, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
    assert.ok(l);
    return l!;
}

test('resolvePortal maps both terminals to their paired exit; null off-portal or without a level', () => {
    const l = level({ portals: [{ x1: 2, y1: 2, x2: 5, y2: 5 }] });
    assert.equal(resolvePortal(l, K(2, 2))?.dest, K(5, 5));
    assert.equal(resolvePortal(l, K(5, 5))?.dest, K(2, 2));
    assert.equal(resolvePortal(l, K(3, 3)), null);
    assert.equal(resolvePortal(undefined, K(2, 2)), null);
});

test('portal pair index and display color follow the pair palette; fallback off-portal', () => {
    const l = level({ portals: [{ x1: 2, y1: 2, x2: 5, y2: 5 }, { x1: 3, y1: 1, x2: 1, y2: 3 }] });
    assert.equal(getPortalPairIndex(l, K(2, 2)), 0);
    assert.equal(getPortalPairIndex(l, K(1, 3)), 1);
    assert.equal(getPortalPairIndex(l, K(4, 4)), -1);
    assert.equal(getPortalPairIndex(level(), K(2, 2)), -1, 'no portals at all');
    assert.equal(getPortalDisplayColor(l, K(2, 2)), getPortalDisplayColor(l, K(5, 5)), 'pair shares a color');
    assert.notEqual(getPortalDisplayColor(l, K(2, 2)), getPortalDisplayColor(l, K(3, 1)), 'pairs differ');
    assert.equal(getPortalDisplayColor(l, K(4, 4), '#abc'), '#abc', 'fallback color off-portal');
});

test('expCoords converts packed keys back to 1-indexed wire coords (arrays and iterables)', () => {
    assert.deepEqual(expCoords([K(1, 1), K(3, 2)]), [{ x: 1, y: 1 }, { x: 3, y: 2 }]);
    assert.deepEqual(expCoords(new Set([K(2, 4)])), [{ x: 2, y: 4 }]);
});

test('hasParitySwitchingPortal: true only when a pair joins cells of different checkerboard parity', () => {
    // (2,2)→(5,5): parities (0,0) — same. (2,2)→(4,5): (0)/(1) — switching.
    assert.equal(hasParitySwitchingPortal(level({ portals: [{ x1: 2, y1: 2, x2: 5, y2: 5 }] })), false);
    assert.equal(hasParitySwitchingPortal(level({ portals: [{ x1: 2, y1: 2, x2: 4, y2: 5 }] })), true);
    assert.equal(hasParitySwitchingPortal(level()), false);
    assert.equal(hasParitySwitchingPortal(undefined), false);
});

test('getParityInvalidKeys flags gates/portal terminals whose parity cannot reach the goal in reqLen', () => {
    // Goal (6,6) → 0-based (5,5), parity 0. reqLen 10 (even) → target gate parity 0.
    const l = level({
        gates: [{ x: 1, y: 1 }, { x: 2, y: 1 }], // (0,0) parity 0 ok; (1,0) parity 1 wrong
        portals: [{ x1: 3, y1: 1, x2: 5, y2: 3 }], // 0-based (2,0) parity 0 ok; (4,2) parity 0 ok
        reqLen: 10,
    });
    const res = getParityInvalidKeys(l);
    assert.equal(res.hasParitySwitch, false);
    assert.equal(res.targetParity, 0);
    assert.deepEqual([...res.gates], [K(2, 1)]);
    assert.equal(res.portals.size, 0);

    // Odd reqLen flips the target parity: now the OTHER gate is invalid, and both portal
    // terminals (parity 0) become invalid.
    const odd = getParityInvalidKeys(l, 9);
    assert.equal(odd.targetParity, 1);
    assert.deepEqual([...odd.gates], [K(1, 1)]);
    assert.equal(odd.portals.size, 2);

    // A parity-switching portal disables the whole analysis (no parity conclusions hold).
    const switching = level({ portals: [{ x1: 2, y1: 2, x2: 4, y2: 5 }], reqLen: 10 });
    const sres = getParityInvalidKeys(switching);
    assert.equal(sres.hasParitySwitch, true);
    assert.equal(sres.targetParity, null);
    assert.equal(sres.gates.size, 0);

    // reqLen 0 / missing goal / missing level: analysis declines to flag anything.
    assert.equal(getParityInvalidKeys(level({ reqLen: 0 })).targetParity, null);
    assert.equal(getParityInvalidKeys(undefined).targetParity, null);
});
