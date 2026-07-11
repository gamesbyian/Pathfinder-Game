// Unit tests for modules/input/review-core.ts — DOM-free approval decision logic from
// review-controller (hint-addition classification, no-hint fallback, hint re-validation).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
    classifyApproval,
    decideApprovalFallback,
    revalidateWorkingHints,
} from './review-core.js';

// --- classifyApproval ---

test('classifyApproval: hintAddition type with a published target is a non-local hint addition', () => {
    assert.deepEqual(classifyApproval({ type: 'hintAddition', targetPublishedLevelId: 'pub1' }), { isHintAddition: true, isLocal: false });
});

test('classifyApproval: hintAddition type without a target is NOT a hint addition', () => {
    assert.deepEqual(classifyApproval({ type: 'hintAddition' }), { isHintAddition: false, isLocal: false });
});

test('classifyApproval: a plain submission is not a hint addition', () => {
    assert.deepEqual(classifyApproval({ type: 'level', targetPublishedLevelId: 'pub1' }), { isHintAddition: false, isLocal: false });
    assert.deepEqual(classifyApproval({}), { isHintAddition: false, isLocal: false });
});

test('classifyApproval: localHintAddition type with a local target is a local hint addition', () => {
    assert.deepEqual(
        classifyApproval({ type: 'localHintAddition', targetLocalLevelFingerprint: 'fp1' }),
        { isHintAddition: true, isLocal: true },
    );
});

test('classifyApproval: localHintAddition type without a target is NOT a hint addition', () => {
    assert.deepEqual(classifyApproval({ type: 'localHintAddition' }), { isHintAddition: false, isLocal: false });
});

// --- decideApprovalFallback ---

test('decideApprovalFallback: a solver solution is always used', () => {
    assert.equal(decideApprovalFallback(false, true), 'use-solution');
    assert.equal(decideApprovalFallback(true, true), 'use-solution');
});

test('decideApprovalFallback: no solution on a hint-addition recommends rejecting', () => {
    assert.equal(decideApprovalFallback(true, false), 'reject-recommended');
});

test('decideApprovalFallback: no solution on a plain submission asks to confirm publish', () => {
    assert.equal(decideApprovalFallback(false, false), 'confirm-publish');
});

// --- revalidateWorkingHints ---

const okValidator = (path: any) => ({ ok: true, path });

test('revalidateWorkingHints: empty / missing hints → empty array', () => {
    assert.deepEqual(revalidateWorkingHints(undefined, okValidator), []);
    assert.deepEqual(revalidateWorkingHints(null, okValidator), []);
    assert.deepEqual(revalidateWorkingHints([], okValidator), []);
});

test('revalidateWorkingHints: keeps valid hints, drops invalid, de-dupes', () => {
    const validate = (p: any) => (p[0] === 0 ? { ok: false, path: p } : { ok: true, path: p });
    const out = revalidateWorkingHints([[1, 2], [0, 0], [1, 2]], validate);
    assert.deepEqual(out, [[1, 2]]);
});
