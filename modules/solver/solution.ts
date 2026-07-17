// Solver solution-level metrics and acceptance checks.
// These helpers are intentionally pure: they inspect a prepared solver state and
// level but do not mutate either, making them safe to reuse in tests/tooling.

import { popcount } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState } from './types.js';

/** Counted length from solver state = nodes − 1 − portal jumps. */
export function getRealLengthFromState(state: SolverSearchState): number {
    return state.path.length - 1 - state.portalJumps;
}

export function areMustPassesSatisfied(state: SolverSearchState, level: NormalizedLevel): boolean {
    const n = level.mustPassKeys.length;
    return n === 0 || (state.mpVisitedMask & ((1 << n) - 1)) === ((1 << n) - 1);
}

/** Is this a fully-accepting solution state? */
export function isSolutionState(state: SolverSearchState, level: NormalizedLevel): boolean {
    if (state.path[state.path.length - 1] !== level.goalKey) return false;
    if (getRealLengthFromState(state) !== level.reqLen) return false;
    if (state.ints !== level.reqInt) return false;
    if (state.mustMask !== 0) return false;
    if (state.mustCrossMask !== 0) return false;
    // Dense-level DFS can keep mustMask=0 to avoid disrupting near-Hamiltonian
    // orderings, so must-pass correctness is also enforced via mpVisitedMask.
    if (!areMustPassesSatisfied(state, level)) return false;
    // Landmark constraints (non-zero only when level has the respective features;
    // truthy check handles both unsatisfied (>0) and missing from old state objects)
    if (state.surroundMask) return false;
    if (state.mustTurnMask) return false;
    if (state.adjTurnMask)  return false;
    return true;
}

/** How far a state is from isSolutionState — 0 iff it would pass. Every term is a small
 *  non-negative integer count (a deficit), so no weighting is needed: they're all "how many
 *  more/fewer of this exact thing has to change," and none dominates the others by construction.
 *  Originally repair-search.ts-only (its iterated-local-search acceptance criterion / elite-pool
 *  ranking); moved here so DFS/beam (search.ts) can also use it as a cheap, one-shot "how close
 *  did this attempt's final position get" diagnostic snapshot for external tooling, without
 *  duplicating the deficit math. Meaningful for ANY state, not just one that reached the goal
 *  cell — a state that hasn't walked far enough yet correctly shows a large length deficit,
 *  which is itself a real diagnostic signal (this attempt didn't get far before running out of
 *  time), not a flaw in reusing it that way. */
export function computeBadness(state: SolverSearchState, level: NormalizedLevel): number {
    const lenDeficit = Math.abs(getRealLengthFromState(state) - level.reqLen);
    const intDeficit = Math.abs(state.ints - level.reqInt);
    return lenDeficit + intDeficit + structuralDeficit(state, level);
}

/** The must-pass/must-cross/surround/must-turn/adj-turn component of computeBadness, without
 *  the length/intersection terms. Every one of these bits only ever clears during a forward
 *  walk (search-state.ts's applyMove never re-sets a cleared mustMask/mpVisitedMask/
 *  mustCrossMask/surroundMask/mustTurnMask/adjTurnMask bit — undo is the only way any of them
 *  goes back to "pending"), so `structuralDeficit(state, level) === 0` is a sound, order-
 *  independent signal that every non-length/non-intersection objective is (and, absent an
 *  undo, will stay) satisfied for the rest of this walk — see repair-search.ts's
 *  closeLengthGap, which uses exactly this signal to decide when the only remaining problem is
 *  hitting reqLen/reqInt exactly. */
export function structuralDeficit(state: SolverSearchState, level: NormalizedLevel): number {
    const n = level.mustPassKeys.length;
    const mpFullMask = n > 0 ? ((1 << n) - 1) : 0;
    const mpDeficit = n - popcount(state.mpVisitedMask & mpFullMask);
    const mcDeficit = popcount(state.mustCrossMask);
    const surroundDeficit = popcount(state.surroundMask);
    const turnDeficit = popcount(state.mustTurnMask) + popcount(state.adjTurnMask);
    return mpDeficit + mcDeficit + surroundDeficit + turnDeficit;
}
