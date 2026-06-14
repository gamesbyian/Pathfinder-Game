import { getNavigableDensity } from './archetype.js';
import { buildAxisApproachMap, buildDistMap, distMapToArray } from './distance.js';
import { AXIS_H, AXIS_V, KEY_SPACE, PACK } from './encoding.js';

export function prepLevel(level) {
    const prep = {};
    prep.distMap        = buildDistMap(level, [level.goalKey]);
    prep.mustPassIndex  = new Map(level.mustPassKeys.map((k, i) => [k, i]));
    prep.mustCrossIndex = new Map(level.mustCrossKeys.map((k, i) => [k, i]));
    prep.mustPassDistMaps  = level.mustPassKeys.map(k => buildDistMap(level, [k]));
    prep.mustCrossDistMaps = level.mustCrossKeys.map(k => buildDistMap(level, [k]));
    prep.gateSet = new Set(level.gateKeys);
    // mustPassGoalDist: BFS distance from each must-pass to goal
    prep.mustPassToGoalDist = level.mustPassKeys.map(k => prep.distMap.get(k) ?? Infinity);
    // mustCrossToGoalDist: BFS distance from each must-cross to goal
    prep.mustCrossToGoalDist = level.mustCrossKeys.map(k => prep.distMap.get(k) ?? Infinity);
    // Objectives = must-pass + must-cross (for scoring)
    prep.objectiveKeys = Array.from(new Set([...level.mustPassKeys, ...level.mustCrossKeys]));
    prep.objectiveDistMaps = prep.objectiveKeys.map(k => buildDistMap(level, [k]));
    prep.objectiveKeyToIndex = new Map(prep.objectiveKeys.map((k, i) => [k, i]));

    // Fast typed-array mirrors of the most-accessed dist maps.
    // Uint16Array[packedKey] instead of Map.get() cuts per-lookup cost ~10x.
    prep.goalDistArr  = distMapToArray(prep.distMap, KEY_SPACE);
    prep.mpDistArrs   = prep.mustPassDistMaps.map(map => distMapToArray(map, KEY_SPACE));
    prep.mcDistArrs   = prep.mustCrossDistMaps.map(map => distMapToArray(map, KEY_SPACE));
    prep.objDistArrs  = prep.objectiveDistMaps.map(map => distMapToArray(map, KEY_SPACE));

    // Approach-cell distance maps for must-cross 2nd visits.
    // After the 1st pass via axis A, the 2nd pass must enter from axis B.
    // We precompute BFS distances to the cells immediately adjacent on each axis
    // so the scorer/pruner can guide toward the correct perpendicular approach.
    const _mcFilter = k => !level.blockSet.has(k) && !level.gooseSet.has(k);
    prep.mcApproachDistMaps = level.mustCrossKeys.map(mcKey => {
        const mcX = mcKey & 0xFFFF, mcY = (mcKey >>> 16) & 0xFFFF;
        return {
            v: buildAxisApproachMap(level, mcX, mcY, AXIS_V, _mcFilter),
            h: buildAxisApproachMap(level, mcX, mcY, AXIS_H, _mcFilter),
        };
    });

    // Pairwise BFS distances between must-cross cells (for MST lower bound).
    // mcPairDist[i][j] = dist from mustCrossKeys[i] to mustCrossKeys[j].
    const mcN = level.mustCrossKeys.length;
    prep.mcPairDist = [];
    for (let i = 0; i < mcN; i++) {
        prep.mcPairDist[i] = [];
        for (let j = 0; j < mcN; j++) {
            prep.mcPairDist[i][j] = i === j ? 0 : (prep.mustCrossDistMaps[j].get(level.mustCrossKeys[i]) ?? Infinity);
        }
    }

    // Pairwise BFS distances between must-pass cells (for MST lower bound).
    const mpN = level.mustPassKeys.length;
    prep.mpPairDist = [];
    for (let i = 0; i < mpN; i++) {
        prep.mpPairDist[i] = [];
        for (let j = 0; j < mpN; j++) {
            prep.mpPairDist[i][j] = i === j ? 0 : (prep.mustPassDistMaps[j].get(level.mustPassKeys[i]) ?? Infinity);
        }
    }

    // Cache initial BigInt masks so createState / _beamResetState avoid recomputing them.
    const _mpN = level.mustPassKeys.length, _mcN = level.mustCrossKeys.length;
    prep.initialMustMask      = _mpN > 0 ? ((1 << _mpN) - 1) : 0;
    prep.initialMustCrossMask = _mcN > 0 ? ((1 << _mcN) - 1) : 0;
    // DFS must-pass scoring: sparse/medium-density levels (< 0.70) get full must-pass
    // urgency scoring via initialMustMask so the DFS is guided toward must-pass cells.
    // Near-Hamiltonian levels (density ≥ 0.70, e.g. L26 at 0.82) keep mustMask=0 to
    // avoid disrupting the tightly-ordered dense traversal; mpVisitedMask still enforces
    // must-pass correctness in isSolution/pruning for those levels.
    prep.mustMaskForDFS = (getNavigableDensity(level) >= 0.70) ? 0 : prep.initialMustMask;

    // Flipper index data for the global-flip mechanism.
    const _fKeys = [...level.flippingFilterMap.keys()];
    prep.flipperIndexMap  = new Map(_fKeys.map((k, i) => [k, i]));
    prep.flipperInitAxes  = new Uint8Array(_fKeys.map(k => level.flippingFilterMap.get(k)));

    // Flipper approach distance maps for urgency scoring.
    // Two entries per flipper (indexed by fi):
    //   flipperApproachEven[fi]: BFS from approach cells when usedCount is even (axis = initial)
    //   flipperApproachOdd[fi]:  BFS from approach cells when usedCount is odd  (axis = flipped)
    // Approach cells are the cells adjacent to the flipper in its required entry direction,
    // excluding blocks, other flippers, and gate cells (gates can't be re-entered as approach).
    // Empty map means the flipper is inaccessible at that parity without going through another
    // flipper first (e.g. F1 in L140 at even parity: only reachable via F2 from the west).
    prep.flipperApproachEven = [];
    prep.flipperApproachOdd  = [];
    if (_fKeys.length > 0) {
        const _fGateSet = new Set(level.gateKeys);
        const _ffFilter = k => !level.blockSet.has(k) && !level.flippingFilterMap.has(k) && !_fGateSet.has(k);
        for (let fi = 0; fi < _fKeys.length; fi++) {
            const fKey = _fKeys[fi];
            const fx = fKey & 0xFFFF, fy = (fKey >>> 16) & 0xFFFF;
            const initAx = prep.flipperInitAxes[fi];
            for (const parityOdd of [false, true]) {
                const ax = parityOdd ? (initAx === AXIS_H ? AXIS_V : AXIS_H) : initAx;
                const dmap = buildAxisApproachMap(level, fx, fy, ax, _ffFilter);
                if (parityOdd) prep.flipperApproachOdd.push(dmap);
                else           prep.flipperApproachEven.push(dmap);
            }
        }
    }

    // Cells that can never be valid false-goal (trap spot) locations:
    // goal, gates, must-pass, must-cross, filters, flipping filters, portal terminals.
    // A false goal cannot share a cell with any other object.
    prep.trapInvalidSet = new Set([
        level.goalKey,
        ...level.gateKeys,
        ...level.mustPassKeys,
        ...level.mustCrossKeys,
        ...level.filterMap.keys(),
        ...level.flippingFilterMap.keys(),
        ...level.portalMap.keys(),
    ]);

    // Precompute static adjacency per cell. Stored as a flat Int32Array of
    // [nk, moveAxis, nk, moveAxis, ...] pairs, eliminating repeated bounds/set
    // checks in the hot getNeighbors loop. Excludes: blocks, geese, false goals,
    // gate cells, and neighbors that violate static (regular) filter constraints.
    // Flipping-filter and portal constraints remain dynamic.
    {
        const { w, h } = level.grid;
        const _dx4 = [1, -1, 0, 0];
        const _dy4 = [0, 0, 1, -1];
        prep.staticNeighbors = new Map();
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const k = PACK(x, y);
                if (level.blockSet.has(k) || level.gooseSet.has(k)) continue;
                const filterFrom = level.filterMap.get(k);
                const pairs = [];
                for (let d = 0; d < 4; d++) {
                    const nx = x + _dx4[d], ny = y + _dy4[d];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const nk = PACK(nx, ny);
                    if (level.blockSet.has(nk)) continue;
                    if (level.gooseSet.has(nk)) continue;
                    if (level.falseGoalKeys.has(nk)) continue;
                    if (prep.gateSet.has(nk)) continue;
                    const moveAxis = (ny === y) ? AXIS_H : AXIS_V;
                    if (filterFrom && filterFrom !== moveAxis) continue;
                    const filterTarget = level.filterMap.get(nk);
                    if (filterTarget && filterTarget !== moveAxis) continue;
                    pairs.push(nk, moveAxis);
                }
                prep.staticNeighbors.set(k, new Int32Array(pairs));
            }
        }
    }

    return prep;
}

