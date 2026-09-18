import assert from 'node:assert/strict';
import {
    beamResearchRecordToDecisionObservation,
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


const adapted = beamResearchRecordToDecisionObservation({
    stage: 'score-width-culled',
    depth: 5,
    work: 42,
    workSpent: 420,
    paths: [[3]],
    details: {
        beamWidth: 2,
        cutoffScore: 9,
        firstCulledScore: 8,
        stableOrderAdmission: false,
        rankedPool: [
            { path: [1], rank: 1, score: 10 },
            { path: [2], rank: 2, score: 9 },
            { path: [3], rank: 3, score: 8 },
        ],
        culled: [{ path: [3], rank: 3, score: 8 }],
    },
}, { parentId: 'P9', decisionOrdinal: 7 });
assert.equal(adapted.parentId, 'P9');
assert.equal(adapted.decisionId, 'score-width-culled@5#7');
assert.deepEqual(adapted.retainedCandidateIds, ['[1]', '[2]']);
assert.equal(adapted.context.cutoffScore, 9);
assert.equal(adapted.context.nodeProgress, 42);
assert.deepEqual(adapted.context.rankedCandidates.map(row => [row.rank, row.ints, row.retained]), [
    [1, 0, true], [2, 1, true], [3, 1, false],
]);
assert.equal(adapted.workSpentBefore, 420);
assert.equal(adapted.workSpentAfter, 420);
assert.equal(beamResearchRecordToDecisionObservation({
    stage: 'score-width-culled',
    depth: 5,
    work: 42,
    paths: [[3]],
    details: { rankedPool: [{ path: [3] }], culled: [{ path: [3] }] },
}, { parentId: 'P9' }), null);
assert.equal(beamResearchRecordToDecisionObservation({ stage: 'generated' }, { parentId: 'P9' }), null);

console.log('solver-decision-observation-lib-node-test: ok');
