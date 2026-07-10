import { KEY_SPACE } from './encoding.js';
import { getRealLengthFromState } from './solution.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState, PrepLevel } from './types.js';

const _reachQ   = new Int32Array(512); // BFS queue; max grid is 15x15=225 cells
let _reachGen   = 0;
const _reachGenBuf = new Uint32Array(KEY_SPACE); // generation tracking (32-bit avoids wrap)

// Shared BFS-neighbor admissibility check for isConnected/isConnectedForTrap. Pulled out to a
// plain module-level function (no captured variables) rather than a per-call closure: this is
// the hottest inner loop in the solver (isConnected runs 10^5-10^6 times on beam-heavy levels),
// and a fresh closure allocated on every isConnected() call was measured (PF_BEAM_DEBUG) to be
// a meaningful share of its cost. Behaviour is unchanged — same predicate, same evaluation order,
// just 3 Set.has() collapsed into 1 typed-array read via prep.reachBlockedArr (blocks∪geese∪gates).
//
// Used-flipper exception: a flipper cell whose flipperUsedMask bit is already set can never be
// re-entered (single-use per the global-flip rule — isMoveDynamicallyValid rejects any move onto
// it). The generic visited/maxVisit check above doesn't know this — when intersections are still
// needed (maxVisit ≥ 1) it treats a used flipper as revisitable like any ordinary cell, which is
// wrong: it's a hard block, not a budget-limited revisit. This is a strict tightening (the old
// behaviour only ever over-approximated reachability, never under-approximated it), so it can only
// catch genuine dead ends earlier — never reject a state the old check would have kept.
function _reachCanEnter(nk: number, gen: number, maxVisit: number, pos: number, state: SolverSearchState, prep: PrepLevel): boolean {
    if (prep.flipperIndexMap) {
        const fi = prep.flipperIndexMap[nk];
        if (fi !== -1 && (state.flipperUsedMask & (1 << fi)) !== 0) return false;
    }
    return _reachGenBuf[nk] !== gen && prep.reachBlockedArr[nk] === 0 &&
        (state.visited[nk] <= maxVisit || nk === pos);
}

// Shared flood fill for isConnected/isConnectedForTrap: traverses portal edges (via
// _reachCanEnter, same admissibility rule as ordinary neighbors — a portal destination can
// never actually be a flipper cell since the editor enforces one object per cell and portals
// only ever pair with other portal cells, but routing through the shared helper keeps the two
// edge kinds provably in sync rather than relying on that invariant twice) and the 4 grid
// directions, marking _reachGenBuf and counting freshVolume. Plain module-level function (no
// captured variables, no callbacks) for the same hot-path reason _reachCanEnter is above — both
// callers read the resulting generation back via the shared _reachGen module variable rather
// than have this return an allocated {gen, freshVolume} pair.
function _floodFillReachability(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, maxVisit: number): number {
    const { w, h } = level.grid;
    const hasPortals = level.portalMap.size > 0;

    _reachGen++;
    const gen = _reachGen;
    let qHead = 0, qTail = 0;
    _reachGenBuf[pos] = gen;
    _reachQ[qTail++] = pos;
    // freshVolume counts reachable fresh cells + pos itself (matching V1's _checkTopology volume count).
    // Even though pos is already visited, V1 includes the start cell in its volume tally.
    let freshVolume = 1;

    while (qHead < qTail) {
        const k = _reachQ[qHead++];
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        // Portal edge: if portal source is reachable, destination is too (skip the Map lookup
        // entirely on portal-free levels — the overwhelming majority of BFS calls).
        if (hasPortals) {
            const portal = level.portalMap.get(k);
            if (portal) {
                const d = portal.dest;
                if (_reachCanEnter(d, gen, maxVisit, pos, state, prep)) {
                    _reachGenBuf[d] = gen;
                    if (state.visited[d] === 0) freshVolume++;
                    _reachQ[qTail++] = d;
                }
            }
        }
        if (x + 1 < w) {
            const nk = k + 1;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
        if (x > 0) {
            const nk = k - 1;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
        if (y + 1 < h) {
            const nk = k + 0x10000;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
        if (y > 0) {
            const nk = k - 0x10000;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
    }

    return freshVolume;
}

// Connectivity prune: checks that goal + unsatisfied objectives are reachable from pos,
// and (for non-MC levels) that enough fresh cells exist to complete the path.
// Flood fill traverses cells that are either unvisited, or (if intersections still needed)
// visited exactly once. Gate cells (other than starting gate) are treated as walls.
// Volume check (V1 _checkTopology): freshCells + intNeeded >= rSteps prunes branches
// that are isolated in a sub-region too small to complete the required path length.
export function isConnected(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): boolean {
    const intNeeded = level.reqInt - state.ints;
    // Threshold: visited count allowed to pass through.
    //   0 intersections remaining: only unvisited cells (path acts as hard walls).
    //   N > 0 intersections remaining: cells visited up to twice are traversable.
    //   The original maxVisit=1 was wrong: after making one intersection (visited[A]=2),
    //   cell A still needs to be passable in BFS if we have intersection budget left.
    //   Cap at 2 rather than reqInt to bound BFS cost on high-intersection levels.
    const maxVisit = intNeeded > 0 ? 2 : 0;

    const freshVolume = _floodFillReachability(pos, state, level, prep, maxVisit);
    const gen = _reachGen;

    if (_reachGenBuf[level.goalKey] !== gen) return false;
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && _reachGenBuf[level.mustPassKeys[i]] !== gen) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && _reachGenBuf[level.mustCrossKeys[i]] !== gen) return false;
    }
    // Volume check (mirrors V1's _checkTopology): not enough accessible fresh cells to finish.
    // Disabled for portal levels only (portal jumps visit a destination cell for 0 path
    // steps, inflating freshVolume). MC levels use the same formula since intNeeded
    // accounts for the extra revisit steps — the double-count concern was unfounded.
    if (level.portalMap.size === 0) {
        const rSteps = level.reqLen - getRealLengthFromState(state);
        if (freshVolume + intNeeded < rSteps) return false;
    }
    return true;
}

// Like isConnected but skips goal-reachability — for trap spot enumeration where
// any cell can be the endpoint and goal reachability is not required.
//
// Note the deliberately stricter maxVisit=1 (vs isConnected's maxVisit=2): trap
// search is a best-effort, time-budgeted enumeration that already exhausts its
// budget on most levels, so it favors a cheaper, more aggressive connectivity
// prune. Raising this to 2 to mirror isConnected was measured to find zero
// additional valid trap spots on both completing and timed-out levels (final
// spots are gated by a full win-condition check before being added), so the
// looser bound buys nothing here — it would only prune less for no benefit.
export function isConnectedForTrap(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): boolean {
    const intNeeded = level.reqInt - state.ints;
    const maxVisit = intNeeded > 0 ? 1 : 0;

    const freshVolume = _floodFillReachability(pos, state, level, prep, maxVisit);
    const gen = _reachGen;

    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && _reachGenBuf[level.mustPassKeys[i]] !== gen) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && _reachGenBuf[level.mustCrossKeys[i]] !== gen) return false;
    }
    if (level.portalMap.size === 0) {
        const rSteps = level.reqLen - getRealLengthFromState(state);
        if (freshVolume + intNeeded < rSteps) return false;
    }
    return true;
}

