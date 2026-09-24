#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    buildHintIngestionReceipt,
    countHintStoreSemanticUnits,
    hintIngestionReceiptFromSelectionManifest,
    validateHintIngestionReceipt,
} from './hint-ingestion-receipt-lib.mjs';

assert.deepEqual(countHintStoreSemanticUnits([
    {
        path: [1, 2],
        provenance: [
            { occurrences: [{ runId: 'a' }, { runId: 'b' }] },
            { occurrences: [] },
        ],
    },
    {
        path: [3, 4],
        provenance: [{ occurrences: [{ runId: 'c' }] }],
    },
]), { paths: 2, provenanceEvents: 3, occurrences: 3 });

const receipt = buildHintIngestionReceipt({
    producer: 'fixture-harvester',
    sourceRunId: 123,
    sourceRunAttempt: 2,
    sourceWorkflow: 'fixture-workflow',
    candidateObservations: 10,
    eligibleObservations: 8,
    refereeAcceptedObservations: 6,
    acceptedAlreadyRepresented: 2,
    semanticRecordChanges: 4,
    pathAdditions: 1,
    provenanceEventAdditions: 2,
    occurrenceAdditions: 3,
    filesChanged: 2,
    quarantinedObservations: 2,
    quarantineReasons: { 'missing-level': 1, rejected: 1 },
    corpusScope: ['corpus1'],
});
validateHintIngestionReceipt(receipt);
assert.equal(receipt.source.runId, '123');
assert.equal(receipt.source.runAttempt, '2');
assert.equal(receipt.funnel.candidateObservations, 10);
assert.equal(receipt.funnel.refereeAcceptedObservations, 6);
assert.equal(receipt.additions.paths, 1);
assert.equal(receipt.additions.provenanceEvents, 2);
assert.equal(receipt.additions.occurrences, 3);
assert.equal(receipt.semantics.notAttemptedPopulation, true);

const legacyManifest = {
    schemaVersion: 1,
    kind: 'pathfinder-hint-harvest-selection-manifest',
    source: {
        harvester: 'harvest-level-blind-report-hints',
        runId: 'run-1',
        workflow: 'solver-sweep',
        sourceRowsSeen: 20,
    },
    selection: {
        corpusScope: ['corpus1', 'corpus2'],
        solvedCandidateRowsSeen: 7,
        refereeAcceptedRows: 5,
        persistedRecordChanges: 3,
        acceptedButAlreadyRepresented: 2,
        quarantinedRows: 3,
        quarantineReasons: { mismatch: 2, rejected: 1 },
    },
};
const projected = hintIngestionReceiptFromSelectionManifest(legacyManifest);
validateHintIngestionReceipt(projected);
assert.equal(projected.funnel.candidateObservations, 7);
assert.equal(projected.funnel.eligibleObservations, 7);
assert.equal(projected.funnel.refereeAcceptedObservations, 5);
assert.equal(projected.funnel.acceptedAlreadyRepresented, 2);
assert.equal(projected.additions.semanticRecordChanges, 3);
assert.equal(projected.additions.paths, null);
assert.equal(projected.additions.provenanceEvents, null);
assert.equal(projected.additions.occurrences, null);
assert.deepEqual(projected.funnel.quarantineReasons, { mismatch: 2, rejected: 1 });

assert.throws(() => buildHintIngestionReceipt({
    producer: 'bad',
    candidateObservations: 1,
    eligibleObservations: 2,
    refereeAcceptedObservations: 0,
    acceptedAlreadyRepresented: 0,
    semanticRecordChanges: 0,
}), /eligibleObservations cannot exceed/);

assert.throws(() => buildHintIngestionReceipt({
    producer: 'bad',
    candidateObservations: 2,
    eligibleObservations: 2,
    refereeAcceptedObservations: 1,
    acceptedAlreadyRepresented: 1,
    semanticRecordChanges: 1,
}), /cannot exceed refereeAcceptedObservations/);

console.log('hint-ingestion-receipt-lib-node-test: ok');
