import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createFailureResponseDocument } from './solver-failure-response-lib.mjs';
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
  assert.equal(result.scientificDisposition.status, 'eligible-for-prespecified-routing');
  assert.equal(result.observation.summary.independentParents, 2);
  assert.equal(result.decision.status, 'pending-interpretation');
  assert.equal(result.decision.route, null);
  assert.equal(result.analysisContract.identityHash, ws2FailureResponseAnalysisContractIdentity(contract));

  const routed = spawnSync(process.execPath, [
    'scripts/ws2-failure-response-reconnaissance.mjs',
    `--in=${eligiblePath}`,
    `--analysis-contract=${contractPath}`,
    '--route=none',
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(routed.status, 0, routed.stderr);
  const routedResult = JSON.parse(routed.stdout);
  assert.equal(routedResult.decision.status, 'selected');
  assert.equal(routedResult.decision.route, 'none');

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
