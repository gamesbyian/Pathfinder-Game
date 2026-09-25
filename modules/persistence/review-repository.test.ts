import assert from 'node:assert/strict';
import { test } from 'vitest';
import { encodedLevelDataByteSize, FIRESTORE_HINT_CAPACITY_BUDGET_BYTES, persistLocalHintAdditionEvents } from './review-repository.js';
import { hintPathSignature, provenanceEvidenceKeys } from '../domain/hint-types.js';

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


test('partial local Hint persistence is retry-safe after a capacity refusal', async () => {
    const path = [1, 2, 3];
    const signature = hintPathSignature(path);
    const first = {
        solver: { id: 'pathfinder-solver', technique: 'first' },
        search: {}, context: {}, foundAt: '2026-01-01T00:00:00Z',
    } as any;
    const second = {
        solver: { id: 'pathfinder-solver', technique: 'second' },
        search: {}, context: {}, foundAt: '2026-01-02T00:00:00Z',
    } as any;
    const hints: any[] = [{ path, provenance: [first, second] }];

    // First pass: event 1 persists, event 2 hits capacity. This is the non-atomic local-store case
    // that must leave the review item retryable rather than requiring a destructive rollback.
    let firstPassCall = 0;
    const firstPass = await persistLocalHintAdditionEvents({
        levelFingerprint: 'fp',
        hints,
        existing: [],
        saveLocalLevelHintIfNovel: async () => {
            firstPassCall += 1;
            return firstPassCall === 1
                ? { saved: true } as const
                : { saved: false, reason: 'capacity-reached' } as const;
        },
    });
    assert.deepEqual(firstPass, {
        pathsWithSavedEvidence: 1,
        saved: 1,
        duplicateNotRecorded: 0,
        capacityReached: 1,
    });

    // Retry after capacity becomes available: the previously saved event is represented in existing
    // state and must dedupe, while the previously refused event is allowed to persist.
    const existing = [{ path, provenance: [first] }] as any[];
    const secondPass = await persistLocalHintAdditionEvents({
        levelFingerprint: 'fp',
        hints,
        existing,
        saveLocalLevelHintIfNovel: async (_fp, _path, _signature, provenance, known) => {
            const keys = provenanceEvidenceKeys(signature, provenance);
            if (keys.some(key => known.has(key))) {
                return { saved: false, reason: 'duplicate-provenance-not-recorded' } as const;
            }
            return { saved: true } as const;
        },
    });
    assert.deepEqual(secondPass, {
        pathsWithSavedEvidence: 1,
        saved: 1,
        duplicateNotRecorded: 1,
        capacityReached: 0,
    });
});
