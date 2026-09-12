import assert from 'node:assert/strict';
import { buildContract } from './write-solver-experiment-contract.mjs';

const contract = buildContract({
  configuration: { corpus: 'data/stress/stress-levels-random.json', nodeBudget: 50_000_000 },
  workflowFamily: 'level-blind-targeted-sweep',
  producer: 'solver-level-blind-targeted-sweep.yml',
  entrypoint: 'scripts/level-blind-capability-sweep.mjs',
  population: { kind: 'explicit-ids', identityBasis: 'stable-level-id' },
  execution: { levelBlind: true, historyAware: false },
  limits: { cumulativeNodeCeiling: 50_000_000 },
  sideEffects: { hints: 'none' },
});

assert.equal(contract.experiment.workflowFamily, 'level-blind-targeted-sweep');
assert.equal(contract.experiment.producer, 'solver-level-blind-targeted-sweep.yml');
assert.match(contract.experiment.configurationHash, /^sha256:[0-9a-f]{64}$/);
assert.deepEqual(contract.population, { kind: 'explicit-ids', identityBasis: 'stable-level-id' });
assert.deepEqual(contract.execution, { levelBlind: true, historyAware: false });
assert.deepEqual(contract.limits, { cumulativeNodeCeiling: 50_000_000 });
assert.deepEqual(contract.sideEffects, { hints: 'none' });

const other = buildContract({ configuration: { corpus: 'x' }, workflowFamily: 'a', producer: 'b', entrypoint: 'c' });
assert.notEqual(other.experiment.configurationHash, contract.experiment.configurationHash);

console.log('write solver experiment contract tests passed');
