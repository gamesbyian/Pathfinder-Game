import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { classifyRow, buildMap, bestProgressOf, TECHNIQUES } from './lifecycle-failure-map.mjs';

function lifecycle(overrides = {}) {
    const base = Object.fromEntries(TECHNIQUES.map(name => [name, {
        mechanicallyEligible: true, instantiated: true, reached: false,
        skippedBecauseSolvedEarlier: false, starvedByNodeBudget: false, starvedByWorkBudget: false,
        skippedByRoutingOrConfiguration: false, exhaustedSearchSpace: false, stoppedByDeadline: false,
        allocatedNodeCeilings: [], allocatedWorkCeilings: [], actualNodes: 0, actualWork: 0,
        attempts: 0, bestProgress: [],
    }]));
    for (const [name, patch] of Object.entries(overrides)) base[name] = { ...base[name], ...patch };
    return base;
}

function row(overrides = {}) {
    return {
        id: 'R00001', level: 1, ok: false, status: 'node-budget-reached',
        nodesExpanded: 0, workSpent: 0, techniqueLifecycle: lifecycle(), ...overrides,
    };
}

describe('classifyRow', () => {
    test('throws on a row missing techniqueLifecycle rather than silently misclassifying', () => {
        assert.throws(() => classifyRow({ id: 'R00001', ok: false }), /techniqueLifecycle/u);
    });

    test('a solved row is bucketed solved regardless of other technique state', () => {
        const r = row({ ok: true, techniqueLifecycle: lifecycle({ 'main-ladder': { reached: true } }) });
        assert.equal(classifyRow(r).bucket, 'solved');
        assert.equal(classifyRow(r).winningTechnique, 'main-ladder');
    });

    test('deadline-truncated outranks everything else — indeterminate, not a failure bucket', () => {
        const r = row({ deadlineTruncated: true, techniqueLifecycle: lifecycle({ 'main-ladder': { reached: true, starvedByNodeBudget: true } }) });
        assert.equal(classifyRow(r).bucket, 'deadline-truncated');
    });

    test('attempt-error outranks starvation/capping', () => {
        const r = row({ hadAttemptError: true, techniqueLifecycle: lifecycle({ 'main-ladder': { reached: true, starvedByNodeBudget: true } }) });
        assert.equal(classifyRow(r).bucket, 'attempt-error');
    });

    test('a runnable technique that never got a node is starved, not capped', () => {
        const r = row({ techniqueLifecycle: lifecycle({
            'main-ladder': { reached: true, exhaustedSearchSpace: false },
            'repair-fallback': { reached: false, starvedByNodeBudget: true },
        }) });
        assert.equal(classifyRow(r).bucket, 'starved');
        assert.deepEqual(classifyRow(r).starvedTechniques, ['repair-fallback']);
    });

    test('every reached technique exhausting its space (no starvation) is exhausted, not capped', () => {
        const r = row({ techniqueLifecycle: lifecycle({
            'main-ladder': { reached: true, exhaustedSearchSpace: true },
        }) });
        assert.equal(classifyRow(r).bucket, 'exhausted');
    });

    test('reached but not exhausted and not starved is capped — genuinely ran out of budget mid-search', () => {
        const r = row({ techniqueLifecycle: lifecycle({
            'main-ladder': { reached: true, exhaustedSearchSpace: false },
        }) });
        assert.equal(classifyRow(r).bucket, 'capped');
    });

    test('a level with no reached technique at all (nothing ran) is unclassified', () => {
        assert.equal(classifyRow(row()).bucket, 'unclassified');
    });
});

describe('bestProgressOf', () => {
    test('picks the lowest badness across techniques, from either bestBadness or finalBadness', () => {
        const l = lifecycle({
            'main-ladder': { bestProgress: [{ nodes: 10, bestBadness: 9, finalBadness: null }] },
            'repair-fallback': { bestProgress: [{ nodes: 20, bestBadness: null, finalBadness: 3 }] },
        });
        const { bestBadness, bestBadnessTechnique } = bestProgressOf(l);
        assert.equal(bestBadness, 3);
        assert.equal(bestBadnessTechnique, 'repair-fallback');
    });

    test('returns null when no technique ever scored', () => {
        assert.deepEqual(bestProgressOf(lifecycle()), { bestBadness: null, bestBadnessTechnique: null });
    });
});

describe('buildMap', () => {
    test('buckets sum to the full population and technique census only covers unsolved rows', () => {
        const rows = [
            row({ id: 'R00001', ok: true, nodesExpanded: 1000, techniqueLifecycle: lifecycle({ 'main-ladder': { reached: true } }) }),
            row({ id: 'R00002', nodesExpanded: 500000, techniqueLifecycle: lifecycle({
                'main-ladder': { reached: true, exhaustedSearchSpace: true },
                'repair-fallback': { reached: false, starvedByNodeBudget: true, skippedByRoutingOrConfiguration: false },
            }) }),
        ];
        const map = buildMap(rows, { nodeBudget: 1000000 });
        assert.equal(map.population.levels, 2);
        assert.equal(map.population.solved, 1);
        const bucketTotal = Object.values(map.buckets).reduce((sum, b) => sum + b.levels, 0);
        assert.equal(bucketTotal, 2);
        // The solved row's untouched techniques must not count toward the unsolved-only census.
        assert.equal(map.techniques['repair-probe'].instantiated, 1);
    });

    test('solve-cost quantiles only include solved rows, keyed to the shared nodeBudget', () => {
        const rows = [
            row({ id: 'R00001', ok: true, nodesExpanded: 900000 }),
            row({ id: 'R00002', nodesExpanded: 500000 }),
        ];
        const map = buildMap(rows, { nodeBudget: 1000000 });
        assert.equal(map.solveCost.max, 900000);
        assert.equal(map.solveCost.marginalSolves.above75pctOfBudget, 1);
    });
});
