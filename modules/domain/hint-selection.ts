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
// On near-Hamiltonian levels (navDensity ≥ NEAR_HAMILTONIAN_DENSITY) every solution covers almost the
// whole grid, so drawn lines are nearly identical and edge-distance goes blind — yet the *intersection
// locations* still vary. There we fold self-crossing placement into the distance (see featureDistance).
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

interface PathFeatures { edge: Set<string>; cross: Set<string>; len: number; }

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

function jaccardDistance(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let inter = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const e of small) if (big.has(e)) inter++;
    const union = a.size + b.size - inter;
    return union === 0 ? 0 : 1 - inter / union;
}

/** Distance between two paths' features. On near-Hamiltonian levels the drawn lines are nearly
 *  identical, so edge-overlap alone reads every solution as a duplicate; there we take the *larger*
 *  of edge- and crossing-placement distance, letting differing intersection locations count as
 *  variety. Off near-Hamiltonian levels crossings are tiny and noisy, so we use edges alone. */
function featureDistance(a: PathFeatures, b: PathFeatures, useCrossings: boolean): number {
    const edgeD = jaccardDistance(a.edge, b.edge);
    if (!useCrossings) return edgeD;
    return Math.max(edgeD, jaccardDistance(a.cross, b.cross));
}

/** Farthest-point (max–min) order over the paths; seed = longest (most drawn content). Returns
 *  picks with the min-distance-to-earlier-picks at selection time (monotonically non-increasing). */
function diversityOrder(feats: PathFeatures[], useCrossings: boolean): { idx: number; minDist: number }[] {
    const n = feats.length;
    if (n === 0) return [];
    let seed = 0;
    for (let i = 1; i < n; i++) if (feats[i].len > feats[seed].len) seed = i;
    const out = [{ idx: seed, minDist: 1 }];
    const minDist = feats.map(f => featureDistance(feats[seed], f, useCrossings));
    minDist[seed] = -1;
    while (out.length < n) {
        let best = -1, bestD = -1;
        for (let i = 0; i < n; i++) if (minDist[i] >= 0 && minDist[i] > bestD) { bestD = minDist[i]; best = i; }
        if (best === -1) break;
        out.push({ idx: best, minDist: bestD });
        minDist[best] = -1;
        for (let i = 0; i < n; i++) if (minDist[i] >= 0) minDist[i] = Math.min(minDist[i], featureDistance(feats[best], feats[i], useCrossings));
    }
    return out;
}

/** Memo keyed by pathList identity; entry validated against the opts it was computed for, since the
 *  same array can be queried at different navDensity (edge-only vs crossing-aware). */
const _memo = new WeakMap<number[][], { floor: number; cap: number; useCrossings: boolean; result: HintDisplaySelection }>();

/** Select the curated subset of `pathList` to display, plus the "more-but-similar" flag. Memoized
 *  by `pathList` identity for the default floor/cap and the resolved crossing-mode, so repeated
 *  cycle re-requests are O(1). */
export function selectDisplayHints(
    pathList: number[][],
    opts: { floor?: number; cap?: number; navDensity?: number } = {},
): HintDisplaySelection {
    const floor = opts.floor ?? DEFAULT_FLOOR;
    const cap = opts.cap ?? DEFAULT_CAP;
    const useCrossings = (opts.navDensity ?? 0) >= NEAR_HAMILTONIAN_DENSITY;
    const useMemo = floor === DEFAULT_FLOOR && cap === DEFAULT_CAP;
    if (useMemo) {
        const cached = _memo.get(pathList);
        if (cached && cached.floor === floor && cached.cap === cap && cached.useCrossings === useCrossings) return cached.result;
    }

    const n = pathList.length;
    let result: HintDisplaySelection;
    if (n <= 1) {
        result = { indices: n === 1 ? [0] : [], moreButSimilar: false };
    } else {
        const feats: PathFeatures[] = pathList.map(pth => ({ edge: edgeSet(pth), cross: crossingSet(pth), len: pth.length }));
        const order = diversityOrder(feats, useCrossings);
        let dFloor = 0;
        for (const o of order) { if (dFloor === 0 || o.minDist >= floor) dFloor++; else break; }
        const take = Math.min(cap, dFloor);
        const chosen = order.slice(0, take).map(o => o.idx);
        // We showed everything genuinely distinct (dFloor ≤ cap) but hid some near-duplicates.
        const moreButSimilar = dFloor <= cap && take < n;
        // Interleave gates (first packed key = gate) so cycling alternates; keep diversity order within a gate.
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
    if (useMemo) _memo.set(pathList, { floor, cap, useCrossings, result });
    return result;
}
