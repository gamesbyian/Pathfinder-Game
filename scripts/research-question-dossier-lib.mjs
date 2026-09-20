import { buildResearchRelations } from './research-relations-lib.mjs';
import {
    chooseAcquisitionRoute,
    generationGuidanceForRoute,
    rankCandidateAssetRelationships,
    rankCandidateAssets,
} from './research-acquisition-preflight-lib.mjs';

const PATH_RE = /^(?:docs|reports|scripts|data|logs)\//u;
const STOP = new Set(['does','that','this','with','from','into','than','then','when','where','which','while','about','across','under','before','after','current','question','production','solver']);

function flatten(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (typeof value === 'object') return Object.values(value).flatMap(flatten);
    return [String(value)];
}

function questionTerms(question) {
    const raw = [
        question.id,
        question.question,
        ...(question.aliases ?? []),
    ].join(' ').toLowerCase().replace(/[^a-z0-9]+/gu, ' ').split(/\s+/u);
    return [...new Set(raw.filter(term => term.length >= 4 && !STOP.has(term)))];
}

function rankedHints(rows, terms, identity, limit = 12) {
    return rows.map(row => {
        const haystack = flatten(row).join(' ').toLowerCase();
        const matchedTerms = terms.filter(term => haystack.includes(term));
        return { row, score: matchedTerms.length, matchedTerms };
    }).filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || String(a.row?.[identity] ?? '').localeCompare(String(b.row?.[identity] ?? '')))
        .slice(0, limit)
        .map(item => ({ ...item.row, _discoveryScore: item.score, _matchedTerms: item.matchedTerms }));
}

function questionRelations(question, allQuestions) {
    const relationFields = [
        'implies', 'triggeredBy', 'negativeControlFor', 'calibratedBy', 'calibrates',
        'supersedes', 'duplicateOf',
    ];
    const knownIds = new Set(allQuestions.map(row => row.id));
    const constrainedByQuestions = (question.constrainedBy ?? []).filter(value => knownIds.has(value));
    const outgoing = [
        ...relationFields.flatMap(field => (question[field] ?? []).map(id => ({ field, id }))),
        ...constrainedByQuestions.map(id => ({ field: 'constrainedBy', id })),
    ];
    const incoming = [];
    for (const candidate of allQuestions) {
        if (candidate.id === question.id) continue;
        for (const field of relationFields) {
            if ((candidate[field] ?? []).includes(question.id)) incoming.push({ field, id: candidate.id });
        }
        if ((candidate.constrainedBy ?? []).includes(question.id)) {
            incoming.push({ field: 'constrainedBy', id: candidate.id });
        }
    }
    return { outgoing, incoming };
}

function explicitIds(question, keys) {
    return [...new Set(keys.flatMap(key => {
        const value = question?.[key];
        if (value == null) return [];
        return Array.isArray(value) ? value : [value];
    }).map(String).filter(Boolean))];
}

export function buildQuestionDossier(root = process.cwd(), {
    questionId,
    evidenceRole = 'development',
    relatedQuestionIds = null,
} = {}) {
    if (!questionId) throw new Error('questionId is required');
    const model = buildResearchRelations(root, {
        discoverArtifacts: true,
        eligibility: { questionId, evidenceRole, relatedQuestionIds },
    });
    const question = model.relations.questions.find(row => row.id === questionId);
    if (!question) throw new Error(`unknown question id: ${questionId}`);

    const blocks = model.relations.researchBlocks.filter(row => row.questionId === questionId);
    const eligibleBlocks = blocks.filter(row => row.eligibility?.eligible === true);
    const durableEvidence = model.relations.durableEvidence.filter(row => row.questionId === questionId);
    const exactTaggedEvidence = model.relations.evidence.filter(row => row.researchQuestion === questionId);
    const measurementIds = new Set([
        ...explicitIds(question, ['measurementOpportunity', 'measurementOpportunities', 'measurementOpportunityIds']),
        ...durableEvidence.map(row => row.measurementOpportunity).filter(Boolean),
        ...exactTaggedEvidence.flatMap(row => row.measurementOpportunities ?? []),
    ]);
    const measurementOpportunities = model.relations.measurementOpportunities.filter(row => measurementIds.has(row.id));

    const premiseIds = new Set([
        ...explicitIds(question, ['premiseId', 'premiseIds', 'mappedPremises', 'premiseRefs']),
        ...measurementOpportunities.flatMap(row => row.mappedPremises ?? []),
        ...exactTaggedEvidence.flatMap(row => row.premiseRefs ?? []),
    ]);
    const premises = model.relations.premises.filter(row => premiseIds.has(row.premiseId));
    const premiseEdges = model.relations.premiseEdges.filter(row => premiseIds.has(row.from) || premiseIds.has(row.to));

    const terms = questionTerms(question);
    const premiseHints = rankedHints(model.relations.premises, terms, 'premiseId');
    const authorityTerms = [question.id, ...(question.aliases ?? [])].map(value => String(value).toLowerCase());
    const authorityMatch = row => {
        const haystack = flatten(row).join(' ').toLowerCase();
        return authorityTerms.some(term => term && haystack.includes(term));
    };
    const lexicalEvidenceMatches = model.relations.evidence.filter(authorityMatch);
    const evidenceMatches = exactTaggedEvidence.length ? exactTaggedEvidence : lexicalEvidenceMatches;

    const acquisition = chooseAcquisitionRoute({ question, eligibleBlocks });
    const candidateAssets = rankCandidateAssets(question, model.relations.assets, { evidenceRole });
    const candidateJoins = rankCandidateAssetRelationships(question, model.relations.assetRelationships, {
        candidateAssetIds: candidateAssets.map(asset => asset.id),
    });
    const evidenceRefs = [...new Set([
        ...(question.answeredBy ?? []),
        ...(question.constrainedBy ?? []),
    ].filter(value => typeof value === 'string' && PATH_RE.test(value)))];

    return {
        schemaVersion: 1,
        authority: {
            kind: 'derived-read-only',
            priorityOwner: 'docs/solver-optimization-workstreams.md',
            questionOwner: 'docs/solver-research-question-relations.json',
            evidenceOwner: 'dated reports/artifacts and their owning contracts',
            note: 'This dossier joins existing authorities for discovery and planning; it does not change priority, question state, evidence role, or premise admission.',
        },
        question,
        questionRelations: questionRelations(question, model.relations.questions),
        currentAuthorityMatches: {
            queue: model.relations.queue.filter(row => row.questionRef === questionId),
            queueMatchMode: 'stable-question-id',
            evidence: evidenceMatches,
            evidenceMatchMode: exactTaggedEvidence.length ? 'stable-question-id' : 'lexical-fallback',
            experiments: model.relations.experiments.filter(authorityMatch),
            experimentMatchMode: 'lexical-discovery-only',
        },
        evidenceRefs,
        populations: {
            knownBlocks: blocks,
            mechanicallyEligibleBlockIds: eligibleBlocks.map(row => row.blockId),
            durableEvidence,
        },
        conceptualContext: {
            explicitPremises: premises,
            premiseEdges,
            measurementOpportunities,
            premiseDiscoveryHints: {
                authority: 'lexical-discovery-only',
                rows: premiseHints,
            },
        },
        resources: {
            candidateAssets,
            candidateJoins,
            interpretation: 'Asset and authored multi-asset-join rankings are discovery aids. Join boundaries remain authoritative caveats; audit-grade Resource Contract signals remain claim-specific rather than automatic authorization.',
        },
        acquisition: {
            route: acquisition.route,
            need: acquisition.need,
            basis: acquisition.basis ?? (eligibleBlocks.length ? 'eligible-existing-block' : null),
            rationale: acquisition.rationale,
            generationGuidance: generationGuidanceForRoute(acquisition.route),
        },
    };
}
