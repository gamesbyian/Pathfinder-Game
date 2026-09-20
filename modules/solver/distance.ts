import { AXIS_V, PACK } from './encoding.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';

export interface DistMapOpts {
    /** Trap search may route to existing false goals as candidate endpoints. */
    allowFalseGoalNeighbors?: boolean;
    /** GUIDANCE-ONLY escape hatch: recreates the pre-6f00baf routing (geese/gates/false-goals
     *  treated as ordinary passable through-nodes, not excluded/sinks at all). This can
     *  UNDERESTIMATE true distance — it is NOT a sound lower bound and must never feed pruning
     *  (lower-bounds.ts/hard-prune-pipeline.ts) or an admissible heuristic (admissible-order-search.ts).
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

/**
 * Static two-layer 0-1 relaxation for Lane H1.
 *
 * Layer q is the parity of opposite-checkerboard ("twist") portal jumps used between a queried
 * cell and the source. Cardinal moves cost 1 and preserve q; portal jumps cost 0 and toggle q iff
 * their terminals have opposite checkerboard parity. As with buildDistMap, gates/false-goals are
 * sinks and dynamic path state is ignored, so the result may be too optimistic but never too
 * pessimistic for a hard lower-bound consumer.
 *
 * Returns dense distance arrays [evenTwistParity, oddTwistParity], using the same zero=unreachable,
 * distance+1 encoding as distMapToArray().
 */
export function buildParityPhaseDistArrays(
    level: NormalizedLevel,
    sourceKey: number,
    opts: DistMapOpts = {},
): [Uint16Array, Uint16Array] {
    const { w, h } = level.grid;
    const n = w * h;
    const blockSet = level.blockSet;
    const gooseSet = level.gooseSet;
    const falseGoalKeys = level.falseGoalKeys;
    const gateKeys = level.gateKeys;
    const allowFalseGoals = !!opts.allowFalseGoalNeighbors;
    const legacyRouting = !!opts.legacyGuidanceRouting;
    const neverPassable = (k: number) => blockSet.has(k) || (!legacyRouting && gooseSet.has(k));
    const isSink = (k: number) => !legacyRouting && (gateKeys.includes(k) || (!allowFalseGoals && falseGoalKeys.has(k)));

    const dist = new Int32Array(n * 2);
    dist.fill(-1);
    const deque: number[] = [];

    const dense = (k: number) => (((k >>> 16) & 0xFFFF) * w) + (k & 0xFFFF);
    const stateId = (k: number, q: number) => (dense(k) << 1) | q;
    const keyOf = (id: number) => {
        const d = id >>> 1;
        return PACK(d % w, (d / w) | 0);
    };
    const relax = (nk: number, q: number, nd: number, zeroCost: boolean) => {
        if (neverPassable(nk)) return;
        const id = stateId(nk, q);
        const old = dist[id];
        if (old !== -1 && old <= nd) return;
        dist[id] = nd;
        if (!isSink(nk)) {
            if (zeroCost) deque.unshift(id);
            else deque.push(id);
        }
    };

    if (!neverPassable(sourceKey)) {
        const source = stateId(sourceKey, 0);
        dist[source] = 0;
        deque.push(source);
    }

    while (deque.length > 0) {
        const id = deque.shift() as number;
        const q = id & 1;
        const k = keyOf(id);
        const d = dist[id];

        const portal = level.portalMap.get(k);
        if (portal && portal.dest >= 0) {
            const twist = keyParity(k) ^ keyParity(portal.dest);
            relax(portal.dest, q ^ twist, d, true);
        }

        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        if (x + 1 < w) relax(k + 1, q, d + 1, false);
        if (x > 0)     relax(k - 1, q, d + 1, false);
        if (y + 1 < h) relax(k + 0x10000, q, d + 1, false);
        if (y > 0)     relax(k - 0x10000, q, d + 1, false);
    }

    const out0 = new Uint16Array(n);
    const out1 = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
        const d0 = dist[i << 1], d1 = dist[(i << 1) | 1];
        if (d0 >= 0) out0[i] = Math.min(d0, 0xFFFE) + 1;
        if (d1 >= 0) out1[i] = Math.min(d1, 0xFFFE) + 1;
    }
    return [out0, out1];
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
