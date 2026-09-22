#!/usr/bin/env node
import assert from 'node:assert/strict';
import { auditHintFile, hintDiscoveryInputIdentity, inputComparability } from './hint-determinism-audit-lib.mjs';

function entry({ foundAt, nodesExpanded = 10, workSpent = 20, technique = 'main-search', randomSeed = null } = {}) {
    return {
        solver: {
            id: 'pathfinder-solver', version: 'abc123', technique,
            beamWidth: 100, gateKey: 1, forcing: { gateKey: 1 }, attemptIndex: 0,
            scoringProfileId: 'flat', orderingBiasId: null, mechanicBucketRetention: null,
        },
        search: {
            nodesExpanded, elapsedMs: 1, budgetMs: 1000, workSpent, workBudget: 100,
            cumulativeNodesExpanded: null, cumulativeElapsedMs: null, cumulativeBudgetMs: null,
            termination: 'solved', randomSeed, seedSalt: null,
        },
        context: {
            usedExistingHints: false, hintGuided: false, levelRevision: 'v2:level',
            isolatedTechnique: false, techniqueCensusCell: null,
        },
        foundAt,
    };
}

assert.equal(inputComparability(entry()).comparable, true);
const hintDependent = entry();
hintDependent.context.usedExistingHints = true;
assert.equal(inputComparability(hintDependent).comparable, false);
const randomized = entry({ technique: 'repair' });
assert.equal(inputComparability(randomized).reason, 'missing-random-seed');

const a = entry({ foundAt: '2026-01-01T00:00:00Z' });
const b = entry({ foundAt: '2026-01-02T00:00:00Z', nodesExpanded: 99, workSpent: 88 });
assert.equal(hintDiscoveryInputIdentity(a), hintDiscoveryInputIdentity(b), 'outputs must not change input identity');

const stable = auditHintFile('P1', [
    { path: [1, 2, 3], provenance: [a] },
    { path: [1, 2, 3], provenance: [b] },
]);
assert.equal(stable.repeatRunStable.length, 1);
assert.equal(stable.repeatRunRecordedInputCollision.length, 0);

const divergent = auditHintFile('P1', [
    { path: [1, 2, 3], provenance: [a] },
    { path: [1, 4, 3], provenance: [b] },
]);
assert.equal(divergent.repeatRunRecordedInputCollision.length, 1);

const exactA = entry({ foundAt: '2026-01-01T00:00:00Z' });
const exactB = JSON.parse(JSON.stringify(exactA));
exactB.foundAt = '2026-01-03T00:00:00Z';
const exact = auditHintFile('P1', [
    { path: [1, 2, 3], provenance: [exactA] },
    { path: [1, 4, 3], provenance: [exactB] },
]);
assert.equal(exact.exactEventCrossPath.length, 1);

console.log('hint-determinism-audit tests: 6 passed, 0 failed');
