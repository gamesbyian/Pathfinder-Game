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
    const text = textOf(question);
    if (/human|editor/u.test(text)) return 'human-origin';
    if (/cross[- ]source|distribution shift|transfer data|different source/u.test(text)) return 'cross-source-transfer';
    if (/controlled family|family neighborhood|family expansion|causal contrast|perturb|invariance/u.test(text)) return 'causal-contrast';
    if (/fresh independent parent|independent .*parent|independent .*population|shared-budget population|fresh .*population/u.test(text)) {
        return 'fresh-independent-parents';
    }
    if (/telemetry|work dose|workspent|economics|information cost|candidate construction|representation|exact semantics|observer|instrumentation/u.test(text)) {
        return 'telemetry-or-economics';
    }
    return 'representation-or-candidate';
}

export function chooseAcquisitionRoute({ question, eligibleBlocks = [], requestedNeed = '' } = {}) {
    if (!question?.id) throw new Error('question is required');
    if (eligibleBlocks.length) {
        return {
            route: ROUTES.existing,
            need: 'reuse-existing',
            rationale: `${eligibleBlocks.length} mechanically eligible existing research block(s) were supplied for this question`,
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
