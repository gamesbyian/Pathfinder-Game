import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { hashConfiguration } from './solver-experiment-contract.mjs';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-solver-result-'));
try {
  const primary = path.join(temp, 'result.json');
  const integrity = path.join(temp, 'integrity.json');
  const outcome = path.join(temp, 'outcome.json');
  const contractFile = path.join(temp, 'contract.json');
  const out = path.join(temp, 'published');
  fs.writeFileSync(primary, JSON.stringify({ producer: 'fixture-producer', entrypoint: 'fixture.mjs', workflowFamily: 'fixture-family', levels: [{ id: 'A', ok: true, status: 'success' }] }));
  fs.writeFileSync(integrity, JSON.stringify({ complete: true, coverageComplete: true, decisionValidComplete: true, expectedCount: 1, observedCount: 1, expectedIds: ['A'], duplicateIds: [], unexpectedIds: [], missingIds: [], outcomes: { solved: 1, exhaustedNegative: 0, nodeLimited: 0, workLimited: 0, deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 }, populationIdentityHash: `sha256:${'a'.repeat(64)}` }));
  fs.writeFileSync(outcome, JSON.stringify({ schemaVersion: 1, outcome: 'completed-positive', reason: 'frozen gate passed' }));
  fs.writeFileSync(contractFile, JSON.stringify({
    experiment: {
      workflowFamily: 'fixture-family', producer: 'fixture-producer', entrypoint: 'fixture.mjs',
      configurationHash: hashConfiguration({ budget: 1 }), resolvedSha: 'b'.repeat(40),
    },
    population: { kind: 'explicit-ids', identityBasis: 'stable-level-id' },
    execution: { levelBlind: true, historyAware: false, historicalInputs: [], reproducibilityExpected: true, producerFamily: 'fixture-family', schedulerMode: 'production' },
    limits: { cumulativeNodeCeiling: 1, initialWorkAllocation: 1, totalWorkCeiling: 1, wallSafetyDeadlineMs: 1000, wallDeadlineBinding: false },
    sideEffects: { hints: 'none', canonicalBaseline: 'none', telemetry: 'none', reports: 'artifact-only' },
  }));

  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${contractFile}`, `--out=${out}`], { cwd: root });
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json')));
  assert.equal(manifest.schemaVersion, 3);
  assert.equal(manifest.population.expectedCount, 1);
  assert.equal(manifest.population.identityHash, `sha256:${'a'.repeat(64)}`);
  assert.equal(manifest.coverage.populationIntegrity.coverageComplete, true);
  assert.equal(manifest.coverage.populationIntegrity.decisionValidComplete, true);
  assert.match(manifest.experiment.configurationHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(manifest.experiment.resolvedSha, 'b'.repeat(40));
  assert.equal(manifest.execution.levelBlind, true);
  assert.equal(manifest.decisionBearing, true);
  assert.deepEqual(manifest.decisionContractIssues, []);
  assert.deepEqual(manifest.sideEffects, { hints: 'none', canonicalBaseline: 'none', telemetry: 'none', reports: 'artifact-only' });

  const noContractOut = path.join(temp, 'no-contract');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--out=${noContractOut}`], { cwd: root });
  const noContractManifest = JSON.parse(fs.readFileSync(path.join(noContractOut, 'manifest.json')));
  assert.equal(noContractManifest.decisionBearing, false, 'complete rows without a declared scientific contract must fail closed');
  assert.deepEqual(noContractManifest.decisionContractIssues, ['missing declared experiment contract']);

  const noOutcomeOut = path.join(temp, 'no-outcome');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--contract-file=${contractFile}`, `--out=${noOutcomeOut}`], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(noOutcomeOut, 'manifest.json'))).decisionBearing, false, 'publisher must not infer a verdict from complete coverage and contract');

  const indeterminateIntegrity = path.join(temp, 'indeterminate-integrity.json');
  fs.writeFileSync(indeterminateIntegrity, JSON.stringify({ complete: true, coverageComplete: true, decisionValidComplete: false, expectedCount: 1, observedCount: 1, expectedIds: ['A'], duplicateIds: [], unexpectedIds: [], missingIds: [], outcomes: { solved: 0, exhaustedNegative: 0, nodeLimited: 0, workLimited: 0, deadlineTruncated: 1, harnessError: 0, malformed: 0, missing: 0, unknown: 0 }, populationIdentityHash: `sha256:${'a'.repeat(64)}` }));
  const indeterminateOut = path.join(temp, 'indeterminate');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${indeterminateIntegrity}`, `--outcome-file=${outcome}`, `--contract-file=${contractFile}`, `--out=${indeterminateOut}`], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(indeterminateOut, 'manifest.json'))).decisionBearing, false, 'structurally complete but indeterminate rows must not become decision-bearing');

  const legacyCoverageOnly = path.join(temp, 'legacy-coverage-only.json');
  fs.writeFileSync(legacyCoverageOnly, JSON.stringify({ complete: true, expectedCount: 1, observedCount: 1, expectedIds: ['A'], duplicateIds: [], unexpectedIds: [], missingIds: [], populationIdentityHash: `sha256:${'a'.repeat(64)}` }));
  const legacyOut = path.join(temp, 'legacy');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${legacyCoverageOnly}`, `--outcome-file=${outcome}`, `--contract-file=${contractFile}`, `--out=${legacyOut}`], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(legacyOut, 'manifest.json'))).decisionBearing, false, 'legacy structural completeness without normalized outcomes must fail closed');

  const legacyWithOutcomes = path.join(temp, 'legacy-with-outcomes.json');
  fs.writeFileSync(legacyWithOutcomes, JSON.stringify({ complete: true, expectedCount: 1, observedCount: 1, expectedIds: ['A'], duplicateIds: [], unexpectedIds: [], missingIds: [], outcomes: { solved: 1, deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 }, populationIdentityHash: `sha256:${'a'.repeat(64)}` }));
  const legacyValidOut = path.join(temp, 'legacy-valid');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${legacyWithOutcomes}`, `--outcome-file=${outcome}`, `--contract-file=${contractFile}`, `--out=${legacyValidOut}`], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(legacyValidOut, 'manifest.json'))).decisionBearing, true, 'legacy integrity may be decision-valid only when normalized outcome counts and a complete contract prove it');

  const incompleteContract = path.join(temp, 'incomplete-contract.json');
  const parsedContract = JSON.parse(fs.readFileSync(contractFile));
  delete parsedContract.experiment.resolvedSha;
  fs.writeFileSync(incompleteContract, JSON.stringify(parsedContract));
  const incompleteContractOut = path.join(temp, 'incomplete-contract-out');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${incompleteContract}`, `--out=${incompleteContractOut}`], { cwd: root });
  const incompleteContractManifest = JSON.parse(fs.readFileSync(path.join(incompleteContractOut, 'manifest.json')));
  assert.equal(incompleteContractManifest.decisionBearing, false);
  assert.ok(incompleteContractManifest.decisionContractIssues.includes('experiment.resolvedSha'));

  const omittedLimitContract = path.join(temp, 'omitted-limit-contract.json');
  const parsedOmittedLimitContract = JSON.parse(fs.readFileSync(contractFile));
  delete parsedOmittedLimitContract.limits.totalWorkCeiling;
  fs.writeFileSync(omittedLimitContract, JSON.stringify(parsedOmittedLimitContract));
  const omittedLimitOut = path.join(temp, 'omitted-limit-out');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${omittedLimitContract}`, `--out=${omittedLimitOut}`], { cwd: root });
  const omittedLimitManifest = JSON.parse(fs.readFileSync(path.join(omittedLimitOut, 'manifest.json')));
  assert.equal(omittedLimitManifest.decisionBearing, false, 'omitted limit declaration must not normalize into an explicit null');
  assert.ok(omittedLimitManifest.decisionContractIssues.includes('limits.totalWorkCeiling'));

  console.log('publish solver sweep result tests passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}