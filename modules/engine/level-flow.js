import {
    clearEditorUndoStack,
    clearEditorValidTrapSpots,
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
    setEditorWorkingLevel,
    setFoundHintsSinceLoad,
    setLevel,
    setLevelIndex,
    setMode as setModeState,
    setResetStreak,
    setRevealedGeese,
    setReviewSavedPlayLevelIndex,
    setVariant as setVariantState,
} from '../state-actions.js';

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
export function planResetCheat({ cheatActive, resetStreak }) {
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
    core, state, ui, data, levelUtils, persistence, editor,
    PathNavigator,
    clearBombTimers,
    applyPlayChallengeOptions, showOptionsBlockedModalIfNeeded,
    resetEmptyReviewState,
    setLogicState, setOverlayState,
    refreshLevelRatingPane = () => {},
    scheduleTimer = setTimeout,
}) {
    function updatePencilState() {
        ui.updatePencilButton(state.ENGINE.editor.isPencilMode);
    }

    function updatePlayModeLayout() {
        ui.applyModeLayout(state.ENGINE.mode, { isDevMode: state.ENGINE.isDevMode });
    }

    function updateCompletionUI() {
        const eng        = state.ENGINE;
        const isComplete = eng.progressSet.has(eng.levelIdx);
        const isPlayMode = eng.mode === core.PLAY;
        const isReview   = eng.mode === core.REVIEW;
        let reviewDisplay = null;
        if (isReview) {
            const subs = eng.review.submissions;
            const idx  = eng.review.currentIdx;
            reviewDisplay = subs.length > 0 ? `${idx + 1}/${subs.length}` : '0/0';
        }
        ui.updateLevelDisplay(eng.levelIdx, isComplete && isPlayMode, reviewDisplay);
    }

    function _loadLevelByIndex(idx, keepVariant = false) {
        clearBombTimers();
        if (state.ENGINE.solver.controller) return;

        const levels = data.getLevels();
        if (!levels || !data.getLevel(idx)) return;

        setLevelIndex(state, idx);

        const isEditor = state.ENGINE.mode === core.EDITOR;
        if (isEditor) setVariantState(state, 0);
        else if (!keepVariant) setVariantState(state, Math.floor(Math.random() * 8));

        setLogicState(core.IDLE);
        setOverlayState(core.OVERLAY_NONE);

        const baseLevel = levelUtils.normalizeLevel(idx);
        const optionsResult = applyPlayChallengeOptions(baseLevel);
        showOptionsBlockedModalIfNeeded(optionsResult);
        setLevel(state, optionsResult.level ?? baseLevel);
        if (optionsResult.playable !== false) levelUtils.assertLevelShape(state.ENGINE.level);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        clearRipples(state);

        resetFalseGoalHazardsForLevel(state, state.ENGINE.level);
        setFoundHintsSinceLoad(state);
        resetHinterForLevel(state);

        if (isEditor) {
            setEditorWorkingLevel(state, levelUtils.deepCloneLevel(state.ENGINE.level));
            setEditorPencilMode(state, false);
            clearEditorUndoStack(state);
            clearEditorValidTrapSpots(state);
            setEditorEmptyClickCount(state, 0);
            ui.setInputValue('editReqLen', state.ENGINE.editor.workingLevel.reqLen || 0);
            ui.setInputValue('editReqInt', state.ENGINE.editor.workingLevel.reqInt || 0);
            editor.syncMetadataFieldsFromLevel(state.ENGINE.editor.workingLevel);
            setEditorModified(state, false);
            updatePencilState();
        }

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

    function resetRunState({ keepLevel = true } = {}) {
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        clearRipples(state);

        if (!keepLevel) setLevel(state, null);
        resetFalseGoalHazardsForLevel(state, state.ENGINE.level);
    }

    function loadLevel(levelObjOrIdx, options = {}) {
        if (typeof levelObjOrIdx === 'number') return _loadLevelByIndex(levelObjOrIdx, !!options.keepVariant);
        const mode = options.mode || state.ENGINE.mode;
        if (mode === core.PLAY) setLevel(state, levelObjOrIdx);
        else setEditorWorkingLevel(state, levelObjOrIdx);
        resetRunState({ keepLevel: true });
    }

    function switchMode(newMode) {
        if (newMode === core.PLAY && state.ENGINE.mode === core.REVIEW) {
            setLevelIndex(state, state.ENGINE.review.savedPlayLevelIdx);
        }
        const isEd     = newMode === core.EDITOR;
        const isReview = newMode === core.REVIEW;
        setModeState(state, newMode);
        if (newMode !== core.PLAY) ui.closeModal('playOptionsBlockedModal');
        if (!isReview) ui.setClassState('reviewEmptyMsg', 'hidden', true);
        if (!isReview) ui.setClassState('reviewHintAdditionBadge', 'hidden', true);
        ui.setSolutionOutput('');
        setLogicState(core.IDLE);
        setOverlayState(core.OVERLAY_NONE);
        resetHinterForLevel(state);
        ui.applyHintPinState(false, false);
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        setDetonatedFalseGoals(state);
        ui.applyModeLayout(newMode, { isDevMode: state.ENGINE.isDevMode });
        if (isEd) {
            setVariantState(state, 0);
            setEditorWorkingLevel(state, levelUtils.deepCloneLevel(state.ENGINE.level));
            setEditorPencilMode(state, false);
            clearEditorUndoStack(state);
            clearEditorValidTrapSpots(state);
            setEditorEmptyClickCount(state, 0);
            ui.setInputValue('editReqLen', state.ENGINE.editor.workingLevel.reqLen || 0);
            ui.setInputValue('editReqInt', state.ENGINE.editor.workingLevel.reqInt || 0);
            editor.syncMetadataFieldsFromLevel(state.ENGINE.editor.workingLevel);
            setEditorModified(state, false);
            updatePencilState();
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
        if (plan.playSound) core.SOUND_BUS.play('F5', '8n');
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
        switchMode(core.REVIEW);
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
