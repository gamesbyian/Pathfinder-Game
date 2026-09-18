#!/usr/bin/env node
import process from 'node:process';

import { buildResearchRelations } from './research-relations-lib.mjs';
import { acquisitionNeeds, chooseAcquisitionRoute } from './research-acquisition-preflight-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const values = name => args.filter(arg => arg.startsWith(`--${name}=`)).map(arg => arg.slice(name.length + 3)).filter(Boolean);

const questionId = value('question-id');
if (!questionId) throw new Error('--question-id=... is required');
const evidenceRole = value('evidence-role') || 'development';
const requestedNeed = value('need');
if (requestedNeed && !acquisitionNeeds().includes(requestedNeed)) {
    throw new Error(`--need must be one of ${acquisitionNeeds().join(', ')}`);
}

const artifactPaths = values('artifact');
const relatedArg = args.find(arg => arg.startsWith('--related-questions='));
const relatedQuestionIds = relatedArg === undefined
    ? null
    : relatedArg.slice('--related-questions='.length).split(',').map(x => x.trim()).filter(Boolean);

const model = buildResearchRelations(process.cwd(), {
    artifactPaths,
    eligibility: { questionId, evidenceRole, relatedQuestionIds },
});
const question = model.relations.questions.find(row => row.id === questionId);
if (!question) throw new Error(`unknown question id: ${questionId}`);

const suppliedBlocks = model.relations.researchBlocks.filter(row => row.questionId === questionId);
const eligibleBlocks = suppliedBlocks.filter(row => row.eligibility?.eligible === true);
const decision = chooseAcquisitionRoute({ question, eligibleBlocks, requestedNeed });

console.log(JSON.stringify({
    schemaVersion: 1,
    questionId,
    questionState: question.state,
    evidenceRole,
    route: decision.route,
    need: decision.need,
    rationale: decision.rationale,
    existing: {
        suppliedBlocks: suppliedBlocks.length,
        mechanicallyEligibleBlocks: eligibleBlocks.length,
        blockIds: eligibleBlocks.map(row => row.blockId),
    },
    opportunitySizing: {
        estimate: null,
        rule: decision.route === 'REUSE_EXISTING'
            ? 'size analysis from the supplied eligible block(s)'
            : decision.route === 'NO_LEVEL_GENERATION'
                ? 'size the relevant observation/exact/work opportunity before any generation'
                : 'run opportunity sizing before any broad generation; generation is never automatic',
    },
    evidencePlan: {
        independentUnit: eligibleBlocks[0]?.independentUnit ?? 'parent-level',
        pilotFirst: true,
        expansionOnlyIfInformative: true,
        preserveUntouchedConfirmation: evidenceRole !== 'development',
    },
}, null, 2));
