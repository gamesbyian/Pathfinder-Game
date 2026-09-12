import assert from 'node:assert/strict';
import { assertCompatibleExperiments, buildPopulationIntegrity, classifyRow, hashConfiguration, hashPopulation } from './solver-experiment-contract.mjs';

const a = hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['b', 'a'] });
const b = hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a', 'b'] });
assert.equal(a.identityHash, b.identityHash);
assert.throws(() => hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a', 'a'] }), /duplicate/);
assert.equal(hashConfiguration({ b: 2, a: 1 }), hashConfiguration({ a: 1, b: 2 }));

const integrity = buildPopulationIntegrity(['a', 'b', 'c'], [
  { id: 'a', ok: true }, { id: 'b', status: 'deadline-truncated' }, { id: 'x', error: 'boom' },
]);
assert.deepEqual(integrity.missingIds, ['c']);
assert.deepEqual(integrity.unexpectedIds, ['x']);
assert.equal(integrity.outcomes.solved, 1);
assert.equal(integrity.outcomes.deadlineTruncated, 1);
assert.equal(integrity.outcomes.harnessError, 1);
assert.equal(integrity.coverageComplete, false);
assert.equal(integrity.decisionValidComplete, false);
assert.equal(integrity.complete, false);

const structurallyCompleteButIndeterminate = buildPopulationIntegrity(['a', 'b'], [
  { id: 'a', ok: true }, { id: 'b', status: 'deadline-truncated' },
]);
assert.equal(structurallyCompleteButIndeterminate.coverageComplete, true);
assert.equal(structurallyCompleteButIndeterminate.complete, true);
assert.equal(structurallyCompleteButIndeterminate.decisionValidComplete, false);

const decisionValid = buildPopulationIntegrity(['a', 'b', 'c'], [
  { id: 'a', ok: true }, { id: 'b', status: 'node-budget-exhausted' }, { id: 'c', status: 'exhausted' },
]);
assert.equal(decisionValid.coverageComplete, true);
assert.equal(decisionValid.decisionValidComplete, true);
assert.equal(classifyRow({ id: 'z', status: 'node-budget-exhausted' }), 'nodeLimited');
assert.equal(classifyRow({ cellId: 'T1-1', status: 'exhausted' }), 'exhaustedNegative');

const common = { experiment: { workflowFamily: 'f', producer: 'p' }, execution: { levelBlind: true, historyAware: false, schedulerMode: 'production' }, population: { identityHash: a.identityHash } };
const clone = value => JSON.parse(JSON.stringify(value));
assert.equal(assertCompatibleExperiments(common, clone(common), { paired: true }), true);
assert.throws(() => assertCompatibleExperiments(common, { ...clone(common), population: { identityHash: 'different' } }, { paired: true }), /population.identityHash/);
console.log('solver experiment contract tests passed');
