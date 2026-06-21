// @ts-check
// Action type constants — the vocabulary of gameplay intents.
// These names describe WHAT happened (or was requested), not HOW to handle it.
// Intended for use in future reducer/dispatch patterns.

/** A gameplay action object: a `type` discriminator plus action-specific payload fields.
 *  @typedef {{ type: string } & Record<string, unknown>} Action */

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
    /** @param {number} cellKey @returns {Action} */
    move:               (cellKey)       => ({ type: ActionType.MOVE, cellKey }),
    /** @returns {Action} */
    undo:               ()              => ({ type: ActionType.UNDO }),
    /** @returns {Action} */
    reset:              ()              => ({ type: ActionType.RESET }),
    /** @returns {Action} */
    backtrack:          ()              => ({ type: ActionType.BACKTRACK }),
    /** @param {number} src @param {number} dst @returns {Action} */
    portalTraverse:     (src, dst)      => ({ type: ActionType.PORTAL_TRAVERSE, src, dst }),
    /** @param {number} cellKey @returns {Action} */
    gooseTriggered:     (cellKey)       => ({ type: ActionType.GOOSE_TRIGGERED, cellKey }),
    /** @param {number} cellKey @returns {Action} */
    falseGoalDetonated: (cellKey)       => ({ type: ActionType.FALSE_GOAL_DETONATED, cellKey }),
    /** @returns {Action} */
    win:                ()              => ({ type: ActionType.WIN }),
    /** @param {number} levelIdx @returns {Action} */
    levelLoad:          (levelIdx)      => ({ type: ActionType.LEVEL_LOAD, levelIdx }),
    /** @returns {Action} */
    levelAdvance:       ()              => ({ type: ActionType.LEVEL_ADVANCE }),
    /** @returns {Action} */
    levelPrev:          ()              => ({ type: ActionType.LEVEL_PREV }),
    /** @returns {Action} */
    levelRestart:       ()              => ({ type: ActionType.LEVEL_RESTART }),
    /** @param {string} from @param {string} to @returns {Action} */
    logicStateChange:   (from, to)      => ({ type: ActionType.LOGIC_STATE_CHANGE, from, to }),
});
