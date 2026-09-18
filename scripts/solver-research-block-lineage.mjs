import { stableHash } from './solver-experiment-contract.mjs';

const SHA256_RE = /^sha256:[0-9a-f]{64}$/iu;
const EVIDENCE_ROLES = new Set(['development', 'confirmation', 'transfer']);
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
    if (!EVIDENCE_ROLES.has(block.evidenceRole)) issues.push('researchBlock.evidenceRole');
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
            if (!EVIDENCE_ROLES.has(event?.evidenceRole)) issues.push(`${base}.evidenceRole`);
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

export function researchBlockEligibility(block, {
    questionId,
    evidenceRole = 'development',
    relatedQuestionIds = null,
    scope = null,
} = {}) {
    if (!nonEmpty(questionId)) throw new Error('questionId is required');
    if (!EVIDENCE_ROLES.has(evidenceRole)) throw new Error('invalid evidenceRole');
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
