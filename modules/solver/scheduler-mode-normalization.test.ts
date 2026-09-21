import assert from 'node:assert/strict';
import { test } from 'vitest';
import { normalizeHistoricalSchedulerMode, normalizeSchedulerMode } from './scheduler-mode-normalization.mjs';

test('normalizeSchedulerMode accepts canonical current values unchanged', () => {
    assert.equal(normalizeSchedulerMode('production'), 'production');
    assert.equal(normalizeSchedulerMode('legacy-latency-portfolio-experiment'), 'legacy-latency-portfolio-experiment');
    assert.equal(normalizeSchedulerMode('static-portfolio'), 'static-portfolio');
});

test('normalizeSchedulerMode rejects retired scheduler spellings as fresh input', () => {
    assert.throws(() => normalizeSchedulerMode('legacy'), /--scheduler-mode must be one of/);
    assert.throws(() => normalizeSchedulerMode('portfolio-experiment'), /--scheduler-mode must be one of/);
});

test('normalizeHistoricalSchedulerMode decodes retained historical spellings explicitly', () => {
    assert.equal(normalizeHistoricalSchedulerMode('legacy'), 'production');
    assert.equal(normalizeHistoricalSchedulerMode('portfolio-experiment'), 'legacy-latency-portfolio-experiment');
    assert.equal(normalizeHistoricalSchedulerMode('production'), 'production');
});

test('scheduler mode parsing rejects an unrecognized or omitted value', () => {
    assert.throws(() => normalizeSchedulerMode('not-a-mode'), /--scheduler-mode must be one of/);
    assert.throws(() => normalizeSchedulerMode(undefined), /--scheduler-mode must be one of/);
    assert.throws(() => normalizeHistoricalSchedulerMode('not-a-mode'), /--scheduler-mode must be one of/);
});
