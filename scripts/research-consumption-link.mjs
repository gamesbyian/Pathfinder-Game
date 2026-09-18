#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
    appendResearchConsumption,
    assertResearchBlock,
} from './solver-research-block-lineage.mjs';
import { loadResearchQuestionRegistry } from './research-question-relations-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const values = name => args.filter(arg => arg.startsWith(`--${name}=`))
    .map(arg => arg.slice(name.length + 3)).filter(Boolean);
const required = name => {
    const found = value(name);
    if (!found) throw new Error(`--${name}=... is required`);
    return found;
};

const blockArtifact = required('block-artifact');
const questionId = required('question-id');
const decisionRef = required('decision-ref');
const out = required('out');
const conditioning = values('conditioning').flatMap(item => item.split(',')).map(item => item.trim()).filter(Boolean);
if (!conditioning.length) throw new Error('at least one --conditioning=... value is required');
if (!existsSync(blockArtifact)) throw new Error(`missing block artifact: ${blockArtifact}`);

const registry = loadResearchQuestionRegistry(process.cwd());
if (!registry.questions.some(question => question.id === questionId)) {
    throw new Error(`unknown research question id: ${questionId}`);
}

const document = JSON.parse(readFileSync(blockArtifact, 'utf8'));
const populationIdentity = document?.populationIdentity ?? document?.population?.corpusIdentity ?? null;
let researchBlock = document?.researchBlock ?? document?.population?.researchBlock ?? null;
assertResearchBlock(researchBlock, { populationIdentity });

const rawScopes = values('scope');
const scopes = rawScopes.length ? rawScopes.map(spec => {
    const split = spec.indexOf(':');
    if (split <= 0 || split === spec.length - 1) throw new Error('--scope must be <block|parent|family>:<id>');
    return { kind: spec.slice(0, split), id: spec.slice(split + 1) };
}) : [{ kind: 'block', id: researchBlock.blockId }];

const evidenceRole = value('evidence-role') || researchBlock.evidenceRole;
const openedOutcomeKinds = values('opened-outcome-kind')
    .flatMap(item => item.split(',')).map(item => item.trim()).filter(Boolean);
const consumedAt = value('consumed-at') || new Date().toISOString();
const runRef = value('run-ref') || null;

for (const scope of scopes) {
    researchBlock = appendResearchConsumption(researchBlock, {
        questionId,
        decisionRef,
        scope,
        evidenceRole,
        conditioning,
        openedOutcomeKinds,
        runRef,
        consumedAt,
    }, { populationIdentity });
}

const sidecar = {
    schemaVersion: 1,
    kind: 'pathfinder-research-consumption-link',
    createdAt: new Date().toISOString(),
    sourceBlockArtifact: blockArtifact,
    populationIdentity,
    researchBlock,
    recordedConsumption: {
        questionId,
        decisionRef,
        scopes,
        evidenceRole,
        conditioning,
        openedOutcomeKinds,
        runRef,
        consumedAt,
    },
};
mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
writeFileSync(path.resolve(out), JSON.stringify(sidecar, null, 2) + '\n');
console.log(JSON.stringify({
    out,
    blockId: researchBlock.blockId,
    questionId,
    consumptionEvents: researchBlock.consumptionEvents.length,
}, null, 2));
