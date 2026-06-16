import { getRealLength as getRealLengthImpl,
         areWinMetricsSatisfied as areWinMetricsSatisfiedImpl,
         checkWinConditionImpl as checkWinConditionImplFn } from './runtime/game-rules.js';
import { VALID_LOGIC_TRANSITIONS } from './runtime/state-machine.js';
import { rebuildDerivedState,
         wouldCreateBlockedTIntersection as wouldCreateBlockedTIntersectionImpl } from './runtime/path-state.js';
import { createChallengeOptionsController } from './engine/challenge-options.js';
import { createHazardController } from './engine/hazard-controller.js';
import { createOverlayController } from './engine/overlay-controller.js';
import { createPathNavigator } from './engine/path-navigator.js';
import { createRenderLoop } from './engine/render-loop.js';
import { createReviewModeController } from './engine/review-mode.js';
import { createSolverManager } from './engine/solver-manager.js';
import { createStepDispatcher } from './engine/step-dispatcher.js';
import { createTapRouter } from './engine/tap-router.js';
import { createWinController } from './engine/win-controller.js';
import {
    clearEditorUndoStack,
    clearEditorValidTrapSpots,
    clearNavigationUndoStack,
    clearRipples,
    clearRuntimePendingAction as clearRuntimePendingActionState,
    incrementResetStreak,
    markDirty,
    resetHinterForLevel,
    setLevel,
    setLevelIndex,
    setFoundHintsSinceLoad,
    setLogicState as setLogicStateValue,
    setMode as setModeState,
    setNavigationSnapshot,
    resetFalseGoalHazardsForLevel,
    removeReviewSubmission as removeReviewSubmissionState,
    resetReviewSubmissions,
    remapNavigationKeys,
    restoreFalseGoalHazardsForLevel,
    reverseNavigationPath,
    setCheatActive,
    setCheatTimer,
    setDetonatedFalseGoals,
    setEditorEmptyClickCount,
    setEditorModified,
    setEditorPencilMode,
    setEditorWorkingLevel,
    setMuted as setMutedState,
    setNavigationLastFlipTime,
    setOptionValue,
    setResetStreak,
    setRevealedGeese,
    setReviewSavedPlayLevelIndex,
    setReviewSubmissions as setReviewSubmissionsState,
    setRuntimePendingAction as setRuntimePendingActionState,
    setVariant as setVariantState,
    toggleMuted as toggleMutedState
} from './state-actions.js';

export function createEngine({ core, state, ui, renderer, levelUtils, themes, data, persistence, editor }) {

    // Wrapper: resolves level from state; pure logic is in runtime/game-rules.js.
    // Accepts either full engineState (with .nav sub-object) or a flat state (for tests).
    function areWinMetricsSatisfied(engineState = state.ENGINE, level) {
        const lvl = level !== undefined ? level
            : (engineState.mode === core.PLAY ? engineState.level : engineState.editor?.workingLevel);
        return areWinMetricsSatisfiedImpl(engineState.nav ?? engineState, lvl);
    }

    // Generates packed cell keys for a straight horizontal or vertical path segment.
    // Used only by attemptMoveTo for continuous pointer drag.
    const buildStraightPathSteps = (headPos, target) => {
        const dx = target.x - headPos.x;
        const dy = target.y - headPos.y;
        if (dx !== 0 && dy !== 0) return [];
        const pathSteps = [];
        if (dx !== 0) {
            for (let i = 1; i <= Math.abs(dx); i++) pathSteps.push(levelUtils.PACK(headPos.x + Math.sign(dx) * i, headPos.y));
        } else if (dy !== 0) {
            for (let i = 1; i <= Math.abs(dy); i++) pathSteps.push(levelUtils.PACK(headPos.x, headPos.y + Math.sign(dy) * i));
        }
        return pathSteps;
    };

    function attemptMoveTo(target, opts = {}) {
        if ((state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW) && !state.ENGINE.editor.isPencilMode) return;
        if (!state.ENGINE.nav.path.length) return;
        const headPos = levelUtils.UNPACK(state.ENGINE.nav.path[state.ENGINE.nav.path.length - 1]);
        if (state.ENGINE.logicState === core.PORTAL_PAUSE) {
            if (target.x !== headPos.x || target.y !== headPos.y) setLogicState(core.DRAGGING);
            else return;
        }
        if (target.x === headPos.x && target.y === headPos.y) return;
        const pathSteps = buildStraightPathSteps(headPos, target);
        for (const step of pathSteps) {
            const result = processStep(step);
            if (result === null || result === "goose" || result === "detonate") break;
        }
        if (pathSteps.length > 0) markDirty(state);
    }

    function checkWinCondition() {
        if (checkWinConditionImplFn(
                state.ENGINE.nav.path, state.ENGINE.level, state.ENGINE.mode, state.ENGINE.logicState,
                state.ENGINE.nav.isPortalJump, state.ENGINE.nav.visitedCounts, state.ENGINE.nav.intersections)) {
            handleWin();
        }
    }


    function createSnapshot() {
        return {
            path:               [...state.ENGINE.nav.path],
            isPortalJump:       new Set(state.ENGINE.nav.isPortalJump),
            activeGateKey:      state.ENGINE.nav.activeGateKey,
            logicState:         state.ENGINE.logicState,
            detonatedFalseGoals: new Set(state.ENGINE.hazards.detonatedFalseGoals)
        };
    }

    function applySnapshot(snap) {
        setNavigationSnapshot(state, snap);
        const restoredLogicState = snap.logicState === core.HAZARD_TRIGGERED ? core.IDLE : snap.logicState;
        setLogicState(core.IDLE);
        if (restoredLogicState !== core.IDLE) setLogicState(restoredLogicState);
        const l = state.ENGINE.mode === core.PLAY ? state.ENGINE.level : state.ENGINE.editor.workingLevel;
        restoreFalseGoalHazardsForLevel(state, l, snap.detonatedFalseGoals);
        rebuildDerivedPathState(state.ENGINE);
        markDirty(state);
        ui.showMessage("", "");
    }

    function updatePlayModeLayout() {
        ui.applyModeLayout(state.ENGINE.mode, { isDevMode: state.ENGINE.isDevMode });
    }

    function switchMode(newMode) {
        // Restore saved level index when returning to play from review mode.
        if (newMode === core.PLAY && state.ENGINE.mode === core.REVIEW) {
            setLevelIndex(state, state.ENGINE.review.savedPlayLevelIdx);
        }
        const isEd         = newMode === core.EDITOR;
        const isReview     = newMode === core.REVIEW;
        const isEdOrReview = isEd || isReview;
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
            loadLevel(state.ENGINE.levelIdx, true);
        }
        ui.updateAppScale();
        ui.updateViewport();
        ui.syncEditorPalettePlacement();
        updateCompletionUI();
        ui.showMessage("", "");
        markDirty(state);
    }

    function updatePencilState() {
        ui.updatePencilButton(state.ENGINE.editor.isPencilMode);
    }

    function loadLevel(idx, keepVariant = false) {
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
        ui.showMessage("", "");
        ui.setSolutionOutput('');
        ui.updateAppScale();
        ui.updateViewport();
        ui.applyHintPinState(false, false);
        updateCompletionUI();
        persistence.persistSessionState();
        markDirty(state);
    }

    // Wrapper: accepts either full engineState (has .nav) or flat state (for tests).
    function getRealLength(engineState = state.ENGINE) { return getRealLengthImpl(engineState.nav ?? engineState); }

    // Wrapper: determines level, delegates to runtime/path-state.js, then tracks lastFlipTime.
    function rebuildDerivedPathState(engineState = state.ENGINE) {
        const nav = engineState.nav ?? engineState;
        const oldFlipCount = nav.flipCount;
        const level = engineState.mode === core.PLAY ? engineState.level : engineState.editor?.workingLevel;
        rebuildDerivedState(nav, level);
        if (nav.flipCount !== oldFlipCount) setNavigationLastFlipTime(nav, Date.now());
    }

    function assertStateConsistency(engineState = state.ENGINE) {
        if (!engineState.isDevMode) return;
        const l = engineState.mode === core.PLAY ? engineState.level : engineState.editor.workingLevel;
        if (!l) return;
        const nav = engineState.nav ?? engineState;
        const originalIntersections = nav.intersections;
        const originalCounts        = new Map(nav.visitedCounts);
        rebuildDerivedPathState(engineState);
        if (originalIntersections !== nav.intersections) {
            console.error("Invariant broken: Intersections mismatch.");
        }
        originalCounts.forEach((v, k) => {
            if (nav.visitedCounts.get(k) !== v) console.error("Invariant broken: Visited count mismatch.");
        });
    }

    const PathNavigator = createPathNavigator({
        core,
        getLevel: engineState => engineState.mode === core.PLAY ? engineState.level : engineState.editor.workingLevel,
        setLogicState,
        rebuildDerivedPathState,
        assertStateConsistency
    });

    const { resetEmptyReviewState, loadReviewLevel } =
        createReviewModeController({ state, ui, levelUtils, editor, PathNavigator });

    function setLogicState(newState) {
        if (newState !== core.IDLE && !VALID_LOGIC_TRANSITIONS[state.ENGINE.logicState]?.includes(newState)) {
            console.warn(`Blocked Logic Transition: ${state.ENGINE.logicState} -> ${newState}`);
            return false;
        }
        if (state.ENGINE.logicState === core.EDIT_DRAG && newState !== core.EDIT_DRAG) {
            ui.EditorDragGhost.update({ visible: false });
        }
        setLogicStateValue(state, newState);
        return true;
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

    const overlayController = createOverlayController({ core, state, ui });
    const {
        setOverlayState,
        startHintAnimation,
        stopHintAnimation,
        clearHintPaths,
        pinCurrentHint,
        clearPersistedHint
    } = overlayController;

    const hazardController = createHazardController({ core, state, ui, setOverlayState });
    const { triggerJumpScare, triggerBombDetonation, clearBombTimers } = hazardController;

    const winController = createWinController({ core, state, ui, persistence, setLogicState });
    const { handleWin } = winController;

    const { processStep, pushStepOnNav, truncateNavTo } = createStepDispatcher({
        core, state, themes, levelUtils,
        setLogicState, rebuildDerivedPathState, createSnapshot,
        onJumpScare: triggerJumpScare,
        onBombDetonation: triggerBombDetonation,
        onWin: handleWin,
    });

    const { findTapRoute } = createTapRouter({ core, state, levelUtils });

    const { applyPlayChallengeOptions, showOptionsBlockedModalIfNeeded } =
        createChallengeOptionsController({ core, state, ui, levelUtils });

    const { loop } = createRenderLoop({ core, state, themes, ui, renderer, setOverlayState });

    const { cancelSolver, startSolverRun, endSolverRun, setHintPaths, isRunning } =
        createSolverManager({ state, ui });

    function setVariant(v) {
        setVariantState(state, v);
        ui.updateViewport();
        rebuildDerivedPathState(state.ENGINE);
        markDirty(state);
    }

    function reversePathDirection() {
        reverseNavigationPath(state);
        rebuildDerivedPathState(state.ENGINE);
        markDirty(state);
    }

    // Remaps all packed path/gate keys through mapFn and rebuilds derived state.
    // Used by editor coord-transform operations (rotate, flip, resize).
    function remapNavKeys(mapFn) {
        remapNavigationKeys(state, mapFn);
        rebuildDerivedPathState(state.ENGINE);
        markDirty(state);
    }

    function setMuted(muted) { setMutedState(state, muted); }
    function toggleMute()    { toggleMutedState(state); }

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
        loadLevel(state.ENGINE.levelIdx, true);
    }

    function setReviewSubmissions(subs) { setReviewSubmissionsState(state, subs); }

    function removeReviewSubmission(idx) { removeReviewSubmissionState(state, idx); }

    // Clears review submissions, resets index, then switches to REVIEW mode.
    function initReviewMode() {
        resetReviewSubmissions(state);
        switchMode(core.REVIEW);
    }

    function setPendingAction(fn)      { setRuntimePendingActionState(state, fn); }
    function clearPendingAction()      { clearRuntimePendingActionState(state); }
    function executePendingAction()    { if (state.ENGINE.runtime.pendingAction) state.ENGINE.runtime.pendingAction(); }
    function setOption(key, value)     { setOptionValue(state, key, value); }

    function resetRunState({ keepLevel = true } = {}) {
        PathNavigator.clear(state.ENGINE);
        clearNavigationUndoStack(state);
        setRevealedGeese(state);
        clearRipples(state);

        if (!keepLevel) setLevel(state, null);
        resetFalseGoalHazardsForLevel(state, state.ENGINE.level);
    }

    return {
        loadLevel(levelObjOrIdx, options = {}) {
            if (typeof levelObjOrIdx === 'number') return loadLevel(levelObjOrIdx, !!options.keepVariant);
            const mode = options.mode || state.ENGINE.mode;
            if (mode === core.PLAY) setLevel(state, levelObjOrIdx);
            else setEditorWorkingLevel(state, levelObjOrIdx);
            resetRunState({ keepLevel: true });
        },
        resetRunState,
        handlePrimaryGridInput(k, opts)             { return attemptMoveTo(k, opts); },
        attemptMoveTo(target, opts)                  { return attemptMoveTo(target, opts); },
        processStep(key)                             { return processStep(key); },
        checkWinCondition()                          { return checkWinCondition(); },
        areWinMetricsSatisfied(engineState, level)   { return areWinMetricsSatisfied(engineState, level); },
        wouldCreateBlockedTIntersection(engineState, key, level) { return wouldCreateBlockedTIntersectionImpl(engineState?.nav ?? engineState, key, level); },
        triggerJumpScare()                           { return triggerJumpScare(); },
        triggerBombDetonation(key)                   { return triggerBombDetonation(key); },
        createSnapshot()                             { return createSnapshot(); },
        applySnapshot(snap)                          { return applySnapshot(snap); },
        checkWinConditionImpl: checkWinConditionImplFn,
        getPackedPath()    { return [...(state.ENGINE?.nav?.path || [])]; },
        getIntersections() { return state.ENGINE?.nav?.intersections ?? 0; },
        updatePlayModeLayout,
        loadReviewLevel,
        loop,
        switchMode,
        setLogicState,
        setOverlayState,
        getRealLength,
        rebuildDerivedPathState,
        assertStateConsistency,
        updatePencilState,
        updateCompletionUI,
        PathNavigator,
        startHintAnimation,
        stopHintAnimation,
        cancelSolver,
        startSolverRun,
        endSolverRun,
        setHintPaths,
        setVariant,
        reversePathDirection,
        clearHintPaths,
        pinCurrentHint,
        clearPersistedHint,
        remapNavKeys,
        setMuted,
        toggleMute,
        handleResetAction,
        setReviewSubmissions,
        removeReviewSubmission,
        initReviewMode,
        isRunning,
        setPendingAction,
        clearPendingAction,
        executePendingAction,
        setOption,
        findTapRoute,
    };
}
