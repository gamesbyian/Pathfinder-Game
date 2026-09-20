import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createFailureResponseDocument } from './solver-failure-response-lib.mjs';
import { ws2FailureResponseInvalidationImpact } from './ws2-failure-response-claim-lib.mjs';
import {
  validateWs2FailureResponseAnalysisContract,
  ws2FailureResponseAnalysisContractIdentity,
} from './ws2-failure-response-analysis-contract-lib.mjs';

const contractPath = 'reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-contract-001.json';
const contract = validateWs2FailureResponseAnalysisContract(
  JSON.parse(await import('node:fs').then(({ readFileSync }) => readFileSync(contractPath, 'utf8'))),
);
assert.match(ws2FailureResponseAnalysisContractIdentity(contract), /^sha256:[0-9a-f]{64}$/u);
assert.throws(() => validateWs2FailureResponseAnalysisContract({ ...contract, independentUnit: 'attempt' }), /independentUnit/);

const temp = mkdtempSync(path.join(tmpdir(), 'ws2-failure-response-analysis-'));
try {
  const integrity = {
    coverageComplete: true,
    decisionValidComplete: true,
    expectedCount: 2,
    observedCount: 2,
    duplicateIds: [],
    unexpectedIds: [],
    missingIds: [],
    outcomes: { solved: 1, exhaustedNegative: 1 },
  };
  const eligibleDoc = createFailureResponseDocument([
    {
      id: 'P1',
      ok: true,
      status: 'success',
      runId: 'run-1',
      protocolHash: 'protocol-a',
      solverRef: 'a'.repeat(40),
      attempts: [{ stageId: 'main', actionKey: 'baseline', status: 'success', workSpent: 10, nodesExpanded: 10 }],
    },
    {
      id: 'P2',
      ok: false,
      status: 'exhausted',
      runId: 'run-1',
      protocolHash: 'protocol-a',
      solverRef: 'a'.repeat(40),
      attempts: [{ stageId: 'main', actionKey: 'baseline', status: 'exhausted', workSpent: 10, nodesExpanded: 10 }],
    },
  ], {
    populationIntegrity: integrity,
    protocolHash: 'protocol-a',
    solverRef: 'a'.repeat(40),
  });
  const eligiblePath = path.join(temp, 'eligible.json');
  writeFileSync(eligiblePath, JSON.stringify(eligibleDoc));

  const run = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${eligiblePath}`,
    `--analysis-contract=${contractPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.execution.status, 'completed');
  assert.match(result.execution.implementationHash, /^sha256:[0-9a-f]{64}$/u);
  assert.match(result.execution.inputArtifacts[0].contentHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(result.scientificDisposition.status, 'eligible-for-prespecified-routing');
  assert.equal(result.scientificDisposition.unitTopology.analysisUnit, 'parent');
  assert.equal(result.scientificDisposition.unitTopology.observationUnit, 'failure-response-record');
  assert.equal(result.scientificDisposition.instrument.kind, 'pathfinder-compact-failure-response');
  assert.equal(result.scientificDisposition.currentApplicability.basis, 'solver-and-protocol-relative');
  assert.equal(result.scientificDisposition.adaptiveLineage.descendantEvidenceRole, 'development-until-new-precommitment');
  assert.equal(result.scientificDisposition.treatmentFidelity, 'not-applicable-routing-screen-no-treatment');
  assert.equal(result.observation.summary.independentParents, 2);
  assert.equal(result.decision.status, 'pending-interpretation');
  assert.equal(result.decision.route, null);
  const pendingAnalysisPath = path.join(temp, 'pending-analysis.json');
  writeFileSync(pendingAnalysisPath, JSON.stringify(result));
  const pendingClaim = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-claim.mjs',
    `--analysis=${pendingAnalysisPath}`,
    `--out=${path.join(temp, 'pending-claim.json')}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(pendingClaim.status, 0);
  assert.match(`${pendingClaim.stdout}${pendingClaim.stderr}`, /explicit selected routing decision/u);
  assert.equal(result.analysisContract.identityHash, ws2FailureResponseAnalysisContractIdentity(contract));
  const relocatedEligiblePath = path.join(temp, 'relocated-eligible.json');
  writeFileSync(relocatedEligiblePath, JSON.stringify(eligibleDoc));
  const relocated = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${relocatedEligiblePath}`,
    `--analysis-contract=${contractPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(relocated.status, 0, relocated.stderr);
  assert.equal(JSON.parse(relocated.stdout).analysisIdentity, result.analysisIdentity,
    'scientific analysis identity must be invariant to local evidence file location');

  const routedAnalysisPath = path.join(temp, 'routed-analysis.json');
  const routed = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${eligiblePath}`,
    `--analysis-contract=${contractPath}`,
    '--route=none',
    `--out=${routedAnalysisPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(routed.status, 0, routed.stderr);
  const routedResult = JSON.parse(routed.stdout);
  assert.equal(routedResult.decision.status, 'selected');
  assert.equal(routedResult.decision.route, 'none');
  const claimPath = path.join(temp, 'claim.json');
  const claimRun = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-claim.mjs',
    `--analysis=${routedAnalysisPath}`,
    `--out=${claimPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  const tamperedAnalysisPath = path.join(temp, 'tampered-analysis.json');
  const tamperedAnalysis = { ...routedResult, decision: { ...routedResult.decision, route: 'first-loss' } };
  writeFileSync(tamperedAnalysisPath, JSON.stringify(tamperedAnalysis));
  const tamperedClaim = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-claim.mjs',
    `--analysis=${tamperedAnalysisPath}`,
    `--out=${path.join(temp, 'tampered-claim.json')}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(tamperedClaim.status, 0);
  assert.match(`${tamperedClaim.stdout}${tamperedClaim.stderr}`, /valid analysisIdentity matching analysis content/u);
  assert.equal(claimRun.status, 0, claimRun.stderr);
  const claim = JSON.parse(await import('node:fs').then(({ readFileSync }) => readFileSync(claimPath, 'utf8')));
  assert.equal(claim.kind, 'pathfinder-ws2-failure-response-claim-capsule');
  assert.equal(claim.scientificDisposition.status, 'supports-prespecified-routing-decision');
  assert.equal(claim.decisionDisposition.route, 'none');
  assert.equal(claim.populationScope.unitTopology.analysisUnit, 'parent');
  assert.equal(claim.scientificDisposition.adaptiveLineage.descendantEvidenceRole, 'development-until-new-precommitment');
  assert.match(claim.analysisIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(claim.derivation.edges.find(edge => edge.kind === 'input-artifact').contentHash, /^sha256:[0-9a-f]{64}$/u);
  assert.match(claim.derivation.edges.find(edge => edge.kind === 'analysis-implementation').contentHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(claim.reverseInvalidation.policy, 'flag-material-descendants-do-not-auto-rewrite');
  const contractImpact = ws2FailureResponseInvalidationImpact(claim, {
    kind: 'analysis-contract',
    ref: contractPath,
  });
  assert.deepEqual(contractImpact.affected.map(row => row.target).sort(), ['routing-decision', 'scientific-claim']);
  assert.equal(contractImpact.automaticRewrite, false);
  const unrelatedImpact = ws2FailureResponseInvalidationImpact(claim, {
    kind: 'input-artifact',
    ref: 'not-used.json',
  });
  assert.deepEqual(unrelatedImpact.affected, []);

  const ineligibleDoc = {
    ...eligibleDoc,
    protocolHash: null,
    records: eligibleDoc.records.map(row => ({ ...row, protocolHash: null })),
  };
  const ineligiblePath = path.join(temp, 'ineligible.json');
  writeFileSync(ineligiblePath, JSON.stringify(ineligibleDoc));
  const ineligible = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${ineligiblePath}`,
    `--analysis-contract=${contractPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(ineligible.status, 0, ineligible.stderr);
  const ineligibleResult = JSON.parse(ineligible.stdout);
  assert.equal(ineligibleResult.execution.status, 'completed');
  assert.equal(ineligibleResult.scientificDisposition.status, 'ineligible');
  assert.ok(ineligibleResult.scientificDisposition.reasons.some(reason => reason.includes('unknown protocolHash')));

  const invalidRoute = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${ineligiblePath}`,
    `--analysis-contract=${contractPath}`,
    '--route=first-loss',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(invalidRoute.status, 0);
  assert.match(`${invalidRoute.stdout}${invalidRoute.stderr}`, /scientifically ineligible evidence/u);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('WS2 failure-response analysis-contract tests passed');
