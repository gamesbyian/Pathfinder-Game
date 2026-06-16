import { EffectType, Effects } from '../runtime/effects.js';

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
            for (const fx of computeWinEffects(state, core)) {
                if (fx.type === EffectType.PLAY_SOUND)            core.SOUND_BUS.play(fx.note, fx.duration);
                else if (fx.type === EffectType.OPEN_MODAL)       ui.openModal(fx.modalId);
                else if (fx.type === EffectType.PERSIST_PROGRESS) persistence.markLevelComplete(fx.levelIdx);
            }
        },
    };
}
