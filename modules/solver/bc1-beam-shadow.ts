import { bc1HasConflictFast, computeBc1ShadowConflicts } from './topology.js';
import { popcount } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { BeamResearchObserver, PrepLevel, SolverSearchState } from './types.js';

/**
 * WS2-CUT-BALANCE-PROJECTION research shadow for one beam candidate that already passed the ordinary
 * hard-prune gauntlet (production-inert; see computeBc1ShadowConflicts for why its construction cost
 * is snapshotted/restored). Returns true when the candidate is BC1-dead (freshly flagged, or inherited
 * from a dead parent in lineage-aware mode) so the caller can propagate deadness to the retained child.
 */
export function observeBc1ShadowCandidate(
    research: BeamResearchObserver,
    parentDead: boolean,
    connectivityAlreadyFresh: boolean,
    next: number,
    ws: SolverSearchState,
    level: NormalizedLevel,
    prep: PrepLevel,
    remainingSteps: number,
    depth: number,
    path: () => number[],
): boolean {
    if (research.bc1LineageAware && parentDead) {
        // Parent already BC1-dead: child inherits it (theorem is about the parent's whole completion
        // set), so a first-flag-pruning consumer never sees it.
        research.observeBc1ShadowCost?.(0, 'inherited');
        return true;
    }
    if (research.bc1FreshOnly && !connectivityAlreadyFresh) {
        research.observeBc1ShadowCost?.(0, 'skipped');
        return false;
    }
    const t0 = performance.now();
    const shadow = computeBc1ShadowConflicts(next, ws, level, prep, connectivityAlreadyFresh);
    const flagged = shadow.conflicts.length > 0;
    if (connectivityAlreadyFresh && research.verifyBc1Fast) {
        const fast = bc1HasConflictFast(next, ws, level);
        research.verifyBc1Fast(fast !== null && fast === flagged);
    }
    research.observeBc1ShadowCost?.(shadow.constructionWorkUnits, flagged ? 'first-flag' : 'clear', {
        pending: level.mustPassKeys.length - popcount(ws.mpVisitedMask) + popcount(ws.mustCrossMask),
        remainingSteps, depth, wallMs: performance.now() - t0,
    });
    if (flagged) research.observeBc1Candidate?.({
        depth, workBefore: prep._workMeter.units, workSpent: prep._workMeter.units,
        constructionWorkUnits: shadow.constructionWorkUnits, conflicts: shadow.conflicts, path: path(),
    });
    if (!flagged && research.bc1gShadow && connectivityAlreadyFresh && bc1HasConflictFast(next, ws, level, true) === true) {
        research.observeBc1Candidate?.({ depth, workBefore: prep._workMeter.units, workSpent: prep._workMeter.units,
            constructionWorkUnits: 0, conflicts: [], path: path(), theorem: 'bc1g' });
        return true;
    }
    return flagged;
}

/**
 * STRATEGY_BC1_FRESH_CONNECTIVITY_PRUNE consumer: caller guarantees the ordinary gauntlet's connectivity
 * flood just ran for this exact (next, ws), so the reuse is free. A pruned candidate is never retained,
 * so deadness needs no lineage inheritance. Uses the typed-array check, slow path when unsupported.
 */
export function bc1FreshConnectivityPrunes(next: number, ws: SolverSearchState, level: NormalizedLevel, prep: PrepLevel): boolean {
    return bc1HasConflictFast(next, ws, level) ?? computeBc1ShadowConflicts(next, ws, level, prep, true).conflicts.length > 0;
}
