// Pure solver solution metrics and acceptance checks.
import { popcount } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState } from './types.js';

/** Counted length = edges minus free portal jumps. */
export function getRealLengthFromState(state: SolverSearchState): number {
    return state.path.length - 1 - state.portalJumps;
}

export function areMustPassesSatisfied(state: SolverSearchState, level: NormalizedLevel): boolean {
    const n = level.mustPassKeys.length;
    return n === 0 || (state.mpVisitedMask & ((1 << n) - 1)) === ((1 << n) - 1);
}

/** Full solver acceptance predicate. */
export function isSolutionState(state: SolverSearchState, level: NormalizedLevel): boolean {
    if (state.path[state.path.length - 1] !== level.goalKey) return false;
    if (getRealLengthFromState(state) !== level.requiredLength) return false;
    if (state.ints !== level.requiredIntersections) return false;
    if (state.mustMask !== 0) return false;
    if (state.mustCrossMask !== 0) return false;
    // Dense-level DFS may keep mustMask=0, so mpVisitedMask independently enforces must-pass completion.
    if (!areMustPassesSatisfied(state, level)) return false;
    if (state.surroundMask) return false;
    if (state.mustTurnMask) return false;
    if (state.adjTurnMask)  return false;
    return true;
}

/** Unweighted count of exact length/intersection and structural deficits; 0 iff accepted obligations match. */
export function computeBadness(state: SolverSearchState, level: NormalizedLevel): number {
    const lenDeficit = Math.abs(getRealLengthFromState(state) - level.requiredLength);
    const intDeficit = Math.abs(state.ints - level.requiredIntersections);
    return lenDeficit + intDeficit + structuralDeficit(state, level);
}

/** Pending non-length/non-intersection obligations. These masks clear monotonically during a forward walk. */
export function structuralDeficit(state: SolverSearchState, level: NormalizedLevel): number {
    const n = level.mustPassKeys.length;
    const mpFullMask = n > 0 ? ((1 << n) - 1) : 0;
    const mpDeficit = n - popcount(state.mpVisitedMask & mpFullMask);
    const mcDeficit = popcount(state.mustCrossMask);
    const surroundDeficit = popcount(state.surroundMask);
    const turnDeficit = popcount(state.mustTurnMask) + popcount(state.adjTurnMask);
    return mpDeficit + mcDeficit + surroundDeficit + turnDeficit;
}
