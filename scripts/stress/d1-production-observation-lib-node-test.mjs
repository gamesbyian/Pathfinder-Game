import assert from 'node:assert/strict';

import {
    buildD1ResearchBlock,
    candidateRevisitCells,
    classifyD1CandidateQueryResults,
    freezeD1Eligibility,
    isPathPrefix,
    summarizeD1AnnotatedDecisions,
    validateD1AnnotationPlan,
} from './d1-production-observation-lib.mjs';

const d1Block = buildD1ResearchBlock({
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    corpus: 'data/stress/stress-levels-random.json',
    sourceRevision: `sha256:${'1'.repeat(64)}`,
    parentIds: ['R00002', 'R00001'],
    parentContentIdentities: ['v2:b', 'v2:a'],
    captureArtifact: 'reports/stress/d1-capture.json',
    runRef: 'abc123',
});
assert.match(d1Block.populationIdentity, /^sha256:[0-9a-f]{64}$/u);
assert.equal(d1Block.researchBlock.questionId, 'WS2-D1-PRODUCTION-INERT-OBSERVATION');
assert.deepEqual(d1Block.researchBlock.parentIds, ['R00002', 'R00001']);
assert.deepEqual(d1Block.researchBlock.consumptionEvents, []);
assert.equal(d1Block.researchBlock.independentUnit, 'parent-level');

const level = {
    goalKey: 9,
    requiredIntersections: 2,
    portalMap: new Map([[7, { dest: 8 }]]),
    filterMap: new Map([[6, 1]]),
    flippingFilterMap: new Map([[5, 1]]),
};
const prep = { gateFlags: new Uint8Array(16) };
prep.gateFlags[1] = 1;

assert.deepEqual(candidateRevisitCells([1, 2, 3, 2, 5, 6, 7, 9], level, prep), [2, 3]);
assert.equal(isPathPrefix([1, 2], [1, 2, 3]), true);
assert.equal(isPathPrefix([1, 3], [1, 2, 3]), false);

const decision = {
    context: {
        beamWidth: 3,
        rankedCandidates: [
            { candidateId: JSON.stringify([1, 2]), rank: 1, score: 10, insertionOrder: 0, ints: 0, retained: true },
            { candidateId: JSON.stringify([1, 2, 3]), rank: 2, score: 9, insertionOrder: 1, ints: 1, retained: true },
            { candidateId: JSON.stringify([1, 3, 4]), rank: 3, score: 8, insertionOrder: 2, ints: 1, retained: true },
            { candidateId: JSON.stringify([1, 4, 3]), rank: 4, score: 7, insertionOrder: 3, ints: 1, retained: false },
            { candidateId: JSON.stringify([1, 5]), rank: 5, score: 6, insertionOrder: 4, ints: 1, retained: false },
        ],
    },
};
const eligibility = freezeD1Eligibility(decision, level, prep, { cutoffRadius: 1 });
assert.equal(eligibility.eligible, true);
assert.deepEqual(eligibility.rankWindow, [2, 4]);
assert.deepEqual(eligibility.eligibleRetainedCandidateIds, [JSON.stringify([1, 2, 3]), JSON.stringify([1, 3, 4])]);
assert.deepEqual(eligibility.eligibleCulledCandidateIds, [JSON.stringify([1, 4, 3])]);

assert.deepEqual(classifyD1CandidateQueryResults({
    candidateCount: 2,
    outcomes: [{ label: 'dead' }, { label: 'dead' }],
}), { support: 'SUPPORTED', value: 'ZERO', queried: 2 });
assert.deepEqual(classifyD1CandidateQueryResults({
    candidateCount: 3,
    outcomes: [{ label: 'dead' }, { label: 'live', refereeValid: true }],
}), { support: 'SUPPORTED', value: 'NONZERO', queried: 2 });
assert.equal(classifyD1CandidateQueryResults({
    candidateCount: 2,
    outcomes: [{ label: 'dead' }, { label: 'unknown' }],
}).support, 'UNKNOWN');

const summary = summarizeD1AnnotatedDecisions([{
    parentId: 'P1',
    context: { d1Eligibility: eligibility },
    annotation: { d1: { candidateResults: [
        { candidateId: JSON.stringify([1, 2, 3]), support: 'SUPPORTED', value: 'ZERO', informationCostMs: 2 },
        { candidateId: JSON.stringify([1, 3, 4]), support: 'SUPPORTED', value: 'ZERO', informationCostMs: 3 },
        { candidateId: JSON.stringify([1, 4, 3]), support: 'SUPPORTED', value: 'NONZERO', informationCostMs: 4 },
    ] } },
}]);
assert.equal(summary.cutoffCrossingDisagreements, 1);
assert.equal(summary.informationCostMs, 9);

assert.deepEqual(validateD1AnnotationPlan({
    evidenceRole: 'development',
    policy: { executionBoundary: 'isolated-beam' },
}, { maxEligibleDecisions: 3 }), {
    evidenceRole: 'development',
    executionBoundary: 'isolated-beam',
    completeFrozenEligibilityRequired: false,
});
assert.deepEqual(validateD1AnnotationPlan({
    evidenceRole: 'confirmation',
    policy: { executionBoundary: 'production-orchestration' },
}), {
    evidenceRole: 'confirmation',
    executionBoundary: 'production-orchestration',
    completeFrozenEligibilityRequired: true,
});
assert.throws(() => validateD1AnnotationPlan({
    evidenceRole: 'confirmation',
    policy: { executionBoundary: 'isolated-beam' },
}), /production-orchestration capture/);
assert.throws(() => validateD1AnnotationPlan({
    evidenceRole: 'confirmation',
    policy: { executionBoundary: 'production-orchestration' },
}, { maxEligibleDecisions: 3 }), /must cover every frozen eligible decision/);

console.log('d1-production-observation-lib-node-test: ok');
