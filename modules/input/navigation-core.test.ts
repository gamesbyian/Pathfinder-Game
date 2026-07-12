// Unit tests for modules/input/navigation-core.ts — DOM-free navigation/focus index math
// from navigation-controller (level/submission wrap, unsaved guard, gamepad focus math).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
    prevIndexWrap,
    nextIndexWrap,
    validIndexWrap,
    needsUnsavedGuard,
    clampFocusIndex,
    nextGroupIndex,
    wrapWithinGroup,
} from './navigation-core.js';

// --- prevIndexWrap / nextIndexWrap ---

test('prevIndexWrap: steps back, wraps first → last', () => {
    assert.equal(prevIndexWrap(2, 5), 1);
    assert.equal(prevIndexWrap(0, 5), 4);
});

test('nextIndexWrap: steps forward, wraps last → first', () => {
    assert.equal(nextIndexWrap(2, 5), 3);
    assert.equal(nextIndexWrap(4, 5), 0);
});

test('prev/nextIndexWrap: empty list → 0', () => {
    assert.equal(prevIndexWrap(0, 0), 0);
    assert.equal(nextIndexWrap(0, 0), 0);
});

test('validIndexWrap: skips missing entries while wrapping both directions', () => {
    const valid = (idx: number) => idx === 0 || idx === 160;
    assert.equal(validIndexWrap(160, 164, 1, valid), 0);
    assert.equal(validIndexWrap(0, 164, -1, valid), 160);
});

test('validIndexWrap: returns 0 when no entries are valid', () => {
    assert.equal(validIndexWrap(3, 5, 1, () => false), 0);
});

// --- needsUnsavedGuard ---

const EDITOR = 1, PLAY = 0;

test('needsUnsavedGuard: only in editor mode with pending edits', () => {
    assert.equal(needsUnsavedGuard(EDITOR, true, EDITOR), true);
    assert.equal(needsUnsavedGuard(EDITOR, false, EDITOR), false);
    assert.equal(needsUnsavedGuard(PLAY, true, EDITOR), false);
});

// --- clampFocusIndex ---

test('clampFocusIndex: clamps into [0, len-1]', () => {
    assert.equal(clampFocusIndex(5, 3), 2);
    assert.equal(clampFocusIndex(-1, 3), 0);
    assert.equal(clampFocusIndex(1, 3), 1);
});

test('clampFocusIndex: empty group → 0', () => {
    assert.equal(clampFocusIndex(2, 0), 0);
});

// --- nextGroupIndex ---

test('nextGroupIndex: advances with wraparound', () => {
    assert.equal(nextGroupIndex(0, 3), 1);
    assert.equal(nextGroupIndex(2, 3), 0);
});

test('nextGroupIndex: tolerates a -1 "not found" start', () => {
    assert.equal(nextGroupIndex(-1, 3), 0);
});

test('nextGroupIndex: empty → 0', () => {
    assert.equal(nextGroupIndex(0, 0), 0);
});

// --- wrapWithinGroup ---

test('wrapWithinGroup: wraps both directions', () => {
    assert.equal(wrapWithinGroup(0, 1, 3), 1);
    assert.equal(wrapWithinGroup(2, 1, 3), 0);
    assert.equal(wrapWithinGroup(0, -1, 3), 2);
});

test('wrapWithinGroup: empty → 0', () => {
    assert.equal(wrapWithinGroup(0, 1, 0), 0);
});
