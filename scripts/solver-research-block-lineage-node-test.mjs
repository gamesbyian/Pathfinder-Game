import assert from 'node:assert/strict';

import {
    appendResearchConsumption,
    assertResearchBlock,
    researchBlockEligibility,
    researchBlockIdentity,
    researchBlockIssues,
} from './solver-research-block-lineage.mjs';

const populationIdentity = `sha256:${'a'.repeat(64)}`;
const block = {
    blockId: 'WS2-FRESH-001',
    questionId: 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION',
    sourceRegime: 'witness-first-random',
    sourceRevision: 'generate-random@2.0.0',
    evidenceRole: 'confirmation',
    independentUnit: 'parent-level',
    parentIds: ['R10001', 'R10002'],
    parentContentIdentities: ['v2:alpha', 'v2:beta'],
    sourceArtifactRefs: ['tmp/ws2-fresh-001/levels.json', 'tmp/ws2-fresh-001/population-seal.json'],
    createdBy: {
        producer: 'solver-experiment-preflight',
        manifestRef: 'tmp/ws2-fresh-001/experiment-contract.json',
        runRef: null,
    },
    generationRef: 'tmp/ws2-fresh-001/generation-manifest.json',
    consumptionEvents: [],
};

assert.deepEqual(researchBlockIssues(block, { populationIdentity }), []);
assert.equal(assertResearchBlock(block, { populationIdentity }), block);
assert.match(researchBlockIdentity(block, populationIdentity), /^sha256:[0-9a-f]{64}$/u);
assert.ok(researchBlockIssues({ ...block, parentContentIdentities: ['v2:alpha'] }, { populationIdentity })
    .includes('researchBlock.parentContentIdentities(length)'));
assert.ok(researchBlockIssues(block, { populationIdentity: null }).includes('populationIdentity'));

const unknownLineage = researchBlockEligibility(block, {
    questionId: block.questionId,
    evidenceRole: 'confirmation',
});
assert.equal(unknownLineage.eligible, null);
assert.deepEqual(unknownLineage.reasons, ['question-lineage-not-proven']);

const untouched = researchBlockEligibility(block, {
    questionId: block.questionId,
    evidenceRole: 'confirmation',
    relatedQuestionIds: [],
});
assert.equal(untouched.eligible, true);

const consumed = appendResearchConsumption(block, {
    questionId: block.questionId,
    decisionRef: 'reports/ws2-decision.md',
    scope: { kind: 'block', id: block.blockId },
    evidenceRole: 'confirmation',
    conditioning: ['none-known'],
    openedOutcomeKinds: ['control', 'treatment'],
    runRef: 'run-123',
    consumedAt: '2026-09-18T03:15:00.000Z',
}, { populationIdentity });
assert.equal(block.consumptionEvents.length, 0, 'append must not mutate the original block');
assert.equal(consumed.consumptionEvents.length, 1);

const unavailable = researchBlockEligibility(consumed, {
    questionId: block.questionId,
    evidenceRole: 'confirmation',
    relatedQuestionIds: [],
});
assert.equal(unavailable.eligible, false);
assert.equal(unavailable.matchedConsumptionEvents, 1);
assert.deepEqual(unavailable.reasons, ['matching-consumption-recorded']);

const differentQuestion = researchBlockEligibility(consumed, {
    questionId: 'WS2-OTHER',
    evidenceRole: 'confirmation',
    relatedQuestionIds: [],
});
assert.equal(differentQuestion.eligible, true, 'unrelated question remains mechanically unconsumed when lineage is explicitly supplied');

assert.throws(() => appendResearchConsumption(block, {
    questionId: block.questionId,
    decisionRef: 'bad',
    scope: { kind: 'block', id: block.blockId },
    evidenceRole: 'confirmation',
    conditioning: [],
    openedOutcomeKinds: [],
    runRef: null,
    consumedAt: '2026-09-18T03:15:00.000Z',
}, { populationIdentity }), /conditioning/);

console.log('solver research block lineage tests passed');
