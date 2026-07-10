// Unit tests for modules/input/solver-core.ts — DOM-free decision/formatting logic for the Solve
// variety search (outcome summary, tier config, M:SS formatting, session staleness, extend offer).
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
    buildVarietySearchSummary,
    VARIETY_TIERS,
    customTier,
    FIND_ALL_TIER,
    FIND_ALL_NOCAP_TIER,
    formatMinSec,
    isSessionStale,
    shouldOfferExtend,
} from './solver-core.js';

const sum = (over = {}) => buildVarietySearchSummary(
    { outcome: 'target', savedCount: 10, curatedCount: 5, ...over },
    { target: 5, maxHints: 1000, mode: 'targeted' },
);

// --- buildVarietySearchSummary: reports saved AND curated counts, honest per outcome ---

test('summary: saves are reported with the heat-map note', () => {
    const lines = sum({ savedCount: 3 });
    assert.ok(lines[0].includes('3 new solutions'));
    assert.ok(lines.some(l => l.includes('heat map')));
});

test('summary: target reached names both curated and requested counts', () => {
    const lines = sum({ outcome: 'target', savedCount: 40, curatedCount: 5 });
    assert.ok(lines.some(l => l.includes('5 varied approaches') && l.includes('goal was 5')));
});

test('summary: saturated explains the variety ceiling', () => {
    const lines = sum({ outcome: 'saturated', savedCount: 6, curatedCount: 6 });
    assert.ok(lines.some(l => l.includes('meaningfully-different')));
});

test('summary: exhaustive claims completeness only here', () => {
    const lines = sum({ outcome: 'exhaustive', savedCount: 6, curatedCount: 4 });
    assert.ok(lines.some(l => l.includes('every solution to this level')));
});

test('summary: capped says more solutions exist and names the cap', () => {
    const lines = buildVarietySearchSummary(
        { outcome: 'capped', savedCount: 1000, curatedCount: 15 },
        { target: 100, maxHints: 1000, mode: 'targeted' },
    );
    assert.ok(lines.some(l => l.includes('1000-hint maximum') && l.includes('more solutions exist')));
});

test('summary: cancelled Find-all states partial preservation explicitly', () => {
    const lines = buildVarietySearchSummary(
        { outcome: 'cancelled', savedCount: 42, curatedCount: 15 },
        { target: 25, maxHints: 1000, mode: 'complete' },
    );
    assert.ok(lines.some(l => l.includes('complete search was not finished') && l.includes('42 new solutions')));
});

test('summary: appends skipped-error note (singular + plural)', () => {
    assert.ok(sum({ errorsCount: 1 }).some(l => l.includes('1 search step hit an error')));
    assert.ok(sum({ errorsCount: 2 }).some(l => l.includes('2 search steps hit an error')));
});

test('summary: no-new-solutions phrasing for a saturated re-search', () => {
    const lines = sum({ outcome: 'saturated', savedCount: 0, curatedCount: 8 });
    assert.ok(lines.some(l => l.includes('already cover this level')));
    assert.ok(!lines.some(l => l.includes('Saved')));
});

// --- tiers ---

test('tiers: preset targets and ceilings, custom scales, find-all is complete + unbounded', () => {
    assert.equal(VARIETY_TIERS.few.target, 5);
    assert.equal(VARIETY_TIERS.lots.target, 100);
    assert.ok(VARIETY_TIERS.many.ceilingMs > VARIETY_TIERS.few.ceilingMs);
    assert.equal(customTier(50).target, 50);
    assert.ok(customTier(1000).ceilingMs <= 120000, 'ceiling is clamped');
    assert.equal(FIND_ALL_TIER.complete, true);
    assert.equal(FIND_ALL_TIER.ceilingMs, Infinity);
    assert.equal(FIND_ALL_TIER.maxHints, 1000);
    assert.equal(FIND_ALL_TIER.hardCap, undefined);
});

test('tiers: find-all-no-cap soft-stops at 2,500 with a 5,000 hard cap', () => {
    assert.equal(FIND_ALL_NOCAP_TIER.complete, true);
    assert.equal(FIND_ALL_NOCAP_TIER.ceilingMs, Infinity);
    assert.equal(FIND_ALL_NOCAP_TIER.maxHints, 2500);
    assert.equal(FIND_ALL_NOCAP_TIER.hardCap, 5000);
});

// --- formatMinSec ---

test('formatMinSec: pads seconds, computes minutes, clamps negatives', () => {
    assert.equal(formatMinSec(0), '0:00');
    assert.equal(formatMinSec(65000), '1:05');
    assert.equal(formatMinSec(-5000), '0:00');
});

// --- isSessionStale / shouldOfferExtend ---

test('isSessionStale: true only when the level changed', () => {
    assert.equal(isSessionStale(3, 3), false);
    assert.equal(isSessionStale(3, 4), true);
});

test('shouldOfferExtend: only for the budget (timed-out) outcome', () => {
    assert.equal(shouldOfferExtend('budget'), true);
    assert.equal(shouldOfferExtend('target'), false);
    assert.equal(shouldOfferExtend('exhaustive'), false);
    assert.equal(shouldOfferExtend('cancelled'), false);
});
