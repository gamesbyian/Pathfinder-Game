#!/usr/bin/env node
import assert from 'node:assert/strict';

import { finalStatusPasses, packSurfaces } from './ci-execution-plan.mjs';

const research = packSurfaces(['repo', 'research']);
assert.equal(research.jobs['fast-gate'].required, true);
assert.equal(research.jobs['deep-verification'].required, false);
assert.deepEqual(research.jobs['fast-gate'].capabilities, ['lint']);

const solver = packSurfaces(['repo', 'research', 'solver']);
assert.equal(solver.jobs['fast-gate'].required, true);
assert.equal(solver.jobs['deep-verification'].required, true);
assert.deepEqual(solver.jobs['fast-gate'].capabilities, ['lint', 'build']);
assert.deepEqual(solver.jobs['deep-verification'].capabilities, ['unit-coverage', 'deep-proofs']);

const persistence = packSurfaces(['repo', 'game', 'persistence']);
assert.equal(persistence.jobs['deep-verification'].required, true);
assert.deepEqual(persistence.jobs['deep-verification'].capabilities, ['unit-coverage', 'firestore-boundary']);

const full = packSurfaces(['data', 'game', 'persistence', 'repo', 'research', 'shared', 'solver']);
assert.equal(full.jobs['fast-gate'].required, true);
assert.equal(full.jobs['deep-verification'].required, true);
assert.deepEqual(full.jobs['fast-gate'].capabilities, ['lint', 'solver-canary', 'build']);
assert.deepEqual(full.jobs['deep-verification'].capabilities, ['unit-coverage', 'deep-proofs', 'firestore-boundary']);

assert.equal(finalStatusPasses({
  'impact-shadow': 'success',
  'fast-gate': 'success',
  'deep-verification': 'success',
}), true);

assert.equal(finalStatusPasses({
  'impact-shadow': 'success',
  'fast-gate': 'success',
  'deep-verification': 'skipped',
}), true);

for (const bad of [
  { 'impact-shadow': 'failure', 'fast-gate': 'success', 'deep-verification': 'skipped' },
  { 'impact-shadow': 'success', 'fast-gate': 'failure', 'deep-verification': 'skipped' },
  { 'impact-shadow': 'success', 'fast-gate': 'success', 'deep-verification': 'failure' },
  { 'impact-shadow': 'success', 'fast-gate': 'success', 'deep-verification': 'cancelled' },
]) assert.equal(finalStatusPasses(bad), false);

console.log('CI execution-plan tests passed.');
