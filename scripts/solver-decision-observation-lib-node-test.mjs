import assert from 'node:assert/strict';
import {
    createDecisionObservationCollector,
    summarizeDecisionObservations,
    validateDecisionObservation,
} from './solver-decision-observation-lib.mjs';

const row = {
    decisionId: 'd1',
    parentId: 'P1',
    stageId: 'beam',
    candidateIds: ['a', 'b', 'c'],
    orderedCandidateIds: ['b', 'a', 'c'],
    retainedCandidateIds: ['b', 'a'],
    workSpentBefore: 10,
    workSpentAfter: 14,
    observerCost: 2,
    annotation: { support: 'SUPPORTED', preferredCandidateIds: ['c'] },
};
assert.equal(validateDecisionObservation(row), row);
assert.throws(() => validateDecisionObservation({ ...row, orderedCandidateIds: ['a', 'b'] }), /permutation/);
assert.throws(() => validateDecisionObservation({ ...row, retainedCandidateIds: ['z'] }), /subset/);
assert.throws(() => validateDecisionObservation({ ...row, workSpentAfter: 9 }), /monotone/);

const collector = createDecisionObservationCollector(1);
collector.observe(row);
collector.observe({ ...row, decisionId: 'd2', parentId: 'P2', retainedCandidateIds: ['b', 'a', 'c'],
    annotation: { support: 'UNKNOWN' }, observerCost: 3 });
const snapshot = collector.snapshot();
assert.equal(snapshot.observed, 2);
assert.equal(snapshot.retained, 1);
assert.equal(snapshot.truncated, true);
assert.deepEqual(summarizeDecisionObservations(snapshot), {
    observed: 2,
    retained: 1,
    truncated: true,
    independentParentsObserved: 1,
    cutoffBearingDecisions: 1,
    supportedAnnotations: 1,
    annotationDisagreements: 1,
    totalObserverCost: 2,
});

console.log('solver-decision-observation-lib-node-test: ok');
