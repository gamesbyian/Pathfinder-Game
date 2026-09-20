/**
 * Structural vocabulary for research unit topology.
 *
 * This deliberately owns only the recurring shape. Specialist studies own the actual unit names,
 * causal meaning, estimand, and any constraints among the units.
 */

export const RESEARCH_UNIT_TOPOLOGY_FIELDS = Object.freeze([
  'observationUnit',
  'opportunityUnit',
  'assignmentUnit',
  'dependenceClusterUnit',
  'analysisUnit',
  'generalizationUnit',
]);

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;

export function researchUnitTopologyIssues(topology, { path = 'unitTopology' } = {}) {
  const issues = [];
  if (!topology || typeof topology !== 'object' || Array.isArray(topology)) return [path];

  for (const field of RESEARCH_UNIT_TOPOLOGY_FIELDS) {
    if (!(field in topology)) {
      issues.push(`${path}.${field}`);
      continue;
    }
    if (field === 'assignmentUnit') {
      if (!(topology[field] === null || nonEmpty(topology[field]))) issues.push(`${path}.${field}`);
    } else if (!nonEmpty(topology[field])) {
      issues.push(`${path}.${field}`);
    }
  }
  return issues;
}

export function validateResearchUnitTopology(topology, options = {}) {
  const issues = researchUnitTopologyIssues(topology, options);
  if (issues.length) throw new Error(`invalid research unit topology: ${issues.join(', ')}`);
  return topology;
}
