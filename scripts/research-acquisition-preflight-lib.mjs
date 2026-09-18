import { GENERATION_METHODS, GENERATION_SUITES } from './research-level-generation-lib.mjs';

const ROUTES = Object.freeze({
    existing: 'REUSE_EXISTING',
    fresh: 'FRESH_SAME_SOURCE',
    transfer: 'CROSS_SOURCE_TRANSFER',
    family: 'CONTROLLED_FAMILY',
    human: 'HUMAN_EDITOR',
    none: 'NO_LEVEL_GENERATION',
});

const NEED_TO_ROUTE = Object.freeze({
    'reuse-existing': ROUTES.existing,
    'fresh-independent-parents': ROUTES.fresh,
    'cross-source-transfer': ROUTES.transfer,
    'causal-contrast': ROUTES.family,
    'human-origin': ROUTES.human,
    'telemetry-or-economics': ROUTES.none,
    'representation-or-candidate': ROUTES.none,
});

function textOf(question) {
    return [
        question?.question,
        question?.result,
        question?.reopensOn,
        ...(question?.constrains ?? []),
    ].filter(Boolean).join(' ').toLowerCase();
}

export function inferAcquisitionNeed(question) {
    const reopen = String(question?.reopensOn ?? '').toLowerCase();
    if (/human|editor/u.test(reopen)) return 'human-origin';
    if (/cross[- ]source|distribution shift|transfer data|different source/u.test(reopen)) return 'cross-source-transfer';
    if (/controlled family|family neighborhood|family expansion|causal contrast|perturb|invariance/u.test(reopen)) return 'causal-contrast';
    if (/fresh independent parent|independent .*parent|independent .*population|shared-budget population|fresh .*population/u.test(reopen)) {
        return 'fresh-independent-parents';
    }

    const text = textOf(question);
    if (/telemetry|work dose|workspent|economics|information cost|candidate construction|representation|exact semantics|observer|instrumentation/u.test(text)) {
        return 'telemetry-or-economics';
    }
    if (/human|editor/u.test(text)) return 'human-origin';
    if (/cross[- ]source|distribution shift|transfer data|different source/u.test(text)) return 'cross-source-transfer';
    if (/controlled family|family neighborhood|family expansion|causal contrast|perturb|invariance/u.test(text)) return 'causal-contrast';
    return 'representation-or-candidate';
}

export function chooseAcquisitionRoute({ question, eligibleBlocks = [], requestedNeed = '' } = {}) {
    if (!question?.id) throw new Error('question is required');
    if (eligibleBlocks.length) {
        return {
            route: ROUTES.existing,
            need: 'reuse-existing',
            rationale: `${eligibleBlocks.length} mechanically eligible existing research block(s) are available for this question`,
        };
    }

    const need = requestedNeed || inferAcquisitionNeed(question);
    const route = NEED_TO_ROUTE[need];
    if (!route) throw new Error(`unknown acquisition need: ${need}`);

    const rationaleByRoute = {
        [ROUTES.fresh]: 'the gate explicitly requires fresh/sample-independent parent material from the same source regime',
        [ROUTES.transfer]: 'the gate explicitly requires a different source/construction distribution',
        [ROUTES.family]: 'the gate asks for a controlled causal/matched perturbation rather than prevalence sampling',
        [ROUTES.human]: 'the gate specifically requires human/editor-origin structure',
        [ROUTES.none]: 'the current blocker is not an established level-population deficit; use observation, exact/reference, representation, candidate, dose, work, or economics tooling first',
    };
    return { route, need, rationale: rationaleByRoute[route] };
}

export const acquisitionRoutes = () => Object.values(ROUTES);
export const acquisitionNeeds = () => Object.keys(NEED_TO_ROUTE);


function searchTerms(question) {
    return [
        question?.id,
        question?.question,
        ...(question?.aliases ?? []),
        ...(question?.constrains ?? []),
        question?.reopensOn,
    ].filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, ' ')
        .split(/\s+/u)
        .filter(term => term.length >= 4);
}


export function rankCandidateAssetRelationships(question, relationships, {
    candidateAssetIds = [],
    limit = 8,
} = {}) {
    const terms = [...new Set(searchTerms(question))];
    const candidateSet = new Set(candidateAssetIds.map(String));
    return (relationships ?? []).map(relationship => {
        const haystack = JSON.stringify({
            id: relationship.id,
            assets: relationship.assets,
            questions: relationship.questions,
            boundary: relationship.boundary,
        }).toLowerCase();
        const matchedTerms = terms.filter(term => haystack.includes(term));
        const candidateAssetOverlap = (relationship.assets ?? []).filter(assetId => candidateSet.has(String(assetId)));
        return {
            id: relationship.id,
            assets: relationship.assets ?? [],
            questions: relationship.questions ?? [],
            boundary: relationship.boundary ?? null,
            score: matchedTerms.length * 2 + candidateAssetOverlap.length,
            matchedTerms,
            candidateAssetOverlap,
        };
    }).filter(row => row.score > 0)
        .sort((a, b) => b.score - a.score || b.candidateAssetOverlap.length - a.candidateAssetOverlap.length
            || a.id.localeCompare(b.id))
        .slice(0, limit);
}

export function rankCandidateAssets(question, assets, { limit = 8, evidenceRole = null } = {}) {
    const terms = [...new Set(searchTerms(question))];
    return (assets ?? [])
        .map(asset => {
            const haystack = JSON.stringify({
                id: asset.id,
                name: asset.name,
                grain: asset.grain,
                evidenceRoles: asset.evidenceRoles,
                joinKeys: asset.joinKeys,
                queryEntryPoints: asset.queryEntryPoints,
                affordances: asset.affordances,
                caveats: asset.caveats,
            }).toLowerCase();
            const matchedTerms = terms.filter(term => haystack.includes(term));
            const audit = asset.auditedResourceContract ?? null;
            return {
                id: asset.id,
                name: asset.name,
                score: matchedTerms.length,
                matchedTerms,
                queryEntryPoints: asset.queryEntryPoints ?? [],
                evidenceRoles: asset.evidenceRoles ?? [],
                roleFit: evidenceRole
                    ? ((asset.evidenceRoles ?? []).includes(evidenceRole) ? 'declared' : 'not-declared')
                    : null,
                contractGrade: asset.contractGrade ?? (audit ? 'audited' : 'catalogue'),
                independentUnit: audit?.independentUnit ?? null,
                contractSignals: audit ? {
                    selectionConditioning: audit.selectionConditioning ?? [],
                    admissibleEvidencePurposes: audit.admissibleEvidencePurposes ?? [],
                    dependenceModel: audit.dependenceModel ?? null,
                    missingnessSemantics: audit.missingnessSemantics ?? [],
                    freshnessRevisionContract: audit.freshnessRevisionContract ?? [],
                    knownInformationLoss: audit.knownInformationLoss ?? [],
                    prospectiveProducerFixes: audit.prospectiveProducerFixes ?? [],
                } : null,
            };
        })
        .filter(row => row.score > 0)
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
        .slice(0, limit);
}

export function acquisitionStopRule(route) {
    const rules = {
        REUSE_EXISTING: 'stop if existing material is mechanically ineligible, lineage-ambiguous, or lacks the decision-bearing opportunity; do not generate merely because reuse is inconvenient',
        FRESH_SAME_SOURCE: 'pilot first; stop if opportunity prevalence is negligible or the fresh block cannot express the prespecified discriminator',
        CROSS_SOURCE_TRANSFER: 'stop if the alternate source does not actually change the construction/distribution dimension required by the claim',
        CONTROLLED_FAMILY: 'stop if the prespecified perturbation cannot change the ranked decision or descendants cease to isolate the intended contrast',
        HUMAN_EDITOR: 'stop if human/editor origin is not required by the claim or suitable parents cannot be locked before outcome inspection',
        NO_LEVEL_GENERATION: 'stop before generation; resolve the telemetry, representation, exact/reference, candidate, dose, work, or economics blocker first',
    };
    return rules[route] ?? null;
}


export function generationGuidanceForRoute(route) {
    const compactMethod = id => {
        const method = GENERATION_METHODS[id];
        return {
            id: method.id,
            label: method.label,
            sourceFamily: method.sourceFamily,
            distributionClass: method.distributionClass,
            scientificUse: method.scientificUse,
            independenceNote: method.independenceNote,
        };
    };
    if (route === ROUTES.fresh) {
        return {
            automaticGeneration: false,
            candidateMethods: Object.keys(GENERATION_METHODS).map(compactMethod),
            candidateSuites: [],
            note: 'Fresh-same-source requires the source regime named by the claim/population plan. These are available producers, not interchangeable candidates: preserve the owning construction regime and its mechanic support.',
        };
    }
    if (route === ROUTES.transfer) {
        const suite = GENERATION_SUITES['transfer-pair'];
        return {
            automaticGeneration: false,
            candidateMethods: suite.methods.map(compactMethod),
            candidateSuites: [{
                id: suite.id,
                methods: [...suite.methods],
                use: suite.use,
                defaultEvidenceRoles: suite.defaultEvidenceRoles,
            }],
            note: 'Topology composition is the materially different full-level construction source; random witness-first is the natural same-question comparator. Preserve blocks and evidence roles separately.',
        };
    }
    if (route === ROUTES.family) {
        return {
            automaticGeneration: false,
            candidateMethods: [],
            candidateSuites: [],
            note: 'Use family:generate on prospectively frozen parents. Descendants are a causal microscope and do not increase the independent support count.',
        };
    }
    if (route === ROUTES.human) {
        return {
            automaticGeneration: false,
            candidateMethods: [],
            candidateSuites: [],
            note: 'Use the human/editor controlled-contrast path when human-origin structure is required; do not substitute a procedural generator.',
        };
    }
    return {
        automaticGeneration: false,
        candidateMethods: [],
        candidateSuites: [],
        note: route === ROUTES.existing
            ? 'Reuse eligible existing evidence; generation is not earned merely because another source is convenient.'
            : 'No level generation is currently earned by this gate.',
    };
}
