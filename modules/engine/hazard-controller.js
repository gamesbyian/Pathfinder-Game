import { detonateFalseGoal } from '../state-actions.js';
import { EffectType, Effects } from '../runtime/effects.js';

// Pure functions: return the immediate effect list for each hazard trigger.
// Timer-driven cleanup effects are not included (they are inherently stateful).

export function computeJumpScareEffects() {
    return [
        Effects.showGooseJumpScare(),
    ];
}

export function computeBombDetonationEffects() {
    return [
        Effects.showBombDetonation(),
        Effects.playSound('C2', '8n'),
    ];
}

// scheduleTimer defaults to setTimeout; inject a synchronous fake in tests.
export function createHazardController({ core, state, ui, setOverlayState, scheduleTimer = setTimeout }) {
    let bombTimer1 = null;
    let bombTimer2 = null;

    return {
        clearBombTimers() {
            clearTimeout(bombTimer1);
            clearTimeout(bombTimer2);
            bombTimer1 = null;
            bombTimer2 = null;
        },

        triggerJumpScare() {
            setOverlayState(core.GOOSE_OVERLAY);
            for (const fx of computeJumpScareEffects()) {
                if (fx.type === EffectType.SHOW_GOOSE_JUMP_SCARE) ui.showGooseJumpScare();
            }
            scheduleTimer(() => {
                if (state.ENGINE.overlayState === core.GOOSE_OVERLAY) {
                    ui.hideGooseJumpScare();
                    setOverlayState(core.OVERLAY_NONE);
                }
            }, 2500);
        },

        triggerBombDetonation(key) {
            detonateFalseGoal(state, key);
            setOverlayState(core.FALSE_GOAL_ANIMATING);
            for (const fx of computeBombDetonationEffects()) {
                if (fx.type === EffectType.SHOW_BOMB_DETONATION) ui.showBombDetonation();
                else if (fx.type === EffectType.PLAY_SOUND)      core.SOUND_BUS.play(fx.note, fx.duration);
            }
            bombTimer1 = scheduleTimer(() => {
                bombTimer1 = null;
                ui.showBombDetonation({ exploded: true });
                core.SOUND_BUS.play('F1', '4n');
                bombTimer2 = scheduleTimer(() => {
                    bombTimer2 = null;
                    ui.hideBombDetonation();
                    setOverlayState(core.OVERLAY_NONE);
                }, 1000);
            }, 1000);
        },
    };
}
