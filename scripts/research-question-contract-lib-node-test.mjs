import assert from 'node:assert/strict';

import {
  researchQuestionContractIssues,
  validateResearchQuestionContract,
} from './research-question-contract-lib.mjs';

const full = {
  questionId: 'Q-1',
  liveAmbiguity: 'which mechanism explains the residual?',
  discriminatingObservable: 'a prespecified contrast',
  outcomeInterpretation: { positive: 'supports tested form', negative: 'closes tested form' },
  measurementOpportunity: 'MO-007',
};

assert.deepEqual(researchQuestionContractIssues(full), []);
assert.equal(validateResearchQuestionContract(full), full);

const legacyWithoutId = { ...full };
delete legacyWithoutId.questionId;
assert.deepEqual(researchQuestionContractIssues(legacyWithoutId, { requireQuestionId: false }), []);
assert.ok(researchQuestionContractIssues(legacyWithoutId).includes('researchQuestion.questionId'));

assert.ok(researchQuestionContractIssues({
  ...full,
  measurementOpportunity: 'M7',
}).includes('researchQuestion.measurementOpportunity'));
assert.ok(researchQuestionContractIssues({
  ...full,
  outcomeInterpretation: {},
}).includes('researchQuestion.outcomeInterpretation'));
assert.deepEqual(researchQuestionContractIssues(null), []);

console.log('research question semantic contract tests passed');
