import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildResearchPortfolioRetrospective } from './research-portfolio-retrospective-lib.mjs';
import { buildResearchSystemInventory, renderResearchSystemBrief } from './research-system-inventory-lib.mjs';
import {
  validateWs2FailureResponseAnalysisContract,
  ws2FailureResponseAnalysisContractIdentity,
} from './ws2-failure-response-analysis-contract-lib.mjs';

const inventory = buildResearchSystemInventory(process.cwd());
assert.equal(inventory.authority.kind, 'derived-read-only');
assert.equal(inventory.authority.priorityAuthority, 'docs/solver-optimization-workstreams.md');
assert.equal(inventory.integrationHealth.errorCount, 0,
  'research-system closeout requires the composed integration audit to be structurally clean');

const brief = renderResearchSystemBrief(inventory);
for (const heading of [
  '## Current state',
  '## Live queue',
  '## Recent structured closeouts',
  '## Deferred/reopen questions',
  '## Unfinished execution references',
  '## Consolidation signals',
]) {
  assert.ok(brief.includes(heading), `research brief must include ${heading}`);
}

const retrospective = buildResearchPortfolioRetrospective(process.cwd(), {
  startDate: '2026-09-12',
  endDate: '2026-09-19',
});
const frozenRetrospective = JSON.parse(readFileSync(
  'reports/2026-09-19-research-portfolio-retrospective-data-001.json',
  'utf8',
));
assert.deepEqual(retrospective, frozenRetrospective);
assert.equal(retrospective.explorationTriggers.some(row =>
  row.kind === 'ontology-or-representation-block' || row.kind === 'shared-negative-assumption'), false);

const provenanceAudit = readFileSync(
  'reports/2026-09-19-research-candidate-provenance-gap-audit-001.md',
  'utf8',
);
assert.match(provenanceAudit, /does \*\*not\*\* fire Bundle G/u);

const contractPath = 'reports/2026-09-19-ws2-failure-response-reconnaissance-analysis-contract-001.json';
const contract = validateWs2FailureResponseAnalysisContract(JSON.parse(readFileSync(contractPath, 'utf8')));
assert.match(ws2FailureResponseAnalysisContractIdentity(contract), /^sha256:[0-9a-f]{64}$/u);
assert.ok(contract.liveRivals.length >= 2);
assert.equal(contract.targetEnvelope.broadDeploymentClaim, false);
assert.ok(contract.prospectiveExpectation.surpriseConditions.length >= 1);
assert.match(contract.prospectiveExpectation.anomalyPolicy, /not scientific surprises/u);
assert.match(contract.independenceVector.taskFramingPrompt, /no prompt-level independence/u);
assert.match(contract.independenceVector.authorityContextExposure, /no authority\/context-exposure independence/u);

const earnedScope = readFileSync(
  'reports/2026-09-19-research-prospective-rigor-earned-scope-001.md',
  'utf8',
);
assert.match(earnedScope, /Hard-blind confirmation[\s\S]*Not implemented for this slice/u);
assert.match(earnedScope, /Bundle F is complete for the currently earned scope/u);

const conversionTest = readFileSync(
  'modules/solver/orchestration-portal-coarse-dead-last-retry.test.ts',
  'utf8',
);
assert.match(conversionTest, /promotion conversion-fidelity contract matches ordinary production callers/u);
assert.match(conversionTest, /ordinary solver-controller solveLevel call must continue to exercise production defaults/u);

const transaction = readFileSync('scripts/research-transaction-node-test.mjs', 'utf8');
assert.match(transaction, /transactionExperimentContract/u);
assert.match(transaction, /ws2AnalysisContract/u);
assert.match(transaction, /closeoutCapsule/u);

console.log('research-system consolidation closeout integration test passed');
