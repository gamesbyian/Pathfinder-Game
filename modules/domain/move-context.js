// Named context presets for isValidMove.
//
// Each context defines the static option flags; state-dependent values
// (mode, armedFalseGoals, flipCount, crossedSet) are read by isValidMove
// from the state argument and need not appear in these presets.
//
// Usage:
//   isValidMove(targetKey, state, level, MoveContext.PLAY)
//   isValidMove(targetKey, state, level, MoveContext.TAP_ROUTE)

export const MoveContext = Object.freeze({

    // Full rule enforcement for normal gameplay: adjacency, portals, hazards,
    // false-goal locks, and win-metric constraints at the goal.
    PLAY: Object.freeze({
        isStrict:        true,
        allowJump:       true,
        checkHazards:    true,
        checkFalseGoals: true,
        checkWinMetrics: true,
    }),

    // Tap-route BFS: adjacency and portal rules are enforced; false-goal locks
    // are respected so the router honours them; hazard-reveal and win-metric
    // checks are skipped so paths can be simulated through goose cells and
    // partial-progress states without triggering side effects.
    TAP_ROUTE: Object.freeze({
        isStrict:        true,
        allowJump:       true,
        checkHazards:    false,
        checkFalseGoals: true,
        checkWinMetrics: false,
    }),

    // Editor pencil mode: relaxed movement for free drawing — no hazard checks,
    // no false-goal locks, no win-metric gating.  Play-mode gate re-entry
    // restrictions do not apply because mode (read from state) will be EDITOR.
    EDITOR_PENCIL: Object.freeze({
        isStrict:        false,
        allowJump:       true,
        checkHazards:    false,
        checkFalseGoals: false,
        checkWinMetrics: false,
    }),

    // Solver traversal: strict adjacency and portal rules so only legal paths
    // are explored; hazard and false-goal checks are off so the solver can
    // traverse freely; win metrics ARE checked at the goal so only genuinely
    // satisfying solutions are accepted.
    SOLVER: Object.freeze({
        isStrict:        true,
        allowJump:       true,
        checkHazards:    false,
        checkFalseGoals: false,
        checkWinMetrics: true,
    }),
});
