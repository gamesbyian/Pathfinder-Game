#!/usr/bin/env node
import assert from 'node:assert/strict';
import { joinHintDiscoveryAndFailureProcesses } from './hint-failure-process-join-lib.mjs';

const discovery = [{
    run: { runId: 'success-run', protocolHash: 'proto', solverRef: 'solver' },
    records: [
        {
            evidenceId: 'e1', parentId: 'P1', solutionSignature: '1,2,3',
            process: {
                precedingAttemptCount: 1,
                precedingAttempts: [{ outcome: 'exhausted', actionKey: 'dfs' }],
                winner: { outcome: 'solved', actionKey: 'repair' },
            },
        },
        {
            evidenceId: 'e2', parentId: 'P2', solutionSignature: '4,5,6',
            process: { precedingAttemptCount: 0, precedingAttempts: [], winner: { outcome: 'solved', actionKey: 'beam' } },
        },
    ],
}];

const failures = [{
    protocolHash: 'proto',
    solverRef: 'solver',
    records: [
        { identity: 'f1', parentId: 'P1', runId: 'failure-run-1', outcome: 'workLimited', actionKey: 'repair' },
        { identity: 'f2', parentId: 'P1', runId: 'failure-run-2', outcome: 'exhaustedNegative', actionKey: 'dfs' },
        { identity: 'f3', parentId: 'P2', runId: 'wrong-protocol', protocolHash: 'other', outcome: 'nodeLimited' },
    ],
}];

const joined = joinHintDiscoveryAndFailureProcesses(discovery, failures);
assert.equal(joined.summary.discoveryRecordsObserved, 2);
assert.equal(joined.summary.failureRecordsObserved, 3);
assert.equal(joined.summary.joinedDiscoveryRecords, 1);
assert.equal(joined.summary.discoveryRecordsWithoutComparableFailure, 1);
assert.equal(joined.summary.independentMatchedParents, 1);
assert.equal(joined.rows[0].parentId, 'P1');
assert.equal(joined.rows[0].precedingAttemptCount, 1);
assert.equal(joined.rows[0].comparableFailureRecords.length, 2);
assert.deepEqual(joined.rows[0].comparableFailureRecords.map(row => row.runId),
    ['failure-run-1', 'failure-run-2']);

console.log('hint-failure-process-join-lib-node-test: ok');
