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


const run = spawnSync(process.execPath, ['scripts/research-integration-audit.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
});
assert.equal(run.status, 0, run.stderr);
assert.equal(JSON.parse(run.stdout).errorCount, 0);

console.log('research-integration-audit-node-test: ok');
