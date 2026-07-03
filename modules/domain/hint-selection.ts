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
import { buildPathFeatures, featureDistance, portalSignature, NEAR_HAMILTONIAN_DENSITY } from './path-features.js';
import type { PathFeatures } from './path-features.js';

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
        const feats: PathFeatures[] = pathList.map(pth => buildPathFeatures(pth, mcKeys));
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
