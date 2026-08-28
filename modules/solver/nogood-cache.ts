// Repair-local failed-state experience cache. One instance per repairSearchFromGate call; never
// shared or persisted. Signatures are recomputed from live state rather than incrementally hashed,
// avoiding desynchronization across repair operators. A recorded entry means only that one prior
// randomized repair continuation from this matching signature ended without solving. It is NOT a
// proof that the state is globally unsatisfiable or that every continuation from it is fruitless.
// A hit therefore changes incomplete repair exploration (for speed/diversification) but cannot
// manufacture an invalid solution; referee/prune checks remain the only logical authorities.
// Evidence/history: reports/2026-08-07-repair-nogood-cache.md.
import type { SolverSearchState } from './types.js';

/** Fine-grained repair-state signature used for within-call experience matching. `ints` is required
 * because identical edgeUsage can encode paths with different intersection counts. Full strings
 * avoid hash collisions, but equality here should not be read as a proof of future-state equivalence.
 * Exported for topology.ts's research-only ConnectivityRejectionObserver (see docs/solver-
 * optimization-current-queue.md item #0 and reports/2026-08-24-learned-failure-certificate-audit.md's
 * Stage A) — a second, unrelated observational consumer of the same "exact-state fingerprint"
 * concept. Not a production search dependency in either caller. */
export function stateSignature(ws: SolverSearchState): string {
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

/** Capacity loss only misses experience-cache opportunities; it cannot reject a new signature. */
const NOGOOD_CACHE_CAPACITY = 500000;

export interface NogoodCache {
    /** Was this matching repair-state signature previously recorded after a failed continuation? */
    has(ws: SolverSearchState): boolean;
    /** Record the current failed-continuation signature; no-op at capacity. */
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
