import assert from 'node:assert/strict';
import {
  assertCompatibleExperiments,
  buildPopulationIntegrity,
  classifyRow,
  decisionContractIssues,
  declaredDecisionContractIssues,
  hashConfiguration,
  hashPopulation,
  isImmutableCommitSha,
} from './solver-experiment-contract.mjs';

const a = hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['b', 'a'] });
const b = hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a', 'b'] });
assert.equal(a.identityHash, b.identityHash);
assert.throws(() => hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a', 'a'] }), /duplicate/);
assert.equal(hashConfiguration({ b: 2, a: 1 }), hashConfiguration({ a: 1, b: 2 }));
assert.equal(isImmutableCommitSha('a'.repeat(40)), true);
assert.equal(isImmutableCommitSha('main'), false);

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

const configurationHash = hashConfiguration({ budget: 100 });
const common = {
  experiment: {
    workflowFamily: 'f', producer: 'p', entrypoint: 'e', configurationHash,
    resolvedSha: 'a'.repeat(40),
  },
  population: {
    kind: 'explicit-ids', identityBasis: 'stable-level-id', identityHash: a.identityHash,
    corpusIdentity: 'sha256:' + '1'.repeat(64),
  },
  execution: {
    levelBlind: true, historyAware: false, historicalInputs: [], reproducibilityExpected: true,
    producerFamily: 'f', schedulerMode: 'production',
  },
  limits: {
    cumulativeNodeCeiling: 100, initialWorkAllocation: 120, totalWorkCeiling: null,
    wallSafetyDeadlineMs: 1000, wallDeadlineBinding: false,
  },
  sideEffects: { hints: 'none', canonicalBaseline: 'none', telemetry: 'none', reports: 'artifact-only' },
};
const clone = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(decisionContractIssues(common), []);
assert.deepEqual(declaredDecisionContractIssues(common), []);
assert.ok(decisionContractIssues({ ...clone(common), experiment: { ...common.experiment, resolvedSha: 'main' } }).includes('experiment.resolvedSha'));
assert.ok(decisionContractIssues({ ...clone(common), limits: { ...common.limits, totalWorkCeiling: undefined } }).includes('limits.totalWorkCeiling'));
assert.ok(decisionContractIssues({ ...clone(common), execution: { ...common.execution, levelBlind: 'true' } }).includes('execution.levelBlind'));
assert.ok(decisionContractIssues({ ...clone(common), limits: { ...common.limits, cumulativeNodeCeiling: -1 } }).includes('limits.cumulativeNodeCeiling'));
assert.ok(decisionContractIssues({ ...clone(common), limits: { ...common.limits, wallDeadlineBinding: null } }).includes('limits.wallDeadlineBinding'));
assert.ok(decisionContractIssues({ ...clone(common), sideEffects: { ...common.sideEffects, telemetry: 123 } }).includes('sideEffects.telemetry'));
const declaredWithoutLimit = clone(common);
delete declaredWithoutLimit.limits.totalWorkCeiling;
assert.ok(declaredDecisionContractIssues(declaredWithoutLimit).includes('limits.totalWorkCeiling'));
assert.equal(declaredDecisionContractIssues(declaredWithoutLimit).includes('population.identityHash'), false, 'raw declarations may defer population identity to validated result integrity');

const pairedCommon = clone(common);
delete pairedCommon.experiment.resolvedSha;
pairedCommon.experiment.arms = {
  control: { resolvedSha: 'a'.repeat(40) },
  treatment: { resolvedSha: 'b'.repeat(40) },
};
assert.deepEqual(decisionContractIssues(pairedCommon), []);
assert.ok(decisionContractIssues({ ...clone(pairedCommon), experiment: { ...pairedCommon.experiment, arms: { control: { resolvedSha: 'a'.repeat(40) } } } }).includes('experiment.arms'));
const ambiguousPair = clone(pairedCommon);
ambiguousPair.experiment.resolvedSha = 'c'.repeat(40);
assert.ok(decisionContractIssues(ambiguousPair).includes('experiment.resolvedSha'), 'paired contracts must not also claim one single execution SHA');
const pairedWithoutContentSeal = clone(pairedCommon);
delete pairedWithoutContentSeal.population.corpusIdentity;
assert.ok(decisionContractIssues(pairedWithoutContentSeal).includes('population.corpusIdentity'), 'cross-SHA paired evidence must content-address its subjects');
const sameShaPair = clone(pairedWithoutContentSeal);
sameShaPair.experiment.arms.treatment.resolvedSha = sameShaPair.experiment.arms.control.resolvedSha;
assert.equal(decisionContractIssues(sameShaPair).includes('population.corpusIdentity'), false, 'same-SHA flags-only pairs cannot suffer cross-ref corpus drift');

assert.equal(assertCompatibleExperiments(common, clone(common), { paired: true }), true);
assert.throws(
  () => assertCompatibleExperiments(common, { ...clone(common), population: { ...common.population, identityHash: 'different' } }, { paired: true }),
  /population.identityHash/,
);
assert.throws(
  () => assertCompatibleExperiments(common, { ...clone(common), limits: { ...common.limits, cumulativeNodeCeiling: 101 } }, { paired: true }),
  /limits.cumulativeNodeCeiling/,
);
assert.throws(
  () => assertCompatibleExperiments(common, { ...clone(common), execution: { ...common.execution, reproducibilityExpected: false } }, { paired: true }),
  /execution.reproducibilityExpected/,
);

console.log('solver experiment contract tests passed');