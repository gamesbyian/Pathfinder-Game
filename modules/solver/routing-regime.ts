// Solver level-shape classification helpers.
// Keep coverage/routing-regime logic outside the attempt-order implementation so the
// policy layer can evolve independently from raw level metrics.

import type { NormalizedLevel } from '../domain/types.js';
// The canonical value list and the legacy-to-canonical normalizer live in
// ./routing-regime-normalization.mjs (plain JS) so plain-`node`-invoked research tooling can
// import the single source of truth without a TypeScript resolution step; re-exported here for
// every TypeScript consumer.
import { ROUTING_REGIMES, normalizeRoutingRegime } from './routing-regime-normalization.mjs';
export { normalizeRoutingRegime };

export type RoutingRegime = typeof ROUTING_REGIMES[number];

/**
 * Count cells that can contribute to the path body under this routing metric.
 * Deliberately excludes blocks, geese, false goals, and all gates; the goal and other usable
 * mechanic cells remain in the count. This preserves the historical routing denominator exactly.
 */
export function getNonGateWinningPathCellCount(level: NormalizedLevel): number {
    return Math.max(1, level.grid.w * level.grid.h
        - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size
        - level.gateKeys.length);
}

/** Required path length divided by getNonGateWinningPathCellCount(level). */
export function getRequiredPathCoverageRatio(level: NormalizedLevel): number {
    return level.requiredLength / getNonGateWinningPathCellCount(level);
}

/** Classify a level into the implementation routing regime that drives attempt ordering. */
export function classifyRoutingRegime(level: NormalizedLevel): RoutingRegime {
    const coverage = getRequiredPathCoverageRatio(level);
    // Sparse path needing at most 1 intersection. Classify before multi-portal so sparse
    // two-portal-pair levels preserve the historical first-match routing priority.
    if (level.requiredIntersections <= 1 && coverage < 0.35) return 'sparse-low-intersection';
    // Intersection-heavy: high coverage plus many intersections, or extreme intersection count.
    if ((level.requiredIntersections >= 5 && coverage >= 0.45)
        || (level.requiredIntersections >= 4 && coverage >= 0.55)
        || level.requiredIntersections >= 10) return 'intersection-heavy';
    if (level.mustCrossKeys.length >= 2 && level.requiredIntersections >= 2) return 'must-cross-heavy';
    if ((level.portalMap?.size || 0) >= 4) return 'multi-portal';
    return 'general';
}
