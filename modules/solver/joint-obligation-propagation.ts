// Observer-only joint-obligation propagation (2026-09-09 handoff's scoped pilot; see
// reports/2026-09-11-joint-obligation-propagation-observer-pilot-001.md for the pilot's design,
// evidence population, and promotion-gate results). NEVER consulted by search — every verdict here
// is logged for offline analysis only, mirroring ConnectivityRejectionObserver's own discipline
// ("observing an already-computed rejection reason changes no pruning/ordering/budget decision").
// Type contracts (ObligationCluster/JointObligationRecord/JointObligationObserver) live in
// types.ts alongside the analogous ConnectivityRejectionObserver/BeamResearchObserver contracts.
//
// First (and currently only) obligation-cluster kind: a pending must-cross cell whose still-open
// axis forces a specific cardinal neighbor (lower-bounds.ts's mustCrossForcedNeighborDeadlocked /
// mustCrossNeighborBudgetDeadlocked already establish this requirement) where that neighbor is
// itself a portal terminal. search-state.ts's isMoveDynamicallyValid enforces an UNCONDITIONAL rule
// neither existing must-cross check models: "each portal cell can only be visited once" — so a
// VISITED portal-terminal forced neighbor can never be entered again, at any price, regardless of
// its edgeUsage bits. mustCrossNeighborBudgetDeadlocked's own comment already flags this exact gap
// ("charging it only one future intersection UNDERSTATES the real obstruction") without closing it.
// That is the "individually feasible, jointly incompatible" shape the joint-obligation hypothesis
// describes: the must-cross obligation and the portal obligation are each reasoned about correctly
// in isolation, but only their combination is a provable hard deadlock.
//
// scripts/stress/lib/joint-obligation-mc-portal.mjs is this module's offline-harness shadow twin
// (same derivation, reimplemented per the bundler-split convention search.ts/lower-bounds.ts's own
// shadow probes already use — see mc-neighbor-budget.mjs). Keep both in sync if this derivation
// changes.
import { denseIndex } from './distance.js';
import { AXIS_H, AXIS_V } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { JointObligationVerdict, ObligationCluster, ObligationClusterKind, PrepLevel, SolverSearchState } from './types.js';

const NEIGHBOR_AXIS = [AXIS_H, AXIS_H, AXIS_V, AXIS_V];

/** Build the level-static candidate obligation clusters. Does not depend on dynamic state; cached
 *  on `prep` since a level's must-cross/portal geometry never changes within a solve. Cheap even
 *  uncached: CLAUDE.md bounds levels to at most 4 must-cross cells x 4 directions. */
export function findObligationClusters(level: NormalizedLevel, prep: PrepLevel): ObligationCluster[] {
    const cached = prep._jointObligationClusters;
    if (cached) return cached;
    const clusters: ObligationCluster[] = [];
    const mcKeys = level.mustCrossKeys;
    const staticNeighborKeys = prep.staticNeighborKeys;
    for (let i = 0; i < mcKeys.length; i++) {
        const mcKey = mcKeys[i];
        const base = denseIndex(mcKey, prep.gridW) * 4;
        for (let d = 0; d < 4; d++) {
            const nkPlus1 = staticNeighborKeys[base + d];
            if (nkPlus1 === 0) continue;
            const nk = nkPlus1 - 1;
            if (!level.portalMap.has(nk)) continue;
            clusters.push({
                id: `mc${i}:${NEIGHBOR_AXIS[d] === AXIS_H ? 'h' : 'v'}:${nk}`,
                kind: 'must-cross-portal-forced-neighbor',
                mustCrossIndex: i,
                mustCrossKey: mcKey,
                axis: NEIGHBOR_AXIS[d],
                neighborKey: nk,
            });
        }
    }
    prep._jointObligationClusters = clusters;
    return clusters;
}

/** Evaluate every candidate cluster against the CURRENT node (`pos` already applied to `state`,
 *  same convention as mustCrossForcedNeighborDeadlocked). Returns only clusters that are currently
 *  ACTIVE (must-cross cell still pending AND this specific axis still unused) — a satisfied or
 *  already-used-axis cluster carries no signal and is omitted, not logged as pass. Observer-only:
 *  callers must never let the returned verdicts influence a pruning decision. */
export function evaluateObligationClusters(
    pos: number, state: SolverSearchState, level: NormalizedLevel, prep: PrepLevel,
): { clusterId: string; kind: ObligationClusterKind; verdict: JointObligationVerdict; reasonFamily: string }[] {
    const clusters = findObligationClusters(level, prep);
    if (clusters.length === 0) return [];
    const results: { clusterId: string; kind: ObligationClusterKind; verdict: JointObligationVerdict; reasonFamily: string }[] = [];
    const mustCrossIndex = prep.mustCrossIndex;
    for (const cluster of clusters) {
        if ((state.mustCrossMask & (1 << cluster.mustCrossIndex)) === 0) continue; // satisfied — inactive
        if (state.edgeUsage[cluster.mustCrossKey] & cluster.axis) continue; // this axis already used — inactive
        if (cluster.neighborKey === pos) continue; // pos-exemption: may serve as this neighbor right now
        const neighborIdx = mustCrossIndex[cluster.neighborKey];
        const neighborIsPendingMustCross = neighborIdx !== 0 && (state.mustCrossMask & (1 << (neighborIdx - 1))) !== 0;
        if (neighborIsPendingMustCross) {
            results.push({ clusterId: cluster.id, kind: cluster.kind, verdict: 'abstain', reasonFamily: 'neighbor-also-pending-must-cross' });
            continue;
        }
        if (state.visited[cluster.neighborKey] > 0) {
            results.push({ clusterId: cluster.id, kind: cluster.kind, verdict: 'reject', reasonFamily: 'visited-portal-terminal-forced-neighbor' });
        } else {
            results.push({ clusterId: cluster.id, kind: cluster.kind, verdict: 'pass', reasonFamily: 'neighbor-not-yet-visited' });
        }
    }
    return results;
}
