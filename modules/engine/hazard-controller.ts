import type { ControllerDeps } from '../state.js';
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

export function computeFalseGoalDetonationEffects() {
    return [
        Effects.showFalseGoalDetonation(),
        Effects.playSound('C2', '8n'),
    ];
}

// scheduleTimer defaults to setTimeout; inject a synchronous fake in tests.
export function createHazardController({ core, state, ui, setOverlayState, scheduleTimer = setTimeout }: ControllerDeps) {
    let falseGoalTimer1: any = null;
    let falseGoalTimer2: any = null;

    return {
        clearFalseGoalTimers() {
            clearTimeout(falseGoalTimer1);
            clearTimeout(falseGoalTimer2);
            falseGoalTimer1 = null;
            falseGoalTimer2 = null;
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

        triggerFalseGoalDetonation(key: any) {
            detonateFalseGoal(state, key);
            setOverlayState(core.FALSE_GOAL_ANIMATING);
            runEffects(computeFalseGoalDetonationEffects(), {
                showFalseGoalDetonation: () => ui.showFalseGoalDetonation(),
                playSound:               (note: any, dur: any) => core.SOUND_BUS.play(note, dur),
            });
            falseGoalTimer1 = scheduleTimer(() => {
                falseGoalTimer1 = null;
                ui.showFalseGoalDetonation({ exploded: true });
                core.SOUND_BUS.play('F1', '4n');
                falseGoalTimer2 = scheduleTimer(() => {
                    falseGoalTimer2 = null;
                    ui.hideFalseGoalDetonation();
                    setOverlayState(core.OVERLAY_NONE);
                }, 1000);
            }, 1000);
        },
    };
}
