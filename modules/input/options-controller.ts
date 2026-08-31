import type { RequireDeps } from '../state.js';
// Options controller: theme modal, game options toggles, mute, perspective,
// reset, undo, dev mode toggle, and the dev-gen (copy-hints) shortcut.
import { popNavigationUndoStack, setDevCorpus, toggleDevMode } from '../state-actions.js';
import { defaultReportError } from '../error-reporting.js';
import { OVERLAY_NONE, PLAY, REVIEW } from '../app-constants.js';
import { deepCloneLevel } from '../domain/level-codec.js';

export function createOptionsController({ state, ui, engine, themes, data, devCorpus, solverApi, persistence, audioService, reportError = defaultReportError }: RequireDeps<'data' | 'solverApi'>, { tryNavigate: _tryNavigate }: any) {

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
        engine.navigation.setOrientation((state.ENGINE.orientation + 1) % 8);
        audioService.play('D5', '32n');
    };
    (document.getElementById('whoaBtn') as any).onclick = perspectiveAction;

    // --- Reset ---

    (document.getElementById('resetBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== OVERLAY_NONE || state.ENGINE.solver.controller) return;
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
            solverApi.validateCandidatePath(deepCloneLevel(state.ENGINE.level), path)?.ok
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
        syncDevCorpusControl();
    };

    // --- Dev: Play/Edit level-corpus switcher (Options Menu, Dev Mode only) ---
    // Review Mode and submission/approval always target the published corpus regardless of this
    // setting — see modules/dev-corpus.ts's header comment for why that's safe.

    const syncDevCorpusControl = () => {
        const section = (document.getElementById('devCorpusSection') as any);
        if (section) section.classList.toggle('hidden', !state.ENGINE.isDevMode);
        const select = (document.getElementById('devCorpusSelect') as any);
        if (select) select.value = state.ENGINE.runtime.devCorpus || 'published';
    };

    const switchDevCorpus = async (corpusId: any) => {
        const select = (document.getElementById('devCorpusSelect') as any);
        try {
            await devCorpus.switchTo(corpusId);
        } catch (err: any) {
            reportError('options.dev-corpus-switch', err);
            ui.showMessage(err?.message || 'Failed to load corpus.', 'error');
            if (select) select.value = state.ENGINE.runtime.devCorpus || 'published';
            return;
        }
        setDevCorpus(state, corpusId);
        ui.showMessage(`Corpus: ${corpusId}`, 'info');
        // Review Mode reads submissions from Firestore, never data.getLevels(), so it's untouched
        // by this switch — only reload the Play/Edit level display when that's the active mode.
        if (state.ENGINE.mode !== REVIEW) engine.game.loadLevel(0);
    };
    (document.getElementById('devCorpusSelect') as any).onchange = (e: any) => { void switchDevCorpus(e.target.value); };

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
        if (state.ENGINE.mode === PLAY) engine.game.loadLevel(state.ENGINE.levelIdx, { keepOrientation: true });
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
            // A non-published corpus is a dev-only affordance — never leave Play/Edit pointed at
            // one once Dev Mode is off.
            if (state.ENGINE.runtime.devCorpus !== 'published') await switchDevCorpus('published');
            toggleDevMode(state);
            engine.updatePlayModeLayout();
            ui.showMessage('Player Enabled', 'info');
            return;
        }
        ui.showMessage('Signing in…', 'info');
        try {
            await persistence.initAdminAuth();
        } catch (err: any) {
            reportError('options.dev-sign-in', err);
            ui.showMessage(err?.message || 'Sign-in failed.', 'error');
            return;
        }
        toggleDevMode(state);
        engine.updatePlayModeLayout();
        engine.ratings.refreshLevelRatingPane();
        ui.showMessage('Dev Enabled', 'info');
    };
}
