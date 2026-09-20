import { createHash } from 'node:crypto';

export const WS2_FAILURE_RESPONSE_ROUTES = Object.freeze([
  'rejection-counterfactual',
  'first-loss',
  'producer-consumer-2x2',
  'allocation-specific-follow-up',
  'none',
  'unresolved-needs-compact-diagnostics',
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

export function ws2FailureResponseAnalysisContractIssues(contract) {
  const issues = [];
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return ['contract'];
  if (contract.schemaVersion !== 1) issues.push('schemaVersion');
  if (contract.kind !== 'pathfinder-ws2-failure-response-analysis-contract') issues.push('kind');
  if (contract.questionId !== 'WS2-FAILURE-RESPONSE-RECONNAISSANCE') issues.push('questionId');
  if (contract.evidenceRole !== 'development-discriminator-selection') issues.push('evidenceRole');
  if (contract.decisionPurpose !== 'scientific-question-discrimination') issues.push('decisionPurpose');
  if (contract.independentUnit !== 'parent') issues.push('independentUnit');
  if (contract.analysisImplementation !== 'scripts/failure-response-query.mjs') issues.push('analysisImplementation');
  if (!Array.isArray(contract.allowedRoutes)
      || contract.allowedRoutes.length !== WS2_FAILURE_RESPONSE_ROUTES.length
      || WS2_FAILURE_RESPONSE_ROUTES.some(route => !contract.allowedRoutes.includes(route))) {
    issues.push('allowedRoutes');
  }
  const eligibility = contract.populationEligibility;
  for (const field of ['knownProtocolHash', 'knownSolverRef', 'completeMissingnessAccounting']) {
    if (eligibility?.[field] !== true) issues.push(`populationEligibility.${field}`);
  }
  if (eligibility?.mixedProtocolPolicy !== 'partition-or-reject-primary-comparison') {
    issues.push('populationEligibility.mixedProtocolPolicy');
  }
  if (contract.solvedControlPolicy !== 'required-for-failure-specific-nomination-when-not-naturally-present') {
    issues.push('solvedControlPolicy');
  }
  if (contract.censoringPolicy !== 'indeterminate-not-negative') issues.push('censoringPolicy');
  if (contract.selectionPolicy !== 'prespecified-stage-a-then-stage-b-only-if-unresolved') issues.push('selectionPolicy');
  if (!Array.isArray(contract.primaryQuantities) || contract.primaryQuantities.length === 0) issues.push('primaryQuantities');
  if (!contract.stopRule || typeof contract.stopRule !== 'string') issues.push('stopRule');
  return [...new Set(issues)];
}

export function validateWs2FailureResponseAnalysisContract(contract) {
  const issues = ws2FailureResponseAnalysisContractIssues(contract);
  if (issues.length) throw new Error(`invalid WS2 failure-response analysis contract: ${issues.join(', ')}`);
  return contract;
}

export function ws2FailureResponseAnalysisContractIdentity(contract) {
  validateWs2FailureResponseAnalysisContract(contract);
  const canonical = JSON.stringify(stable(contract));
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}
