import assert from 'node:assert/strict';
import {
  assertCompatibleExperiments,
  buildPopulationIntegrity,
  classifyRow,
  decisionBearingExperimentResultIssues,
  decisionContractIssues,
  declaredDecisionContractIssues,
  hashConfiguration,
  hashPopulation,
  isDecisionBearingExperimentResult,
  isImmutableCommitSha,
  parseIdentityLines,
} from './solver-experiment-contract.mjs';

const a = hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['b', 'a'] });
const b = hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a', 'b'] });
assert.equal(a.identityHash, b.identityHash);
const codedA = hashPopulation({
  kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a', 'b'], identityCodec: 'json-tuple-v1',
});
const codedB = hashPopulation({
  kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['b', 'a'], identityCodec: 'json-tuple-v1',
});
assert.equal(codedA.identityHash, codedB.identityHash);
assert.notEqual(codedA.identityHash, a.identityHash,
  'an explicitly declared identity codec must be part of the scientific hash domain');
assert.throws(() => hashPopulation({
  kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a'], identityCodec: '',
}), /identityCodec/);
assert.throws(() => hashPopulation({ kind: 'explicit-ids', identityBasis: 'stable-level-id', identities: ['a', 'a'] }), /duplicate/);
assert.equal(hashConfiguration({ b: 2, a: 1 }), hashConfiguration({ a: 1, b: 2 }));
assert.equal(isImmutableCommitSha('a'.repeat(40)), true);
assert.equal(isImmutableCommitSha('main'), false);
assert.deepEqual(
  parseIdentityLines('scope:a,b::case\n切断群:ケース 1\n'),
  ['scope:a,b::case', '切断群:ケース 1'],
  'comma-bearing line identity and Unicode must remain intact',
);

const integrity = buildPopulationIntegrity(['a', 'b', 'c'], [
  { id: 'a', ok: true }, { id: 'b', status: 'deadline-truncated' }, { id: 'x', error: 'boom' },
]);
assert.deepEqual(integrity.expectedIds, ['a', 'b', 'c']);
assert.deepEqual(integrity.missingIds, ['c']);
assert.deepEqual(integrity.unexpectedIds, ['x']);
assert.equal(integrity.outcomes.solved, 1);
assert.equal(integrity.outcomes.deadlineTruncated, 1);
assert.equal(integrity.outcomes.harnessError, 1);
assert.equal(integrity.coverageComplete, false);
assert.equal(integrity.decisionValidComplete, false);
assert.equal('complete' in integrity, false, 'current population integrity must not emit the retired complete mirror');

const structurallyCompleteButIndeterminate = buildPopulationIntegrity(['a', 'b'], [
  { id: 'a', ok: true }, { id: 'b', status: 'deadline-truncated' },
]);
assert.equal(structurallyCompleteButIndeterminate.coverageComplete, true);
assert.equal('complete' in structurallyCompleteButIndeterminate, false, 'coverage completeness must remain distinct from decision validity');
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
const recombineOnly = clone(common);
recombineOnly.experiment.sourceRuns = ['run-1', 'run-2'];
recombineOnly.experiment.reconciliationRun = {
  kind: 'recombine-only',
  sourceRuns: ['run-1', 'run-2'],
  preservesExperimentIdentity: true,
  acquisitionRecomputed: false,
};
assert.deepEqual(decisionContractIssues(recombineOnly), []);
const retryMissing = clone(common);
retryMissing.experiment.sourceRuns = ['run-1', 'run-2'];
retryMissing.experiment.reconciliationRun = {
  kind: 'retry-missing-acquisition',
  sourceRuns: ['run-1', 'run-2'],
  preservesExperimentIdentity: true,
  acquisitionRecomputed: true,
};
assert.deepEqual(decisionContractIssues(retryMissing), []);
const fakeRecombine = clone(recombineOnly);
fakeRecombine.experiment.reconciliationRun.acquisitionRecomputed = true;
assert.ok(decisionContractIssues(fakeRecombine).includes('experiment.reconciliationRun.acquisitionRecomputed'));
const unknownRecoveryRun = clone(recombineOnly);
unknownRecoveryRun.experiment.reconciliationRun.sourceRuns = ['run-3'];
assert.ok(decisionContractIssues(unknownRecoveryRun).includes('experiment.reconciliationRun.sourceRuns(not-in-experiment-sourceRuns)'));
const duplicateSourceRuns = clone(recombineOnly);
duplicateSourceRuns.experiment.sourceRuns = ['run-1', 'run-1'];
assert.ok(decisionContractIssues(duplicateSourceRuns).includes('experiment.sourceRuns'));
assert.deepEqual(declaredDecisionContractIssues(common), []);
const withResearchQuestion = {
  ...clone(common),
  researchQuestion: {
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    liveAmbiguity: 'rank disagreement versus no opportunity',
    discriminatingObservable: 'production-inert cutoff disagreement',
    outcomeInterpretation: { disagreement: 'economics gate earned' },
    measurementOpportunity: 'MO-002',
  },
};
assert.deepEqual(decisionContractIssues(withResearchQuestion), []);
const decisionBearingManifest = {
  ...clone(withResearchQuestion),
  schemaVersion: 3,
  kind: 'pathfinder-solver-experiment-result',
  status: 'published',
  decisionContractIssues: [],
  populationIdentityHash: a.identityHash,
  populationIntegrity: {
    complete: true, coverageComplete: true, decisionValidComplete: true,
    inferredExpectedPopulation: false, populationIdentityHash: a.identityHash,
    outcomes: { deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 },
  },
  researchOutcome: { outcome: 'completed-positive' },
};
assert.deepEqual(decisionBearingExperimentResultIssues(decisionBearingManifest), []);
assert.equal(isDecisionBearingExperimentResult(decisionBearingManifest), true);
assert.ok(decisionBearingExperimentResultIssues({ ...decisionBearingManifest, status: 'missing-primary' }).includes('status'));
assert.ok(decisionBearingExperimentResultIssues({
  ...decisionBearingManifest,
  decisionContractIssues: ['experiment.configurationHash'],
}).includes('decisionContractIssues(non-empty)'));
assert.ok(decisionBearingExperimentResultIssues({
  ...decisionBearingManifest,
  populationIntegrity: { ...decisionBearingManifest.populationIntegrity, decisionValidComplete: false },
}).includes('populationIntegrity.decisionValidComplete'));
const legacyDecisionValidity = { ...decisionBearingManifest.populationIntegrity };
delete legacyDecisionValidity.decisionValidComplete;
assert.ok(decisionBearingExperimentResultIssues({
  ...decisionBearingManifest,
  populationIntegrity: legacyDecisionValidity,
}).includes('populationIntegrity.decisionValidComplete'),
'legacy structural completeness must not substitute for an explicit decision-valid integrity verdict');
assert.ok(decisionBearingExperimentResultIssues({
  ...decisionBearingManifest,
  researchOutcome: { outcome: 'invariant-violation' },
}).includes('researchOutcome.outcome'));
assert.ok(decisionBearingExperimentResultIssues({
  ...decisionBearingManifest,
  populationIdentityHash: `sha256:${'9'.repeat(64)}`,
}).includes('populationIdentityHash(population-mismatch)'));
assert.ok(decisionContractIssues({
  ...clone(common), researchQuestion: { ...withResearchQuestion.researchQuestion, questionId: '' },
}).includes('researchQuestion.questionId'));
assert.ok(decisionContractIssues({
  ...clone(common), researchQuestion: { ...withResearchQuestion.researchQuestion, measurementOpportunity: 'M2' },
}).includes('researchQuestion.measurementOpportunity'));
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
const pairedWithContentSeal = clone(pairedWithoutContentSeal);
pairedWithContentSeal.population.corpusIdentity = `sha256:${'7'.repeat(64)}`;
assert.equal(decisionContractIssues(pairedWithContentSeal).includes('population.corpusIdentity'), false, 'a content-addressed population seal makes cross-SHA subject identity explicit');
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