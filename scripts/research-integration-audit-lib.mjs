import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchRelations } from './research-relations-lib.mjs';
import {
    loadResearchQuestionRegistry,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';
import { loadPremiseMap } from './research-premise-map-lib.mjs';
import { buildQuestionDossier } from './research-question-dossier-lib.mjs';

function refIds(question, keys) {
    return keys.flatMap(key => {
        const value = question?.[key];
        if (value == null) return [];
        return Array.isArray(value) ? value : [value];
    }).map(String).filter(Boolean);
}

export function auditResearchIntegration(root = process.cwd()) {
    const errors = [];
    const warnings = [];
    const questionRegistry = loadResearchQuestionRegistry(root);
    errors.push(...validateResearchQuestionRegistry(questionRegistry));
    const questionIds = new Set(questionRegistry.questions.map(question => question.id));

    const premiseMap = loadPremiseMap(root);
    const premiseIds = new Set(premiseMap.premises.map(row => row.premiseId));
    if (premiseMap.snapshot) {
        if (premiseMap.premises.length !== premiseMap.snapshot.propositionCount) {
            errors.push(`active premise snapshot propositionCount=${premiseMap.snapshot.propositionCount} but loaded ${premiseMap.premises.length}`);
        }
        if (premiseMap.edges.length !== premiseMap.snapshot.relationCount) {
            errors.push(`active premise snapshot relationCount=${premiseMap.snapshot.relationCount} but loaded ${premiseMap.edges.length}`);
        }
    }

    const measurement = JSON.parse(readFileSync(
        path.join(root, 'docs/solver-premise-map-measurement-opportunities.json'),
        'utf8',
    ));
    if (measurement.governingPremise && !premiseIds.has(measurement.governingPremise)) {
        errors.push(`measurement overlay governingPremise references unknown premise ${measurement.governingPremise}`);
    }
    const measurementIds = new Set((measurement.opportunities ?? []).map(row => row.id));
    for (const opportunity of measurement.opportunities ?? []) {
        for (const premiseId of opportunity.mappedPremises ?? []) {
            if (!premiseIds.has(premiseId)) errors.push(`${opportunity.id} references unknown premise ${premiseId}`);
        }
    }

    for (const question of questionRegistry.questions) {
        for (const premiseId of refIds(question, ['premiseId', 'premiseIds', 'mappedPremises'])) {
            if (!premiseIds.has(premiseId)) errors.push(`${question.id} references unknown premise ${premiseId}`);
        }
        for (const moId of refIds(question, ['measurementOpportunity', 'measurementOpportunities', 'measurementOpportunityIds'])) {
            if (!measurementIds.has(moId)) errors.push(`${question.id} references unknown measurement opportunity ${moId}`);
        }
    }

    const model = buildResearchRelations(root, { discoverArtifacts: true });
    for (const block of model.relations.researchBlocks) {
        if (!questionIds.has(block.questionId)) errors.push(`research block ${block.blockId} references unknown question ${block.questionId}`);
    }

    for (const bundle of model.relations.durableEvidence) {
        if (bundle.questionId && !questionIds.has(bundle.questionId)) {
            errors.push(`durable evidence ${bundle.bundlePath} references unknown question ${bundle.questionId}`);
        }
        if (bundle.measurementOpportunity && !measurementIds.has(bundle.measurementOpportunity)) {
            errors.push(`durable evidence ${bundle.bundlePath} references unknown measurement opportunity ${bundle.measurementOpportunity}`);
        }
        if (!bundle.manifestPath) {
            errors.push(`durable evidence bundle has no retained manifest: ${bundle.bundlePath}`);
            continue;
        }
        const manifest = JSON.parse(readFileSync(path.join(root, bundle.manifestPath), 'utf8'));
        const manifestQuestionId = manifest?.researchQuestion?.questionId ?? manifest?.population?.researchBlock?.questionId ?? null;
        const manifestBlockId = manifest?.population?.researchBlock?.blockId ?? null;
        if ((bundle.questionId ?? null) !== manifestQuestionId) {
            errors.push(`durable evidence question summary disagrees with manifest: ${bundle.bundlePath}`);
        }
        if ((bundle.blockId ?? null) !== manifestBlockId) {
            errors.push(`durable evidence block summary disagrees with manifest: ${bundle.bundlePath}`);
        }
        if (manifest?.researchQuestion?.questionId && manifest?.population?.researchBlock?.questionId &&
            manifest.researchQuestion.questionId !== manifest.population.researchBlock.questionId) {
            warnings.push({
                kind: 'experiment-question-vs-block-question',
                path: bundle.manifestPath,
                detail: 'Research question and source block question differ. This may be intentional descendant reuse, but evidence ancestry should make the relationship explicit.',
            });
        }
    }

    const activeQuestion = questionRegistry.questions.find(question => String(question.state).startsWith('active'));
    if (activeQuestion) {
        const dossier = buildQuestionDossier(root, { questionId: activeQuestion.id });
        if (dossier.authority?.kind !== 'derived-read-only') {
            errors.push('question dossier must declare itself derived-read-only');
        }
    }

    return {
        schemaVersion: 1,
        premiseSnapshot: premiseMap.snapshot?.snapshotId ?? null,
        premiseCount: premiseMap.premises.length,
        premiseRelationCount: premiseMap.edges.length,
        questionCount: questionRegistry.questions.length,
        researchBlockCount: model.relations.researchBlocks.length,
        durableEvidenceCount: model.relations.durableEvidence.length,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings,
    };
}
