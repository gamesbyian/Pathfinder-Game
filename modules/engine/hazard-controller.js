import { detonateFalseGoal } from '../state-actions.js';

export function createHazardController({ core, state, ui, setOverlayState }) {
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
            ui.showGooseJumpScare();
            setOverlayState(core.GOOSE_OVERLAY);
            setTimeout(() => {
                if (state.ENGINE.overlayState === core.GOOSE_OVERLAY) {
                    ui.hideGooseJumpScare();
                    setOverlayState(core.OVERLAY_NONE);
                }
            }, 2500);
        },

        triggerBombDetonation(key) {
            detonateFalseGoal(state, key);
            setOverlayState(core.FALSE_GOAL_ANIMATING);
            ui.showBombDetonation();
            core.SOUND_BUS.play('C2', '8n');
            bombTimer1 = setTimeout(() => {
                bombTimer1 = null;
                ui.showBombDetonation({ exploded: true });
                core.SOUND_BUS.play('F1', '4n');
                bombTimer2 = setTimeout(() => {
                    bombTimer2 = null;
                    ui.hideBombDetonation();
                    setOverlayState(core.OVERLAY_NONE);
                }, 1000);
            }, 1000);
        },
    };
}
