import { KEY_SPACE, popcount } from './encoding.js';
import { getRealLengthFromState } from './solution.js';
import { CONNECTIVITY_WORK_UNITS, workMeter } from './work-meter.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState, PrepLevel } from './types.js';

const _reachQ   = new Int32Array(512); // BFS queue; max grid is 15x15=225 cells
let _reachGen   = 0;
const _reachGenBuf = new Uint32Array(KEY_SPACE); // generation tracking (32-bit avoids wrap)

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
// Axis-aware fill planes: reached-having-arrived-horizontally / -vertically, plus the per-row masks
// of cells that may still be ENTERED along each axis (edgeUsage bit free). See _floodFillAxis.
const _rowRH = new Uint32Array(MAX_BITROW_DIM);
const _rowRV = new Uint32Array(MAX_BITROW_DIM);
const _rowOkH = new Uint32Array(MAX_BITROW_DIM);
const _rowOkV = new Uint32Array(MAX_BITROW_DIM);

/** Which representation the last flood fill wrote its reachable set into: 0 = `_reachGenBuf`
 *  (the plain BFS), 1 = `_rowReached` (the bit-parallel fill). Read only by `_reached`. */
let _reachMode: 0 | 1 = 0;

/** Was cell `k` reached by the most recent flood fill? */
function _reached(k: number): boolean {
    return _reachMode === 1
        ? (_rowReached[(k >>> 16) & 0xFFFF] & (1 << (k & 0xFFFF))) !== 0
        : _reachGenBuf[k] === _reachGen;
}

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

// Shared flood fill for isConnected/isConnectedForTrap: traverses portal edges (via
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

/**
 * Axis-aware reachability — a fixpoint over (cell, entry-axis) states rather than over cells.
 *
 * The cell-level fills above decide traversability by visit count and edgeUsage === 3. That is
 * AXIS-BLIND: it routes through a cell whose only free axis has no open neighbour on that axis. The
 * real rule (search-state.ts's isMoveDynamicallyValid) is per-axis — entering `n` along axis `b`
 * needs `edgeUsage[n] & b === 0`, and turning at `c` additionally needs `edgeUsage[c] & b === 0`.
 * So this relation is a strict subset of the cell-level one, and using it tightens goal reachability,
 * objective reachability and freshVolume together.
 *
 * Two bit-planes, same shape as the cell fill:
 *   okH/okV  cells enterable along H / V (statically passable and that edgeUsage bit free)
 *   RH/RV    cells reached having arrived along H / V
 * Leaving `c` horizontally is legal if we arrived there horizontally (straight, no turn check) or
 * arrived vertically AND H is free at `c` (the turning rule) — i.e. `RH | (RV & okH)`. Vertically is
 * the mirror image. Deliberately permissive in three ways, so every rejection is a real theorem:
 * intersection budget is ignored, the seed cell is allowed both arrival axes, and flippers are not
 * modelled (a flipper only ever removes moves).
 *
 * Scored offline before being written: on 623 CP-SAT-labelled branches
 * (scripts/stress/axis-reach-probe.mjs) it rejects 18 of the 238 dead branches the live gauntlet
 * still enters, and 0 of 242 live ones.
 */
function _floodFillAxis(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, maxVisit: number, mcOpenMask: number, mcKeys: ArrayLike<number>, axisExhausted: boolean): number {
    const { w, h } = level.grid;
    const staticRows = prep.reachPassableRows as Uint32Array;
    const eu = state.edgeUsage;
    _reachMode = 1;

    // Start from the SAME per-row admissibility the cell fill uses — visit-count walls, used
    // flippers, the reserved-intersection re-add, the axis-exhaustion wall — then layer the per-axis
    // entry rule on top. Sharing _buildPassableRow is what makes this a strict refinement of the
    // cell fill rather than a second, differently-permissive relation running alongside it.
    for (let y = 0; y < h; y++) {
        _buildPassableRow(y, w, staticRows, state.visited, maxVisit, state.flipperUsedMask, prep.flipperKeys, mcOpenMask, mcKeys, eu, axisExhausted);
        const base = y << 16;
        const pass = _rowPassable[y];
        let okH = pass, okV = pass;
        for (let x = 0; x < w; x++) {
            const e = eu[base | x];
            if (e & 1) okH &= ~(1 << x);
            if (e & 2) okV &= ~(1 << x);
        }
        _rowOkH[y] = okH; _rowOkV[y] = okV;
        _rowRH[y] = 0; _rowRV[y] = 0; _rowReached[y] = 0;
    }

    const posX = pos & 0xFFFF, posY = (pos >>> 16) & 0xFFFF, posBit = 1 << posX;
    // The seed is occupied now: allow leaving it as if arrived on either axis, and force it
    // traversable regardless of its own visit count (mirrors the cell fill's treatment of `pos`).
    _rowOkH[posY] |= posBit; _rowOkV[posY] |= posBit;
    _rowRH[posY] |= posBit; _rowRV[posY] |= posBit;

    let changed = true;
    while (changed) {
        changed = false;
        for (let y = 0; y < h; y++) {
            const okH = _rowOkH[y], okV = _rowOkV[y];
            // Horizontal step, within the row.
            const leaveH = _rowRH[y] | (_rowRV[y] & okH);
            const gotH = (((leaveH << 1) | (leaveH >>> 1)) & okH) | _rowRH[y];
            if (gotH !== _rowRH[y]) { _rowRH[y] = gotH; changed = true; }
            // Vertical step, into the rows above and below.
            const leaveV = _rowRV[y] | (_rowRH[y] & okV);
            if (leaveV !== 0) {
                if (y > 0)     { const g = _rowRV[y - 1] | (leaveV & _rowOkV[y - 1]); if (g !== _rowRV[y - 1]) { _rowRV[y - 1] = g; changed = true; } }
                if (y < h - 1) { const g = _rowRV[y + 1] | (leaveV & _rowOkV[y + 1]); if (g !== _rowRV[y + 1]) { _rowRV[y + 1] = g; changed = true; } }
            }
        }
    }

    let freshVolume = 1;
    for (let y = 0; y < h; y++) {
        const r = (_rowRH[y] | _rowRV[y]);
        _rowReached[y] = r;   // _reached() reads this
        const base = y << 16;
        let m = r & ~(y === posY ? posBit : 0);
        while (m !== 0) {
            const x = 31 - Math.clz32(m & -m);
            m &= m - 1;
            if (state.visited[base | x] === 0) freshVolume++;
        }
    }
    return freshVolume;
}

function _floodFillReachability(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel, maxVisit: number, axisExhausted: boolean, mcOpenMask = 0, mcKeys: ArrayLike<number> = EMPTY_KEYS, axisAware = false): number {
    if (axisAware && prep.reachPassableRows !== null)
        return _floodFillAxis(pos, state, level, prep, maxVisit, mcOpenMask, mcKeys, axisExhausted);
    return prep.reachPassableRows !== null
        ? _floodFillBits(pos, state, level, prep, maxVisit, mcOpenMask, mcKeys, axisExhausted)
        : _floodFillBfs(pos, state, level, prep, maxVisit, mcOpenMask, mcKeys, axisExhausted);
}

const EMPTY_KEYS: ArrayLike<number> = [];

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
export function isConnected(pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): boolean {
    workMeter.units += CONNECTIVITY_WORK_UNITS;  // see work-meter.ts
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
    // Axis-aware reachability (PRUNE_CONNECTIVITY_AXIS_AWARE): portal-free only, since the fill has
    // no portal-edge handling and a jump would be an axis-free arrival.
    const axisAware = ((!_cfg || _cfg.PRUNE_CONNECTIVITY_AXIS_AWARE) && level.portalMap.size === 0) as boolean;
    const freshVolume = _floodFillReachability(pos, state, level, prep, maxVisit, axisExhausted, mcOpenMask, level.mustCrossKeys, axisAware);

    if (!_reached(level.goalKey)) return false;
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && !_reached(level.mustPassKeys[i])) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && !_reached(level.mustCrossKeys[i])) return false;
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

    const _cfgTrap = prep._cfg;
    const freshVolume = _floodFillReachability(pos, state, level, prep, maxVisit, (!_cfgTrap || _cfgTrap.PRUNE_CONNECTIVITY_AXIS_EXHAUSTED) as boolean);

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

