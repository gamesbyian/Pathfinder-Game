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
    classifyEvidenceApplicability,
    provenanceDependencyStratum,
    hasApplicableEvidence,
    isProductionContextEvidence,
    hasExplicitCapabilityContext,
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

test('evidence applicability is purpose-dependent rather than a global useful flag', () => {
    const variant = entry({
        solver: { id: 'variant-corpus-diagnostic', technique: 'variant-parent-replay:F1:P1:V7', version: 'v1' },
    });
    assert.equal(classifyEvidenceApplicability(variant, 'positive-oracle').applicability, 'admissible');
    assert.equal(classifyEvidenceApplicability(variant, 'solution-atlas').applicability, 'admissible');
    assert.equal(classifyEvidenceApplicability(variant, 'current-production-capability', {
        currentSolverVersion: 'v1',
    }).applicability, 'inadmissible');
    assert.equal(classifyEvidenceApplicability(variant, 'technique-performance').applicability, 'inadmissible');
    assert.equal(provenanceDependencyStratum(variant), 'variant-family:F1:parent:P1');
});

test('current capability requires an explicit matching regime and strict cold context', () => {
    const cold = entry({ solver: { version: 'v2' } });
    assert.equal(classifyEvidenceApplicability(cold, 'current-production-capability').applicability, 'context-bound');
    assert.equal(classifyEvidenceApplicability(cold, 'current-production-capability', {
        currentSolverVersion: 'v2',
    }).applicability, 'admissible');
    assert.equal(classifyEvidenceApplicability(cold, 'current-production-capability', {
        currentSolverVersion: 'v3',
    }).applicability, 'context-bound');
    const contaminated = entry({ solver: { version: 'v2' }, context: { usedExistingHints: true } });
    assert.equal(classifyEvidenceApplicability(contaminated, 'current-production-capability', {
        currentSolverVersion: 'v2',
    }).applicability, 'inadmissible');
    const randomized = entry({ solver: { version: 'v2' }, search: { randomSeed: 7 } });
    assert.equal(classifyEvidenceApplicability(randomized, 'current-production-capability', {
        currentSolverVersion: 'v2',
    }).applicability, 'admissible', 'a production repair seed is not automatically research-only');
    const enumeration = entry({ solver: { version: 'v2' }, search: { termination: 'exhaustive' } });
    assert.equal(classifyEvidenceApplicability(enumeration, 'current-production-capability', {
        currentSolverVersion: 'v2',
    }).reason, 'enumeration-context');
    assert.equal(isProductionContextEvidence(cold), true);
    assert.equal(isProductionContextEvidence(randomized), true);
    assert.equal(isProductionContextEvidence(enumeration), false);
    assert.equal(isProductionContextEvidence(contaminated), false);
    const ambiguousLegacy = { ...cold, context: { hintGuided: false, usedExistingHints: false } };
    assert.equal(hasExplicitCapabilityContext(ambiguousLegacy), false);
    assert.equal(isProductionContextEvidence(ambiguousLegacy), false);
    assert.equal(classifyEvidenceApplicability(ambiguousLegacy, 'current-production-capability', {
        currentSolverVersion: 'v2',
    }).reason, 'legacy-context-ambiguity');
    const unknownVersion = { ...cold, solver: { ...cold.solver, version: null } };
    assert.equal(isProductionContextEvidence(unknownVersion), false);
    assert.equal(classifyEvidenceApplicability(unknownVersion, 'current-production-capability', {
        currentSolverVersion: 'v2',
    }).reason, 'unknown-solver-regime');
});

test('technique performance requires isolated Pathfinder work evidence', () => {
    const isolated = entry({ solver: { version: 'v2' }, context: { isolatedTechnique: true } });
    assert.equal(classifyEvidenceApplicability(isolated, 'technique-performance').applicability, 'context-bound');
    assert.equal(classifyEvidenceApplicability(isolated, 'technique-performance', {
        comparableSolverVersions: ['v2'],
    }).applicability, 'context-bound');
    assert.equal(classifyEvidenceApplicability(isolated, 'technique-performance', {
        comparableSolverVersions: ['v2'],
    }).reason, 'positive-only-success-needs-run-denominator');
    assert.equal(classifyEvidenceApplicability(isolated, 'technique-performance', {
        comparableSolverVersions: ['v3'],
    }).applicability, 'context-bound');
    const noWork = entry({
        solver: { version: 'v2' }, context: { isolatedTechnique: true }, search: { workSpent: null },
    });
    assert.equal(classifyEvidenceApplicability(noWork, 'technique-performance').applicability, 'context-bound');
});

test('unknown evidence purposes fail closed', () => {
    assert.throws(() => classifyEvidenceApplicability(entry(), 'generic-useful'), /unknown evidence purpose/);
});

test('hint-level applicability preserves unattributed atlas paths and rejects them for capability', () => {
    const hint = { path: [1, 2], provenance: [] };
    assert.equal(hasApplicableEvidence(hint, 'solution-atlas'), true);
    assert.equal(hasApplicableEvidence(hint, 'current-production-capability', {
        comparableSolverVersions: ['v1'],
    }), false);
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
