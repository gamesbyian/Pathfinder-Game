#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import process from 'node:process';

import { buildResearchRelations } from './research-relations-lib.mjs';
import { analyzeOpportunity } from './experiment-opportunity-audit.mjs';
import { acquisitionNeeds, acquisitionStopRule, chooseAcquisitionRoute, rankCandidateAssets } from './research-acquisition-preflight-lib.mjs';

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

const controlFile = value('control');
const opportunityMode = value('opportunity-mode') || 'rescue';
const stageId = value('stage') || null;
const numberValue = name => {
    const raw = value(name);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) throw new Error(`--${name} must be numeric`);
    return parsed;
};
const targetOpportunities = numberValue('target-opportunities');
const proposedTotal = numberValue('proposed-total');
const conditionalEventRate = numberValue('conditional-event-rate');
const detectionProbability = numberValue('detection-probability') ?? 0.8;

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
const candidateAssets = rankCandidateAssets(question, model.relations.assets);

let opportunity = null;
if (controlFile) {
    const control = JSON.parse(readFileSync(controlFile, 'utf8'));
    opportunity = analyzeOpportunity({
        levels: control.levels,
        stageId,
        mode: opportunityMode,
        targetOpportunities,
        proposedTotal,
        conditionalEventRate,
        detectionProbability,
    });
}

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
    candidateAssets: {
        interpretation: 'ranked discovery hints only; inspect resource contracts before treating an asset as usable evidence',
        assets: candidateAssets,
    },
    opportunitySizing: opportunity ?? {
        estimate: null,
        requiredInput: '--control=<control-side combined report> when a control-side opportunity audit is meaningful',
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
        stopRule: acquisitionStopRule(decision.route),
    },
}, null, 2));
