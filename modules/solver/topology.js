import { KEY_SPACE } from './encoding.js';
import { getRealLengthFromState } from './solution.js';

const _reachQ   = new Int32Array(512); // BFS queue; max grid is 15x15=225 cells
let _reachGen   = 0;
const _reachGenBuf = new Uint32Array(KEY_SPACE); // generation tracking (32-bit avoids wrap)

// Connectivity prune: checks that goal + unsatisfied objectives are reachable from pos,
// and (for non-MC levels) that enough fresh cells exist to complete the path.
// Flood fill traverses cells that are either unvisited, or (if intersections still needed)
// visited exactly once. Gate cells (other than starting gate) are treated as walls.
// Volume check (V1 _checkTopology): freshCells + intNeeded >= rSteps prunes branches
// that are isolated in a sub-region too small to complete the required path length.
export function isConnected(pos, state, level, prep) {
    const { w, h } = level.grid;
    const intNeeded = level.reqInt - state.ints;
    // Threshold: visited count allowed to pass through.
    //   0 intersections remaining: only unvisited cells (path acts as hard walls).
    //   N > 0 intersections remaining: cells visited up to twice are traversable.
    //   The original maxVisit=1 was wrong: after making one intersection (visited[A]=2),
    //   cell A still needs to be passable in BFS if we have intersection budget left.
    //   Cap at 2 rather than reqInt to bound BFS cost on high-intersection levels.
    const maxVisit = intNeeded > 0 ? 2 : 0;

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
        // Portal edge: if portal source is reachable, destination is too
        const portal = level.portalMap.get(k);
        if (portal) {
            const d = portal.dest;
            if (_reachGenBuf[d] !== gen && !level.blockSet.has(d) && !level.gooseSet.has(d) &&
                (state.visited[d] <= maxVisit || d === pos)) {
                _reachGenBuf[d] = gen;
                if (state.visited[d] === 0) freshVolume++;
                _reachQ[qTail++] = d;
            }
        }
        const addNeighbor = (nk) => {
            if (_reachGenBuf[nk] !== gen && !level.blockSet.has(nk) && !level.gooseSet.has(nk) &&
                !prep.gateSet.has(nk) && (state.visited[nk] <= maxVisit || nk === pos)) {
                _reachGenBuf[nk] = gen;
                if (state.visited[nk] === 0) freshVolume++;
                _reachQ[qTail++] = nk;
            }
        };
        if (x + 1 < w) addNeighbor(k + 1);
        if (x > 0)     addNeighbor(k - 1);
        if (y + 1 < h) addNeighbor(k + 0x10000);
        if (y > 0)     addNeighbor(k - 0x10000);
    }

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
    const hasPortal = level.portalMap.size > 0;
    if (!hasPortal) {
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
export function isConnectedForTrap(pos, state, level, prep) {
    const { w, h } = level.grid;
    const intNeeded = level.reqInt - state.ints;
    const maxVisit = intNeeded > 0 ? 1 : 0;

    _reachGen++;
    const gen = _reachGen;
    let qHead = 0, qTail = 0;
    _reachGenBuf[pos] = gen;
    _reachQ[qTail++] = pos;
    let freshVolume = 1;

    while (qHead < qTail) {
        const k = _reachQ[qHead++];
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        const portal = level.portalMap.get(k);
        if (portal) {
            const d = portal.dest;
            if (_reachGenBuf[d] !== gen && !level.blockSet.has(d) && !level.gooseSet.has(d) &&
                (state.visited[d] <= maxVisit || d === pos)) {
                _reachGenBuf[d] = gen;
                if (state.visited[d] === 0) freshVolume++;
                _reachQ[qTail++] = d;
            }
        }
        const addNeighbor = (nk) => {
            if (_reachGenBuf[nk] !== gen && !level.blockSet.has(nk) && !level.gooseSet.has(nk) &&
                !prep.gateSet.has(nk) && (state.visited[nk] <= maxVisit || nk === pos)) {
                _reachGenBuf[nk] = gen;
                if (state.visited[nk] === 0) freshVolume++;
                _reachQ[qTail++] = nk;
            }
        };
        if (x + 1 < w) addNeighbor(k + 1);
        if (x > 0)     addNeighbor(k - 1);
        if (y + 1 < h) addNeighbor(k + 0x10000);
        if (y > 0)     addNeighbor(k - 0x10000);
    }

    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && _reachGenBuf[level.mustPassKeys[i]] !== gen) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && _reachGenBuf[level.mustCrossKeys[i]] !== gen) return false;
    }
    const hasPortal = level.portalMap.size > 0;
    if (!hasPortal) {
        const rSteps = level.reqLen - getRealLengthFromState(state);
        if (freshVolume + intNeeded < rSteps) return false;
    }
    return true;
}

