import { KEY_SPACE, popcount } from './encoding.js';
import { getRealLengthFromState } from './solution.js';
import { CONNECTIVITY_WORK_UNITS, workMeter } from './work-meter.js';
import { stateSignature } from './nogood-cache.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState, PrepLevel, ConnectivityRejectionSubtype, ConnectivityRejectionObserver, ConnectivityBoundarySketch, ConnectivityBoundaryBlockerReason } from './types.js';

const _reachQ   = new Int32Array(512); // BFS queue; max grid is 15x15=225 cells
let _reachGen   = 0;
const _reachGenBuf = new Uint32Array(KEY_SPACE);

// Generation tags avoid clearing the 1M-entry packed-key buffer on every BFS, but the tags stored
// in the Uint32Array must remain comparable with the JavaScript number in `_reachGen`.  Letting the
// number advance past 0xFFFFFFFF silently breaks that invariant: writes truncate to uint32 while
// `_reachCanEnter` compares them with the untruncated number, so already-enqueued cells stop looking
// visited and a cyclic flood fill can overflow its fixed queue.  Pay the full clear once per 2^32
// BFS calls instead.  This is the same reused-buffer failure class as the historical stale-row and
// undersized-MST-scratch bugs, just at the generation counter boundary.
function _nextReachGeneration(): number {
    if (_reachGen >= 0xFFFFFFFF) {
        _reachGenBuf.fill(0);
        _reachGen = 1;
    } else {
        _reachGen++;
    }
    return _reachGen;
}

/** Test-only rollover seam; production callers must never manipulate scratch generations. */
export function __setReachGenerationForTests(value: number, markedKey?: number): void {
    _reachGen = value;
    if (markedKey !== undefined) _reachGenBuf[markedKey] = 1;
}

/** Max grid width/height the bit-parallel flood fill handles: one 32-bit word per grid row, and
 *  the row-growth step shifts left by 1, so bit w must stay clear of the sign bit. Grids are
 *  15x15 at most (CLAUDE.md) and `PACK`'s `y << 16` caps h at 16 regardless, so this is a wide
 *  defensive margin rather than a tight fit — but a grid past it falls back to the plain BFS
 *  below instead of silently truncating, same defensive-fallback discipline as lower-bounds.ts's
 *  MAX_MST_K. */
export const MAX_BITROW_DIM = 30;

// Bit-parallel flood-fill scratch, one 32-bit word per grid row (bit x = cell (x, y)).
const _rowReached  = new Uint32Array(MAX_BITROW_DIM);
const _rowPassable = new Uint32Array(MAX_BITROW_DIM);
const _rowVisAny   = new Uint32Array(MAX_BITROW_DIM);

/** Which representation the last flood fill wrote its reachable set into: 0 = `_reachGenBuf`
 *  (the plain BFS), 1 = `_rowReached` (the bit-parallel fill). Read only by `_reached`. */
let _reachMode: 0 | 1 = 0;

/** Was cell `k` reached by the most recent flood fill? */
function _reached(k: number): boolean {
    return _reachMode === 1
        ? (_rowReached[(k >>> 16) & 0xFFFF] & (1 << (k & 0xFFFF))) !== 0
        : _reachGenBuf[k] === _reachGen;
}

// Shared BFS-neighbor admissibility check for isConnected/isConnectedForFalseGoalTriggerSearch. Pulled out to a
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
function _reachCanEnter(nk: number, gen: number, maxVisit: number, pos: number, state: SolverSearchState, prep: PrepLevel, mcOpenMask: number, mcKeys: ArrayLike<number>, axisExhausted: boolean): boolean {
    if (prep.flipperIndexMap) {
        const fi = (prep.flipperIndexMap[nk] - 1);
        if (fi !== -1 && (state.flipperUsedMask & (1 << fi)) !== 0) return false;
    }
    // Both axis bits spent => the cell can never be entered again: entering along H needs H free and
    // along V needs V free (move-rules.ts's invalid-edge-reuse-target). Independent of visit count --
    // a cell visited ONCE, entered horizontally and left vertically, has edgeUsage 3 with visited 1,
    // so the visit test below would admit a cell that is in fact a wall.
    //
    // Deliberately ahead of the reserved-intersection fallthrough, so it overrides the pending
    // must-cross exemption too: a pending must-cross cell with both axes spent is precisely
    // CLAUDE.md's "must-cross lock" (turning on a 1st-pass MC cell consumes both bits and blocks the
    // required 2nd crossing), so it is unenterable and the state is dead. Walling it is what makes
    // the fill report that.
    if (axisExhausted && nk !== pos && state.edgeUsage[nk] === 3) return false;
    if (_reachGenBuf[nk] === gen || prep.reachBlockedArr[nk] !== 0) return false;
    if (state.visited[nk] <= maxVisit || nk === pos) return true;
    // Reserved-intersection wall (see isConnected): the only over-budget revisit still payable is a
    // pending must-cross cell's own reserved second crossing. mcOpenMask is 0 on every other call,
    // so this is one compare on the ordinary path.
    return mcOpenMask !== 0 && _mcOpenHas(nk, mcOpenMask, mcKeys);
}

/** Is `nk` one of the pending must-cross cells named by `mcOpenMask`? At most 4 must-cross cells
 *  exist per level (CLAUDE.md), so this is a bounded bit walk, not a search. */
function _mcOpenHas(nk: number, mcOpenMask: number, mcKeys: ArrayLike<number>): boolean {
    let m = mcOpenMask;
    while (m !== 0) {
        const lo = m & -m;
        m ^= lo;
        if (mcKeys[31 - Math.clz32(lo)] === nk) return true;
    }
    return false;
}

// Shared flood fill for isConnected/isConnectedForFalseGoalTriggerSearch: traverses portal edges (via
// _reachCanEnter, same admissibility rule as ordinary neighbors — a portal destination can
// never actually be a flipper cell since the editor enforces one object per cell and portals
// only ever pair with other portal cells, but routing through the shared helper keeps the two
// edge kinds provably in sync rather than relying on that invariant twice) and the 4 grid
// directions, marking _reachGenBuf and counting freshVolume. Plain module-level function (no
// captured variables, no callbacks) for the same hot-path reason _reachCanEnter is above — both
// callers read the resulting generation back via the shared _reachGen module variable rather
// than have this return an allocated {gen, freshVolume} pair.
function _floodFillBfs(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, maxVisit: number, mcOpenMask: number, mcKeys: ArrayLike<number>, axisExhausted: boolean): number {
    const { w, h } = level.grid;
    const hasPortals = level.portalMap.size > 0;

    _reachMode = 0;
    const gen = _nextReachGeneration();
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
                if (_reachCanEnter(d, gen, maxVisit, pos, state, prep, mcOpenMask, mcKeys, axisExhausted)) {
                    _reachGenBuf[d] = gen;
                    if (state.visited[d] === 0) freshVolume++;
                    _reachQ[qTail++] = d;
                }
            }
        }
        if (x + 1 < w) {
            const nk = k + 1;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep, mcOpenMask, mcKeys, axisExhausted)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
        if (x > 0) {
            const nk = k - 1;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep, mcOpenMask, mcKeys, axisExhausted)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
        if (y + 1 < h) {
            const nk = k + 0x10000;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep, mcOpenMask, mcKeys, axisExhausted)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
        if (y > 0) {
            const nk = k - 0x10000;
            if (_reachCanEnter(nk, gen, maxVisit, pos, state, prep, mcOpenMask, mcKeys, axisExhausted)) {
                _reachGenBuf[nk] = gen; if (state.visited[nk] === 0) freshVolume++; _reachQ[qTail++] = nk;
            }
        }
    }

    return freshVolume;
}

// Per-row admissibility for _floodFillBits = the static part (blocks ∪ geese ∪ gates, precomputed
// in prep) minus cells the path has already visited more than `maxVisit` times. Built lazily, one
// row at a time, as the fill's band grows. Module-level rather than a closure inside
// _floodFillBits for the same hot-path reason _reachCanEnter is: two closure contexts per call, on
// a function called 10^5-10^6 times per level, is real allocation.
function _buildPassableRow(y: number, w: number, staticRows: Uint32Array, visited: Uint16Array, maxVisit: number, flipperUsedMask: number, flipperKeys: Int32Array, mcOpenMask: number, mcKeys: ArrayLike<number>, edgeUsage: Uint8Array, axisExhausted: boolean): void {
    const base = y << 16;
    let pass = staticRows[y], any = 0;
    for (let x = 0; x < w; x++) {
        const v = visited[base | x];
        if (v > 0) { const b = 1 << x; any |= b; if (v > maxVisit) pass &= ~b; }
    }
    // A used flipper can never be re-entered — see _reachCanEnter. Applied per row (rather than
    // once up front) so it lands on rows built later in the sweep too.
    let fm = flipperUsedMask;
    while (fm !== 0) {
        const lo = fm & -fm;
        fm ^= lo;
        const fk = flipperKeys[31 - Math.clz32(lo)];
        if (((fk >>> 16) & 0xFFFF) === y) pass &= ~(1 << (fk & 0xFFFF));
    }
    // Reserved-intersection wall (see isConnected): a pending must-cross cell keeps its reserved
    // second crossing, so it stays traversable even though the visited sweep above just walled it.
    let mm = mcOpenMask;
    while (mm !== 0) {
        const lo = mm & -mm;
        mm ^= lo;
        const mk = mcKeys[31 - Math.clz32(lo)];
        if (((mk >>> 16) & 0xFFFF) === y) pass |= 1 << (mk & 0xFFFF);
    }
    // Axis-exhaustion wall -- see _reachCanEnter. LAST on purpose: it must override the
    // reserved-intersection re-add above, since a pending must-cross cell whose axes are both spent
    // is unenterable regardless of its reserved crossing.
    if (axisExhausted) {
        for (let x = 0; x < w; x++) if (edgeUsage[base | x] === 3) pass &= ~(1 << x);
    }
    _rowPassable[y] = pass;
    _rowVisAny[y] = any;
}

// Grow one row: pull in reachability from the rows above/below, then close horizontally.
// Rows outside the current band hold no reached bits, so treating them as 0 is exact.
function _growReachedRow(y: number, yLo: number, yHi: number): boolean {
    const p = _rowPassable[y];
    const cur = _rowReached[y];
    const vert = ((y > yLo ? _rowReached[y - 1] : 0) | (y < yHi ? _rowReached[y + 1] : 0)) & p;
    let c = cur | vert;
    for (;;) {
        const n = c | (((c << 1) | (c >>> 1)) & p);
        if (n === c) break;
        c = n;
    }
    if (c === cur) return false;
    _rowReached[y] = c;
    return true;
}

// Bit-parallel form of _floodFillBfs: identical reachable set and freshVolume, computed with one
// 32-bit word per grid row instead of a per-cell queue. `_reachCanEnter`'s predicate is entirely
// per-cell, so it can be evaluated for a whole row at once into `_rowPassable`, after which
// "spread reachability one step" is `(c << 1) | (c >>> 1)` horizontally and a plain OR of the
// neighbouring rows vertically. Measured ~3x faster than the queue-based fill on an open 15x15
// grid, which is where the fill spends its time (the connectivity prune is ~34% of published-corpus
// solver CPU); it is *slower* on a tiny sealed-off region, where the queue visits a handful of
// cells but this would still build every row — so the row band (yLo/yHi) is grown lazily out from
// `pos`, keeping that case proportional to the region rather than to the whole grid.
//
// Requires w, h <= MAX_BITROW_DIM; the caller dispatches.
function _floodFillBits(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, maxVisit: number, mcOpenMask: number, mcKeys: ArrayLike<number>, axisExhausted: boolean): number {
    const { w, h } = level.grid;
    const staticRows = prep.reachPassableRows as Uint32Array;
    const visited = state.visited;
    _reachMode = 1;

    // Clear the WHOLE grid's reached bits, not just the band this call ends up growing:
    // isConnected asks `_reached(goalKey)` / `_reached(mustPassKeys[i])` for arbitrary cells, so a
    // row no call touches would otherwise answer from the PREVIOUS call's bits. (That bug shipped
    // in the first version of this function and is why the zeroing lives here rather than in
    // _buildPassableRow: it made the prune too permissive — a stale bit reads as "reachable", skipping a
    // legitimate prune — which never rejects a reachable solution but does change search order.
    // Regression test: topology.test.ts's randomized-sequence differential test.) Only
    // `_rowReached` needs this; `_rowPassable`/`_rowVisAny` are read exclusively inside the band.
    for (let y = 0; y < h; y++) _rowReached[y] = 0;

    const posX = pos & 0xFFFF, posY = (pos >>> 16) & 0xFFFF, posBit = 1 << posX;
    let yLo = posY, yHi = posY;
    _buildPassableRow(posY, w, staticRows, visited, maxVisit, state.flipperUsedMask, prep.flipperKeys, mcOpenMask, mcKeys, state.edgeUsage, axisExhausted);
    // `pos` is the seed: the BFS enqueues it unconditionally and expands its neighbours, so the
    // fill flows through it whatever its own visit count or blocked status. Marking it in
    // _rowVisAny mirrors "freshVolume starts at 1 for pos, and pos is never counted again".
    _rowPassable[posY] |= posBit;
    _rowVisAny[posY]   |= posBit;
    _rowReached[posY]   = posBit;
    _growReachedRow(posY, yLo, yHi);

    const hasPortals = level.portalMap.size > 0;
    let changed = true;
    while (changed) {
        changed = false;
        for (let y = yLo; y <= yHi; y++) if (_growReachedRow(y, yLo, yHi)) changed = true;
        for (let y = yHi; y >= yLo; y--) if (_growReachedRow(y, yLo, yHi)) changed = true;
        // Extend the band by one row whenever the current edge row can step into it.
        if (yLo > 0) {
            _buildPassableRow(yLo - 1, w, staticRows, visited, maxVisit, state.flipperUsedMask, prep.flipperKeys, mcOpenMask, mcKeys, state.edgeUsage, axisExhausted);
            if ((_rowReached[yLo] & _rowPassable[yLo - 1]) !== 0) { yLo--; changed = true; }
        }
        if (yHi < h - 1) {
            _buildPassableRow(yHi + 1, w, staticRows, visited, maxVisit, state.flipperUsedMask, prep.flipperKeys, mcOpenMask, mcKeys, state.edgeUsage, axisExhausted);
            if ((_rowReached[yHi] & _rowPassable[yHi + 1]) !== 0) { yHi++; changed = true; }
        }
        // Portal edges are non-local, so they can't ride the row sweep — replay them after each
        // pass, same admissibility rule as an ordinary neighbour (see _floodFillBfs).
        if (hasPortals) {
            for (const [src, portal] of level.portalMap) {
                const d = portal.dest;
                if (d < 0) continue;
                const sy = (src >>> 16) & 0xFFFF;
                if (sy < yLo || sy > yHi || (_rowReached[sy] & (1 << (src & 0xFFFF))) === 0) continue;
                const dy = (d >>> 16) & 0xFFFF, dBit = 1 << (d & 0xFFFF);
                if (dy < yLo || dy > yHi) { // destination outside the band — pull the band over it
                    while (yLo > dy) { _buildPassableRow(yLo - 1, w, staticRows, visited, maxVisit, state.flipperUsedMask, prep.flipperKeys, mcOpenMask, mcKeys, state.edgeUsage, axisExhausted); yLo--; }
                    while (yHi < dy) { _buildPassableRow(yHi + 1, w, staticRows, visited, maxVisit, state.flipperUsedMask, prep.flipperKeys, mcOpenMask, mcKeys, state.edgeUsage, axisExhausted); yHi++; }
                }
                if ((_rowReached[dy] & dBit) !== 0 || (_rowPassable[dy] & dBit) === 0) continue;
                _rowReached[dy] |= dBit;
                changed = true;
            }
        }
    }

    // freshVolume: pos (always 1, exactly as the BFS counts it) plus every reached cell the path
    // has never visited. _rowVisAny holds pos's bit, so pos is never double-counted.
    let freshVolume = 1;
    for (let y = yLo; y <= yHi; y++) {
        let m = _rowReached[y] & ~_rowVisAny[y];
        while (m !== 0) { m &= m - 1; freshVolume++; }
    }
    return freshVolume;
}

function _floodFillReachability(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, maxVisit: number, axisExhausted: boolean, mcOpenMask = 0, mcKeys: ArrayLike<number> = EMPTY_KEYS): number {
    return prep.reachPassableRows !== null
        ? _floodFillBits(pos, state, level, prep, maxVisit, mcOpenMask, mcKeys, axisExhausted)
        : _floodFillBfs(pos, state, level, prep, maxVisit, mcOpenMask, mcKeys, axisExhausted);
}

const EMPTY_KEYS: ArrayLike<number> = [];

// Stage B (docs/solver-optimization-current-queue.md item #0's learned-failure thread; see
// ConnectivityBoundarySketch's own doc in types.ts). Diagnostic-only, called only when a research
// observer opted in via `includeBoundarySketch` AND a rejection already fired — never on the hot
// path, so it deliberately does NOT share code with `_reachCanEnter`/the flood-fill functions above
// (those must stay allocation-/branch-minimal; this trades that for readability). Mirrors
// `_reachCanEnter`'s exact check order so its classification agrees with what actually decided
// reachability; kept in sync by comment cross-reference rather than by calling it, since
// `_reachCanEnter` returns a bool where this needs to say WHICH check fired.
function _classifyBoundaryBlocker(
    nk: number, maxVisit: number, pos: number, state: SolverSearchState, prep: PrepLevel,
    mcOpenMask: number, mcKeys: ArrayLike<number>, axisExhausted: boolean,
): ConnectivityBoundaryBlockerReason | null {
    if (prep.flipperIndexMap) {
        const fi = (prep.flipperIndexMap[nk] - 1);
        if (fi !== -1 && (state.flipperUsedMask & (1 << fi)) !== 0) return 'used-flipper';
    }
    if (axisExhausted && nk !== pos && state.edgeUsage[nk] === 3) return 'axis-exhausted';
    if (prep.reachBlockedArr[nk] !== 0) return 'static';
    // A genuine boundary cell (adjacent to a reached cell, itself not reached) can't actually reach
    // either of these two branches — both would have made `_reachCanEnter` return true, and the cell
    // would then have been reached. Returning null here (never blaming "visited-wall") surfaces that
    // inconsistency instead of silently mislabeling it, since this is the diagnostic-only mirror of
    // `_reachCanEnter`'s logic, not a re-derivation with its own independent authority.
    if (state.visited[nk] <= maxVisit || nk === pos) return null;
    if (mcOpenMask !== 0 && _mcOpenHas(nk, mcOpenMask, mcKeys)) return null;
    return 'visited-wall';
}

// Builds the reached-set fingerprint and boundary-blocker sketch from the flood fill that JUST ran
// (reads `_reached()` — the exact same result `isConnected`'s own checks just used — never a second
// flood fill). Mode-agnostic: works whether the last fill used the bit-parallel `_rowReached` path
// or the plain-BFS `_reachGenBuf` fallback, since both are read through the same `_reached()`
// accessor. Grid cells are <=225 for every real level (CLAUDE.md), so this is a bounded scan, not
// proportional to search depth or corpus size.
function _computeBoundarySketch(
    level: NormalizedLevel, state: SolverSearchState, prep: PrepLevel,
    maxVisit: number, pos: number, mcOpenMask: number, mcKeys: ArrayLike<number>, axisExhausted: boolean,
): ConnectivityBoundarySketch {
    const { w, h } = level.grid;
    const rowWords: number[] = new Array(h);
    const blockers: { cell: number; reason: ConnectivityBoundaryBlockerReason }[] = [];
    const blockerSeen = new Set<number>();
    const tryBlocker = (nk: number) => {
        if (_reached(nk) || blockerSeen.has(nk)) return;
        blockerSeen.add(nk);
        const reason = _classifyBoundaryBlocker(nk, maxVisit, pos, state, prep, mcOpenMask, mcKeys, axisExhausted);
        if (reason) blockers.push({ cell: nk, reason });
    };
    for (let y = 0; y < h; y++) {
        let word = 0;
        for (let x = 0; x < w; x++) {
            const k = (y << 16) | x;
            if (!_reached(k)) continue;
            word |= (1 << x);
            if (x + 1 < w) tryBlocker(k + 1);
            if (x > 0) tryBlocker(k - 1);
            if (y + 1 < h) tryBlocker(k + 0x10000);
            if (y > 0) tryBlocker(k - 0x10000);
        }
        rowWords[y] = word;
    }
    return { reachedFingerprint: rowWords.map(word => word.toString(16)).join(','), boundaryBlockers: blockers };
}

// Plain module-level function, not a closure captured inside isConnected — see that function's own
// comment on why. Called only on the (already rare relative to total isConnected calls) rejection
// path, and only when a research observer is actually attached.
function _reportConnectivityRejection(
    research: ConnectivityRejectionObserver, subtype: ConnectivityRejectionSubtype, objectiveIndex: number | undefined,
    pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel,
    intNeeded: number, mcOpenMask: number, freshVolume: number, maxVisit: number, axisExhausted: boolean,
    remainingStepsKnown?: number,
): void {
    research.observe({
        subtype, objectiveIndex, pos, stateFingerprint: stateSignature(state),
        intNeeded, mpVisitedMask: state.mpVisitedMask, mustCrossMask: state.mustCrossMask,
        reservedWallActive: mcOpenMask !== 0, freshVolume,
        remainingSteps: remainingStepsKnown ?? (level.portalMap.size === 0 ? level.reqLen - getRealLengthFromState(state) : null),
        work: prep._workMeter.units,
        ...(research.includeBoundarySketch
            ? { boundarySketch: _computeBoundarySketch(level, state, prep, maxVisit, pos, mcOpenMask, level.mustCrossKeys, axisExhausted) }
            : {}),
    });
}

// Connectivity prune: checks that goal + unsatisfied objectives are reachable from pos,
// and (for non-MC levels) that enough fresh cells exist to complete the path.
// Flood fill traverses cells that are either unvisited, or (if intersections still needed)
// visited exactly once. Gate cells (other than starting gate) are treated as walls.
// Volume check (V1 _checkTopology): freshCells + intNeeded >= rSteps prunes branches
// that are isolated in a sub-region too small to complete the required path length.
/** A DEGREE PRUNE HERE IS UNSOUND — tried 2026-07-30, reverted. The reachability loops below only
 *  ask whether a pending required cell can still be ARRIVED at, never whether the path could then
 *  LEAVE, which invites the conclusion that a required cell with fewer than 2 usable neighbours is
 *  a dead end. It is not. The edge-axis reuse rule forbids re-entering a cell along an axis already
 *  used to enter it; it does NOT forbid traversing an edge twice. A dead-end cell is reached by
 *  going in and coming straight back out — (2,1)→(2,2)→(2,1) re-enters (2,1) VERTICALLY, and if
 *  (2,1) was first entered horizontally that axis is free, so the detour is legal. It costs two
 *  steps and one intersection, nothing more. topology.test.ts's used-flipper case covers exactly
 *  this shape and fails immediately if the prune is added, which is how it was caught.
 *
 *  The only sound corner is intNeeded === 0, where the return trip's intersection is unaffordable —
 *  but that never coincides with the must-cross-heavy regime the prune was aimed at, since pending
 *  must-cross cells reserve intersections and keep intNeeded above zero. Not worth the code. */
// Permitted error: reachable-set over-approximation only; see property: topology connectivity over-approximates every truly reachable required cell.
export function isConnected(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): boolean {
    // Dual increment — see applyMove's identical comment in search-state.ts.
    workMeter.units += CONNECTIVITY_WORK_UNITS;
    prep._workMeter.units += CONNECTIVITY_WORK_UNITS;
    const intNeeded = level.reqInt - state.ints;
    // Threshold: visited count allowed to pass through.
    //   0 intersections remaining: only unvisited cells (path acts as hard walls).
    //   N > 0 intersections remaining: cells visited up to twice are traversable.
    //   The original maxVisit=1 was wrong: after making one intersection (visited[A]=2),
    //   cell A still needs to be passable in BFS if we have intersection budget left.
    //   Cap at 2 rather than reqInt to bound BFS cost on high-intersection levels.
    let maxVisit = intNeeded > 0 ? 2 : 0;

    // ── Reserved-intersection wall ────────────────────────────────────────────────────────────
    // Each pending must-cross cell has one intersection already committed to its own second
    // crossing (PRUNE_MC_CEILING above guarantees `ints + popcount(mustCrossMask) <= reqInt`), so
    // the intersections available for revisiting ANYTHING ELSE are
    //   freeInt = reqInt - ints - popcount(mustCrossMask).
    // freeInt is non-increasing along any path: a fresh step leaves it alone, a must-cross second
    // crossing raises `ints` and lowers `popcount` by 1 each, and any other revisit spends one. So
    // once it hits 0 no ordinary cell can ever be re-entered again, for the rest of the search —
    // the visited path is a wall, not a budget-limited obstacle, and only the pending must-cross
    // cells stay open. On `reqInt <= must-cross count` levels that holds from the first move.
    //
    // Gates are already walls (prep.reachBlockedArr) and can never be re-entered; the goal is
    // terminal (prune-gauntlet.ts answers 'solution' or 'reject' the moment a move enters it), so
    // neither of the two intersection-exempt cells (search-state.ts's `wasIntAdded`) can be
    // revisited and the budget arithmetic above covers every remaining case.
    //
    // Portal levels are INCLUDED, unlike the volume check below. The argument needs only "every
    // entry into a visited ordinary cell costs one intersection", which is `wasIntAdded` itself —
    // evaluated in `applyMove` for portal jumps exactly as for ordinary moves. It does NOT need the
    // `reqInt == nodes - distinctCells` identity, which is what portals actually break (a jump
    // costs no path length) and what the volume check below is gated on. An earlier version of this
    // excluded portals by conflating the two.
    let mcOpenMask = 0;
    const _cfg = prep._cfg;
    if ((!_cfg || _cfg.PRUNE_MC_RESERVED_WALL) && maxVisit > 0 && state.mustCrossMask !== 0 &&
        intNeeded - popcount(state.mustCrossMask) === 0) {
        maxVisit = 0;
        mcOpenMask = state.mustCrossMask;
    }

    const axisExhausted = (!_cfg || _cfg.PRUNE_CONNECTIVITY_AXIS_EXHAUSTED) as boolean;
    const freshVolume = _floodFillReachability(pos, state, level, prep, maxVisit, axisExhausted, mcOpenMask, level.mustCrossKeys);

    // Research-only rejection observer (see ConnectivityRejectionObserver's doc in types.ts and
    // docs/solver-optimization-current-queue.md item #0's learned-failure Stage A). `research` is
    // undefined on every production call, so each `if (research)` below is a single false branch —
    // this changes no pruning/ordering/budget decision, only whether an already-computed rejection
    // is also reported. Reporting itself is a call to the module-level `_reportConnectivityRejection`
    // (not an inline closure) for the same hot-path reason `_reachCanEnter` above is module-level:
    // isConnected runs 10^5-10^6 times per level, and a closure allocated on every call — even one
    // that does nothing when research is absent — was measured elsewhere in this file (PF_BEAM_DEBUG)
    // to be a meaningful cost share.
    const research = prep._connectivityRejectionObserver;

    if (!_reached(level.goalKey)) {
        if (research) _reportConnectivityRejection(research, 'goal', undefined, pos, state, level, prep, intNeeded, mcOpenMask, freshVolume, maxVisit, axisExhausted);
        return false;
    }
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && !_reached(level.mustPassKeys[i])) {
            if (research) _reportConnectivityRejection(research, 'must-pass', i, pos, state, level, prep, intNeeded, mcOpenMask, freshVolume, maxVisit, axisExhausted);
            return false;
        }
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && !_reached(level.mustCrossKeys[i])) {
            if (research) _reportConnectivityRejection(research, 'must-cross', i, pos, state, level, prep, intNeeded, mcOpenMask, freshVolume, maxVisit, axisExhausted);
            return false;
        }
    }
    // Volume check (mirrors V1's _checkTopology): not enough accessible fresh cells to finish.
    // Disabled for portal levels only (portal jumps visit a destination cell for 0 path
    // steps, inflating freshVolume). MC levels use the same formula since intNeeded
    // accounts for the extra revisit steps — the double-count concern was unfounded.
    if (level.portalMap.size === 0) {
        const rSteps = level.reqLen - getRealLengthFromState(state);
        if (freshVolume + intNeeded < rSteps) {
            if (research) _reportConnectivityRejection(research, 'volume', undefined, pos, state, level, prep, intNeeded, mcOpenMask, freshVolume, maxVisit, axisExhausted, rSteps);
            return false;
        }
    }
    return true;
}

// Like isConnected but skips goal-reachability — for false-goal triggerability enumeration where
// any cell can be the endpoint and goal reachability is not required.
//
// Note the deliberately stricter maxVisit=1 (vs isConnected's maxVisit=2): false-goal trigger
// search is a best-effort, time-budgeted enumeration that already exhausts its
// budget on most levels, so it favors a cheaper, more aggressive connectivity
// prune. Raising this to 2 to mirror isConnected was measured to find zero
// additional triggerable false-goal cells on both completing and partial levels (final
// triggerable cells are gated by a full win-condition check before being added), so the
// looser bound buys nothing here — it would only prune less for no benefit.
export function isConnectedForFalseGoalTriggerSearch(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): boolean {
    const intNeeded = level.reqInt - state.ints;
    const maxVisit = intNeeded > 0 ? 1 : 0;

    const _cfgFalseGoalTriggerSearch = prep._cfg;
    const freshVolume = _floodFillReachability(pos, state, level, prep, maxVisit, (!_cfgFalseGoalTriggerSearch || _cfgFalseGoalTriggerSearch.PRUNE_CONNECTIVITY_AXIS_EXHAUSTED) as boolean);

    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && !_reached(level.mustPassKeys[i])) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && !_reached(level.mustCrossKeys[i])) return false;
    }
    if (level.portalMap.size === 0) {
        const rSteps = level.reqLen - getRealLengthFromState(state);
        if (freshVolume + intNeeded < rSteps) return false;
    }
    return true;
}
