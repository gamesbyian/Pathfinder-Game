import assert from 'node:assert/strict';

import {
    appendResearchConsumption,
    buildResearchBlock,
    assertResearchBlock,
    researchBlockEligibility,
    researchBlockIdentity,
    researchBlockIssues,
    researchPopulationIdentity,
    summarizeResearchBlockUsageOverlap,
    summarizeResearchConsumption,
} from './solver-research-block-lineage.mjs';

const derivedPopulationIdentityA = researchPopulationIdentity(['P2', 'P1'], ['v2:b', 'v2:a']);
const derivedPopulationIdentityB = researchPopulationIdentity(['P1', 'P2'], ['v2:a', 'v2:b']);
assert.equal(derivedPopulationIdentityA, derivedPopulationIdentityB, 'population identity is order-invariant');
assert.match(derivedPopulationIdentityA, /^sha256:[0-9a-f]{64}$/u);
assert.throws(() => researchPopulationIdentity(['P1', 'P1'], ['v2:a', 'v2:a']), /duplicate parent ids/);

const built = buildResearchBlock({
    blockId: 'BLOCK-BUILDER-TEST',
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    sourceRegime: 'test-source',
    sourceRevision: `sha256:${'b'.repeat(64)}`,
    evidenceRole: 'development',
    parentIds: ['P1', 'P2'],
    parentContentIdentities: ['v2:a', 'v2:b'],
    sourceArtifactRefs: ['tmp/levels.json'],
    producer: 'test-producer',
    manifestRef: 'tmp/levels.json',
    generationRef: 'tmp/levels.json',
});
assert.match(built.populationIdentity, /^sha256:[0-9a-f]{64}$/u);
assert.equal(built.researchBlock.blockId, 'BLOCK-BUILDER-TEST');
assert.deepEqual(built.researchBlock.parentIds, ['P1', 'P2']);


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
const consumptionSummary = summarizeResearchConsumption(consumed);
assert.equal(consumptionSummary.totalEvents, 1);
assert.deepEqual(consumptionSummary.byQuestion, { [block.questionId]: 1 });
assert.deepEqual(consumptionSummary.byEvidenceRole, { confirmation: 1 });
assert.deepEqual(consumptionSummary.byScopeKind, { block: 1 });
assert.deepEqual(consumptionSummary.openedOutcomeKinds, ['control', 'treatment']);
assert.equal(consumptionSummary.firstConsumedAt, '2026-09-18T03:15:00.000Z');
assert.equal(consumptionSummary.lastConsumedAt, '2026-09-18T03:15:00.000Z');


const fullOverlap = summarizeResearchBlockUsageOverlap(consumed, ['R10002', 'R99999'], {
    questionId: block.questionId,
    relatedQuestionIds: [],
});
assert.equal(fullOverlap.relationToBlockPopulation, 'overlap');
assert.deepEqual(fullOverlap.overlappingParentIds, ['R10002']);
assert.deepEqual(fullOverlap.knownConsumedOverlappingParentIds, ['R10002']);
assert.deepEqual(fullOverlap.knownUntouchedOverlappingParentIds, []);
assert.equal(fullOverlap.blockScopeConsumptionEvents, 1);

const parentScoped = appendResearchConsumption(block, {
    questionId: block.questionId,
    decisionRef: 'reports/ws2-parent-decision.md',
    scope: { kind: 'parent', id: 'R10001' },
    evidenceRole: 'confirmation',
    conditioning: ['none-known'],
    openedOutcomeKinds: ['treatment'],
    runRef: 'run-124',
    consumedAt: '2026-09-18T04:15:00.000Z',
}, { populationIdentity });
const partialOverlap = summarizeResearchBlockUsageOverlap(parentScoped, ['R10001', 'R10002'], {
    questionId: block.questionId,
    relatedQuestionIds: [],
});
assert.deepEqual(partialOverlap.knownConsumedOverlappingParentIds, ['R10001']);
assert.deepEqual(partialOverlap.knownUntouchedOverlappingParentIds, ['R10002']);
assert.equal(partialOverlap.interpretation, 'diagnostic-parent-scope-complete');

const familyScoped = appendResearchConsumption(block, {
    questionId: block.questionId,
    decisionRef: 'reports/ws2-family-decision.md',
    scope: { kind: 'family', id: 'FAMILY-1' },
    evidenceRole: 'confirmation',
    conditioning: ['family-selected'],
    openedOutcomeKinds: ['treatment'],
    runRef: 'run-125',
    consumedAt: '2026-09-18T05:15:00.000Z',
}, { populationIdentity });
const familyOverlap = summarizeResearchBlockUsageOverlap(familyScoped, ['R10001'], {
    questionId: block.questionId,
    relatedQuestionIds: [],
});
assert.deepEqual(familyOverlap.unresolvedFamilyScopeIds, ['FAMILY-1']);
assert.equal(familyOverlap.interpretation, 'diagnostic-partial-family-scope');

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
