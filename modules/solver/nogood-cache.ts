// Repair-local dead-state cache. One instance per repairSearchFromGate call; never shared or
// persisted. Signatures are recomputed from live state rather than incrementally hashed, avoiding
// desynchronization across repair operators. This cache only short-circuits repeat randomized-walk
// dead ends; it is not proof a state is unsolvable and does not replace referee/prune checks.
// Evidence/history: reports/2026-08-07-repair-nogood-cache.md.
import type { SolverSearchState } from './types.js';

/** Exact repair-state signature. `ints` is required because identical edgeUsage can encode paths
 * with different intersection counts. Full strings avoid hash-collision soundness risk. */
function stateSignature(ws: SolverSearchState): string {
    const pos = ws.path[ws.path.length - 1];
    const seen = new Set<number>();
    let visitedPart = '';
    for (const k of ws.path) {
        if (seen.has(k)) continue;
        seen.add(k);
        visitedPart += `${k}:${ws.edgeUsage[k]},`;
    }
    return `${pos}|${visitedPart}|${ws.portalJumps}|${ws.ints}|${ws.mpVisitedMask}|${ws.mustCrossMask}|${ws.crossCounts.join('.')}`
         + `|${ws.surroundMask}|${ws.surroundNeighborRemainingMasks.join('.')}|${ws.mustTurnMask}|${ws.adjTurnMask}`
         + `|${ws.flipperUsedMask}|${ws.lastWasPortalJump ? 1 : 0}`;
}

/** Capacity loss only misses cache opportunities; it cannot reject a new state. */
const NOGOOD_CACHE_CAPACITY = 500000;

export interface NogoodCache {
    /** Was this exact state recorded dead earlier in this repair call? */
    has(ws: SolverSearchState): boolean;
    /** Record the current state; no-op at capacity. */
    recordDead(ws: SolverSearchState): void;
    readonly size: number;
}

/** `capacity` is exposed for tests. */
export function createNogoodCache(capacity: number = NOGOOD_CACHE_CAPACITY): NogoodCache {
    const seen = new Set<string>();
    return {
        has(ws: SolverSearchState): boolean {
            return seen.has(stateSignature(ws));
        },
        recordDead(ws: SolverSearchState): void {
            if (seen.size >= capacity) return;
            seen.add(stateSignature(ws));
        },
        get size(): number {
            return seen.size;
        },
    };
}
