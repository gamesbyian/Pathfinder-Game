// Curated hint-display selection (pure). The in-game hint system stores every discovered solution
// path, but showing all of them (some levels have hundreds) overwhelms the player. This picks a
// small, mutually-distinct subset to cycle through — "a few clearly different approaches" — and
// reports whether the hidden remainder is merely similar variations (so the UI can say so).
//
// Distinctiveness = edge-set Jaccard distance: the overlap of *drawn segments* between two paths
// (0 = identical drawn line, 1 = no shared segment). Selection is farthest-point (max–min): each
// pick is placed as far as possible from everything already chosen, stopping once nothing left is
// FLOOR-distinct (early-stop), capped at CAP. Display order interleaves gates so cycling alternates.
//
// COVERAGE GUARANTEE (takes precedence over the cap): the solutions are first partitioned into cells
// keyed by (gate, portal-usage-signature), and one representative of every cell is always shown. So
// the player always sees at least one hint from each viable gate, and — per gate — at least one of
// every distinct way the portals can be used or not (each pair, each combination of pairs, each
// entry/exit direction). Only when a level has more such cells than CAP is the cap exceeded, and only
// by the overflow (in the current corpus this happens on exactly one level). Everything above CAP that
// is *not* mandatory coverage is dropped by distinctiveness as before.
//
// On near-Hamiltonian levels (navDensity ≥ NEAR_HAMILTONIAN_DENSITY) every solution covers almost the
// whole grid, so drawn lines are nearly identical and edge-distance goes blind — yet the *intersection
// locations* still vary. There we fold self-crossing placement into the distance (see featureDistance).
// Likewise on must-cross levels the *order* the squares are crossed is a variety axis the drawn line
// and crossing-set can both miss (the same squares are crossed either way), so it too is folded in.
//
// NOTE: this only filters what the player *cycles through*. The heat-map is built from the full path
// list elsewhere and is intentionally unaffected.
import { UNPACK } from './cell-key.js';

export interface HintDisplaySelection {
    /** indices into the full path list, in display (gate-interleaved) order */
    indices: number[];
    /** true when hints exist beyond those shown AND all of them merely resemble the shown set */
    moreButSimilar: boolean;
}

/** Calibrated against the level corpus (see scripts/analyze-hint-selection.mjs): 0.65 = "genuinely
 *  different line", cap 15 keeps the richest levels from overwhelming while showing full variety on most. */
const DEFAULT_FLOOR = 0.65;
const DEFAULT_CAP = 15;
/** navDensity at/above which a level is near-Hamiltonian (matches the solver's threshold). On such
 *  levels every solution covers almost the whole grid, so their drawn *lines* are nearly identical
 *  and edge-overlap goes blind — but the *intersection locations* still vary. There we fold crossing
 *  placement into the distance so that variety is seen. Below this, edges are discriminative and the
 *  (tiny, noisy) crossing set is ignored to avoid over-counting. */
const NEAR_HAMILTONIAN_DENSITY = 0.82;
/** Floor that any *non-zero* must-cross-order difference is lifted to, so a differing crossing order
 *  clears DEFAULT_FLOOR and gets surfaced (just above 0.65); the actual value is graded above this by
 *  how different the orders are (Kendall-tau), so the most-different orders still rank first. Only
 *  matters on levels with ≥2 must-cross squares; inert everywhere else. */
const MUSTCROSS_ORDER_MIN = 0.66;

/** Per-path features for distinctiveness. `mcFirst`/`mcFull` are the level's must-cross squares in
 *  the order the path first enters / fully crosses them (empty when the level has <2 must-cross). */
interface PathFeatures { edge: Set<string>; cross: Set<string>; len: number; mcFirst: number[]; mcFull: number[]; }

/** Drawn segments of a path: "min-max" of orthogonally-adjacent consecutive cells (portal jumps
 *  aren't drawn edges, so they're skipped). */
function edgeSet(path: number[]): Set<string> {
    const s = new Set<string>();
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], pa = UNPACK(a), pb = UNPACK(b);
        if (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) !== 1) continue;
        s.add(a < b ? `${a}-${b}` : `${b}-${a}`);
    }
    return s;
}

/** Self-intersection cells: cells the path visits two or more times (where it crosses itself). */
function crossingSet(path: number[]): Set<string> {
    const counts = new Map<number, number>();
    for (const k of path) counts.set(k, (counts.get(k) ?? 0) + 1);
    const s = new Set<string>();
    for (const [k, c] of counts) if (c >= 2) s.add(`${k}`);
    return s;
}

/** How a path uses portals: the sorted set of *directed* portal jumps it takes. A jump is any
 *  consecutive pair that isn't an orthogonal step (portals teleport, so entrance→exit isn't a drawn
 *  edge). Portals can't be reused, so each pair appears at most once; the sorted set therefore
 *  identifies exactly which pairs are used, in which entry/exit direction — independent of traversal
 *  order. '' = no portals. This is the key that guarantees portal-usage variety in curation. */
function portalSignature(path: number[]): string {
    const jumps: string[] = [];
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], pa = UNPACK(a), pb = UNPACK(b);
        if (Math.abs(pa.x - pb.x) + Math.abs(pa.y - pb.y) !== 1) jumps.push(`${a}>${b}`);
    }
    return jumps.sort().join(',');
}

/** The level's must-cross squares ordered by the path's first entry and by full crossing (2nd visit —
 *  the completing opposite-side entry). These are separate variety axes: a level can pin the entry
 *  order yet vary which square is completed first. Returns parallel key lists (only squares the path
 *  actually crosses; for a winning path that's all of them). */
function mustCrossOrders(path: number[], mcKeys: number[]): { first: number[]; full: number[] } {
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
function orderMismatch(a: number[], b: number[]): number {
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
function orderDistance(a: PathFeatures, b: PathFeatures): number {
    const raw = Math.max(orderMismatch(a.mcFirst, b.mcFirst), orderMismatch(a.mcFull, b.mcFull));
    return raw === 0 ? 0 : MUSTCROSS_ORDER_MIN + (1 - MUSTCROSS_ORDER_MIN) * raw;
}

function jaccardDistance(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const e of small) if (big.has(e)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : 1 - inter / union;
}

/** Distance between two paths' features — the max of every applicable variety axis. Edges (the drawn
 *  line) are always in play. On near-Hamiltonian levels the lines are nearly identical, so we also
 *  fold in crossing *placement* (which cells self-intersect). And on must-cross levels we fold in the
 *  *order* the squares are crossed — a distinct axis the line and crossing-set can both miss (the same
 *  squares are crossed either way). Each term is 0/inert when it doesn't apply, so this reduces to
 *  edge-distance on the common case. */
function featureDistance(a: PathFeatures, b: PathFeatures, useCrossings: boolean): number {
    let d = jaccardDistance(a.edge, b.edge);
    if (useCrossings) d = Math.max(d, jaccardDistance(a.cross, b.cross));
    if (a.mcFirst.length || a.mcFull.length) d = Math.max(d, orderDistance(a, b));
    return d;
}

/** Coverage-guaranteed farthest-point selection. `required` (one representative per coverage cell —
 *  see selectDisplayHints) is always included, even where its members resemble each other, so every
 *  gate and every distinct portal-usage is shown. Remaining budget up to `cap` is filled max–min by
 *  distinctiveness, early-stopping once nothing left is FLOOR-distinct from the chosen set. `cap` is
 *  only exceeded when `required` itself does (more mandatory cells than the cap). Returns the chosen
 *  indices (coverage reps first, then diversity picks) and whether every hidden path merely resembles
 *  the shown set. */
function coverageSelect(
    feats: PathFeatures[], useCrossings: boolean, required: number[], floor: number, cap: number,
): { chosen: number[]; moreButSimilar: boolean } {
    const n = feats.length;
    const inChosen = new Array<boolean>(n).fill(false);
    const minDist = new Array<number>(n).fill(Infinity); // min distance to the chosen set (∞ until first pick)
    const chosen: number[] = [];
    const pick = (i: number) => {
        inChosen[i] = true; chosen.push(i); minDist[i] = -1;
        for (let j = 0; j < n; j++) if (!inChosen[j]) minDist[j] = Math.min(minDist[j], featureDistance(feats[i], feats[j], useCrossings));
    };
    // Mandatory coverage reps first (longest — richest — within each cell was chosen upstream); order
    // them longest-first so the display seed is the most drawn.
    for (const i of [...required].sort((a, b) => feats[b].len - feats[a].len)) if (!inChosen[i]) pick(i);
    // Diversity fill: keep adding the most-distinct remaining until the cap, stopping below the floor.
    while (chosen.length < cap) {
        let best = -1, bestD = -1;
        for (let i = 0; i < n; i++) if (!inChosen[i] && minDist[i] > bestD) { bestD = minDist[i]; best = i; }
        if (best === -1 || bestD < floor) break;
        pick(best);
    }
    // "More but similar" iff something is hidden AND the most-distinct hidden path is still below the
    // floor (so all hidden ones merely resemble the shown set — not distinct ones dropped by the cap).
    let maxHidden = -1;
    for (let i = 0; i < n; i++) if (!inChosen[i] && minDist[i] > maxHidden) maxHidden = minDist[i];
    return { chosen, moreButSimilar: chosen.length < n && maxHidden < floor };
}

/** Memo keyed by pathList identity; entry validated against the opts it was computed for, since the
 *  same array can be queried at different navDensity / must-cross context (edge-only vs augmented). */
const _memo = new WeakMap<number[][], { floor: number; cap: number; useCrossings: boolean; mcKey: string; result: HintDisplaySelection }>();

/** Select the curated subset of `pathList` to display, plus the "more-but-similar" flag. Memoized
 *  by `pathList` identity for the default floor/cap and the resolved crossing/must-cross context, so
 *  repeated cycle re-requests are O(1). */
export function selectDisplayHints(
    pathList: number[][],
    opts: { floor?: number; cap?: number; navDensity?: number; mustCrossKeys?: number[] } = {},
): HintDisplaySelection {
    const floor = opts.floor ?? DEFAULT_FLOOR;
    const cap = opts.cap ?? DEFAULT_CAP;
    const useCrossings = (opts.navDensity ?? 0) >= NEAR_HAMILTONIAN_DENSITY;
    // Order is only a variety axis with ≥2 must-cross squares (one square has no order).
    const mcKeys = (opts.mustCrossKeys && opts.mustCrossKeys.length >= 2) ? opts.mustCrossKeys : [];
    const mcKey = mcKeys.join(',');
    const useMemo = floor === DEFAULT_FLOOR && cap === DEFAULT_CAP;
    if (useMemo) {
        const cached = _memo.get(pathList);
        if (cached && cached.floor === floor && cached.cap === cap && cached.useCrossings === useCrossings && cached.mcKey === mcKey) return cached.result;
    }

    const n = pathList.length;
    let result: HintDisplaySelection;
    if (n <= 1) {
        result = { indices: n === 1 ? [0] : [], moreButSimilar: false };
    } else {
        const feats: PathFeatures[] = pathList.map(pth => {
            const mco = mcKeys.length ? mustCrossOrders(pth, mcKeys) : { first: [], full: [] };
            return { edge: edgeSet(pth), cross: crossingSet(pth), len: pth.length, mcFirst: mco.first, mcFull: mco.full };
        });
        // Coverage cells = (gate, portal-usage). Guaranteeing one hint per cell shows the player every
        // viable gate and every distinct way portals are (or aren't) used — the mandatory backbone that
        // diversity then fills around. Rep per cell = its longest path (richest drawn content).
        const cells = new Map<string, number>(); // cell key → representative index (longest so far)
        for (let i = 0; i < n; i++) {
            const key = `${pathList[i][0]}|${portalSignature(pathList[i])}`;
            const cur = cells.get(key);
            if (cur === undefined || feats[i].len > feats[cur].len) cells.set(key, i);
        }
        const { chosen, moreButSimilar } = coverageSelect(feats, useCrossings, [...cells.values()], floor, cap);
        // Interleave gates (first packed key = gate) so cycling alternates; keep selection order within a gate.
        const byGate = new Map<number, number[]>();
        for (const idx of chosen) {
            const g = pathList[idx][0];
            if (!byGate.has(g)) byGate.set(g, []);
            byGate.get(g)!.push(idx);
        }
        const gateLists = [...byGate.values()];
        const indices: number[] = [];
        for (let r = 0; indices.length < chosen.length; r++) {
            let progressed = false;
            for (const gl of gateLists) if (gl[r] !== undefined) { indices.push(gl[r]); progressed = true; }
            if (!progressed) break;
        }
        result = { indices, moreButSimilar };
    }
    if (useMemo) _memo.set(pathList, { floor, cap, useCrossings, mcKey, result });
    return result;
}
