import assert from 'node:assert/strict';
import {
    auditResearchIntegration,
    buildResearchIntegrationAuditContext,
} from './research-integration-audit-lib.mjs';
import { buildResearchRelations } from './research-relations-lib.mjs';

// The permanent check:research-integration validator owns the executable/full autonomous-build
// integration proof. This Node test builds the relation model once, then exercises the library
// contract and mutation/error cases against that immutable baseline.
const prebuiltModel = buildResearchRelations(process.cwd(), { discoverArtifacts: true });
const auditContext = buildResearchIntegrationAuditContext(process.cwd());
const audit = model => auditResearchIntegration(process.cwd(), { model, context: auditContext });
const result = audit(prebuiltModel);
assert.equal(result.errorCount, 0, JSON.stringify(result.errors, null, 2));
assert.equal(result.premiseCount, 148);
assert.equal(result.premiseRelationCount, 184);
assert.ok(result.questionCount >= 27);
assert.ok(result.semanticJoinCoverage.authoredAssetRelationships >= 16);
assert.ok(result.semanticJoinCoverage.questionsWithPremiseRefs >= 5);
assert.ok(result.semanticJoinCoverage.questionsWithMeasurementOpportunities >= 4);
assert.ok(result.errorCount === 0);
// executionState: 'active' is forced here (rather than relying on an existing live queue row
// happening to be active) because closed/promoted workstreams do not stay active forever -- this
// exercises the audit's own active-workstream-references-terminal-question rule independent of
// whichever rows the live docs currently carry.
const withQueueRef = questionRef => ({
    ...prebuiltModel,
    relations: {
        ...prebuiltModel.relations,
        queue: prebuiltModel.relations.queue.map(row =>
            String(row.workstreamId) === '2' ? { ...row, executionState: 'active', questionRef } : row),
    },
});
const terminalQueue = audit(withQueueRef('WS2-WORK-LADDER-ECONOMICS'));
assert.ok(terminalQueue.errors.some(error =>
    /active workstream 2 references terminal research question WS2-WORK-LADDER-ECONOMICS/u.test(error)),
'active execution must not silently point at a concluded scientific question');

const missingQueueQuestion = audit(withQueueRef('WS2-NOT-A-REAL-QUESTION'));
assert.ok(missingQueueQuestion.errors.some(error =>
    /workstream 2 references unknown research question WS2-NOT-A-REAL-QUESTION/u.test(error)),
'stable queue question references must resolve through the question authority');

const evidenceWithMissingSource = {
    ...prebuiltModel,
    relations: {
        ...prebuiltModel.relations,
        evidence: prebuiltModel.relations.evidence.map((row, index) =>
            index === 0 ? { ...row, sourceArtifacts: [...(row.sourceArtifacts ?? []), 'reports/__missing-source-artifact__.md'] } : row),
    },
};
const missingSourceArtifact = audit(evidenceWithMissingSource);
assert.ok(missingSourceArtifact.errors.some(error =>
    /references missing sourceArtifact reports\/__missing-source-artifact__\.md/u.test(error)),
'structured report sourceArtifact refs must resolve to tracked repository files at integration time');

const withBadCapabilityDemand = {
    ...prebuiltModel,
    relations: {
        ...prebuiltModel.relations,
        capabilityDemands: [
            ...(prebuiltModel.relations.capabilityDemands ?? []),
            {
                id: 'CID-TEST-BAD',
                questionId: 'WS2-NOT-A-REAL-QUESTION',
                evidenceRefs: ['reports/not-a-real-capability-evidence.md'],
                resolutionRef: 'reports/not-a-real-resolution.json',
            },
        ],
    },
};
const badCapabilityDemand = audit(withBadCapabilityDemand);
assert.ok(badCapabilityDemand.errors.some(error =>
    /capability demand CID-TEST-BAD references unknown owning question WS2-NOT-A-REAL-QUESTION/u.test(error)));
assert.ok(badCapabilityDemand.errors.some(error =>
    /capability demand CID-TEST-BAD references missing evidenceRef reports\/not-a-real-capability-evidence\.md/u.test(error)));
assert.ok(badCapabilityDemand.errors.some(error =>
    /capability demand CID-TEST-BAD references missing resolutionRef reports\/not-a-real-resolution\.json/u.test(error)));

const evidenceWithBadSuccessors = {
    ...prebuiltModel,
    relations: {
        ...prebuiltModel.relations,
        evidence: prebuiltModel.relations.evidence.map((row, index) =>
            index === 0 ? {
                ...row,
                successorQuestions: ['WS2-NOT-A-REAL-QUESTION'],
                successorArtifacts: ['reports/not-a-real-successor.md'],
            } : row),
    },
};
const badSuccessors = audit(evidenceWithBadSuccessors);
assert.ok(badSuccessors.errors.some(error =>
    /references unknown successor question WS2-NOT-A-REAL-QUESTION/u.test(error)));
assert.ok(badSuccessors.errors.some(error =>
    /references missing successor artifact reports\/not-a-real-successor\.md/u.test(error)));

const withConsumptionEvent = event => ({
    ...prebuiltModel,
    relations: {
        ...prebuiltModel.relations,
        researchBlocks: [
            ...prebuiltModel.relations.researchBlocks,
            {
                blockId: 'AUDIT-BLOCK',
                questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
                researchBlock: {
                    parentIds: ['PARENT-1'],
                    consumptionEvents: [event],
                },
            },
        ],
    },
});

const badConsumptionQuestion = audit(withConsumptionEvent({
    questionId: 'WS2-NOT-A-REAL-QUESTION',
    decisionRef: 'logical-decision-ref',
    scope: { kind: 'block', id: 'AUDIT-BLOCK' },
}));
assert.ok(badConsumptionQuestion.errors.some(error =>
    /consumptionEvents\[0\] references unknown question WS2-NOT-A-REAL-QUESTION/u.test(error)));

const missingConsumptionDecision = audit(withConsumptionEvent({
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    decisionRef: 'reports/not-a-real-decision-report.md',
    scope: { kind: 'block', id: 'AUDIT-BLOCK' },
}));
assert.ok(missingConsumptionDecision.errors.some(error =>
    /consumptionEvents\[0\] references missing decisionRef reports\/not-a-real-decision-report\.md/u.test(error)));

const badBlockScope = audit(withConsumptionEvent({
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    decisionRef: 'logical-decision-ref',
    scope: { kind: 'block', id: 'OTHER-BLOCK' },
}));
assert.ok(badBlockScope.errors.some(error =>
    /consumptionEvents\[0\] block scope names OTHER-BLOCK/u.test(error)));

const badParentScope = audit(withConsumptionEvent({
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    decisionRef: 'logical-decision-ref',
    scope: { kind: 'parent', id: 'PARENT-2' },
}));
assert.ok(badParentScope.errors.some(error =>
    /consumptionEvents\[0\] parent scope names unknown parent PARENT-2/u.test(error)));



console.log('research-integration-audit-node-test: ok');
