import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

import { buildQuestionDossier } from './research-question-dossier-lib.mjs';

const questionId = 'WS2-D1-PRODUCTION-INERT-OBSERVATION';
const dossier = buildQuestionDossier(process.cwd(), { questionId });
assert.equal(dossier.authority.kind, 'derived-read-only');
assert.equal(dossier.question.id, questionId);
assert.ok(dossier.conceptualContext.explicitPremises.some(row => row.premiseId === 'P091'));
assert.ok(dossier.conceptualContext.measurementOpportunities.some(row => row.id === 'MO-002'));
assert.ok(dossier.acquisition.route);
assert.ok(Array.isArray(dossier.currentAuthorityMatches.queue));
assert.equal(dossier.currentAuthorityMatches.queueMatchMode, 'stable-question-id');
assert.equal(dossier.currentAuthorityMatches.evidenceApplicability.status, 'not-assessed');
assert.match(dossier.currentAuthorityMatches.evidenceApplicability.note, /freshness.*protocol.*population.*admissibility/u);
assert.equal(dossier.currentAuthorityMatches.experimentMatchMode, 'lexical-discovery-only');
assert.equal(dossier.acquisition.generationGuidance.automaticGeneration, false);
assert.ok(Array.isArray(dossier.answerRefs));
assert.ok(Array.isArray(dossier.constraintRefs));
assert.deepEqual(
    new Set(dossier.evidenceRefs),
    new Set([...dossier.answerRefs, ...dossier.constraintRefs]),
    'legacy evidenceRefs should remain only the compatibility union of typed answer/constraint refs',
);
assert.equal(dossier.evidenceRefsRelation, 'compatibility-union-of-answer-and-constraint-refs');
assert.ok(Array.isArray(dossier.resources.candidateAssets));
assert.ok(Array.isArray(dossier.resources.candidateJoins));
assert.equal(dossier.conceptualContext.premiseDiscoveryHints.authority, 'lexical-discovery-only');
assert.ok(dossier.conceptualContext.premiseDiscoveryHints.rows.length > 0);

const activeQuestionId = 'WS2-REPAIR-DEADLINE-ALLOCATION';
const activeDossier = buildQuestionDossier(process.cwd(), { questionId: activeQuestionId });
assert.ok(activeDossier.currentAuthorityMatches.queue.some(row => row.questionRef === activeQuestionId),
    'the current WS2 active gate must resolve to the queue row that names it as the stable question ref');
assert.ok(activeDossier.currentAuthorityMatches.queue.every(row => row.questionRef === activeQuestionId),
    'queue matches must not fall back to lexical similarity once a stable question reference exists');
assert.notEqual(activeDossier.currentAuthorityMatches.evidenceMatchMode, 'lexical-fallback');
assert.equal(activeDossier.currentAuthorityMatches.evidenceDiscoveryMode, 'lexical-discovery-only');
const activeAnsweredBy = new Set(activeDossier.question.answeredBy ?? []);
assert.ok(activeDossier.currentAuthorityMatches.evidence.every(row =>
    row.researchQuestion === activeQuestionId || activeAnsweredBy.has(row.latestEvidence?.report)),
    'question-linked dossier evidence must come from stable question tags or authored answeredBy paths');

const run = spawnSync(process.execPath, [
    'scripts/research-question-dossier.mjs',
    `--question-id=${questionId}`,
], { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(run.status, 0, run.stderr);
const cli = JSON.parse(run.stdout);
assert.equal(cli.question.id, questionId);
assert.equal(cli.authority.kind, 'derived-read-only');

const constrained = buildQuestionDossier(process.cwd(), { questionId: 'WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION' });
assert.ok(constrained.questionRelations.outgoing.some(edge =>
    edge.field === 'constrainedBy' && edge.id === 'WS2-PORTAL-COARSE-GLOBAL-MERGE'));

const capabilityDossier = buildQuestionDossier(process.cwd(), {
    questionId: 'WS2-CAPABILITY-INVENTION-DEMAND',
});
assert.ok(capabilityDossier.currentAuthorityMatches.capabilityDemands.length >= 26);
assert.ok(['owning-question-id', 'owning-question-id+exact-evidence-ref']
    .includes(capabilityDossier.currentAuthorityMatches.capabilityDemandMatchMode));
assert.ok(capabilityDossier.currentAuthorityMatches.capabilityDemands.some(row => row.id === 'CID-0003'));

console.log('research-question-dossier-node-test: ok');
