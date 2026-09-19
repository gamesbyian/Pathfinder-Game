#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    classifyHintDiscoveryReplayability,
    summarizeHintDiscoveryReplayability,
} from './hint-discovery-replayability-lib.mjs';

function baseEntry(overrides = {}) {
    return {
        solver: {
            id: 'pathfinder-solver',
            version: '0123456789abcdef0123456789abcdef01234567',
            technique: 'dfs',
            ...overrides.solver,
        },
        search: {
            workBudget: 1000,
            termination: 'solved',
            randomSeed: null,
            ...overrides.search,
        },
        context: {
            usedExistingHints: false,
            hintGuided: false,
            isolatedTechnique: false,
            levelRevision: 'v2:example',
            ...overrides.context,
        },
        foundAt: '2026-09-19T00:00:00.000Z',
    };
}

assert.deepEqual(
    classifyHintDiscoveryReplayability(baseEntry()),
    {
        replayBasis: 'configuration-reconstructable',
        reason: 'versioned-level-bound-config-with-search-envelope',
    },
);

assert.deepEqual(
    classifyHintDiscoveryReplayability(baseEntry({ search: { workBudget: null, budgetMs: null, termination: 'solved' } })),
    { replayBasis: 'identity-only', reason: 'missing-search-envelope' },
);

assert.deepEqual(
    classifyHintDiscoveryReplayability(baseEntry({
        solver: { technique: 'repair' },
        search: { workBudget: 1000, randomSeed: null },
    })),
    { replayBasis: 'identity-only', reason: 'missing-random-seed' },
);

assert.deepEqual(
    classifyHintDiscoveryReplayability(baseEntry({
        solver: { id: 'external-constraint-solver', technique: 'cp-sat' },
    })),
    { replayBasis: 'identity-only', reason: 'non-pathfinder-producer-contract' },
);

const legacy = baseEntry();
delete legacy.context.isolatedTechnique;
assert.deepEqual(
    classifyHintDiscoveryReplayability(legacy),
    { replayBasis: 'historical-unverified', reason: 'legacy-context-ambiguity' },
);

assert.deepEqual(
    classifyHintDiscoveryReplayability(baseEntry({ solver: { version: null } })),
    { replayBasis: 'historical-unverified', reason: 'missing-solver-version' },
);

const summary = summarizeHintDiscoveryReplayability([
    { path: [1, 2], provenance: [baseEntry()] },
    { path: [1, 3], provenance: [
        baseEntry({ solver: { id: 'external-constraint-solver', technique: 'cp-sat' } }),
        legacy,
    ] },
]);
assert.equal(summary.events, 3);
assert.deepEqual(summary.replayBasisCounts, {
    'configuration-reconstructable': 1,
    'identity-only': 1,
    'historical-unverified': 1,
});

console.log('hint-discovery-replayability-lib-node-test: ok');
