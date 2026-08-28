// Solver level-shape classification helpers.
// Keep coverage/routing-regime logic outside the attempt-order implementation so the
// policy layer can evolve independently from raw level metrics.

import type { NormalizedLevel } from '../domain/types.js';

export type RoutingRegime =
    | 'general'
    | 'sparse-low-intersection'
    | 'intersection-heavy'
    | 'must-cross-heavy'
    | 'multi-portal';

const LEGACY_ROUTING_REGIME_ALIASES: Readonly<Record<string, RoutingRegime>> = Object.freeze({
    default: 'general',
    'near-closure': 'sparse-low-intersection',
    'high-intersection-burden': 'intersection-heavy',
    'must-cross-heavy': 'must-cross-heavy',
    'portal-heavy': 'multi-portal',
});

const ROUTING_REGIMES = new Set<RoutingRegime>([
    'general', 'sparse-low-intersection', 'intersection-heavy', 'must-cross-heavy', 'multi-portal',
]);

/** Accept historical persisted routing labels and normalize them to the canonical vocabulary. */
export function normalizeRoutingRegime(value: string): RoutingRegime {
    const normalized = LEGACY_ROUTING_REGIME_ALIASES[value] ?? value;
    if (!ROUTING_REGIMES.has(normalized as RoutingRegime))
        throw new Error(`Unknown solver routing regime: ${value}`);
    return normalized as RoutingRegime;
}

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
    return level.reqLen / getNonGateWinningPathCellCount(level);
}

/** Classify a level into the implementation routing regime that drives attempt ordering. */
export function classifyRoutingRegime(level: NormalizedLevel): RoutingRegime {
    const coverage = getRequiredPathCoverageRatio(level);
    // Sparse path needing at most 1 intersection. Classify before multi-portal so sparse
    // two-portal-pair levels preserve the historical first-match routing priority.
    if (level.reqInt <= 1 && coverage < 0.35) return 'sparse-low-intersection';
    // Intersection-heavy: high coverage plus many intersections, or extreme intersection count.
    if ((level.reqInt >= 5 && coverage >= 0.45)
        || (level.reqInt >= 4 && coverage >= 0.55)
        || level.reqInt >= 10) return 'intersection-heavy';
    if (level.mustCrossKeys.length >= 2 && level.reqInt >= 2) return 'must-cross-heavy';
    if ((level.portalMap?.size || 0) >= 4) return 'multi-portal';
    return 'general';
}
