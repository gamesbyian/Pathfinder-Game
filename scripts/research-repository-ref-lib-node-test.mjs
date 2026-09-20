import assert from 'node:assert/strict';
import { researchRepositoryRefIssues, validateResearchRepositoryRef } from './research-repository-ref-lib.mjs';

assert.deepEqual(researchRepositoryRefIssues('reports/result.json'), []);
assert.deepEqual(researchRepositoryRefIssues('docs/plan.md', { allowedRoots: ['docs'] }), []);
assert.ok(researchRepositoryRefIssues('reports/result.json and more')[0]?.includes('does not') === false
  || researchRepositoryRefIssues('reports/result.json and more').length > 0);
assert.ok(researchRepositoryRefIssues('../reports/result.json').length > 0);
assert.ok(researchRepositoryRefIssues('/reports/result.json').length > 0);
assert.ok(researchRepositoryRefIssues('reports/a.md#section').length > 0);
assert.ok(researchRepositoryRefIssues('reports/one.md\nreports/two.md').length > 0);
assert.ok(researchRepositoryRefIssues('`reports/a.md`').length > 0);

const root = process.cwd();
assert.equal(validateResearchRepositoryRef('reports/README.md', { root, requireFile: true }), 'reports/README.md');
assert.throws(() => validateResearchRepositoryRef('reports/__definitely-missing-research-ref__.md', {
  root,
  requireFile: true,
}), /does not exist/u);
assert.throws(() => validateResearchRepositoryRef('reports', {
  root,
  requireFile: true,
  allowedRoots: ['reports'],
}), /must identify a file/u);

console.log('research repository-ref tests passed');
