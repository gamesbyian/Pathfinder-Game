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

const RESEARCH_EVIDENCE_APPLICABILITY_RANK = Object.freeze({
  inadmissible: 0,
  'context-bound': 1,
  admissible: 2,
});

/**
 * Conservatively compose applicability values that have already been classified
 * for the same evidence purpose/regime. This is a meet: the weakest required
 * constituent bounds the combined use.
 */
export function combineResearchEvidenceApplicability(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('research evidence applicability combination requires a non-empty array');
  }
  let combined = 'admissible';
  for (const value of values) {
    validateResearchEvidenceApplicability(value);
    if (RESEARCH_EVIDENCE_APPLICABILITY_RANK[value] < RESEARCH_EVIDENCE_APPLICABILITY_RANK[combined]) {
      combined = value;
    }
  }
  return combined;
}
