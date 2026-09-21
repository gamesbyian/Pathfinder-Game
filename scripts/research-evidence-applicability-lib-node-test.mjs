import assert from 'node:assert/strict';

import {
  combineResearchEvidenceApplicability,
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

assert.equal(combineResearchEvidenceApplicability(['admissible']), 'admissible');
assert.equal(combineResearchEvidenceApplicability(['admissible', 'context-bound']), 'context-bound');
assert.equal(combineResearchEvidenceApplicability(['context-bound', 'inadmissible']), 'inadmissible');
assert.equal(
  combineResearchEvidenceApplicability(['admissible', 'context-bound', 'admissible']),
  combineResearchEvidenceApplicability(['context-bound', 'admissible', 'admissible']),
  'composition is commutative',
);
assert.equal(
  combineResearchEvidenceApplicability(['context-bound', 'context-bound']),
  'context-bound',
  'composition is idempotent',
);
assert.equal(
  combineResearchEvidenceApplicability([
    combineResearchEvidenceApplicability(['admissible', 'context-bound']),
    'inadmissible',
  ]),
  combineResearchEvidenceApplicability([
    'admissible',
    combineResearchEvidenceApplicability(['context-bound', 'inadmissible']),
  ]),
  'composition is associative',
);
assert.throws(
  () => combineResearchEvidenceApplicability([]),
  /non-empty array/u,
);
assert.throws(
  () => combineResearchEvidenceApplicability(['admissible', 'maybe']),
  /unknown research evidence applicability/u,
);

console.log('research evidence applicability tests passed');
