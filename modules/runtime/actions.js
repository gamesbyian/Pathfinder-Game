// Action type constants — the vocabulary of gameplay intents.
// These names describe WHAT happened (or was requested), not HOW to handle it.
// Intended for use in future reducer/dispatch patterns.

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

// Factory functions produce action objects shaped { type, ...payload }.

export const Actions = Object.freeze({
    move:               (cellKey)       => ({ type: ActionType.MOVE, cellKey }),
    undo:               ()              => ({ type: ActionType.UNDO }),
    reset:              ()              => ({ type: ActionType.RESET }),
    backtrack:          ()              => ({ type: ActionType.BACKTRACK }),
    portalTraverse:     (src, dst)      => ({ type: ActionType.PORTAL_TRAVERSE, src, dst }),
    gooseTriggered:     (cellKey)       => ({ type: ActionType.GOOSE_TRIGGERED, cellKey }),
    falseGoalDetonated: (cellKey)       => ({ type: ActionType.FALSE_GOAL_DETONATED, cellKey }),
    win:                ()              => ({ type: ActionType.WIN }),
    levelLoad:          (levelIdx)      => ({ type: ActionType.LEVEL_LOAD, levelIdx }),
    levelAdvance:       ()              => ({ type: ActionType.LEVEL_ADVANCE }),
    levelPrev:          ()              => ({ type: ActionType.LEVEL_PREV }),
    levelRestart:       ()              => ({ type: ActionType.LEVEL_RESTART }),
    logicStateChange:   (from, to)      => ({ type: ActionType.LOGIC_STATE_CHANGE, from, to }),
});
