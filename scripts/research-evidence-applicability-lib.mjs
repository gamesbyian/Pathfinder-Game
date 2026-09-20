export const RESEARCH_EVIDENCE_APPLICABILITY = Object.freeze([
  'admissible',
  'context-bound',
  'inadmissible',
]);

export function validateResearchEvidenceApplicability(value) {
  if (!RESEARCH_EVIDENCE_APPLICABILITY.includes(value)) {
    throw new Error(`unknown research evidence applicability: ${value}`);
  }
  return value;
}
