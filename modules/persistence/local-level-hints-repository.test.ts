import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createLocalLevelHintsRepository } from './local-level-hints-repository.js';

// Only the pure hashPathSignature helper is unit-tested here — the rest of this module is a thin
// Firestore wrapper (no persistence repo in this codebase has emulator/mock-backed unit tests;
// see docs/firestore-security-model.md's "Known risks" for the tracked follow-up).
const { hashPathSignature, MAX_HINTS_PER_LEVEL } = createLocalLevelHintsRepository({ appId: 'test', db: null });

test('hashPathSignature is deterministic for the same input', () => {
    assert.equal(hashPathSignature('1,2,3,4'), hashPathSignature('1,2,3,4'));
});

test('hashPathSignature differs for different inputs', () => {
    assert.notEqual(hashPathSignature('1,2,3,4'), hashPathSignature('4,3,2,1'));
});

test('hashPathSignature is a fixed-length hex string regardless of input length', () => {
    const short = hashPathSignature('1,2');
    const long = hashPathSignature(Array.from({ length: 400 }, (_, i) => i).join(','));
    assert.match(short, /^[0-9a-f]{8}$/);
    assert.match(long, /^[0-9a-f]{8}$/);
});

test('MAX_HINTS_PER_LEVEL matches the documented cap', () => {
    assert.equal(MAX_HINTS_PER_LEVEL, 5000);
});
