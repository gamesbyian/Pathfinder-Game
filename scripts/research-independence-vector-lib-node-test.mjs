import assert from 'node:assert/strict';

import {
  RESEARCH_INDEPENDENCE_AXES,
  researchIndependenceVectorIssues,
  validateResearchIndependenceVector,
} from './research-independence-vector-lib.mjs';

const vector = {
  reference: 'relative-to-development-lineage',
  sampleData: 'independent fresh sample',
  parentFamily: 'independent parent units',
  sourceConstruction: 'shared generator family',
  decisionSeam: 'different production consumer seam',
  instrumentImplementation: 'shared exact/reference implementation',
  analysisMethod: 'partially shared semantics',
  analystModel: 'not claimed',
  taskFramingPrompt: 'shared framing',
  authorityContextExposure: 'shared authority context',
  ontologyVocabulary: 'shared vocabulary',
  criticalLibraryCode: 'shared common-mode libraries',
};

assert.equal(validateResearchIndependenceVector(vector), vector);
assert.deepEqual(RESEARCH_INDEPENDENCE_AXES.length, 11);
assert.deepEqual(researchIndependenceVectorIssues({ ...vector, analystModel: '' }), [
  'independenceVector.analystModel',
]);
assert.throws(() => validateResearchIndependenceVector({
  ...vector,
  confidenceScore: 0.8,
}), /independenceVector\.confidenceScore/u);

console.log('research independence vector tests passed');
