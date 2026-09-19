import assert from 'node:assert/strict';
import { buildCaseIntegrity, parseExpectedIdsFile } from './cpsat-prefix-reference-integrity.mjs';

// Regression: ids may legitimately embed commas (e.g. a levelId:sortedCutCells.join(',')::caseId
// disambiguator, since the same physical prefix can cross two distinct cuts -- see PR #1902's
// case-id fix and the bug it left behind in this file's own expected-ids parsing). The file is
// always one id per line; splitting on commas too shreds any such id into bogus fragments.
const commaBearingIds = parseExpectedIdsFile(
  'R00046:131081,196618::R00046:frontier-4758\nR00046:2,65537::R00046:frontier-4758\n');
assert.deepEqual(commaBearingIds, [
  'R00046:131081,196618::R00046:frontier-4758',
  'R00046:2,65537::R00046:frontier-4758',
], 'ids containing commas must survive as single tokens, not be split at the comma');

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
