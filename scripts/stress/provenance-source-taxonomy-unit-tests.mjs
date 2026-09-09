import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
    PROVENANCE_SOURCES,
    classifyProvenanceSource,
    sourcesForHint,
    summarizeProvenanceEvidence,
} from './provenance-source-taxonomy.mjs';

const entry = (overrides = {}) => ({
    solver: {
        id: 'pathfinder-solver',
        technique: 'dfs',
        scoringProfileId: null,
        orderingBiasId: null,
        beamWidth: null,
        mechanicBucketRetention: null,
        gateKey: null,
        forcing: null,
        attemptIndex: null,
        ...overrides.solver,
    },
    search: {
        nodesExpanded: 10,
        elapsedMs: 1,
        budgetMs: 100,
        workSpent: 20,
        workBudget: 1000,
        cumulativeNodesExpanded: 10,
        cumulativeElapsedMs: 1,
        cumulativeBudgetMs: 100,
        termination: 'solved',
        randomSeed: null,
        seedSalt: null,
        ...overrides.search,
    },
    context: {
        usedExistingHints: false,
        hintGuided: false,
        levelRevision: 'rev',
        isolatedTechnique: false,
        ...overrides.context,
    },
    foundAt: '2026-09-09T00:00:00Z',
});

test('granular taxonomy keeps non-production evidence classes distinct', () => {
    assert.equal(classifyProvenanceSource(entry({ solver: { id: 'stress-generator-witness' } })), 'witness');
    assert.equal(classifyProvenanceSource(entry({ solver: { id: 'sibling-inherited-witness' } })), 'inherited-witness');
    assert.equal(classifyProvenanceSource(entry({ solver: { id: 'sibling-transformed-witness' } })), 'transformed-witness');
    assert.equal(classifyProvenanceSource(entry({ solver: { id: 'human-player' } })), 'human-solved');
    assert.equal(classifyProvenanceSource(entry({ solver: { id: 'external-constraint-solver' } })), 'external-constraint-solver');
    assert.equal(classifyProvenanceSource(entry({ solver: { id: 'variant-corpus-diagnostic' } })), 'variant-parent-replay');
    assert.equal(PROVENANCE_SOURCES.includes('variant-parent-replay'), true);
});

test('retry-tier and isolated technique evidence never collapse into ordinary production', () => {
    assert.equal(classifyProvenanceSource(entry({ context: { isolatedTechnique: true } })), 'isolated-technique');
    assert.equal(classifyProvenanceSource(entry({ solver: { forcing: { retryTier: 'late-repair-multiseed-retry' } } })), 'production-retry-tier');
    assert.equal(classifyProvenanceSource(entry()), 'production-solver');
});

test('source precedence protects external and variant evidence from generic randomized bucketing', () => {
    assert.equal(classifyProvenanceSource(entry({
        solver: { id: 'external-constraint-solver' },
        search: { randomSeed: 42 },
    })), 'external-constraint-solver');
    assert.equal(classifyProvenanceSource(entry({
        solver: { id: 'variant-corpus-diagnostic' },
        search: { randomSeed: 42 },
    })), 'variant-parent-replay');
});

test('same path discovered independently belongs to every relevant source bucket', () => {
    const hint = {
        path: [1, 2, 3],
        provenance: [
            entry(),
            entry({ solver: { id: 'external-constraint-solver' } }),
            entry({ solver: { id: 'variant-corpus-diagnostic' } }),
        ],
    };
    assert.deepEqual([...sourcesForHint(hint)].sort(), [
        'external-constraint-solver',
        'production-solver',
        'variant-parent-replay',
    ]);
});

test('summary reports source events, source-overlap hints, and unattributed hints separately', () => {
    const hints = [
        { path: [1, 2], provenance: [entry(), entry({ solver: { id: 'external-constraint-solver' } })] },
        { path: [3, 4], provenance: [] },
    ];
    const summary = summarizeProvenanceEvidence(hints);
    assert.equal(summary.hints, 2);
    assert.equal(summary.provenanceEntries, 2);
    assert.equal(summary.unattributedHints, 1);
    assert.equal(summary.multiSourceHints, 1);
    assert.equal(summary.sourceEvents['production-solver'], 1);
    assert.equal(summary.sourceEvents['external-constraint-solver'], 1);
    assert.equal(summary.sourceHints.other, 1);
    assert.equal(summary.sourceOverlapPairs['external-constraint-solver x production-solver'], 1);
});
