import assert from 'node:assert/strict';

import {
  RESEARCH_EVALUATION_EVIDENCE_ROLES,
  isResearchEvaluationEvidenceRole,
  validateResearchEvaluationEvidenceRole,
} from './research-evaluation-evidence-role-lib.mjs';

assert.deepEqual(RESEARCH_EVALUATION_EVIDENCE_ROLES, ['development', 'confirmation', 'transfer']);
for (const role of RESEARCH_EVALUATION_EVIDENCE_ROLES) {
  assert.equal(isResearchEvaluationEvidenceRole(role), true);
  assert.equal(validateResearchEvaluationEvidenceRole(role), role);
}
for (const role of ['forensic', 'challenge', 'historical', '', null]) {
  assert.equal(isResearchEvaluationEvidenceRole(role), false);
}
assert.throws(
  () => validateResearchEvaluationEvidenceRole('forensic'),
  /evidenceRole must be one of: development, confirmation, transfer/u,
);

console.log('research evaluation evidence-role tests passed');
