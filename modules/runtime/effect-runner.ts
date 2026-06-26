import { EffectType } from './effects.js';
import type { Effect } from './effects.js';

/**
 * Side-effect adapters. Every key is optional — missing adapters are silently skipped so
 * callers can pass only what they handle.
 */
export interface EffectAdapters {
    playSound?: (note: any, duration: any) => void;
    openModal?: (modalId: any) => void;
    closeModal?: (modalId: any) => void;
    showMessage?: (text: any, style: any) => void;
    showGooseJumpScare?: () => void;
    hideGooseJumpScare?: () => void;
    /** fx has { key } on the step-processor event */
    showBombDetonation?: (fx: any) => void;
    hideBombDetonation?: () => void;
    markRenderDirty?: () => void;
    persistProgress?: (levelIdx: any) => void;
    scheduleTimer?: (id: any, ms: any, action: any) => void;
}

// Central effect dispatcher. Each key in `adapters` is optional — missing adapters
// are silently skipped so callers can pass only what they handle.
export function runEffects(effects: Effect[], adapters: EffectAdapters): void {
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
