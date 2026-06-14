import { AXIS_H, AXIS_NONE, AXIS_V, KEY_SPACE, popcount } from './encoding.js';

export function createState(startKey, level, prep) {
    const cn = level.mustCrossKeys.length;
    const state = {
        path: [startKey],
        visited:    new Uint16Array(KEY_SPACE),   // visit count per cell
        edgeUsage:  new Uint8Array(KEY_SPACE),    // bit1=H used, bit2=V used
        ints:       0,
        mustMask:      prep.mustMaskForDFS,        // 0 for dense levels; initialMustMask for sparse/medium
        mustCrossMask: prep.initialMustCrossMask,
        crossCounts:   new Uint8Array(cn),
        // uint32 bitmask: bit i set when mustPassKeys[i] has been visited at least once.
        // Used by isSolution, mustPassLowerBound, isConnected. For dense levels where
        // mustMask stays 0 (no scoring activation), this is the authoritative must-pass check.
        mpVisitedMask: 0,
        portalJumps:   0,
        flipperUsedMask: 0,                       // bit i set when flipper i has been used (global-flip rule)
        lastWasPortalJump: false,                 // was last move a portal jump?
    };
    state.visited[startKey] = 1;
    // Apply start-cell effects
    const mpIdx = prep.mustPassIndex.get(startKey);
    if (mpIdx !== undefined) {
        state.mustMask &= ~(1 << mpIdx);
        state.mpVisitedMask |= (1 << mpIdx);
    }
    const mcIdx = prep.mustCrossIndex.get(startKey);
    if (mcIdx !== undefined) {
        state.crossCounts[mcIdx] = 1;
        // mustCrossMask bit stays set (still need one more visit)
    }
    const _fsi = prep.flipperIndexMap.get(startKey);
    if (_fsi !== undefined) state.flipperUsedMask |= (1 << _fsi);
    return state;
}

// Apply a step to state, return undo token.
// isPortalJump: current cell has portal and target is portal.dest (0-cost step).
export function applyMove(target, state, level, prep, isPortalJump) {
    const from = state.path[state.path.length - 1];
    const prevVisited = state.visited[target];

    // Compute move axis and entry axis (for edge-usage)
    let moveAxis = AXIS_NONE;
    if (!isPortalJump) {
        const fx = from & 0xFFFF, fy = (from >>> 16) & 0xFFFF;
        const tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
        moveAxis = (ty === fy) ? AXIS_H : AXIS_V;
    }
    const axisBit = moveAxis === AXIS_H ? 1 : (moveAxis === AXIS_V ? 2 : 0);

    const prevEdgeFrom   = state.edgeUsage[from];
    const prevEdgeTarget = state.edgeUsage[target];

    // Apply visit
    state.visited[target]++;
    state.path.push(target);
    if (isPortalJump) state.portalJumps++;

    // Edge usage update (only for non-portal moves)
    if (axisBit) {
        state.edgeUsage[from]   |= axisBit;
        state.edgeUsage[target] |= axisBit;
    }

    // Intersection: non-goal, non-gate cell visited again
    const wasIntAdded = prevVisited > 0 && target !== level.goalKey && !prep.gateSet.has(target);
    if (wasIntAdded) state.ints++;

    // Must-pass: clear mustMask bit + set mpVisitedMask bit on first visit
    const prevMustMask = state.mustMask;
    const prevMpVisitedMask = state.mpVisitedMask;
    const mpIdx = prep.mustPassIndex.get(target);
    if (mpIdx !== undefined && prevVisited === 0) {
        state.mustMask &= ~(1 << mpIdx);
        state.mpVisitedMask |= (1 << mpIdx);
    }

    // Must-cross: accumulate crosses
    const prevMustCrossMask = state.mustCrossMask;
    let prevCrossCount = 0;
    const mcIdx = prep.mustCrossIndex.get(target);
    if (mcIdx !== undefined) {
        prevCrossCount = state.crossCounts[mcIdx];
        if (state.crossCounts[mcIdx] < 255) state.crossCounts[mcIdx]++;
        if (state.crossCounts[mcIdx] >= 2) state.mustCrossMask &= ~(1 << mcIdx);
    }

    // Flipping filter update (global-flip rule: mark flipper as used)
    const prevFlipperUsedMask = state.flipperUsedMask;
    if (!isPortalJump) {
        const _fi = prep.flipperIndexMap.get(target);
        if (_fi !== undefined) state.flipperUsedMask |= (1 << _fi);
    }

    const prevLastWasPortalJump = state.lastWasPortalJump;
    state.lastWasPortalJump = isPortalJump;

    return {
        target, from, moveAxis, axisBit, isPortalJump,
        prevVisited, prevEdgeFrom, prevEdgeTarget,
        wasIntAdded,
        prevMustMask, prevMpVisitedMask, mpIdx,
        prevMustCrossMask, mcIdx, prevCrossCount,
        prevFlipperUsedMask,
        prevLastWasPortalJump,
    };
}

export function undoMove(undo, state) {
    state.path.pop();
    state.visited[undo.target]    = undo.prevVisited;
    state.edgeUsage[undo.from]    = undo.prevEdgeFrom;
    state.edgeUsage[undo.target]  = undo.prevEdgeTarget;
    if (undo.isPortalJump) state.portalJumps--;
    if (undo.wasIntAdded) state.ints--;
    state.mustMask          = undo.prevMustMask;
    state.mpVisitedMask     = undo.prevMpVisitedMask;
    state.mustCrossMask     = undo.prevMustCrossMask;
    if (undo.mcIdx !== undefined) state.crossCounts[undo.mcIdx] = undo.prevCrossCount;
    state.flipperUsedMask   = undo.prevFlipperUsedMask;
    state.lastWasPortalJump = undo.prevLastWasPortalJump;
}

// ─── Neighbour generation ─────────────────────────────────────────────────────

// Returns an array of valid next-cell keys from `pos` in `state`.
// Portal entries yield ONLY the portal destination (forced teleport).
// `arrivedViaPortal` prevents chaining teleports.
// Uses precomputed staticNeighbors from prepLevel; only dynamic checks run here.
export function getNeighbors(pos, state, level, prep) {
    const portal = level.portalMap.get(pos);
    const arrivedViaPortal = state.lastWasPortalJump;

    // Portal is forced unless we just arrived here via a portal jump
    if (portal && !arrivedViaPortal) {
        const dest = portal.dest;
        if (dest >= 0 && !level.blockSet.has(dest) && !level.gooseSet.has(dest)) return [dest];
        return [];
    }

    // Entry axis of pos (needed for turning check and flipping-filter check)
    const pathLen = state.path.length;
    let entryAxis = AXIS_NONE;
    if (pathLen >= 2 && !arrivedViaPortal) {
        const prev = state.path[pathLen - 2];
        const py = (prev >>> 16) & 0xFFFF;
        const y  = (pos  >>> 16) & 0xFFFF;
        entryAxis = (py === y) ? AXIS_H : AXIS_V;
    }

    const staticNbList = prep.staticNeighbors.get(pos);
    if (!staticNbList || staticNbList.length === 0) return [];

    const candidates = [];
    for (let si = 0; si < staticNbList.length; si += 2) {
        const nk       = staticNbList[si];
        const moveAxis = staticNbList[si + 1];
        if (isMoveDynamicallyValid(pos, nk, state, level, prep, entryAxis, moveAxis)) candidates.push(nk);
    }
    return candidates;
}

// Dynamic move validity: checks that only depend on mutable state.
// Static checks (blocks, geese, false goals, gates, regular filters) are
// already applied in prepLevel's staticNeighbors; only these remain:
export function isMoveDynamicallyValid(from, target, state, level, prep, entryAxis, moveAxis) {
    // Portal terminal revisit: each portal cell can only be visited once
    if (level.portalMap.has(target) && state.visited[target] > 0) return false;

    const axisBit = moveAxis === AXIS_H ? 1 : 2;

    // Edge-axis reuse at target
    if (state.edgeUsage[target] & axisBit) return false;

    // Turning check: when exiting in a different axis than entry, the exit axis
    // must not already be used at the source cell
    if (entryAxis !== AXIS_NONE && moveAxis !== entryAxis) {
        if (state.edgeUsage[from] & axisBit) return false;
    }

    // Must-cross lock prevention: turning at an unsatisfied 1st-pass MC cell
    // would consume both axis bits, permanently blocking the required 2nd crossing
    const _mcLockIdx = prep.mustCrossIndex.get(from);
    if (_mcLockIdx !== undefined && state.crossCounts[_mcLockIdx] === 1
            && (state.mustCrossMask & (1 << _mcLockIdx)) !== 0) {
        const _eH = (state.edgeUsage[from] & AXIS_H) !== 0;
        const _eV = (state.edgeUsage[from] & AXIS_V) !== 0;
        if ((_eH && !_eV && moveAxis === AXIS_V) || (!_eH && _eV && moveAxis === AXIS_H)) return false;
    }

    // Flipping filter at from: entry and exit axis must match (no turns at flipper)
    if (level.flippingFilterMap.has(from) && entryAxis !== AXIS_NONE) {
        if (entryAxis !== moveAxis) return false;
    }

    // Flipping filter at target: must enter in the flipper's current orientation
    const fi = prep.flipperIndexMap.get(target);
    if (fi !== undefined) {
        if (state.flipperUsedMask & (1 << fi)) return false;
        const usedCount = popcount(state.flipperUsedMask);
        const initAx    = prep.flipperInitAxes[fi];
        const curAx     = (usedCount & 1) === 0 ? initAx : (initAx === AXIS_H ? AXIS_V : AXIS_H);
        if (curAx !== moveAxis) return false;
    }

    return true;
}

