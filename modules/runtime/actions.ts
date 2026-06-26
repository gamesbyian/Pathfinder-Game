// Action type constants — the vocabulary of gameplay intents.
// These names describe WHAT happened (or was requested), not HOW to handle it.
// Intended for use in future reducer/dispatch patterns.

/** A gameplay action object: a `type` discriminator plus action-specific payload fields. */
export type Action = { type: string } & Record<string, unknown>;

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
    move:               (cellKey: number): Action  => ({ type: ActionType.MOVE, cellKey }),
    undo:               (): Action                  => ({ type: ActionType.UNDO }),
    reset:              (): Action                  => ({ type: ActionType.RESET }),
    backtrack:          (): Action                  => ({ type: ActionType.BACKTRACK }),
    portalTraverse:     (src: number, dst: number): Action => ({ type: ActionType.PORTAL_TRAVERSE, src, dst }),
    gooseTriggered:     (cellKey: number): Action   => ({ type: ActionType.GOOSE_TRIGGERED, cellKey }),
    falseGoalDetonated: (cellKey: number): Action   => ({ type: ActionType.FALSE_GOAL_DETONATED, cellKey }),
    win:                (): Action                  => ({ type: ActionType.WIN }),
    levelLoad:          (levelIdx: number): Action  => ({ type: ActionType.LEVEL_LOAD, levelIdx }),
    levelAdvance:       (): Action                  => ({ type: ActionType.LEVEL_ADVANCE }),
    levelPrev:          (): Action                  => ({ type: ActionType.LEVEL_PREV }),
    levelRestart:       (): Action                  => ({ type: ActionType.LEVEL_RESTART }),
    logicStateChange:   (from: string, to: string): Action => ({ type: ActionType.LOGIC_STATE_CHANGE, from, to }),
});
