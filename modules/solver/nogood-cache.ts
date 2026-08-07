// Repair-search's nogood cache — docs/repair-search-stagnation-escape-plan.md's Appendix "Stage 1
// — The nogood cache", built after Stage 0's premise check (temporary instrumentation in
// repair-search.ts, PF_NOGOOD_STAGE0_DEBUG=1) found dead-end state repeats far above the design's
// own falsification threshold: 40-87% of takePly dead-ends across 10 real repair-close levels were
// EXACT repeats of a state already dead-ended earlier in the SAME repairSearchFromGate call
// (fresh restarts alone: 41-64%; elite-spliced restarts: 57-87%) — decisively above the <1%
// "stop here" bar and the "low single digits" "proceed to Stage 1" bar. See
// reports/2026-08-07-repair-nogood-cache.md for the full premise-check numbers and this
// mechanism's own validation.
//
// SCOPED AND OWNED ENTIRELY BY repair-search.ts — not a general-purpose cache, not shared with
// DFS/beam or search-state.ts. Lifecycle: one instance per repairSearchFromGate call (a fresh
// dead-state universe every call — never persisted or shared across calls/levels/gates).
//
// DELIBERATE SIMPLIFICATION vs. the plan's original "incremental Zobrist-style hashing" design:
// this computes the state signature FRESH (from ws's current fields) on every check/record, not
// incrementally maintained across applyMove/undoMove. The plan's own risk callout is why: an
// incremental hash requires EVERY applyMove/undoMove call site to correctly update it, and
// repair-search.ts has grown to five (takePly, closeLengthGap, replayToPrefix, boundedDfsFromHere,
// relinkPaths) since the plan was written — one missed site silently desyncs the hash from the
// real state, which is a SOUNDNESS bug (a false "this state is dead" rejects a state this cache
// was never actually told is dead), not just a missed optimization, exactly CLAUDE.md's
// memoization-soundness gotcha. A fresh computation is trivially correct by construction: it can
// never disagree with `ws`'s actual current state, because it always reads it directly. The CPU
// cost this trades away is bounded (checked once per COMMITTED step in repairSearchFromGate's
// main loop, not once per CANDIDATE inside takePly — see that call site's own comment for why this
// still captures the core value found in the premise check while keeping the hot-path cost down).
//
// SOUNDNESS: a cache hit only ever short-circuits repair's OWN randomized-walk continuation
// (`takePly`'s 'continue' outcome becomes 'deadend') — it never touches `evaluatePrunedMove` or
// `isSolutionState`, and every OTHER operator in this file (closeLengthGap, elitePrefixDfsRepair,
// relinkPaths) still runs its own independent bounded search from a state this cache calls
// "dead-ended once by takePly's single random choice" — that phrase describes exactly what's
// recorded: "this exact state, reached before, led nowhere under takePly's own exploration" — not
// "this state is provably unsolvable." A false "not found" (a missed cache opportunity, e.g. from
// hitting the capacity cap) costs speed, never correctness; a false "found" is structurally
// impossible under a fresh, full-field signature (see below) with no collision-prone shortcuts.
import type { SolverSearchState } from './types.js';

/** Same field set validated by the Stage 0 premise check's `stage0Signature`
 *  (repair-search.ts) — pos, per-visited-cell edgeUsage (order-independent: unique cells only,
 *  duplicates from re-entering an already-visited cell contribute nothing new), portalJumps,
 *  ints, mpVisitedMask, mustCrossMask + crossCounts, surroundMask +
 *  surroundNeighborRemainingMasks, mustTurnMask, adjTurnMask, flipperUsedMask,
 *  lastWasPortalJump. `ints` is NOT in the escape plan's own original field list — added after
 *  Stage 0 found a real gap: a cell that turned on its one-and-only visit and a cell visited
 *  straight-through twice can reach the identical final edgeUsage value (both axis bits set) but
 *  contribute different intersection counts, so omitting `ints` would treat two states with
 *  different remaining intersection budgets as identical. Full-string equality (not a numeric
 *  hash with a separate collision-prone shortcut) — see this file's header comment for why. */
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

/** Hard capacity cap — dropping an insert past this costs opportunity (a later repeat of a
 *  since-dropped state won't be caught), never soundness. 500,000 matches the plan's own starting
 *  value; unmeasured/uncalibrated, like every other constant introduced with this mechanism. */
const NOGOOD_CACHE_CAPACITY = 500000;

export interface NogoodCache {
    /** Has this exact state already been recorded dead earlier in this repairSearchFromGate call? */
    has(ws: SolverSearchState): boolean;
    /** Record ws's current state as dead. No-op past capacity (see NOGOOD_CACHE_CAPACITY). */
    recordDead(ws: SolverSearchState): void;
    readonly size: number;
}

/** One instance per repairSearchFromGate call — see this file's header comment for the lifecycle
 *  rule. `capacity` exposed for unit testing (a tiny cap exercises the drop-past-capacity path
 *  without needing 500k real inserts). */
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
