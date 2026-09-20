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
  ws2FailureResponseAnalysisIdentity,
} from './ws2-failure-response-analysis-contract-lib.mjs';

const contractPath = 'reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-contract-001.json';
const contract = validateWs2FailureResponseAnalysisContract(
  JSON.parse(await import('node:fs').then(({ readFileSync }) => readFileSync(contractPath, 'utf8'))),
);
assert.match(ws2FailureResponseAnalysisContractIdentity(contract), /^sha256:[0-9a-f]{64}$/u);
assert.ok(contract.liveRivals.length >= 2);
assert.deepEqual(contract.requiredObservabilityAxes, ['measurementSupport', 'fidelity', 'coverage']);
assert.match(contract.resolutionOutcomeInterpretation.routeNone, /does not imply no mechanism exists/u);
assert.match(contract.independenceVector.taskFramingPrompt, /no prompt-level independence/u);
assert.match(contract.independenceVector.authorityContextExposure, /no authority\/context-exposure independence/u);
assert.match(contract.independenceVector.criticalLibraryCode, /no critical-code independence/u);
assert.match(contract.prospectiveExpectation.expectedShape, /Stage A/u);
assert.ok(contract.prospectiveExpectation.surpriseConditions.length >= 2);
assert.match(contract.prospectiveExpectation.anomalyPolicy, /not scientific surprises/u);
assert.throws(() => validateWs2FailureResponseAnalysisContract({
  ...contract,
  prospectiveExpectation: {
    ...contract.prospectiveExpectation,
    surpriseConditions: [],
  },
}), /prospectiveExpectation\.surpriseConditions/);
assert.throws(() => validateWs2FailureResponseAnalysisContract({
  ...contract,
  independenceVector: {
    ...contract.independenceVector,
    framingContext: 'legacy collapsed axis',
    taskFramingPrompt: undefined,
  },
}), /independenceVector\.taskFramingPrompt|independenceVector\.framingContext/);
assert.throws(() => validateWs2FailureResponseAnalysisContract({ ...contract, independentUnit: 'attempt' }), /independentUnit/);
assert.throws(() => validateWs2FailureResponseAnalysisContract({
  ...contract,
  requiredObservabilityAxes: ['eligibility', 'coverage'],
}), /requiredObservabilityAxes/);

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
  assert.equal(result.scientificDisposition.instrument.calibration.semanticParity, true);
  assert.equal(result.scientificDisposition.instrument.calibration.representativeCompactWallOverheadPct, 0.46);
  assert.equal(result.scientificDisposition.currentApplicability.basis, 'solver-and-protocol-relative');
  assert.equal(result.scientificDisposition.adaptiveLineage.descendantEvidenceRole, 'development-until-new-precommitment');
  assert.equal(result.scientificDisposition.treatmentFidelity, 'not-applicable-routing-screen-no-treatment');
  assert.equal(result.scientificDisposition.resolution.kind, 'pathfinder-research-resolution-envelope');
  assert.equal(result.scientificDisposition.resolution.resolutionStatus, 'resolution-ready');
  assert.deepEqual(result.scientificDisposition.resolution.requiredAxes, ['measurementSupport', 'fidelity', 'coverage']);
  assert.deepEqual(result.scientificDisposition.resolution.outcomeInterpretation,
    contract.resolutionOutcomeInterpretation);
  assert.equal(result.scientificDisposition.resolution.axes.reach.status, 'not-required');
  assert.equal(result.scientificDisposition.resolution.negativeInterpretationPolicy,
    'route-none-does-not-imply-no-mechanism-exists');
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

  const oneParentIntegrity = {
    ...integrity,
    expectedCount: 1,
    observedCount: 1,
    outcomes: { solved: 1 },
  };
  const producerA = {
    ...eligibleDoc,
    records: [{ ...eligibleDoc.records[0], producer: 'producer-family-a' }],
    summary: { ...eligibleDoc.summary, observed: 1 },
    populationIntegrity: oneParentIntegrity,
  };
  const producerB = {
    ...eligibleDoc,
    records: [{ ...eligibleDoc.records[1], producer: 'producer-family-b' }],
    summary: { ...eligibleDoc.summary, observed: 1 },
    populationIntegrity: { ...oneParentIntegrity, outcomes: { exhaustedNegative: 1 } },
  };
  const producerAPath = path.join(temp, 'producer-a.json');
  const producerBPath = path.join(temp, 'producer-b.json');
  writeFileSync(producerAPath, JSON.stringify(producerA));
  writeFileSync(producerBPath, JSON.stringify(producerB));
  const producerAB = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${producerAPath},${producerBPath}`,
    `--analysis-contract=${contractPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  const producerBA = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${producerBPath},${producerAPath}`,
    `--analysis-contract=${contractPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(producerAB.status, 0, producerAB.stderr);
  assert.equal(producerBA.status, 0, producerBA.stderr);
  const producerABResult = JSON.parse(producerAB.stdout);
  const producerBAResult = JSON.parse(producerBA.stdout);
  assert.equal(producerABResult.analysisIdentity, producerBAResult.analysisIdentity,
    'compatible producer document order must not change the semantic analysis identity');
  assert.equal(producerABResult.scientificDisposition.status, 'eligible-for-prespecified-routing');
  assert.equal(producerABResult.observation.summary.independentParents, 2);
  assert.deepEqual(
    new Set(producerABResult.observation.rows.map(row => row.producer)),
    new Set(['producer-family-a', 'producer-family-b']),
  );
  assert.equal(producerABResult.scientificDisposition.independenceVector.instrumentImplementation,
    'shared compact failure-response implementation',
    'producer diversity is descriptive and must not become an implementation-independence claim');

  const routedAnalysisPath = path.join(temp, 'routed-analysis.json');
  const routed = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${eligiblePath}`,
    `--analysis-contract=${contractPath}`,
    '--route=none',
    '--decision-rationale=Stage A contains no prespecified contrast that earns expensive follow-up',
    `--out=${routedAnalysisPath}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(routed.status, 0, routed.stderr);
  const routedResult = JSON.parse(routed.stdout);
  assert.equal(routedResult.decision.status, 'selected');
  assert.equal(routedResult.decision.route, 'none');
  assert.match(routedResult.decision.rationale, /no prespecified contrast/u);
  const missingRationale = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${eligiblePath}`,
    `--analysis-contract=${contractPath}`,
    '--route=none',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(missingRationale.status, 0);
  assert.match(`${missingRationale.stdout}${missingRationale.stderr}`, /decision-rationale/u);
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
  assert.match(`${tamperedClaim.stdout}${tamperedClaim.stderr}`, /analysisIdentity/u);
  const contractDivergentPath = path.join(temp, 'contract-divergent-analysis.json');
  const contractDivergent = {
    ...routedResult,
    analysisContract: { ...routedResult.analysisContract, identityHash: `sha256:${'f'.repeat(64)}` },
  };
  contractDivergent.analysisIdentity = ws2FailureResponseAnalysisIdentity(contractDivergent);
  writeFileSync(contractDivergentPath, JSON.stringify(contractDivergent));
  const contractDivergentClaim = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-claim.mjs',
    `--analysis=${contractDivergentPath}`,
    `--out=${path.join(temp, 'contract-divergent-claim.json')}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(contractDivergentClaim.status, 0);
  assert.match(`${contractDivergentClaim.stdout}${contractDivergentClaim.stderr}`, /analysisContract\.identityHash/u,
    'a rehashed analysis cannot silently replace the frozen pre-outcome contract');
  assert.equal(claimRun.status, 0, claimRun.stderr);
  const claim = JSON.parse(await import('node:fs').then(({ readFileSync }) => readFileSync(claimPath, 'utf8')));
  assert.equal(claim.kind, 'pathfinder-ws2-failure-response-claim-capsule');
  assert.equal(claim.scientificDisposition.status, 'supports-prespecified-routing-decision');
  assert.equal(claim.decisionDisposition.route, 'none');
  assert.match(claim.decisionDisposition.rationale, /no prespecified contrast/u);
  assert.equal(claim.decisionDisposition.productionChangeLicensed, false);
  assert.match(claim.decisionDisposition.consequence, /No expensive WS2 follow-up is earned/u);
  assert.equal(claim.populationScope.unitTopology.analysisUnit, 'parent');
  assert.equal(claim.populationScope.selection, 'first-eligible-post-instrumentation-population-no-outcome-based-population-selection');
  assert.equal(claim.scientificDisposition.primaryDiscriminator, 'cheapest-next-ws2-instrument-route');
  assert.equal(claim.scientificDisposition.negativeResolution, 'route-none-does-not-imply-no-mechanism-exists');
  assert.equal(claim.scientificDisposition.reproducibility.class, 'deterministic-under-identical-immutable-inputs');
  assert.equal(claim.scientificDisposition.adaptiveLineage.descendantEvidenceRole, 'development-until-new-precommitment');
  assert.match(claim.analysisIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(claim.claimIdentity, /^sha256:[0-9a-f]{64}$/u);
  assert.match(claim.derivation.edges.find(edge => edge.kind === 'input-artifact').contentHash, /^sha256:[0-9a-f]{64}$/u);
  assert.match(claim.derivation.edges.find(edge => edge.kind === 'analysis-implementation').contentHash, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(claim.reverseInvalidation.policy, 'flag-material-descendants-do-not-auto-rewrite');
  const contractImpact = ws2FailureResponseInvalidationImpact(claim, {
    kind: 'analysis-contract',
    ref: contractPath,
  });
  assert.deepEqual(contractImpact.affected.map(row => row.target).sort(), ['routing-decision', 'scientific-claim']);
  assert.equal(contractImpact.automaticRewrite, false);
  const tamperedClaimCapsule = {
    ...claim,
    decisionDisposition: { ...claim.decisionDisposition, route: 'first-loss' },
  };
  assert.throws(() => ws2FailureResponseInvalidationImpact(tamperedClaimCapsule, {
    kind: 'analysis-contract',
    ref: contractPath,
  }), /valid claimIdentity matching claim content/u);
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
  assert.equal(ineligibleResult.scientificDisposition.resolution.resolutionStatus, 'observability-blocked');
  assert.ok(ineligibleResult.scientificDisposition.resolution.blockers.some(row => row.axis === 'fidelity'));
  assert.ok(ineligibleResult.scientificDisposition.resolution.blockers.some(row =>
    row.axis === 'fidelity' && row.remediation === 'configuration-or-protocol-reconciliation'));
  assert.ok(ineligibleResult.scientificDisposition.reasons.some(reason => reason.includes('unknown protocolHash')));

  const invalidRoute = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${ineligiblePath}`,
    `--analysis-contract=${contractPath}`,
    '--route=first-loss',
    '--decision-rationale=Prespecified Stage A route test',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(invalidRoute.status, 0);
  assert.match(`${invalidRoute.stdout}${invalidRoute.stderr}`, /resolution is blocked/u);
} finally {
  rmSync(temp, { recursive: true, force: true });
}

console.log('WS2 failure-response analysis-contract tests passed');
