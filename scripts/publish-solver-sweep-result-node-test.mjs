import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { hashConfiguration } from './solver-experiment-contract.mjs';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-solver-result-'));
try {
  const primary = path.join(temp, 'result.json');
  const integrity = path.join(temp, 'integrity.json');
  const outcome = path.join(temp, 'outcome.json');
  const contractFile = path.join(temp, 'contract.json');
  const out = path.join(temp, 'published');
  const primaryConfigurationHash = hashConfiguration({ budget: 1 });
  const contentHash = file => `sha256:${createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`;
  fs.writeFileSync(primary, JSON.stringify({
    producer: 'fixture-producer', entrypoint: 'fixture.mjs', workflowFamily: 'fixture-family',
    commitSha: 'b'.repeat(40), configurationHash: primaryConfigurationHash,
    levels: [{ id: 'A', ok: true, status: 'success' }],
  }));
  fs.writeFileSync(integrity, JSON.stringify({ complete: true, coverageComplete: true, decisionValidComplete: true, expectedCount: 1, observedCount: 1, expectedIds: ['A'], duplicateIds: [], unexpectedIds: [], missingIds: [], outcomes: { solved: 1, exhaustedNegative: 0, nodeLimited: 0, workLimited: 0, deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 }, populationIdentityHash: `sha256:${'a'.repeat(64)}` }));
  fs.writeFileSync(outcome, JSON.stringify({
    schemaVersion: 1,
    outcome: 'completed-positive',
    reason: 'frozen gate passed',
    binding: {
      populationIdentityHash: `sha256:${'a'.repeat(64)}`,
      resultConfigurationHashes: [primaryConfigurationHash],
      resultResolvedShas: ['b'.repeat(40)],
      resultContentHashes: [contentHash(primary)],
    },
  }));
  fs.writeFileSync(contractFile, JSON.stringify({
    experiment: {
      workflowFamily: 'fixture-family', producer: 'fixture-producer', entrypoint: 'fixture.mjs',
      configurationHash: primaryConfigurationHash, resolvedSha: 'b'.repeat(40),
      sourceRuns: ['fixture-acquisition-a', 'fixture-acquisition-b'],
      reconciliationRun: {
        kind: 'recombine-only',
        sourceRuns: ['fixture-acquisition-a', 'fixture-acquisition-b'],
        preservesExperimentIdentity: true,
        acquisitionRecomputed: false,
      },
    },
    researchQuestion: {
      questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
      liveAmbiguity: 'rank disagreement versus no opportunity',
      discriminatingObservable: 'production-inert cutoff disagreement',
      outcomeInterpretation: { disagreement: 'economics gate earned' },
      measurementOpportunity: 'MO-002',
    },
    population: {
      kind: 'explicit-ids', identityBasis: 'stable-level-id',
      researchBlock: {
        blockId: 'BLOCK-001', questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        evidenceRole: 'development', independentUnit: 'parent-level',
      },
    },
    execution: { levelBlind: true, historyAware: false, historicalInputs: [], reproducibilityExpected: true, producerFamily: 'fixture-family', schedulerMode: 'production' },
    limits: { cumulativeNodeCeiling: 1, initialWorkAllocation: 1, totalWorkCeiling: 1, wallSafetyDeadlineMs: 1000, wallDeadlineBinding: false,
      representation: { kind: 'heterogeneous-by-corpus', corpora: { fixture: { nodeCeiling: 1 } } } },
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
  assert.deepEqual(manifest.experiment.sourceRuns, ['fixture-acquisition-a', 'fixture-acquisition-b']);
  assert.equal(manifest.experiment.reconciliationRun.kind, 'recombine-only');
  assert.equal(manifest.experiment.reconciliationRun.acquisitionRecomputed, false);
  assert.equal(manifest.execution.levelBlind, true);
  assert.equal(manifest.limits.representation.kind, 'heterogeneous-by-corpus');
  assert.equal(manifest.researchQuestion.questionId, 'WS2-D1-PRODUCTION-INERT-OBSERVATION');
  assert.equal(manifest.researchQuestion.measurementOpportunity, 'MO-002');
  assert.equal(manifest.population.researchBlock.blockId, 'BLOCK-001');
  assert.equal(manifest.population.researchBlock.evidenceRole, 'development');
  assert.equal(manifest.population.independentUnit, 'parent-level');
  assert.equal(manifest.decisionBearing, true);
  assert.deepEqual(manifest.decisionContractIssues, []);
  assert.deepEqual(manifest.sideEffects, { hints: 'none', canonicalBaseline: 'none', telemetry: 'none', reports: 'artifact-only' });
  assert.equal(manifest.failureEvidence.disposition, 'none');
  assert.equal(manifest.failureEvidence.compactPresent, false);
  assert.equal(manifest.failureEvidence.summary, null);
  assert.equal(manifest.failureEvidence.richCapturePresent, false);

  const includeA = path.join(temp, 'include-a', 'summary.json');
  const includeB = path.join(temp, 'include-b', 'summary.json');
  fs.mkdirSync(path.dirname(includeA), { recursive: true });
  fs.mkdirSync(path.dirname(includeB), { recursive: true });
  fs.writeFileSync(includeA, JSON.stringify({ source: 'A' }));
  fs.writeFileSync(includeB, JSON.stringify({ source: 'B' }));
  const collisionOut = path.join(temp, 'include-collision-out');
  let collisionError = null;
  try {
    execFileSync('node', [
      'scripts/publish-solver-sweep-result.mjs',
      `--primary=${primary}`,
      `--include=${includeA}`,
      `--include=${includeB}`,
      `--out=${collisionOut}`,
    ], { cwd: root, stdio: 'pipe' });
  } catch (error) {
    collisionError = error;
  }
  assert.ok(collisionError, 'distinct include sources with the same basename must fail instead of overwriting published evidence');
  assert.equal(collisionError.status, 2);
  assert.match(String(collisionError.stderr), /published evidence path collision/u);

  const largePrimaryDir = path.join(temp, 'large-primary-dir');
  fs.mkdirSync(largePrimaryDir, { recursive: true });
  const first24Hashes = [];
  for (let i = 0; i < 25; i++) {
    const file = path.join(largePrimaryDir, `result-${String(i).padStart(2, '0')}.json`);
    fs.writeFileSync(file, JSON.stringify({
      commitSha: 'b'.repeat(40),
      configurationHash: primaryConfigurationHash,
      levels: [{ id: `L${i}`, ok: i % 2 === 0, status: i % 2 === 0 ? 'success' : 'exhausted' }],
    }));
    if (i < 24) first24Hashes.push(contentHash(file));
  }
  const sampledBindingOutcome = path.join(temp, 'sampled-binding-outcome.json');
  fs.writeFileSync(sampledBindingOutcome, JSON.stringify({
    schemaVersion: 1,
    outcome: 'completed-positive',
    reason: 'incorrectly bound to only the first 24 result files',
    binding: { resultContentHashes: first24Hashes },
  }));
  const sampledBindingOut = path.join(temp, 'sampled-binding-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${largePrimaryDir}`,
    `--outcome-file=${sampledBindingOutcome}`,
    `--contract-file=${contractFile}`,
    `--out=${sampledBindingOut}`,
  ], { cwd: root });
  const sampledBindingManifest = JSON.parse(fs.readFileSync(path.join(sampledBindingOut, 'manifest.json')));
  assert.ok(
    sampledBindingManifest.decisionContractIssues.includes('researchOutcome.binding.resultContentHashes disagree with published result files'),
    'scientific verdict binding must inspect result files beyond the 24-file human-summary sampling limit',
  );

  const unboundOutcome = path.join(temp, 'unbound-outcome.json');
  fs.writeFileSync(unboundOutcome, JSON.stringify({
    schemaVersion: 1, outcome: 'completed-positive', reason: 'unbound completed verdict',
  }));
  const unboundOut = path.join(temp, 'unbound-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${primary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${unboundOutcome}`,
    `--contract-file=${contractFile}`,
    `--out=${unboundOut}`,
  ], { cwd: root });
  const unboundManifest = JSON.parse(fs.readFileSync(path.join(unboundOut, 'manifest.json')));
  assert.equal(unboundManifest.decisionBearing, false);
  assert.ok(unboundManifest.decisionContractIssues.includes(
    'completed researchOutcome sidecar without an identical primary verdict requires exact resultContentHashes binding'));

  const wrongPopulationIntegrity = path.join(temp, 'wrong-population-integrity.json');
  fs.writeFileSync(wrongPopulationIntegrity, JSON.stringify({
    ...JSON.parse(fs.readFileSync(integrity, 'utf8')),
    expectedIds: ['B'],
  }));
  const wrongPopulationOut = path.join(temp, 'wrong-population-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${primary}`,
    `--integrity-file=${wrongPopulationIntegrity}`,
    `--outcome-file=${outcome}`,
    `--contract-file=${contractFile}`,
    `--out=${wrongPopulationOut}`,
  ], { cwd: root });
  const wrongPopulationManifest = JSON.parse(fs.readFileSync(path.join(wrongPopulationOut, 'manifest.json')));
  assert.equal(wrongPopulationManifest.decisionBearing, false);
  assert.ok(wrongPopulationManifest.decisionContractIssues.some(issue =>
    issue.includes('primary result: result rows do not match integrity expectedIds')),
    'an integrity file for a different population must not certify the primary result');

  const boundOutcome = path.join(temp, 'bound-outcome.json');
  fs.writeFileSync(boundOutcome, JSON.stringify({
    schemaVersion: 1,
    outcome: 'completed-positive',
    reason: 'bound gate passed',
    binding: {
      populationIdentityHash: `sha256:${'a'.repeat(64)}`,
      resultConfigurationHashes: [primaryConfigurationHash],
      resultResolvedShas: ['b'.repeat(40)],
      resultContentHashes: [contentHash(primary)],
    },
  }));
  const boundOut = path.join(temp, 'bound-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${primary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${boundOutcome}`,
    `--contract-file=${contractFile}`,
    `--out=${boundOut}`,
  ], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(boundOut, 'manifest.json'))).decisionBearing, true);

  const staleBoundOutcome = path.join(temp, 'stale-bound-outcome.json');
  fs.writeFileSync(staleBoundOutcome, JSON.stringify({
    schemaVersion: 1,
    outcome: 'completed-positive',
    reason: 'stale verdict',
    binding: {
      populationIdentityHash: `sha256:${'a'.repeat(64)}`,
      resultConfigurationHashes: [`sha256:${'f'.repeat(64)}`],
      resultResolvedShas: ['b'.repeat(40)],
      resultContentHashes: [contentHash(primary)],
    },
  }));
  const staleBoundOut = path.join(temp, 'stale-bound-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${primary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${staleBoundOutcome}`,
    `--contract-file=${contractFile}`,
    `--out=${staleBoundOut}`,
  ], { cwd: root });
  const staleBoundManifest = JSON.parse(fs.readFileSync(path.join(staleBoundOut, 'manifest.json')));
  assert.equal(staleBoundManifest.decisionBearing, false);
  assert.ok(staleBoundManifest.decisionContractIssues.includes(
    'researchOutcome.binding.resultConfigurationHashes disagree with published result files'));

  const staleRevisionOutcome = path.join(temp, 'stale-revision-outcome.json');
  fs.writeFileSync(staleRevisionOutcome, JSON.stringify({
    schemaVersion: 1,
    outcome: 'completed-positive',
    reason: 'stale revision verdict',
    binding: {
      populationIdentityHash: `sha256:${'a'.repeat(64)}`,
      resultConfigurationHashes: [primaryConfigurationHash],
      resultResolvedShas: ['c'.repeat(40)],
      resultContentHashes: [contentHash(primary)],
    },
  }));
  const staleRevisionOut = path.join(temp, 'stale-revision-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${primary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${staleRevisionOutcome}`,
    `--contract-file=${contractFile}`,
    `--out=${staleRevisionOut}`,
  ], { cwd: root });
  const staleRevisionManifest = JSON.parse(fs.readFileSync(path.join(staleRevisionOut, 'manifest.json')));
  assert.equal(staleRevisionManifest.decisionBearing, false);
  assert.ok(staleRevisionManifest.decisionContractIssues.includes(
    'researchOutcome.binding.resultResolvedShas disagree with published result files'));

  const staleContentOutcome = path.join(temp, 'stale-content-outcome.json');
  fs.writeFileSync(staleContentOutcome, JSON.stringify({
    schemaVersion: 1,
    outcome: 'completed-positive',
    reason: 'stale content verdict',
    binding: {
      populationIdentityHash: `sha256:${'a'.repeat(64)}`,
      resultConfigurationHashes: [primaryConfigurationHash],
      resultResolvedShas: ['b'.repeat(40)],
      resultContentHashes: [`sha256:${'9'.repeat(64)}`],
    },
  }));
  const staleContentOut = path.join(temp, 'stale-content-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${primary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${staleContentOutcome}`,
    `--contract-file=${contractFile}`,
    `--out=${staleContentOut}`,
  ], { cwd: root });
  const staleContentManifest = JSON.parse(fs.readFileSync(path.join(staleContentOut, 'manifest.json')));
  assert.equal(staleContentManifest.decisionBearing, false);
  assert.ok(staleContentManifest.decisionContractIssues.includes(
    'researchOutcome.binding.resultContentHashes disagree with published result files'));

  const wrongRevisionPrimary = path.join(temp, 'wrong-revision-result.json');
  fs.writeFileSync(wrongRevisionPrimary, JSON.stringify({
    producer: 'fixture-producer', entrypoint: 'fixture.mjs', workflowFamily: 'fixture-family',
    commitSha: 'c'.repeat(40), levels: [{ id: 'A', ok: true, status: 'success' }],
  }));
  const wrongRevisionOut = path.join(temp, 'wrong-revision-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${wrongRevisionPrimary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${outcome}`,
    `--contract-file=${contractFile}`,
    `--out=${wrongRevisionOut}`,
  ], { cwd: root });
  const wrongRevisionManifest = JSON.parse(fs.readFileSync(path.join(wrongRevisionOut, 'manifest.json')));
  assert.equal(wrongRevisionManifest.decisionBearing, false);
  assert.ok(wrongRevisionManifest.decisionContractIssues.includes('experiment.resolvedSha disagrees with primary result commit'));

  const missingRevisionPrimary = path.join(temp, 'missing-revision-result.json');
  fs.writeFileSync(missingRevisionPrimary, JSON.stringify({
    producer: 'fixture-producer', entrypoint: 'fixture.mjs', workflowFamily: 'fixture-family',
    configurationHash: primaryConfigurationHash,
    levels: [{ id: 'A', ok: true, status: 'success' }],
  }));
  const missingRevisionOut = path.join(temp, 'missing-revision-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${missingRevisionPrimary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${outcome}`,
    `--contract-file=${contractFile}`,
    `--out=${missingRevisionOut}`,
  ], { cwd: root });
  const missingRevisionManifest = JSON.parse(fs.readFileSync(path.join(missingRevisionOut, 'manifest.json')));
  assert.equal(missingRevisionManifest.decisionBearing, false);
  assert.ok(missingRevisionManifest.decisionContractIssues.includes(
    'primary result lacks immutable execution SHA needed to bind experiment.resolvedSha',
  ));

  const solverRefPrimary = path.join(temp, 'solver-ref-result.json');
  fs.writeFileSync(solverRefPrimary, JSON.stringify({
    producer: 'fixture-producer', entrypoint: 'fixture.mjs', workflowFamily: 'fixture-family',
    solverRef: 'b'.repeat(40), configurationHash: primaryConfigurationHash,
    levels: [{ id: 'A', ok: true, status: 'success' }],
  }));
  const solverRefOutcome = path.join(temp, 'solver-ref-outcome.json');
  fs.writeFileSync(solverRefOutcome, JSON.stringify({
    schemaVersion: 1,
    outcome: 'completed-positive',
    reason: 'solverRef-bound gate passed',
    binding: {
      populationIdentityHash: `sha256:${'a'.repeat(64)}`,
      resultConfigurationHashes: [primaryConfigurationHash],
      resultResolvedShas: ['b'.repeat(40)],
      resultContentHashes: [contentHash(solverRefPrimary)],
    },
  }));
  const solverRefOut = path.join(temp, 'solver-ref-out');
  execFileSync('node', [
    'scripts/publish-solver-sweep-result.mjs',
    `--primary=${solverRefPrimary}`,
    `--integrity-file=${integrity}`,
    `--outcome-file=${solverRefOutcome}`,
    `--contract-file=${contractFile}`,
    `--out=${solverRefOut}`,
  ], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(solverRefOut, 'manifest.json'))).decisionBearing, true,
    'an exact/reference-style solverRef is valid independent execution revision evidence when the verdict is bound to those exact result bytes');

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
  assert.equal(JSON.parse(fs.readFileSync(path.join(legacyValidOut, 'manifest.json'))).decisionBearing, false,
    'legacy integrity without explicit decisionValidComplete must remain readable but non-decision-bearing');

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

  // --- failure-evidence wiring ---
  const failureResponseFile = path.join(temp, 'failure-response-summary.json');
  fs.writeFileSync(failureResponseFile, JSON.stringify({
    schemaVersion: 1, kind: 'pathfinder-compact-failure-response',
    records: ['A', 'B', 'C'].map((identity, index) => ({ identity, outcome: index === 0 ? 'solved' : 'nodeLimited', attempts: [] })),
    summary: { observed: 3, outcomes: { solved: 1, exhaustedNegative: 0, nodeLimited: 2, workLimited: 0, deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 } },
    sourceFiles: [primary], missingSourceFiles: [], invalidSourceFiles: [],
  }));
  const compactContractFile = path.join(temp, 'compact-contract.json');
  const compactContract = JSON.parse(fs.readFileSync(contractFile));
  compactContract.sideEffects.telemetry = 'compact';
  fs.writeFileSync(compactContractFile, JSON.stringify(compactContract));
  const compactOut = path.join(temp, 'compact-out');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${compactContractFile}`, `--failure-response-file=${failureResponseFile}`, `--out=${compactOut}`], { cwd: root });
  const compactManifest = JSON.parse(fs.readFileSync(path.join(compactOut, 'manifest.json')));
  assert.equal(compactManifest.failureEvidence.disposition, 'compact');
  assert.equal(compactManifest.failureEvidence.compactPresent, true);
  assert.equal(compactManifest.failureEvidence.compactComplete, true);
  assert.equal(compactManifest.failureEvidence.summary.observed, 3);
  assert.equal(compactManifest.failureEvidence.publishedPath, 'failure-response/compact.json');
  assert.ok(compactManifest.entries.some(entry => entry.role === 'compact-failure-response'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(compactOut, 'failure-response/compact.json'))).populationIntegrity,
    JSON.parse(fs.readFileSync(integrity)), 'published compact rows inherit the authoritative population integrity');
  assert.equal(JSON.parse(fs.readFileSync(path.join(compactOut, 'failure-response/compact.json'))).runEnvelopeRef, '../manifest.json');
  assert.equal(compactManifest.failureEvidence.sourceArtifact, failureResponseFile);
  assert.equal(compactManifest.failureEvidence.richCapturePresent, false);

  const missingFailureResponseOut = path.join(temp, 'missing-failure-response-out');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${compactContractFile}`, `--failure-response-file=${path.join(temp, 'does-not-exist.json')}`, `--out=${missingFailureResponseOut}`], { cwd: root });
  const missingFailureResponseManifest = JSON.parse(fs.readFileSync(path.join(missingFailureResponseOut, 'manifest.json')));
  assert.equal(missingFailureResponseManifest.failureEvidence.compactPresent, false, 'a missing failure-response file must not fabricate a summary');
  assert.equal(missingFailureResponseManifest.decisionBearing, false, 'declared compact telemetry without its document fails closed');

  const malformedFailureResponse = path.join(temp, 'malformed-failure-response.json');
  fs.writeFileSync(malformedFailureResponse, JSON.stringify({ schemaVersion: 1, kind: 'wrong', records: [] }));
  const malformedOut = path.join(temp, 'malformed-failure-response-out');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${compactContractFile}`, `--failure-response-file=${malformedFailureResponse}`, `--out=${malformedOut}`], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(malformedOut, 'manifest.json'))).decisionBearing, false);

  const partialFailureResponse = path.join(temp, 'partial-failure-response.json');
  const partialDocument = JSON.parse(fs.readFileSync(failureResponseFile));
  partialDocument.missingSourceFiles = ['missing-shard.json'];
  fs.writeFileSync(partialFailureResponse, JSON.stringify(partialDocument));
  const partialOut = path.join(temp, 'partial-failure-response-out');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${compactContractFile}`, `--failure-response-file=${partialFailureResponse}`, `--out=${partialOut}`], { cwd: root });
  const partialManifest = JSON.parse(fs.readFileSync(path.join(partialOut, 'manifest.json')));
  assert.equal(partialManifest.failureEvidence.compactPresent, true, 'partial/red runs still publish their observed compact rows');
  assert.equal(partialManifest.failureEvidence.compactComplete, false);
  assert.equal(partialManifest.decisionBearing, false, 'partial compact telemetry cannot support a decision-bearing result');

  // a rich search-loss capture included alongside the primary result is detected generically
  const captureFile = path.join(temp, 'search-loss-capture.json');
  fs.writeFileSync(captureFile, JSON.stringify({ kind: 'pathfinder-search-loss-capture', schemaVersion: 1 }));
  const richCaptureOut = path.join(temp, 'rich-capture-out');
  execFileSync('node', ['scripts/publish-solver-sweep-result.mjs', `--primary=${primary}`, `--include=${captureFile}`, `--integrity-file=${integrity}`, `--outcome-file=${outcome}`, `--contract-file=${contractFile}`, `--out=${richCaptureOut}`], { cwd: root });
  assert.equal(JSON.parse(fs.readFileSync(path.join(richCaptureOut, 'manifest.json'))).failureEvidence.richCapturePresent, true);

  console.log('publish solver sweep result tests passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
