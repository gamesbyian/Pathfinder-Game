#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    buildHintDiscoveryIngestionObservation,
    hintFromDiscoveryIngestionObservation,
    validateHintDiscoveryIngestionObservation,
} from './hint-discovery-ingestion-projection-lib.mjs';

const provenance = {
    solver: { id: 'pathfinder-solver', version: 'a'.repeat(40), technique: 'dfs' },
    search: { termination: 'solved' },
    context: { levelRevision: 'v1:test' },
    occurrences: [{
        schemaVersion: 1,
        runId: 'run-1',
        runAttempt: '2',
        contractRef: null,
        observedAt: '2026-09-23T00:00:00.000Z',
        sourceRuns: null,
    }],
    foundAt: '2026-09-23T00:00:00.000Z',
};

const observation = buildHintDiscoveryIngestionObservation({
    producer: 'fixture-producer',
    sourceArtifact: 'artifact/report.json',
    sourceRunId: 'run-1',
    sourceRunAttempt: 2,
    corpus: 'data/levels.json',
    levelId: 'P00001',
    levelRevision: 'v1:test',
    path: [1, 2, 3],
    provenance,
});
assert.equal(observation.kind, 'pathfinder-hint-discovery-ingestion-observation');
assert.equal(observation.source.runAttempt, '2');
assert.equal(observation.pathSignature, '1,2,3');
assert.deepEqual(validateHintDiscoveryIngestionObservation(observation), observation);
assert.deepEqual(hintFromDiscoveryIngestionObservation(observation), {
    path: [1, 2, 3],
    provenance: [provenance],
});

assert.throws(() => buildHintDiscoveryIngestionObservation({
    producer: 'fixture',
    corpus: 'data/levels.json',
    levelId: 'P00001',
    levelRevision: 'wrong-revision',
    path: [1, 2, 3],
    provenance,
}), /levelRevision must match/);

assert.throws(() => buildHintDiscoveryIngestionObservation({
    producer: 'fixture',
    sourceRunId: 'other-run',
    corpus: 'data/levels.json',
    levelId: 'P00001',
    levelRevision: 'v1:test',
    path: [1, 2, 3],
    provenance,
}), /occurrence lineage must contain/);

console.log('hint-discovery-ingestion-projection-lib-node-test: ok');
