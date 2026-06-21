// @ts-check
// Effect type constants — the vocabulary of side-effects the engine must dispatch.
// Effects describe WHAT should happen (sound, UI, persistence, timer), not HOW.
//
// Current dispatch coverage:
//   step-dispatcher.js handles: PLAY_SOUND, SHOW_GOOSE_JUMP_SCARE, SHOW_BOMB_DETONATION
//   win-controller.js adapter handles: PLAY_SOUND, OPEN_MODAL, PERSIST_PROGRESS
//   hazard-controller.js adapter handles: SHOW_GOOSE_JUMP_SCARE, SHOW_BOMB_DETONATION, PLAY_SOUND
//
// Not yet dispatched by any runner (vocabulary reserved for a future central effect runner):
//   CLOSE_MODAL, SHOW_MESSAGE, HIDE_GOOSE_JUMP_SCARE, HIDE_BOMB_DETONATION,
//   MARK_RENDER_DIRTY, SCHEDULE_TIMER

export const EffectType = Object.freeze({
    // Audio
    PLAY_SOUND:             'PLAY_SOUND',

    // Modal management
    OPEN_MODAL:             'OPEN_MODAL',
    CLOSE_MODAL:            'CLOSE_MODAL',

    // Messages / toasts
    SHOW_MESSAGE:           'SHOW_MESSAGE',

    // Hazard animations
    SHOW_GOOSE_JUMP_SCARE:  'SHOW_GOOSE_JUMP_SCARE',
    HIDE_GOOSE_JUMP_SCARE:  'HIDE_GOOSE_JUMP_SCARE',
    SHOW_BOMB_DETONATION:   'SHOW_BOMB_DETONATION',
    HIDE_BOMB_DETONATION:   'HIDE_BOMB_DETONATION',

    // Render
    MARK_RENDER_DIRTY:      'MARK_RENDER_DIRTY',

    // Persistence
    PERSIST_PROGRESS:       'PERSIST_PROGRESS',

    // Timers (async continuations)
    SCHEDULE_TIMER:         'SCHEDULE_TIMER',
});

// Factory functions produce effect objects shaped { type, ...payload }.

/** A side-effect descriptor: a `type` discriminator plus effect-specific payload fields.
 *  @typedef {{ type: string } & Record<string, unknown>} Effect */

export const Effects = Object.freeze({
    /** @param {string} note @param {string} [duration] @returns {Effect} */
    playSound:          (note, duration)    => ({ type: EffectType.PLAY_SOUND, note, duration }),
    /** @param {string} modalId @returns {Effect} */
    openModal:          (modalId)           => ({ type: EffectType.OPEN_MODAL, modalId }),
    /** @param {string} modalId @returns {Effect} */
    closeModal:         (modalId)           => ({ type: EffectType.CLOSE_MODAL, modalId }),
    /** @param {string} text @param {string} [style] @returns {Effect} */
    showMessage:        (text, style)       => ({ type: EffectType.SHOW_MESSAGE, text, style }),
    /** @returns {Effect} */
    showGooseJumpScare: ()                  => ({ type: EffectType.SHOW_GOOSE_JUMP_SCARE }),
    /** @returns {Effect} */
    hideGooseJumpScare: ()                  => ({ type: EffectType.HIDE_GOOSE_JUMP_SCARE }),
    /** @param {boolean} [exploded] @returns {Effect} */
    showBombDetonation: (exploded = false)  => ({ type: EffectType.SHOW_BOMB_DETONATION, exploded }),
    /** @returns {Effect} */
    hideBombDetonation: ()                  => ({ type: EffectType.HIDE_BOMB_DETONATION }),
    /** @returns {Effect} */
    markRenderDirty:    ()                  => ({ type: EffectType.MARK_RENDER_DIRTY }),
    /** @param {number} levelIdx @returns {Effect} */
    persistProgress:    (levelIdx)          => ({ type: EffectType.PERSIST_PROGRESS, levelIdx }),
    /** @param {string} id @param {number} ms @param {Object} action @returns {Effect} */
    scheduleTimer:      (id, ms, action)    => ({ type: EffectType.SCHEDULE_TIMER, id, ms, action }),
});
