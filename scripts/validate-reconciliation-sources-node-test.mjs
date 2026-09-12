import assert from 'node:assert/strict';
import { validateReconciliationSources } from './validate-reconciliation-sources.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const manifest = {
  experiment: {
    resolvedSha: 'a'.repeat(40),
    configurationHash: `sha256:${'b'.repeat(64)}`,
    workflowRunAttempt: '1',
    workflowFamily: 'targeted-sweep',
    producer: 'solver-level-blind-targeted-sweep.yml',
    entrypoint: 'scripts/level-blind-capability-sweep.mjs',
  },
  population: {
    kind: 'explicit-ids',
    identityBasis: 'stable-level-id',
    corpusIdentity: `sha256:${'c'.repeat(64)}`,
    identityHash: `sha256:${'d'.repeat(64)}`,
  },
  execution: {
    levelBlind: true,
    historyAware: false,
    historicalInputs: [],
    reproducibilityExpected: true,
    producerFamily: 'targeted-sweep',
    schedulerMode: 'production',
  },
  limits: {
    cumulativeNodeCeiling: 100,
    initialWorkAllocation: 134,
    totalWorkCeiling: 134,
    wallSafetyDeadlineMs: 1000,
    wallDeadlineBinding: false,
  },
  sideEffects: { hints: 'none', canonicalBaseline: 'none', telemetry: 'none', reports: 'artifact-only' },
};

const secondManifest = clone(manifest);
secondManifest.population.identityHash = `sha256:${'e'.repeat(64)}`;
const result = validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest: secondManifest }]);
assert.equal(result.sources.length, 2);
assert.equal(result.resolvedSha, 'a'.repeat(40));
assert.equal(result.execution.levelBlind, true);
assert.equal(result.execution.schedulerMode, 'production');
assert.equal(result.limits.totalWorkCeiling, 134);
assert.equal(result.population.corpusIdentity, `sha256:${'c'.repeat(64)}`);
assert.equal(result.sourceExperiment.producer, 'solver-level-blind-targeted-sweep.yml');
assert.match(result.protocolHash, /^sha256:[0-9a-f]{64}$/);
assert.match(result.sourceSetHash, /^sha256:[0-9a-f]{64}$/);

const reversed = validateReconciliationSources([{ runId: '2', manifest: secondManifest }, { runId: '1', manifest }]);
assert.equal(reversed.protocolHash, result.protocolHash, 'source ordering must not change the protocol identity');
assert.notEqual(reversed.sourceSetHash, result.sourceSetHash, 'source-set provenance remains order-sensitive to the caller-provided reconciliation sequence');

assert.throws(() => validateReconciliationSources([{ runId: '1', manifest: {} }]), /resolved SHA/);
const mismatchedConfiguration = clone(secondManifest);
mismatchedConfiguration.experiment.configurationHash = `sha256:${'f'.repeat(64)}`;
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest: mismatchedConfiguration }]), /configurationHash/);
const mismatchedProtocol = clone(secondManifest);
mismatchedProtocol.limits.cumulativeNodeCeiling = 101;
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest: mismatchedProtocol }]), /limits.cumulativeNodeCeiling/);
const incompleteProtocol = clone(manifest);
delete incompleteProtocol.execution.historyAware;
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest: incompleteProtocol }]), /execution.historyAware/);

console.log('reconciliation source validation tests passed');