import type { AppState, ControllerDeps } from '../state.js';
import { Effects } from '../runtime/effects.js';
import { runEffects } from '../runtime/effect-runner.js';
import type { Effect } from '../runtime/effects.js';

// Pure function: produces the side-effect list for a win event without touching adapters.
// Enables DOM-free testing of win-event logic.
export function computeWinEffects(state: AppState, core: any): Effect[] {
    const effects: Effect[] = [
        Effects.playSound('C5', '8n'),
        Effects.openModal('winModal'),
    ];
    if (state.ENGINE.mode === core.PLAY) {
        effects.push(Effects.persistProgress(state.ENGINE.levelIdx));
    }
    return effects;
}

export function createWinController({ core, state, ui, persistence, setLogicState }: ControllerDeps) {
    return {
        handleWin() {
            setLogicState(core.RESOLVED);
            ui.renderWinExportPanel({
                solutionOutput: JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, ''),
                showExportArea: state.ENGINE.isDevMode,
            });
            runEffects(computeWinEffects(state, core), {
                playSound:       (note: any, dur: any) => core.SOUND_BUS.play(note, dur),
                openModal:       (id: any)        => ui.openModal(id),
                persistProgress: (idx: any)       => persistence.markLevelComplete(idx),
            });
        },
    };
}
