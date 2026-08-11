// Shared pure path-feature primitives — the single source of truth for "how different are two
// solution paths?", used by BOTH the in-game display curation (hint-selection.ts) and the back-end
// hint-discovery acceptance gate (hint-novelty.ts). Keeping these here prevents the two from drifting
// to subtly different notions of edge/portal/crossing/order — a drift that would let discovery accept
// hints curation considers duplicates, or vice-versa.
import { UNPACK } from './cell-key.js';

/** navDensity at/above which a level is near-Hamiltonian (matches the solver's threshold). On such
 *  levels every solution covers almost the whole grid, so drawn *lines* are nearly identical and
 *  edge-overlap goes blind — but the *intersection locations* still vary, so crossing placement is
 *  folded into the distance there. Below this the (tiny, noisy) crossing set is ignored. */
export const NEAR_HAMILTONIAN_DENSITY = 0.82;
/** Floor a *non-zero* must-cross-order difference is lifted to, so a differing crossing order clears
 *  the distinctiveness floor and is seen as variety; graded above this by how scrambled the orders
 *  are (Kendall-tau). Only matters on levels with ≥2 must-cross squares; inert elsewhere. */
export const MUSTCROSS_ORDER_MIN = 0.66;

/** Per-path features for distinctiveness. `mcFirst`/`mcFull` are the level's must-cross squares in the
 *  order the path first enters / fully crosses them (empty when the level has <2 must-cross). */
export interface PathFeatures { edge: Set<string>; cross: Set<string>; len: number; mcFirst: number[]; mcFull: number[]; }

/** Exact-dedupe key for a path. */
export function pathSignature(path: number[]): string { return path.join(','); }

/** True when a→b is a drawn orthogonal step (portal jumps are non-adjacent, so they're not drawn). */
export function isDrawnStep(a: number, b: number): boolean {
    const pa = UNPACK(a), pb = UNPACK(b);
    return Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) === 1;
}

/** Canonical undirected key for a drawn edge, or null if a→b isn't a drawn step. */
export function drawnEdgeKey(a: number, b: number): string | null {
    if (!isDrawnStep(a, b)) return null;
    return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Drawn segments of a path (portal jumps excluded). */
export function edgeSet(path: number[]): Set<string> {
    const s = new Set<string>();
    for (let i = 1; i < path.length; i++) {
        const e = drawnEdgeKey(path[i - 1], path[i]);
        if (e) s.add(e);
    }
    return s;
}

/** Self-intersection cells: cells the path visits two or more times (where it crosses itself). */
export function crossingSet(path: number[]): Set<string> {
    const counts = new Map<number, number>();
    for (const k of path) counts.set(k, (counts.get(k) ?? 0) + 1);
    const s = new Set<string>();
    for (const [k, c] of counts) if (c >= 2) s.add(`${k}`);
    return s;
}

/** How a path uses portals: the sorted set of *directed* portal jumps (any non-adjacent consecutive
 *  step). Portals can't be reused, so this pins down which pairs, which combinations, and which
 *  entry/exit direction — independent of traversal order. '' = no portals. */
export function portalSignature(path: number[]): string {
    const jumps: string[] = [];
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i];
        if (!isDrawnStep(a, b)) jumps.push(`${a}>${b}`);
    }
    return jumps.sort().join(',');
}

/** The level's must-cross squares ordered by the path's first entry and by full crossing (2nd visit —
 *  the completing opposite-side entry). Separate axes: a level can pin the entry order yet vary which
 *  square completes first. */
export function mustCrossOrders(path: number[], mcKeys: number[]): { first: number[]; full: number[] } {
    const firstAt = new Map<number, number>(), fullAt = new Map<number, number>(), seen = new Map<number, number>();
    const mc = new Set(mcKeys);
    path.forEach((k, idx) => {
        if (!mc.has(k)) return;
        const c = (seen.get(k) ?? 0) + 1; seen.set(k, c);
        if (c === 1) firstAt.set(k, idx);
        else if (c === 2) fullAt.set(k, idx);
    });
    const order = (at: Map<number, number>) => [...at.keys()].sort((a, b) => at.get(a)! - at.get(b)!);
    return { first: order(firstAt), full: order(fullAt) };
}

/** Normalized Kendall-tau distance (fraction of discordant pairs) between two orderings of the same
 *  squares. Different membership (rare — a path missing a crossing) counts as maximally different. */
export function orderMismatch(a: number[], b: number[]): number {
    if (a.length !== b.length) return 1;
    const posB = new Map<number, number>(); b.forEach((k, i) => posB.set(k, i));
    let discordant = 0, total = 0;
    for (let i = 0; i < a.length; i++) {
        if (!posB.has(a[i])) return 1;
        for (let j = i + 1; j < a.length; j++) { total++; if (posB.get(a[i])! > posB.get(a[j])!) discordant++; }
    }
    return total === 0 ? 0 : discordant / total;
}

/** Distinctiveness contributed by *which order* the must-cross squares are used, over both the
 *  first-entry and full-crossing orderings. 0 when the orders match; otherwise lifted to at least
 *  MUSTCROSS_ORDER_MIN and graded up by how scrambled they are. */
export function orderDistance(a: PathFeatures, b: PathFeatures): number {
    const raw = Math.max(orderMismatch(a.mcFirst, b.mcFirst), orderMismatch(a.mcFull, b.mcFull));
    return raw === 0 ? 0 : MUSTCROSS_ORDER_MIN + (1 - MUSTCROSS_ORDER_MIN) * raw;
}

export function jaccardDistance(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const e of small) if (big.has(e)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : 1 - inter / union;
}

/** Build the feature bundle for a path. `mcKeys` are the level's must-cross cell keys (empty disables
 *  the order axis). */
export function buildPathFeatures(path: number[], mcKeys: number[] = []): PathFeatures {
    const mco = mcKeys.length ? mustCrossOrders(path, mcKeys) : { first: [], full: [] };
    return { edge: edgeSet(path), cross: crossingSet(path), len: path.length, mcFirst: mco.first, mcFull: mco.full };
}

/** Research/curation structural-family key. Unlike exact path identity, this deliberately ignores
 * local edge-level detours and groups paths that share portal usage, crossing placement, and both
 * established must-cross order axes. These are the same structural dimensions already used by
 * hint diversity; this is an equivalence key, not a learned cluster or proof of homotopy. */
export function structuralSolutionFamilySignature(path: number[], mcKeys: number[] = []): string {
    const features = buildPathFeatures(path, mcKeys);
    return JSON.stringify({
        portal: portalSignature(path),
        crossings: [...features.cross].sort(),
        mustCrossFirst: features.mcFirst,
        mustCrossFull: features.mcFull,
    });
}

/** Distance between two paths' features — the max of every applicable variety axis. Edges (the drawn
 *  line) are always in play. On near-Hamiltonian levels (`useCrossings`) crossing *placement* is folded
 *  in. On must-cross levels the *order* the squares are crossed is folded in. Each term is inert when
 *  it doesn't apply, so this reduces to edge distance on the common case. */
export function featureDistance(a: PathFeatures, b: PathFeatures, useCrossings: boolean): number {
    let d = jaccardDistance(a.edge, b.edge);
    if (useCrossings) d = Math.max(d, jaccardDistance(a.cross, b.cross));
    if (a.mcFirst.length || a.mcFull.length) d = Math.max(d, orderDistance(a, b));
    return d;
}
