import assert from 'node:assert/strict';
import { test } from 'vitest';
import { encodedLevelDataByteSize, FIRESTORE_HINT_CAPACITY_BUDGET_BYTES } from './review-repository.js';

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
