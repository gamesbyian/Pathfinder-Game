import { getNavigableDensity } from './archetype.js';
import { buildAxisApproachMap, buildDistMap, distMapToArray } from './distance.js';
import { AXIS_H, AXIS_V, KEY_SPACE, PACK } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel } from './types.js';

/**
 * navDensity at/above which a level is treated as near-Hamiltonian for DFS must-pass scoring:
 * `mustMaskForDFS` is set to 0 (rather than initialMustMask) so must-pass *urgency* scoring does
 * not disrupt the tightly-ordered dense traversal. Must-pass *correctness* is still enforced via
 * `mpVisitedMask` in isSolution/pruning — this only affects move ordering. (A former "Common
 * Gotcha"; now named here so the rule lives with the code, not only in prose.)
 */
export const DENSE_LEVEL_NAV_DENSITY = 0.70;

/**
 * Precompute per-level solver data (distance maps, masks, static adjacency, landmark indexes).
 */
export function prepLevel(level: NormalizedLevel, opts: { allowFalseGoalNeighbors?: boolean } = {}): PrepLevel {
    const prep = {} as PrepLevel;
    prep.distMap        = buildDistMap(level, [level.goalKey]);
    prep.mustPassIndex  = new Map(level.mustPassKeys.map((k, i): [number, number] => [k, i]));
    prep.mustCrossIndex = new Map(level.mustCrossKeys.map((k, i): [number, number] => [k, i]));
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
    prep.objectiveKeyToIndex = new Map(prep.objectiveKeys.map((k, i): [number, number] => [k, i]));

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
    const _mcFilter = (k: number) => !level.blockSet.has(k) && !level.gooseSet.has(k);
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
    // DFS must-pass scoring: sparse/medium-density levels (< DENSE_LEVEL_NAV_DENSITY) get full must-pass
    // urgency scoring via initialMustMask so the DFS is guided toward must-pass cells.
    // Near-Hamiltonian levels (density ≥ 0.70) keep mustMask=0 to
    // avoid disrupting the tightly-ordered dense traversal; mpVisitedMask still enforces
    // must-pass correctness in isSolution/pruning for those levels.
    prep.mustMaskForDFS = (getNavigableDensity(level) >= DENSE_LEVEL_NAV_DENSITY) ? 0 : prep.initialMustMask;

    // Flipper index data for the global-flip mechanism.
    const _fKeys = [...level.flippingFilterMap.keys()];
    prep.flipperIndexMap  = new Map(_fKeys.map((k, i): [number, number] => [k, i]));
    prep.flipperInitAxes  = new Uint8Array(_fKeys.map(k => level.flippingFilterMap.get(k) ?? 0));

    // Flipper approach distance maps for urgency scoring.
    // Two entries per flipper (indexed by fi):
    //   flipperApproachEven[fi]: BFS from approach cells when usedCount is even (axis = initial)
    //   flipperApproachOdd[fi]:  BFS from approach cells when usedCount is odd  (axis = flipped)
    // Approach cells are the cells adjacent to the flipper in its required entry direction,
    // excluding blocks, other flippers, and gate cells (gates can't be re-entered as approach).
    // Empty map means the flipper is inaccessible at that parity without going through another
    // flipper first (e.g. a flipper only reachable at even parity via another flipper).
    prep.flipperApproachEven = [];
    prep.flipperApproachOdd  = [];
    if (_fKeys.length > 0) {
        const _fGateSet = new Set(level.gateKeys);
        const _ffFilter = (k: number) => !level.blockSet.has(k) && !level.flippingFilterMap.has(k) && !_fGateSet.has(k);
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

    // ─── Landmark precomputation ──────────────────────────────────────────────

    // 8-direction deltas: N, NE, E, SE, S, SW, W, NW (y increases downward)
    const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
    const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
    const { w: _gw, h: _gh } = level.grid;
    const _isImpassable = (k: number) => level.blockSet.has(k) || level.gooseSet.has(k);

    // Surround cells: path must visit all 8 reachable neighbors.
    // surroundNeighborIndex: Map<cell_key, [{i, bit}]> for fast applyMove lookup.
    // surroundInitNeighborMasks[i]: Uint8, bits 0-7 set for each valid neighbor dir.
    // surroundNeighborDistMaps[i][j]: BFS Map<key, dist> from each valid neighbor.
    const _surroundKeys = level.surroundKeys || [];
    const snN = _surroundKeys.length;
    prep.surroundNeighborIndex   = new Map();
    prep.surroundInitNeighborMasks = new Uint8Array(snN);
    prep.surroundNeighborKeys      = [];       // [i][j] = key of j-th valid neighbor
    prep.surroundNeighborGoalDist  = [];       // [i][j] = BFS dist from neighbor to goal
    prep.surroundNeighborDistMaps  = [];       // [i][j] = BFS Map<key, dist> from neighbor
    prep.initialSurroundMask = snN > 0 ? ((1 << snN) - 1) : 0;
    for (let i = 0; i < snN; i++) {
        const sk  = _surroundKeys[i];
        const sx  = sk & 0xFFFF, sy = (sk >>> 16) & 0xFFFF;
        const nbrKeys: number[] = [];
        const nbrGoalDists: number[] = [];
        const nbrDistMaps: Map<number, number>[] = [];
        for (let d = 0; d < 8; d++) {
            const nx = sx + _dx8[d], ny = sy + _dy8[d];
            if (nx < 0 || ny < 0 || nx >= _gw || ny >= _gh) continue;
            const nk = PACK(nx, ny);
            if (_isImpassable(nk)) continue;
            // bit = dense-index bit (0,1,2,...) NOT direction bit — simplifies lower-bound iteration
            const jIdx = nbrKeys.length;
            const bit = 1 << jIdx;
            const existing = prep.surroundNeighborIndex.get(nk) || [];
            existing.push({ i, bit });
            prep.surroundNeighborIndex.set(nk, existing);
            nbrKeys.push(nk);
            nbrGoalDists.push(prep.distMap.get(nk) ?? Infinity);
            nbrDistMaps.push(buildDistMap(level, [nk]));
        }
        // initMask: all dense-index bits set (one per valid neighbor)
        prep.surroundInitNeighborMasks[i] = nbrKeys.length > 0 ? (1 << nbrKeys.length) - 1 : 0;
        prep.surroundNeighborKeys.push(nbrKeys);
        prep.surroundNeighborGoalDist.push(nbrGoalDists);
        prep.surroundNeighborDistMaps.push(nbrDistMaps);
    }

    // Adjacent-turn objects: impassable cells where path must turn in an adjacent cell.
    // adjTurnCellIndex: Map<cell_key, [{i, dir}]> — cells that are adjacent to adj-turn obj i.
    // adjTurnDistMaps[i]: BFS Map<key, dist> from all valid adjacent cells of obj i (multi-source).
    const _adjTurnKeys = level.adjacentTurnKeys || [];
    const _adjTurnDirs = level.adjacentTurnDirs || [];
    const atN = _adjTurnKeys.length;
    prep.adjTurnCellIndex = new Map();
    prep.adjTurnDistMaps  = [];       // dist to nearest adjacent cell of obj i
    prep.adjTurnGoalDist  = [];       // min dist from any valid adj cell to goal
    prep.initialAdjTurnMask = atN > 0 ? ((1 << atN) - 1) : 0;
    for (let i = 0; i < atN; i++) {
        const atk  = _adjTurnKeys[i];
        const atx  = atk & 0xFFFF, aty = (atk >>> 16) & 0xFFFF;
        const dir  = _adjTurnDirs[i] || 'either';
        const adjSources: number[] = [];
        let minGoal = Infinity;
        for (let d = 0; d < 8; d++) {
            const nx = atx + _dx8[d], ny = aty + _dy8[d];
            if (nx < 0 || ny < 0 || nx >= _gw || ny >= _gh) continue;
            const nk = PACK(nx, ny);
            if (_isImpassable(nk)) continue;
            const existing = prep.adjTurnCellIndex.get(nk) || [];
            existing.push({ i, dir });
            prep.adjTurnCellIndex.set(nk, existing);
            adjSources.push(nk);
            const gd = prep.distMap.get(nk) ?? Infinity;
            if (gd < minGoal) minGoal = gd;
        }
        // Multi-source BFS from all valid adjacent cells → approachDist[pos] = dist to nearest adj cell
        prep.adjTurnDistMaps.push(adjSources.length > 0 ? buildDistMap(level, adjSources) : new Map());
        prep.adjTurnGoalDist.push(minGoal);
    }

    // Must-turn cells (passable must-pass cells that require a direction change).
    // Built from level.mustPassTurnDirs (Map<key, 'either'|'cw'|'ccw'>).
    const mtEntries = level.mustPassTurnDirs ? [...level.mustPassTurnDirs.entries()] : [];
    prep.mustTurnKeys        = mtEntries.map(([k]) => k);
    prep.mustTurnDirs        = mtEntries.map(([, d]) => d);
    prep.mustTurnCellIndex   = new Map(mtEntries.map(([k], idx): [number, number] => [k, idx]));
    prep.initialMustTurnMask = mtEntries.length > 0 ? ((1 << mtEntries.length) - 1) : 0;

    // Fast path flag: true only when the level has any landmark constraints.
    // Avoids overhead in applyMove/undoMove for the 147 existing non-landmark levels.
    prep.hasLandmarkConstraints = prep.initialSurroundMask !== 0
        || prep.initialMustTurnMask !== 0
        || prep.initialAdjTurnMask  !== 0;

    // Cells that can never be valid false-goal (trap spot) locations:
    // goal, gates, must-pass, must-cross, filters, flipping filters, portal terminals.
    // Also includes impassable landmark cells (already in blockSet, but explicit for clarity).
    // A false goal cannot share a cell with any other object.
    prep.trapInvalidSet = new Set([
        level.goalKey,
        ...level.gateKeys,
        ...level.mustPassKeys,
        ...level.mustCrossKeys,
        ...(level.surroundKeys     || []),
        ...(level.adjacentTurnKeys || []),
        ...level.filterMap.keys(),
        ...level.flippingFilterMap.keys(),
        ...level.portalMap.keys(),
    ]);

    // Precompute static adjacency per cell. Stored as a flat Int32Array of
    // [nk, moveAxis, nk, moveAxis, ...] pairs, eliminating repeated bounds/set
    // checks in the hot getNeighbors loop. Excludes: blocks, geese, false goals
    // (unless trap search needs existing false goals as endpoint candidates), gate cells,
    // and neighbors that violate static (regular) filter constraints.
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
                    if (level.falseGoalKeys.has(nk) && !opts.allowFalseGoalNeighbors) continue;
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

