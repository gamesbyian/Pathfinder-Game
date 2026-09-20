import { canonicalResearchValue, researchSemanticHash } from './research-semantic-identity-lib.mjs';

export const WS2_FAILURE_RESPONSE_ROUTES = Object.freeze([
  'rejection-counterfactual',
  'first-loss',
  'producer-consumer-2x2',
  'allocation-specific-follow-up',
  'none',
  'unresolved-needs-compact-diagnostics',
]);

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
  if (instrument?.calibration?.runId !== '35423841173') issues.push('instrument.calibration.runId');
  if (instrument?.calibration?.semanticParity !== true) issues.push('instrument.calibration.semanticParity');
  if (!Number.isFinite(instrument?.calibration?.representativeCompactWallOverheadPct)) {
    issues.push('instrument.calibration.representativeCompactWallOverheadPct');
  }
  if (!Number.isFinite(instrument?.calibration?.representativeCompactPayloadBytesApprox)) {
    issues.push('instrument.calibration.representativeCompactPayloadBytesApprox');
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
  for (const field of ['taskFramingPrompt', 'authorityContextExposure', 'ontologyVocabulary', 'criticalLibraryCode']) {
    if (typeof contract.independenceVector?.[field] !== 'string' || !contract.independenceVector[field].trim()) {
      issues.push(`independenceVector.${field}`);
    }
  }
  if ('framingContext' in (contract.independenceVector ?? {})) issues.push('independenceVector.framingContext');
  if (!Array.isArray(contract.liveRivals) || contract.liveRivals.length < 2) issues.push('liveRivals');
  if (typeof contract.prospectiveExpectation?.expectedShape !== 'string'
      || !contract.prospectiveExpectation.expectedShape.trim()) {
    issues.push('prospectiveExpectation.expectedShape');
  }
  if (!Array.isArray(contract.prospectiveExpectation?.surpriseConditions)
      || contract.prospectiveExpectation.surpriseConditions.length === 0
      || contract.prospectiveExpectation.surpriseConditions.some(value => typeof value !== 'string' || !value.trim())) {
    issues.push('prospectiveExpectation.surpriseConditions');
  }
  if (typeof contract.prospectiveExpectation?.anomalyPolicy !== 'string'
      || !contract.prospectiveExpectation.anomalyPolicy.trim()) {
    issues.push('prospectiveExpectation.anomalyPolicy');
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
  return researchSemanticHash(contract);
}


export function ws2FailureResponseAnalysisIdentity(analysis) {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) {
    throw new Error('analysis must be an object');
  }
  const { analysisIdentity: _identity, ...core } = analysis;
  const execution = core.execution ?? {};
  const observation = core.observation ?? {};
  const filters = { ...(observation.filters ?? {}) };
  delete filters.in;
  const semanticCore = {
    ...core,
    execution: {
      ...execution,
      inputFiles: undefined,
      inputArtifacts: (execution.inputArtifacts ?? [])
        .map(item => item?.contentHash ?? null)
        .filter(Boolean)
        .sort(),
    },
    observation: {
      ...observation,
      inputs: undefined,
      filters,
      rows: Array.isArray(observation.rows)
        ? observation.rows
          .map(({ __sourceFile: _sourceFile, ...row }) => row)
          .sort((left, right) => JSON.stringify(canonicalResearchValue(left)).localeCompare(JSON.stringify(canonicalResearchValue(right))))
        : observation.rows,
    },
  };
  return researchSemanticHash(semanticCore);
}


export function ws2FailureResponseAnalysisEnvelopeIssues(analysis, { contractIdentity = null } = {}) {
  const issues = [];
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) return ['analysis'];
  if (analysis.schemaVersion !== 1) issues.push('schemaVersion');
  if (analysis.kind !== 'pathfinder-ws2-failure-response-reconnaissance-analysis') issues.push('kind');
  if (analysis.questionId !== 'WS2-FAILURE-RESPONSE-RECONNAISSANCE') issues.push('questionId');
  if (analysis.analysisContract?.evidenceRole !== 'development-discriminator-selection') {
    issues.push('analysisContract.evidenceRole');
  }
  if (analysis.analysisContract?.decisionPurpose !== 'scientific-question-discrimination') {
    issues.push('analysisContract.decisionPurpose');
  }
  if (contractIdentity != null && analysis.analysisContract?.identityHash !== contractIdentity) {
    issues.push('analysisContract.identityHash');
  }
  if (!['eligible-for-prespecified-routing', 'ineligible'].includes(analysis.scientificDisposition?.status)) {
    issues.push('scientificDisposition.status');
  }
  if (!['pending-interpretation', 'selected'].includes(analysis.decision?.status)) {
    issues.push('decision.status');
  }
  if (analysis.decision?.status === 'selected') {
    if (!WS2_FAILURE_RESPONSE_ROUTES.includes(analysis.decision?.route)) issues.push('decision.route');
    if (typeof analysis.decision?.rationale !== 'string' || !analysis.decision.rationale.trim()) {
      issues.push('decision.rationale');
    }
  } else if (analysis.decision?.route != null) {
    issues.push('decision.route');
  }
  if (analysis.analysisIdentity !== ws2FailureResponseAnalysisIdentity(analysis)) issues.push('analysisIdentity');
  return [...new Set(issues)];
}

export function validateWs2FailureResponseAnalysisEnvelope(analysis, options = {}) {
  const issues = ws2FailureResponseAnalysisEnvelopeIssues(analysis, options);
  if (issues.length) throw new Error(`invalid WS2 failure-response analysis envelope: ${issues.join(', ')}`);
  return analysis;
}
