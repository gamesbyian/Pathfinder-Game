#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    auditFailureResponseIdentity,
    failureResponseObservationKey,
} from './failure-response-identity-audit-lib.mjs';

const base = {
    identity: 'P1',
    parentId: 'P1',
    runId: 'run-1',
    actionKey: 'a',
    stageId: 's',
    configurationKey: 'c',
    outcome: 'workLimited',
    workSpent: 100,
    attempts: null,
};
const document = { protocolHash: 'proto', solverRef: 'solver', records: [base] };

assert.equal(
    failureResponseObservationKey(document, base),
    failureResponseObservationKey(document, { ...base }),
    'property insertion order must not change the semantic observation key',
);

const exact = auditFailureResponseIdentity([
    { ...document, records: [base, { ...base }] },
]);
assert.equal(exact.records, 2);
assert.equal(exact.semanticKeys, 1);
assert.equal(exact.exactRepeatKeys, 1);
assert.equal(exact.conflictingKeys, 0);

const conflict = auditFailureResponseIdentity([
    { ...document, records: [base, { ...base, workSpent: 200 }] },
]);
assert.equal(conflict.conflictingKeys, 1);
assert.equal(conflict.collisions[0].distinctPayloads, 2);

const distinctRun = auditFailureResponseIdentity([
    { ...document, records: [base, { ...base, runId: 'run-2', workSpent: 200 }] },
]);
assert.equal(distinctRun.semanticKeys, 2);
assert.equal(distinctRun.conflictingKeys, 0);

console.log('failure-response-identity-audit-lib-node-test: ok');
