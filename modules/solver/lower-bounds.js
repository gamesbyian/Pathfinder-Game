// @ts-check
import { getDistanceFromArray } from './distance.js';
import { AXIS_H } from './encoding.js';

/** @typedef {import('../domain/types.js').NormalizedLevel} NormalizedLevel */
/** @typedef {import('./types.js').SolverSearchState} SolverSearchState */
/** @typedef {import('./types.js').PrepLevel} PrepLevel */

// Lower bound for surround constraints: for each unsatisfied surround cell,
// the path must still reach every unvisited valid neighbor and then the goal.
// Uses max(dist_to_neighbor + dist_neighbor_to_goal) over unvisited neighbors.
/** @param {number} pos @param {SolverSearchState} state @param {NormalizedLevel} level @param {PrepLevel} prep @returns {number} */
export function surroundLowerBound(pos, state, level, prep) {
    const { surroundNeighborDistMaps, surroundNeighborKeys, surroundNeighborGoalDist } = prep;
    if (state.surroundMask === 0 || !surroundNeighborDistMaps || !surroundNeighborKeys || !surroundNeighborGoalDist) return 0;
    const n = (level.surroundKeys || []).length;
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if ((state.surroundMask & (1 << i)) === 0) continue;
        const remainBits = state.surroundNeighborRemainingMasks[i];
        if (!remainBits) continue;
        const nbrKeys     = surroundNeighborKeys[i];
        const nbrGoalDist = surroundNeighborGoalDist[i];
        const nbrDistMaps = surroundNeighborDistMaps[i];
        // Bits in remainBits are dense-index bits: bit j = j-th valid neighbor
        for (let j = 0; j < nbrKeys.length; j++) {
            if (!(remainBits & (1 << j))) continue;
            const dToNbr   = nbrDistMaps[j].get(pos) ?? Infinity;
            const dNbrGoal = nbrGoalDist[j];
            if (!Number.isFinite(dToNbr) || !Number.isFinite(dNbrGoal)) return Infinity;
            lb = Math.max(lb, dToNbr + dNbrGoal);
        }
    }
    return lb;
}

// Lower bound for adjacent-turn constraints: the path must still reach an
// adjacent cell of each unsatisfied adj-turn object (and turn there + reach goal).
// Uses the precomputed multi-source approach dist map per adj-turn object.
/** @param {number} pos @param {SolverSearchState} state @param {NormalizedLevel} level @param {PrepLevel} prep @returns {number} */
export function adjTurnLowerBound(pos, state, level, prep) {
    const { adjTurnDistMaps, adjTurnGoalDist } = prep;
    if (state.adjTurnMask === 0 || !adjTurnDistMaps || !adjTurnGoalDist) return 0;
    const n = (level.adjacentTurnKeys || []).length;
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if ((state.adjTurnMask & (1 << i)) === 0) continue;
        const dToAdj = adjTurnDistMaps[i].get(pos) ?? Infinity;
        const dGoal  = adjTurnGoalDist[i];
        if (!Number.isFinite(dToAdj) || !Number.isFinite(dGoal)) return Infinity;
        lb = Math.max(lb, dToAdj + dGoal);
    }
    return lb;
}

// Union-find backing store for Kruskal's MST (max 6 nodes: pos + up to 5 MC cells)
const _ufPar = new Int32Array(8);
/** @param {number} x @returns {number} */
function _ufFind(x) { while (_ufPar[x] !== x) { _ufPar[x] = _ufPar[_ufPar[x]]; x = _ufPar[x]; } return x; }

// MST-based joint lower bound for ≥2 remaining must-cross cells.
// Computes a Kruskal MST of {current_pos} ∪ {remaining MC cells} and adds
// the minimum MC-to-goal distance.  Returns a lower bound on remaining steps.
// edges scratch array avoids heap allocation on the hot path.
const _mstEdges = new Float64Array(30); // weight, u, v packed as triples (max 10 edges * 3 = 30)
/** @param {number} pos @param {number[]} remain @param {SolverSearchState} state @param {NormalizedLevel} level @param {PrepLevel} prep @returns {number} */
export function mcMSTLowerBound(pos, remain, state, level, prep) {
    const k = remain.length; // k >= 2
    const nodeCount = k + 1; // 0=pos, 1..k = MC[remain[...]]

    // Compute pos→MCi distance (use approach map for 2nd-visit cells)
    let eCount = 0;
    for (let a = 0; a < k; a++) {
        const i = remain[a];
        let d;
        if (state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
            const mcKey = level.mustCrossKeys[i];
            const usedH = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
            const aMap  = usedH ? prep.mcApproachDistMaps[i].v : prep.mcApproachDistMaps[i].h;
            d = aMap.size > 0 ? ((aMap.get(pos) ?? Infinity) + 1) : getDistanceFromArray(prep.mcDistArrs[i], pos);
        } else {
            d = getDistanceFromArray(prep.mcDistArrs[i], pos);
        }
        if (!Number.isFinite(d)) return Infinity;
        _mstEdges[eCount * 3]     = d;
        _mstEdges[eCount * 3 + 1] = 0;
        _mstEdges[eCount * 3 + 2] = a + 1;
        eCount++;
    }
    // MC[i] ↔ MC[j] pairwise edges
    for (let a = 0; a < k; a++) {
        for (let b = a + 1; b < k; b++) {
            const d = prep.mcPairDist[remain[a]][remain[b]];
            if (!Number.isFinite(d)) return Infinity;
            _mstEdges[eCount * 3]     = d;
            _mstEdges[eCount * 3 + 1] = a + 1;
            _mstEdges[eCount * 3 + 2] = b + 1;
            eCount++;
        }
    }

    // Sort edges by weight (insertion sort — tiny arrays)
    for (let i = 1; i < eCount; i++) {
        const w = _mstEdges[i * 3], u = _mstEdges[i * 3 + 1], v = _mstEdges[i * 3 + 2];
        let j = i - 1;
        while (j >= 0 && _mstEdges[j * 3] > w) {
            _mstEdges[(j + 1) * 3]     = _mstEdges[j * 3];
            _mstEdges[(j + 1) * 3 + 1] = _mstEdges[j * 3 + 1];
            _mstEdges[(j + 1) * 3 + 2] = _mstEdges[j * 3 + 2];
            j--;
        }
        _mstEdges[(j + 1) * 3]     = w;
        _mstEdges[(j + 1) * 3 + 1] = u;
        _mstEdges[(j + 1) * 3 + 2] = v;
    }

    // Kruskal's MST
    for (let i = 0; i < nodeCount; i++) _ufPar[i] = i;
    let mstW = 0, added = 0;
    for (let e = 0; e < eCount && added < nodeCount - 1; e++) {
        const pu = _ufFind(_mstEdges[e * 3 + 1]), pv = _ufFind(_mstEdges[e * 3 + 2]);
        if (pu !== pv) { _ufPar[pu] = pv; mstW += _mstEdges[e * 3]; added++; }
    }
    if (added < nodeCount - 1) return Infinity;

    // Min dist from any remaining MC cell to goal
    let minGoal = Infinity;
    for (const i of remain) {
        const d = prep.mustCrossToGoalDist[i];
        if (Number.isFinite(d)) minGoal = Math.min(minGoal, d);
    }
    return Number.isFinite(minGoal) ? mstW + minGoal : Infinity;
}

// MST lower bound for must-pass: MST({pos, MP1, MP2, ...}) + minGoalDist.
// Mirrors mcMSTLowerBound — uses shared _mstEdges/_ufPar globals.
/** @param {number} pos @param {number[]} remain @param {NormalizedLevel} level @param {PrepLevel} prep @returns {number} */
export function mpMSTLowerBound(pos, remain, level, prep) {
    const k = remain.length; // k >= 2
    const nodeCount = k + 1; // 0=pos, 1..k = MP[remain[...]]
    let eCount = 0;
    for (let a = 0; a < k; a++) {
        const d = getDistanceFromArray(prep.mpDistArrs[remain[a]], pos);
        if (!Number.isFinite(d)) return Infinity;
        _mstEdges[eCount * 3]     = d;
        _mstEdges[eCount * 3 + 1] = 0;
        _mstEdges[eCount * 3 + 2] = a + 1;
        eCount++;
    }
    for (let a = 0; a < k; a++) {
        for (let b = a + 1; b < k; b++) {
            const d = prep.mpPairDist[remain[a]][remain[b]];
            if (!Number.isFinite(d)) return Infinity;
            _mstEdges[eCount * 3]     = d;
            _mstEdges[eCount * 3 + 1] = a + 1;
            _mstEdges[eCount * 3 + 2] = b + 1;
            eCount++;
        }
    }
    for (let i = 1; i < eCount; i++) {
        const w = _mstEdges[i * 3], u = _mstEdges[i * 3 + 1], v = _mstEdges[i * 3 + 2];
        let j = i - 1;
        while (j >= 0 && _mstEdges[j * 3] > w) {
            _mstEdges[(j + 1) * 3]     = _mstEdges[j * 3];
            _mstEdges[(j + 1) * 3 + 1] = _mstEdges[j * 3 + 1];
            _mstEdges[(j + 1) * 3 + 2] = _mstEdges[j * 3 + 2];
            j--;
        }
        _mstEdges[(j + 1) * 3]     = w;
        _mstEdges[(j + 1) * 3 + 1] = u;
        _mstEdges[(j + 1) * 3 + 2] = v;
    }
    for (let i = 0; i < nodeCount; i++) _ufPar[i] = i;
    let mstW = 0, added = 0;
    for (let e = 0; e < eCount && added < nodeCount - 1; e++) {
        const pu = _ufFind(_mstEdges[e * 3 + 1]), pv = _ufFind(_mstEdges[e * 3 + 2]);
        if (pu !== pv) { _ufPar[pu] = pv; mstW += _mstEdges[e * 3]; added++; }
    }
    if (added < nodeCount - 1) return Infinity;
    let minGoal = Infinity;
    for (const i of remain) {
        const d = prep.mustPassToGoalDist[i];
        if (Number.isFinite(d)) minGoal = Math.min(minGoal, d);
    }
    return Number.isFinite(minGoal) ? mstW + minGoal : Infinity;
}

// Lower bound: must visit every unsatisfied must-pass then reach goal.
// Uses per-cell max bound, upgraded to MST joint bound when ≥2 MPs remain
// (same pattern as mustCrossLowerBound — MST is tighter than max-of-individual).
/** @param {number} pos @param {SolverSearchState} state @param {NormalizedLevel} level @param {PrepLevel} prep @returns {number} */
export function mustPassLowerBound(pos, state, level, prep) {
    const n = level.mustPassKeys.length;
    if (n === 0) return 0;
    // Use mpVisitedMask (uint32) — works for both DFS (mustMask=0) and beam.
    const mpAllMask = (1 << n) - 1;
    if ((state.mpVisitedMask & mpAllMask) === mpAllMask) return 0;
    const remain = [];
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if (state.mpVisitedMask & (1 << i)) continue;
        remain.push(i);
        const dToMp   = getDistanceFromArray(prep.mpDistArrs[i], pos);
        const dMpGoal = prep.mustPassToGoalDist[i];
        if (!Number.isFinite(dToMp) || !Number.isFinite(dMpGoal)) return Infinity;
        lb = Math.max(lb, dToMp + dMpGoal);
    }
    if (remain.length >= 2 && prep.mpPairDist) {
        const mst = mpMSTLowerBound(pos, remain, level, prep);
        if (!Number.isFinite(mst)) return Infinity;
        lb = Math.max(lb, mst);
    }
    return lb;
}

// Lower bound: must visit every unfinished must-cross at least once more, then reach goal.
// When a MC cell has already been crossed once, the 2nd pass must approach from the
// perpendicular axis — use the precomputed approach-cell distance map for a tighter bound.
// For ≥2 remaining MC cells, also uses an MST joint lower bound (tighter than max over
// individual bounds), which prunes wrong subtrees much earlier.
/** @param {number} pos @param {SolverSearchState} state @param {NormalizedLevel} level @param {PrepLevel} prep @returns {number} */
export function mustCrossLowerBound(pos, state, level, prep) {
    if (state.mustCrossMask === 0) return 0;
    const n = level.mustCrossKeys.length;
    let lb = 0;
    const remain = [];
    for (let i = 0; i < n; i++) {
        if ((state.mustCrossMask & (1 << i)) === 0) continue;
        remain.push(i);
        const dMcGoal = prep.mustCrossToGoalDist[i];
        if (!Number.isFinite(dMcGoal)) return Infinity;

        if (state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
            // 2nd visit needed: must reach an approach cell on the perpendicular axis first.
            const mcKey  = level.mustCrossKeys[i];
            const usedH  = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
            const aMap   = usedH ? prep.mcApproachDistMaps[i].v : prep.mcApproachDistMaps[i].h;
            if (aMap.size > 0) {
                const dToApproach = aMap.get(pos) ?? Infinity;
                if (!Number.isFinite(dToApproach)) return Infinity;
                // approach cell → 1 step into MC → exit → goal
                lb = Math.max(lb, dToApproach + 1 + dMcGoal);
                continue;
            }
        }

        const d = getDistanceFromArray(prep.mcDistArrs[i], pos);
        if (!Number.isFinite(d)) return Infinity;
        lb = Math.max(lb, d + dMcGoal);
    }

    // MST joint bound: tighter than max-of-individual when ≥2 MC cells remain.
    if (remain.length >= 2 && prep.mcPairDist) {
        const mst = mcMSTLowerBound(pos, remain, state, level, prep);
        if (!Number.isFinite(mst)) return Infinity;
        lb = Math.max(lb, mst);
    }

    return lb;
}

