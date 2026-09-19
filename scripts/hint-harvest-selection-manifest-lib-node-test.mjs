#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    buildHintHarvestSelectionManifest,
    validateHintHarvestSelectionManifest,
} from './hint-harvest-selection-manifest-lib.mjs';

const manifest = buildHintHarvestSelectionManifest({
    sourceRunId: '123',
    sourceWorkflow: 'solver-sweep',
    sourceReportsSeen: 2,
    sourceRowsSeen: 20,
    solvedCandidateRowsSeen: 7,
    refereeAcceptedRows: 5,
    persistedRecordChanges: 3,
    reportsHarvested: 1,
    selectionPolicy: 'solved rows from eligible level-blind reports; current referee validation',
    corpusScope: ['corpus1', 'corpus2'],
    pending: [
        { reason: 'referee-rejected', solvedRow: { id: 'A' } },
        { reason: 'corpus-hash-mismatch', solvedRows: [{ id: 'B' }, { id: 'C' }] },
    ],
});

validateHintHarvestSelectionManifest(manifest);
assert.equal(manifest.source.harvester, 'harvest-level-blind-report-hints');
assert.equal(manifest.selection.solvedCandidateRowsSeen, 7);
assert.equal(manifest.selection.refereeAcceptedRows, 5);
assert.equal(manifest.selection.persistedRecordChanges, 3);
assert.equal(manifest.selection.acceptedButAlreadyRepresented, 2);
assert.equal(manifest.selection.quarantinedRows, 3);
assert.deepEqual(manifest.selection.quarantineReasons, {
    'corpus-hash-mismatch': 2,
    'referee-rejected': 1,
});
assert.equal(manifest.semantics.notAttemptedPopulation, true);
assert.match(manifest.semantics.selectionInterpretation, /cannot estimate solve rate/u);

assert.throws(() => buildHintHarvestSelectionManifest({
    sourceReportsSeen: 1,
    sourceRowsSeen: 1,
    solvedCandidateRowsSeen: 1,
    refereeAcceptedRows: 2,
    persistedRecordChanges: 0,
    reportsHarvested: 0,
}), /cannot exceed/);

console.log('hint-harvest-selection-manifest-lib-node-test: ok');
