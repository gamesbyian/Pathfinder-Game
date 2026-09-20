import assert from 'node:assert/strict';

import {
  buildResearchPopulationIntegrity,
  classifyResearchObservationOutcome,
  researchObservationIdentity,
} from './research-observation-integrity-lib.mjs';

assert.equal(researchObservationIdentity({ cellId: 'C1' }), 'C1');
assert.equal(classifyResearchObservationOutcome({ id: 'a', ok: true }), 'solved');
assert.equal(classifyResearchObservationOutcome({ id: 'b', status: 'deadline-truncated' }), 'deadlineTruncated');
assert.equal(classifyResearchObservationOutcome({ id: 'c', status: 'exhausted' }), 'exhaustedNegative');
assert.equal(classifyResearchObservationOutcome({ id: 'd', error: 'boom' }), 'harnessError');

const complete = buildResearchPopulationIntegrity(['a', 'b'], [
  { id: 'a', ok: true },
  { id: 'b', status: 'exhausted' },
]);
assert.equal(complete.coverageComplete, true);
assert.equal(complete.decisionValidComplete, true);

const censored = buildResearchPopulationIntegrity(['a', 'b'], [
  { id: 'a', ok: true },
  { id: 'b', status: 'timeout' },
]);
assert.equal(censored.coverageComplete, true);
assert.equal(censored.decisionValidComplete, false);
assert.equal(censored.outcomes.deadlineTruncated, 1);

const incomplete = buildResearchPopulationIntegrity(['a', 'b'], [
  { id: 'a', ok: true },
]);
assert.equal(incomplete.coverageComplete, false);
assert.deepEqual(incomplete.missingIds, ['b']);

console.log('research observation integrity tests passed');
