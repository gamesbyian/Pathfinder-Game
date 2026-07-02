// Action type constants — the vocabulary of gameplay/step-outcome events. These names describe
// WHAT happened, not HOW to handle it. `ActionType` is the event discriminator the step-processor
// emits and the step-dispatcher reads; there is deliberately no central reducer/dispatcher (ADR 0006).

export const ActionType = Object.freeze({
    // Path navigation
    MOVE:                   'MOVE',
    UNDO:                   'UNDO',
    RESET:                  'RESET',

    // Step outcomes (produced by step-processor)
    BACKTRACK:              'BACKTRACK',
    PORTAL_TRAVERSE:        'PORTAL_TRAVERSE',

    // Hazard events
    GOOSE_TRIGGERED:        'GOOSE_TRIGGERED',
    FALSE_GOAL_DETONATED:   'FALSE_GOAL_DETONATED',

    // Win
    WIN:                    'WIN',

    // Level lifecycle
    LEVEL_LOAD:             'LEVEL_LOAD',
    LEVEL_ADVANCE:          'LEVEL_ADVANCE',
    LEVEL_PREV:             'LEVEL_PREV',
    LEVEL_RESTART:          'LEVEL_RESTART',

    // Logic state transitions
    LOGIC_STATE_CHANGE:     'LOGIC_STATE_CHANGE',
});
