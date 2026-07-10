// Effect type constants — the vocabulary of side-effects the engine dispatches.
// Effects describe WHAT should happen (sound, UI, persistence, timer), not HOW.
//
// `runEffects` (effect-runner.ts) is the central dispatcher and handles every type below; the
// win/hazard controllers and the step-dispatcher call it with the adapters they implement.
// Some of the vocabulary is defined and dispatchable but not yet *emitted* by any producer:
//   CLOSE_MODAL, SHOW_MESSAGE, HIDE_GOOSE_JUMP_SCARE, HIDE_FALSE_GOAL_DETONATION,
//   MARK_RENDER_DIRTY, SCHEDULE_TIMER.

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
    SHOW_FALSE_GOAL_DETONATION: 'SHOW_FALSE_GOAL_DETONATION',
    HIDE_FALSE_GOAL_DETONATION: 'HIDE_FALSE_GOAL_DETONATION',

    // Render
    MARK_RENDER_DIRTY:      'MARK_RENDER_DIRTY',

    // Persistence
    PERSIST_PROGRESS:       'PERSIST_PROGRESS',

    // Timers (async continuations)
    SCHEDULE_TIMER:         'SCHEDULE_TIMER',
});

// Factory functions produce effect objects shaped { type, ...payload }.

/** A side-effect descriptor: a `type` discriminator plus effect-specific payload fields. */
export type Effect = { type: string } & Record<string, unknown>;

export const Effects = Object.freeze({
    playSound:          (note: string, duration?: string): Effect => ({ type: EffectType.PLAY_SOUND, note, duration }),
    openModal:          (modalId: string): Effect           => ({ type: EffectType.OPEN_MODAL, modalId }),
    closeModal:         (modalId: string): Effect           => ({ type: EffectType.CLOSE_MODAL, modalId }),
    showMessage:        (text: string, style?: string): Effect => ({ type: EffectType.SHOW_MESSAGE, text, style }),
    showGooseJumpScare: (): Effect                          => ({ type: EffectType.SHOW_GOOSE_JUMP_SCARE }),
    hideGooseJumpScare: (): Effect                          => ({ type: EffectType.HIDE_GOOSE_JUMP_SCARE }),
    showFalseGoalDetonation: (exploded = false): Effect     => ({ type: EffectType.SHOW_FALSE_GOAL_DETONATION, exploded }),
    hideFalseGoalDetonation: (): Effect                     => ({ type: EffectType.HIDE_FALSE_GOAL_DETONATION }),
    markRenderDirty:    (): Effect                          => ({ type: EffectType.MARK_RENDER_DIRTY }),
    persistProgress:    (levelIdx: number): Effect          => ({ type: EffectType.PERSIST_PROGRESS, levelIdx }),
    scheduleTimer:      (id: string, ms: number, action: object): Effect => ({ type: EffectType.SCHEDULE_TIMER, id, ms, action }),
});
