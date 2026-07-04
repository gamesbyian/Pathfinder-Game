import assert from 'node:assert/strict';
import { test } from 'vitest';
import { canonicalLevelFingerprintPayload, getLevelFingerprintSource } from './level-fingerprint.js';

const base = (overrides: any = {}) => ({
    grid: { w: 5, h: 5 },
    gates: [{ x: 1, y: 1 }],
    goal: { x: 5, y: 5 },
    reqLen: 8,
    reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
    filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
    ...overrides,
});

test('landmark mechanics differ from generic derived buckets in fingerprint source', () => {
    assert.notEqual(
        getLevelFingerprintSource(base({ blocks: [{ x: 2, y: 2 }] })),
        getLevelFingerprintSource(base({ blocks: [{ x: 2, y: 2 }], landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }] })),
    );
    assert.notEqual(
        getLevelFingerprintSource(base({ blocks: [{ x: 3, y: 3 }] })),
        getLevelFingerprintSource(base({ blocks: [{ x: 3, y: 3 }], landmarks: [{ x: 3, y: 3, objectType: 'fountain', role: 'adjacentTurn' }] })),
    );
    assert.notEqual(
        getLevelFingerprintSource(base({ mustPass: [{ x: 4, y: 4 }] })),
        getLevelFingerprintSource(base({ mustPass: [{ x: 4, y: 4 }], landmarks: [{ x: 4, y: 4, objectType: 'library', role: 'mustTurn' }] })),
    );
});

test('equivalent landmark spellings, order, and derived bucket duplication canonicalize together', () => {
    const suffixed = base({
        landmarks: [
            { x: 4, y: 4, objectType: 'fountain', role: 'adjacentTurnRight' },
            { x: 2, y: 2, objectType: 'library', role: 'mustTurnLeft' },
        ],
    });
    const explicitWithDerived = base({
        blocks: [{ x: 4, y: 4 }],
        mustPass: [{ x: 2, y: 2 }],
        landmarks: [
            { x: 2, y: 2, objectType: 'library', role: 'mustTurn', turn: 'left' },
            { x: 4, y: 4, objectType: 'fountain', role: 'adjacentTurn', turn: 'right' },
        ],
    });
    assert.equal(getLevelFingerprintSource(suffixed), getLevelFingerprintSource(explicitWithDerived));
});

test('raw landmark-only and canonical landmark-plus-derived buckets match, but true plain buckets do not', () => {
    const landmarkOnly = base({ landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }] });
    const canonical = base({ blocks: [{ x: 2, y: 2 }], landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }] });
    const plain = base({ blocks: [{ x: 2, y: 2 }] });
    assert.equal(getLevelFingerprintSource(landmarkOnly), getLevelFingerprintSource(canonical));
    assert.notEqual(getLevelFingerprintSource(plain), getLevelFingerprintSource(canonical));
});

test('landmark fingerprint payload has no undefined properties', () => {
    const payload: any = canonicalLevelFingerprintPayload(base({
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    }));
    assert.equal(payload.version, 2);
    for (const landmark of payload.landmarks) {
        for (const [key, value] of Object.entries(landmark)) assert.notEqual(value, undefined, `${key} is defined`);
    }
    assert.equal(Object.hasOwn(payload.landmarks[0], 'turn'), false);
});
