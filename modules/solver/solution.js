// SolverV2 solution-level metrics and acceptance checks.
// These helpers are intentionally pure: they inspect a prepared solver state and
// level but do not mutate either, making them safe to reuse in tests/tooling.

export function getRealLengthFromState(state) {
    return state.path.length - 1 - state.portalJumps;
}

export function areMustPassesSatisfied(state, level) {
    const n = level.mustPassKeys.length;
    return n === 0 || (state.mpVisitedMask & ((1 << n) - 1)) === ((1 << n) - 1);
}

export function isSolutionState(state, level) {
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
