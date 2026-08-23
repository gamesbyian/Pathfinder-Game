import { getNavigableDensity } from './archetype.js';
import { buildAxisApproachMap, buildDistMap, distMapToArray } from './distance.js';
import type { DistMapOpts } from './distance.js';
import { AXIS_H, AXIS_V, KEY_SPACE, NEIGHBOR_AXIS, NEIGHBOR_DX, NEIGHBOR_DY, PACK } from './encoding.js';
import { MAX_BITROW_DIM } from './topology.js';
import { keyParity } from '../domain/cell-key.js';
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
// Builds a KEY_SPACE-sized index lookup. Same "typed array beats Map.get()" rationale as
// reachBlockedArr/the dist-array mirrors below — mustPassIndex/mustCrossIndex/flipperIndexMap are
// read on every applyMove/undoMove/scoreMove call (10^6-10^7 times on beam-heavy levels). Int8 is
// sufficient: level object-count caps (max 4 must-pass, 4 must-cross, 4 flippers) are in CLAUDE.md.
//
// Stores i+1 so that ZERO means "not one of these cells", which is what a typed array already
// contains — no fill needed. The old `-1` sentinel required fill(-1) over 1,048,576 entries per
// array, four arrays per level, for a grid with at most 225 live cells (4.1% of solver CPU on a
// short-solve workload). Every read site subtracts 1, which maps an absent cell's 0 back to -1 —
// so all the existing `!== -1` comparisons stay correct verbatim. Same zero-means-absent trick as
// distance.ts's distMapToArray and prep's staticNeighborKeys.
function buildIndexArr(keys: number[]): Int8Array {
    const arr = new Int8Array(KEY_SPACE);
    for (let i = 0; i < keys.length; i++) arr[keys[i]] = i + 1;
    return arr;
}

export function prepLevel(level: NormalizedLevel, opts: { allowFalseGoalNeighbors?: boolean } = {}): PrepLevel {
    const prep = {} as PrepLevel;
    // Fresh, isolated per-solve work counter — see PrepLevel._workMeter's own comment. Always
    // initialized here, unconditionally, so no consumer can ever observe an unset one.
    prep._workMeter = { units: 0 };
    prep.gridW = level.grid.w;
    // Threaded through every buildDistMap/buildAxisApproachMap call below so these distance
    // heuristics agree with staticNeighborKeys' own false-goal allowance (same opts field) —
    // trap search's prep (prepLevel(level, { allowFalseGoalNeighbors: true })) needs its distance
    // maps to treat false goals as passable exactly where its move generation does, or its own
    // lower-bound pruning would reject reachable false-goal candidates as a false negative.
    const distOpts: DistMapOpts = { allowFalseGoalNeighbors: opts.allowFalseGoalNeighbors };
    prep.distMap        = buildDistMap(level, [level.goalKey], distOpts);
    // Guidance-only sibling of distMap/goalDistArr: same sources, but with legacyGuidanceRouting
    // so geese/gates/false-goals are ordinary passable through-nodes again (the pre-6f00baf
    // behavior) — see DistMapOpts.legacyGuidanceRouting's own comment. Gated by
    // SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE (scoring.ts); always computed (one extra cheap
    // per-level BFS) so the ablation flag can be flipped without changing prep's shape.
    prep.guidanceGoalDistArr = distMapToArray(
        buildDistMap(level, [level.goalKey], { ...distOpts, legacyGuidanceRouting: true }),
        level.grid.w, level.grid.h);
    prep.mustPassIndex  = buildIndexArr(level.mustPassKeys);
    prep.mustCrossIndex = buildIndexArr(level.mustCrossKeys);
    prep.mustPassDistMaps  = level.mustPassKeys.map(k => buildDistMap(level, [k], distOpts));
    prep.mustCrossDistMaps = level.mustCrossKeys.map(k => buildDistMap(level, [k], distOpts));
    // Flat presence flag instead of Set<number>: read per-candidate in scoreMove/applyMove
    // hot loops (intersection-setup scoring, "was this an intersection" check), same
    // "typed array beats Set.has()" rationale as reachBlockedArr below. Gate counts are
    // small, but call volume is once per candidate on every level.
    prep.gateFlags = new Uint8Array(KEY_SPACE);
    for (const k of level.gateKeys) prep.gateFlags[k] = 1;
    // Statically untraversable flipping filters. A flipper must be crossed STRAIGHT THROUGH — its
    // entry and exit axis must match (no turning on it, see search-state.ts's isMoveDynamicallyValid),
    // and the axis-reuse rule forbids backing out the way you came — so crossing it needs BOTH
    // neighbours on one axis to be enterable. A flipper with neither axis available (a grid corner,
    // or blocks closing off both axes) can therefore be entered but never left, and it can never be
    // the path's end: one object per cell means it is not the goal, not a gate, and not a portal
    // destination. Entering one is always fatal, so treating it as impassable is sound.
    //
    // Deliberately CONSERVATIVE: only blocks disqualify a neighbour. Geese/false goals are ignored
    // by the solver anyway, gates can legitimately serve as the entry side (the path starts there),
    // and a neighbouring flipper's own parity is dynamic — so this marks strictly fewer cells dead
    // than truly are, which is the safe direction. Verified against every stored path in corpus-1
    // and corpus-2 (17,398 paths): none visits a cell this marks dead, and none turns on a flipper.
    //
    // USED FOR CONNECTIVITY ONLY, deliberately — see reachBlockedArr below. Also excluding these
    // cells from staticNeighborKeys is equally sound (entering one is always fatal) but was measured
    // NET-NEGATIVE and is intentionally not done: it saves only ~1 wasted node per entry, which is
    // below the noise floor of the search-order perturbation it causes, and on corpus-1's 21
    // affected levels it cost R01478 (a 276k-node solve became a >120M-node failure, unrecovered at
    // 9x budget and with the extra-budget passes on) for no gain anywhere. Connectivity-only is
    // flat: same 12/21 solves, +0.005% nodes. Don't "finish the job" in move generation without
    // re-measuring both halves separately.
    const _deadFlipperKeys = new Set<number>();
    if (level.flippingFilterMap.size > 0) {
        const { w: _fw, h: _fh } = level.grid;
        const _open = (x: number, y: number) =>
            x >= 0 && y >= 0 && x < _fw && y < _fh && !level.blockSet.has(PACK(x, y));
        for (const fKey of level.flippingFilterMap.keys()) {
            const fx = fKey & 0xFFFF, fy = (fKey >>> 16) & 0xFFFF;
            if (!(_open(fx - 1, fy) && _open(fx + 1, fy)) && !(_open(fx, fy - 1) && _open(fx, fy + 1))) {
                _deadFlipperKeys.add(fKey);
            }
        }
    }
    prep.deadFlipperKeys = _deadFlipperKeys;

    // Unified impassable-for-BFS lookup (blocks ∪ geese ∪ gates), used by the connectivity-prune
    // BFS in topology.ts. Same "typed array beats Map.get()" rationale as the dist-array mirrors
    // below — isConnected() is the hottest single call in beam search (10^5-10^6 calls on
    // beam-heavy levels), and this collapses its per-neighbor 3x Set.has() into 1 array read.
    prep.reachBlockedArr = new Uint8Array(KEY_SPACE);
    for (const k of level.blockSet) prep.reachBlockedArr[k] = 1;
    // Impassable for the connectivity BFS too: counting a cell the path can never leave toward the
    // goal inflates freshVolume and weakens the volume prune.
    for (const k of _deadFlipperKeys) prep.reachBlockedArr[k] = 1;
    for (const k of level.gooseSet) prep.reachBlockedArr[k] = 1;
    for (const k of level.gateKeys) prep.reachBlockedArr[k] = 1;
    // Row-bitmap mirror of the same data for that BFS's bit-parallel form (topology.ts): one
    // 32-bit word per grid row, bit x = "(x, y) is passable". Built once per level here so the
    // flood fill only has to overlay the per-call dynamic part (visit counts, used flippers).
    prep.reachPassableRows = null;
    if (level.grid.w <= MAX_BITROW_DIM && level.grid.h <= MAX_BITROW_DIM) {
        const rows = new Uint32Array(level.grid.h);
        for (let y = 0; y < level.grid.h; y++) {
            let m = 0;
            for (let x = 0; x < level.grid.w; x++) if (prep.reachBlockedArr[PACK(x, y)] === 0) m |= (1 << x);
            rows[y] = m;
        }
        prep.reachPassableRows = rows;
    }
    // mustPassGoalDist: BFS distance from each must-pass to goal
    prep.mustPassToGoalDist = level.mustPassKeys.map(k => prep.distMap.get(k) ?? Infinity);
    // mustCrossToGoalDist: BFS distance from each must-cross to goal
    prep.mustCrossToGoalDist = level.mustCrossKeys.map(k => prep.distMap.get(k) ?? Infinity);
    // Objectives = must-pass + must-cross (for scoring)
    prep.objectiveKeys = Array.from(new Set([...level.mustPassKeys, ...level.mustCrossKeys]));
    prep.objectiveDistMaps = prep.objectiveKeys.map(k => buildDistMap(level, [k], distOpts));

    // Fast typed-array mirrors of the most-accessed dist maps.
    // Uint16Array[packedKey] instead of Map.get() cuts per-lookup cost ~10x.
    prep.goalDistArr  = distMapToArray(prep.distMap, level.grid.w, level.grid.h);
    prep.mpDistArrs   = prep.mustPassDistMaps.map(map => distMapToArray(map, level.grid.w, level.grid.h));
    prep.mcDistArrs   = prep.mustCrossDistMaps.map(map => distMapToArray(map, level.grid.w, level.grid.h));
    prep.objDistArrs  = prep.objectiveDistMaps.map(map => distMapToArray(map, level.grid.w, level.grid.h));

    // Approach-cell distance maps for must-cross 2nd visits.
    // After the 1st pass via axis A, the 2nd pass must enter from axis B.
    // We precompute BFS distances to the cells immediately adjacent on each axis
    // so the scorer/pruner can guide toward the correct perpendicular approach.
    // Flattened to Uint16Array (distMapToArray) — same "typed array beats Map.get()" pattern as
    // mpDistArrs/goalDistArr and the landmark maps above; this one is read in five hot-path call
    // sites across scoring.ts and lower-bounds.ts (including mcMSTLowerBound, historically ~30%
    // of repair-search's CPU before its own memoization fix), and must-cross ≥2 is part of the
    // repair fallback's own feature gate, so it's live on most of the current slow tail. `vEmpty`/
    // `hEmpty` record whether buildAxisApproachMap found zero valid approach sources at all (grid
    // edge / all-blocked) — distinct from "sources exist but this particular query is unreachable"
    // (an all-0xFFFF array can't tell those apart on its own; the read sites branch on this exact
    // distinction, so it's computed once here rather than reconstructed per read).
    // Excludes gates too (matching _ffFilter below): a gate can't be re-entered mid-route, so it
    // can never actually serve as a second-visit approach side, the same reason _ffFilter already
    // excludes gates for flippers. False goals are excluded for the same reason buildDistMap's own
    // isImpassable does — landing on one locks the path, so it can't be an approach side either.
    const _mcFilter = (k: number) => !level.blockSet.has(k) && !level.gooseSet.has(k) &&
        !level.gateKeys.includes(k) && (!!distOpts.allowFalseGoalNeighbors || !level.falseGoalKeys.has(k));
    prep.mcApproachDistMaps = level.mustCrossKeys.map(mcKey => {
        const mcX = mcKey & 0xFFFF, mcY = (mcKey >>> 16) & 0xFFFF;
        const vMap = buildAxisApproachMap(level, mcX, mcY, AXIS_V, _mcFilter, distOpts);
        const hMap = buildAxisApproachMap(level, mcX, mcY, AXIS_H, _mcFilter, distOpts);
        return {
            v: distMapToArray(vMap, level.grid.w, level.grid.h), vEmpty: vMap.size === 0,
            h: distMapToArray(hMap, level.grid.w, level.grid.h), hEmpty: hMap.size === 0,
        };
    });

    // Portal-parity guidance: which portal pairs have MISMATCHED cell parity ("twist" portals).
    // Every regular (non-portal) move flips grid parity by construction, so a portal-less path of
    // EXACTLY reqLen moves can only reach a cell whose parity is fixed by gate parity ⊕ (reqLen
    // mod 2) — if that doesn't match the goal's actual parity, no portal-less path of that exact
    // length exists, full stop (not a heuristic — see data/stress/README.md's S043 derivation). Using
    // a portal whose two terminals have DIFFERENT parity injects exactly the one extra flip such
    // a level needs; a same-parity portal (twist=0) can't help fix a mismatch at all. Only twist
    // portals are recorded here — scoreMove uses this only to guide (never to hard-prune, so an
    // error here can only cost missed guidance, never unsoundness) the search toward one of them
    // when the level's own gate/goal/reqLen parity relationship requires it. Flattened to
    // Uint16Array (distMapToArray) — same "typed array beats Map.get()" pattern as the other
    // dist maps above; low call-frequency in isolation (once per move, only on twist-portal
    // levels) but the same mechanical, zero-risk win, so no reason to leave it as the odd one out.
    prep.parityPortalDistMaps = [];
    const _seenPortalPairs = new Set<number>();
    for (const [a, info] of level.portalMap.entries()) {
        const b = info.dest;
        if (_seenPortalPairs.has(b)) continue; // each pair appears as both a→b and b→a
        _seenPortalPairs.add(a);
        if (keyParity(a) === keyParity(b)) continue; // twist=0: doesn't fix a parity mismatch
        prep.parityPortalDistMaps.push({ a, b, dist: distMapToArray(buildDistMap(level, [a, b], distOpts), level.grid.w, level.grid.h) });
    }

    // Pairwise BFS distances between must-cross cells (for MST lower bound). Flat row-major
    // Float64Array (mcPairDist[i*mcN+j] = dist from mustCrossKeys[i] to mustCrossKeys[j]) rather
    // than an array-of-arrays: this is read in mcMSTLowerBound's O(k²) inner loop, one of the
    // hottest functions in repair search (profiling: ~30% of repair's total CPU time), and a
    // flat typed array avoids the double indirection + bounds check of `arr[i][j]`.
    const mcN = level.mustCrossKeys.length;
    prep.mcPairDist = new Float64Array(mcN * mcN);
    for (let i = 0; i < mcN; i++) {
        for (let j = 0; j < mcN; j++) {
            prep.mcPairDist[i * mcN + j] = i === j ? 0 : (prep.mustCrossDistMaps[j].get(level.mustCrossKeys[i]) ?? Infinity);
        }
    }

    // Pairwise BFS distances between must-pass cells (for MST lower bound). Same flat-array
    // reasoning as mcPairDist above — mpMSTLowerBound was the single hottest function measured.
    const mpN = level.mustPassKeys.length;
    prep.mpPairDist = new Float64Array(mpN * mpN);
    for (let i = 0; i < mpN; i++) {
        for (let j = 0; j < mpN; j++) {
            prep.mpPairDist[i * mpN + j] = i === j ? 0 : (prep.mustPassDistMaps[j].get(level.mustPassKeys[i]) ?? Infinity);
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
    prep.flipperIndexMap  = buildIndexArr(_fKeys);
    prep.flipperKeys      = new Int32Array(_fKeys);
    prep.flipperInitAxes  = new Uint8Array(_fKeys.map(k => level.flippingFilterMap.get(k) ?? 0));

    // Flipper approach distance maps for urgency scoring.
    // Two entries per flipper (indexed by fi):
    //   flipperApproachEven[fi]: BFS from approach cells when usedCount is even (axis = initial)
    //   flipperApproachOdd[fi]:  BFS from approach cells when usedCount is odd  (axis = flipped)
    // Approach cells are the cells adjacent to the flipper in its required entry direction,
    // excluding blocks, other flippers, and gate cells (gates can't be re-entered as approach).
    // `empty` = no valid approach source exists at all (the flipper is inaccessible at that
    // parity without going through another flipper first) — see mcApproachDistMaps's identical
    // vEmpty/hEmpty pattern above for why this is tracked separately from the array itself.
    // Flattened to Uint16Array (distMapToArray): this was the one remaining distance-map family
    // never run through that conversion — every sibling (mpDistArrs, mcDistArrs,
    // mcApproachDistMaps, parityPortalDistMaps, the landmark maps below) already went through
    // it; read once per flipper per candidate in scoreMove's hot per-candidate loop whenever a
    // level has flipping filters, so it was the odd one out, not a deliberate exception.
    prep.flipperApproachEven = [];
    prep.flipperApproachOdd  = [];
    if (_fKeys.length > 0) {
        const _fGateSet = new Set(level.gateKeys);
        // False goals excluded for the same reason _mcFilter above now is: landing on one locks
        // the path, so it can never serve as a second-visit approach side.
        const _ffFilter = (k: number) => !level.blockSet.has(k) && !level.flippingFilterMap.has(k) && !_fGateSet.has(k) &&
            (!!distOpts.allowFalseGoalNeighbors || !level.falseGoalKeys.has(k));
        for (let fi = 0; fi < _fKeys.length; fi++) {
            const fKey = _fKeys[fi];
            const fx = fKey & 0xFFFF, fy = (fKey >>> 16) & 0xFFFF;
            const initAx = prep.flipperInitAxes[fi];
            for (const parityOdd of [false, true]) {
                const ax = parityOdd ? (initAx === AXIS_H ? AXIS_V : AXIS_H) : initAx;
                const dmap = buildAxisApproachMap(level, fx, fy, ax, _ffFilter, distOpts);
                const entry = { dist: distMapToArray(dmap, level.grid.w, level.grid.h), empty: dmap.size === 0 };
                if (parityOdd) prep.flipperApproachOdd.push(entry);
                else           prep.flipperApproachEven.push(entry);
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
    // surroundNeighborDistMaps[i][j]: BFS distance array (O(1) lookup) from each valid neighbor —
    // flattened to Uint16Array via distMapToArray, same pattern as mpDistArrs/goalDistArr above;
    // this and the two landmark map families below used to stay as Map<key,dist> (a hash lookup
    // in scoreMove's hot per-candidate loop) even after that pattern was established for must-pass
    // — an inconsistency, not a deliberate choice (must-turn/adjacent-turn/surround scoring were
    // all added later). Pure representation change: identical values, O(1) array read instead of
    // a hash lookup.
    const _surroundKeys = level.surroundKeys || [];
    const snN = _surroundKeys.length;
    prep.surroundNeighborIndex   = new Map();
    prep.surroundInitNeighborMasks = new Uint8Array(snN);
    prep.surroundNeighborKeys      = [];       // [i][j] = key of j-th valid neighbor
    prep.surroundNeighborGoalDist  = [];       // [i][j] = BFS dist from neighbor to goal
    prep.surroundNeighborDistMaps  = [];       // [i][j] = BFS dist array from neighbor
    prep.initialSurroundMask = snN > 0 ? ((1 << snN) - 1) : 0;
    for (let i = 0; i < snN; i++) {
        const sk  = _surroundKeys[i];
        const sx  = sk & 0xFFFF, sy = (sk >>> 16) & 0xFFFF;
        const nbrKeys: number[] = [];
        const nbrGoalDists: number[] = [];
        const nbrDistMaps: Uint16Array[] = [];
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
            nbrDistMaps.push(distMapToArray(buildDistMap(level, [nk], distOpts), level.grid.w, level.grid.h));
        }
        // initMask: all dense-index bits set (one per valid neighbor)
        prep.surroundInitNeighborMasks[i] = nbrKeys.length > 0 ? (1 << nbrKeys.length) - 1 : 0;
        prep.surroundNeighborKeys.push(nbrKeys);
        prep.surroundNeighborGoalDist.push(nbrGoalDists);
        prep.surroundNeighborDistMaps.push(nbrDistMaps);
    }

    // Adjacent-turn objects: impassable cells where path must turn in an adjacent cell.
    // adjTurnCellIndex: Map<cell_key, [{i, dir}]> — cells that are adjacent to adj-turn obj i.
    // adjTurnDistMaps[i]: BFS dist array from all valid adjacent cells of obj i (multi-source),
    // flattened to Uint16Array — see surroundNeighborDistMaps' comment above.
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
        prep.adjTurnDistMaps.push(distMapToArray(adjSources.length > 0 ? buildDistMap(level, adjSources, distOpts) : new Map(), level.grid.w, level.grid.h));
        prep.adjTurnGoalDist.push(minGoal);
    }

    // Must-turn cells (passable must-pass cells that require a direction change).
    // Built from level.mustPassTurnDirs (Map<key, 'either'|'cw'|'ccw'>).
    const mtEntries = level.mustPassTurnDirs ? [...level.mustPassTurnDirs.entries()] : [];
    prep.mustTurnKeys        = mtEntries.map(([k]) => k);
    prep.mustTurnDirs        = mtEntries.map(([, d]) => d);
    prep.mustTurnCellIndex   = buildIndexArr(prep.mustTurnKeys);
    prep.initialMustTurnMask = mtEntries.length > 0 ? ((1 << mtEntries.length) - 1) : 0;
    // Single-source BFS distance-to-cell map per must-turn cell (mirrors mpDistArrs —
    // must-turn cells are passable single points, unlike surround/adj-turn's multi-source
    // "nearest valid neighbor" maps). Feeds scoreMove's must-turn urgency term below; without
    // it scoreMove had literally no guidance toward must-turn landmarks at all (unlike every
    // other landmark type, which all have a dedicated urgency term) — stress-corpus finding,
    // see data/stress/README.md. Flattened to Uint16Array — see surroundNeighborDistMaps' comment above.
    prep.mustTurnDistMaps = prep.mustTurnKeys.map(k => distMapToArray(buildDistMap(level, [k], distOpts), level.grid.w, level.grid.h));

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

    // Precompute static adjacency per cell. Stored as a flat, fixed-stride Int32Array, DENSE-
    // indexed via cellDenseIndex rather than directly by packed key — `staticNeighborKeys[(
    // cellDenseIndex[pos] - 1) * 4 + d]` = that direction's neighbor key PLUS ONE, or 0 if none —
    // instead of a Map<pos, Int32Array>, eliminating a per-node hash lookup in the hot
    // getNeighbors loop (direct array indexing instead). The per-direction axis (H for d=0,1;
    // V for d=2,3) doesn't need its own storage slot since it's implied by the fixed
    // direction order (NEIGHBOR_AXIS in encoding.ts) — search-state.ts derives it the same
    // way, so the two files must keep the same direction order. Excludes: blocks, geese,
    // false goals (unless trap search needs existing false goals as endpoint candidates),
    // gate cells, and neighbors that violate static (regular) filter constraints. Flipping-
    // filter and portal constraints remain dynamic.
    //
    // Dense indexing (2026-08-23): this used to be a flat KEY_SPACE * 4 Int32Array (16.8 MB),
    // directly packed-key-indexed. A grid has at most a few hundred live (non-block/non-goose)
    // cells while KEY_SPACE is 1,048,576, so the array was >99.9% permanently-zero padding —
    // microbenchmarked at ~2ms per allocation from the array's SIZE alone (not from filling it;
    // only real cells were ever written either way, same as the "+1 bias avoids fill(-1)" note
    // below always meant). `cellDenseIndex` is the one remaining KEY_SPACE-sized array (a
    // Uint8Array, 1 MB — grid cell counts fit comfortably under 256): every packed key that is a
    // live cell maps to a dense row 0..N-1; `staticNeighborKeys` itself shrinks to N*4 slots.
    // Every direct-index consumer (prep.ts's own gateForcedFirstStepKey below, search-state.ts's
    // getNeighbors, lower-bounds.ts's two must-cross deadlock checks) resolves the dense row via
    // cellDenseIndex first. See reports/2026-08-23-dense-static-neighbor-keys.md.
    {
        const { w, h } = level.grid;
        // Stores neighbourKey+1 so that ZERO means "no neighbour in this direction" — the same
        // zero-means-absent trick distance.ts's distMapToArray uses, and for the same reason: the
        // old -1 sentinel forced `.fill(-1)` over every entry, for a grid with at most a few
        // hundred live cells. A packed key of 0 is the legitimate cell (0,0), so the sentinel
        // cannot simply be 0 — hence the +1 bias, undone at every read site.
        prep.cellDenseIndex = new Uint8Array(KEY_SPACE);
        let _liveCellCount = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const k = PACK(x, y);
                if (level.blockSet.has(k) || level.gooseSet.has(k)) continue;
                prep.cellDenseIndex[k] = ++_liveCellCount;
            }
        }
        prep.staticNeighborKeys = new Int32Array(_liveCellCount * 4);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const k = PACK(x, y);
                const denseIdx = prep.cellDenseIndex[k];
                if (denseIdx === 0) continue; // block/goose: no adjacency row (matches skip above)
                const filterFrom = level.filterMap.get(k);
                const base = (denseIdx - 1) * 4;
                for (let d = 0; d < 4; d++) {
                    const nx = x + NEIGHBOR_DX[d], ny = y + NEIGHBOR_DY[d];
                    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                    const nk = PACK(nx, ny);
                    if (level.blockSet.has(nk)) continue;
                    if (level.gooseSet.has(nk)) continue;
                    if (level.falseGoalKeys.has(nk) && !opts.allowFalseGoalNeighbors) continue;
                    if (prep.gateFlags[nk]) continue;
                    const moveAxis = NEIGHBOR_AXIS[d];
                    if (filterFrom && filterFrom !== moveAxis) continue;
                    const filterTarget = level.filterMap.get(nk);
                    if (filterTarget && filterTarget !== moveAxis) continue;
                    prep.staticNeighborKeys[base + d] = nk + 1;
                }
            }
        }
    }

    // Gate forced-first-move (reports/2026-07-31-mustcross-forced-structure.md's step 3): a gate
    // can never be re-entered, so if it is orthogonally adjacent to exactly one must-cross cell,
    // it can only ever serve as that cell's pass-entry via the FIRST move — any other first move
    // strands the gate forever, and the must-cross derivation requires ALL FOUR neighbors
    // (gate included) to be traversed as part of one of its two straight passes. Falsified
    // against every stored solution: every gate-adjacent-to-must-cross instance in the corpus
    // starts with exactly this move (96/96 as of that report). "Exactly one neighbor", not "any":
    // with two must-cross neighbors on a single gate the derivation still holds per-neighbor, but
    // which one wins the one available first move isn't determined by this rule alone, so that
    // case (none observed in the corpus) is deliberately left unforced rather than guessed.
    {
        prep.gateForcedFirstStepKey = new Map();
        for (const g of level.gateKeys) {
            const base = (prep.cellDenseIndex[g] - 1) * 4;
            let forced = -1, count = 0;
            for (let d = 0; d < 4; d++) {
                const nk = prep.staticNeighborKeys[base + d] - 1;
                if (nk < 0) continue;
                if (prep.mustCrossIndex[nk] !== 0) { forced = nk; count++; }
            }
            if (count === 1) prep.gateForcedFirstStepKey.set(g, forced);
        }
    }

    return prep;
}

