import {
    clearEditorUndoStack,
    clearEditorTriggerableFalseGoalCells,
    clearNavigationUndoStack,
    clearRipples,
    markDirty,
    resetFalseGoalHazardsForLevel,
    resetHinterForLevel,
    resetReviewSubmissions,
    setCheatActive,
    setCheatTimer,
    setDetonatedFalseGoals,
    setEditorEmptyClickCount,
    setEditorModified,
    setEditorPencilMode,
    setEditorWorkingHintRecords,
    setEditorWorkingHints,
    setEditorWorkingLevel,
    setFoundHintsSinceLoad,
    setLevel,
    setLevelIndex,
    setMode as setModeState,
    setResetStreak,
    setRevealedGeese,
    setReviewSavedPlayLevelIndex,
    setOrientation as setOrientationState,
} from '../state-actions.js';
import { knownHintCount, hintButtonLabel } from '../solver/diversification.js';
import { hintPaths } from '../domain/hint-types.js';
import { defaultReportError } from '../error-reporting.js';
import { EDITOR, IDLE, OVERLAY_NONE, PLAY, REVIEW } from '../app-constants.js';
import { assertLevelShape, deepCloneLevel } from '../domain/level-codec.js';
import { normalizeLevelFromData } from '../level-data.js';

/**
 * Pure decision for the reset-streak cheat easter egg: 5 consecutive resets briefly reveal
 * hidden objects ("cheat" mode) for a few seconds. Returns what should change; the controller
 * applies the timer/sound/state side effects. Mirrors the computeWinEffects/computeJumpScareEffects
 * pure-core pattern so the decision is unit-testable without booting the app.
 *
 * @param {{ cheatActive: boolean, resetStreak: number }} input current cheat/streak state
 * @returns {{ nextResetStreak: number, activateCheat: boolean, playSound: boolean,
 *             rescheduleExpiry: boolean, expiryClearsStreak: boolean }}
 */
export function planResetCheat({ cheatActive, resetStreak }: any) {
    if (cheatActive) {
        // A reset during the active window just refreshes the expiry timer; streak is untouched.
        return { nextResetStreak: resetStreak, activateCheat: false, playSound: false,
                 rescheduleExpiry: true, expiryClearsStreak: false };
    }
    const nextResetStreak = resetStreak + 1;
    if (nextResetStreak >= 5) {
        return { nextResetStreak, activateCheat: true, playSound: true,
                 rescheduleExpiry: true, expiryClearsStreak: true };
    }
    return { nextResetStreak, activateCheat: false, playSound: false,
             rescheduleExpiry: false, expiryClearsStreak: false };
}

export function createLevelFlowController({
    state, ui, data, persistence, editor, audioService, reportError = defaultReportError,
    PathNavigator,
    clearFalseGoalTimers,
    applyPlayChallengeOptions, showOptionsBlockedModalIfNeeded,
    resetEmptyReviewState,
    setLogicState, setOverlayState,
    refreshLevelRatingPane = () => {},
    scheduleTimer = setTimeout,
}: any) {
    function updatePencilState() {
        ui.updatePencilButton(state.ENGINE.editor.isPencilMode);
    }

    function updatePlayModeLayout() {
        ui.applyModeLayout(state.ENGINE.mode, { isDevMode: state.ENGINE.isDevMode });
    }

    function updateCompletionUI() {
        const eng        = state.ENGINE;
        const isComplete = eng.progressSet.has(eng.levelIdx);
        const isPlayMode = eng.mode === PLAY;
        const isReview   = eng.mode === REVIEW;
        let reviewDisplay = null;
        if (isReview) {
            const subs = eng.review.submissions;
            const idx  = eng.review.currentIdx;
            reviewDisplay = subs.length > 0 ? `${idx + 1}/${subs.length}` : '0/0';
        }
        ui.updateLevelDisplay(eng.levelIdx, isComplete && isPlayMode, reviewDisplay);
    }

    // Initialize the editor's working copy from the current play level. Shared by the two
    // editor-entry paths — switching into EDITOR mode (switchMode) and loading a level while
    // already in EDITOR mode (_loadLevelByIndex) — which previously duplicated this block verbatim.
    function _initEditorWorkingCopy() {
        setEditorWorkingLevel(state, deepCloneLevel(state.ENGINE.level));
        setEditorPencilMode(state, false);
        clearEditorUndoStack(state);
        clearEditorTriggerableFalseGoalCells(state);
        setEditorEmptyClickCount(state, 0);
        ui.setInputValue('editReqLen', state.ENGINE.editor.workingLevel.requiredLength || 0);
        ui.setInputValue('editReqInt', state.ENGINE.editor.workingLevel.requiredIntersections || 0);
        editor.syncMetadataFieldsFromLevel(state.ENGINE.editor.workingLevel);
        setEditorModified(state, false);
        // Hints button shows the count of known solutions (saved + found this session); foundHints was
        // just reset on load, so this is the saved count until a Solve adds more.
        ui.setButtonLabel('reviewHintBtn', hintButtonLabel(knownHintCount(state.ENGINE.editor.workingLevel.hints, state.ENGINE.foundHintsSinceLoad)));
        _attachSavedHintsToWorkingCopy();
        updatePencilState();
    }

    // A bundled level's saved hints live in the lazily-fetched artifact (hardening plan §2),
    // so the working copy cloned above starts with an empty hints array. Attach the full saved
    // set asynchronously — the Hints button count and any later submission then see them, same
    // as when hints were inline. Bails if the working level changed while the fetch was in
    // flight or hints arrived some other way (e.g. a Solve run).
    function _attachSavedHintsToWorkingCopy() {
        if (typeof data?.getHints !== 'function') return; // test stubs may omit the data service
        const wl = state.ENGINE.editor.workingLevel;
        if (!wl || (Array.isArray(wl.hints) && wl.hints.length > 0)) return;
        const levelNumber = state.ENGINE.levelIdx + 1;
        const rawLevel = data.getLevel(state.ENGINE.levelIdx);
        data.getHints(rawLevel)
            .then((hints: import('../domain/hint-types.js').Hint[]) => {
                if (state.ENGINE.editor.workingLevel !== wl || hints.length === 0) return;
                if (Array.isArray(wl.hints) && wl.hints.length > 0) return;
                setEditorWorkingHints(state, hintPaths(hints).map((h) => h.slice()));
                setEditorWorkingHintRecords(state, hints);
                ui.setButtonLabel('reviewHintBtn', hintButtonLabel(knownHintCount(wl.hints, state.ENGINE.foundHintsSinceLoad)));
            })
            .catch((err: any) => { reportError('hints.editor-load', err, { levelNumber }); });
    }

    function _loadLevelByIndex(idx: any, keepOrientation: any = false) {
        clearFalseGoalTimers();
        if (state.ENGINE.solver.controller) return;

        const levels = data.getLevels();
        if (!levels || !data.getLevel(idx)) return;

        setLevelIndex(state, idx);

        const isEditor = state.ENGINE.mode === EDITOR;
        if (isEditor) setOrientationState(state, 0);
        else if (!keepOrientation) setOrientationState(state, Math.floor(Math.random() * 8));

        setLogicState(IDLE);
        setOverlayState(OVERLAY_NONE);

        const baseLevel = normalizeLevelFromData(data, idx, reportError);
        const optionsResult = applyPlayChallengeOptions(baseLevel);
        showOptionsBlockedModalIfNeeded(optionsResult);
        setLevel(state, optionsResult.level ?? baseLevel);
        if (optionsResult.playable !== false) assertLevelShape(state.ENGINE.level);
        // Reset the run for the freshly-set level (clear path/undo/geese/ripples, re-arm false
        // goals), then the hint state. resetRunState is the single nav-reset primitive.
        resetRunState({ keepLevel: true });
        setFoundHintsSinceLoad(state);
        resetHinterForLevel(state);

        if (isEditor) _initEditorWorkingCopy();

        ui.updateLevelDisplay(idx, false);
        ui.closeModal('winModal');
        ui.showMessage('', '');
        ui.setSolutionOutput('');
        ui.updateAppScale();
        ui.updateViewport();
        ui.applyHintPinState(false, false);
        updateCompletionUI();
        persistence.persistSessionState();
        markDirty(state);
        refreshLevelRatingPane();
    }

    function resetRunState({ keepLevel = true }: any = {}) {
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        clearRipples(state);

        if (!keepLevel) setLevel(state, null);
        resetFalseGoalHazardsForLevel(state, state.ENGINE.level);
    }

    function loadLevel(levelObjOrIdx: any, options: any = {}) {
        if (typeof levelObjOrIdx === 'number') return _loadLevelByIndex(levelObjOrIdx, !!options.keepOrientation);
        const mode = options.mode || state.ENGINE.mode;
        if (mode === PLAY) setLevel(state, levelObjOrIdx);
        else setEditorWorkingLevel(state, levelObjOrIdx);
        resetRunState({ keepLevel: true });
    }

    function switchMode(newMode: any) {
        if (newMode === PLAY && state.ENGINE.mode === REVIEW) {
            setLevelIndex(state, state.ENGINE.review.savedPlayLevelIdx);
        }
        const isEd     = newMode === EDITOR;
        const isReview = newMode === REVIEW;
        setModeState(state, newMode);
        if (newMode !== PLAY) ui.closeModal('playOptionsBlockedModal');
        if (!isReview) ui.setClassState('reviewEmptyMsg', 'hidden', true);
        if (!isReview) ui.setClassState('reviewHintAdditionBadge', 'hidden', true);
        ui.setSolutionOutput('');
        setLogicState(IDLE);
        setOverlayState(OVERLAY_NONE);
        resetHinterForLevel(state);
        ui.applyHintPinState(false, false);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        setDetonatedFalseGoals(state);
        ui.applyModeLayout(newMode, { isDevMode: state.ENGINE.isDevMode });
        if (isEd) {
            setOrientationState(state, 0);
            _initEditorWorkingCopy();
        } else if (isReview) {
            setReviewSavedPlayLevelIndex(state, state.ENGINE.levelIdx);
            setEditorPencilMode(state, false);
            setEditorEmptyClickCount(state, 0);
            resetEmptyReviewState();
            updatePencilState();
        } else {
            _loadLevelByIndex(state.ENGINE.levelIdx, true);
        }
        ui.updateAppScale();
        ui.updateViewport();
        ui.syncEditorPalettePlacement();
        updateCompletionUI();
        ui.showMessage('', '');
        markDirty(state);
        refreshLevelRatingPane();
    }

    function handleResetAction() {
        const plan = planResetCheat({
            cheatActive: state.ENGINE.cheatActive,
            resetStreak: state.ENGINE.resetStreak,
        });
        setResetStreak(state, plan.nextResetStreak);
        if (plan.activateCheat) setCheatActive(state, true);
        if (plan.playSound) audioService.play('F5', '8n');
        if (plan.rescheduleExpiry) {
            if (state.ENGINE.cheatTimer) clearTimeout(state.ENGINE.cheatTimer);
            setCheatTimer(state, scheduleTimer(() => {
                setCheatActive(state, false);
                if (plan.expiryClearsStreak) setResetStreak(state, 0);
            }, 3000));
        }
        _loadLevelByIndex(state.ENGINE.levelIdx, true);
    }

    function initReviewMode() {
        resetReviewSubmissions(state);
        switchMode(REVIEW);
    }

    return {
        loadLevel,
        switchMode,
        handleResetAction,
        initReviewMode,
        resetRunState,
        updatePencilState,
        updatePlayModeLayout,
        updateCompletionUI,
    };
}
