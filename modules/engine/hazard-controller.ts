import { detonateFalseGoal } from '../state-actions.js';
import { Effects } from '../runtime/effects.js';
import { runEffects } from '../runtime/effect-runner.js';

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
export function createHazardController({ core, state, ui, setOverlayState, scheduleTimer = setTimeout }: any) {
    let bombTimer1: any = null;
    let bombTimer2: any = null;

    return {
        clearBombTimers() {
            clearTimeout(bombTimer1);
            clearTimeout(bombTimer2);
            bombTimer1 = null;
            bombTimer2 = null;
        },

        triggerJumpScare() {
            setOverlayState(core.GOOSE_OVERLAY);
            runEffects(computeJumpScareEffects(), {
                showGooseJumpScare: () => ui.showGooseJumpScare(),
            });
            scheduleTimer(() => {
                if (state.ENGINE.overlayState === core.GOOSE_OVERLAY) {
                    ui.hideGooseJumpScare();
                    setOverlayState(core.OVERLAY_NONE);
                }
            }, 2500);
        },

        triggerBombDetonation(key: any) {
            detonateFalseGoal(state, key);
            setOverlayState(core.FALSE_GOAL_ANIMATING);
            runEffects(computeBombDetonationEffects(), {
                showBombDetonation: () => ui.showBombDetonation(),
                playSound:          (note: any, dur: any) => core.SOUND_BUS.play(note, dur),
            });
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
