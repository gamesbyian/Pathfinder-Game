// Shared fixtures for the split orchestration.test.ts suite (orchestration-*.test.ts): level
// fixtures and mock attempt dispatchers reused across more than one of those files. A fixture or
// dispatcher used by only one split file stays local to that file instead of here.
import type { NormalizedLevel } from '../domain/types.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { PACK } from './encoding.js';

export function makeLineLevel() {
    return {
        grid: { w: 3, h: 1 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(2, 0),
        requiredLength: 2,
        requiredIntersections: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

// Repair-gated (mustCross >= POLICY.REPAIR_MC_MIN, mustPass >= POLICY.REPAIR_MP_MIN — see
// attempts.ts's needsRepairFallback) and deterministically infeasible (requiredLength: 1 vs. a
// gate/goal Manhattan distance of 10), so the ordinary repair probe exhausts its node budget on
// every seed rather than winning — a fast, reliable way to exercise runEarlyRepairSearch's multi-seed
// retry mechanism itself (attempt count, recorded seedSalt values, ablation gating) without
// depending on any specific level actually being rescued by a particular seed.
export function makeRepairGatedInfeasibleLevel() {
    return {
        grid: { w: 6, h: 6 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(5, 5),
        requiredLength: 1,
        requiredIntersections: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [PACK(1, 1), PACK(3, 1), PACK(1, 3)],
        mustCrossKeys: [PACK(2, 2), PACK(4, 4)],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

// A stub attempt dispatcher for tests whose assertion is about orchestration bookkeeping (attempt
// scheduling, seed/flag routing, node-budget capping) rather than an actual solve outcome: it never
// finds a solution, but honestly reports nodesExpanded as whatever nodeBudget it was granted
// (simulating a search that exhausts its allotted round rather than idling), so real accounting
// logic under test — orchestration.ts's own budget apportionment, not this file's search cost —
// still sees genuine numbers. Using this in place of a real repair/DFS search turns a multi-second
// node-budget-bound solve into a sub-millisecond one without touching the orchestration code being
// tested; see the sibling STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET tests above for the same
// pattern applied by hand.
export const exhaustingDispatch: typeof runAttemptSearch = (async (...args: Parameters<typeof runAttemptSearch>) => {
    const prep = args[3];
    const nodeBudget = args[8];
    const out = args[9];
    const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
    if (prep._metrics) prep._metrics.nodesExpanded += spent;
    if (out) out.nodesExpanded = spent;
    return null;
}) as typeof runAttemptSearch;

// Not repair-gated (no mustCross/mustPass, low requiredIntersections — needsRepairFallback in attempts.ts stays
// false, so repairConfigs is empty and the repair loop never runs) but deterministically
// infeasible (requiredLength: 2 vs. a gate/goal Manhattan distance of 6 — same PARITY as the true distance,
// so STRATEGY_PARITY_GATE_FILTER doesn't drop the gate entirely and every config actually gets to
// run, unlike an odd requiredLength here which empties activeGates before any attempt starts), so every
// main-search attempt is pruned near-instantly by the distance-bound check regardless of search
// strategy — a fast, reliable way to reach the 2026-07-16 goal-attraction-disabled-retry last-resort pass
// (orchestration.ts's solveLevel, after the main loop AND the empty repair loop both "fail")
// without depending on any specific level's scoring actually being rescued.
export function makeGoalAttractionDisabledRetryGatedInfeasibleLevel() {
    return {
        grid: { w: 4, h: 4 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(3, 3),
        requiredLength: 2,
        requiredIntersections: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

// STRATEGY_REPAIR_FALLBACK_NODE_RESERVE (opt-in, default OFF — see REPAIR_FALLBACK_NODE_RESERVE_
// FRACTION's own comment for the two-revision history this test suite is meant to prevent a third
// instance of). Fixture: makeRepairGatedInfeasibleLevel() has exactly 1 repair config (ordinary,
// no must-turn-biased tier) and 16 main configs (confirmed by direct inspection); the probe is
// disabled via STRATEGY_EARLY_REPAIR_SEARCH: false so it contributes zero nodes, isolating the mechanism
// under test (main loop vs. repair fallback loop) from the probe's own fixed-cost budget entirely.
// The mock dispatch consumes exactly the nodeBudget it is given for every attempt and never solves,
// mirroring the main-search-late-reserve tests' own established pattern.
export function repairFallbackReserveDispatch(): typeof runAttemptSearch {
    return (async (...args: Parameters<typeof runAttemptSearch>) => {
        const [, , , prep, , , , , nodeBudget, out] = args;
        const spent = Number.isFinite(nodeBudget) ? Number(nodeBudget) : 1;
        if (prep._metrics) prep._metrics.nodesExpanded += spent;
        if (out) { out.nodesExpanded = spent; out.timedOut = true; }
        return null;
    }) as typeof runAttemptSearch;
}
