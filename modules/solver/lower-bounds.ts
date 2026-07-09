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

// Max remaining-objective count (k) the MST scratch buffers below are sized for. CLAUDE.md's
// "max must-pass 4" is a WIRE-level authoring limit on the `mustPass` array specifically —
// must-turn landmarks (mustTurn/mustTurnCw/mustTurnCcw) are ALSO passable "must-visit"
// objectives and get folded into the same normalized `level.mustPassKeys` (see
// domain/landmark-rules.ts), so the true combined count can exceed 4. A full-corpus scan
// (published + stress) found an observed max of 6 (mustPassKeys) / 4 (mustCrossKeys) — this
// pre-existing `_mstEdges`/`_ufPar` sizing (found while adding the scratch buffers below) was
// already undersized for that: at k=6, mpMSTLowerBound needs k + C(k,2) = 21 edges (63 float64
// slots), but `_mstEdges` was only 30 slots (10 edges) — TypedArray writes past the end are
// silent no-ops, so the sort/Kruskal steps below silently read back stale data from a PRIOR
// call for the missing edges once k >= 5, a real pre-existing correctness bug (not introduced
// here), independent of the allocation-avoidance change this file also makes. Sized to 16 here
// — comfortably above the observed max of 6, not tied to it — with a defensive fallback in
// mustPassLowerBound/mustCrossLowerBound (skip MST tightening, keep the already-computed
// max-of-individual bound, which stays valid on its own) if a future level's count ever
// exceeds it, so this can never silently corrupt again regardless of the exact bound chosen.
const MAX_MST_K = 16;

// Union-find backing store for Kruskal's MST (up to MAX_MST_K remaining objectives + `pos`).
const _ufPar = new Int32Array(MAX_MST_K + 1);
function _ufFind(x: number): number { while (_ufPar[x] !== x) { _ufPar[x] = _ufPar[_ufPar[x]]; x = _ufPar[x]; } return x; }

// Preallocated "remaining objective indices" scratch for mustPassLowerBound/mustCrossLowerBound
// — reused across calls instead of each call allocating a fresh `number[]`, which profiling
// (node --prof on an isolated repair-search run) showed was the single hottest function in the
// whole repair search: mpMSTLowerBound alone was ~32% of total CPU ticks, with the array
// allocation confirmed as a major contributor via a standalone microbenchmark (~1.8x for the
// allocation-avoidance alone). Two separate buffers (not one shared): mustPassLowerBound and
// mustCrossLowerBound are never on each other's call stack (neither calls the other), but
// keeping them distinct avoids any risk of that changing silently later.
const _mpRemainScratch = new Int32Array(MAX_MST_K);
const _mcRemainScratch = new Int32Array(MAX_MST_K);

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
//
// `remain`/`remainLen`: an index list + explicit count rather than a `number[]` with `.length`
// — accepts `ArrayLike<number>` so the hot call site (mustCrossLowerBound) can pass a
// preallocated scratch buffer with no per-call allocation, while direct test callers can still
// pass an ordinary array literal.
// weight, u, v packed as triples. Max edges at k=MAX_MST_K remaining objectives is
// k + C(k,2) (pos→each, plus every pairwise edge) — see MAX_MST_K's comment for why this needs
// to be sized well above the naive "max 4-6 objectives" assumption.
const _MAX_MST_EDGES = MAX_MST_K + (MAX_MST_K * (MAX_MST_K - 1)) / 2;
const _mstEdges = new Float64Array(_MAX_MST_EDGES * 3);
export function mcMSTLowerBound(pos: number, remain: ArrayLike<number>, remainLen: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
    const k = remainLen; // k >= 2
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
    const mcN = level.mustCrossKeys.length;
    for (let a = 0; a < k; a++) {
        for (let b = a + 1; b < k; b++) {
            const i = remain[a], j = remain[b];
            const plain = prep.mcPairDist[i * mcN + j];
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
    for (let a = 0; a < remainLen; a++) {
        const d = prep.mustCrossToGoalDist[remain[a]];
        if (Number.isFinite(d)) minGoal = Math.min(minGoal, d);
    }
    return Number.isFinite(minGoal) ? mstW + minGoal : Infinity;
}

// MST lower bound for must-pass: MST({pos, MP1, MP2, ...}) + minGoalDist.
// Mirrors mcMSTLowerBound — uses shared _mstEdges/_ufPar globals. `remain`/`remainLen`: see
// mcMSTLowerBound's comment (same ArrayLike + explicit-count pattern, same reason).
export function mpMSTLowerBound(pos: number, remain: ArrayLike<number>, remainLen: number, level: NormalizedLevel, prep: PrepLevel): number {
    const k = remainLen; // k >= 2
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
    const mpN = level.mustPassKeys.length;
    for (let a = 0; a < k; a++) {
        for (let b = a + 1; b < k; b++) {
            const d = prep.mpPairDist[remain[a] * mpN + remain[b]];
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
    for (let a = 0; a < remainLen; a++) {
        const d = prep.mustPassToGoalDist[remain[a]];
        if (Number.isFinite(d)) minGoal = Math.min(minGoal, d);
    }
    return Number.isFinite(minGoal) ? mstW + minGoal : Infinity;
}

// Cache key for mustPassLowerBound's memoization: packs (pos, mpVisitedMask) into one integer.
// `pos` is a packed cell key (< KEY_SPACE = 1<<20 per CLAUDE.md); multiplying by 0x1000000
// (1<<24) leaves 24 bits for the mask, comfortably more than any realistic mustPassKeys.length
// (bounded to 32 by the mask's own `1 << i` width elsewhere) could ever produce — collision-free
// and safely within Number.MAX_SAFE_INTEGER (pos_max * 2^24 ≈ 2^44).
const _MP_LB_CACHE_MASK_BITS = 0x1000000;

// Lower bound: must visit every unsatisfied must-pass then reach goal.
// Uses per-cell max bound, upgraded to MST joint bound when ≥2 MPs remain
// (same pattern as mustCrossLowerBound — MST is tighter than max-of-individual).
//
// Memoized per (pos, mpVisitedMask): profiling (node --prof on an isolated repair-search run)
// found this the single hottest function in repair search (~30% of total CPU time even after
// removing its internal allocation and flattening mpPairDist), consistent with sheer call
// volume — every candidate move at every search node re-derives the same bound from scratch,
// and the same (pos, mask) pair recurs constantly across an ILS repair run's restarts (elite
// splicing revisits similar prefixes) and across DFS/beam's own backtracking. Sound to cache:
// the result depends on nothing but (pos, state.mpVisitedMask) given a fixed level/prep (see
// PrepLevel._mpLowerBoundCache's comment for why sharing one cache across every attempt/gate in
// a solveLevel() call is safe), and the cache can only ever return the exact value a fresh
// computation would — this is pure memoization, not an approximation.
export function mustPassLowerBound(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
    const n = level.mustPassKeys.length;
    if (n === 0) return 0;
    // Use mpVisitedMask (uint32) — works for both DFS (mustMask=0) and beam.
    const mpAllMask = (1 << n) - 1;
    if ((state.mpVisitedMask & mpAllMask) === mpAllMask) return 0;

    // Ablation: STRATEGY_LOWER_BOUND_MEMO bypasses the cache (identical values, fresh compute) so
    // the memoization's pure-speed contribution can be measured on its own.
    const _lbCfg = prep._cfg;
    const cache = (!_lbCfg || _lbCfg.STRATEGY_LOWER_BOUND_MEMO) ? (prep._mpLowerBoundCache ??= new Map<number, number>()) : null;
    const cacheKey = pos * _MP_LB_CACHE_MASK_BITS + state.mpVisitedMask;
    if (cache) {
        const cached = cache.get(cacheKey);
        if (cached !== undefined) return cached;
    }

    let remainLen = 0;
    let lb = 0;
    for (let i = 0; i < n; i++) {
        if (state.mpVisitedMask & (1 << i)) continue;
        // Guard the write, not just the later MST call: remainLen can legitimately exceed
        // MAX_MST_K (see its comment) — the per-cell max bound below is still computed for
        // every remaining objective regardless, only the MST tightening is skipped for the
        // overflow case, so this never silently corrupts the shared scratch buffers.
        if (remainLen < MAX_MST_K) _mpRemainScratch[remainLen] = i;
        remainLen++;
        const dToMp   = getDistanceFromArray(prep.mpDistArrs[i], pos);
        const dMpGoal = prep.mustPassToGoalDist[i];
        if (!Number.isFinite(dToMp) || !Number.isFinite(dMpGoal)) { cache?.set(cacheKey, Infinity); return Infinity; }
        lb = Math.max(lb, dToMp + dMpGoal);
    }
    if (remainLen >= 2 && remainLen <= MAX_MST_K && prep.mpPairDist) {
        const mst = mpMSTLowerBound(pos, _mpRemainScratch, remainLen, level, prep);
        if (!Number.isFinite(mst)) { cache?.set(cacheKey, Infinity); return Infinity; }
        lb = Math.max(lb, mst);
    }
    cache?.set(cacheKey, lb);
    return lb;
}

// Cache key support for mustCrossLowerBound — see its comment for why the key needs more than
// just (pos, mustCrossMask): unlike must-pass, the result also depends on each pending cell's
// crossCounts (0 vs 1: needs 2nd visit or not) and, when it needs a 2nd visit, which axis was
// used on the 1st (determines the perpendicular-approach direction). Encoded as a base-4 digit
// per must-cross index (0 = not-yet-crossed-or-irrelevant, 1 = crossed once via H, 2 = crossed
// once via V) — only meaningful for pending cells, but computed uniformly for simplicity; the
// mask itself disambiguates which digits are "live". Capped at MAX_MC_CACHE_N (8, double the
// observed max of 4): a full-corpus scan found must-cross doesn't inherit must-pass's landmark-
// folding growth path, so 8 is a defensive margin, not a tight fit — caching is simply skipped
// (falls through to a fresh, uncached computation, still fully correct) for any level that
// somehow exceeds it, so this can never silently misbehave regardless of the exact bound chosen.
const MAX_MC_CACHE_N = 8;
const _MC_LB_CACHE_POS_MULT = 1 << 25;
const _MC_LB_CACHE_MASK_MULT = 1 << 17;

// Lower bound: must visit every unfinished must-cross at least once more, then reach goal.
// When a MC cell has already been crossed once, the 2nd pass must approach from the
// perpendicular axis — use the precomputed approach-cell distance map for a tighter bound.
// For ≥2 remaining MC cells, also uses an MST joint lower bound (tighter than max over
// individual bounds), which prunes wrong subtrees much earlier.
//
// Memoized per (pos, mustCrossMask, per-cell crossCounts/axis state) when the must-cross count
// is within MAX_MC_CACHE_N — same rationale and safety argument as mustPassLowerBound's cache
// (profiling: mcMSTLowerBound + mustCrossLowerBound together were ~28% of repair-search CPU
// time on a must-cross-heavy stress level, S046). Exact memoization, not an approximation.
export function mustCrossLowerBound(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number {
    if (state.mustCrossMask === 0) return 0;
    const n = level.mustCrossKeys.length;

    // Ablation: STRATEGY_LOWER_BOUND_MEMO — same measurement seam as mustPassLowerBound's cache.
    const _lbCfg = prep._cfg;
    const useCache = n <= MAX_MC_CACHE_N && (!_lbCfg || !!_lbCfg.STRATEGY_LOWER_BOUND_MEMO);
    let cache: Map<number, number> | null = null;
    let cacheKey = 0;
    if (useCache) {
        cache = prep._mcLowerBoundCache ??= new Map<number, number>();
        let subState = 0;
        for (let i = 0; i < n; i++) {
            let code = 0;
            if ((state.mustCrossMask & (1 << i)) !== 0 && state.crossCounts[i] === 1) {
                code = (state.edgeUsage[level.mustCrossKeys[i]] & AXIS_H) !== 0 ? 1 : 2;
            }
            subState = subState * 4 + code;
        }
        cacheKey = pos * _MC_LB_CACHE_POS_MULT + state.mustCrossMask * _MC_LB_CACHE_MASK_MULT + subState;
        const cached = cache.get(cacheKey);
        if (cached !== undefined) return cached;
    }

    let lb = 0;
    let remainLen = 0;
    for (let i = 0; i < n; i++) {
        if ((state.mustCrossMask & (1 << i)) === 0) continue;
        // See mustPassLowerBound's identical guard: remainLen can exceed MAX_MST_K in
        // principle, so only the write is bounds-checked — the per-cell bound below still
        // covers every remaining objective; only the MST tightening is skipped on overflow.
        if (remainLen < MAX_MST_K) _mcRemainScratch[remainLen] = i;
        remainLen++;
        const dMcGoal = prep.mustCrossToGoalDist[i];
        if (!Number.isFinite(dMcGoal)) { if (cache) cache.set(cacheKey, Infinity); return Infinity; }

        if (state.crossCounts[i] === 1 && prep.mcApproachDistMaps) {
            // 2nd visit needed: must reach an approach cell on the perpendicular axis first.
            const mcKey  = level.mustCrossKeys[i];
            const usedH  = (state.edgeUsage[mcKey] & AXIS_H) !== 0;
            const aMap   = usedH ? prep.mcApproachDistMaps[i].v : prep.mcApproachDistMaps[i].h;
            if (aMap.size > 0) {
                const dToApproach = aMap.get(pos) ?? Infinity;
                if (!Number.isFinite(dToApproach)) { if (cache) cache.set(cacheKey, Infinity); return Infinity; }
                // approach cell → 1 step into MC → exit → goal
                lb = Math.max(lb, dToApproach + 1 + dMcGoal);
                continue;
            }
        }

        const d = getDistanceFromArray(prep.mcDistArrs[i], pos);
        if (!Number.isFinite(d)) { if (cache) cache.set(cacheKey, Infinity); return Infinity; }
        lb = Math.max(lb, d + dMcGoal);
    }

    // MST joint bound: tighter than max-of-individual when ≥2 MC cells remain.
    if (remainLen >= 2 && remainLen <= MAX_MST_K && prep.mcPairDist) {
        const mst = mcMSTLowerBound(pos, _mcRemainScratch, remainLen, state, level, prep);
        if (!Number.isFinite(mst)) { if (cache) cache.set(cacheKey, Infinity); return Infinity; }
        lb = Math.max(lb, mst);
    }

    if (cache) cache.set(cacheKey, lb);
    return lb;
}

