import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    makeProvenanceEntry, deriveOrigin, makeLevelProvenance,
    appendProvenanceEntry, unknownLevelProvenance,
} from './level-provenance-types.js';

test('makeProvenanceEntry defaults method/detail to null and stamps a timestamp', () => {
    const entry = makeProvenanceEntry('human', 'authored');
    assert.equal(entry.actor, 'human');
    assert.equal(entry.action, 'authored');
    assert.equal(entry.method, null);
    assert.equal(entry.detail, null);
    assert.ok(entry.timestamp && !Number.isNaN(Date.parse(entry.timestamp)));
});

test('makeProvenanceEntry honors explicit overrides', () => {
    const entry = makeProvenanceEntry('procedural', 'generated', {
        method: 'stress-corpus-generator', detail: { batch: 'A' }, timestamp: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(entry.method, 'stress-corpus-generator');
    assert.deepEqual(entry.detail, { batch: 'A' });
    assert.equal(entry.timestamp, '2026-01-01T00:00:00.000Z');
});

test('deriveOrigin: empty history is unknown, single actor passes through, mixed actors are hybrid', () => {
    assert.equal(deriveOrigin([]), 'unknown');
    assert.equal(deriveOrigin([makeProvenanceEntry('ai', 'generated')]), 'ai');
    assert.equal(deriveOrigin([makeProvenanceEntry('ai', 'generated'), makeProvenanceEntry('ai', 'edited')]), 'ai');
    assert.equal(
        deriveOrigin([makeProvenanceEntry('ai', 'generated'), makeProvenanceEntry('human', 'submitted')]),
        'hybrid',
    );
});

test('makeLevelProvenance derives origin and defaults confidence to certain', () => {
    const prov = makeLevelProvenance([makeProvenanceEntry('human', 'authored')]);
    assert.equal(prov.origin, 'human');
    assert.equal(prov.confidence, 'certain');
    assert.equal(prov.history.length, 1);
});

test('appendProvenanceEntry copies history rather than mutating the input', () => {
    const original = makeLevelProvenance([makeProvenanceEntry('human', 'authored')]);
    const appended = appendProvenanceEntry(original, makeProvenanceEntry('human', 'submitted'));
    assert.equal(original.history.length, 1, 'input must not be mutated');
    assert.equal(appended.history.length, 2);
    assert.equal(appended.history[0].action, 'authored');
    assert.equal(appended.history[1].action, 'submitted');
});

test('appendProvenanceEntry preserves existing confidence when history is already known', () => {
    const original = makeLevelProvenance([makeProvenanceEntry('ai', 'generated')], 'likely');
    const appended = appendProvenanceEntry(original, makeProvenanceEntry('human', 'submitted'));
    assert.equal(appended.confidence, 'likely', 'appending must not silently upgrade an existing confidence tier');
    assert.equal(appended.origin, 'hybrid');
});

test('appendProvenanceEntry on missing provenance is unverified, not falsely certain', () => {
    // A null/undefined `existing` means we only know about the single entry being appended --
    // nothing about what came before it -- so the result must not claim 'certain' confidence
    // (the bug this guards: naively defaulting to 'certain' here would misrepresent a level with
    // truly unknown prior history as confidently human-authored just because a human submitted it).
    const fromNull = appendProvenanceEntry(null, makeProvenanceEntry('human', 'submitted'));
    assert.equal(fromNull.confidence, 'unverified');
    assert.equal(fromNull.history.length, 1);

    const fromUndefined = appendProvenanceEntry(undefined, makeProvenanceEntry('human', 'submitted'));
    assert.equal(fromUndefined.confidence, 'unverified');
});

test('unknownLevelProvenance is the explicit "no known provenance" sentinel', () => {
    const prov = unknownLevelProvenance();
    assert.deepEqual(prov, { history: [], origin: 'unknown', confidence: 'unverified' });
});
