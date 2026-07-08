import { getDistanceFromArray } from './distance.js';
import { AXIS_H, AXIS_V } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState, PrepLevel } from './types.js';

// Must-turn deadlock check: a still-pending must-turn cell whose edgeUsage already has BOTH
// axis bits set (AXIS_H | AXIS_V) can never be entered again — isMoveDynamicallyValid's
// edge-axis-reuse rule blocks re-entry via either axis regardless of direction — so the
// constraint is provably unsatisfiable from here on. This happens on ANY turn taken at the
// cell (the entry move sets one axis bit, the exit move sets the other), not just a
// wrong-direction one; a *correct* turn also sets both bits, but clears the mask bit in the
// same applyMove call, so this only ever fires on an incorrect (or accidentally
// direction-mismatched) turn that left the requirement unsatisfied. A straight pass-through
// (entry axis === exit axis) only ever sets one bit, leaving the cell enterable for a later,
// correctly-timed turn — this is why must-turn cells don't need visiting on the first pass.
// O(1) per pending cell (a single typed-array read), no BFS — cheap enough to run every node,
// unlike the connectivity prune it complements (isConnected checks must-pass/must-cross
// reachability but not must-turn; this catches the narrower "provably too late" case directly).
export function mustTurnDeadlocked(state: SolverSearchState, prep: PrepLevel): boolean {
    if (state.mustTurnMask === 0 || !prep.mustTurnKeys) return false;
    for (let i = 0; i < prep.mustTurnKeys.length; i++) {
        if ((state.mustTurnMask & (1 << i)) === 0) continue;
        if (state.edgeUsage[prep.mustTurnKeys[i]] === (AXIS_H | AXIS_V)) return true;
    }
    return false;
}

// Lower bound for surround constraints: for each unsatisfied surround cell,
// the path must still reach every unvisited valid neighbor and then the goal.
// Uses max(dist_to_neighbor + dist_neighbor_to_goal) over unvisited neighbors.
export function surroundLowerBound(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
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
export function adjTurnLowerBound(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
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
function _ufFind(x: number): number { while (_ufPar[x] !== x) { _ufPar[x] = _ufPar[_ufPar[x]]; x = _ufPar[x]; } return x; }

// Distance for the directed "arrive at MC[to] coming from MC[from]" leg of an MST edge.
// If `to` still needs its perpendicular 2nd-pass approach (crossCounts[to] === 1), route
// through its approach cells (same maps mustCrossLowerBound uses for the `pos` case) —
// this is a valid lower bound ONLY for this specific direction (from-then-to). Otherwise
// (to's 1st visit is unconstrained, or no approach map exists) falls back to `fallback`
// (the plain, direction-agnostic distance) — the caller combines both directions safely.
function _mcApproachAwareDist(from: number, to: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, fallback: number): number {
    if (state.crossCounts[to] !== 1 || !prep.mcApproachDistMaps) return fallback;
    const toKey = level.mustCrossKeys[to];
    const usedH = (state.edgeUsage[toKey] & AXIS_H) !== 0;
    const aMap  = usedH ? prep.mcApproachDistMaps[to].v : prep.mcApproachDistMaps[to].h;
    if (aMap.size === 0) return fallback;
    const dToApproach = aMap.get(level.mustCrossKeys[from]) ?? Infinity;
    return Number.isFinite(dToApproach) ? dToApproach + 1 : fallback;
}

// MST-based joint lower bound for ≥2 remaining must-cross cells.
// Computes a Kruskal MST of {current_pos} ∪ {remaining MC cells} and adds
// the minimum MC-to-goal distance.  Returns a lower bound on remaining steps.
// edges scratch array avoids heap allocation on the hot path.
const _mstEdges = new Float64Array(30); // weight, u, v packed as triples (max 10 edges * 3 = 30)
export function mcMSTLowerBound(pos: number, remain: number[], state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
    const k = remain.length; // k >= 2
    const nodeCount = k + 1; // 0=pos, 1..k = MC[remain[...]]

    // Compute pos→MCi distance (use approach map for 2nd-visit cells)
    let eCount = 0;
    for (let a = 0; a < k; a++) {
        const i = remain[a];
        let d: number;
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
    // MC[i] ↔ MC[j] pairwise edges. Base weight is the plain BFS distance (mcPairDist),
    // which is always a valid lower bound regardless of visit order. Tightened further
    // when EITHER endpoint needs its perpendicular 2nd-pass approach: the edge really
    // means "distance from wherever the path finishes with one of these to the other",
    // and since the visit order isn't known, each direction's approach-aware distance is
    // only a valid bound for THAT specific order — so we take the min of the two
    // directional estimates (never exceeds the true edge cost, whichever order occurs),
    // then max with the plain distance (a bound valid in either order). This only
    // increases the weight above mcPairDist when BOTH endpoints need their approach
    // (so both directional estimates are tightened); a single pending 2nd-pass isn't
    // enough — the other, unconstrained direction still bottoms out at mcPairDist.
    for (let a = 0; a < k; a++) {
        for (let b = a + 1; b < k; b++) {
            const i = remain[a], j = remain[b];
            const plain = prep.mcPairDist[i][j];
            if (!Number.isFinite(plain)) return Infinity;
            const dToJ = _mcApproachAwareDist(i, j, state, level, prep, plain);
            const dToI = _mcApproachAwareDist(j, i, state, level, prep, plain);
            const d = Math.max(plain, Math.min(dToJ, dToI));
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
export function mpMSTLowerBound(pos: number, remain: number[], level: NormalizedLevel, prep: PrepLevel): number {
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
export function mustPassLowerBound(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
    const n = level.mustPassKeys.length;
    if (n === 0) return 0;
    // Use mpVisitedMask (uint32) — works for both DFS (mustMask=0) and beam.
    const mpAllMask = (1 << n) - 1;
    if ((state.mpVisitedMask & mpAllMask) === mpAllMask) return 0;
    const remain: number[] = [];
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
export function mustCrossLowerBound(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
    if (state.mustCrossMask === 0) return 0;
    const n = level.mustCrossKeys.length;
    let lb = 0;
    const remain: number[] = [];
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

