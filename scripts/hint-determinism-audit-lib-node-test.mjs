#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    auditHintFile,
    hintDiscoveryInputIdentity,
    inputComparability,
} from './hint-determinism-audit-lib.mjs';

function entry(overrides = {}) {
    return {
        solver: {
            id: 'pathfinder-solver',
            version: 'a'.repeat(40),
            technique: 'dfs',
            beamWidth: null,
            gateKey: 1,
            forcing: null,
            attemptIndex: 0,
            scoringProfileId: 'default',
            orderingBiasId: null,
            mechanicBucketRetention: false,
            ...overrides.solver,
        },
        search: {
            workBudget: 1000,
            randomSeed: null,
            seedSalt: null,
            ...overrides.search,
        },
        context: {
            usedExistingHints: false,
            hintGuided: false,
            levelRevision: 'v1:test',
            isolatedTechnique: false,
            techniqueCensusCell: null,
            ...overrides.context,
        },
        foundAt: overrides.foundAt ?? '2026-09-23T00:00:00.000Z',
        ...(overrides.execution ? { execution: overrides.execution } : {}),
    };
}

const legacy = entry();
assert.deepEqual(inputComparability(legacy), {
    comparable: true,
    reason: 'deterministic-input-envelope',
    identityBasis: 'legacy-recorded-input',
});

const canonical = entry({
    execution: {
        schemaVersion: 1,
        solverRequestIdentity: 'sha256:' + '1'.repeat(64),
        protocolHash: 'protocol-a',
        reproducibilityMode: 'deterministic-work',
        arm: null,
    },
});
assert.equal(inputComparability(canonical).identityBasis, 'canonical-solver-request');
assert.notEqual(hintDiscoveryInputIdentity(canonical), hintDiscoveryInputIdentity(legacy),
    'canonical request/protocol identity must distinguish a modern observation from a legacy approximation');

const raced = entry({
    execution: {
        schemaVersion: 1,
        solverRequestIdentity: 'sha256:' + '1'.repeat(64),
        protocolHash: 'protocol-a',
        reproducibilityMode: 'first-success-race',
        arm: null,
    },
});
assert.deepEqual(inputComparability(raced), {
    comparable: false,
    reason: 'first-success-race-not-path-deterministic',
});

const result = auditHintFile('L1', [
    { path: [1, 2], provenance: [
        canonical,
        { ...canonical, foundAt: '2026-09-24T00:00:00.000Z' },
    ] },
    { path: [1, 3], provenance: [
        legacy,
        { ...legacy, foundAt: '2026-09-24T00:00:00.000Z' },
        raced,
    ] },
]);
assert.equal(result.provenanceEvents, 5);
assert.equal(result.comparableEvents, 4);
assert.equal(result.canonicalComparableEvents, 2);
assert.equal(result.legacyComparableEvents, 2);
assert.equal(result.excludedReasons['first-success-race-not-path-deterministic'], 1);
assert.equal(result.repeatRunStable.length, 2);
assert.deepEqual(
    result.repeatRunStable.map(row => row.identityBasis).sort(),
    ['canonical-solver-request', 'legacy-recorded-input'],
);

console.log('hint-determinism-audit-lib-node-test: ok');
