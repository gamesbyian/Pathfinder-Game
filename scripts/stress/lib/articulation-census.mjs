// Exhaustive width-1 static-separator census: every articulation (cut) vertex in a free-space
// graph, and the sizes of the components it separates when removed. Standard Tarjan low-link,
// generalized to report ALL cut vertices (not just small pendant chambers) and to run over a
// possibly-disconnected graph. Plain recursion: board graphs here are small (<=225 cells; typical
// solver grid dimensions), well within default stack depth.
//
// For a non-root articulation vertex u, removing it separates the graph into each "down" child
// subtree whose low-link cannot reach above u, PLUS one merged "up" component (everything else in
// u's connected component). Both sides are reported.

export function computeArticulationCuts({ cellKeys, edges }) {
    const adj = new Map();
    for (const c of cellKeys) adj.set(c, []);
    for (const [a, b] of edges) {
        if (!adj.has(a) || !adj.has(b)) continue;
        adj.get(a).push(b);
        adj.get(b).push(a);
    }

    const disc = new Map(), low = new Map(), componentRoot = new Map();
    let timer = 0;
    const downCuts = new Map(); // cutVertex -> array of separated "down" component sizes

    // Returns the size of u's own DFS subtree (including u). `parent` is null only at a DFS root.
    function dfs(u, parent, root) {
        disc.set(u, timer); low.set(u, timer); timer++;
        componentRoot.set(u, root);
        let size = 1;
        const rootChildSizes = parent === null ? [] : null;

        for (const v of adj.get(u)) {
            if (v === parent) continue;
            if (disc.has(v)) { low.set(u, Math.min(low.get(u), disc.get(v))); continue; }

            const childSize = dfs(v, u, root);
            size += childSize;
            low.set(u, Math.min(low.get(u), low.get(v)));

            if (parent === null) {
                rootChildSizes.push(childSize);
            } else if (low.get(v) >= disc.get(u)) {
                if (!downCuts.has(u)) downCuts.set(u, []);
                downCuts.get(u).push(childSize);
            }
        }

        if (parent === null && rootChildSizes.length >= 2) downCuts.set(u, rootChildSizes);
        return size;
    }

    const componentSize = new Map(); // root -> total size of that connected component
    for (const c of cellKeys) {
        if (disc.has(c)) continue;
        componentSize.set(c, dfs(c, null, c));
    }

    const result = [];
    for (const [cutVertex, downSizes] of downCuts.entries()) {
        // A cut vertex that IS a component root has only its recorded child subtrees (no "up" side).
        const totalSize = componentSize.get(componentRoot.get(cutVertex));
        const sizes = [...downSizes];
        if (!componentSize.has(cutVertex)) {
            const upSize = totalSize - 1 - downSizes.reduce((a, b) => a + b, 0);
            if (upSize > 0) sizes.push(upSize);
        }
        result.push({ cutVertex, componentSizes: sizes.sort((a, b) => a - b) });
    }
    return result;
}
