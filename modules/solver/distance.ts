import { AXIS_V, PACK } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';

export interface DistMapOpts {
    /** Trap search wants existing false goals reachable as candidate endpoints, so its own prep
     *  (prepLevel(level, { allowFalseGoalNeighbors: true })) needs this BFS to agree with its
     *  staticNeighborKeys, which allows the same thing for the same reason — see prep.ts. */
    allowFalseGoalNeighbors?: boolean;
}

// 0-1 BFS: portals are 0-cost edges, regular moves cost 1.
//
// Two kinds of "can't route through" a real winning path enforces, and they get different
// treatment here:
//
//  - NEVER PASSABLE (blocks, geese): a real path can never occupy this cell at all, not even
//    transiently (move-rules.ts rejects entering either unconditionally). Excluded entirely —
//    never assigned a distance, never a source, never expanded.
//
//  - SINK (gates, and false goals unless the caller opts in): a real path CAN occupy this cell —
//    a gate is always where the path starts, a false goal can legally be stepped onto — but can
//    never use it as a PASS-THROUGH to reach further cells (re-entering any gate is always
//    invalid, "invalid-gate-reentry"; landing on an unarmed false goal locks the path from moving
//    further, path-validator.ts's `invalid-false-goal-lock`, or isn't the true goal). So a sink
//    cell still gets a real, finite distance when discovered — that distance is meaningful (e.g.
//    "how far from here to the must-pass cell" when the current search position IS the gate) —
//    it just never propagates the BFS onward to ITS neighbors, since no real path routes through
//    it. A sink CAN be a source, though (see the source loop below): starting there and moving
//    outward is exactly normal play, only re-arriving at one mid-route is forbidden.
//
// This must stay a subset of what prep.ts's staticNeighborKeys treats as passable for ordinary
// mid-route stepping: marking a cell impassable/sink-only here can only make a distance larger or
// unreachable, and it stays a sound lower bound only because no real path could have routed
// through that cell anyway. Treating fewer cells this way is always safe (just a looser bound);
// treating MORE this way risks overestimating a real shortest distance and pruning a feasible
// solution — never add an exclusion here without confirming it's equally unconditional.
export function buildDistMap(level: NormalizedLevel, sourceKeys: Iterable<number>, opts: DistMapOpts = {}): Map<number, number> {
    const { w, h } = level.grid;
    const blockSet = level.blockSet;
    const gooseSet = level.gooseSet;
    const falseGoalKeys = level.falseGoalKeys;
    const gateKeys = level.gateKeys;
    const allowFalseGoals = !!opts.allowFalseGoalNeighbors;
    const neverPassable = (k: number) => blockSet.has(k) || gooseSet.has(k);
    const isSink = (k: number) => gateKeys.includes(k) || (!allowFalseGoals && falseGoalKeys.has(k));
    const portalMap = level.portalMap;
    const map = new Map<number, number>();
    // Deque: head/tail pointers into a circular buffer
    const cap = Math.max(64, (w * h) * 2);
    const buf = new Int32Array(cap);
    let head = 0, tail = 0;
    const push_front = (k: number) => { head = (head - 1 + cap) % cap; buf[head] = k; };
    const push_back  = (k: number) => { buf[tail] = k; tail = (tail + 1) % cap; };
    const pop_front  = ()  => { const k = buf[head]; head = (head + 1) % cap; return k; };
    const empty      = ()  => head === tail;

    // Relax an edge into `nk` at distance `nd`. Records the distance whenever it's an improvement
    // (or first discovery), but only enqueues `nk` for further expansion when it isn't a sink —
    // that's the whole mechanism that lets a sink be assigned a real distance without ever
    // becoming a through-node for the rest of the BFS.
    const relax = (nk: number, nd: number, pushFn: (k: number) => void) => {
        if (neverPassable(nk)) return;
        const existing = map.get(nk);
        if (existing !== undefined && nd >= existing) return;
        map.set(nk, nd);
        if (!isSink(nk)) pushFn(nk);
    };

    // Sources are trusted starting points, not "arrived at via a move" — a gate/false-goal source
    // still propagates outward normally (matching relax's sink exception for sources: starting
    // there and walking away is exactly normal play). Only never-passable cells are excluded.
    for (const k of sourceKeys) {
        if (k == null || k < 0 || neverPassable(k)) continue;
        if (!map.has(k)) { map.set(k, 0); push_back(k); }
    }
    while (!empty()) {
        const k = pop_front();
        const d = map.get(k) as number; // always set before enqueue
        // Portal edge (0-cost).
        const portal = portalMap.get(k);
        if (portal && portal.dest >= 0) relax(portal.dest, d, push_front);
        // 4-directional (cost 1)
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        if (x + 1 < w) relax(k + 1,       d + 1, push_back);
        if (x > 0)     relax(k - 1,       d + 1, push_back);
        if (y + 1 < h) relax(k + 0x10000, d + 1, push_back);
        if (y > 0)     relax(k - 0x10000, d + 1, push_back);
    }
    return map;
}

// Build a BFS distance map from approach cells on one side of a flipper or MC cell.
// ax=AXIS_V → sources above/below (cx, cy±1); otherwise sources left/right (cx±1, cy).
// filterFn(k) returns true for cells that qualify as approach sources.
export function buildAxisApproachMap(level: NormalizedLevel, cx: number, cy: number, ax: number, filterFn: (k: number) => boolean, opts: DistMapOpts = {}): Map<number, number> {
    const { w, h } = level.grid;
    const cands = ax === AXIS_V
        ? [cy > 0     ? PACK(cx, cy - 1) : -1, cy < h - 1 ? PACK(cx, cy + 1) : -1]
        : [cx > 0     ? PACK(cx - 1, cy) : -1, cx < w - 1 ? PACK(cx + 1, cy) : -1];
    const sources = cands.filter(k => k >= 0 && filterFn(k));
    return sources.length > 0 ? buildDistMap(level, sources, opts) : new Map();
}


/** Dense grid index for a packed cell key: row-major `y * gridW + x`.
 *
 *  Distance arrays used to be KEY_SPACE-sized (1,048,576 entries, 2 MB) and indexed by the packed
 *  key directly, because `PACK` spreads rows 65,536 apart. A level builds 11+ of them, so that was
 *  20+ MB of zero-page allocation per level for a grid with at most 225 live cells — the dominant
 *  remaining cost in prepLevel once the fills were removed. Indexing densely makes each array
 *  `gridW * gridH` entries instead.
 *
 *  Cache locality is NOT the motivation: sparse-vs-dense access was measured at 456ms vs 449ms on
 *  this access pattern (docs/solver-architecture.md's Tier 3 note). The win is allocation only. */
export function denseIndex(k: number, gridW: number): number {
    return ((k >>> 16) & 0xFFFF) * gridW + (k & 0xFFFF);
}

// Convert a Map<packedKey, distance> to a dense Uint16Array for O(1) access.
//
// Stores distance+1 so that ZERO means unreachable. That is what lets this skip the fill: a
// Uint16Array is already zero-initialised, so an unreachable cell needs no write at all, and the
// pages backing the untouched 99.98% of the key space are never dirtied. The previous encoding used
// 0xFFFF as the unreachable sentinel, which forced `arr.fill(0xFFFF)` — 1,048,576 writes per map,
// with 11+ maps built per level, on a grid that has at most 225 live cells. Measured at 7.3% of
// solver CPU on a short-solve workload (plus its share of prepLevel), for a grid the search can
// only ever read <=225 cells of.
//
// Strictly no less safe than the old sentinel: an out-of-grid or unwritten key read 0xFFFF ->
// Infinity before and reads 0 -> Infinity now. The clamp is unchanged from the old encoding
// (distances >= 0xFFFF still saturate to 0xFFFE), it is just stored biased, so every observable
// value round-trips exactly as before.
export function distMapToArray(map: Map<number, number>, gridW: number, gridH: number): Uint16Array {
    const arr = new Uint16Array(gridW * gridH);
    for (const [k, d] of map) arr[denseIndex(k, gridW)] = (d < 0xFFFF ? d : 0xFFFE) + 1;
    return arr;
}

// Inline distance lookup: dense-indexed Uint16Array, 0 (never written) → Infinity.
// `gridW` is REQUIRED, deliberately: making it mandatory is what forces the compiler to enumerate
// every call site when the arrays became dense, so no read could silently keep using a packed key
// (which would alias to a real, wrong cell rather than failing loudly). See denseIndex.
export function getDistanceFromArray(arr: Uint16Array, k: number, gridW: number): number {
    const v = arr[denseIndex(k, gridW)];
    return v === 0 ? Infinity : v - 1;
}
