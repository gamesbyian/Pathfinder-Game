// Generic minimum vertex cut between a source set and one target cell, via node-split max-flow
// (Menger's theorem: on an undirected graph, min vertex cut size == max number of internally
// vertex-disjoint source->target paths). Used by the separator/decomposition census to measure
// "smallest useful separator/interface width" generically, without any level-specific assumption.
//
// Board graphs here are tiny (<=225 cells typically), so a plain BFS-augmenting-path (Edmonds-Karp)
// max-flow is simple, obviously correct, and fast enough — no need for Dinic/blocking flows.

const INF = Infinity;

/** Build a directed capacitated graph for vertex-split max-flow.
 *  `cellKeys`: iterable of raw cell identities (any distinct value, e.g. packed grid key).
 *  `edges`: iterable of [a, b] undirected pairs between cell identities.
 *  `sources`, `target`: subsets/one of cellKeys.
 *  Cell c splits into `${c}_in` -> `${c}_out` (capacity 1, or INF if c is a source or the target,
 *  since a source/target vertex is never itself part of the cut). Undirected edge (a,b) becomes
 *  a_out->b_in and b_out->a_in, both capacity INF (the vertex caps are the only bottleneck).
 */
function buildGraph(cellKeys, edges, sources, target) {
    const sourceSet = new Set(sources);
    const cap = new Map(); // `${u}|${v}` -> capacity remaining
    const adj = new Map(); // u -> Set(v) (both forward and reverse arcs, for residual traversal)

    const addArc = (u, v, c) => {
        const k = `${u}|${v}`;
        cap.set(k, (cap.get(k) || 0) + c);
        if (!adj.has(u)) adj.set(u, new Set());
        if (!adj.has(v)) adj.set(v, new Set());
        adj.get(u).add(v);
        adj.get(v).add(u); // ensure reverse arc exists in adjacency (capacity may be 0)
        const rk = `${v}|${u}`;
        if (!cap.has(rk)) cap.set(rk, 0);
    };

    for (const c of cellKeys) {
        const cIn = `${c}_in`, cOut = `${c}_out`;
        addArc(cIn, cOut, (sourceSet.has(c) || c === target) ? INF : 1);
    }
    for (const [a, b] of edges) {
        addArc(`${a}_out`, `${b}_in`, INF);
        addArc(`${b}_out`, `${a}_in`, INF);
    }
    return { cap, adj };
}

function bfsAugment(adj, cap, s, t) {
    const parent = new Map([[s, null]]);
    const queue = [s];
    for (let qi = 0; qi < queue.length; qi++) {
        const u = queue[qi];
        if (u === t) break;
        for (const v of (adj.get(u) || [])) {
            if (parent.has(v)) continue;
            if ((cap.get(`${u}|${v}`) || 0) <= 0) continue;
            parent.set(v, u);
            queue.push(v);
        }
    }
    if (!parent.has(t)) return null;
    const path = [];
    let cur = t;
    while (cur !== null) { path.push(cur); cur = parent.get(cur); }
    path.reverse();
    return path;
}

/** Returns { width, cutCells, reachableSide, otherSide } — `width` is the min vertex cut size
 *  (Infinity if target unreachable through any capacity-1 route, i.e. sources/target disconnected
 *  even ignoring vertex caps). `cutCells` are the raw cell identities removed to disconnect.
 *  `reachableSide` are free cells (excluding the cut) still reachable from sources after removing
 *  the cut; `otherSide` is every other in-graph free cell (may include disconnected pockets). */
export function minVertexCut({ cellKeys, edges, sources, target, capBudget = 64 }) {
    const cells = [...new Set(cellKeys)];
    const cellSet = new Set(cells);
    if (!cellSet.has(target)) return { width: Infinity, cutCells: [], reachableSide: [], otherSide: [] };
    const srcList = [...new Set(sources)].filter((s) => cellSet.has(s));
    if (srcList.length === 0) return { width: Infinity, cutCells: [], reachableSide: [], otherSide: [] };

    // A source directly adjacent to the target can never be disconnected by removing OTHER
    // vertices (the direct edge has no vertex to cut) — the true min vertex cut is undefined/
    // infinite. Detect this up front rather than looping the flow search to the cap budget.
    for (const [a, b] of edges) {
        if ((a === target && srcList.includes(b)) || (b === target && srcList.includes(a))) {
            return { width: Infinity, cutCells: [], reachableSide: [], otherSide: [], directlyAdjacent: true };
        }
    }

    const SUPER = '__super_source__';
    const { cap, adj } = buildGraph(cells, edges, srcList, target);
    adj.set(SUPER, new Set(srcList.map((s) => `${s}_in`)));
    for (const s of srcList) {
        cap.set(`${SUPER}|${s}_in`, INF);
        cap.set(`${s}_in|${SUPER}`, 0);
        adj.get(`${s}_in`).add(SUPER);
    }
    const sinkNode = `${target}_out`;

    let flow = 0;
    for (; flow <= capBudget; flow++) {
        const path = bfsAugment(adj, cap, SUPER, sinkNode);
        if (!path) break;
        for (let i = 0; i + 1 < path.length; i++) {
            const u = path[i], v = path[i + 1];
            cap.set(`${u}|${v}`, (cap.get(`${u}|${v}`) || 0) - 1);
            cap.set(`${v}|${u}`, (cap.get(`${v}|${u}`) || 0) + 1);
        }
    }
    if (flow > capBudget) return { width: Infinity, cutCells: [], reachableSide: [], otherSide: [], truncated: true };

    // Residual reachability from SUPER identifies the cut: any cell whose in->out arc is saturated
    // (in reachable, out not) is in the min cut.
    const reach = new Set([SUPER]);
    const queue = [SUPER];
    for (let qi = 0; qi < queue.length; qi++) {
        const u = queue[qi];
        for (const v of (adj.get(u) || [])) {
            if (reach.has(v)) continue;
            if ((cap.get(`${u}|${v}`) || 0) <= 0) continue;
            reach.add(v); queue.push(v);
        }
    }
    const cutCells = [];
    for (const c of cells) {
        if (c === target || srcList.includes(c)) continue;
        if (reach.has(`${c}_in`) && !reach.has(`${c}_out`)) cutCells.push(c);
    }

    const cutSet = new Set(cutCells);
    const reachableSide = [];
    const otherSide = [];
    for (const c of cells) {
        if (cutSet.has(c)) continue;
        if (reach.has(`${c}_in`) || reach.has(`${c}_out`)) reachableSide.push(c);
        else otherSide.push(c);
    }

    return { width: flow, cutCells, reachableSide, otherSide };
}
