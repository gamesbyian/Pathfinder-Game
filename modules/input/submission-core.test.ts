// Unit tests for modules/input/submission-core.ts — the DOM-free decision logic extracted
// from submission-controller (hint cycling/wrap, validated-hint dedupe, duplicate verdicts).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
    nextHintCycleIndex,
    collectValidatedUniqueHints,
    selectNovelHints,
    resolveHintAdditionVerdict,
    pendingDuplicateNovelCount,
    clampReviewIndex,
    findLocalCorpusMatchByLevelFingerprint,
} from './submission-core.js';

// --- nextHintCycleIndex (hint cycling / wrap) ---

test('nextHintCycleIndex: starts at 0 when source is not "saved"', () => {
    assert.equal(nextHintCycleIndex('none', 3, 5), 0);
    assert.equal(nextHintCycleIndex('solver', 2, 5), 0);
});

test('nextHintCycleIndex: advances by one when already cycling saved hints', () => {
    assert.equal(nextHintCycleIndex('saved', 0, 5), 1);
    assert.equal(nextHintCycleIndex('saved', 3, 5), 4);
});

test('nextHintCycleIndex: wraps past the end back to 0', () => {
    assert.equal(nextHintCycleIndex('saved', 4, 5), 0);
});

test('nextHintCycleIndex: returns 0 for an empty hint list (no division by zero)', () => {
    assert.equal(nextHintCycleIndex('saved', 0, 0), 0);
    assert.equal(nextHintCycleIndex('none', 0, 0), 0);
});

// --- collectValidatedUniqueHints (submission dedupe) ---

const okValidator = (path: any) => ({ ok: true, path });

test('collectValidatedUniqueHints: keeps accepted paths, preserves order', () => {
    const out = collectValidatedUniqueHints([[1, 2], [3, 4]], okValidator);
    assert.deepEqual(out, [[1, 2], [3, 4]]);
});

test('collectValidatedUniqueHints: drops rejected (non-ok) and null results', () => {
    const validate = (p: any) => (p[0] === 9 ? { ok: false, path: p } : p[0] === 8 ? null : { ok: true, path: p });
    const out = collectValidatedUniqueHints([[9, 0], [8, 0], [1, 1]], validate);
    assert.deepEqual(out, [[1, 1]]);
});

test('collectValidatedUniqueHints: de-duplicates by canonical (validated) form', () => {
    // Validator canonicalizes both candidates to the same path — only one survives.
    const validate = () => ({ ok: true, path: [1, 2, 3] });
    const out = collectValidatedUniqueHints([[3, 2, 1], [1, 2, 3]], validate);
    assert.deepEqual(out, [[1, 2, 3]]);
});

test('collectValidatedUniqueHints: empty input yields empty output', () => {
    assert.deepEqual(collectValidatedUniqueHints([], okValidator), []);
});

// --- selectNovelHints ---

test('selectNovelHints: returns candidates not present in existing (by signature)', () => {
    const out = selectNovelHints([[1, 2], [3, 4]], [[1, 2]]);
    assert.deepEqual(out, [[3, 4]]);
});

test('selectNovelHints: all novel when existing is empty/omitted', () => {
    assert.deepEqual(selectNovelHints([[1, 2]]), [[1, 2]]);
    assert.deepEqual(selectNovelHints([[1, 2]], []), [[1, 2]]);
});

test('selectNovelHints: none novel when all already exist', () => {
    assert.deepEqual(selectNovelHints([[1, 2], [3, 4]], [[1, 2], [3, 4]]), []);
});

// --- resolveHintAdditionVerdict ---

test('resolveHintAdditionVerdict: no target → proceed with all hints', () => {
    const v = resolveHintAdditionVerdict([[1, 2], [3, 4]], null);
    assert.equal(v.ok, true);
    assert.deepEqual(v.hintsToSubmit, [[1, 2], [3, 4]]);
    assert.equal(v.targetPublishedLevelId, null);
    assert.equal(v.novelCount, 2);
});

test('resolveHintAdditionVerdict: target with novel hints → contribute the novel subset', () => {
    const v = resolveHintAdditionVerdict([[1, 2], [3, 4]], { id: 'pub1', hints: [[1, 2]] });
    assert.equal(v.ok, true);
    assert.deepEqual(v.hintsToSubmit, [[3, 4]]);
    assert.equal(v.targetPublishedLevelId, 'pub1');
    assert.equal(v.novelCount, 1);
});

test('resolveHintAdditionVerdict: target already has all hints → blocked', () => {
    const v = resolveHintAdditionVerdict([[1, 2]], { id: 'pub1', hints: [[1, 2]] });
    assert.equal(v.ok, false);
    assert.deepEqual(v.hintsToSubmit, []);
    assert.equal(v.novelCount, 0);
});

test('resolveHintAdditionVerdict: target without id → null targetPublishedLevelId', () => {
    const v = resolveHintAdditionVerdict([[5, 6]], { hints: [] });
    assert.equal(v.ok, true);
    assert.equal(v.targetPublishedLevelId, null);
});

test('resolveHintAdditionVerdict: target with id but no hints field → all hints novel', () => {
    const v = resolveHintAdditionVerdict([[5, 6]], { id: 'pub2' });
    assert.equal(v.ok, true);
    assert.deepEqual(v.hintsToSubmit, [[5, 6]]);
    assert.equal(v.targetPublishedLevelId, 'pub2');
});

// --- findLocalCorpusMatchByLevelFingerprint ---

test('findLocalCorpusMatchByLevelFingerprint: no match → null', () => {
    const match = findLocalCorpusMatchByLevelFingerprint([{ levelNumber: 1, levelFingerprint: 'a' }], 'b');
    assert.equal(match, null);
});

test('findLocalCorpusMatchByLevelFingerprint: null target fingerprint → null', () => {
    const match = findLocalCorpusMatchByLevelFingerprint([{ levelNumber: 1, levelFingerprint: 'a' }], null);
    assert.equal(match, null);
});

test('findLocalCorpusMatchByLevelFingerprint: match → level number and fingerprint', () => {
    const match = findLocalCorpusMatchByLevelFingerprint(
        [{ levelNumber: 1, levelFingerprint: 'a' }, { levelNumber: 42, levelFingerprint: 'b' }],
        'b',
    );
    assert.deepEqual(match, { levelNumber: 42, levelFingerprint: 'b' });
});

// --- resolveHintAdditionVerdict: local-corpus match ---

test('resolveHintAdditionVerdict: local match with novel hints → contribute the novel subset', () => {
    const localMatch = { levelNumber: 42, levelFingerprint: 'fp-42' };
    const v = resolveHintAdditionVerdict([[1, 2], [3, 4]], null, localMatch, [[1, 2]]);
    assert.equal(v.ok, true);
    assert.deepEqual(v.hintsToSubmit, [[3, 4]]);
    assert.equal(v.targetPublishedLevelId, null);
    assert.deepEqual(v.targetLocalLevelMatch, localMatch);
    assert.equal(v.novelCount, 1);
});

test('resolveHintAdditionVerdict: local match already has all hints → blocked', () => {
    const localMatch = { levelNumber: 42, levelFingerprint: 'fp-42' };
    const v = resolveHintAdditionVerdict([[1, 2]], null, localMatch, [[1, 2]]);
    assert.equal(v.ok, false);
    assert.deepEqual(v.hintsToSubmit, []);
    assert.equal(v.targetLocalLevelMatch, null);
    assert.equal(v.novelCount, 0);
});

test('resolveHintAdditionVerdict: local match takes precedence over a Firestore target', () => {
    const localMatch = { levelNumber: 42, levelFingerprint: 'fp-42' };
    const v = resolveHintAdditionVerdict([[1, 2]], { id: 'pub1', hints: [] }, localMatch, []);
    assert.equal(v.targetPublishedLevelId, null);
    assert.deepEqual(v.targetLocalLevelMatch, localMatch);
});

// --- pendingDuplicateNovelCount ---

test('pendingDuplicateNovelCount: 0 when no pending match', () => {
    assert.equal(pendingDuplicateNovelCount([[1, 2]], null), 0);
});

test('pendingDuplicateNovelCount: counts novel hints against the pending submission', () => {
    assert.equal(pendingDuplicateNovelCount([[1, 2], [3, 4]], { hints: [[1, 2]] }), 1);
    assert.equal(pendingDuplicateNovelCount([[1, 2]], { hints: [[1, 2]] }), 0);
    assert.equal(pendingDuplicateNovelCount([[1, 2]], {}), 1);
});

// --- clampReviewIndex ---

test('clampReviewIndex: clamps to last valid index', () => {
    assert.equal(clampReviewIndex(5, 3), 2);
    assert.equal(clampReviewIndex(1, 3), 1);
});

test('clampReviewIndex: never negative (empty list → 0)', () => {
    assert.equal(clampReviewIndex(5, 0), 0);
    assert.equal(clampReviewIndex(0, 0), 0);
});

// ── §3 addition: duplicate-check presentation ─────────────────────────────────────

import { describeDuplicateCheck } from './submission-core.js';

test('describeDuplicateCheck: pending-queue match defers with a pending handle', () => {
  const dup = { id: 'sub1', source: 'pending', hints: [[1]] };
  const v = describeDuplicateCheck({ levelFingerprint: 'fp', duplicate: dup });
  assert.equal(v.levelFingerprint, 'fp');
  assert.equal(v.pendingDuplicateMatch, dup);
  assert.equal(v.hintAdditionTarget, null);
  assert.equal(v.step.state, 'warn');
  assert.match(v.step.details as string, /already waiting for review/);
});

test('describeDuplicateCheck: published match becomes a hint-addition target', () => {
  const dup = { id: 'pub1', source: 'approved', hints: [] };
  const v = describeDuplicateCheck({ levelFingerprint: 'fp2', duplicate: dup });
  assert.equal(v.pendingDuplicateMatch, null);
  assert.equal(v.hintAdditionTarget, dup);
  assert.equal(v.step.state, 'warn');
  assert.match(v.step.details as string, /already-published level/);
});

test('describeDuplicateCheck: clean result is ok; unchecked collections degrade to a warning', () => {
  const clean = describeDuplicateCheck({ levelFingerprint: 'fp3', warnings: [] });
  assert.deepEqual(clean.step, { state: 'ok', details: 'No duplicate found in pending or approved levels' });
  assert.equal(clean.pendingDuplicateMatch, null);
  assert.equal(clean.hintAdditionTarget, null);

  const partial = describeDuplicateCheck({ levelFingerprint: null, warnings: ['approved', 'pending'] });
  assert.equal(partial.step.state, 'warn');
  assert.match((partial.step.details as string[])[1], /Could not check: approved levels, pending queue/);

  const missing = describeDuplicateCheck(undefined);
  assert.equal(missing.levelFingerprint, null);
  assert.equal(missing.step.state, 'ok');
});
