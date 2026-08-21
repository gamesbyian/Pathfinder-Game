#!/usr/bin/env node
/**
 * Unit coverage for hint-cost-drift-lib.mjs's budget-bucketing fix. Regression tests for the exact
 * collision measured on 2026-07-29 (see reports/2026-07-29-hint-cost-drift-triage.md): a
 * nearest-second bucket silently merged 554ms and 888ms (a 60% difference, both "1 second"),
 * misattributing 59 of 153 "drifted" groups (38.6%) to a single outlier commit whose provenance
 * came from a diagnostic run with categorically smaller total budgets than the standard sweeps.
 */
import assert from 'node:assert/strict';
import { budgetBucket, configKeyOf, techniqueFamily } from './hint-cost-drift-lib.mjs';

let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        process.exitCode = 1;
        console.error(`  ✗ ${name}\n    ${err.message}`);
    }
}

// ── The exact real-world collision this fix closes ──────────────────────────

test('budgetBucket separates 554ms from 888ms (60% apart — the R02175/S00108/R03253 collision)', () => {
    assert.notEqual(budgetBucket(554), budgetBucket(888));
});

test('budgetBucket separates 78ms from 20000ms (the S00108 diagnostic-run extreme)', () => {
    assert.notEqual(budgetBucket(78), budgetBucket(20000));
});

test('budgetBucket separates 312ms from 8000ms (the R02752 diagnostic-run extreme)', () => {
    assert.notEqual(budgetBucket(312), budgetBucket(8000));
});

// ── What must still match: ordinary per-attempt jitter ──────────────────────

test('budgetBucket still merges 5862ms and 5872ms (0.2% apart — P00110\'s ordinary jitter)', () => {
    assert.equal(budgetBucket(5862), budgetBucket(5872));
});

test('budgetBucket still merges values ~3% apart (312ms vs 320ms)', () => {
    assert.equal(budgetBucket(312), budgetBucket(320));
});

test('budgetBucket is stable for identical inputs', () => {
    assert.equal(budgetBucket(8000), budgetBucket(8000));
});

test('budgetBucket treats 0/undefined as its own bucket, not a crash', () => {
    assert.equal(budgetBucket(0), 0);
});

// ── configKeyOf / techniqueFamily ────────────────────────────────────────────

test('techniqueFamily strips a colon-suffixed variant to its family', () => {
    assert.equal(techniqueFamily('enumerate-targeted:admissible-slack'), 'enumerate-targeted');
    assert.equal(techniqueFamily('dfs'), 'dfs');
    assert.equal(techniqueFamily(undefined), 'unknown');
});

test('configKeyOf differs when budget differs by 60%, matches on everything else', () => {
    const base = { solver: { technique: 'dfs', profile: 'objectiveFirst' }, search: {} };
    const a = { ...base, search: { budgetMs: 554 } };
    const b = { ...base, search: { budgetMs: 888 } };
    assert.notEqual(configKeyOf(a), configKeyOf(b));
});

test('configKeyOf matches when budget jitters by a fraction of a percent', () => {
    const base = { solver: { technique: 'repair', profile: 'repair' }, search: {} };
    const a = { ...base, search: { budgetMs: 5862 } };
    const b = { ...base, search: { budgetMs: 5872 } };
    assert.equal(configKeyOf(a), configKeyOf(b));
});

test('configKeyOf differs on profile even with identical budget', () => {
    const a = { solver: { technique: 'dfs', profile: 'perimeterSweep' }, search: { budgetMs: 8000 } };
    const b = { solver: { technique: 'dfs', profile: 'objectiveFirst' }, search: { budgetMs: 8000 } };
    assert.notEqual(configKeyOf(a), configKeyOf(b));
});

console.log(`\nhint-cost-drift-lib tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
