import { AXIS_V, PACK } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';

// 0-1 BFS: portals are 0-cost edges, regular moves cost 1.
export function buildDistMap(level: NormalizedLevel, sourceKeys: Iterable<number>): Map<number, number> {
    const { w, h } = level.grid;
    const blockSet = level.blockSet;
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

    for (const k of sourceKeys) {
        if (k == null || k < 0 || blockSet.has(k)) continue;
        if (!map.has(k)) { map.set(k, 0); push_back(k); }
    }
    while (!empty()) {
        const k = pop_front();
        const d = map.get(k) as number; // always set before enqueue
        // Portal edge (0-cost). The blockSet check on portal.dest is defense-in-depth, not
        // evidence a portal destination can coincide with a block in valid data — one object
        // per cell is an absolute invariant (enforced by validateRawLevel; see CLAUDE.md's "Cell
        // occupancy is an absolute invariant" note), so this should never actually fire on a
        // schema-valid level.
        const portal = portalMap.get(k);
        if (portal && portal.dest >= 0 && !blockSet.has(portal.dest)) {
            if (!map.has(portal.dest) || d < (map.get(portal.dest) ?? Infinity)) {
                map.set(portal.dest, d);
                push_front(portal.dest);
            }
        }
        // 4-directional (cost 1)
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        if (x + 1 < w) { const nk = k + 1;       const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < (map.get(nk) ?? Infinity)) { map.set(nk, nd); push_back(nk); } }
        if (x > 0)     { const nk = k - 1;       const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < (map.get(nk) ?? Infinity)) { map.set(nk, nd); push_back(nk); } }
        if (y + 1 < h) { const nk = k + 0x10000; const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < (map.get(nk) ?? Infinity)) { map.set(nk, nd); push_back(nk); } }
        if (y > 0)     { const nk = k - 0x10000; const nd = d + 1; if (!map.has(nk) && !blockSet.has(nk)) { map.set(nk, nd); push_back(nk); } else if (map.has(nk) && nd < (map.get(nk) ?? Infinity)) { map.set(nk, nd); push_back(nk); } }
    }
    return map;
}

// Build a BFS distance map from approach cells on one side of a flipper or MC cell.
// ax=AXIS_V → sources above/below (cx, cy±1); otherwise sources left/right (cx±1, cy).
// filterFn(k) returns true for cells that qualify as approach sources.
export function buildAxisApproachMap(level: NormalizedLevel, cx: number, cy: number, ax: number, filterFn: (k: number) => boolean): Map<number, number> {
    const { w, h } = level.grid;
    const cands = ax === AXIS_V
        ? [cy > 0     ? PACK(cx, cy - 1) : -1, cy < h - 1 ? PACK(cx, cy + 1) : -1]
        : [cx > 0     ? PACK(cx - 1, cy) : -1, cx < w - 1 ? PACK(cx + 1, cy) : -1];
    const sources = cands.filter(k => k >= 0 && filterFn(k));
    return sources.length > 0 ? buildDistMap(level, sources) : new Map();
}


// Convert a Map<packedKey, distance> to a Uint16Array for O(1) array access.
// 0xFFFF is the unreachable sentinel (distances on current grids never exceed it).
export function distMapToArray(map: Map<number, number>, keySpace: number): Uint16Array {
    const arr = new Uint16Array(keySpace);
    arr.fill(0xFFFF);
    for (const [k, d] of map) arr[k] = d < 0xFFFF ? d : 0xFFFE;
    return arr;
}

// Inline distance lookup: Uint16Array[key] with 0xFFFF → Infinity.
export function getDistanceFromArray(arr: Uint16Array, k: number): number {
    const v = arr[k];
    return v === 0xFFFF ? Infinity : v;
}
