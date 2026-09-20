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
  const topology = contract.unitTopology;
  if (topology?.observationUnit !== 'failure-response-record') issues.push('unitTopology.observationUnit');
  if (topology?.opportunityUnit !== 'parent') issues.push('unitTopology.opportunityUnit');
  if (topology?.dependenceClusterUnit !== 'parent') issues.push('unitTopology.dependenceClusterUnit');
  if (topology?.analysisUnit !== 'parent') issues.push('unitTopology.analysisUnit');
  if (topology?.generalizationUnit !== 'current-residual-parent-under-compatible-protocol') issues.push('unitTopology.generalizationUnit');
  if (topology?.assignmentUnit !== null) issues.push('unitTopology.assignmentUnit');
  if (contract.analysisImplementation !== 'scripts/failure-response-query.mjs') issues.push('analysisImplementation');
  const instrument = contract.instrument;
  if (instrument?.kind !== 'pathfinder-compact-failure-response') issues.push('instrument.kind');
  if (instrument?.supportPolicy !== 'reported-fields-only-missing-remains-unknown') issues.push('instrument.supportPolicy');
  if (instrument?.schemaVersion !== 1) issues.push('instrument.schemaVersion');
  if (!Array.isArray(instrument?.abstentionConditions) || instrument.abstentionConditions.length === 0) {
    issues.push('instrument.abstentionConditions');
  }
  if (instrument?.calibrationRef !== 'reports/2026-09-19-failure-evidence-prehandoff-direct-work-audit-001.md') {
    issues.push('instrument.calibrationRef');
  }
  const applicability = contract.currentApplicability;
  if (applicability?.basis !== 'solver-and-protocol-relative') issues.push('currentApplicability.basis');
  if (!Array.isArray(applicability?.refreshTriggers) || applicability.refreshTriggers.length === 0) {
    issues.push('currentApplicability.refreshTriggers');
  }
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
  if (contract.populationSelection !== 'first-eligible-post-instrumentation-population-no-outcome-based-population-selection') {
    issues.push('populationSelection');
  }
  if (contract.primaryDiscriminator !== 'cheapest-next-ws2-instrument-route') issues.push('primaryDiscriminator');
  if (contract.negativeResolution !== 'route-none-does-not-imply-no-mechanism-exists') issues.push('negativeResolution');
  if (contract.reproducibility?.class !== 'deterministic-under-identical-immutable-inputs') {
    issues.push('reproducibility.class');
  }
  if (contract.targetEnvelope?.developmentLaboratory !== 'current-ws2-residual') issues.push('targetEnvelope.developmentLaboratory');
  if (contract.targetEnvelope?.broadDeploymentClaim !== false) issues.push('targetEnvelope.broadDeploymentClaim');
  if (contract.adaptiveLineage?.descendantEvidenceRole !== 'development-until-new-precommitment') {
    issues.push('adaptiveLineage.descendantEvidenceRole');
  }
  if (contract.independenceVector?.sampleData !== 'parent-clustered; repeated records/attempts within one parent are dependent') {
    issues.push('independenceVector.sampleData');
  }
  if (contract.independenceVector?.instrumentImplementation !== 'shared compact failure-response implementation') {
    issues.push('independenceVector.instrumentImplementation');
  }
  if (contract.treatmentFidelity !== 'not-applicable-routing-screen-no-treatment') issues.push('treatmentFidelity');
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


export function ws2FailureResponseAnalysisIdentity(analysis) {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new Error('analysis must be an object');
  }
  const { analysisIdentity: _identity, ...core } = analysis;
  return `sha256:${createHash('sha256').update(JSON.stringify(stable(core))).digest('hex')}`;
}
