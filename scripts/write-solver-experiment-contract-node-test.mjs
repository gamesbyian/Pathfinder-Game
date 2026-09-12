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

const inferredPaired = buildContract({
  configuration: { baselineRef: 'd'.repeat(40), treatmentRef: 'e'.repeat(40), nodeBudget: 1 },
  workflowFamily: 'routing-regime-sample-ab', producer: 'solver-routing-regime-sample-ab.yml', entrypoint: 'solver.mjs',
}, { resolvedSha });
assert.equal(inferredPaired.experiment.resolvedSha, undefined);
assert.equal(inferredPaired.experiment.arms.control.resolvedSha, 'd'.repeat(40));
assert.equal(inferredPaired.experiment.arms.treatment.resolvedSha, 'e'.repeat(40));
assert.throws(() => buildContract({
  configuration: { baselineRef: 'main', treatmentRef: 'e'.repeat(40) },
  workflowFamily: 'routing-regime-sample-ab', producer: 'solver-routing-regime-sample-ab.yml', entrypoint: 'solver.mjs',
}, { resolvedSha }), /immutable 40-character commit SHAs/);

console.log('write solver experiment contract tests passed');
