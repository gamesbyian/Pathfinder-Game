import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildReconciliationContract, validateReconciliationSources } from './validate-reconciliation-sources.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const manifest = {
  experiment: {
    resolvedSha: 'a'.repeat(40),
    configurationHash: `sha256:${'b'.repeat(64)}`,
    workflowRunId: '1',
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
secondManifest.experiment.workflowRunId = '2';
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

const reconciliation = buildReconciliationContract(result, {
  runId: '99',
  runAttempt: '2',
  reconciliationSha: 'f'.repeat(40),
});
assert.deepEqual(reconciliation.experiment.sourceRuns, ['1', '2']);
assert.equal(reconciliation.experiment.resolvedSha, 'a'.repeat(40), 'recombine preserves source execution identity');
assert.equal(reconciliation.experiment.reconciliationRun.kind, 'recombine-only');
assert.equal(reconciliation.experiment.reconciliationRun.preservesExperimentIdentity, true);
assert.equal(reconciliation.experiment.reconciliationRun.acquisitionRecomputed, false);
assert.deepEqual(reconciliation.experiment.reconciliationRun.sourceRuns, ['1', '2']);
assert.equal(reconciliation.experiment.reconciliationRun.resolvedSha, 'f'.repeat(40));
assert.equal(reconciliation.population.kind, 'explicit-reconciled-population');
assert.equal(reconciliation.execution.schedulerMode, 'production');

const reversed = validateReconciliationSources([{ runId: '2', manifest: secondManifest }, { runId: '1', manifest }]);
assert.equal(reversed.protocolHash, result.protocolHash, 'source ordering must not change the protocol identity');
assert.equal(reversed.sourceSetHash, result.sourceSetHash, 'source-set provenance must be canonical regardless of caller/source-directory ordering');

assert.throws(() => validateReconciliationSources([{ runId: '1', manifest: {} }]), /resolved SHA/);
const orchestrationOnlySha = clone(manifest);
delete orchestrationOnlySha.experiment.resolvedSha;
orchestrationOnlySha.sha = 'a'.repeat(40);
assert.throws(
  () => validateReconciliationSources([{ runId: 'legacy', manifest: orchestrationOnlySha }]),
  /no declared experiment resolved SHA/u,
);
const legacyTopLevelConfiguration = clone(manifest);
delete legacyTopLevelConfiguration.experiment.configurationHash;
legacyTopLevelConfiguration.configurationHash = `sha256:${'b'.repeat(64)}`;
assert.throws(
  () => validateReconciliationSources([{ runId: 'legacy-config', manifest: legacyTopLevelConfiguration }]),
  /no declared experiment configuration hash/u,
);

const relabelledSource = clone(manifest);
relabelledSource.experiment.workflowRunId = '999';
assert.throws(
  () => validateReconciliationSources([{ runId: '1', manifest: relabelledSource }]),
  /staging directory 1 contains manifest for workflow run 999.*relabel acquisition provenance/u,
);
const missingDeclaredRunId = clone(manifest);
delete missingDeclaredRunId.experiment.workflowRunId;
assert.throws(
  () => validateReconciliationSources([{ runId: '1', manifest: missingDeclaredRunId }]),
  /no declared experiment workflow run ID/u,
);
const missingDeclaredAttempt = clone(manifest);
delete missingDeclaredAttempt.experiment.workflowRunAttempt;
assert.throws(
  () => validateReconciliationSources([{ runId: '1', manifest: missingDeclaredAttempt }]),
  /no declared experiment workflow run attempt/u,
);
assert.throws(
  () => validateReconciliationSources([{ runId: '1', manifest }, { runId: '1', manifest: secondManifest }]),
  /source run IDs must be unique/u,
);
const mismatchedConfiguration = clone(secondManifest);
mismatchedConfiguration.experiment.configurationHash = `sha256:${'f'.repeat(64)}`;
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest: mismatchedConfiguration }]), /configurationHash/);
const mismatchedRevision = clone(secondManifest);
mismatchedRevision.experiment.resolvedSha = 'c'.repeat(40);
assert.throws(
  () => validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest: mismatchedRevision }]),
  /resolved SHA .* differs .* recombine-only result cannot claim one preserved experiment identity/u,
);
const nestedReconciliation = clone(manifest);
nestedReconciliation.experiment.reconciliationRun = {
  kind: 'recombine-only',
  preservesExperimentIdentity: true,
  acquisitionRecomputed: false,
  sourceRuns: ['leaf-a', 'leaf-b'],
};
assert.throws(
  () => validateReconciliationSources([{ runId: 'nested', manifest: nestedReconciliation }]),
  /already a reconciliation result.*leaf acquisition runs/u,
);

const mismatchedProtocol = clone(secondManifest);
mismatchedProtocol.limits.cumulativeNodeCeiling = 101;
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest }, { runId: '2', manifest: mismatchedProtocol }]), /limits.cumulativeNodeCeiling/);
const incompleteProtocol = clone(manifest);
delete incompleteProtocol.execution.historyAware;
assert.throws(() => validateReconciliationSources([{ runId: '1', manifest: incompleteProtocol }]), /execution.historyAware/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'reconciliation-cli-'));
try {
  const root = path.join(temp, 'sources');
  for (const [runId, sourceManifest] of [['1', manifest], ['2', secondManifest]]) {
    const dir = path.join(root, runId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(sourceManifest));
  }
  const out = path.join(temp, 'provenance.json');
  const contractOut = path.join(temp, 'contract.json');
  execFileSync(process.execPath, [
    'scripts/validate-reconciliation-sources.mjs',
    `--sources-dir=${root}`, `--out=${out}`, `--contract-out=${contractOut}`,
  ], {
    cwd: process.cwd(), stdio: 'pipe',
    env: { ...process.env, GITHUB_RUN_ID: '99', GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'f'.repeat(40) },
  });
  assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).sources.length, 2);
  assert.equal(JSON.parse(fs.readFileSync(contractOut, 'utf8')).experiment.reconciliationRun.kind, 'recombine-only');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('reconciliation source validation tests passed');