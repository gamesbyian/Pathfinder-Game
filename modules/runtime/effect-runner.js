import { EffectType } from './effects.js';

// Central effect dispatcher. Each key in `adapters` is optional — missing adapters
// are silently skipped so callers can pass only what they handle.
//
// Adapter signature per effect type:
//   playSound(note, duration)
//   openModal(modalId)
//   closeModal(modalId)
//   showMessage(text, style)
//   showGooseJumpScare()
//   hideGooseJumpScare()
//   showBombDetonation(fx)    fx has { key } on the step-processor event
//   hideBombDetonation()
//   markRenderDirty()
//   persistProgress(levelIdx)
//   scheduleTimer(id, ms, action)
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
