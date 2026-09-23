#!/usr/bin/env node
import assert from 'node:assert/strict';
import { auditHintOccurrenceSemantics } from './hint-occurrence-acceptance-audit.mjs';

const base = {
    solver: {
        id: 'pathfinder-solver',
        version: 'a'.repeat(40),
        technique: 'dfs',
        scoringProfileId: 'default',
        orderingBiasId: null,
        beamWidth: null,
        mechanicBucketRetention: false,
        gateKey: 1,
        forcing: null,
        attemptIndex: 0,
    },
    search: {
        nodesExpanded: 10,
        elapsedMs: 1,
        budgetMs: 10,
        workSpent: 100,
        workBudget: 1000,
        cumulativeNodesExpanded: 10,
        cumulativeElapsedMs: 1,
        cumulativeBudgetMs: 10,
        termination: 'solved',
        randomSeed: null,
        seedSalt: null,
    },
    context: {
        usedExistingHints: false,
        hintGuided: false,
        isolatedTechnique: false,
        levelRevision: 'v1:test',
        techniqueCensusCell: null,
    },
    execution: {
        schemaVersion: 1,
        solverRequestIdentity: 'sha256:' + '1'.repeat(64),
        protocolHash: null,
        reproducibilityMode: 'deterministic-work',
        arm: null,
    },
    occurrences: [{
        schemaVersion: 1,
        runId: 'run-1',
        runAttempt: '1',
        contractRef: null,
        observedAt: '2026-09-23T00:00:00.000Z',
        sourceRuns: null,
    }],
    foundAt: '2026-09-23T00:00:00.000Z',
};

const clean = auditHintOccurrenceSemantics([{
    id: 'L1',
    hintRecords: [{ path: [1, 2, 3], provenance: [base] }],
}]);
assert.equal(clean.provenanceEvents, 1);
assert.equal(clean.eventsWithExecution, 1);
assert.equal(clean.eventsWithOccurrences, 1);
assert.equal(clean.occurrenceRecords, 1);
assert.equal(clean.duplicateSemanticEventsWithinPath, 0);
assert.equal(clean.duplicateOccurrenceKeysWithinEvent, 0);
assert.equal(clean.occurrenceMissingRunId, 0);

const duplicateOccurrence = {
    ...base,
    occurrences: [...base.occurrences, { ...base.occurrences[0] }],
};
const bad = auditHintOccurrenceSemantics([{
    id: 'L2',
    hintRecords: [{
        path: [4, 5, 6],
        provenance: [duplicateOccurrence, { ...duplicateOccurrence }],
    }],
}]);
assert.equal(bad.duplicateSemanticEventsWithinPath, 1);
assert.equal(bad.duplicateOccurrenceKeysWithinEvent, 2,
    'each duplicated semantic entry independently contains the duplicate occurrence key');

console.log('hint-occurrence-acceptance-audit-node-test: ok');
