import { describe, test } from 'vitest';
import assert from 'node:assert/strict';
import { classifyRow, buildMap, bestProgressOf, lifecycleStageOrder } from './lifecycle-failure-map.mjs';

// Test fixtures own their vocabulary. Production stage discovery must come from artifact telemetry,
// not from an analyzer-maintained registry that can fall behind orchestration.
const FIXTURE_STAGES = [
    'early-repair-search',
    'main-search',
    'repair-fallback',
    'goal-attraction-disabled-retry',
    'admissible-order-fallback',
];

function lifecycle(overrides = {}) {
    const base = Object.fromEntries(FIXTURE_STAGES.map(name => [name, {
        mechanicallyEligible: true, instantiated: true, reached: false,
        skippedBecauseSolvedEarlier: false, starvedByNodeBudget: false, starvedByWorkBudget: false,
        skippedByRoutingOrConfiguration: false, exhaustedSearchSpace: false, stoppedByDeadline: false,
        allocatedNodeCeilings: [], allocatedWorkCeilings: [], actualNodes: 0, actualWork: 0,
        attempts: 0, bestProgress: [],
    }]));
    for (const [name, patch] of Object.entries(overrides)) {
        base[name] = { ...(base[name] ?? {
            mechanicallyEligible: true, instantiated: true, reached: false,
            skippedBecauseSolvedEarlier: false, starvedByNodeBudget: false, starvedByWorkBudget: false,
            skippedByRoutingOrConfiguration: false, exhaustedSearchSpace: false, stoppedByDeadline: false,
            allocatedNodeCeilings: [], allocatedWorkCeilings: [], actualNodes: 0, actualWork: 0,
            attempts: 0, bestProgress: [],
        }), ...patch };
    }
    return base;
}

function row(overrides = {}) {
    return {
        id: 'R00001', level: 1, ok: false, status: 'node-budget-reached',
        nodesExpanded: 0, workSpent: 0, stageLifecycle: lifecycle(), ...overrides,
    };
}

describe('classifyRow', () => {
    test('throws on a row missing stageLifecycle rather than silently misclassifying', () => {
        assert.throws(() => classifyRow({ id: 'R00001', ok: false }), /stageLifecycle/u);
    });

    test('dual-reads historical techniqueLifecycle artifacts', () => {
        const historical = { id: 'old', level: 1, ok: true, status: 'success',
            techniqueLifecycle: lifecycle({ 'main-search': { reached: true } }) };
        assert.equal(classifyRow(historical).winningTechnique, 'main-search');
    });

    test('a solved row is bucketed solved regardless of other technique state', () => {
        const r = row({ ok: true, stageLifecycle: lifecycle({ 'main-search': { reached: true } }) });
        assert.equal(classifyRow(r).bucket, 'solved');
        assert.equal(classifyRow(r).winningTechnique, 'main-search');
    });

    test('attributes a solve to a later stage unknown to older analyzers', () => {
        const r = row({ ok: true, stageLifecycle: lifecycle({
            'main-search': { reached: true, exhaustedSearchSpace: true },
            'admissible-order-fallback': { reached: true, exhaustedSearchSpace: true },
            'admissible-order-alternate-tiebreak-retry': { reached: true, exhaustedSearchSpace: true },
            'connectivity-axis-prune-disabled-retry': { reached: true, exhaustedSearchSpace: false },
            'future-stage-added-after-this-test': { reached: false },
        }) });
        assert.equal(classifyRow(r).winningTechnique, 'connectivity-axis-prune-disabled-retry');
        assert.deepEqual(buildMap([r]).winningTechnique, { 'connectivity-axis-prune-disabled-retry': 1 });
    });

    test('deadline-truncated outranks everything else — indeterminate, not a failure bucket', () => {
        const r = row({ deadlineTruncated: true, stageLifecycle: lifecycle({ 'main-search': { reached: true, starvedByNodeBudget: true } }) });
        assert.equal(classifyRow(r).bucket, 'deadline-truncated');
    });

    test('attempt-error outranks starvation/capping', () => {
        const r = row({ hadAttemptError: true, stageLifecycle: lifecycle({ 'main-search': { reached: true, starvedByNodeBudget: true } }) });
        assert.equal(classifyRow(r).bucket, 'attempt-error');
    });

    test('a runnable technique that never got a node is starved, not capped', () => {
        const r = row({ stageLifecycle: lifecycle({
            'main-search': { reached: true, exhaustedSearchSpace: false },
            'repair-fallback': { reached: false, starvedByNodeBudget: true },
        }) });
        assert.equal(classifyRow(r).bucket, 'starved');
        assert.deepEqual(classifyRow(r).starvedTechniques, ['repair-fallback']);
    });

    test('every reached technique exhausting its space (no starvation) is exhausted, not capped', () => {
        const r = row({ stageLifecycle: lifecycle({
            'main-search': { reached: true, exhaustedSearchSpace: true },
        }) });
        assert.equal(classifyRow(r).bucket, 'exhausted');
    });

    test('reached but not exhausted and not starved is capped — genuinely ran out of budget mid-search', () => {
        const r = row({ stageLifecycle: lifecycle({
            'main-search': { reached: true, exhaustedSearchSpace: false },
        }) });
        assert.equal(classifyRow(r).bucket, 'capped');
    });

    test('a level with no reached technique at all (nothing ran) is unclassified', () => {
        assert.equal(classifyRow(row()).bucket, 'unclassified');
    });
});

describe('stage discovery', () => {
    test('unions newly introduced stage names from telemetry without a fixed registry', () => {
        const oldRow = row({ id: 'old' });
        const newRow = row({ id: 'new', stageLifecycle: lifecycle({
            'brand-new-retry-stage': { reached: true, actualNodes: 10, actualWork: 20 },
        }) });
        assert.deepEqual(lifecycleStageOrder([oldRow, newRow]), [
            ...FIXTURE_STAGES,
            'brand-new-retry-stage',
        ]);
        const map = buildMap([oldRow, newRow]);
        assert.equal(map.techniques['brand-new-retry-stage'].reached, 1);
        assert.equal(map.techniques['brand-new-retry-stage'].nodes, 10);
    });
});

describe('bestProgressOf', () => {
    test('picks the lowest badness across techniques, from either bestBadness or finalBadness', () => {
        const l = lifecycle({
            'main-search': { bestProgress: [{ nodes: 10, bestBadness: 9, finalBadness: null }] },
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
            row({ id: 'R00001', ok: true, nodesExpanded: 1000, stageLifecycle: lifecycle({ 'main-search': { reached: true } }) }),
            row({ id: 'R00002', nodesExpanded: 500000, stageLifecycle: lifecycle({
                'main-search': { reached: true, exhaustedSearchSpace: true },
                'repair-fallback': { reached: false, starvedByNodeBudget: true, skippedByRoutingOrConfiguration: false },
            }) }),
        ];
        const map = buildMap(rows, { nodeBudget: 1000000 });
        assert.equal(map.population.levels, 2);
        assert.equal(map.population.solved, 1);
        const bucketTotal = Object.values(map.buckets).reduce((sum, bucket) => sum + bucket.levels, 0);
        assert.equal(bucketTotal, 2);
        // The solved row's untouched techniques must not count toward the unsolved-only census.
        assert.equal(map.techniques['early-repair-search'].instantiated, 1);
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