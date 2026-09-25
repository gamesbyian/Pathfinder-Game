#!/usr/bin/env node
import assert from 'node:assert/strict';

import { finalStatusPasses, packSurfaces } from './ci-execution-plan.mjs';

const research = packSurfaces(['repo', 'research']);
assert.equal(research.jobs['fast-gate'].required, true);
assert.equal(research.jobs['node-contracts'].required, true);
assert.equal(research.jobs['deep-verification'].required, false);
assert.equal(research.jobs['deep-services'].required, false);
assert.deepEqual(research.jobs['fast-gate'].capabilities, ['lint']);
assert.deepEqual(research.jobs['node-contracts'].nodeTestGroups, ['repo', 'research']);

const solver = packSurfaces(['solver']);
assert.equal(solver.jobs['fast-gate'].required, true);
assert.equal(solver.jobs['node-contracts'].required, true);
assert.equal(solver.jobs['deep-verification'].required, true);
assert.equal(solver.jobs['deep-services'].required, true);
assert.deepEqual(solver.jobs['fast-gate'].capabilities, ['lint', 'build']);
assert.deepEqual(solver.jobs['node-contracts'].nodeTestGroups, ['solver']);
assert.deepEqual(solver.jobs['deep-verification'].capabilities, ['unit-coverage']);
assert.deepEqual(solver.jobs['deep-services'].capabilities, ['deep-proofs']);

const persistence = packSurfaces(['repo', 'game', 'persistence']);
assert.equal(persistence.jobs['deep-verification'].required, true);
assert.equal(persistence.jobs['deep-services'].required, true);
assert.deepEqual(persistence.jobs['deep-verification'].capabilities, ['unit-coverage']);
assert.deepEqual(persistence.jobs['deep-services'].capabilities, ['firestore-boundary']);

const full = packSurfaces(['data', 'game', 'persistence', 'repo', 'research', 'shared', 'solver']);
assert.equal(full.jobs['fast-gate'].required, true);
assert.equal(full.jobs['node-contracts'].required, true);
assert.equal(full.jobs['deep-verification'].required, true);
assert.equal(full.jobs['deep-services'].required, true);
assert.deepEqual(full.jobs['fast-gate'].capabilities, ['lint', 'build']);
assert.deepEqual(full.jobs['deep-verification'].capabilities, ['unit-coverage']);
assert.deepEqual(full.jobs['deep-services'].capabilities, ['deep-proofs', 'firestore-boundary']);

const green = {
  'impact-shadow': 'success',
  'fast-gate': 'success',
  'node-contracts': 'success',
  'deep-verification': 'success',
  'deep-services': 'success',
};
assert.equal(finalStatusPasses(green), true);
assert.equal(finalStatusPasses({ ...green, 'deep-verification': 'skipped' }), true);
assert.equal(finalStatusPasses({ ...green, 'deep-services': 'skipped' }), true);
assert.equal(finalStatusPasses({ ...green, 'deep-verification': 'skipped', 'deep-services': 'skipped' }), true);

for (const bad of [
  { ...green, 'impact-shadow': 'failure' },
  { ...green, 'fast-gate': 'failure' },
  { ...green, 'node-contracts': 'failure' },
  { ...green, 'node-contracts': 'cancelled' },
  { ...green, 'deep-verification': 'failure' },
  { ...green, 'deep-verification': 'cancelled' },
  { ...green, 'deep-services': 'failure' },
  { ...green, 'deep-services': 'cancelled' },
]) assert.equal(finalStatusPasses(bad), false);

console.log('CI execution-plan tests passed.');
