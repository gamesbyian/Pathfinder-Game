import assert from 'node:assert/strict';
import { test } from 'vitest';
import { normalizeSchedulerMode } from './scheduler-mode-normalization.mjs';

test('normalizeSchedulerMode accepts canonical values unchanged', () => {
    assert.equal(normalizeSchedulerMode('production'), 'production');
    assert.equal(normalizeSchedulerMode('legacy-latency-portfolio-experiment'), 'legacy-latency-portfolio-experiment');
    assert.equal(normalizeSchedulerMode('static-portfolio'), 'static-portfolio');
});

test('normalizeSchedulerMode maps every legacy alias to its canonical form', () => {
    assert.equal(normalizeSchedulerMode('legacy'), 'production');
    assert.equal(normalizeSchedulerMode('portfolio-experiment'), 'legacy-latency-portfolio-experiment');
});

test('normalizeSchedulerMode throws on an unrecognized or omitted value', () => {
    assert.throws(() => normalizeSchedulerMode('not-a-mode'), /--scheduler-mode must be one of/);
    assert.throws(() => normalizeSchedulerMode(undefined), /--scheduler-mode must be one of/);
});
