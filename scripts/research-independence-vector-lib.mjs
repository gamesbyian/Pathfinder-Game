export const RESEARCH_INDEPENDENCE_AXES = Object.freeze([
  'sampleData',
  'parentFamily',
  'sourceConstruction',
  'decisionSeam',
  'instrumentImplementation',
  'analysisMethod',
  'analystModel',
  'taskFramingPrompt',
  'authorityContextExposure',
  'ontologyVocabulary',
  'criticalLibraryCode',
]);

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function researchIndependenceVectorIssues(vector, { path = 'independenceVector' } = {}) {
  if (!vector || typeof vector !== 'object' || Array.isArray(vector)) return [path];
  const issues = [];
  if (!nonEmpty(vector.reference)) issues.push(`${path}.reference`);
  for (const axis of RESEARCH_INDEPENDENCE_AXES) {
    if (!nonEmpty(vector[axis])) issues.push(`${path}.${axis}`);
  }
  for (const key of Object.keys(vector)) {
    if (key !== 'reference' && !RESEARCH_INDEPENDENCE_AXES.includes(key)) {
      issues.push(`${path}.${key}`);
    }
  }
  return [...new Set(issues)];
}

export function validateResearchIndependenceVector(vector, options = {}) {
  const issues = researchIndependenceVectorIssues(vector, options);
  if (issues.length) throw new Error(`invalid research independence vector: ${issues.join(', ')}`);
  return vector;
}
