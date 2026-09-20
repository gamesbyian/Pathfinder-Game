import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

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

const root = mkdtempSync(path.join(tmpdir(), 'research-ref-'));
try {
  mkdirSync(path.join(root, 'reports'), { recursive: true });
  writeFileSync(path.join(root, 'reports', 'present.md'), '# present\n');
  assert.equal(validateResearchRepositoryRef('reports/present.md', { root, requireFile: true }), 'reports/present.md');
  assert.throws(() => validateResearchRepositoryRef('reports/missing.md', { root, requireFile: true }), /does not exist/u);
  assert.throws(() => validateResearchRepositoryRef('reports', { root, requireFile: true, allowedRoots: ['reports'] }), /must identify a file/u);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('research repository-ref tests passed');
