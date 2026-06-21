// @ts-check
import { EffectType } from './effects.js';

/** @typedef {import('./effects.js').Effect} Effect */

/**
 * Side-effect adapters. Every key is optional — missing adapters are silently skipped so
 * callers can pass only what they handle.
 * @typedef {Object} EffectAdapters
 * @property {(note: any, duration: any) => void}   [playSound]
 * @property {(modalId: any) => void}               [openModal]
 * @property {(modalId: any) => void}               [closeModal]
 * @property {(text: any, style: any) => void}      [showMessage]
 * @property {() => void}                           [showGooseJumpScare]
 * @property {() => void}                           [hideGooseJumpScare]
 * @property {(fx: any) => void}                    [showBombDetonation]  fx has { key } on the step-processor event
 * @property {() => void}                           [hideBombDetonation]
 * @property {() => void}                           [markRenderDirty]
 * @property {(levelIdx: any) => void}              [persistProgress]
 * @property {(id: any, ms: any, action: any) => void} [scheduleTimer]
 */

// Central effect dispatcher. Each key in `adapters` is optional — missing adapters
// are silently skipped so callers can pass only what they handle.
/** @param {Effect[]} effects @param {EffectAdapters} adapters @returns {void} */
export function runEffects(effects, adapters) {
    for (const fx of effects) {
        switch (fx.type) {
            case EffectType.PLAY_SOUND:
                adapters.playSound?.(fx.note, fx.duration); break;
            case EffectType.OPEN_MODAL:
                adapters.openModal?.(fx.modalId); break;
            case EffectType.CLOSE_MODAL:
                adapters.closeModal?.(fx.modalId); break;
            case EffectType.SHOW_MESSAGE:
                adapters.showMessage?.(fx.text, fx.style); break;
            case EffectType.SHOW_GOOSE_JUMP_SCARE:
                adapters.showGooseJumpScare?.(); break;
            case EffectType.HIDE_GOOSE_JUMP_SCARE:
                adapters.hideGooseJumpScare?.(); break;
            case EffectType.SHOW_BOMB_DETONATION:
                adapters.showBombDetonation?.(fx); break;
            case EffectType.HIDE_BOMB_DETONATION:
                adapters.hideBombDetonation?.(); break;
            case EffectType.MARK_RENDER_DIRTY:
                adapters.markRenderDirty?.(); break;
            case EffectType.PERSIST_PROGRESS:
                adapters.persistProgress?.(fx.levelIdx); break;
            case EffectType.SCHEDULE_TIMER:
                adapters.scheduleTimer?.(fx.id, fx.ms, fx.action); break;
        }
    }
}
