import { AXIS_H, AXIS_NONE, AXIS_V, KEY_SPACE, NEIGHBOR_AXIS, popcount } from './encoding.js';
import { workMeter } from './work-meter.js';
import { turnDirection } from '../domain/geometry.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState, PrepLevel, UndoToken } from './types.js';

// Returns 'cw', 'ccw', or null for a turn from prev→from→target.
// prev, from, target are packed cell keys. Returns null if not a turn or entry was AXIS_NONE.
// entryAxis/moveAxis are checked here rather than folded into turnDirection() because a portal
// jump can make "entry direction" undefined even when the raw coordinates would look colinear —
// that's game-domain knowledge turnDirection (pure 3-point geometry) doesn't have.
export function computeTurnDir(prev: number, from: number, target: number, entryAxis: number, moveAxis: number): string | null {
    if (entryAxis === AXIS_NONE || entryAxis === moveAxis) return null;
    return turnDirection(prev, from, target);
}

/** Reusable backing buffers for createState's two KEY_SPACE-sized arrays, one set per CALL SITE,
 *  scoped to THIS prep (`prep._stateBufs` — see PrepLevel's own comment) rather than module-global.
 *
 *  `visited` (2 MB) and `edgeUsage` (1 MB) are allocated per createState call — i.e. per attempt,
 *  dozens of times per level — for a grid that has at most 225 live cells. On a short-solve
 *  workload (the shape of a batch corpus sweep) createState was measured at 15.2% of solver CPU,
 *  with garbage collection a further 11%; allocating and zeroing 3 MB per attempt is the whole of
 *  that. Reusing a buffer and clearing only the IN-GRID rows turns ~1M implicit zero-fills into
 *  w*h (<=225) — every cell the search can ever touch, since every key written comes from
 *  staticNeighborKeys or a portal destination, both grid-bounded.
 *
 *  Keyed per call site rather than globally pooled with checkout/release: a slot is only ever
 *  reused by its OWN call site's next call within the SAME solve, and the three sites that opt in
 *  (DFS, beam, repair) each create one state, return a `.slice()` copy of the path, and never nest
 *  inside themselves. A site that does not pass a slot — every other caller, including the worker
 *  client and the hint-discovery paths — allocates fresh exactly as before, so opting in is
 *  incremental and the failure mode of leaving a site out is "no speedup", never shared state.
 *
 *  Fixed 2026-08-20 (moved from module-global to per-prep): a module-global pool meant two
 *  concurrently-running attempts of the SAME technique in the same JS realm (e.g. two overlapping
 *  DFS attempts from separate concurrent `solveLevel()` calls, both requesting `STATE_BUF_DFS`)
 *  could have their live `visited`/`edgeUsage` arrays cleared out from under them by the other's
 *  own `createState` call — the "never nest inside themselves" safety argument above only ever
 *  covered ONE solve's own internal sequencing, not two independent solves sharing a realm. Scoping
 *  the pool per-prep preserves the exact same reuse-across-attempts benefit (every attempt within
 *  one solve still shares the one `prep` instance) while making concurrent solves safe. */
export const STATE_BUF_DFS = 0;
export const STATE_BUF_BEAM = 1;
export const STATE_BUF_REPAIR = 2;

export function createState(startKey: number, level: NormalizedLevel, prep: PrepLevel, bufSlot?: number): SolverSearchState {
    const cn  = level.mustCrossKeys.length;
    const snN = prep.surroundInitNeighborMasks?.length ?? 0;
    let visited: Uint16Array, edgeUsage: Uint8Array;
    if (bufSlot === undefined) {
        visited = new Uint16Array(KEY_SPACE);   // visit count per cell
        edgeUsage = new Uint8Array(KEY_SPACE);  // bit1=H used, bit2=V used
    } else {
        const stateBufs = prep._stateBufs ?? (prep._stateBufs = []);
        let bufs = stateBufs[bufSlot];
        if (!bufs) bufs = stateBufs[bufSlot] = { visited: new Uint16Array(KEY_SPACE), edgeUsage: new Uint8Array(KEY_SPACE) };
        // Clear only the rows the grid actually occupies — see the buffer pool's own comment above.
        const { w: _w, h: _h } = level.grid;
        for (let y = 0; y < _h; y++) {
            const base = y << 16;
            bufs.visited.fill(0, base, base + _w);
            bufs.edgeUsage.fill(0, base, base + _w);
        }
        visited = bufs.visited;
        edgeUsage = bufs.edgeUsage;
    }
    const state: SolverSearchState = {
        path: [startKey],
        visited,
        edgeUsage,
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
        // Landmark constraints
        surroundMask:               prep.initialSurroundMask ?? 0,
        surroundNeighborRemainingMasks: snN > 0 ? new Uint8Array(prep.surroundInitNeighborMasks ?? []) : new Uint8Array(0),
        mustTurnMask:   prep.initialMustTurnMask ?? 0,
        adjTurnMask:    prep.initialAdjTurnMask  ?? 0,
    };
    state.visited[startKey] = 1;
    // Apply start-cell effects
    const mpIdx = (prep.mustPassIndex[startKey] - 1);
    if (mpIdx !== -1) {
        state.mustMask &= ~(1 << mpIdx);
        state.mpVisitedMask |= (1 << mpIdx);
    }
    const mcIdx = (prep.mustCrossIndex[startKey] - 1);
    if (mcIdx !== -1) {
        state.crossCounts[mcIdx] = 1;
        // mustCrossMask bit stays set (still need one more visit)
    }
    const _fsi = (prep.flipperIndexMap[startKey] - 1);
    if (_fsi !== -1) state.flipperUsedMask |= (1 << _fsi);
    // Surround: mark start cell's neighbor-bits as visited
    const snNbrs = prep.surroundNeighborIndex?.get(startKey);
    if (snNbrs) {
        for (const { i, bit } of snNbrs) {
            state.surroundNeighborRemainingMasks[i] &= ~bit;
            if (state.surroundNeighborRemainingMasks[i] === 0) state.surroundMask &= ~(1 << i);
        }
    }
    return state;
}

// Apply a step to state, return undo token.
// isPortalJump: current cell has portal and target is portal.dest (0-cost step).
export function applyMove(target: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, isPortalJump: boolean): UndoToken {
    // Canonical work unit — see work-meter.ts. Dual increment: the module-global counter (legacy
    // cross-solveLevel()-call cumulative tracking, still read directly by offline hint-discovery
    // tooling) AND this solve's own isolated prep._workMeter (what every budget check inside the
    // search techniques and the attempt ladder actually reads — see PrepLevel._workMeter's comment).
    workMeter.units++;
    prep._workMeter.units++;
    const from = state.path[state.path.length - 1];
    const prevVisited = state.visited[target];

    // Compute move axis and entry axis (for edge-usage)
    let moveAxis = AXIS_NONE;
    if (!isPortalJump) {
        const _fx = from & 0xFFFF, fy = (from >>> 16) & 0xFFFF;
        const _tx = target & 0xFFFF, ty = (target >>> 16) & 0xFFFF;
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
    const wasIntAdded = prevVisited > 0 && target !== level.goalKey && !prep.gateFlags[target];
    if (wasIntAdded) state.ints++;

    // Must-pass: clear mustMask bit + set mpVisitedMask bit on first visit
    const prevMustMask = state.mustMask;
    const prevMpVisitedMask = state.mpVisitedMask;
    const mpIdx = (prep.mustPassIndex[target] - 1);
    if (mpIdx !== -1 && prevVisited === 0) {
        state.mustMask &= ~(1 << mpIdx);
        state.mpVisitedMask |= (1 << mpIdx);
    }

    // Must-cross: accumulate crosses
    const prevMustCrossMask = state.mustCrossMask;
    let prevCrossCount = 0;
    const mcIdx = (prep.mustCrossIndex[target] - 1);
    if (mcIdx !== -1) {
        prevCrossCount = state.crossCounts[mcIdx];
        if (state.crossCounts[mcIdx] < 255) state.crossCounts[mcIdx]++;
        if (state.crossCounts[mcIdx] >= 2) state.mustCrossMask &= ~(1 << mcIdx);
    }

    // Flipping filter update (global-flip rule: mark flipper as used)
    const prevFlipperUsedMask = state.flipperUsedMask;
    if (!isPortalJump) {
        const _fi = (prep.flipperIndexMap[target] - 1);
        if (_fi !== -1) state.flipperUsedMask |= (1 << _fi);
    }

    const prevLastWasPortalJump = state.lastWasPortalJump;
    state.lastWasPortalJump = isPortalJump;

    // ── Landmark constraints ──────────────────────────────────────────────────
    // Skip entirely for non-landmark levels (prep.hasLandmarkConstraints = false).
    // This keeps the undo token at its original 15-field size, avoiding GC overhead
    // on the ~1M applyMove/undoMove cycles in beam search for existing levels.
    if (!prep.hasLandmarkConstraints) {
        return {
            target, from, moveAxis, axisBit, isPortalJump,
            prevVisited, prevEdgeFrom, prevEdgeTarget,
            wasIntAdded,
            prevMustMask, prevMpVisitedMask,
            prevMustCrossMask, mcIdx, prevCrossCount,
            prevFlipperUsedMask,
            prevLastWasPortalJump,
        };
    }

    // Surround: mark neighbor-bits of any surround cell adjacent to `target`.
    // Guard: state.surroundMask === 0 for levels with no surround cells (fast path).
    const prevSurroundMask = state.surroundMask;
    let surroundNbrRestores: { i: number; prevMask: number }[] | null = null; // only allocated if needed
    if (state.surroundMask !== 0) {
        const snNbrs = prep.surroundNeighborIndex?.get(target);
        if (snNbrs) {
            for (const { i, bit } of snNbrs) {
                if (state.surroundNeighborRemainingMasks[i] & bit) {
                    if (!surroundNbrRestores) surroundNbrRestores = [];
                    surroundNbrRestores.push({ i, prevMask: state.surroundNeighborRemainingMasks[i] });
                    state.surroundNeighborRemainingMasks[i] &= ~bit;
                    if (state.surroundNeighborRemainingMasks[i] === 0) state.surroundMask &= ~(1 << i);
                }
            }
        }
    }

    // Must-turn: detect turn happening AT `from` as we EXIT it toward `target`.
    // Guard: state.mustTurnMask === 0 when no must-turn cells remain (or no landmark level).
    const prevMustTurnMask = state.mustTurnMask;
    if (state.mustTurnMask !== 0 && !isPortalJump) {
        const mtIdx = (prep.mustTurnCellIndex[from] - 1);
        if (mtIdx !== -1 && (state.mustTurnMask & (1 << mtIdx)) !== 0) {
            const pathLen = state.path.length; // path already has target pushed
            // path is [..., prev, from, target]; from = path[pathLen-2], prev = path[pathLen-3]
            const prevKey = pathLen >= 3 ? state.path[pathLen - 3] : null;
            const entryAxis = prevKey !== null && !prevLastWasPortalJump
                ? (((prevKey >>> 16) & 0xFFFF) === ((from >>> 16) & 0xFFFF) ? AXIS_H : AXIS_V)
                : AXIS_NONE;
            if (entryAxis !== AXIS_NONE && entryAxis !== moveAxis && moveAxis !== AXIS_NONE) {
                const req = prep.mustTurnDirs?.[mtIdx];
                const turnDir = req === 'either' ? 'either'
                    : computeTurnDir(prevKey as number, from, target, entryAxis, moveAxis);
                if (req === 'either' || turnDir === req) state.mustTurnMask &= ~(1 << mtIdx);
            }
        }
    }

    // Adjacent-turn: detect turn AT `from` adjacent to any adj-turn object.
    // Guard: state.adjTurnMask === 0 when satisfied (or no landmark level).
    const prevAdjTurnMask = state.adjTurnMask;
    if (state.adjTurnMask !== 0 && !isPortalJump && moveAxis !== AXIS_NONE) {
        const atNbrs = prep.adjTurnCellIndex?.get(from);
        if (atNbrs) {
            const pathLen = state.path.length;
            const prevKey = pathLen >= 3 ? state.path[pathLen - 3] : null;
            const entryAxis = prevKey !== null && !prevLastWasPortalJump
                ? (((prevKey >>> 16) & 0xFFFF) === ((from >>> 16) & 0xFFFF) ? AXIS_H : AXIS_V)
                : AXIS_NONE;
            if (entryAxis !== AXIS_NONE && entryAxis !== moveAxis) {
                for (const { i, dir } of atNbrs) {
                    if ((state.adjTurnMask & (1 << i)) === 0) continue;
                    const turnDir = dir === 'either' ? 'either'
                        : computeTurnDir(prevKey as number, from, target, entryAxis, moveAxis);
                    if (dir === 'either' || turnDir === dir) state.adjTurnMask &= ~(1 << i);
                }
            }
        }
    }

    return {
        target, from, moveAxis, axisBit, isPortalJump,
        prevVisited, prevEdgeFrom, prevEdgeTarget,
        wasIntAdded,
        prevMustMask, prevMpVisitedMask,
        prevMustCrossMask, mcIdx, prevCrossCount,
        prevFlipperUsedMask,
        prevLastWasPortalJump,
        prevSurroundMask, surroundNbrRestores,
        prevMustTurnMask,
        prevAdjTurnMask,
    };
}

export function undoMove(undo: UndoToken, state: SolverSearchState): void {
    state.path.pop();
    state.visited[undo.target]    = undo.prevVisited;
    state.edgeUsage[undo.from]    = undo.prevEdgeFrom;
    state.edgeUsage[undo.target]  = undo.prevEdgeTarget;
    if (undo.isPortalJump) state.portalJumps--;
    if (undo.wasIntAdded) state.ints--;
    state.mustMask          = undo.prevMustMask;
    state.mpVisitedMask     = undo.prevMpVisitedMask;
    state.mustCrossMask     = undo.prevMustCrossMask;
    if (undo.mcIdx !== -1) state.crossCounts[undo.mcIdx] = undo.prevCrossCount;
    state.flipperUsedMask   = undo.prevFlipperUsedMask;
    state.lastWasPortalJump = undo.prevLastWasPortalJump;
    // Landmark undo (only present when prep.hasLandmarkConstraints was true)
    if (undo.prevSurroundMask !== undefined) {
        state.surroundMask = undo.prevSurroundMask;
        if (undo.surroundNbrRestores) {
            for (const { i, prevMask } of undo.surroundNbrRestores) {
                state.surroundNeighborRemainingMasks[i] = prevMask;
            }
        }
        state.mustTurnMask = undo.prevMustTurnMask as number;
        state.adjTurnMask  = undo.prevAdjTurnMask as number;
    }
}

// ─── Neighbour generation ─────────────────────────────────────────────────────

// Returns an array of valid next-cell keys from `pos` in `state`.
// Portal entries yield ONLY the portal destination (forced teleport).
// `arrivedViaPortal` prevents chaining teleports.
// Uses precomputed staticNeighborKeys from prepLevel; only dynamic checks run here.
export function getNeighbors(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): number[] {
    const portal = level.portalMap.get(pos);
    const arrivedViaPortal = state.lastWasPortalJump;

    // Portal is forced unless we just arrived here via a portal jump. The block/goose check on
    // `dest` is defense-in-depth, not evidence a portal destination can coincide with a hazard
    // in valid data — one object per cell is an absolute invariant (enforced by validateRawLevel;
    // see CLAUDE.md's "Cell occupancy is an absolute invariant" note), so this should never
    // actually fire on a schema-valid level.
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

    const candidates: number[] = [];
    // staticNeighborKeys is dense-indexed (cellDenseIndex[pos] - 1) * 4 + d, not packed-key-
    // indexed — see prep.ts's own comment. pos is always a live cell here (the search only ever
    // moves onto cells getNeighbors itself returned), so cellDenseIndex[pos] is always nonzero.
    const base = (prep.cellDenseIndex[pos] - 1) * 4;
    for (let d = 0; d < 4; d++) {
        // +1-biased so 0 can mean "no neighbour" — see prep.ts.
        const nkPlus1 = prep.staticNeighborKeys[base + d];
        if (nkPlus1 === 0) continue;
        const nk = nkPlus1 - 1;
        if (isMoveDynamicallyValid(pos, nk, state, level, prep, entryAxis, NEIGHBOR_AXIS[d])) candidates.push(nk);
    }

    // Offline tooling hook (hint-diversification audits): when set, the very next move
    // taken immediately after arriving at a specific portal destination is restricted to
    // one packed cell key. Mirrors `prep._forcedFirstStepKey`'s gate-exit forcing, but for
    // a portal exit — a portal destination is, like a gate, visited at most once per path
    // (see the portal-terminal-revisit check above), so this can only ever fire once.
    // No effect on normal play/solve — prep._forcedPortalExitKey is never set in production.
    const forced = prep._forcedPortalExitKey;
    if (arrivedViaPortal && forced != null && pos === forced.from) {
        return candidates.filter(k => k === forced.to);
    }

    return candidates;
}

// Dynamic move validity: checks that only depend on mutable state.
// Static checks (blocks, geese, false goals, gates, regular filters) are
// already applied in prepLevel's staticNeighborKeys; only these remain:
export function isMoveDynamicallyValid(from: number, target: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, entryAxis: number, moveAxis: number): boolean {
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
    const _mcLockIdx = (prep.mustCrossIndex[from] - 1);
    if (_mcLockIdx !== -1 && state.crossCounts[_mcLockIdx] === 1
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
    const fi = (prep.flipperIndexMap[target] - 1);
    if (fi !== -1) {
        if (state.flipperUsedMask & (1 << fi)) return false;
        const usedCount = popcount(state.flipperUsedMask);
        const initAx    = prep.flipperInitAxes[fi];
        const curAx     = (usedCount & 1) === 0 ? initAx : (initAx === AXIS_H ? AXIS_V : AXIS_H);
        if (curAx !== moveAxis) return false;
    }

    return true;
}
