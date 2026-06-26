// Unit tests for modules/input/solver-core.ts — DOM-free decision/formatting logic from
// solver-controller (diverse-search summary, M:SS formatting, session staleness, extend offer).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
    buildDiverseSearchSummary,
    formatMinSec,
    isSessionStale,
    shouldOfferExtend,
} from '../modules/input/solver-core.js';

const report = (over = {}) => ({ haltedByCancel: false, haltedByMaxHints: false, errors: [], ...over });

// --- buildDiverseSearchSummary (every distinct outcome) ---

test('summary: found new hints (singular + plural) and notes session-save', () => {
    const one = buildDiverseSearchSummary([[1]], report(), true);
    assert.ok(one[0].includes('1 new hint for'));
    assert.ok(one.some((l) => l.includes('heat map')));
    const many = buildDiverseSearchSummary([[1], [2]], report(), true);
    assert.ok(many[0].includes('2 new hints for'));
});

test('summary: cancelled before finding anything', () => {
    const lines = buildDiverseSearchSummary([], report({ haltedByCancel: true }), false);
    assert.ok(lines.some((l) => l.includes('stopped before finding')));
    // Cancelled → no "extend" nudge.
    assert.ok(!lines.some((l) => l.includes('extend it to look for more')));
});

test('summary: hint limit reached', () => {
    const lines = buildDiverseSearchSummary([], report({ haltedByMaxHints: true }), false);
    assert.ok(lines.some((l) => l.includes('Hint limit reached')));
});

test('summary: budget ran out (not complete) suggests longer search + extend nudge', () => {
    const lines = buildDiverseSearchSummary([], report(), false);
    assert.ok(lines.some((l) => l.includes('time budget ran out')));
    assert.ok(lines.some((l) => l.includes('Try a longer search')));
    assert.ok(lines.some((l) => l.includes('extend it to look for more')));
});

test('summary: fully explored (complete, nothing new)', () => {
    const lines = buildDiverseSearchSummary([], report(), true);
    assert.ok(lines.some((l) => l.includes('already cover its solution variety')));
});

test('summary: appends skipped-error note (singular + plural)', () => {
    const one = buildDiverseSearchSummary([[1]], report({ errors: [1] }), true);
    assert.ok(one.some((l) => l.includes('1 search step hit an error')));
    const many = buildDiverseSearchSummary([[1]], report({ errors: [1, 2] }), true);
    assert.ok(many.some((l) => l.includes('2 search steps hit an error')));
});

// --- formatMinSec ---

test('formatMinSec: pads seconds and computes minutes', () => {
    assert.equal(formatMinSec(0), '0:00');
    assert.equal(formatMinSec(5000), '0:05');
    assert.equal(formatMinSec(65000), '1:05');
    assert.equal(formatMinSec(600000), '10:00');
});

test('formatMinSec: clamps negatives to zero', () => {
    assert.equal(formatMinSec(-5000), '0:00');
});

// --- isSessionStale ---

test('isSessionStale: true only when the level changed', () => {
    assert.equal(isSessionStale(3, 3), false);
    assert.equal(isSessionStale(3, 4), true);
});

// --- shouldOfferExtend ---

test('shouldOfferExtend: only when not complete and not cancelled', () => {
    assert.equal(shouldOfferExtend(false, false), true);
    assert.equal(shouldOfferExtend(true, false), false);
    assert.equal(shouldOfferExtend(false, true), false);
    assert.equal(shouldOfferExtend(true, true), false);
});
