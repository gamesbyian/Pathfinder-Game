import assert from 'node:assert/strict';
import { combinePairedArmIntegrity } from './combine-paired-arm-integrity.mjs';

const base = {
  populationIdentityHash: 'sha256:abc',
  expectedCount: 10,
  observedCount: 10,
  coverageComplete: true,
  decisionValidComplete: true,
};

const bothValid = combinePairedArmIntegrity(base, base);
assert.equal(bothValid.coverageComplete, true);
assert.equal(bothValid.decisionValidComplete, true);
assert.equal(bothValid.populationIdentityHash, 'sha256:abc');
assert.equal(bothValid.expectedCount, 10);
assert.equal(bothValid.observedCount, 10);

const oneIndeterminate = combinePairedArmIntegrity(base, { ...base, decisionValidComplete: false });
assert.equal(oneIndeterminate.coverageComplete, true);
assert.equal(oneIndeterminate.decisionValidComplete, false, 'one indeterminate arm must not make the pair decision-valid');

const oneIncomplete = combinePairedArmIntegrity(base, { ...base, coverageComplete: false, decisionValidComplete: false });
assert.equal(oneIncomplete.coverageComplete, false);
assert.equal(oneIncomplete.decisionValidComplete, false);

assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, populationIdentityHash: 'sha256:different' }),
  /different populations/,
);
assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, expectedCount: 9 }),
  /expectedCount/,
);
assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, observedCount: 9 }),
  /observedCount/,
);
assert.throws(
  () => combinePairedArmIntegrity(base, { ...base, populationIdentityHash: null }),
  /different populations/,
);

console.log('combine paired arm integrity tests passed');
