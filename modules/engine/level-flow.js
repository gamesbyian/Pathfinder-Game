import {
    clearEditorUndoStack,
    clearEditorValidTrapSpots,
    clearNavigationUndoStack,
    clearRipples,
    incrementResetStreak,
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

export function createLevelFlowController({
    core, state, ui, data, levelUtils, persistence, editor,
    PathNavigator,
    clearBombTimers,
    applyPlayChallengeOptions, showOptionsBlockedModalIfNeeded,
    resetEmptyReviewState,
    setLogicState, setOverlayState,
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

        setLevel(state, levelUtils.normalizeLevel(idx));
        const optionsResult = applyPlayChallengeOptions(state.ENGINE.level);
        showOptionsBlockedModalIfNeeded(optionsResult);
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
        ui.setSolutionOutput('');
        setLogicState(core.IDLE);
        setOverlayState(core.OVERLAY_NONE);
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
    }

    function handleResetAction() {
        if (state.ENGINE.cheatActive) {
            if (state.ENGINE.cheatTimer) clearTimeout(state.ENGINE.cheatTimer);
            setCheatTimer(state, setTimeout(() => { setCheatActive(state, false); }, 3000));
        } else {
            incrementResetStreak(state);
            if (state.ENGINE.resetStreak >= 5) {
                setCheatActive(state, true);
                core.SOUND_BUS.play('F5', '8n');
                if (state.ENGINE.cheatTimer) clearTimeout(state.ENGINE.cheatTimer);
                setCheatTimer(state, setTimeout(() => {
                    setCheatActive(state, false);
                    setResetStreak(state, 0);
                }, 3000));
            }
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
