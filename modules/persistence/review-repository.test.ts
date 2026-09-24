import assert from 'node:assert/strict';
import { test } from 'vitest';
import { encodedLevelDataByteSize, FIRESTORE_HINT_CAPACITY_BUDGET_BYTES, persistLocalHintAdditionEvents } from './review-repository.js';

// Only the pure byte-size/threshold helpers behind approveHintAddition()'s capacity check are
// unit-tested here — the rest of this module is a thin Firestore wrapper (no persistence repo in
// this codebase has emulator/mock-backed unit tests; see
// local-level-hints-repository.test.ts's header comment for the tracked follow-up).

test('encodedLevelDataByteSize measures real UTF-8 JSON bytes, not character count', () => {
    const ascii = encodedLevelDataByteSize({ hints: ['a'] });
    const multiByte = encodedLevelDataByteSize({ hints: ['\u{1F600}'] }); // emoji: 4 UTF-8 bytes, 2 UTF-16 code units
    assert.ok(multiByte > ascii);
});

test('encodedLevelDataByteSize grows with the number of encoded hints', () => {
    const small = encodedLevelDataByteSize({ hints: [JSON.stringify({ path: [1, 2, 3], provenance: [] })] });
    const large = encodedLevelDataByteSize({
        hints: Array.from({ length: 50 }, () => JSON.stringify({ path: [1, 2, 3, 4, 5, 6, 7, 8], provenance: [{ foundAt: '2026-01-01T00:00:00Z' }] })),
    });
    assert.ok(large > small * 10);
});

test('FIRESTORE_HINT_CAPACITY_BUDGET_BYTES leaves real headroom under Firestore\'s 1 MiB document limit', () => {
    const FIRESTORE_DOCUMENT_LIMIT_BYTES = 1_048_576;
    assert.ok(FIRESTORE_HINT_CAPACITY_BUDGET_BYTES < FIRESTORE_DOCUMENT_LIMIT_BYTES);
    assert.ok(FIRESTORE_DOCUMENT_LIMIT_BYTES - FIRESTORE_HINT_CAPACITY_BUDGET_BYTES >= 100_000);
});


test('persistLocalHintAdditionEvents preserves every provenance event on a submitted path', async () => {
    const calls: any[] = [];
    const hints: any[] = [{
        path: [1, 2, 3],
        provenance: [
            { solver: { id: 'pathfinder-solver', technique: 'a' }, search: {}, context: {}, foundAt: '2026-01-01T00:00:00Z' },
            { solver: { id: 'human-player', technique: 'manual-path' }, search: {}, context: {}, foundAt: '2026-01-02T00:00:00Z' },
        ],
    }];
    const summary = await persistLocalHintAdditionEvents({
        levelFingerprint: 'fp',
        hints,
        existing: [],
        saveLocalLevelHintIfNovel: async (_fp, path, signature, provenance, known) => {
            calls.push({ path, signature, provenance, knownSize: known.size });
            return { saved: true } as const;
        },
    });
    assert.equal(calls.length, 2);
    assert.equal(summary.saved, 2);
    assert.equal(summary.pathsWithSavedEvidence, 1);
    assert.equal(summary.duplicateNotRecorded, 0);
    assert.equal(summary.capacityReached, 0);
});

test('persistLocalHintAdditionEvents accounts duplicate and capacity outcomes per event', async () => {
    const hints: any[] = [{
        path: [1, 2, 3],
        provenance: [
            { solver: { id: 'a', technique: 'x' }, search: {}, context: {}, foundAt: '2026-01-01T00:00:00Z' },
            { solver: { id: 'b', technique: 'y' }, search: {}, context: {}, foundAt: '2026-01-02T00:00:00Z' },
        ],
    }];
    let n = 0;
    const summary = await persistLocalHintAdditionEvents({
        levelFingerprint: 'fp',
        hints,
        existing: [],
        saveLocalLevelHintIfNovel: async () => (++n === 1
            ? { saved: false, reason: 'duplicate-provenance-not-recorded' } as const
            : { saved: false, reason: 'capacity-reached' } as const),
    });
    assert.equal(summary.saved, 0);
    assert.equal(summary.pathsWithSavedEvidence, 0);
    assert.equal(summary.duplicateNotRecorded, 1);
    assert.equal(summary.capacityReached, 1);
});
