// Pure player-facing hint curation. Selects a small, distinct subset from all stored solutions.
// Distance is edge Jaccard, augmented with crossing placement on near-Hamiltonian levels and
// must-cross order where applicable. Coverage by (gate, portal signature) takes precedence over cap.
// Heatmaps still use the full path list.
import { buildPathFeatures, featureDistance, portalSignature, NEAR_HAMILTONIAN_DENSITY } from './path-features.js';
import type { PathFeatures } from './path-features.js';

export interface HintDisplaySelection {
    /** Indices into the full path list, in gate-interleaved display order. */
    indices: number[];
    /** Hidden hints exist and all fall below the distinctiveness floor. */
    moreButSimilar: boolean;
}

/** Corpus-calibrated defaults; see scripts/analyze-hint-selection.mjs. */
const DEFAULT_FLOOR = 0.65;
const DEFAULT_CAP = 15;

/** Include required coverage reps, then farthest-point fill to `cap`; required coverage may exceed cap. */
function coverageSelect(
    feats: PathFeatures[], useCrossings: boolean, required: number[], floor: number, cap: number,
): { chosen: number[]; moreButSimilar: boolean } {
    const n = feats.length;
    const inChosen = new Array<boolean>(n).fill(false);
    const minDist = new Array<number>(n).fill(Infinity);
    const chosen: number[] = [];
    const pick = (i: number) => {
        inChosen[i] = true; chosen.push(i); minDist[i] = -1;
        for (let j = 0; j < n; j++) if (!inChosen[j]) minDist[j] = Math.min(minDist[j], featureDistance(feats[i], feats[j], useCrossings));
    };
    // Longest representative first within mandatory coverage.
    for (const i of [...required].sort((a, b) => feats[b].len - feats[a].len)) if (!inChosen[i]) pick(i);
    while (chosen.length < cap) {
        let best = -1, bestD = -1;
        for (let i = 0; i < n; i++) if (!inChosen[i] && minDist[i] > bestD) { bestD = minDist[i]; best = i; }
        if (best === -1 || bestD < floor) break;
        pick(best);
    }
    let maxHidden = -1;
    for (let i = 0; i < n; i++) if (!inChosen[i] && minDist[i] > maxHidden) maxHidden = minDist[i];
    return { chosen, moreButSimilar: chosen.length < n && maxHidden < floor };
}

/** Memo by path-list identity and resolved selection context. */
const _memo = new WeakMap<number[][], { floor: number; cap: number; useCrossings: boolean; mcKey: string; result: HintDisplaySelection }>();

/** Curated display subset plus whether all hidden paths are similar. */
export function selectDisplayHints(
    pathList: number[][],
    opts: { floor?: number; cap?: number; navDensity?: number; mustCrossKeys?: number[] } = {},
): HintDisplaySelection {
    const floor = opts.floor ?? DEFAULT_FLOOR;
    const cap = opts.cap ?? DEFAULT_CAP;
    const useCrossings = (opts.navDensity ?? 0) >= NEAR_HAMILTONIAN_DENSITY;
    // Order varies only with at least two must-cross squares.
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
        // One longest representative per (gate, portal-usage) cell is mandatory.
        const cells = new Map<string, number>();
        for (let i = 0; i < n; i++) {
            const key = `${pathList[i][0]}|${portalSignature(pathList[i])}`;
            const cur = cells.get(key);
            if (cur === undefined || feats[i].len > feats[cur].len) cells.set(key, i);
        }
        const { chosen, moreButSimilar } = coverageSelect(feats, useCrossings, [...cells.values()], floor, cap);
        // Interleave gates while preserving selection order within each gate.
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
