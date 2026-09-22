import { researchQuestionLifecycleClass } from './research-question-relations-lib.mjs';

const nodeKey = node => node.type + ':' + node.id;
const refKey = ref => ref.type + ':' + ref.id;

function nodeMap(graph) {
    return new Map(graph.nodes.map(node => [nodeKey(node), node]));
}

function edgesFrom(graph, type, id, relation = null) {
    return graph.edges.filter(edge =>
        edge.from.type === type && edge.from.id === id && (!relation || edge.relation === relation));
}

function edgesTo(graph, type, id, relation = null) {
    return graph.edges.filter(edge =>
        edge.to.type === type && edge.to.id === id && (!relation || edge.relation === relation));
}

function resolveUniqueEntity(graph, selector, viewName) {
    const raw = String(selector ?? '').trim();
    if (!raw) throw new Error(viewName + ' requires --entity=<type:id>');
    const exact = graph.nodes.filter(node => nodeKey(node) === raw);
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) throw new Error('duplicate typed research entity: ' + raw);
    const bare = graph.nodes.filter(node => node.id === raw);
    if (bare.length === 1) return bare[0];
    if (bare.length > 1) {
        throw new Error('ambiguous research entity ' + raw + '; use <type:id>');
    }
    throw new Error('unknown research entity for ' + viewName + ': ' + raw);
}

function questionLifecycle(node) {
    return researchQuestionLifecycleClass(String(node?.row?.state ?? '').toLowerCase());
}

function isLiveQuestion(node) {
    return ['active', 'mixed', 'deferred'].includes(questionLifecycle(node));
}

function isTerminalQuestion(node) {
    return ['closed', 'concluded'].includes(questionLifecycle(node));
}

export function buildAnswerabilityView(graph) {
    const queues = graph.nodes.filter(node => node.type === 'queue');
    const buckets = {
        noFreshSolverExecution: [],
        instrumentOnly: [],
        boundedCompute: [],
        dormantOrConditional: [],
        unclassified: [],
    };
    const noFreshExecution = new Set(['existing-data', 'design', 'implementation']);
    const dormant = new Set(['blocked', 'reopen-only', 'method', 'subsumed', 'service']);

    for (const node of queues) {
        const gateClass = node.row?.gateClass ?? null;
        const item = {
            workstreamId: node.row?.workstreamId ?? null,
            topicId: node.id,
            questionRef: node.row?.questionRef ?? null,
            executionState: node.row?.executionState ?? null,
            gateClass,
            gate: node.row?.remainingGate ?? null,
            context: node.row?.state ?? null,
        };
        if (gateClass === 'bounded-compute') buckets.boundedCompute.push(item);
        else if (gateClass === 'instrument-only') buckets.instrumentOnly.push(item);
        else if (noFreshExecution.has(gateClass)) buckets.noFreshSolverExecution.push(item);
        else if (dormant.has(gateClass)) buckets.dormantOrConditional.push(item);
        else buckets.unclassified.push(item);
    }

    return {
        view: 'answerability',
        semantics: {
            noFreshSolverExecution: 'The immediate canonical workstream gate can advance without fresh solver/reference execution.',
            instrumentOnly: 'The immediate gate requires new production-inert observation/instrumentation. This may require fresh solver execution even though it is not treatment acquisition.',
            boundedCompute: 'The immediate canonical workstream gate explicitly requires fresh solver/reference execution for the scientific discriminator.',
            dormantOrConditional: 'No ordinary execution gate is currently active; the lane is blocked, conditional, methodological, subsumed, reopen-only, or service-like.',
            unclassified: 'The workstream has no authored gate class. Do not infer one from prose.',
        },
        ...buckets,
    };
}

export function buildDependencyImpactView(graph, selector) {
    const nodes = nodeMap(graph);
    const target = resolveUniqueEntity(graph, selector, 'impact view');
    const impacted = new Map();

    const record = (questionRef, path, reason) => {
        const question = nodes.get(refKey(questionRef));
        if (!question || question.type !== 'questions') return;
        const key = nodeKey(question);
        const existing = impacted.get(key) ?? {
            questionId: question.id,
            lifecycle: questionLifecycle(question),
            state: question.row?.state ?? null,
            paths: [],
        };
        existing.paths.push({ reason, path });
        impacted.set(key, existing);
    };

    if (target.type === 'repositoryRefs') {
        for (const edge of edgesTo(graph, target.type, target.id)) {
            if (edge.from.type === 'questions' && ['answeredBy', 'constrainedBy'].includes(edge.relation)) {
                record(edge.from, [edge], edge.relation);
            }
            if (edge.from.type === 'evidence' && ['report', 'sourceArtifact'].includes(edge.relation)) {
                for (const qEdge of edgesFrom(graph, 'evidence', edge.from.id, 'question')) {
                    record(qEdge.to, [edge, qEdge], 'evidence-' + edge.relation);
                }
            }
            if (edge.from.type === 'capabilityDemands' && edge.relation === 'evidenceRef') {
                for (const qEdge of edgesFrom(graph, 'capabilityDemands', edge.from.id, 'question')) {
                    record(qEdge.to, [edge, qEdge], 'capability-demand-evidence');
                }
            }
        }
    }

    if (target.type === 'premises') {
        for (const edge of edgesTo(graph, target.type, target.id, 'premise')) {
            if (edge.from.type === 'questions') record(edge.from, [edge], 'question-premise');
            if (edge.from.type === 'evidence') {
                for (const qEdge of edgesFrom(graph, 'evidence', edge.from.id, 'question')) {
                    record(qEdge.to, [edge, qEdge], 'evidence-premise');
                }
            }
            if (edge.from.type === 'measurementOpportunities') {
                for (const qEdge of edgesTo(graph, 'measurementOpportunities', edge.from.id, 'measurementOpportunity')) {
                    if (qEdge.from.type === 'questions') {
                        record(qEdge.from, [edge, qEdge], 'premise-measurement-opportunity-question');
                    }
                }
            }
        }
    }

    if (target.type === 'measurementOpportunities') {
        for (const edge of edgesTo(graph, target.type, target.id, 'measurementOpportunity')) {
            if (edge.from.type === 'questions') record(edge.from, [edge], 'question-measurement-opportunity');
            if (edge.from.type === 'evidence') {
                for (const qEdge of edgesFrom(graph, 'evidence', edge.from.id, 'question')) {
                    record(qEdge.to, [edge, qEdge], 'evidence-measurement-opportunity');
                }
            }
        }
    }

    if (target.type === 'questions') {
        record({ type: 'questions', id: target.id }, [], 'self');
        for (const edge of edgesTo(graph, 'questions', target.id)) {
            if (edge.from.type === 'questions') record(edge.from, [edge], 'question-' + edge.relation);
        }
    }

    return {
        view: 'impact',
        target: { type: target.type, id: target.id },
        impactedQuestions: [...impacted.values()].sort((a, b) => a.questionId.localeCompare(b.questionId)),
        interpretation: 'Potential dependency/support impact only. Removing an input does not automatically invalidate a conclusion; inspect the authored path and scientific redundancy.',
    };
}

export function buildLiveSuccessorsView(graph) {
    const nodes = nodeMap(graph);
    const rows = [];
    for (const evidence of graph.nodes.filter(node => node.type === 'evidence')) {
        const successors = edgesFrom(graph, 'evidence', evidence.id, 'successorQuestion')
            .map(edge => nodes.get(refKey(edge.to))).filter(Boolean).filter(isLiveQuestion);
        if (!successors.length) continue;
        rows.push({
            evidenceId: evidence.id,
            report: evidence.row?.latestEvidence?.report ?? null,
            status: evidence.row?.status ?? null,
            liveSuccessors: successors.map(node => ({
                questionId: node.id,
                state: node.row?.state ?? null,
                lifecycle: questionLifecycle(node),
            })),
        });
    }
    return { view: 'live-successors', rows };
}

export function buildClosedConstraintsView(graph) {
    const nodes = nodeMap(graph);
    const rows = [];
    for (const edge of graph.edges.filter(edge =>
        edge.from.type === 'questions' && edge.to.type === 'questions' && edge.relation === 'constrainedBy')) {
        const dependent = nodes.get(refKey(edge.from));
        const constraint = nodes.get(refKey(edge.to));
        if (!dependent || !constraint || !isLiveQuestion(dependent) || !isTerminalQuestion(constraint)) continue;
        rows.push({
            closedQuestionId: constraint.id,
            closedState: constraint.row?.state ?? null,
            dependentQuestionId: dependent.id,
            dependentState: dependent.row?.state ?? null,
        });
    }
    return { view: 'closed-constraints', rows };
}

export function buildSharedMeasurementView(graph, minimumConsumers = 2) {
    const rows = [];
    for (const mo of graph.nodes.filter(node => node.type === 'measurementOpportunities')) {
        const consumers = edgesTo(graph, 'measurementOpportunities', mo.id, 'measurementOpportunity')
            .filter(edge => edge.from.type === 'questions')
            .map(edge => edge.from.id);
        if (consumers.length < minimumConsumers) continue;
        rows.push({
            measurementOpportunityId: mo.id,
            consumerCount: consumers.length,
            questionIds: [...new Set(consumers)].sort(),
        });
    }
    return { view: 'shared-measurements', minimumConsumers, rows };
}

export function buildConsumptionView(graph, minimumQuestionConsumers = 2) {
    const rows = [];
    for (const block of graph.nodes.filter(node => node.type === 'researchBlocks')) {
        const consumers = edgesFrom(graph, 'researchBlocks', block.id, 'consumedByQuestion')
            .map(edge => edge.to.id);
        if (new Set(consumers).size < minimumQuestionConsumers) continue;
        rows.push({
            blockId: block.id,
            consumerCount: new Set(consumers).size,
            questionIds: [...new Set(consumers)].sort(),
        });
    }
    return { view: 'multi-consumed-blocks', minimumQuestionConsumers, rows };
}

export function buildSupportImpactView(graph, selector) {
    const target = resolveUniqueEntity(graph, selector, 'support-impact');
    if (target.type !== 'repositoryRefs') {
        throw new Error('support-impact requires a repositoryRefs entity');
    }

    const rows = [];
    for (const question of graph.nodes.filter(node => node.type === 'questions')) {
        const support = question.row?.decisionSupport ?? null;
        const answeredBy = new Set(question.row?.answeredBy ?? []);
        const supportRefs = new Set(support?.refs ?? []);
        if (!answeredBy.has(target.id) && !supportRefs.has(target.id)) continue;

        let disposition = 'unknown';
        let rationale = 'The source appears in the evidence trail, but this question does not author decision-support sufficiency semantics.';
        if (supportRefs.has(target.id) && support?.mode === 'all') {
            disposition = 'necessary';
            rationale = 'The current disposition explicitly requires all authored decision-support refs.';
        } else if (supportRefs.has(target.id) && support?.mode === 'any') {
            disposition = support.refs.length === 1 ? 'necessary' : 'redundant-alternative';
            rationale = support.refs.length === 1
                ? 'This is the only authored independently sufficient support ref.'
                : 'Another authored decision-support ref is declared independently sufficient.';
        }

        rows.push({
            questionId: question.id,
            state: question.row?.state ?? null,
            supportMode: support?.mode ?? null,
            supportRefs: support?.refs ?? [],
            disposition,
            rationale,
        });
    }

    return {
        view: 'support-impact',
        target: target.id,
        rows: rows.sort((a, b) => a.questionId.localeCompare(b.questionId)),
        interpretation: 'Only authored decisionSupport semantics can establish necessity or redundancy. answeredBy alone remains an evidence trail.',
    };
}

export function buildNonQuestionLineageView(graph) {
    const rows = [];
    for (const evidence of graph.nodes.filter(node => node.type === 'evidence')) {
        const questionEdges = edgesFrom(graph, 'evidence', evidence.id, 'question');
        if (questionEdges.length) continue;
        const successorQuestions = edgesFrom(graph, 'evidence', evidence.id, 'successorQuestion')
            .map(edge => edge.to.id);
        const successorArtifacts = edgesFrom(graph, 'evidence', evidence.id, 'successorArtifact')
            .map(edge => edge.to.id);
        if (!successorQuestions.length && !successorArtifacts.length) continue;
        rows.push({
            evidenceId: evidence.id,
            report: evidence.row?.latestEvidence?.report ?? null,
            status: evidence.row?.status ?? null,
            title: evidence.row?.title ?? null,
            inferenceScope: evidence.row?.inferenceScope ?? null,
            successorQuestions,
            successorArtifacts,
        });
    }
    return {
        view: 'non-question-lineage',
        rows,
        interpretation: 'Structured closeouts with authored successor edges but no solver-question ownership. This covers report-level research-system lineage without inventing stable identities for individual architecture findings inside a report.',
    };
}

export function buildOwnershipGapsView(graph) {
    const capabilityDemands = graph.nodes.filter(node => node.type === 'capabilityDemands')
        .filter(node => !edgesFrom(graph, 'capabilityDemands', node.id, 'question').length)
        .map(node => ({
            id: node.id,
            evidenceRefs: edgesFrom(graph, 'capabilityDemands', node.id, 'evidenceRef').map(edge => edge.to.id),
        }));

    return {
        view: 'ownership-gaps',
        capabilityDemandsWithoutQuestion: capabilityDemands,
        experimentsWithoutStableQuestionRef: graph.diagnostics?.shapeDebt?.experimentsWithoutStableQuestionRef ?? [],
        evidenceWithoutQuestionRef: graph.diagnostics?.shapeDebt?.evidenceWithoutQuestionRef ?? [],
        queueWithoutQuestionRef: graph.diagnostics?.shapeDebt?.queueWithoutQuestionRef ?? [],
        acquisitionNeedLexicalFallbackQuestions:
            graph.diagnostics?.shapeDebt?.acquisitionNeedLexicalFallbackQuestions ?? [],
    };
}

export function buildQueryabilityCoverageView(graph) {
    const relationCounts = {};
    for (const edge of graph.edges) relationCounts[edge.relation] = (relationCounts[edge.relation] ?? 0) + 1;
    const nodeCounts = {};
    for (const node of graph.nodes) nodeCounts[node.type] = (nodeCounts[node.type] ?? 0) + 1;

    const answerability = buildAnswerabilityView(graph);
    const ownership = buildOwnershipGapsView(graph);
    return {
        view: 'coverage',
        nodeCounts,
        relationCounts,
        orphanCounts: graph.diagnostics?.orphanCounts ?? {},
        unresolvedEdges: graph.diagnostics?.unresolvedEdges ?? [],
        structuredGateCoverage: {
            classified: answerability.noFreshSolverExecution.length + answerability.instrumentOnly.length
                + answerability.boundedCompute.length + answerability.dormantOrConditional.length,
            unclassified: answerability.unclassified.length,
        },
        provenanceGaps: ownership,
    };
}

export function buildResearchQueryView(graph, { view, entity = '', minimum = 2 } = {}) {
    const threshold = Number(minimum);
    if (['shared-measurements', 'multi-consumed-blocks'].includes(view)
        && (!Number.isInteger(threshold) || threshold < 1)) {
        throw new Error('minimum must be a positive integer for ' + view);
    }
    switch (view) {
        case 'answerability': return buildAnswerabilityView(graph);
        case 'impact': return buildDependencyImpactView(graph, entity);
        case 'live-successors': return buildLiveSuccessorsView(graph);
        case 'closed-constraints': return buildClosedConstraintsView(graph);
        case 'shared-measurements': return buildSharedMeasurementView(graph, threshold);
        case 'multi-consumed-blocks': return buildConsumptionView(graph, threshold);
        case 'ownership-gaps': return buildOwnershipGapsView(graph);
        case 'non-question-lineage': return buildNonQuestionLineageView(graph);
        case 'support-impact': return buildSupportImpactView(graph, entity);
        case 'coverage': return buildQueryabilityCoverageView(graph);
        default: throw new Error('unknown research query view: ' + view);
    }
}
