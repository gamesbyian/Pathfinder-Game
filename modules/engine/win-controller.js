export function createWinController({ core, state, ui, persistence, setLogicState }) {
    return {
        handleWin() {
            setLogicState(core.RESOLVED);
            ui.renderWinExportPanel({
                solutionOutput: JSON.stringify(state.ENGINE.nav.path).replace(/\s/g, ''),
                showExportArea: state.ENGINE.isDevMode,
            });
            if (state.ENGINE.mode === core.PLAY) persistence.markLevelComplete(state.ENGINE.levelIdx);
            ui.openModal('winModal');
            core.SOUND_BUS.play('C5', '8n');
        },
    };
}
