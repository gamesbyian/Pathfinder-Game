import { buildAnswerabilityView } from './research-query-views-lib.mjs';

const key = ref => ref.type + ':' + ref.id;
const edgeKey = edge => [key(edge.from), edge.relation, key(edge.to)].join('|');

export function buildResearchQuerySnapshot(graph) {
    const answerability = buildAnswerabilityView(graph);
    const gates = [
        ...answerability.noSolverCompute,
        ...answerability.boundedCompute,
        ...answerability.dormantOrConditional,
        ...answerability.unclassified,
    ].map(row => ({
        workstreamId: row.workstreamId,
        questionRef: row.questionRef,
        executionState: row.executionState,
        gateClass: row.gateClass,
    })).sort((a, b) => String(a.workstreamId).localeCompare(String(b.workstreamId)));

    return {
        schemaVersion: 1,
        nodes: graph.nodes.map(node => ({ type: node.type, id: node.id }))
            .sort((a, b) => key(a).localeCompare(key(b))),
        edges: graph.edges.map(edge => ({
            from: edge.from,
            relation: edge.relation,
            to: edge.to,
            strength: edge.strength ?? 'authored',
        })).sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))),
        gates,
    };
}

export function diffResearchQuerySnapshots(before, after) {
    if (before?.schemaVersion !== 1 || after?.schemaVersion !== 1) {
        throw new Error('research query snapshot schemaVersion must be 1');
    }
    const beforeNodes = new Map(before.nodes.map(node => [key(node), node]));
    const afterNodes = new Map(after.nodes.map(node => [key(node), node]));
    const beforeEdges = new Map(before.edges.map(edge => [edgeKey(edge), edge]));
    const afterEdges = new Map(after.edges.map(edge => [edgeKey(edge), edge]));
    const beforeGates = new Map((before.gates ?? []).map(row => [String(row.workstreamId), row]));
    const afterGates = new Map((after.gates ?? []).map(row => [String(row.workstreamId), row]));

    const gateChanges = [];
    for (const [id, current] of afterGates) {
        const previous = beforeGates.get(id);
        if (!previous) {
            gateChanges.push({ workstreamId: current.workstreamId, before: null, after: current });
            continue;
        }
        if (previous.gateClass !== current.gateClass
            || previous.executionState !== current.executionState
            || previous.questionRef !== current.questionRef) {
            gateChanges.push({ workstreamId: current.workstreamId, before: previous, after: current });
        }
    }
    for (const [id, previous] of beforeGates) {
        if (!afterGates.has(id)) gateChanges.push({ workstreamId: previous.workstreamId, before: previous, after: null });
    }

    const noCompute = new Set(['existing-data', 'instrument-only', 'design', 'implementation']);
    return {
        schemaVersion: 1,
        addedNodes: [...afterNodes.entries()].filter(([id]) => !beforeNodes.has(id)).map(([, row]) => row),
        removedNodes: [...beforeNodes.entries()].filter(([id]) => !afterNodes.has(id)).map(([, row]) => row),
        addedEdges: [...afterEdges.entries()].filter(([id]) => !beforeEdges.has(id)).map(([, row]) => row),
        removedEdges: [...beforeEdges.entries()].filter(([id]) => !afterEdges.has(id)).map(([, row]) => row),
        gateChanges,
        newlyNoSolverCompute: gateChanges.filter(row =>
            row.after && noCompute.has(row.after.gateClass)
            && (!row.before || !noCompute.has(row.before.gateClass))),
        newlyBoundedCompute: gateChanges.filter(row =>
            row.after?.gateClass === 'bounded-compute' && row.before?.gateClass !== 'bounded-compute'),
    };
}
