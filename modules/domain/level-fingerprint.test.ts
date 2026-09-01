import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    canonicalLevelFingerprintPayload, getLevelFingerprintSource,
    getLevelFingerprint, getLegacyLevelFingerprints,
} from './level-fingerprint.js';

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
            { x: 4, y: 4, objectType: 'fountain', role: 'adjacentTurnCw' },
            { x: 2, y: 2, objectType: 'library', role: 'mustTurnCcw' },
        ],
    });
    const explicitWithDerived = base({
        blocks: [{ x: 4, y: 4 }],
        mustPass: [{ x: 2, y: 2 }],
        landmarks: [
            { x: 2, y: 2, objectType: 'library', role: 'mustTurn', turn: 'ccw' },
            { x: 4, y: 4, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' },
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

test('current v2 fingerprint bytes remain pinned for the Phase-15F rating identity fixture', async () => {
    const level = {
        grid: { w: 5, h: 5 }, reqLen: 8, reqInt: 0,
        gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
        falseGoals: [], blocks: [{ x: 2, y: 2 }], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], geese: [], landmarks: [],
    };
    assert.equal(
        await getLevelFingerprint(level),
        'v2:1abd33d29f460fee3a9b9dee523699c780df4b55c2a30f12d495e62ae67788d3',
        'application vocabulary renames must never alter the persisted/current level fingerprint bytes',
    );
});

// --- getLegacyLevelFingerprints (migration support for pre-v2-fingerprint persisted data) ---

test('getLegacyLevelFingerprints reproduces the frozen v1 hash for a fixed level (regression pin)', async () => {
    const level = {
        grid: { w: 5, h: 5 }, reqLen: 8, reqInt: 0,
        gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
        falseGoals: [], blocks: [{ x: 2, y: 2 }], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], geese: [], landmarks: [],
    };
    const legacy = await getLegacyLevelFingerprints(level);
    // Pinned literal (computed against commit 76b23e3, the pre-2026-07-03 algorithm). If this
    // ever changes, someone edited the FROZEN v1 block — which would make every rating/
    // duplicate-detection key persisted before the landmark fingerprinting change unreachable.
    assert.deepEqual(legacy, ['v1:beafb049a07baa37085e0b2b1c9ef8032567d4f108485fcfa8de479e092d9baf']);
});

test('a legacy fingerprint never equals the current fingerprint for the same level (migration is actually needed)', async () => {
    // True even for a plain, non-landmark level: the payload's `version` field differs, and v2
    // adds a `landmarks: []` key that v1 never had — so EVERY level's fingerprint changed under
    // the v1->v2 bump, not just levels using landmark mechanics.
    const level = base({ blocks: [{ x: 1, y: 1 }] });
    const [legacy] = await getLegacyLevelFingerprints(level);
    const current = await getLevelFingerprint(level);
    assert.notEqual(legacy, current);
});

test('under the legacy v1 algorithm, a landmark-only level and its canonical derived-bucket form do NOT match (the bug the v2 fingerprint fixed)', async () => {
    const landmarkOnly = base({ landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }] });
    const canonicalWithDerivedBlock = base({
        blocks: [{ x: 2, y: 2 }],
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    });
    const [legacyOnly] = await getLegacyLevelFingerprints(landmarkOnly);
    const [legacyCanonical] = await getLegacyLevelFingerprints(canonicalWithDerivedBlock);
    assert.notEqual(legacyOnly, legacyCanonical, 'v1 had no landmark-derived-coordinate exclusion');
    // Contrast: the current (v2) algorithm treats these as the same level.
    assert.equal(getLevelFingerprintSource(landmarkOnly), getLevelFingerprintSource(canonicalWithDerivedBlock));
});
