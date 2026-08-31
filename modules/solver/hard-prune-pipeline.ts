// Shared admissible-pruning gauntlet for an already-applied move. It evaluates only; callers own
// apply/undo and choose whether to run connectivity. Used by DFS and repair to keep prune semantics aligned.
import { getDistanceFromArray } from './distance.js';
import { popcount } from './encoding.js';
import { adjTurnLowerBound, mustCrossForcedNeighborDeadlocked, mustCrossLowerBound, mustCrossNeighborBudgetDeadlocked, mustPassLowerBound, mustTurnDeadlocked, surroundLowerBound } from './lower-bounds.js';
import { isSolutionState } from './solution.js';
import { isConnected } from './topology.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, PrepLevel, SolverSearchState } from './types.js';

/** Result for one already-applied candidate move. */
export type PruneVerdict = 'solution' | 'reject' | 'pass';

/** Stable test-diagnostic names, matching AblationConfig keys. */
export type PruneId =
    | 'PRUNE_MC_FORCED_FIRST_MOVE' | 'PRUNE_MC_CEILING' | 'PRUNE_DISTANCE_BOUND' | 'PRUNE_PARITY'
    | 'PRUNE_PORTAL_PARITY_ENVELOPE' | 'PRUNE_MUST_PASS_LB' | 'PRUNE_MUST_CROSS_LB'
    | 'PRUNE_SURROUND_LB' | 'PRUNE_ADJ_TURN_LB' | 'PRUNE_MUST_TURN_DEADLOCK'
    | 'PRUNE_MC_FORCED_NEIGHBOR' | 'PRUNE_MC_NEIGHBOR_BUDGET'
    | 'PRUNE_INTERSECTION_DEFICIT' | 'PRUNE_CONNECTIVITY';

/** Optional caller-owned counters; production stays allocation-free. */
export interface PruneDiagnostics {
    reached: Partial<Record<PruneId, number>>;
    rejected: Partial<Record<PruneId, number>>;
}

/** Caller policy separate from diagnostics so observation cannot alter pruning. */
export interface PruneEvaluationOptions {
    allowNeighborBudgetPrune?: boolean;
    diagnostics?: PruneDiagnostics;
}

function reached(diagnostics: PruneDiagnostics | undefined, id: PruneId): void {
    if (diagnostics) diagnostics.reached[id] = (diagnostics.reached[id] ?? 0) + 1;
}

function reject(diagnostics: PruneDiagnostics | undefined, id: PruneId): PruneVerdict {
    if (diagnostics) diagnostics.rejected[id] = (diagnostics.rejected[id] ?? 0) + 1;
    return 'reject';
}

export function evaluatePrunedMove(
    next: number,
    realLen: number,
    state: SolverSearchState,
    level: NormalizedLevel,
    prep: PrepLevel,
    cfg: AblationConfig | null | undefined,
    runConnectivity: boolean,
    options: PruneEvaluationOptions = {},
): PruneVerdict {
    const diagnostics = options.diagnostics;
    // Fundamental limits.
    if (realLen > level.reqLen) return 'reject';
    if (state.ints > level.reqInt) return 'reject';

    // Every pending must-cross contributes one future intersection.
    if ((!cfg || cfg.PRUNE_MC_CEILING) && state.mustCrossMask !== 0 && level.mustCrossKeys.length > 0) {
        reached(diagnostics, 'PRUNE_MC_CEILING');
        const mcRemaining = popcount(state.mustCrossMask);
        if (state.ints + mcRemaining > level.reqInt) return reject(diagnostics, 'PRUNE_MC_CEILING');
    }

    if (next === level.goalKey) {
        return isSolutionState(state, level) ? 'solution' : 'reject';
    }

    const rSteps = level.reqLen - realLen;

    if (!cfg || cfg.PRUNE_DISTANCE_BOUND) {
        reached(diagnostics, 'PRUNE_DISTANCE_BOUND');
        const goalDist = getDistanceFromArray(prep.goalDistArr, next, prep.gridW);
        if (!Number.isFinite(goalDist) || goalDist > rSteps) return reject(diagnostics, 'PRUNE_DISTANCE_BOUND');
    }

    // Portal-free parity is always checked on the first step; deep checks are limited to corridor-rich levels.
    if ((!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
        reached(diagnostics, 'PRUNE_PARITY');
        const posP  = keyParity(next);
        const goalP = keyParity(level.goalKey);
        const firstStep = (realLen === 1);
        if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
            return reject(diagnostics, 'PRUNE_PARITY');
        }
    }

    // Twist portals can repair parity until all such pairs are consumed. Portal cells are transient
    // snapshots, so defer this check there. Existence-only reasoning may under-prune, never over-prune.
    if (cfg && cfg.PRUNE_PORTAL_PARITY_ENVELOPE === true && level.portalMap.size > 0 && !level.portalMap.has(next)) {
        reached(diagnostics, 'PRUNE_PORTAL_PARITY_ENVELOPE');
        const twistPairs = prep.parityPortalDistMaps;
        if (twistPairs && twistPairs.length > 0) {
            const posP  = keyParity(next);
            const goalP = keyParity(level.goalKey);
            const firstStep = (realLen === 1);
            if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
                let anyUnconsumed = false;
                for (const tp of twistPairs) {
                    if (state.visited[tp.a] === 0 || state.visited[tp.b] === 0) { anyUnconsumed = true; break; }
                }
                if (!anyUnconsumed) return reject(diagnostics, 'PRUNE_PORTAL_PARITY_ENVELOPE');
            }
        }
    }

    if ((!cfg || cfg.PRUNE_MUST_PASS_LB) && level.mustPassKeys.length > 0) {
        reached(diagnostics, 'PRUNE_MUST_PASS_LB');
        const mpLB = mustPassLowerBound(next, state, level, prep);
        if (!Number.isFinite(mpLB) || mpLB > rSteps) return reject(diagnostics, 'PRUNE_MUST_PASS_LB');
    }

    if ((!cfg || cfg.PRUNE_MUST_CROSS_LB) && state.mustCrossMask !== 0) {
        reached(diagnostics, 'PRUNE_MUST_CROSS_LB');
        const mcLB = mustCrossLowerBound(next, state, level, prep);
        if (!Number.isFinite(mcLB) || mcLB > rSteps) return reject(diagnostics, 'PRUNE_MUST_CROSS_LB');
    }

    if ((!cfg || cfg.PRUNE_SURROUND_LB) && state.surroundMask !== 0) {
        reached(diagnostics, 'PRUNE_SURROUND_LB');
        const sLB = surroundLowerBound(next, state, level, prep);
        if (!Number.isFinite(sLB) || sLB > rSteps) return reject(diagnostics, 'PRUNE_SURROUND_LB');
    }

    if ((!cfg || cfg.PRUNE_ADJ_TURN_LB) && state.adjTurnMask !== 0) {
        reached(diagnostics, 'PRUNE_ADJ_TURN_LB');
        const atLB = adjTurnLowerBound(next, state, level, prep);
        if (!Number.isFinite(atLB) || atLB > rSteps) return reject(diagnostics, 'PRUNE_ADJ_TURN_LB');
    }

    // Both axis bits spent on an unsatisfied must-turn cell means it can never be entered again.
    if ((!cfg || cfg.PRUNE_MUST_TURN_DEADLOCK) && state.mustTurnMask !== 0) {
        reached(diagnostics, 'PRUNE_MUST_TURN_DEADLOCK');
        if (mustTurnDeadlocked(state, prep)) return reject(diagnostics, 'PRUNE_MUST_TURN_DEADLOCK');
    }

    // A pending must-cross straight pass requires both neighbors on its unused axis to remain enterable.
    if ((!cfg || cfg.PRUNE_MC_FORCED_NEIGHBOR) && state.mustCrossMask !== 0) {
        reached(diagnostics, 'PRUNE_MC_FORCED_NEIGHBOR');
        if (mustCrossForcedNeighborDeadlocked(next, state, level, prep)) return reject(diagnostics, 'PRUNE_MC_FORCED_NEIGHBOR');
    }

    // Previously visited required neighbors consume free intersection budget on revisit. Stochastic
    // repair survivor selection opts out because candidate removal would perturb seeded randomness.
    if (options.allowNeighborBudgetPrune !== false && (!cfg || cfg.PRUNE_MC_NEIGHBOR_BUDGET) && state.mustCrossMask !== 0) {
        reached(diagnostics, 'PRUNE_MC_NEIGHBOR_BUDGET');
        if (mustCrossNeighborBudgetDeadlocked(next, state, level, prep)) return reject(diagnostics, 'PRUNE_MC_NEIGHBOR_BUDGET');
    }

    if (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) {
        reached(diagnostics, 'PRUNE_INTERSECTION_DEFICIT');
        const intNeeded = level.reqInt - state.ints;
        if (intNeeded > rSteps) return reject(diagnostics, 'PRUNE_INTERSECTION_DEFICIT');
    }

    if (runConnectivity && (!cfg || cfg.PRUNE_CONNECTIVITY)) {
        reached(diagnostics, 'PRUNE_CONNECTIVITY');
        if (!isConnected(next, state, level, prep)) return reject(diagnostics, 'PRUNE_CONNECTIVITY');
    }

    return 'pass';
}
