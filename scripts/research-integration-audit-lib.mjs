import { existsSync, readFileSync } from 'node:fs';
import { repositoryPathKind } from './repository-file-view.mjs';
import path from 'node:path';

import { buildResearchRelations } from './research-relations-lib.mjs';
import {
    isTerminalResearchQuestionState,
    loadResearchQuestionRegistry,
    researchQuestionLifecycleClass,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';
import { loadPremiseMap } from './research-premise-map-lib.mjs';
import { buildQuestionDossier } from './research-question-dossier-lib.mjs';
import { GENERATION_METHODS, GENERATION_SUITES, crossConstructionStatus } from './research-level-generation-lib.mjs';
import { isResearchEvaluationEvidenceRole } from './research-evaluation-evidence-role-lib.mjs';
import { validateSolverResearchDataAssets } from './solver-research-data-assets-lib.mjs';

function repositoryPathExists(root, relativePath) {
    if (existsSync(path.join(root, relativePath))) return true;
    try {
        return repositoryPathKind(root, relativePath) !== null;
    } catch {
        // Synthetic/unit-test roots need not be Git repositories. In that case the
        // materialized working tree remains the only available authority.
        return false;
    }
}

function refIds(question, keys) {
    return keys.flatMap(key => {
        const value = question?.[key];
        if (value == null) return [];
        return Array.isArray(value) ? value : [value];
    }).map(String).filter(Boolean);
}

export function auditResearchIntegration(root = process.cwd(), { model: suppliedModel = null } = {}) {
    const errors = [];
    const warnings = [];
    const questionRegistry = loadResearchQuestionRegistry(root);
    errors.push(...validateResearchQuestionRegistry(questionRegistry, { root }));
    const questionIds = new Set(questionRegistry.questions.map(question => question.id));
    const questionById = new Map(questionRegistry.questions.map(question => [question.id, question]));

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
        for (const field of ['answeredBy', 'constrainedBy']) {
            for (const value of question[field] ?? []) {
                if (!/^(?:docs|reports|scripts|data|logs)\//u.test(String(value))) continue;
                if (!repositoryPathExists(root, value)) {
                    errors.push(`${question.id}.${field} references missing repository path ${value}`);
                }
            }
        }
    }

    const model = suppliedModel ?? buildResearchRelations(root, { discoverArtifacts: true });
    if (model.relations.queue.length === 0) {
        errors.push('research-status queue relation is empty; current workstream authority is not reaching research relations');
    }
    if (!model.relations.queue.some(row => String(row.workstreamId) === '2')) {
        errors.push('research-status queue relation does not expose WS2 from current workstream authority');
    }
    for (const row of model.relations.queue) {
        if (!row.questionRef) continue;
        const question = questionById.get(row.questionRef);
        if (!question) {
            errors.push(`workstream ${row.workstreamId ?? row.topicId} references unknown research question ${row.questionRef}`);
            continue;
        }
        const queueActive = row.executionState === 'active' || row.status === 'active';
        const questionState = String(question.state ?? '').toLowerCase();
        if (queueActive && isTerminalResearchQuestionState(questionState)) {
            errors.push(`active workstream ${row.workstreamId ?? row.topicId} references terminal research question ${row.questionRef} (${question.state})`);
        }
    }
    for (const question of questionRegistry.questions.filter(row =>
        researchQuestionLifecycleClass(String(row.state ?? '').toLowerCase()) === 'active')) {
        if (!model.relations.queue.some(row => row.questionRef === question.id)) {
            errors.push(`active question ${question.id} is not linked from the structured workstream queue relation`);
        }
    }
    const evidenceByReport = new Map(
        model.relations.evidence
            .map(evidence => [evidence.latestEvidence?.report ?? null, evidence])
            .filter(([report]) => Boolean(report)),
    );
    for (const question of questionRegistry.questions) {
        for (const reportPath of question.answeredBy ?? []) {
            if (!/^reports\//u.test(String(reportPath))) continue;
            const evidence = evidenceByReport.get(reportPath);
            if (!evidence?.researchQuestion) continue;
            if (evidence.researchQuestion !== question.id) {
                errors.push(`${question.id}.answeredBy points to ${reportPath}, whose structured researchQuestion is ${evidence.researchQuestion}`);
            }
        }
    }

    for (const demand of model.relations.capabilityDemands ?? []) {
        if (!questionIds.has(demand.questionId)) {
            errors.push(`capability demand ${demand.id} references unknown owning question ${demand.questionId}`);
        }
        for (const ref of demand.evidenceRefs ?? []) {
            if (/^(?:docs|reports|scripts|data|logs)\//u.test(String(ref))
                && !repositoryPathExists(root, ref)) {
                errors.push(`capability demand ${demand.id} references missing evidenceRef ${ref}`);
            }
        }
        if (demand.resolutionRef
            && /^(?:docs|reports|scripts|data|logs)\//u.test(String(demand.resolutionRef))
            && !repositoryPathExists(root, demand.resolutionRef)) {
            errors.push(`capability demand ${demand.id} references missing resolutionRef ${demand.resolutionRef}`);
        }
    }

    for (const promotion of model.relations.promotions ?? []) {
        if (promotion.decisionEvidenceRef && !repositoryPathExists(root, promotion.decisionEvidenceRef)) {
            errors.push(`promotion ${promotion.promotionId} references missing decision evidence ${promotion.decisionEvidenceRef}`);
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
        for (const ref of evidence.sourceArtifacts ?? []) {
            if (!repositoryPathExists(root, ref)) {
                errors.push(`report ${evidence.latestEvidence?.report ?? evidence.topicId} references missing sourceArtifact ${ref}`);
            }
        }
        for (const successorQuestion of evidence.successorQuestions ?? []) {
            if (!questionIds.has(successorQuestion)) {
                errors.push(`report ${evidence.latestEvidence?.report ?? evidence.topicId} references unknown successor question ${successorQuestion}`);
            }
        }
        for (const successorArtifact of evidence.successorArtifacts ?? []) {
            if (!repositoryPathExists(root, successorArtifact)) {
                errors.push(`report ${evidence.latestEvidence?.report ?? evidence.topicId} references missing successor artifact ${successorArtifact}`);
            }
        }
    }

    const assetsDocument = JSON.parse(readFileSync(path.join(root, 'docs/solver-research-data-assets.json'), 'utf8'));
    errors.push(...validateSolverResearchDataAssets(root).map(error => `research asset registry: ${error}`));
    const assetIds = new Set((assetsDocument.assets ?? []).map(asset => asset.id));
    const resourceAudits = JSON.parse(readFileSync(path.join(root, 'docs/solver-research-resource-contract-audits.json'), 'utf8'));
    for (const topLevelPath of [resourceAudits.registry, resourceAudits.contractDocument]) {
        if (topLevelPath && !repositoryPathExists(root, topLevelPath)) {
            errors.push(`resource contract registry references missing repository path ${topLevelPath}`);
        }
    }
    const auditedAssetIds = new Set();
    for (const audit of resourceAudits.auditedResources ?? []) {
        if (auditedAssetIds.has(audit.assetId)) errors.push(`resource contract audit duplicates asset ${audit.assetId}`);
        auditedAssetIds.add(audit.assetId);
        if (!assetIds.has(audit.assetId)) errors.push(`resource contract audit references unknown asset ${audit.assetId}`);
        for (const field of ['historicalClaimBlastRadius', 'auditAuthorities']) {
            for (const ref of audit[field] ?? []) {
                if (!repositoryPathExists(root, ref)) {
                    errors.push(`resource contract audit ${audit.assetId}.${field} references missing repository path ${ref}`);
                }
            }
        }
        for (const ref of audit.producerAuthority ?? []) {
            const value = String(ref);
            if (/^(?:docs|reports|scripts|data|logs|modules)\//u.test(value)) {
                if (!/^(?:docs|reports|scripts|data|logs|modules)\/[A-Za-z0-9._/-]+$/u.test(value)) {
                    errors.push(`resource contract audit ${audit.assetId}.producerAuthority must be one exact repository path, not prose: ${value}`);
                } else if (!repositoryPathExists(root, value)) {
                    errors.push(`resource contract audit ${audit.assetId}.producerAuthority references missing repository path ${value}`);
                }
            }
        }
    }
    for (const requiredId of resourceAudits.requiredAuditedResources ?? []) {
        if (!assetIds.has(requiredId)) {
            errors.push(`resource contract requires unknown asset ${requiredId}`);
        } else if (!auditedAssetIds.has(requiredId)) {
            errors.push(`resource contract requires unaudited asset ${requiredId}`);
        }
    }

    for (const suite of Object.values(GENERATION_SUITES)) {
        for (const method of suite.methods ?? []) {
            if (!GENERATION_METHODS[method]) errors.push(`generation suite ${suite.id} references unknown method ${method}`);
        }
        for (const [method, role] of Object.entries(suite.defaultEvidenceRoles ?? {})) {
            if (!(suite.methods ?? []).includes(method)) errors.push(`generation suite ${suite.id} assigns a role to non-member method ${method}`);
            if (!isResearchEvaluationEvidenceRole(role)) errors.push(`generation suite ${suite.id} uses invalid evidence role ${role}`);
        }
    }
    const transferPair = GENERATION_SUITES['transfer-pair'];
    if (transferPair && transferPair.methods.length === 2 &&
        crossConstructionStatus(transferPair.methods[0], transferPair.methods[1]) !== 'cross-construction') {
        errors.push('transfer-pair suite no longer spans materially different construction classes');
    }

    for (const block of model.relations.researchBlocks) {
        if (!questionIds.has(block.questionId)) errors.push(`research block ${block.blockId} references unknown question ${block.questionId}`);
        const parentIds = new Set(block.researchBlock?.parentIds ?? []);
        for (const [index, event] of (block.researchBlock?.consumptionEvents ?? []).entries()) {
            if (!questionIds.has(event.questionId)) {
                errors.push(`research block ${block.blockId} consumptionEvents[${index}] references unknown question ${event.questionId}`);
            }
            if (/^(?:docs|reports|scripts|data|logs)\//u.test(String(event.decisionRef ?? ''))
                && !repositoryPathExists(root, event.decisionRef)) {
                errors.push(`research block ${block.blockId} consumptionEvents[${index}] references missing decisionRef ${event.decisionRef}`);
            }
            if (event?.scope?.kind === 'block' && String(event.scope.id) !== String(block.blockId)) {
                errors.push(`research block ${block.blockId} consumptionEvents[${index}] block scope names ${event.scope.id}`);
            }
            if (event?.scope?.kind === 'parent' && !parentIds.has(event.scope.id)) {
                errors.push(`research block ${block.blockId} consumptionEvents[${index}] parent scope names unknown parent ${event.scope.id}`);
            }
        }
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

    const activeQuestion = questionRegistry.questions.find(question =>
        researchQuestionLifecycleClass(String(question.state ?? '').toLowerCase()) === 'active');
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
