import assert from 'node:assert/strict';

import {
  RESEARCH_EVIDENCE_APPLICABILITY,
  validateResearchEvidenceApplicability,
} from './research-evidence-applicability-lib.mjs';

assert.deepEqual(
  [...RESEARCH_EVIDENCE_APPLICABILITY],
  ['admissible', 'context-bound', 'inadmissible'],
);
for (const value of RESEARCH_EVIDENCE_APPLICABILITY) {
  assert.equal(validateResearchEvidenceApplicability(value), value);
}
assert.throws(
  () => validateResearchEvidenceApplicability('maybe'),
  /unknown research evidence applicability/u,
);

console.log('research evidence applicability tests passed');
