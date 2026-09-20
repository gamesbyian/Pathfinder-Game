import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import { buildPopulationIntegrity, recoveryProvenanceIssues } from './solver-experiment-contract.mjs';
import { combinePopulationIntegrity } from './combine-population-integrity.mjs';
import { summarizeIndependentSupport } from './research-relations-lib.mjs';
import { classifyProbeProcess } from './stress/cpsat-explicit-prefix-reference-lib.mjs';
import { formatInvestigationReportStatusBlock } from './investigation-report-metadata.mjs';
import { validateSweepIntegrity } from './validate-solver-sweep-integrity.mjs';
import { validateResearchQuestionRegistry } from './research-question-relations-lib.mjs';
import { buildResearchEnrichmentLink } from './research-enrichment-link-lib.mjs';
import { createFailureResponseDocument } from './solver-failure-response-lib.mjs';
import {
    appendResearchConsumption,
    buildResearchBlock,
    researchBlockEligibility,
} from './solver-research-block-lineage.mjs';

const shardAExpected = ['case,1', 'case:2'];
const shardBExpected = ['case,1', 'case:3'];

const shardA = buildPopulationIntegrity(shardAExpected, [
    { id: 'case,1', ok: true, status: 'success' },
    { id: 'case:2', ok: false, status: 'infeasible' },
]);
const shardBPartial = buildPopulationIntegrity(shardBExpected, [
    { id: 'case,1', ok: false, status: 'timeout' },
]);

const interrupted = combinePopulationIntegrity([
    { label: 'cut:alpha', integrity: shardA },
    { label: 'cut,beta', integrity: shardBPartial },
], { kind: 'research-transaction-fixture' });

assert.equal(interrupted.coverageComplete, false);
assert.equal(interrupted.decisionValidComplete, false);
assert.deepEqual(interrupted.missingIds, ['cut,beta:case:3']);
assert.equal(interrupted.outcomes.deadlineTruncated, 1);
assert.equal(interrupted.identityCodec, 'json-tuple-v1');
assert.deepEqual(interrupted.canonicalExpectedIds, [
    '["cut:alpha","case,1"]',
    '["cut:alpha","case:2"]',
    '["cut,beta","case,1"]',
    '["cut,beta","case:3"]',
]);

// Indeterminate execution outcomes remain indeterminate scientific evidence.
const indeterminate = buildPopulationIntegrity(['timeout', 'harness', 'unknown'], [
    { id: 'timeout', ok: false, status: 'timeout' },
    { id: 'harness', ok: false, status: 'harness-error', error: 'fixture failure' },
    { id: 'unknown', ok: false, status: 'unparsed' },
]);
assert.equal(indeterminate.coverageComplete, true);
assert.equal(indeterminate.decisionValidComplete, false);
assert.deepEqual(
    { deadlineTruncated: indeterminate.outcomes.deadlineTruncated, harnessError: indeterminate.outcomes.harnessError, unknown: indeterminate.outcomes.unknown },
    { deadlineTruncated: 1, harnessError: 1, unknown: 1 },
);

// Exact/reference abstention is not DEAD.
assert.deepEqual(
    classifyProbeProcess({ stdout: 'SKIPPED (unsupported mechanic)', stderr: '', exitCode: 3 }),
    { label: 'timeout/abstain', reason: 'unsupported-mechanics' },
);
assert.equal(classifyProbeProcess({ stdout: '-> UNKNOWN', exitCode: 0 }).label, 'timeout/abstain');

// Pseudoreplication guard: many descendants inside one parent remain one independent unit.
const support = summarizeIndependentSupport([
    { parentId: 'parent-1', stateId: 'a' },
    { parentId: 'parent-1', stateId: 'b' },
    { parentId: 'parent-1', stateId: 'c' },
    { parentId: 'parent-2', stateId: 'd' },
], 'parentId');
assert.equal(support.rows, 4);
assert.equal(support.independentUnits, 2);
assert.equal(support.largestUnitRows, 3);

// Solved controls preserve failed-attempt evidence instead of erasing the failed path to success.
const solvedControlResponse = createFailureResponseDocument([
    {
        id: 'control-solved',
        ok: true,
        status: 'success',
        attempts: [
            { stageId: 'repair', status: 'exhausted', workSpent: 4 },
            { stageId: 'main', status: 'success', workSpent: 6 },
        ],
    },
    {
        id: 'case-negative',
        ok: false,
        status: 'exhausted',
        attempts: [{ stageId: 'main', status: 'exhausted', workSpent: 10 }],
    },
], {
    populationIntegrity: buildPopulationIntegrity(['control-solved', 'case-negative'], [
        { id: 'control-solved', ok: true, status: 'success' },
        { id: 'case-negative', ok: false, status: 'exhausted' },
    ]),
});
assert.equal(solvedControlResponse.summary.solvedParentsWithFailedAttempts, 1);
assert.equal(solvedControlResponse.records.find(row => row.identity === 'control-solved')?.solvedWithFailedAttempt, true);

// Selected/development evidence remains explicitly development after outcomes influence selection.
const developmentBlock = buildResearchBlock({
    blockId: 'BLOCK-TX-DEV-001',
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    sourceRegime: 'fixture-selected',
    sourceRevision: 'fixture-v1',
    evidenceRole: 'development',
    independentUnit: 'parent-level',
    parentIds: ['dev-parent'],
    parentContentIdentities: ['sha256:3333333333333333333333333333333333333333333333333333333333333333'],
    sourceArtifactRefs: ['selected-fixture.json'],
    producer: 'research-transaction-node-test',
    manifestRef: 'selected-fixture-manifest.json',
});
const selectedDevelopment = appendResearchConsumption(developmentBlock.researchBlock, {
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    decisionRef: 'selected-after-outcome-inspection',
    scope: { kind: 'block', id: 'BLOCK-TX-DEV-001' },
    evidenceRole: 'development',
    conditioning: ['selected-after-inspecting-outcomes'],
    openedOutcomeKinds: ['solver-outcome'],
    runRef: null,
    consumedAt: '2026-09-19T00:00:00.000Z',
}, { populationIdentity: developmentBlock.populationIdentity });
assert.equal(selectedDevelopment.evidenceRole, 'development');
assert.equal(selectedDevelopment.consumptionEvents[0].evidenceRole, 'development');
assert.ok(selectedDevelopment.consumptionEvents[0].conditioning.includes('selected-after-inspecting-outcomes'));

// Cross-resource derived evidence keeps source/block/population provenance through a constructor.
const enrichment = buildResearchEnrichmentLink({
    sourceBlockArtifact: 'fixture-block.json',
    sourceArtifact: 'fixture-exact.json',
    researchEnrichmentKind: 'exact',
    populationIdentity: developmentBlock.populationIdentity,
    researchBlock: developmentBlock.researchBlock,
    stateRef: 'state-1',
    runRef: 'run-1',
    createdAt: '2026-09-19T00:00:00.000Z',
});
assert.equal(enrichment.kind, 'pathfinder-research-enrichment-link');
assert.equal(enrichment.researchBlock.blockId, developmentBlock.researchBlock.blockId);
assert.equal(enrichment.populationIdentity, developmentBlock.populationIdentity);
assert.equal(enrichment.sourceArtifact, 'fixture-exact.json');

// Changing content under the same display ID changes research population identity.
const blockBase = {
    blockId: 'BLOCK-TX-001',
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    sourceRegime: 'fixture',
    sourceRevision: 'fixture-v1',
    evidenceRole: 'confirmation',
    independentUnit: 'parent-level',
    parentIds: ['same-display-id'],
    sourceArtifactRefs: ['fixture.json'],
    producer: 'research-transaction-node-test',
    manifestRef: 'fixture-manifest.json',
};
const firstBlock = buildResearchBlock({
    ...blockBase,
    parentContentIdentities: ['sha256:1111111111111111111111111111111111111111111111111111111111111111'],
});
const changedContentBlock = buildResearchBlock({
    ...blockBase,
    parentContentIdentities: ['sha256:2222222222222222222222222222222222222222222222222222222222222222'],
});
assert.notEqual(firstBlock.populationIdentity, changedContentBlock.populationIdentity,
    'content changes under a stable display id must change population identity');

// Opening/using a confirmation block for the same question makes it ineligible for descendant confirmation.
const untouchedEligibility = researchBlockEligibility(firstBlock.researchBlock, {
    questionId: blockBase.questionId,
    evidenceRole: 'confirmation',
    relatedQuestionIds: [blockBase.questionId],
});
assert.equal(untouchedEligibility.eligible, true);
const consumedBlock = appendResearchConsumption(firstBlock.researchBlock, {
    questionId: blockBase.questionId,
    decisionRef: 'fixture-design-use',
    scope: { kind: 'block', id: blockBase.blockId },
    evidenceRole: 'confirmation',
    conditioning: ['opened-for-design'],
    openedOutcomeKinds: ['exact-label'],
    runRef: null,
    consumedAt: '2026-09-19T00:00:00.000Z',
}, { populationIdentity: firstBlock.populationIdentity });
const consumedEligibility = researchBlockEligibility(consumedBlock, {
    questionId: blockBase.questionId,
    evidenceRole: 'confirmation',
    relatedQuestionIds: [blockBase.questionId],
});
assert.equal(consumedEligibility.eligible, false);
assert.ok(consumedEligibility.reasons.includes('matching-consumption-recorded'));

// Archive/retirement transition: retired workflows retain a reason and must not reappear on disk.
const workflowLifecycle = JSON.parse(readFileSync('docs/solver-workflow-lifecycle.json', 'utf8'));
const workflowFiles = new Set(readdirSync('.github/workflows').filter(name => /\.ya?ml$/u.test(name)));
for (const retired of workflowLifecycle.retiredWorkflows ?? []) {
    assert.ok(String(retired.reason ?? '').trim(), `${retired.workflow}: retired workflow must retain a reason`);
    assert.equal(workflowFiles.has(retired.workflow), false,
        `${retired.workflow}: retired workflow must remain absent from the active workflow surface`);
}

// Stale evidence-integrity index fails closed in its dedicated rebuild guard.
const evidenceIntegrityGuard = readFileSync('.github/workflows/solver-evidence-integrity-guard.yml', 'utf8');
assert.match(evidenceIntegrityGuard, /npm run solver:evidence-integrity-audit/u);
assert.match(evidenceIntegrityGuard, /git diff --exit-code -- reports\/stress\/solver-evidence-integrity-index\.json/u,
    'guard must reject a checked-in integrity index that differs from a fresh rebuild');

// Treatment nonparticipation fails the manipulation/participation gate before a negative verdict can be claimed.
assert.throws(() => validateSweepIntegrity({
    expectedIds: ['np-a', 'np-b'],
    levels: [
        { id: 'np-a', ok: false, status: 'exhausted', attempts: [{ stageId: 'baseline', workSpent: 10 }] },
        { id: 'np-b', ok: false, status: 'exhausted', attempts: [{ stageId: 'baseline', workSpent: 10 }] },
    ],
    requiredStage: 'treatment-stage',
    minParticipatingLevels: 1,
}), /target stage treatment-stage participated on 0 level\(s\)/,
'treatment nonparticipation must stop interpretation rather than becoming an ordinary negative');

// Question closeout/supersession must retain a valid outbound relation to the successor.
const supersessionRegistry = {
    schemaVersion: 1,
    questions: [
        { id: 'TX-OLD', question: 'old tested form?', owner: 'TX', state: 'closed-tested-form' },
        { id: 'TX-NEXT', question: 'successor ambiguity?', owner: 'TX', state: 'active', supersedes: ['TX-OLD'] },
    ],
};
assert.deepEqual(validateResearchQuestionRegistry(supersessionRegistry), []);
assert.ok(validateResearchQuestionRegistry({
    ...supersessionRegistry,
    questions: supersessionRegistry.questions.map(question =>
        question.id === 'TX-NEXT' ? { ...question, supersedes: ['TX-MISSING'] } : question),
}).some(issue => issue.includes('references unknown question TX-MISSING')));

const supersededStatusBlock = formatInvestigationReportStatusBlock({
    status: 'superseded',
    lastEvidenceDate: '2026-09-19',
    lastEvidenceSummary: 'successor question now owns the live ambiguity',
    decision: 'use TX-NEXT for current disposition',
    remainingGate: 'TX-NEXT',
});
assert.match(supersededStatusBlock, /^> \*\*Status:\*\* superseded$/m);

// Report status creation uses the shared constructor, not free-form prose.
const reportStatusBlock = formatInvestigationReportStatusBlock({
    status: 'concluded-negative',
    lastEvidenceDate: '2026-09-19',
    lastEvidenceSummary: 'synthetic transaction completed',
    decision: 'close the tested form',
    remainingGate: 'none',
});
assert.match(reportStatusBlock, /^> \*\*Status:\*\* concluded-negative$/m);
assert.throws(() => formatInvestigationReportStatusBlock({
    status: 'done-ish',
    lastEvidenceDate: '2026-09-19',
    lastEvidenceSummary: 'synthetic transaction completed',
    decision: 'close the tested form',
    remainingGate: 'none',
}), /unknown report status/);

// Successful acquisition can survive a combine-layer failure and be recombined without new solver work.
const validShardOne = buildPopulationIntegrity(['one'], [{ id: 'one', ok: true, status: 'success' }]);
const validShardTwo = buildPopulationIntegrity(['two'], [{ id: 'two', ok: false, status: 'infeasible' }]);
assert.throws(() => combinePopulationIntegrity([
    { label: 'duplicate-scope', integrity: validShardOne },
    { label: 'duplicate-scope', integrity: validShardTwo },
]), /unique/, 'combine-layer identity/configuration failure must not invalidate already-valid shard evidence');
const recombinedAfterCombineFix = combinePopulationIntegrity([
    { label: 'scope-one', integrity: validShardOne },
    { label: 'scope-two', integrity: validShardTwo },
]);
assert.equal(recombinedAfterCombineFix.coverageComplete, true);
assert.equal(recombinedAfterCombineFix.decisionValidComplete, true);
assert.equal(recombinedAfterCombineFix.observedCount, 2);

// Recovery provenance distinguishes recombination from missing-acquisition retry.
const recombineProvenance = {
    sourceRuns: ['first-pass', 'recovery-pass'],
    reconciliationRun: {
        kind: 'recombine-only',
        sourceRuns: ['first-pass', 'recovery-pass'],
        preservesExperimentIdentity: true,
        acquisitionRecomputed: false,
    },
};
assert.deepEqual(recoveryProvenanceIssues(recombineProvenance), []);
const retryProvenance = {
    sourceRuns: ['first-pass', 'recovery-pass'],
    reconciliationRun: {
        kind: 'retry-missing-acquisition',
        sourceRuns: ['first-pass', 'recovery-pass'],
        preservesExperimentIdentity: true,
        acquisitionRecomputed: true,
    },
};
assert.deepEqual(recoveryProvenanceIssues(retryProvenance), []);
assert.ok(recoveryProvenanceIssues({
    ...recombineProvenance,
    reconciliationRun: { ...recombineProvenance.reconciliationRun, acquisitionRecomputed: true },
}).includes('experiment.reconciliationRun.acquisitionRecomputed'));

// Recovery reuses the immutable expected population and replaces only the failed/incomplete
// acquisition component. No solver/reference recomputation is needed for shard A.
const shardBRecovered = buildPopulationIntegrity(shardBExpected, [
    { id: 'case,1', ok: false, status: 'infeasible' },
    { id: 'case:3', ok: true, status: 'success' },
]);
const recovered = combinePopulationIntegrity([
    { label: 'cut:alpha', integrity: shardA },
    { label: 'cut,beta', integrity: shardBRecovered },
], { kind: 'research-transaction-fixture' });

assert.equal(recovered.coverageComplete, true);
assert.equal(recovered.decisionValidComplete, true);
assert.deepEqual(recovered.missingIds, []);
assert.equal(recovered.observedCount, 4);
assert.equal(recovered.expectedCount, 4);

// Recombination order is not part of the scientific population identity.
const recoveredReordered = combinePopulationIntegrity([
    { label: 'cut,beta', integrity: shardBRecovered },
    { label: 'cut:alpha', integrity: shardA },
], { kind: 'research-transaction-fixture' });
assert.equal(recovered.populationIdentityHash, recoveredReordered.populationIdentityHash);

// Repeated local IDs under distinct semantic scopes remain distinct scientific subjects.
assert.equal(new Set(recovered.canonicalExpectedIds).size, 4);

console.log('research transaction recovery/identity fixture passed');
