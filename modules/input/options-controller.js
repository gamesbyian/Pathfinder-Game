// Options controller: theme modal, game options toggles, mute, perspective,
// reset, undo, dev mode toggle, and the dev-gen (copy-hints) shortcut.

export function createOptionsController({ core, state, ui, engine, themes, data, solverV2, levelUtils }, { tryNavigate }) {

    // --- Mute ---

    document.getElementById('muteBtn').onclick = () => {
        ui.closeAllModals();
        engine.toggleMute();
        ui.setInlineStyle('muteSlash', 'display', state.ENGINE.muted ? 'block' : 'none');
    };

    // --- Perspective ---

    const perspectiveAction = () => {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) return;
        engine.setVariant((state.ENGINE.variant + 1) % 8);
        core.SOUND_BUS.play('D5', '32n');
    };
    document.getElementById('whoaBtn').onclick = perspectiveAction;

    // --- Reset ---

    document.getElementById('resetBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        engine.handleResetAction();
    };

    // --- Undo (play mode) ---

    document.getElementById('undoBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.nav.undoStack.length) engine.applySnapshot(state.ENGINE.nav.undoStack.pop());
    };

    // --- Dev: copy current hints ---

    document.getElementById('devGenBtn').onclick = async () => {
        ui.closeAllModals();
        const hints = (state.ENGINE.foundHintsSinceLoad || []).filter(path =>
            solverV2.validateCandidatePath(levelUtils.deepCloneLevel(state.ENGINE.level), path)?.ok
        );
        if (!hints.length) { ui.showMessage('No valid hints found yet.', ''); return; }
        const hintText = JSON.stringify(hints).replace(/\s/g, '');
        ui.setSolutionOutput(hintText);
        await ui.copyText(hintText, { fallbackElId: 'solutionOutput' });
        ui.showMessage(`Copied ${hints.length} hint${hints.length === 1 ? '' : 's'}`, '');
    };

    // --- Theme / options modal ---

    const syncOptionToggles = () => {
        const opts = state.ENGINE.options || {};
        const set = (id, checked) => { const el = document.getElementById(id); if (el) el.checked = !!checked; };
        set('optionMuteToggle',       state.ENGINE.muted);
        set('optionGeeseToggle',      opts.geese      !== false);
        set('optionFalseGoalsToggle', opts.falseGoals !== false);
        set('optionDeadGatesToggle',  opts.deadGates  !== false);
        const label = document.getElementById('currentThemeOptionLabel');
        if (label) label.textContent = themes.getCurrentTheme
            ? themes.getCurrentTheme()
            : (state.ENGINE.runtime.currentTheme || 'classic');
    };

    const showOptionsPage = () => document.getElementById('optionsPanelTrack')?.classList.remove('show-theme-page');
    const showThemePage   = () => {
        themes.populateThemes();
        document.getElementById('optionsPanelTrack')?.classList.add('show-theme-page');
    };

    document.getElementById('openThemeModalBtn').onclick = () => {
        if (ui.isModalOpen('themeModal')) { ui.closeModal('themeModal'); return; }
        ui.closeAllModals();
        ui.updateLayoutMode();
        syncOptionToggles();
        showOptionsPage();
        ui.openModal('themeModal');
    };
    document.getElementById('closeThemeModalBtn').onclick = () => ui.closeModal('themeModal');
    document.getElementById('openThemePageBtn').onclick   = showThemePage;
    document.getElementById('backToOptionsBtn').onclick   = () => { syncOptionToggles(); showOptionsPage(); };

    const reloadForOptions = () => {
        if (state.ENGINE.mode === core.PLAY) engine.loadLevel(state.ENGINE.levelIdx, { keepVariant: true });
    };
    const bindOptionToggle = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onchange = () => { fn(el.checked); reloadForOptions(); };
    };
    bindOptionToggle('optionMuteToggle',       checked => { engine.setMuted(checked); ui.setInlineStyle('muteSlash', 'display', state.ENGINE.muted ? 'block' : 'none'); });
    bindOptionToggle('optionGeeseToggle',      checked => engine.setOption('geese', checked));
    bindOptionToggle('optionFalseGoalsToggle', checked => engine.setOption('falseGoals', checked));
    bindOptionToggle('optionDeadGatesToggle',  checked => engine.setOption('deadGates', checked));

    document.getElementById('optionsBlockedNextBtn').onclick = () => {
        ui.closeModal('playOptionsBlockedModal');
        const total = data.getLevels().length;
        if (total) engine.loadLevel((state.ENGINE.levelIdx + 1) % total);
    };

    // --- Dev mode toggle ---

    document.getElementById('devToggleBtn').onclick = () => {
        state.ENGINE.isDevMode = !state.ENGINE.isDevMode;
        engine.updatePlayModeLayout();
        ui.showMessage(state.ENGINE.isDevMode ? 'Dev Enabled' : 'Player Enabled', 'text-white font-black');
    };
}
