#!/usr/bin/env node
import assert from 'node:assert/strict';

import { planValidation } from './ci-validation-plan.mjs';

const researchOnly = planValidation(['repo', 'research']);
assert.deepEqual(researchOnly.validatorGroups, ['repo', 'research']);
assert.deepEqual(researchOnly.nodeTestGroups, ['repo', 'research']);
assert.deepEqual(researchOnly.capabilities, ['lint']);

const solver = planValidation(['repo', 'research', 'solver']);
assert.deepEqual(solver.validatorGroups, ['repo', 'research', 'solver']);
assert.deepEqual(solver.nodeTestGroups, ['repo', 'research', 'solver']);
assert.deepEqual(solver.capabilities, ['build', 'deep-proofs', 'lint', 'solver-canary', 'unit-coverage']);

const persistence = planValidation(['game', 'persistence', 'repo']);
assert.deepEqual(persistence.validatorGroups, ['game', 'repo']);
assert.deepEqual(persistence.nodeTestGroups, ['game', 'persistence', 'repo']);
assert.deepEqual(persistence.capabilities, ['build', 'firestore-boundary', 'lint', 'unit-coverage']);

assert.throws(() => planValidation(['banana']), /unknown validation surface banana/u);

console.log('CI validation plan tests passed.');
