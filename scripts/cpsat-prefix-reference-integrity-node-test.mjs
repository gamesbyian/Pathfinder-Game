import assert from 'node:assert/strict';
import { buildCaseIntegrity } from './cpsat-prefix-reference-integrity.mjs';

const expected = ['a', 'b', 'c'];

const allDecisive = buildCaseIntegrity(expected, [
  { caseId: 'a', referenceLabel: 'live' },
  { caseId: 'b', referenceLabel: 'dead' },
  { caseId: 'c', referenceLabel: 'dead' },
]);
assert.equal(allDecisive.coverageComplete, true);
assert.equal(allDecisive.decisionValidComplete, true);
assert.deepEqual(allDecisive.outcomes, { live: 1, dead: 2, timeoutAbstain: 0, correctnessAlarm: 0, inputAlarm: 0, malformed: 0 });

const withAbstain = buildCaseIntegrity(expected, [
  { caseId: 'a', referenceLabel: 'live' },
  { caseId: 'b', referenceLabel: 'dead' },
  { caseId: 'c', referenceLabel: 'timeout/abstain' },
]);
assert.equal(withAbstain.coverageComplete, true, 'coverage is complete even though one row is indeterminate');
assert.equal(withAbstain.decisionValidComplete, false, 'a timeout/abstain row must not be decision-valid');

const withAlarm = buildCaseIntegrity(expected, [
  { caseId: 'a', referenceLabel: 'live', correctnessAlarm: true },
  { caseId: 'b', referenceLabel: 'dead' },
  { caseId: 'c', referenceLabel: 'dead' },
]);
assert.equal(withAlarm.coverageComplete, true);
assert.equal(withAlarm.decisionValidComplete, false, 'a correctness alarm must block decision-bearing status even on a labeled row');

const missing = buildCaseIntegrity(expected, [
  { caseId: 'a', referenceLabel: 'live' },
  { caseId: 'b', referenceLabel: 'dead' },
]);
assert.equal(missing.coverageComplete, false);
assert.deepEqual(missing.missingIds, ['c']);
assert.equal(missing.decisionValidComplete, false);

console.log('cpsat prefix reference integrity tests passed');
