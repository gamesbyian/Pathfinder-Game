/**
 * Pure Stage-A theorem helper for WS2-CUT-BALANCE-PROJECTION.
 *
 * The graph is an undirected multigraph of single-use transition resources. Parallel edges are
 * intentionally preserved: a cardinal adjacency and a portal jump between the same cells are two
 * resources, and collapsing them can manufacture a false bridge.
 */

function canonicalNode(value) {
    return String(value);
}

function buildGraph(nodes, edges) {
    const nodeIds = [...new Set((nodes ?? []).map(canonicalNode))].sort();
    const nodeSet = new Set(nodeIds);
    if (!nodeIds.length) throw new Error('bridge excursion graph requires at least one node');

    const adjacency = new Map(nodeIds.map(node => [node, []]));
    const edgeById = new Map();

    for (const [index, edge] of (edges ?? []).entries()) {
        if (!edge || edge.id == null || edge.a == null || edge.b == null) {
            throw new Error(`invalid edge at index ${index}`);
        }
        const id = String(edge.id);
        const a = canonicalNode(edge.a);
        const b = canonicalNode(edge.b);
        if (edgeById.has(id)) throw new Error(`duplicate edge id: ${id}`);
        if (!nodeSet.has(a) || !nodeSet.has(b)) {
            throw new Error(`edge ${id} references unknown node`);
        }
        const normalized = { id, a, b, kind: edge.kind ?? null };
        edgeById.set(id, normalized);
        adjacency.get(a).push({ edgeId: id, to: b });
        if (a !== b) adjacency.get(b).push({ edgeId: id, to: a });
    }

    for (const list of adjacency.values()) {
        list.sort((left, right) =>
            left.to.localeCompare(right.to) || left.edgeId.localeCompare(right.edgeId));
    }
    return { nodeIds, nodeSet, adjacency, edgeById };
}

function reachableFrom(start, adjacency, excludedEdgeId = null) {
    const seen = new Set([start]);
    const queue = [start];
    for (let head = 0; head < queue.length; head++) {
        const node = queue[head];
        for (const edge of adjacency.get(node) ?? []) {
            if (edge.edgeId === excludedEdgeId || seen.has(edge.to)) continue;
            seen.add(edge.to);
            queue.push(edge.to);
        }
    }
    return seen;
}

export function findMultigraphBridges(nodes, edges) {
    const { nodeIds, adjacency, edgeById } = buildGraph(nodes, edges);
    const discovery = new Map();
    const low = new Map();
    const bridges = new Set();
    let time = 0;

    const visit = (node, parentEdgeId = null) => {
        discovery.set(node, time);
        low.set(node, time);
        time++;

        for (const edge of adjacency.get(node)) {
            if (edge.edgeId === parentEdgeId) continue;
            if (discovery.has(edge.to)) {
                low.set(node, Math.min(low.get(node), discovery.get(edge.to)));
                continue;
            }
            visit(edge.to, edge.edgeId);
            low.set(node, Math.min(low.get(node), low.get(edge.to)));
            if (low.get(edge.to) > discovery.get(node)) bridges.add(edge.edgeId);
        }
    };

    for (const node of nodeIds) if (!discovery.has(node)) visit(node);

    return [...bridges]
        .map(id => edgeById.get(id))
        .sort((a, b) => a.id.localeCompare(b.id));
}

export function findBridgeExcursionConflicts({
    nodes,
    edges,
    current,
    goal,
    pendingMandatory = [],
} = {}) {
    const graph = buildGraph(nodes, edges);
    const currentId = canonicalNode(current);
    const goalId = canonicalNode(goal);
    const pendingIds = [...new Set((pendingMandatory ?? []).map(canonicalNode))].sort();

    if (!graph.nodeSet.has(currentId)) throw new Error('current node is not in graph');
    if (!graph.nodeSet.has(goalId)) throw new Error('goal node is not in graph');
    for (const id of pendingIds) {
        if (!graph.nodeSet.has(id)) throw new Error(`pending node is not in graph: ${id}`);
    }

    const ordinaryReach = reachableFrom(currentId, graph.adjacency);
    const unreachable = [goalId, ...pendingIds].filter(id => !ordinaryReach.has(id));
    if (unreachable.length) {
        return {
            eligible: false,
            reason: 'ordinary-connectivity-fails',
            unreachableIds: [...new Set(unreachable)].sort(),
            bridges: [],
            conflicts: [],
        };
    }

    const bridges = findMultigraphBridges(graph.nodeIds, [...graph.edgeById.values()]);
    const conflicts = [];
    for (const bridge of bridges) {
        const currentSide = reachableFrom(currentId, graph.adjacency, bridge.id);
        if (!currentSide.has(goalId)) continue;
        const farPendingIds = pendingIds.filter(id => !currentSide.has(id));
        if (!farPendingIds.length) continue;
        conflicts.push({
            edgeId: bridge.id,
            edgeKind: bridge.kind,
            a: bridge.a,
            b: bridge.b,
            farPendingIds,
            currentSideSize: currentSide.size,
            farSideSize: graph.nodeIds.length - currentSide.size,
        });
    }

    return {
        eligible: true,
        reason: null,
        unreachableIds: [],
        bridges: bridges.map(edge => ({
            edgeId: edge.id,
            edgeKind: edge.kind,
            a: edge.a,
            b: edge.b,
        })),
        conflicts,
    };
}
