import assert from 'node:assert/strict';

import { buildPopulationIntegrity } from './solver-experiment-contract.mjs';
import { combinePopulationIntegrity } from './combine-population-integrity.mjs';
import { summarizeIndependentSupport } from './research-relations-lib.mjs';
import { classifyProbeProcess } from './stress/cpsat-explicit-prefix-reference-lib.mjs';

const shardAExpected = ['case,1', 'case:2'];
const shardBExpected = ['case,1', 'case:3'];

const shardA = buildPopulationIntegrity(shardAExpected, [
    { id: 'case,1', ok: true, status: 'success' },
    { id: 'case:2', ok: false, status: 'infeasible' },
]);
const shardBPartial = buildPopulationIntegrity(shardBExpected, [
    { id: 'case,1', ok: false, status: 'timeout' },
]);

const interrupted = combinePopulationIntegrity([
    { label: 'cut:alpha', integrity: shardA },
    { label: 'cut,beta', integrity: shardBPartial },
], { kind: 'research-transaction-fixture' });

assert.equal(interrupted.coverageComplete, false);
assert.equal(interrupted.decisionValidComplete, false);
assert.deepEqual(interrupted.missingIds, ['cut,beta:case:3']);
assert.equal(interrupted.outcomes.deadlineTruncated, 1);
assert.equal(interrupted.identityCodec, 'json-tuple-v1');
assert.deepEqual(interrupted.canonicalExpectedIds, [
    '["cut:alpha","case,1"]',
    '["cut:alpha","case:2"]',
    '["cut,beta","case,1"]',
    '["cut,beta","case:3"]',
]);

// Indeterminate execution outcomes remain indeterminate scientific evidence.
const indeterminate = buildPopulationIntegrity(['timeout', 'harness', 'unknown'], [
    { id: 'timeout', ok: false, status: 'timeout' },
    { id: 'harness', ok: false, status: 'harness-error', error: 'fixture failure' },
    { id: 'unknown', ok: false, status: 'unparsed' },
]);
assert.equal(indeterminate.coverageComplete, true);
assert.equal(indeterminate.decisionValidComplete, false);
assert.deepEqual(
    { deadlineTruncated: indeterminate.outcomes.deadlineTruncated, harnessError: indeterminate.outcomes.harnessError, unknown: indeterminate.outcomes.unknown },
    { deadlineTruncated: 1, harnessError: 1, unknown: 1 },
);

// Exact/reference abstention is not DEAD.
assert.deepEqual(
    classifyProbeProcess({ stdout: 'SKIPPED (unsupported mechanic)', stderr: '', exitCode: 3 }),
    { label: 'timeout/abstain', reason: 'unsupported-mechanics' },
);
assert.equal(classifyProbeProcess({ stdout: '-> UNKNOWN', exitCode: 0 }).label, 'timeout/abstain');

// Pseudoreplication guard: many descendants inside one parent remain one independent unit.
const support = summarizeIndependentSupport([
    { parentId: 'parent-1', stateId: 'a' },
    { parentId: 'parent-1', stateId: 'b' },
    { parentId: 'parent-1', stateId: 'c' },
    { parentId: 'parent-2', stateId: 'd' },
], 'parentId');
assert.equal(support.rows, 4);
assert.equal(support.independentUnits, 2);
assert.equal(support.largestUnitRows, 3);

// Recovery reuses the immutable expected population and replaces only the failed/incomplete
// acquisition component. No solver/reference recomputation is needed for shard A.
const shardBRecovered = buildPopulationIntegrity(shardBExpected, [
    { id: 'case,1', ok: false, status: 'infeasible' },
    { id: 'case:3', ok: true, status: 'success' },
]);
const recovered = combinePopulationIntegrity([
    { label: 'cut:alpha', integrity: shardA },
    { label: 'cut,beta', integrity: shardBRecovered },
], { kind: 'research-transaction-fixture' });

assert.equal(recovered.coverageComplete, true);
assert.equal(recovered.decisionValidComplete, true);
assert.deepEqual(recovered.missingIds, []);
assert.equal(recovered.observedCount, 4);
assert.equal(recovered.expectedCount, 4);

// Recombination order is not part of the scientific population identity.
const recoveredReordered = combinePopulationIntegrity([
    { label: 'cut,beta', integrity: shardBRecovered },
    { label: 'cut:alpha', integrity: shardA },
], { kind: 'research-transaction-fixture' });
assert.equal(recovered.populationIdentityHash, recoveredReordered.populationIdentityHash);

// Repeated local IDs under distinct semantic scopes remain distinct scientific subjects.
assert.equal(new Set(recovered.canonicalExpectedIds).size, 4);

console.log('research transaction recovery/identity fixture passed');
