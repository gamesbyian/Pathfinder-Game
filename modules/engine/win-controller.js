import { Effects } from '../runtime/effects.js';
import { runEffects } from '../runtime/effect-runner.js';

// Pure function: produces the side-effect list for a win event without touching adapters.
// Enables DOM-free testing of win-event logic.
export function computeWinEffects(state, core) {
    const effects = [
        Effects.playSound('C5', '8n'),
        Effects.openModal('winModal'),
    ];
    if (state.ENGINE.mode === core.PLAY) {
        effects.push(Effects.persistProgress(state.ENGINE.levelIdx));
    }
    return effects;
}

export function createWinController({ core, state, ui, persistence, setLogicState }) {
    return {
        handleWin() {
            setLogicState(core.RESOLVED);
            ui.renderWinExportPanel({
                solutionOutput: JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, ''),
                showExportArea: state.ENGINE.isDevMode,
            });
            runEffects(computeWinEffects(state, core), {
                playSound:       (note, dur) => core.SOUND_BUS.play(note, dur),
                openModal:       (id)        => ui.openModal(id),
                persistProgress: (idx)       => persistence.markLevelComplete(idx),
            });
        },
    };
}
