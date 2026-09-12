import assert from 'node:assert/strict';
import { combinePopulationIntegrity } from './combine-population-integrity.mjs';

const base = {
  complete: true,
  coverageComplete: true,
  decisionValidComplete: false,
  expectedCount: 2,
  observedCount: 2,
  expectedIds: ['a', 'b'],
  duplicateIds: [],
  unexpectedIds: [],
  missingIds: [],
  outcomes: { solved: 1, unknown: 1 },
};
const combined = combinePopulationIntegrity([
  { label: 'c1', integrity: base },
  { label: 'c2', integrity: { ...base, complete: false, coverageComplete: false, decisionValidComplete: false, observedCount: 1, missingIds: ['b'], outcomes: { solved: 1, missing: 1 } } },
], { kind: 'test-population' });
assert.equal(combined.complete, false);
assert.equal(combined.coverageComplete, false);
assert.equal(combined.decisionValidComplete, false);
assert.equal(combined.expectedCount, 4);
assert.equal(combined.observedCount, 3);
assert.deepEqual(combined.missingIds, ['c2:b']);
assert.deepEqual(combined.outcomes, { missing: 1, solved: 2, unknown: 1 });
assert.deepEqual(combined.expectedIds, ['c1:a', 'c1:b', 'c2:a', 'c2:b']);
assert.match(combined.populationIdentityHash, /^sha256:[0-9a-f]{64}$/);

const fullyValid = combinePopulationIntegrity([
  { label: 'c1', integrity: { ...base, decisionValidComplete: true, outcomes: { solved: 1, nodeLimited: 1 } } },
  { label: 'c2', integrity: { ...base, decisionValidComplete: true, outcomes: { solved: 2 } } },
]);
assert.equal(fullyValid.coverageComplete, true);
assert.equal(fullyValid.decisionValidComplete, true);

assert.throws(() => combinePopulationIntegrity([{ label: 'x', integrity: base }, { label: 'x', integrity: base }]), /unique/);
console.log('combine population integrity tests passed');
