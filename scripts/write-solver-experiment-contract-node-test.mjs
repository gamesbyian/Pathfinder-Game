import assert from 'node:assert/strict';
import { buildContract } from './write-solver-experiment-contract.mjs';

const resolvedSha = 'a'.repeat(40);
const contract = buildContract({
  configuration: { corpus: 'data/stress/stress-levels-random.json', nodeBudget: 50_000_000 },
  workflowFamily: 'level-blind-targeted-sweep',
  producer: 'solver-level-blind-targeted-sweep.yml',
  entrypoint: 'scripts/level-blind-capability-sweep.mjs',
  population: { kind: 'explicit-ids', identityBasis: 'stable-level-id' },
  execution: { levelBlind: true, historyAware: false },
  limits: { cumulativeNodeCeiling: 50_000_000 },
  sideEffects: { hints: 'none' },
}, { resolvedSha });

assert.equal(contract.experiment.workflowFamily, 'level-blind-targeted-sweep');
assert.equal(contract.experiment.producer, 'solver-level-blind-targeted-sweep.yml');
assert.equal(contract.experiment.resolvedSha, resolvedSha);
assert.match(contract.experiment.configurationHash, /^sha256:[0-9a-f]{64}$/);
assert.deepEqual(contract.population, { kind: 'explicit-ids', identityBasis: 'stable-level-id' });
assert.deepEqual(contract.execution, { levelBlind: true, historyAware: false });
assert.deepEqual(contract.limits, { cumulativeNodeCeiling: 50_000_000 });
assert.deepEqual(contract.sideEffects, { hints: 'none' });
const recoveryContract = buildContract({
  configuration: { corpus: 'fixture' },
  workflowFamily: 'fixture', producer: 'fixture.yml', entrypoint: 'fixture.mjs',
  experiment: {
    sourceRuns: ['run-a', 'run-b'],
    reconciliationRun: {
      kind: 'recombine-only',
      sourceRuns: ['run-a', 'run-b'],
      preservesExperimentIdentity: true,
      acquisitionRecomputed: false,
    },
  },
}, { resolvedSha });
assert.equal(recoveryContract.experiment.reconciliationRun.kind, 'recombine-only');
assert.throws(() => buildContract({
  configuration: { corpus: 'fixture' },
  workflowFamily: 'fixture', producer: 'fixture.yml', entrypoint: 'fixture.mjs',
  experiment: {
    sourceRuns: ['run-a'],
    reconciliationRun: {
      kind: 'recombine-only',
      sourceRuns: ['run-a'],
      preservesExperimentIdentity: true,
      acquisitionRecomputed: true,
    },
  },
}, { resolvedSha }), /invalid experiment recovery provenance/);

const paired = buildContract({
  configuration: { corpus: 'x' }, workflowFamily: 'a', producer: 'b', entrypoint: 'c',
  experiment: {
    arms: {
      control: { resolvedSha: 'b'.repeat(40) },
      treatment: { resolvedSha: 'c'.repeat(40) },
    },
  },
}, { resolvedSha });
assert.equal(paired.experiment.resolvedSha, undefined, 'paired contracts must not inherit the writer checkout as a fake single-arm execution SHA');
assert.equal(paired.experiment.arms.control.resolvedSha, 'b'.repeat(40));
assert.notEqual(paired.experiment.configurationHash, contract.experiment.configurationHash);

const populationIdentity = `sha256:${'9'.repeat(64)}`;
const inferredPaired = buildContract({
  configuration: { baselineRef: 'd'.repeat(40), treatmentRef: 'e'.repeat(40), nodeBudget: 1 },
  workflowFamily: 'routing-regime-sample-ab', producer: 'solver-routing-regime-sample-ab.yml', entrypoint: 'solver.mjs',
  population: { kind: 'sealed-stratified-sample', identityBasis: 'stable-level-id' },
}, { resolvedSha, populationSeal: { identityHash: populationIdentity, count: 3 } });
assert.equal(inferredPaired.experiment.resolvedSha, undefined);
assert.equal(inferredPaired.experiment.arms.control.resolvedSha, 'd'.repeat(40));
assert.equal(inferredPaired.experiment.arms.treatment.resolvedSha, 'e'.repeat(40));
assert.equal(inferredPaired.population.corpusIdentity, populationIdentity);
assert.throws(() => buildContract({
  configuration: { baselineRef: 'main', treatmentRef: 'e'.repeat(40) },
  workflowFamily: 'routing-regime-sample-ab', producer: 'solver-routing-regime-sample-ab.yml', entrypoint: 'solver.mjs',
}, { resolvedSha }), /immutable 40-character commit SHAs/);
assert.throws(() => buildContract({
  configuration: { baselineRef: 'd'.repeat(40), treatmentRef: 'e'.repeat(40) },
  workflowFamily: 'routing-regime-sample-ab', producer: 'solver-routing-regime-sample-ab.yml', entrypoint: 'solver.mjs',
  population: { kind: 'sealed-stratified-sample', identityBasis: 'stable-level-id', corpusIdentity: `sha256:${'8'.repeat(64)}` },
}, { resolvedSha, populationSeal: { identityHash: populationIdentity } }), /disagrees with population seal/);


const researchBlock = {
  blockId: 'WS2-PORTAL-TRANSFER-001',
  questionId: 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION',
  sourceRegime: 'topology-composition',
  sourceRevision: '0.1',
  evidenceRole: 'transfer',
  independentUnit: 'parent-level',
  parentIds: ['T00001'],
  parentContentIdentities: ['v2:example'],
  sourceArtifactRefs: ['tmp/portal-transfer/levels.json'],
  createdBy: {
    producer: 'solver-routing-regime-sample-ab.yml',
    manifestRef: 'tmp/portal-transfer/experiment-contract.json',
    runRef: null,
  },
  generationRef: 'tmp/portal-transfer/generation.json',
  consumptionEvents: [],
};
const researchPopulation = { kind: 'sealed-stratified-sample', identityBasis: 'stable-level-id', researchBlock };
const withResearchBlock = buildContract({
  configuration: { baselineRef: 'd'.repeat(40), treatmentRef: 'e'.repeat(40), nodeBudget: 1 },
  workflowFamily: 'routing-regime-sample-ab',
  producer: 'solver-routing-regime-sample-ab.yml',
  entrypoint: 'solver.mjs',
  researchQuestion: {
    questionId: 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION',
    liveAmbiguity: 'retained capability versus allocation failure',
    discriminatingObservable: 'fixed-work dead-last marginal value',
    outcomeInterpretation: { positive: 'retain successor', negative: 'close allocation form' },
    measurementOpportunity: 'MO-004',
  },
  population: researchPopulation,
}, { resolvedSha, populationSeal: { identityHash: populationIdentity, count: 1 } });
assert.equal(withResearchBlock.researchQuestion.questionId, 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION');
assert.equal(withResearchBlock.researchQuestion.measurementOpportunity, 'MO-004');
assert.equal(withResearchBlock.population.researchBlock.blockId, researchBlock.blockId);
assert.equal(withResearchBlock.population.corpusIdentity, populationIdentity);
assert.equal(withResearchBlock.population.independentUnit, 'parent-level');
assert.equal(researchPopulation.independentUnit, undefined, 'contract construction must not mutate the caller population declaration');

assert.throws(() => buildContract({
  configuration: { nodeBudget: 1 },
  workflowFamily: 'x', producer: 'y', entrypoint: 'z',
  population: {
    kind: 'explicit-ids',
    identityBasis: 'stable-level-id',
    independentUnit: 'state-row',
    researchBlock,
  },
}, { resolvedSha, populationSeal: { identityHash: populationIdentity, count: 1 } }), /population\.independentUnit disagrees/);

assert.throws(() => buildContract({
  configuration: { nodeBudget: 1 },
  workflowFamily: 'x', producer: 'y', entrypoint: 'z',
  population: { kind: 'explicit-ids', identityBasis: 'stable-level-id', researchBlock },
}, { resolvedSha }), /populationIdentity/);

assert.throws(() => buildContract({
  configuration: { nodeBudget: 1 },
  workflowFamily: 'x', producer: 'y', entrypoint: 'z',
  population: {
    kind: 'explicit-ids',
    identityBasis: 'stable-level-id',
    researchBlock: { ...researchBlock, questionId: 'NOT-A-REAL-QUESTION' },
  },
}, { resolvedSha, populationSeal: { identityHash: populationIdentity, count: 1 } }), /not present in solver-research-question-relations/);

assert.throws(() => buildContract({
  configuration: { nodeBudget: 1 }, workflowFamily: 'x', producer: 'y', entrypoint: 'z',
  researchQuestion: {
    questionId: 'NOT-A-REAL-QUESTION', liveAmbiguity: 'x', discriminatingObservable: 'y',
    outcomeInterpretation: { yes: 'z' },
  },
}, { resolvedSha }), /researchQuestion\.questionId is not present/);
assert.throws(() => buildContract({
  configuration: { nodeBudget: 1 }, workflowFamily: 'x', producer: 'y', entrypoint: 'z',
  researchQuestion: {
    questionId: 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION', liveAmbiguity: 'x', discriminatingObservable: 'y',
    outcomeInterpretation: { yes: 'z' }, measurementOpportunity: 'MO-999',
  },
}, { resolvedSha }), /researchQuestion\.measurementOpportunity is not present/);
assert.throws(() => buildContract({
  configuration: { nodeBudget: 1 }, workflowFamily: 'x', producer: 'y', entrypoint: 'z',
  researchQuestion: {
    questionId: 'WS2-CLASS3-DOSE-EXPOSURE', liveAmbiguity: 'x', discriminatingObservable: 'y',
    outcomeInterpretation: { yes: 'z' }, measurementOpportunity: 'MO-002',
  },
}, { resolvedSha }), /not mapped to researchQuestion\.questionId/);

console.log('write solver experiment contract tests passed');