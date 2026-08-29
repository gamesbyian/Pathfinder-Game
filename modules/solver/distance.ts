import { AXIS_V, PACK } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';

export interface DistMapOpts {
    /** Trap search may route to existing false goals as candidate endpoints. */
    allowFalseGoalNeighbors?: boolean;
    /** GUIDANCE-ONLY escape hatch: recreates the pre-6f00baf routing (geese/gates/false-goals
     *  treated as ordinary passable through-nodes, not excluded/sinks at all). This can
     *  UNDERESTIMATE true distance — it is NOT a sound lower bound and must never feed pruning
     *  (lower-bounds.ts/prune-gauntlet.ts) or an admissible heuristic (admissible-order-search.ts).
     *  It exists only because scoring.ts's move-ordering guidance is not safety-monotonic the way
     *  pruning is: the technically-wrong pre-fix distances empirically routed several budget-
     *  limited searches toward their winning branch by coincidence (see
     *  docs/solver-optimization-workstreams.md's "Distance-guidance/pruning split" entry and
     *  reports/2026-08-22-corpus2-node-budget-losses.md). Use only for a dedicated guidance-only
     *  distance map, never to replace the corrected default. */
    legacyGuidanceRouting?: boolean;
}

// 0-1 BFS: portal jumps cost 0, regular moves cost 1. Blocks/geese are never passable. Gates and
// (normally) false goals are sinks: they may have finite distance or be sources, but are not through-nodes.
// Any new exclusion must be equally unconditional or the resulting distance can cease to be a sound lower bound.
// (legacyGuidanceRouting disables both exclusions entirely — see its own doc comment above; it
// deliberately breaks the lower-bound soundness this comment otherwise guarantees.)
export function buildDistMap(level: NormalizedLevel, sourceKeys: Iterable<number>, opts: DistMapOpts = {}): Map<number, number> {
    const { w, h } = level.grid;
    const blockSet = level.blockSet;
    const gooseSet = level.gooseSet;
    const falseGoalKeys = level.falseGoalKeys;
    const gateKeys = level.gateKeys;
    const allowFalseGoals = !!opts.allowFalseGoalNeighbors;
    const legacyRouting = !!opts.legacyGuidanceRouting;
    const neverPassable = (k: number) => blockSet.has(k) || (!legacyRouting && gooseSet.has(k));
    const isSink = (k: number) => !legacyRouting && (gateKeys.includes(k) || (!allowFalseGoals && falseGoalKeys.has(k)));
    const portalMap = level.portalMap;
    const map = new Map<number, number>();
    const cap = Math.max(64, (w * h) * 2);
    const buf = new Int32Array(cap);
    let head = 0, tail = 0;
    const push_front = (k: number) => { head = (head - 1 + cap) % cap; buf[head] = k; };
    const push_back  = (k: number) => { buf[tail] = k; tail = (tail + 1) % cap; };
    const pop_front  = ()  => { const k = buf[head]; head = (head + 1) % cap; return k; };
    const empty      = ()  => head === tail;

    // Record improved sink distances but do not expand through sinks.
    const relax = (nk: number, nd: number, pushFn: (k: number) => void) => {
        if (neverPassable(nk)) return;
        const existing = map.get(nk);
        if (existing !== undefined && nd >= existing) return;
        map.set(nk, nd);
        if (!isSink(nk)) pushFn(nk);
    };

    // Sources are starting positions, so sinks may expand outward when supplied explicitly.
    for (const k of sourceKeys) {
        if (k == null || k < 0 || neverPassable(k)) continue;
        if (!map.has(k)) { map.set(k, 0); push_back(k); }
    }
    while (!empty()) {
        const k = pop_front();
        const d = map.get(k) as number;
        const portal = portalMap.get(k);
        if (portal && portal.dest >= 0) relax(portal.dest, d, push_front);
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        if (x + 1 < w) relax(k + 1,       d + 1, push_back);
        if (x > 0)     relax(k - 1,       d + 1, push_back);
        if (y + 1 < h) relax(k + 0x10000, d + 1, push_back);
        if (y > 0)     relax(k - 0x10000, d + 1, push_back);
    }
    return map;
}

/** Distance map from axis-aligned approach cells around a flipper/must-cross cell. */
export function buildAxisApproachMap(level: NormalizedLevel, cx: number, cy: number, ax: number, filterFn: (k: number) => boolean, opts: DistMapOpts = {}): Map<number, number> {
    const { w, h } = level.grid;
    const cands = ax === AXIS_V
        ? [cy > 0     ? PACK(cx, cy - 1) : -1, cy < h - 1 ? PACK(cx, cy + 1) : -1]
        : [cx > 0     ? PACK(cx - 1, cy) : -1, cx < w - 1 ? PACK(cx + 1, cy) : -1];
    const sources = cands.filter(k => k >= 0 && filterFn(k));
    return sources.length > 0 ? buildDistMap(level, sources, opts) : new Map();
}

/** Row-major dense index for a packed key; avoids KEY_SPACE-sized distance arrays. */
export function denseIndex(k: number, gridW: number): number {
    return ((k >>> 16) & 0xFFFF) * gridW + (k & 0xFFFF);
}

/** Convert packed-key distances to dense Uint16; zero means unreachable, stored values are distance+1. */
export function distMapToArray(map: Map<number, number>, gridW: number, gridH: number): Uint16Array {
    const arr = new Uint16Array(gridW * gridH);
    for (const [k, d] of map) arr[denseIndex(k, gridW)] = (d < 0xFFFF ? d : 0xFFFE) + 1;
    return arr;
}

/** Dense distance lookup; zero/unwritten means unreachable. `gridW` is intentionally mandatory. */
export function getDistanceFromArray(arr: Uint16Array, k: number, gridW: number): number {
    const v = arr[denseIndex(k, gridW)];
    return v === 0 ? Infinity : v - 1;
}
