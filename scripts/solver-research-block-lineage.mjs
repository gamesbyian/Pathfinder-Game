import { researchSemanticHash as stableHash } from './research-semantic-identity-lib.mjs';
import {
    isResearchEvaluationEvidenceRole,
    validateResearchEvaluationEvidenceRole,
} from './research-evaluation-evidence-role-lib.mjs';

const SHA256_RE = /^sha256:[0-9a-f]{64}$/iu;
const SCOPE_KINDS = new Set(['block', 'parent', 'family']);

const nonEmpty = value => typeof value === 'string' && value.trim().length > 0;
function stringArrayIssues(value, path, { allowEmpty = true } = {}) {
    if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) return [path];
    return value.some(item => !nonEmpty(item)) ? [path] : [];
}

export function researchBlockIssues(block, { populationIdentity = null } = {}) {
    const issues = [];
    if (!block || typeof block !== 'object' || Array.isArray(block)) return ['researchBlock'];

    for (const field of ['blockId', 'questionId', 'sourceRegime', 'sourceRevision', 'independentUnit']) {
        if (!nonEmpty(block[field])) issues.push(`researchBlock.${field}`);
    }
    if (!isResearchEvaluationEvidenceRole(block.evidenceRole)) issues.push('researchBlock.evidenceRole');
    if (!SHA256_RE.test(String(populationIdentity ?? ''))) issues.push('populationIdentity');

    issues.push(...stringArrayIssues(block.parentIds, 'researchBlock.parentIds', { allowEmpty: false }));
    issues.push(...stringArrayIssues(block.parentContentIdentities, 'researchBlock.parentContentIdentities', { allowEmpty: false }));
    if (Array.isArray(block.parentIds) && Array.isArray(block.parentContentIdentities)
        && block.parentIds.length !== block.parentContentIdentities.length) {
        issues.push('researchBlock.parentContentIdentities(length)');
    }
    issues.push(...stringArrayIssues(block.sourceArtifactRefs, 'researchBlock.sourceArtifactRefs', { allowEmpty: false }));

    if (!block.createdBy || typeof block.createdBy !== 'object' || Array.isArray(block.createdBy)) {
        issues.push('researchBlock.createdBy');
    } else {
        if (!nonEmpty(block.createdBy.producer)) issues.push('researchBlock.createdBy.producer');
        if (!nonEmpty(block.createdBy.manifestRef)) issues.push('researchBlock.createdBy.manifestRef');
        if (!(block.createdBy.runRef === null || nonEmpty(block.createdBy.runRef))) issues.push('researchBlock.createdBy.runRef');
    }
    if (!(block.generationRef === null || nonEmpty(block.generationRef))) issues.push('researchBlock.generationRef');

    if (!Array.isArray(block.consumptionEvents)) {
        issues.push('researchBlock.consumptionEvents');
    } else {
        for (const [index, event] of block.consumptionEvents.entries()) {
            const base = `researchBlock.consumptionEvents[${index}]`;
            for (const field of ['questionId', 'decisionRef', 'consumedAt']) {
                if (!nonEmpty(event?.[field])) issues.push(`${base}.${field}`);
            }
            if (nonEmpty(event?.consumedAt) && Number.isNaN(Date.parse(event.consumedAt))) issues.push(`${base}.consumedAt`);
            if (!isResearchEvaluationEvidenceRole(event?.evidenceRole)) issues.push(`${base}.evidenceRole`);
            if (!SCOPE_KINDS.has(event?.scope?.kind) || !nonEmpty(event?.scope?.id)) issues.push(`${base}.scope`);
            issues.push(...stringArrayIssues(event?.conditioning, `${base}.conditioning`, { allowEmpty: false }));
            issues.push(...stringArrayIssues(event?.openedOutcomeKinds, `${base}.openedOutcomeKinds`));
            if (!(event?.runRef === null || nonEmpty(event?.runRef))) issues.push(`${base}.runRef`);
        }
    }
    return [...new Set(issues)];
}

export function assertResearchBlock(block, options) {
    const issues = researchBlockIssues(block, options);
    if (issues.length) throw new Error(`invalid research block: ${issues.join(', ')}`);
    return block;
}

export function appendResearchConsumption(block, event, { populationIdentity } = {}) {
    const candidate = { ...block, consumptionEvents: [...(block?.consumptionEvents ?? []), event] };
    assertResearchBlock(candidate, { populationIdentity });
    return candidate;
}


export function summarizeResearchConsumption(block) {
    const events = Array.isArray(block?.consumptionEvents) ? block.consumptionEvents : [];
    const increment = (target, key) => {
        const value = String(key ?? '');
        if (!value) return;
        target[value] = (target[value] ?? 0) + 1;
    };
    const byQuestion = {};
    const byEvidenceRole = {};
    const byScopeKind = {};
    const openedOutcomeKinds = new Set();
    const decisionRefs = new Set();
    const times = [];

    for (const event of events) {
        increment(byQuestion, event?.questionId);
        increment(byEvidenceRole, event?.evidenceRole);
        increment(byScopeKind, event?.scope?.kind);
        for (const kind of event?.openedOutcomeKinds ?? []) openedOutcomeKinds.add(String(kind));
        if (nonEmpty(event?.decisionRef)) decisionRefs.add(event.decisionRef);
        if (nonEmpty(event?.consumedAt) && !Number.isNaN(Date.parse(event.consumedAt))) {
            times.push(event.consumedAt);
        }
    }
    times.sort((a, b) => Date.parse(a) - Date.parse(b));

    return {
        totalEvents: events.length,
        byQuestion,
        byEvidenceRole,
        byScopeKind,
        openedOutcomeKinds: [...openedOutcomeKinds].sort(),
        decisionRefs: [...decisionRefs].sort(),
        firstConsumedAt: times[0] ?? null,
        lastConsumedAt: times.at(-1) ?? null,
    };
}

export function researchBlockEligibility(block, {
    questionId,
    evidenceRole = 'development',
    relatedQuestionIds = null,
    scope = null,
} = {}) {
    if (!nonEmpty(questionId)) throw new Error('questionId is required');
    validateResearchEvaluationEvidenceRole(evidenceRole);
    if (relatedQuestionIds != null && !Array.isArray(relatedQuestionIds)) throw new Error('relatedQuestionIds must be an array or null');

    const ids = relatedQuestionIds == null ? null : new Set([questionId, ...relatedQuestionIds.map(String)]);
    const events = Array.isArray(block?.consumptionEvents) ? block.consumptionEvents : [];
    const matching = events.filter(event => {
        if (ids ? !ids.has(String(event.questionId)) : String(event.questionId) !== questionId) return false;
        if (!scope) return true;
        return event?.scope?.kind === scope.kind && String(event?.scope?.id) === String(scope.id);
    });

    const reasons = [];
    if (matching.length) reasons.push('matching-consumption-recorded');
    if (evidenceRole !== 'development' && relatedQuestionIds == null) reasons.push('question-lineage-not-proven');

    let eligible = true;
    if (evidenceRole !== 'development') {
        if (matching.length) eligible = false;
        else if (relatedQuestionIds == null) eligible = null;
    }

    return { eligible, evidenceRole, questionId, matchedConsumptionEvents: matching.length, reasons };
}

export function researchPopulationIdentity(parentIds, parentContentIdentities) {
    if (!Array.isArray(parentIds) || !Array.isArray(parentContentIdentities)
        || parentIds.length === 0 || parentIds.length !== parentContentIdentities.length) {
        throw new Error('research population requires aligned non-empty parentIds and parentContentIdentities');
    }
    const parents = parentIds.map((id, index) => ({
        id: String(id),
        contentIdentity: String(parentContentIdentities[index]),
    })).sort((a, b) => a.id.localeCompare(b.id) || a.contentIdentity.localeCompare(b.contentIdentity));
    if (parents.some(row => !nonEmpty(row.id) || !nonEmpty(row.contentIdentity))) {
        throw new Error('research population parent identities must be non-empty');
    }
    if (new Set(parents.map(row => row.id)).size !== parents.length) {
        throw new Error('research population contains duplicate parent ids');
    }
    return stableHash({ kind: 'research-parent-block', parents });
}

export function buildResearchBlock({
    blockId,
    questionId,
    sourceRegime,
    sourceRevision,
    evidenceRole = 'development',
    independentUnit = 'parent-level',
    parentIds,
    parentContentIdentities,
    sourceArtifactRefs,
    producer,
    manifestRef,
    runRef = null,
    generationRef = null,
    consumptionEvents = [],
} = {}) {
    const populationIdentity = researchPopulationIdentity(parentIds, parentContentIdentities);
    const researchBlock = assertResearchBlock({
        blockId,
        questionId,
        sourceRegime,
        sourceRevision,
        evidenceRole,
        independentUnit,
        parentIds: [...parentIds],
        parentContentIdentities: [...parentContentIdentities],
        sourceArtifactRefs: [...sourceArtifactRefs],
        createdBy: { producer, manifestRef, runRef },
        generationRef,
        consumptionEvents: [...consumptionEvents],
    }, { populationIdentity });
    return { populationIdentity, researchBlock };
}

export function researchBlockIdentity(block, populationIdentity) {
    assertResearchBlock(block, { populationIdentity });
    return stableHash({
        blockId: block.blockId,
        questionId: block.questionId,
        populationIdentity,
        sourceRegime: block.sourceRegime,
        sourceRevision: block.sourceRevision,
        parentIds: block.parentIds,
        parentContentIdentities: block.parentContentIdentities,
    });
}
