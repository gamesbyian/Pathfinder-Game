#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    classifyHintDiscoveryReplayability,
    summarizeHintDiscoveryReplayability,
    effectiveSolverInputIdentityStatus,
} from './hint-discovery-replayability-lib.mjs';

function baseEntry(overrides = {}) {
    return {
        solver: {
            id: 'pathfinder-solver',
            version: '0123456789abcdef0123456789abcdef01234567',
            technique: 'dfs',
            scoringProfileId: 'default',
            orderingBiasId: null,
            beamWidth: null,
            mechanicBucketRetention: null,
            gateKey: 17,
            forcing: null,
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

const incompleteIdentity = effectiveSolverInputIdentityStatus(baseEntry());
assert.equal(incompleteIdentity.reconstructable, false);
assert.deepEqual(incompleteIdentity.missingDimensions, ['solverStage', 'solverRequestIdentity']);

const completeIdentity = effectiveSolverInputIdentityStatus(baseEntry(), {
    solverRequestIdentity: 'sha256:' + '2'.repeat(64),
    solverStageId: 'main-search',
});
assert.equal(completeIdentity.reconstructable, true);
assert.equal(completeIdentity.identity.attemptConfigIdentity, 'dfs|score=default|bias=none');
assert.equal(completeIdentity.identity.gateKey, 17);
assert.equal(completeIdentity.identity.solverStageId, 'main-search');

// 'repair-probe' is the historical spelling; 'early-repair-search' is its current canonical
// name (modules/solver/stage-id-normalization.mjs) — not to be confused with the SEPARATE
// 'repair-probe-shrink-recovery' -> 'repair-shrink-recovery' legacy pair.
const legacyStageIdentity = effectiveSolverInputIdentityStatus(baseEntry(), {
    solverRequestIdentity: 'sha256:' + '5'.repeat(64),
    solverStageId: 'repair-probe',
});
assert.equal(legacyStageIdentity.reconstructable, true);
assert.equal(legacyStageIdentity.identity.solverStageId, 'early-repair-search');
assert.equal(completeIdentity.identity.solverRequestIdentity, 'sha256:' + '2'.repeat(64));

// Bounded execution capsule fallback (docs/hint-evidence-execution-identity-storage-consolidation-
// plan.md section 4/W): a freshly-produced entry's own embedded execution.solverRequestIdentity is now
// a real source, not only an external sibling-evidence join.
const embeddedIdentityEntry = {
    ...baseEntry(),
    execution: { schemaVersion: 1, solverRequestIdentity: 'sha256:' + '9'.repeat(64), protocolHash: null, reproducibilityMode: 'deterministic-work', arm: null },
};
const embeddedIdentity = effectiveSolverInputIdentityStatus(embeddedIdentityEntry, { solverStageId: 'main-search' });
assert.equal(embeddedIdentity.reconstructable, true, 'the entry\'s own execution capsule must satisfy the solverRequestIdentity dimension without an external join');
assert.equal(embeddedIdentity.identity.solverRequestIdentity, 'sha256:' + '9'.repeat(64));

// An explicit caller-supplied solverRequestIdentity still takes precedence over the embedded one.
const overriddenIdentity = effectiveSolverInputIdentityStatus(embeddedIdentityEntry, {
    solverRequestIdentity: 'sha256:' + '8'.repeat(64),
    solverStageId: 'main-search',
});
assert.equal(overriddenIdentity.identity.solverRequestIdentity, 'sha256:' + '8'.repeat(64));

// A historical entry with no execution capsule at all still has no signal -- never fabricated.
const noExecutionIdentity = effectiveSolverInputIdentityStatus(baseEntry(), { solverStageId: 'main-search' });
assert.equal(noExecutionIdentity.reconstructable, false);
assert.deepEqual(noExecutionIdentity.missingDimensions, ['solverRequestIdentity']);

const repairIdentity = effectiveSolverInputIdentityStatus(baseEntry({
    solver: {
        technique: 'repair',
        scoringProfileId: 'repair',
        gateKey: 9,
        forcing: { repairMustTurnBiased: true, repairTurnBiased: false },
    },
    search: { workBudget: 1000, randomSeed: 123, seedSalt: 2 },
}), {
    solverRequestIdentity: 'sha256:' + '3'.repeat(64),
    solverStageId: 'late-repair-search',
});
assert.equal(repairIdentity.reconstructable, true);
assert.equal(repairIdentity.identity.attemptConfigIdentity,
    'repair|score=repair|guidance=must-turn-biased');
assert.equal(repairIdentity.identity.randomSeed, 123);
assert.equal(repairIdentity.identity.seedSalt, 2);

const missingSeed = effectiveSolverInputIdentityStatus(baseEntry({
    solver: { technique: 'repair', scoringProfileId: 'repair', gateKey: 9 },
    search: { workBudget: 1000, randomSeed: null },
}), {
    solverRequestIdentity: 'sha256:' + '4'.repeat(64),
    solverStageId: 'repair-fallback',
});
assert.equal(missingSeed.reconstructable, false);
assert.ok(missingSeed.missingDimensions.includes('randomSeed'));

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
