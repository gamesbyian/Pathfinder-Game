import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createLocalLevelHintsRepository } from './local-level-hints-repository.js';
import { makeProvenanceEntry } from '../domain/hint-types.js';

// Only the pure hashPathSignature/localHintEntryId helpers are unit-tested here — the rest of this
// module is a thin Firestore wrapper (no persistence repo in this codebase has emulator/mock-
// backed unit tests; see docs/firestore-security-model.md's "Known risks" for the tracked
// follow-up, and scripts/firestore-level-fingerprint-boundary-test.mjs for the real
// emulator-backed proof of the entry-doc-per-discovery-event behavior).
const { hashPathSignature, localHintEntryId, MAX_HINTS_PER_LEVEL } = createLocalLevelHintsRepository({ appId: 'test', db: null });

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

test('saveLocalLevelHintIfNovel returns a distinguishable no-connection outcome, not a bare false', async () => {
    const { saveLocalLevelHintIfNovel } = createLocalLevelHintsRepository({ appId: 'test', db: null });
    const outcome = await saveLocalLevelHintIfNovel('fingerprint', [1, 2, 3], '1,2,3', {} as any, new Set());
    assert.deepEqual(outcome, { saved: false, reason: 'no-connection' });
});

// Bounded execution/run binding (docs/hint-evidence-execution-identity-storage-consolidation-
// plan.md section 4/W's Firestore layout item): a genuinely new discovery event for an
// already-known path must get a distinct doc ID, never collide with the path's first-known event.
test('localHintEntryId differs for two distinct discovery events on the same path', () => {
    const signature = '1,2,3';
    const first = makeProvenanceEntry('dfs', { foundAt: '2026-01-01T00:00:00.000Z' });
    const second = makeProvenanceEntry('repair', { foundAt: '2026-01-02T00:00:00.000Z' });
    assert.notEqual(localHintEntryId(signature, first), localHintEntryId(signature, second));
});

test('localHintEntryId is deterministic for the same (pathSignature, provenance) pair', () => {
    const signature = '1,2,3';
    const provenance = makeProvenanceEntry('dfs', { foundAt: '2026-01-01T00:00:00.000Z' });
    assert.equal(localHintEntryId(signature, provenance), localHintEntryId(signature, provenance));
});

test('localHintEntryId differs for two different paths even with the exact same provenance event', () => {
    const provenance = makeProvenanceEntry('dfs', { foundAt: '2026-01-01T00:00:00.000Z' });
    assert.notEqual(localHintEntryId('1,2,3', provenance), localHintEntryId('4,5,6', provenance));
});

test('localHintEntryId ignores foundAt (same discovery event re-observed at a different time collapses to the same doc ID)', () => {
    const signature = '1,2,3';
    const a = makeProvenanceEntry('dfs', { foundAt: '2026-01-01T00:00:00.000Z' });
    const b = makeProvenanceEntry('dfs', { foundAt: '2026-06-01T00:00:00.000Z' });
    assert.equal(localHintEntryId(signature, a), localHintEntryId(signature, b),
        'provenanceEventIdentity() excludes foundAt by design, so the composite doc ID must too');
});
