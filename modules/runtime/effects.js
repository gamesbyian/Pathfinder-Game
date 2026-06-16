// Effect type constants — the vocabulary of side-effects the engine must dispatch.
// Effects describe WHAT should happen (sound, UI, persistence, timer), not HOW.
// Intended for use in future effect-runner patterns.
//
// Relationship to step-processor.js events:
//   step-processor emits { type: 'sound', note, duration } etc. — those are a
//   subset of this vocabulary. EffectType.PLAY_SOUND corresponds to 'sound',
//   giving future refactors a named constant to migrate toward.

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

export const Effects = Object.freeze({
    playSound:          (note, duration)    => ({ type: EffectType.PLAY_SOUND, note, duration }),
    openModal:          (modalId)           => ({ type: EffectType.OPEN_MODAL, modalId }),
    closeModal:         (modalId)           => ({ type: EffectType.CLOSE_MODAL, modalId }),
    showMessage:        (text, style)       => ({ type: EffectType.SHOW_MESSAGE, text, style }),
    showGooseJumpScare: ()                  => ({ type: EffectType.SHOW_GOOSE_JUMP_SCARE }),
    hideGooseJumpScare: ()                  => ({ type: EffectType.HIDE_GOOSE_JUMP_SCARE }),
    showBombDetonation: (exploded = false)  => ({ type: EffectType.SHOW_BOMB_DETONATION, exploded }),
    hideBombDetonation: ()                  => ({ type: EffectType.HIDE_BOMB_DETONATION }),
    markRenderDirty:    ()                  => ({ type: EffectType.MARK_RENDER_DIRTY }),
    persistProgress:    (levelIdx)          => ({ type: EffectType.PERSIST_PROGRESS, levelIdx }),
    scheduleTimer:      (id, ms, action)    => ({ type: EffectType.SCHEDULE_TIMER, id, ms, action }),
});
