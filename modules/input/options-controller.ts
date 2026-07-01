import type { ControllerDeps } from '../state.js';
// Options controller: theme modal, game options toggles, mute, perspective,
// reset, undo, dev mode toggle, and the dev-gen (copy-hints) shortcut.
import { popNavigationUndoStack, toggleDevMode } from '../state-actions.js';

export function createOptionsController({ core, state, ui, engine, themes, data, solverApi, levelUtils, persistence }: ControllerDeps, { tryNavigate: _tryNavigate }: any) {

    // --- Mute ---

    (document.getElementById('muteBtn') as any).onclick = () => {
        ui.closeAllModals();
        engine.toggleMute();
        ui.setInlineStyle('muteSlash', 'display', state.ENGINE.muted ? 'block' : 'none');
    };

    // --- Perspective ---

    const perspectiveAction = () => {
        ui.closeAllModals();
        if (state.ENGINE.solver.controller) return;
        engine.navigation.setVariant((state.ENGINE.variant + 1) % 8);
        core.SOUND_BUS.play('D5', '32n');
    };
    (document.getElementById('whoaBtn') as any).onclick = perspectiveAction;

    // --- Reset ---

    (document.getElementById('resetBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        engine.handleResetAction();
    };

    // --- Undo (play mode) ---

    (document.getElementById('undoBtn') as any).onclick = () => {
        ui.closeAllModals();
        const snapshot = popNavigationUndoStack(state);
        if (snapshot) engine.game.applySnapshot(snapshot);
    };

    // --- Dev: copy current hints ---

    (document.getElementById('devGenBtn') as any).onclick = async () => {
        ui.closeAllModals();
        const hints = (state.ENGINE.foundHintsSinceLoad || []).filter((path: any) =>
            solverApi.validateCandidatePath(levelUtils.deepCloneLevel(state.ENGINE.level), path)?.ok
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
        const set = (id: any, checked: any) => { const el = (document.getElementById(id) as any); if (el) el.checked = !!checked; };
        set('optionMuteToggle',       state.ENGINE.muted);
        set('optionGeeseToggle',      opts.geese      !== false);
        set('optionFalseGoalsToggle', opts.falseGoals !== false);
        set('optionDeadGatesToggle',  opts.deadGates  !== false);
        const label = (document.getElementById('currentThemeOptionLabel') as any);
        if (label) label.textContent = themes.getCurrentTheme
            ? themes.getCurrentTheme()
            : (state.ENGINE.runtime.currentTheme || 'classic');
    };

    const showOptionsPage = () => (document.getElementById('optionsPanelTrack') as any)?.classList.remove('show-theme-page');
    const showThemePage   = () => {
        themes.populateThemes();
        (document.getElementById('optionsPanelTrack') as any)?.classList.add('show-theme-page');
    };

    (document.getElementById('openThemeModalBtn') as any).onclick = () => {
        if (ui.isModalOpen('themeModal')) { ui.closeModal('themeModal'); return; }
        ui.closeAllModals();
        ui.updateLayoutMode();
        syncOptionToggles();
        showOptionsPage();
        ui.openModal('themeModal');
    };
    (document.getElementById('closeThemeModalBtn') as any).onclick = () => ui.closeModal('themeModal');
    (document.getElementById('openThemePageBtn') as any).onclick   = showThemePage;
    (document.getElementById('backToOptionsBtn') as any).onclick   = () => { syncOptionToggles(); showOptionsPage(); };

    const reloadForOptions = () => {
        if (state.ENGINE.mode === core.PLAY) engine.game.loadLevel(state.ENGINE.levelIdx, { keepVariant: true });
    };
    const bindOptionToggle = (id: any, fn: any) => {
        const el = (document.getElementById(id) as any);
        if (el) el.onchange = () => { fn(el.checked); reloadForOptions(); };
    };
    bindOptionToggle('optionMuteToggle',       (checked: any) => { engine.setMuted(checked); ui.setInlineStyle('muteSlash', 'display', state.ENGINE.muted ? 'block' : 'none'); });
    bindOptionToggle('optionGeeseToggle',      (checked: any) => engine.setOption('geese', checked));
    bindOptionToggle('optionFalseGoalsToggle', (checked: any) => engine.setOption('falseGoals', checked));
    bindOptionToggle('optionDeadGatesToggle',  (checked: any) => engine.setOption('deadGates', checked));

    (document.getElementById('optionsBlockedNextBtn') as any).onclick = () => {
        ui.closeModal('playOptionsBlockedModal');
        const total = data.getLevels().length;
        if (total) engine.game.loadLevel((state.ENGINE.levelIdx + 1) % total);
    };

    // --- Dev mode toggle (gated behind the same admin Google login as Review Mode) ---

    (document.getElementById('devToggleBtn') as any).onclick = async () => {
        if (state.ENGINE.isDevMode) {
            toggleDevMode(state);
            engine.updatePlayModeLayout();
            ui.showMessage('Player Enabled', 'info');
            return;
        }
        ui.showMessage('Signing in…', 'info');
        try {
            await persistence.initAdminAuth();
        } catch (err: any) {
            ui.showMessage(err?.message || 'Sign-in failed.', 'error');
            return;
        }
        toggleDevMode(state);
        engine.updatePlayModeLayout();
        engine.ratings.refreshLevelRatingPane();
        ui.showMessage('Dev Enabled', 'info');
    };
}
