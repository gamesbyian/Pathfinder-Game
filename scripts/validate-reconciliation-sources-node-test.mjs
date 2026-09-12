import assert from 'node:assert/strict';
import { validateReconciliationSources } from './validate-reconciliation-sources.mjs';

const manifest = { experiment: { resolvedSha: 'abc', configurationHash: 'sha256:config', workflowRunAttempt: '1' }, population: { identityHash: 'sha256:population' } };
const result = validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest }]);
assert.equal(result.sources.length, 2);
assert.equal(result.resolvedSha, 'abc');
assert.match(result.sourceSetHash, /^sha256:[0-9a-f]{64}$/);
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest: {} }]), /resolved SHA/);
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest: { experiment: { ...manifest.experiment, configurationHash: 'different' } } }]), /configurationHash/);
console.log('reconciliation source validation tests passed');
