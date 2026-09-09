import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
    PROVENANCE_ORIGINS,
    PROVENANCE_FACETS,
    classifyProvenanceOrigin,
    provenanceFacets,
    originsForHint,
    facetsForHint,
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

test('origin taxonomy keeps genuinely different producers distinct', () => {
    assert.equal(classifyProvenanceOrigin(entry({ solver: { id: 'stress-generator-witness' } })), 'witness');
    assert.equal(classifyProvenanceOrigin(entry({ solver: { id: 'sibling-inherited-witness' } })), 'inherited-witness');
    assert.equal(classifyProvenanceOrigin(entry({ solver: { id: 'sibling-transformed-witness' } })), 'transformed-witness');
    assert.equal(classifyProvenanceOrigin(entry({ solver: { id: 'human-player' } })), 'human-solved');
    assert.equal(classifyProvenanceOrigin(entry({ solver: { id: 'external-constraint-solver' } })), 'external-constraint-solver');
    assert.equal(classifyProvenanceOrigin(entry({ solver: { id: 'variant-corpus-diagnostic' } })), 'variant-parent-replay');
    assert.equal(classifyProvenanceOrigin(entry()), 'pathfinder-solver');
    assert.equal(PROVENANCE_ORIGINS.includes('variant-parent-replay'), true);
});

test('search modality is orthogonal to origin instead of competing for one source label', () => {
    const e = entry({
        solver: { forcing: { retryTier: 'late-repair-multiseed-retry' } },
        search: { termination: 'exhaustive', randomSeed: 42 },
        context: { isolatedTechnique: true, hintGuided: true, usedExistingHints: true },
    });
    assert.equal(classifyProvenanceOrigin(e), 'pathfinder-solver');
    assert.deepEqual([...provenanceFacets(e)].sort(), [
        'complete-enumeration',
        'hint-guided',
        'isolated-technique',
        'production-retry-tier',
        'randomized',
        'used-existing-hints',
    ]);
    assert.equal(PROVENANCE_FACETS.length, 6);
});

test('external and variant origins keep their modality facets', () => {
    const external = entry({
        solver: { id: 'external-constraint-solver' },
        search: { randomSeed: 42 },
        context: { usedExistingHints: true },
    });
    assert.equal(classifyProvenanceOrigin(external), 'external-constraint-solver');
    assert.deepEqual([...provenanceFacets(external)].sort(), ['randomized', 'used-existing-hints']);

    const variant = entry({
        solver: { id: 'variant-corpus-diagnostic' },
        context: { hintGuided: true },
    });
    assert.equal(classifyProvenanceOrigin(variant), 'variant-parent-replay');
    assert.deepEqual([...provenanceFacets(variant)], ['hint-guided']);
});

test('same path discovered independently belongs to every relevant origin and facet bucket', () => {
    const hint = {
        path: [1, 2, 3],
        provenance: [
            entry({ search: { randomSeed: 7 } }),
            entry({ solver: { id: 'external-constraint-solver' } }),
            entry({ solver: { id: 'variant-corpus-diagnostic' }, context: { hintGuided: true } }),
        ],
    };
    assert.deepEqual([...originsForHint(hint)].sort(), [
        'external-constraint-solver',
        'pathfinder-solver',
        'variant-parent-replay',
    ]);
    assert.deepEqual([...facetsForHint(hint)].sort(), ['hint-guided', 'randomized']);
});

test('summary reports origin, facet, admissibility, retry-tier, and overlap telemetry separately', () => {
    const hints = [
        {
            path: [1, 2],
            provenance: [
                entry({ solver: { forcing: { retryTier: 'repair-retry' } } }),
                entry({ solver: { id: 'external-constraint-solver' } }),
            ],
        },
        { path: [3, 4], provenance: [] },
    ];
    const summary = summarizeProvenanceEvidence(hints);
    assert.equal(summary.hints, 2);
    assert.equal(summary.provenanceEntries, 2);
    assert.equal(summary.unattributedHints, 1);
    assert.equal(summary.multiOriginHints, 1);
    assert.equal(summary.originEvents['pathfinder-solver'], 1);
    assert.equal(summary.originEvents['external-constraint-solver'], 1);
    assert.equal(summary.originHints.other, 1);
    assert.equal(summary.originOverlapPairs['external-constraint-solver x pathfinder-solver'], 1);
    assert.equal(summary.facetEvents['production-retry-tier'], 1);
    assert.equal(summary.retryTierEvents['repair-retry'], 1);
    assert.equal(summary.strictAdmissibilityEvents['cold-capability'], 1);
    assert.equal(summary.strictAdmissibilityEvents.unknown, 1);
});
