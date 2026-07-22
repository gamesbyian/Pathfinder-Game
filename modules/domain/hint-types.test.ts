/** Unit tests for hint provenance merge/dedup — a byte-identical entry (the same discovery event
 *  recorded twice) must not accumulate, while genuinely distinct rediscoveries are kept. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { makeProvenanceEntry, dedupeProvenanceEntries, mergeHints, reconcileHints, toHint } from './hint-types.js';

test('dedupeProvenanceEntries collapses byte-identical entries, keeps distinct ones', () => {
  const e = makeProvenanceEntry('prefix-anchored', { foundAt: '2026-07-16T05:53:45.609Z', hintGuided: true, usedExistingHints: true });
  const other = makeProvenanceEntry('prefix-anchored', { foundAt: '2026-07-16T05:53:45.610Z', hintGuided: true, usedExistingHints: true });
  const out = dedupeProvenanceEntries([e, { ...e }, other]);
  assert.equal(out.length, 2, 'two identical entries collapse to one; the distinct-foundAt one stays');
  assert.equal(out[0].foundAt, e.foundAt);
  assert.equal(out[1].foundAt, other.foundAt);
});

test('mergeHints does not accumulate a byte-identical provenance entry on the same path', () => {
  const e = makeProvenanceEntry('prefix-anchored', { foundAt: '2026-07-16T05:53:45.609Z', hintGuided: true });
  const existing = [toHint([1, 2, 3], [e])];
  const merged = mergeHints(existing, [toHint([1, 2, 3], [{ ...e }])]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].provenance.length, 1, 're-merging the same event must not bloat provenance');
});

test('mergeHints keeps two genuinely distinct provenance entries for one path', () => {
  const a = makeProvenanceEntry('dfs', { foundAt: '2026-07-16T05:53:45.609Z' });
  const b = makeProvenanceEntry('beam', { foundAt: '2026-07-16T05:53:46.000Z' });
  const merged = mergeHints([toHint([1, 2], [a])], [toHint([1, 2], [b])]);
  assert.equal(merged[0].provenance.length, 2, 'a different technique finding the same path is recorded');
});

test('reconcileHints dedupes byte-identical entries while pairing paths to records', () => {
  const e = makeProvenanceEntry('repair', { randomSeed: 42, foundAt: '2026-07-16T05:53:45.609Z' });
  const out = reconcileHints([[1, 2, 3]], [toHint([1, 2, 3], [e]), toHint([1, 2, 3], [{ ...e }])]);
  assert.equal(out.length, 1);
  assert.equal(out[0].provenance.length, 1);
});
