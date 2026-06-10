// Options controller: theme modal, game options toggles, mute, perspective,
// reset, undo, dev mode toggle, and the dev-gen (copy-hints) shortcut.

export function installOptionsController(APP, { tryNavigate }) {

    // --- Mute ---

    document.getElementById('muteBtn').onclick = () => {
        APP.UI.closeAllModals();
        APP.State.ENGINE.muted = !APP.State.ENGINE.muted;
        APP.UI.setInlineStyle('muteSlash', 'display', APP.State.ENGINE.muted ? 'block' : 'none');
    };

    // --- Perspective ---

    const perspectiveAction = () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.activeSolverController) return;
        APP.State.ENGINE.variant = (APP.State.ENGINE.variant + 1) % 8;
        APP.UI.updateViewport();
        APP.Engine.rebuildDerivedPathState(APP.State.ENGINE);
        APP.Core.SOUND_BUS.play('D5', '32n');
    };
    document.getElementById('whoaBtn').onclick = perspectiveAction;

    // --- Reset ---

    document.getElementById('resetBtn').onclick = () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return;
        if (APP.State.ENGINE.cheatActive) {
            if (APP.State.ENGINE.cheatTimer) clearTimeout(APP.State.ENGINE.cheatTimer);
            APP.State.ENGINE.cheatTimer = setTimeout(() => { APP.State.ENGINE.cheatActive = false; }, 3000);
        } else {
            APP.State.ENGINE.resetStreak++;
            if (APP.State.ENGINE.resetStreak >= 5) {
                APP.State.ENGINE.cheatActive = true;
                APP.Core.SOUND_BUS.play('F5', '8n');
                if (APP.State.ENGINE.cheatTimer) clearTimeout(APP.State.ENGINE.cheatTimer);
                APP.State.ENGINE.cheatTimer = setTimeout(() => {
                    APP.State.ENGINE.cheatActive  = false;
                    APP.State.ENGINE.resetStreak  = 0;
                }, 3000);
            }
        }
        APP.Engine.loadLevel(APP.State.ENGINE.levelIdx, { keepVariant: true });
    };

    // --- Undo (play mode) ---

    document.getElementById('undoBtn').onclick = () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.undoStack.length) APP.Engine.applySnapshot(APP.State.ENGINE.undoStack.pop());
    };

    // --- Dev: copy current hints ---

    document.getElementById('devGenBtn').onclick = async () => {
        APP.UI.closeAllModals();
        const hints = (APP.State.ENGINE.foundHintsSinceLoad || []).filter(path =>
            APP.Solver.validateCandidatePath(APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.level), path)?.ok
        );
        if (!hints.length) { APP.UI.showMessage('No valid hints found yet.', ''); return; }
        const hintText = JSON.stringify(hints).replace(/\s/g, '');
        APP.UI.setSolutionOutput(hintText);
        await APP.UI.copyText(hintText, { fallbackElId: 'solutionOutput' });
        APP.UI.showMessage(`Copied ${hints.length} hint${hints.length === 1 ? '' : 's'}`, '');
    };

    // --- Theme / options modal ---

    const syncOptionToggles = () => {
        const opts = APP.State.ENGINE.options || {};
        const set = (id, checked) => { const el = document.getElementById(id); if (el) el.checked = !!checked; };
        set('optionMuteToggle',       APP.State.ENGINE.muted);
        set('optionGeeseToggle',      opts.geese      !== false);
        set('optionFalseGoalsToggle', opts.falseGoals  !== false);
        set('optionDeadGatesToggle',  opts.deadGates   !== false);
        const label = document.getElementById('currentThemeOptionLabel');
        if (label) label.textContent = APP.Themes.getCurrentTheme
            ? APP.Themes.getCurrentTheme()
            : (APP.State.ENGINE.runtime.currentTheme || 'classic');
    };

    const showOptionsPage = () => document.getElementById('optionsPanelTrack')?.classList.remove('show-theme-page');
    const showThemePage   = () => {
        APP.Themes.populateThemes();
        document.getElementById('optionsPanelTrack')?.classList.add('show-theme-page');
    };

    document.getElementById('openThemeModalBtn').onclick = () => {
        if (APP.UI.isModalOpen('themeModal')) { APP.UI.closeModal('themeModal'); return; }
        APP.UI.closeAllModals();
        APP.UI.updateLayoutMode();
        syncOptionToggles();
        showOptionsPage();
        APP.UI.openModal('themeModal');
    };
    document.getElementById('closeThemeModalBtn').onclick = () => APP.UI.closeModal('themeModal');
    document.getElementById('openThemePageBtn').onclick   = showThemePage;
    document.getElementById('backToOptionsBtn').onclick   = () => { syncOptionToggles(); showOptionsPage(); };

    const reloadForOptions = () => {
        if (APP.State.ENGINE.mode === APP.Core.PLAY) APP.Engine.loadLevel(APP.State.ENGINE.levelIdx, { keepVariant: true });
    };
    const bindOptionToggle = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.onchange = () => { fn(el.checked); reloadForOptions(); };
    };
    bindOptionToggle('optionMuteToggle',       checked => { APP.State.ENGINE.muted = checked; APP.UI.setInlineStyle('muteSlash', 'display', APP.State.ENGINE.muted ? 'block' : 'none'); });
    bindOptionToggle('optionGeeseToggle',      checked => { APP.State.ENGINE.options.geese       = checked; });
    bindOptionToggle('optionFalseGoalsToggle', checked => { APP.State.ENGINE.options.falseGoals  = checked; });
    bindOptionToggle('optionDeadGatesToggle',  checked => { APP.State.ENGINE.options.deadGates   = checked; });

    document.getElementById('optionsBlockedNextBtn').onclick = () => {
        APP.UI.closeModal('playOptionsBlockedModal');
        const total = APP.Data.getLevels().length;
        if (total) APP.Engine.loadLevel((APP.State.ENGINE.levelIdx + 1) % total);
    };

    // --- Dev mode toggle ---

    document.getElementById('devToggleBtn').onclick = () => {
        APP.State.ENGINE.isDevMode = !APP.State.ENGINE.isDevMode;
        APP.Engine.updatePlayModeLayout();
        APP.UI.showMessage(APP.State.ENGINE.isDevMode ? 'Dev Enabled' : 'Player Enabled', 'text-white font-black');
    };
}
