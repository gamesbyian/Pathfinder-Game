import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { auditResearchIntegration } from './research-integration-audit-lib.mjs';
import { buildResearchRelations } from './research-relations-lib.mjs';

const result = auditResearchIntegration(process.cwd());
assert.equal(result.errorCount, 0, JSON.stringify(result.errors, null, 2));
assert.equal(result.premiseCount, 148);
assert.equal(result.premiseRelationCount, 184);
assert.ok(result.questionCount >= 27);
assert.ok(result.semanticJoinCoverage.authoredAssetRelationships >= 16);
assert.ok(result.semanticJoinCoverage.questionsWithPremiseRefs >= 5);
assert.ok(result.semanticJoinCoverage.questionsWithMeasurementOpportunities >= 4);
assert.ok(result.errorCount === 0);
const prebuiltModel = buildResearchRelations(process.cwd(), { discoverArtifacts: true });
const prebuiltResult = auditResearchIntegration(process.cwd(), { model: prebuiltModel });
assert.deepEqual(prebuiltResult, result,
    'integration audit must be identical when the inventory supplies the already-built relation model');

const withQueueRef = questionRef => ({
    ...prebuiltModel,
    relations: {
        ...prebuiltModel.relations,
        queue: prebuiltModel.relations.queue.map(row =>
            String(row.workstreamId) === '2' ? { ...row, questionRef } : row),
    },
});
const terminalQueue = auditResearchIntegration(process.cwd(), {
    model: withQueueRef('WS2-WORK-LADDER-ECONOMICS'),
});
assert.ok(terminalQueue.errors.some(error =>
    /active workstream 2 references terminal research question WS2-WORK-LADDER-ECONOMICS/u.test(error)),
'active execution must not silently point at a concluded scientific question');

const missingQueueQuestion = auditResearchIntegration(process.cwd(), {
    model: withQueueRef('WS2-NOT-A-REAL-QUESTION'),
});
assert.ok(missingQueueQuestion.errors.some(error =>
    /workstream 2 references unknown research question WS2-NOT-A-REAL-QUESTION/u.test(error)),
'stable queue question references must resolve through the question authority');

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

const badConsumptionQuestion = auditResearchIntegration(process.cwd(), {
    model: withConsumptionEvent({
        questionId: 'WS2-NOT-A-REAL-QUESTION',
        decisionRef: 'logical-decision-ref',
        scope: { kind: 'block', id: 'AUDIT-BLOCK' },
    }),
});
assert.ok(badConsumptionQuestion.errors.some(error =>
    /consumptionEvents\[0\] references unknown question WS2-NOT-A-REAL-QUESTION/u.test(error)));

const missingConsumptionDecision = auditResearchIntegration(process.cwd(), {
    model: withConsumptionEvent({
        questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        decisionRef: 'reports/not-a-real-decision-report.md',
        scope: { kind: 'block', id: 'AUDIT-BLOCK' },
    }),
});
assert.ok(missingConsumptionDecision.errors.some(error =>
    /consumptionEvents\[0\] references missing decisionRef reports\/not-a-real-decision-report\.md/u.test(error)));

const badBlockScope = auditResearchIntegration(process.cwd(), {
    model: withConsumptionEvent({
        questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        decisionRef: 'logical-decision-ref',
        scope: { kind: 'block', id: 'OTHER-BLOCK' },
    }),
});
assert.ok(badBlockScope.errors.some(error =>
    /consumptionEvents\[0\] block scope names OTHER-BLOCK/u.test(error)));

const badParentScope = auditResearchIntegration(process.cwd(), {
    model: withConsumptionEvent({
        questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        decisionRef: 'logical-decision-ref',
        scope: { kind: 'parent', id: 'PARENT-2' },
    }),
});
assert.ok(badParentScope.errors.some(error =>
    /consumptionEvents\[0\] parent scope names unknown parent PARENT-2/u.test(error)));


const run = spawnSync(process.execPath, ['scripts/research-integration-audit.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
});
assert.equal(run.status, 0, run.stderr);
assert.equal(JSON.parse(run.stdout).errorCount, 0);

console.log('research-integration-audit-node-test: ok');
