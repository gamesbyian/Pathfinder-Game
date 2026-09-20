import assert from 'node:assert/strict';

import {
  RESEARCH_UNIT_TOPOLOGY_FIELDS,
  researchUnitTopologyIssues,
  validateResearchUnitTopology,
} from './research-unit-topology-lib.mjs';

const topology = {
  observationUnit: 'attempt',
  opportunityUnit: 'parent-action',
  assignmentUnit: null,
  dependenceClusterUnit: 'parent',
  analysisUnit: 'parent',
  generalizationUnit: 'eligible-parent-under-protocol',
};

assert.deepEqual(RESEARCH_UNIT_TOPOLOGY_FIELDS, [
  'observationUnit',
  'opportunityUnit',
  'assignmentUnit',
  'dependenceClusterUnit',
  'analysisUnit',
  'generalizationUnit',
]);
assert.equal(validateResearchUnitTopology(topology), topology);
assert.deepEqual(researchUnitTopologyIssues({ ...topology, assignmentUnit: 'parent' }), []);
assert.deepEqual(researchUnitTopologyIssues({ ...topology, observationUnit: '' }), ['unitTopology.observationUnit']);
assert.deepEqual(researchUnitTopologyIssues({ ...topology, assignmentUnit: '' }), ['unitTopology.assignmentUnit']);
assert.deepEqual(researchUnitTopologyIssues({ ...topology, generalizationUnit: undefined }), ['unitTopology.generalizationUnit']);
assert.deepEqual(researchUnitTopologyIssues(null), ['unitTopology']);
assert.deepEqual(researchUnitTopologyIssues({ ...topology, analysisUnit: '' }, { path: 'study.units' }), ['study.units.analysisUnit']);
assert.throws(() => validateResearchUnitTopology({ ...topology, opportunityUnit: null }), /unitTopology\.opportunityUnit/u);

console.log('research unit topology tests passed');
