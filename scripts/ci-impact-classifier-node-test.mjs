#!/usr/bin/env node
import assert from 'node:assert/strict';

import { classifyChangeSet, classifyChanges, classifyPackageJsonDocuments, classifyPaths, parseGitNameStatusZ } from './ci-impact-classifier.mjs';

function expect(paths, surfaces, { full = false } = {}) {
  const result = classifyPaths(paths);
  assert.equal(result.full, full, `full mismatch for ${paths.join(', ')}`);
  assert.deepEqual(result.surfaces, [...surfaces].sort(), `surface mismatch for ${paths.join(', ')}`);
  return result;
}

expect(
  ['docs/solver-optimization-workstreams.md', 'reports/2026-09-21-example.md'],
  ['repo', 'research'],
);

expect(
  ['scripts/stress/forced-work-prevalence.mjs', 'data/stress/example.json'],
  ['data', 'research'],
);

expect(
  ['modules/solver/search.ts'],
  ['solver'],
);

expect(
  ['modules/ui/dom.ts', 'styles/components.css'],
  ['game'],
);

expect(
  ['modules/persistence/local-level-hints-repository.ts'],
  ['game', 'persistence'],
);

expect(
  ['data/levels.json'],
  ['data', 'game', 'research', 'solver'],
);

expect(
  ['modules/domain/path-validator.ts'],
  ['game', 'research', 'solver'],
);

expect(
  ['package.json'],
  ['data', 'game', 'persistence', 'repo', 'research', 'shared', 'solver'],
  { full: true },
);

expect(
  ['.github/workflows/ci.yml'],
  ['data', 'game', 'persistence', 'repo', 'research', 'shared', 'solver'],
  { full: true },
);

const unknown = expect(
  ['brand-new-top-level-surface/example.txt'],
  ['data', 'game', 'persistence', 'repo', 'research', 'shared', 'solver'],
  { full: true },
);
assert.equal(unknown.files[0].rule, null);
assert.equal(unknown.files[0].reason, 'unclassified path');

const mixed = expect(
  ['docs/solver-research-operating-model.md', 'modules/solver/search.ts'],
  ['repo', 'research', 'solver'],
);
assert.deepEqual(mixed.files.map(file => file.rule), ['solver-research-docs', 'production-solver']);



const routerSelfTest = expect(
  ['scripts/ci-impact-classifier-node-test.mjs'],
  ['data', 'game', 'persistence', 'repo', 'research', 'shared', 'solver'],
  { full: true },
);
assert.equal(routerSelfTest.files[0].rule, 'ci-routing-infrastructure');

const registeredRepoHarness = expect(
  ['scripts/documentation-index-lib-node-test.mjs'],
  ['repo'],
);
assert.equal(registeredRepoHarness.files[0].rule, 'registered-validation-entrypoint');

const registeredPersistenceHarness = expect(
  ['scripts/firestore-rules-test.mjs'],
  ['persistence'],
);
assert.equal(registeredPersistenceHarness.files[0].rule, 'registered-validation-entrypoint');

const registeredCrossSurfaceHarness = expect(
  ['scripts/portfolio-solve-sweep-lib-node-test.mjs'],
  ['research', 'solver'],
);
assert.equal(registeredCrossSurfaceHarness.files[0].rule, 'registered-validation-entrypoint');

const registeredResearchOnlyFormerSharedHarness = expect(
  ['scripts/signature-collision-analysis-node-test.mjs'],
  ['research'],
);
assert.equal(registeredResearchOnlyFormerSharedHarness.files[0].rule, 'registered-validation-entrypoint');

const packageBase = {
  name: 'pathfinder-game',
  private: true,
  type: 'module',
  scripts: {
    existing: 'node scripts/research-status-index.mjs',
  },
  dependencies: { firebase: '^12.15.0' },
};

const researchScriptOnly = classifyPackageJsonDocuments(packageBase, {
  ...packageBase,
  scripts: {
    ...packageBase.scripts,
    'research:semantic-forcedness-capture': 'node scripts/run-bundled.mjs scripts/stress/semantic-forcedness-capture.mjs',
    'test:semantic-forcedness': 'node scripts/stress/semantic-forcedness-lib-node-test.mjs',
  },
});
assert.equal(researchScriptOnly.full, false);
assert.deepEqual(researchScriptOnly.surfaces, ['research']);

const dependencyChange = classifyPackageJsonDocuments(packageBase, {
  ...packageBase,
  dependencies: { firebase: '^13.0.0' },
});
assert.equal(dependencyChange.full, true);

const opaqueScriptChange = classifyPackageJsonDocuments(packageBase, {
  ...packageBase,
  scripts: { ...packageBase.scripts, build: 'vite build' },
});
assert.equal(opaqueScriptChange.full, true);

const ciScriptChange = classifyPackageJsonDocuments(packageBase, {
  ...packageBase,
  scripts: {
    ...packageBase.scripts,
    'check:dead-scripts': 'node scripts/check-package-scripts.mjs',
  },
});
assert.equal(ciScriptChange.full, true);

const validationAggregateChange = classifyPackageJsonDocuments(packageBase, {
  ...packageBase,
  scripts: {
    ...packageBase.scripts,
    'test:node': 'node scripts/run-scripts-parallel.mjs test:research-query',
  },
});
assert.equal(
  validationAggregateChange.full,
  true,
  'validation aggregate composition must remain full-impact CI authority',
);



assert.deepEqual(
  parseGitNameStatusZ('M\0docs/solver-future-work.md\0D\0modules/solver/old.ts\0R100\0scripts/old.mjs\0scripts/new.mjs\0'),
  [
    { status: 'M', path: 'docs/solver-future-work.md' },
    { status: 'D', path: 'modules/solver/old.ts' },
    { status: 'R', path: 'scripts/new.mjs', previousPath: 'scripts/old.mjs' },
  ],
);

const deletedSolver = classifyChanges([{ status: 'D', path: 'modules/solver/search.ts' }]);
assert.equal(deletedSolver.full, false);
assert.deepEqual(deletedSolver.surfaces, ['solver']);

const renamedAcrossBoundary = classifyChanges([{
  status: 'R',
  previousPath: 'modules/solver/search.ts',
  path: 'scripts/stress/search-copy.mjs',
}]);
assert.equal(renamedAcrossBoundary.full, false);
assert.deepEqual(renamedAcrossBoundary.surfaces, ['research', 'solver']);

const malformedChange = classifyChanges([{ status: 'X', path: 'docs/solver-future-work.md' }]);
assert.equal(malformedChange.full, true);
assert.deepEqual(malformedChange.surfaces, ['data', 'game', 'persistence', 'repo', 'research', 'shared', 'solver']);


const composedResearchPackage = classifyChangeSet(
  [
    { status: 'M', path: 'package.json' },
    { status: 'A', path: 'scripts/stress/semantic-forcedness-capture.mjs' },
    { status: 'A', path: 'docs/solver-semantic-forcedness-preflight.md' },
  ],
  {
    packageBase,
    packageHead: {
      ...packageBase,
      scripts: {
        ...packageBase.scripts,
        'research:semantic-forcedness-capture': 'node scripts/run-bundled.mjs scripts/stress/semantic-forcedness-capture.mjs',
      },
    },
  },
);
assert.equal(composedResearchPackage.full, false);
assert.deepEqual(composedResearchPackage.surfaces, ['repo', 'research']);

const composedDependencyChange = classifyChangeSet(
  [{ status: 'M', path: 'package.json' }],
  {
    packageBase,
    packageHead: {
      ...packageBase,
      dependencies: { firebase: '^13.0.0' },
    },
  },
);
assert.equal(composedDependencyChange.full, true);

const packageWithoutDocuments = classifyChangeSet([{ status: 'M', path: 'package.json' }]);
assert.equal(packageWithoutDocuments.full, true);

console.log('CI impact classifier conservative routing tests passed.');
