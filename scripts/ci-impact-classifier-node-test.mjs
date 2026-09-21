#!/usr/bin/env node
import assert from 'node:assert/strict';

import { classifyPaths } from './ci-impact-classifier.mjs';

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
  ['research', 'solver'],
);

expect(
  ['modules/ui/dom.ts', 'styles/components.css'],
  ['game'],
);

expect(
  ['data/levels.json'],
  ['data', 'game', 'research', 'solver'],
);

expect(
  ['modules/domain/path-validator.ts'],
  ['game', 'research', 'shared', 'solver'],
);

expect(
  ['package.json'],
  ['data', 'game', 'repo', 'research', 'shared', 'solver'],
  { full: true },
);

expect(
  ['.github/workflows/ci.yml'],
  ['data', 'game', 'repo', 'research', 'shared', 'solver'],
  { full: true },
);

const unknown = expect(
  ['brand-new-top-level-surface/example.txt'],
  ['data', 'game', 'repo', 'research', 'shared', 'solver'],
  { full: true },
);
assert.equal(unknown.files[0].rule, null);
assert.equal(unknown.files[0].reason, 'unclassified path');

const mixed = expect(
  ['docs/solver-research-operating-model.md', 'modules/solver/search.ts'],
  ['repo', 'research', 'solver'],
);
assert.deepEqual(mixed.files.map(file => file.rule), ['solver-research-docs', 'production-solver']);

console.log('CI impact classifier conservative routing tests passed.');
