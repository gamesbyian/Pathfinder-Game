function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function researchQuestionContractIssues(question, { requireQuestionId = true, path = 'researchQuestion' } = {}) {
  if (question == null) return [];
  const issues = [];
  if (!question || typeof question !== 'object' || Array.isArray(question)) return [path];

  if (requireQuestionId || question.questionId != null) {
    if (!nonEmptyString(question.questionId)) issues.push(`${path}.questionId`);
  }
  for (const field of ['liveAmbiguity', 'discriminatingObservable']) {
    if (!nonEmptyString(question[field])) issues.push(`${path}.${field}`);
  }
  if (!question.outcomeInterpretation || typeof question.outcomeInterpretation !== 'object'
      || Array.isArray(question.outcomeInterpretation)
      || Object.keys(question.outcomeInterpretation).length === 0) {
    issues.push(`${path}.outcomeInterpretation`);
  }
  if (question.measurementOpportunity != null
      && (!nonEmptyString(question.measurementOpportunity)
          || !/^MO-\d{3}$/u.test(question.measurementOpportunity))) {
    issues.push(`${path}.measurementOpportunity`);
  }
  return [...new Set(issues)];
}

export function validateResearchQuestionContract(question, options = {}) {
  const issues = researchQuestionContractIssues(question, options);
  if (issues.length) throw new Error(`invalid research question contract: ${issues.join(', ')}`);
  return question;
}
