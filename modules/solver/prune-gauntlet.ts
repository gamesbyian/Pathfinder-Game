// Shared admissible-pruning gauntlet for a move already applied to search state — used by both
// dfsFromGate (search.ts) and takePly (repair-search.ts). Extracted because the two callers had
// carried near-identical copies of this same ordered check list, which meant every new prune (or
// bug fix to an existing one) had to be manually mirrored in both places, remembering which
// differences were deliberate.
//
// Both callers already apply the candidate move themselves (applyMove) before calling this, and
// undo it themselves (undoMove) afterward based on the verdict — this function only evaluates,
// it never mutates search state or touches the undo stack, so it stays agnostic to DFS's
// stack-frame bookkeeping vs. repair's flat-candidate-list bookkeeping.
//
// runConnectivity lets each caller opt in on its own terms: DFS checks its own throttled
// schedule (`rSteps <= 10 || nodesExpanded % 64 === 0`) and passes the result in; repair-search
// always passes false (see repair-search.ts's file-level comment on why it omits isConnected —
// a speed/thoroughness tradeoff, never a soundness concern, since isConnected only ever prunes).
import { getDistanceFromArray } from './distance.js';
import { popcount } from './encoding.js';
import { adjTurnDeadlocked, adjTurnLowerBound, mustCrossLowerBound, mustPassLowerBound, mustTurnDeadlocked, surroundLowerBound } from './lower-bounds.js';
import { isSolutionState } from './solution.js';
import { isConnected } from './topology.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AblationConfig, PrepLevel, SolverSearchState } from './types.js';

/** Verdict for a single already-applied candidate move against the shared prune gauntlet.
 *  'solution': `next` is the goal and the full win condition holds — caller should accept
 *              immediately (both callers treat this as a short-circuiting success).
 *  'reject':   some prune fired (or `next` is the goal but the win condition doesn't hold) —
 *              caller should undo the move and move on.
 *  'pass':     the move survives every enabled prune and is eligible to continue/expand. */
export type PruneVerdict = 'solution' | 'reject' | 'pass';

export function evaluatePrunedMove(
    next: number,
    realLen: number,
    state: SolverSearchState,
    level: NormalizedLevel,
    prep: PrepLevel,
    cfg: AblationConfig | null | undefined,
    runConnectivity: boolean,
): PruneVerdict {
    // Over-length prune (fundamental — always on)
    if (realLen > level.reqLen) return 'reject';

    // Over-intersection prune (fundamental — always on)
    if (state.ints > level.reqInt) return 'reject';

    // Intersection ceiling: ints + remaining_MC_crossings must not exceed reqInt.
    // Each pending MC cell will contribute exactly 1 intersection (its 2nd-axis visit).
    // If current ints + guaranteed future MC ints already exceeds reqInt, prune.
    // This eliminates paths with non-MC crossings on levels where all intersections
    // must come from MC cells (e.g. mc=3, reqInt=3 → zero non-MC crossings allowed).
    if ((!cfg || cfg.PRUNE_MC_CEILING) && state.mustCrossMask !== 0 && level.mustCrossKeys.length > 0) {
        const mcRemaining = popcount(state.mustCrossMask);
        if (state.ints + mcRemaining > level.reqInt) return 'reject';
    }

    // Solution check (only when at goal)
    if (next === level.goalKey) {
        return isSolutionState(state, level) ? 'solution' : 'reject';
    }

    const rSteps = level.reqLen - realLen;

    // Distance bound: min steps from next to goal must fit in remaining steps
    if (!cfg || cfg.PRUNE_DISTANCE_BOUND) {
        const goalDist = getDistanceFromArray(prep.goalDistArr, next);
        if (!Number.isFinite(goalDist) || goalDist > rSteps) return 'reject';
    }

    // Parity pruning: on a portal-free grid every step flips (x+y)%2.
    // Always apply at depth 1 (catches globally infeasible gates of the wrong parity).
    // Apply deep parity (full DFS) only for corridor-rich levels (≥10 blocks): these
    // levels have tightly constrained paths where parity cuts many dead-end corridors.
    // For open levels with few blocks, deep parity changes search order adversely.
    if ((!cfg || cfg.PRUNE_PARITY) && level.portalMap.size === 0) {
        const posP  = keyParity(next);
        const goalP = keyParity(level.goalKey);
        const firstStep = (realLen === 1);
        if ((firstStep || level.blockSet.size >= 10) && (posP ^ goalP ^ (rSteps & 1)) !== 0) {
            return 'reject';
        }
    }

    // Must-pass lower bound: dist(next→MP) + dist(MP→goal) ≤ rSteps
    if ((!cfg || cfg.PRUNE_MUST_PASS_LB) && level.mustPassKeys.length > 0) {
        const mpLB = mustPassLowerBound(next, state, level, prep);
        if (!Number.isFinite(mpLB) || mpLB > rSteps) return 'reject';
    }

    // Must-cross lower bound: dist(next→MC) + dist(MC→goal) ≤ rSteps
    if ((!cfg || cfg.PRUNE_MUST_CROSS_LB) && state.mustCrossMask !== 0) {
        const mcLB = mustCrossLowerBound(next, state, level, prep);
        if (!Number.isFinite(mcLB) || mcLB > rSteps) return 'reject';
    }

    // Surround lower bound: all unvisited surround-cell neighbors must be reachable
    if ((!cfg || cfg.PRUNE_SURROUND_LB) && state.surroundMask !== 0) {
        const sLB = surroundLowerBound(next, state, level, prep);
        if (!Number.isFinite(sLB) || sLB > rSteps) return 'reject';
    }

    // Adjacent-turn lower bound: must reach an adjacent cell of each pending adj-turn obj
    if ((!cfg || cfg.PRUNE_ADJ_TURN_LB) && state.adjTurnMask !== 0) {
        const atLB = adjTurnLowerBound(next, state, level, prep);
        if (!Number.isFinite(atLB) || atLB > rSteps) return 'reject';
    }

    // Must-turn deadlock: a pending must-turn cell with both axis-usage bits already set
    // can never be entered again (edge-axis-reuse rule) — provably unsatisfiable from here.
    if ((!cfg || cfg.PRUNE_MUST_TURN_DEADLOCK) && state.mustTurnMask !== 0 && mustTurnDeadlocked(state, prep)) {
        return 'reject';
    }

    // Adjacent-turn deadlock: every valid adjacent cell of a pending adj-turn object has both
    // axis-usage bits already set — none of them can ever be entered again, so the object's
    // requirement is provably unsatisfiable from here (see lower-bounds.ts's adjTurnDeadlocked).
    if ((!cfg || cfg.PRUNE_ADJ_TURN_DEADLOCK) && state.adjTurnMask !== 0 && adjTurnDeadlocked(state, level, prep)) {
        return 'reject';
    }

    // Intersection deficit: can't create more than rSteps intersections
    if (!cfg || cfg.PRUNE_INTERSECTION_DEFICIT) {
        const intNeeded = level.reqInt - state.ints;
        if (intNeeded > rSteps) return 'reject';
    }

    // Connectivity + volume check — caller decides whether/how often to run this (see file doc).
    if (runConnectivity && (!cfg || cfg.PRUNE_CONNECTIVITY)) {
        if (!isConnected(next, state, level, prep)) return 'reject';
    }

    return 'pass';
}
