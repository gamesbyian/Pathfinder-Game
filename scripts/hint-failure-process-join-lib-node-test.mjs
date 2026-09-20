#!/usr/bin/env node
import assert from 'node:assert/strict';
import { joinHintDiscoveryAndFailureProcesses } from './hint-failure-process-join-lib.mjs';

const discovery = [{
    run: { runId: 'success-run', protocolHash: 'proto', solverRef: 'solver', populationIdentity: 'population-a' },
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
    populationIntegrity: { populationIdentityHash: 'population-a' },
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
assert.equal(joined.rows[0].populationIdentity, 'population-a');

const otherPopulation = structuredClone(failures[0]);
otherPopulation.populationIntegrity.populationIdentityHash = 'population-b';
assert.equal(
    joinHintDiscoveryAndFailureProcesses(discovery, [otherPopulation]).summary.joinedDiscoveryRecords,
    0,
    'same parent/protocol/solver in a different population must not join',
);

const ambiguousPopulation = structuredClone(failures[0]);
ambiguousPopulation.populationIntegrity.canonicalExpectedIds = [
    JSON.stringify(['corpus-1', 'P1']),
    JSON.stringify(['corpus-2', 'P1']),
];
const ambiguousJoin = joinHintDiscoveryAndFailureProcesses(discovery, [ambiguousPopulation]);
assert.equal(ambiguousJoin.summary.joinedDiscoveryRecords, 0);
assert.equal(ambiguousJoin.summary.ambiguousFailureRecords, 2,
    'raw parent ids duplicated across population scopes must abstain rather than cross-wire');
assert.equal(joined.rows[0].comparableFailureRecords.length, 2);
assert.deepEqual(joined.rows[0].comparableFailureRecords.map(row => row.runId),
    ['failure-run-1', 'failure-run-2']);

console.log('hint-failure-process-join-lib-node-test: ok');
