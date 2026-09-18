import { readFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchRelations } from './research-relations-lib.mjs';
import {
    loadResearchQuestionRegistry,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';
import { loadPremiseMap } from './research-premise-map-lib.mjs';
import { buildQuestionDossier } from './research-question-dossier-lib.mjs';
import { GENERATION_METHODS, GENERATION_SUITES, crossConstructionStatus } from './research-level-generation-lib.mjs';

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
    for (const edge of premiseMap.edges) {
        if (edge.fromKind === 'premise' && !premiseIds.has(edge.from)) {
            errors.push(`premise relation references unknown source premise ${edge.from} in ${edge.sourceFile}`);
        }
        if (edge.toKind === 'premise' && !premiseIds.has(edge.to)) {
            errors.push(`premise relation references unknown target premise ${edge.to} in ${edge.sourceFile}`);
        }
    }
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
    if (measurementIds.size !== (measurement.opportunities ?? []).length) {
        errors.push('measurement opportunity registry contains duplicate ids');
    }
    for (const opportunity of measurement.opportunities ?? []) {
        for (const premiseId of opportunity.mappedPremises ?? []) {
            if (!premiseIds.has(premiseId)) errors.push(`${opportunity.id} references unknown premise ${premiseId}`);
        }
    }

    for (const question of questionRegistry.questions) {
        for (const premiseId of refIds(question, ['premiseId', 'premiseIds', 'mappedPremises', 'premiseRefs'])) {
            if (!premiseIds.has(premiseId)) errors.push(`${question.id} references unknown premise ${premiseId}`);
        }
        for (const moId of refIds(question, ['measurementOpportunity', 'measurementOpportunities', 'measurementOpportunityIds'])) {
            if (!measurementIds.has(moId)) errors.push(`${question.id} references unknown measurement opportunity ${moId}`);
        }
    }

    const model = buildResearchRelations(root, { discoverArtifacts: true });
    if (model.relations.queue.length === 0) {
        errors.push('research-status queue relation is empty; current workstream authority is not reaching research relations');
    }
    if (!model.relations.queue.some(row => String(row.workstreamId) === '2')) {
        errors.push('research-status queue relation does not expose WS2 from current workstream authority');
    }
    for (const question of questionRegistry.questions.filter(row => String(row.state ?? '').startsWith('active'))) {
        if (!model.relations.queue.some(row => row.questionRef === question.id)) {
            errors.push(`active question ${question.id} is not linked from the structured workstream queue relation`);
        }
    }
    for (const evidence of model.relations.evidence) {
        if (evidence.researchQuestion && !questionIds.has(evidence.researchQuestion)) {
            errors.push(`report ${evidence.latestEvidence?.report ?? evidence.topicId} references unknown research question ${evidence.researchQuestion}`);
        }
        for (const premiseId of evidence.premiseRefs ?? []) {
            if (!premiseIds.has(premiseId)) errors.push(`report ${evidence.latestEvidence?.report ?? evidence.topicId} references unknown premise ${premiseId}`);
        }
        for (const moId of evidence.measurementOpportunities ?? []) {
            if (!measurementIds.has(moId)) errors.push(`report ${evidence.latestEvidence?.report ?? evidence.topicId} references unknown measurement opportunity ${moId}`);
        }
    }

    const assetsDocument = JSON.parse(readFileSync(path.join(root, 'docs/solver-research-data-assets.json'), 'utf8'));
    const assetIds = new Set((assetsDocument.assets ?? []).map(asset => asset.id));
    for (const relationship of assetsDocument.relationships ?? []) {
        for (const assetId of relationship.assets ?? []) {
            if (!assetIds.has(assetId)) errors.push(`research asset relationship ${relationship.id} references unknown asset ${assetId}`);
        }
    }
    const resourceAudits = JSON.parse(readFileSync(path.join(root, 'docs/solver-research-resource-contract-audits.json'), 'utf8'));
    for (const audit of resourceAudits.auditedResources ?? []) {
        if (!assetIds.has(audit.assetId)) errors.push(`resource contract audit references unknown asset ${audit.assetId}`);
    }

    const validEvidenceRoles = new Set(['development', 'confirmation', 'transfer']);
    for (const suite of Object.values(GENERATION_SUITES)) {
        for (const method of suite.methods ?? []) {
            if (!GENERATION_METHODS[method]) errors.push(`generation suite ${suite.id} references unknown method ${method}`);
        }
        for (const [method, role] of Object.entries(suite.defaultEvidenceRoles ?? {})) {
            if (!(suite.methods ?? []).includes(method)) errors.push(`generation suite ${suite.id} assigns a role to non-member method ${method}`);
            if (!validEvidenceRoles.has(role)) errors.push(`generation suite ${suite.id} uses invalid evidence role ${role}`);
        }
    }
    const transferPair = GENERATION_SUITES['transfer-pair'];
    if (transferPair && transferPair.methods.length === 2 &&
        crossConstructionStatus(transferPair.methods[0], transferPair.methods[1]) !== 'cross-construction') {
        errors.push('transfer-pair suite no longer spans materially different construction classes');
    }

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
        if (manifest?.population?.researchBlock) {
            const blockIndependentUnit = manifest.population.researchBlock.independentUnit ?? null;
            const contractIndependentUnit = manifest.population.independentUnit ?? null;
            if (contractIndependentUnit == null) {
                warnings.push({
                    kind: 'legacy-missing-independent-unit-propagation',
                    path: bundle.manifestPath,
                    detail: 'Research block declares an independent unit, but the experiment population does not carry it explicitly. New contracts propagate this field; treat legacy evidence conservatively.',
                });
            } else if (contractIndependentUnit !== blockIndependentUnit) {
                errors.push(`durable evidence independent-unit summary disagrees with research block: ${bundle.manifestPath}`);
            }
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
        semanticJoinCoverage: {
            queueEntries: model.relations.queue.length,
            authoredAssetRelationships: model.relations.assetRelationships.length,
            questionsWithPremiseRefs: questionRegistry.questions.filter(question => (question.premiseRefs ?? []).length > 0).length,
            questionsWithMeasurementOpportunities: questionRegistry.questions.filter(question => (question.measurementOpportunities ?? []).length > 0).length,
            evidenceReportsWithStableQuestion: model.relations.evidence.filter(evidence => evidence.researchQuestion).length,
            evidenceReportsWithPremiseRefs: model.relations.evidence.filter(evidence => (evidence.premiseRefs ?? []).length > 0).length,
            evidenceReportsWithMeasurementOpportunities: model.relations.evidence.filter(evidence => (evidence.measurementOpportunities ?? []).length > 0).length,
            researchBlocksWithIndependentUnit: model.relations.researchBlocks.filter(block => Boolean(block.independentUnit)).length,
            durableEvidenceWithExplicitIndependentUnit: model.relations.durableEvidence.filter(bundle => {
                if (!bundle.manifestPath) return false;
                const manifest = JSON.parse(readFileSync(path.join(root, bundle.manifestPath), 'utf8'));
                return Boolean(manifest?.population?.independentUnit);
            }).length,
        },
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings,
    };
}
