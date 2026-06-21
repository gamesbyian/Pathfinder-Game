// @ts-check
import { Effects } from '../runtime/effects.js';
import { runEffects } from '../runtime/effect-runner.js';

// Pure function: produces the side-effect list for a win event without touching adapters.
// Enables DOM-free testing of win-event logic.
/** @param {any} state @param {any} core @returns {import('../runtime/effects.js').Effect[]} */
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

/** @param {any} deps */
export function createWinController({ core, state, ui, persistence, setLogicState }) {
    return {
        handleWin() {
            setLogicState(core.RESOLVED);
            ui.renderWinExportPanel({
                solutionOutput: JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, ''),
                showExportArea: state.ENGINE.isDevMode,
            });
            runEffects(computeWinEffects(state, core), {
                playSound:       (/** @type {any} */ note, /** @type {any} */ dur) => core.SOUND_BUS.play(note, dur),
                openModal:       (/** @type {any} */ id)        => ui.openModal(id),
                persistProgress: (/** @type {any} */ idx)       => persistence.markLevelComplete(idx),
            });
        },
    };
}
