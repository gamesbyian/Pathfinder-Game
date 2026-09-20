export const RESEARCH_EVALUATION_EVIDENCE_ROLES = Object.freeze([
  'development',
  'confirmation',
  'transfer',
]);

const ROLE_SET = new Set(RESEARCH_EVALUATION_EVIDENCE_ROLES);

export function isResearchEvaluationEvidenceRole(value) {
  return ROLE_SET.has(value);
}

export function validateResearchEvaluationEvidenceRole(value, { path = 'evidenceRole' } = {}) {
  if (!isResearchEvaluationEvidenceRole(value)) {
    throw new Error(`${path} must be one of: ${RESEARCH_EVALUATION_EVIDENCE_ROLES.join(', ')}`);
  }
  return value;
}
