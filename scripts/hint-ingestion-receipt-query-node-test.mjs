#!/usr/bin/env node
import assert from 'node:assert/strict';
import { summarizeHintIngestionReceipts } from './hint-ingestion-receipt-query.mjs';

const receipts = [
    {
        file: 'a.json',
        doc: {
            source: { producer: 'level-blind', runId: '1' },
            funnel: {
                candidateObservations: 10,
                eligibleObservations: 7,
                refereeAcceptedObservations: 5,
                acceptedAlreadyRepresented: 2,
                quarantinedObservations: 2,
                quarantineReasons: { mismatch: 2 },
            },
            additions: {
                semanticRecordChanges: 3,
                paths: null,
                provenanceEvents: null,
                occurrences: null,
            },
        },
    },
    {
        file: 'b.json',
        doc: {
            source: { producer: 'level-blind', runId: '2' },
            funnel: {
                candidateObservations: 4,
                eligibleObservations: 4,
                refereeAcceptedObservations: 4,
                acceptedAlreadyRepresented: 1,
                quarantinedObservations: 0,
                quarantineReasons: {},
            },
            additions: {
                semanticRecordChanges: 3,
                paths: 1,
                provenanceEvents: 2,
                occurrences: 3,
            },
        },
    },
];

const report = summarizeHintIngestionReceipts(receipts);
assert.equal(report.totals.receipts, 2);
assert.equal(report.totals.candidateObservations, 14);
assert.equal(report.totals.refereeAcceptedObservations, 9);
assert.equal(report.totals.semanticRecordChanges, 6);
assert.equal(report.totals.paths, 1);
assert.equal(report.totals.pathsUnknownReceipts, 1);
assert.equal(report.totals.provenanceEvents, 2);
assert.equal(report.totals.provenanceEventsUnknownReceipts, 1);
assert.equal(report.totals.occurrences, 3);
assert.equal(report.totals.occurrencesUnknownReceipts, 1);
assert.deepEqual(report.quarantineReasons, { mismatch: 2 });
assert.deepEqual(report.producers['level-blind'].sourceRuns, ['1', '2']);
assert.equal(report.semantics.notAttemptedPopulation, true);
assert.equal(report.runIdFilter, null);

console.log('hint-ingestion-receipt-query-node-test: ok');
