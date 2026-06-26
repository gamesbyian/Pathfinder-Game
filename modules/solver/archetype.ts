// SolverV2 level-shape classification helpers.
// Keep density/archetype logic outside the attempt-order implementation so the
// policy layer can evolve independently from raw level metrics.

import type { NormalizedLevel } from '../domain/types.js';

/** Cells a path can traverse (grid minus blocks/geese/false-goals/gates). */
export function getNavigableArea(level: NormalizedLevel): number {
    return Math.max(1, level.grid.w * level.grid.h
        - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size
        - level.gateKeys.length);
}

/** reqLen / navigable area. */
export function getNavigableDensity(level: NormalizedLevel): number {
    return level.reqLen / getNavigableArea(level);
}

/** Classify a level into a solver archetype (drives attempt ordering). */
export function detectArchetype(level: NormalizedLevel): string {
    const density = getNavigableDensity(level);
    // Near-closure: sparse path needing at most 1 intersection — essentially a near-loop.
    // Classify before portal-heavy so sparse 2-portal levels aren't mis-routed.
    if (level.reqInt <= 1 && density < 0.35) return 'near-closure';
    // High-intersection: dense AND many intersections, OR extreme intersection count.
    // Second clause catches density 0.45-0.54 with reqInt≥5 and near-Hamiltonian
    // density≥0.55 with reqInt≥4.
    if ((level.reqInt >= 5 && density >= 0.45) || (level.reqInt >= 4 && density >= 0.55) || level.reqInt >= 10) return 'high-intersection-burden';
    if (level.mustCrossKeys.length >= 2 && level.reqInt >= 2) return 'must-cross-heavy';
    if ((level.portalMap?.size || 0) >= 4) return 'portal-heavy';
    return 'default';
}
