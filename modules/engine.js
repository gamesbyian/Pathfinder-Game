import { getRealLength as getRealLengthImpl,
         areWinMetricsSatisfied as areWinMetricsSatisfiedImpl,
         checkWinConditionImpl as checkWinConditionImplFn } from './runtime/game-rules.js';
import { VALID_LOGIC_TRANSITIONS } from './runtime/state-machine.js';
import { rebuildDerivedState,
         wouldCreateBlockedTIntersection as wouldCreateBlockedTIntersectionImpl } from './runtime/path-state.js';
import { createChallengeOptionsController } from './engine/challenge-options.js';
import { createHazardController }           from './engine/hazard-controller.js';
import { createLevelFlowController }        from './engine/level-flow.js';
import { createLevelRatingManager }         from './engine/level-rating-manager.js';
import { createOverlayController }          from './engine/overlay-controller.js';
import { createPathNavigator }              from './engine/path-navigator.js';
import { createRenderLoop }                 from './engine/render-loop.js';
import { createReviewModeController }       from './engine/review-mode.js';
import { createSolverManager }              from './engine/solver-manager.js';
import { createStepDispatcher }             from './engine/step-dispatcher.js';
import { createTapRouter }                  from './engine/tap-router.js';
import { createWinController }              from './engine/win-controller.js';
import {
    markDirty,
    remapNavigationKeys,
    reverseNavigationPath,
    clearRuntimePendingAction as clearRuntimePendingActionState,
    setLogicState as setLogicStateValue,
    setMuted as setMutedState,
    setNavigationLastFlipTime,
    setOptionValue,
    setRuntimePendingAction as setRuntimePendingActionState,
    setVariant as setVariantState,
    toggleMuted as toggleMutedState,
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

    function attemptMoveTo(target, _opts = {}) {
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
                state.ENGINE.nav.isPortalJump, state.ENGINE.nav.visitedCounts, state.ENGINE.nav.intersections,
                state.ENGINE.nav.turnsAtMap)) {
            handleWin();
        }
    }

    function createSnapshot() {
        // Undo snapshot. Note the deliberate hazard asymmetry: detonatedFalseGoals IS captured
        // (so undoing past a detonation re-arms that false goal — it's a conditional trap that
        // must be able to fire again), but revealedGeese is intentionally NOT — a goose, once
        // discovered, stays visible across undo so the player isn't sent blindly back into a
        // known hazard. Geese are reset only on level (re)load, not by undo.
        return {
            path:                [...state.ENGINE.nav.path],
            isPortalJump:        new Set(state.ENGINE.nav.isPortalJump),
            activeGateKey:       state.ENGINE.nav.activeGateKey,
            logicState:          state.ENGINE.logicState,
            detonatedFalseGoals: new Set(state.ENGINE.hazards.detonatedFalseGoals)
        };
    }

    function applySnapshot(snap) {
        // State restoration lives in PathNavigator.applySnapshot (unit-testable without booting);
        // engine adds only the UI message-clear side effect.
        PathNavigator.applySnapshot(state.ENGINE, snap);
        ui.showMessage('', '');
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
            console.error('Invariant broken: Intersections mismatch.');
        }
        originalCounts.forEach((v, k) => {
            if (nav.visitedCounts.get(k) !== v) console.error('Invariant broken: Visited count mismatch.');
        });
    }

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

    // --- Controller instantiation chain ---

    const PathNavigator = createPathNavigator({
        core,
        getLevel: engineState => engineState.mode === core.PLAY ? engineState.level : engineState.editor.workingLevel,
        setLogicState,
        rebuildDerivedPathState,
        assertStateConsistency
    });

    const levelRatingManager = createLevelRatingManager({ core, state, ui, data, levelUtils, persistence });
    const { refreshForCurrentLevel: refreshLevelRatingPane } = levelRatingManager;

    const { resetEmptyReviewState, loadReviewLevel, setReviewSubmissions, removeReviewSubmission } =
        createReviewModeController({ state, ui, levelUtils, editor, PathNavigator, refreshLevelRatingPane });

    const overlayController = createOverlayController({ core, state, ui });
    const {
        setOverlayState,
        startHintAnimation,
        stopHintAnimation,
        clearHintPaths,
        pinCurrentHint,
        clearPersistedHint,
        pinCurrentHeatmap,
        clearPersistedHeatmap
    } = overlayController;

    const hazardController = createHazardController({ core, state, ui, setOverlayState });
    const { triggerJumpScare, triggerBombDetonation, clearBombTimers } = hazardController;

    const winController = createWinController({ core, state, ui, persistence, setLogicState });
    const { handleWin } = winController;

    const { processStep } = createStepDispatcher({
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

    const {
        loadLevel,
        switchMode,
        handleResetAction,
        initReviewMode,
        resetRunState,
        updatePencilState,
        updatePlayModeLayout,
        updateCompletionUI,
    } = createLevelFlowController({
        core, state, ui, data, levelUtils, persistence, editor,
        PathNavigator,
        clearBombTimers,
        applyPlayChallengeOptions, showOptionsBlockedModalIfNeeded,
        resetEmptyReviewState,
        setLogicState, setOverlayState,
        refreshLevelRatingPane,
    });

    // --- Thin wrappers over state-actions ---

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

    function setMuted(muted)  { setMutedState(state, muted); }
    function toggleMute()     { toggleMutedState(state); }
    function setPendingAction(fn)   { setRuntimePendingActionState(state, fn); }
    function clearPendingAction()   { clearRuntimePendingActionState(state); }
    function executePendingAction() { if (state.ENGINE.runtime.pendingAction) state.ENGINE.runtime.pendingAction(); }
    function setOption(key, value)  { setOptionValue(state, key, value); }

    const api = {
        loadLevel,
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
        pinCurrentHeatmap,
        clearPersistedHeatmap,
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
        refreshLevelRatingPane,
        toggleLevelRatingTag(tag)          { return levelRatingManager.toggleTag(tag); },
        addLevelRatingCustomTag(tag)       { return levelRatingManager.addCustomTag(tag); },
        removeLevelRatingCustomTag(tag)    { return levelRatingManager.removeCustomTag(tag); },
        setLevelRatingScale(scale, value)  { return levelRatingManager.setScale(scale, value); },
    };

    // Grouped facade (migration target). The flat methods above remain the backward-
    // compatible surface; these namespaces let callers depend on a narrow slice of engine
    // behavior instead of the whole god-object. Each entry references the same flat method,
    // so the two surfaces never drift. Migrate callers group-by-group, then thin the flat
    // surface. See docs/refactor-notes/2026-06-20-app-architecture-refactor.md (#3).
    return Object.assign(api, {
        game: {
            loadLevel:                      api.loadLevel,
            resetRunState:                  api.resetRunState,
            processStep:                    api.processStep,
            checkWinCondition:              api.checkWinCondition,
            areWinMetricsSatisfied:         api.areWinMetricsSatisfied,
            wouldCreateBlockedTIntersection: api.wouldCreateBlockedTIntersection,
            attemptMoveTo:                  api.attemptMoveTo,
            handlePrimaryGridInput:         api.handlePrimaryGridInput,
            createSnapshot:                 api.createSnapshot,
            applySnapshot:                  api.applySnapshot,
            getRealLength:                  api.getRealLength,
            getPackedPath:                  api.getPackedPath,
            getIntersections:               api.getIntersections,
            rebuildDerivedPathState:        api.rebuildDerivedPathState,
            assertStateConsistency:         api.assertStateConsistency,
        },
        navigation: {
            PathNavigator:        api.PathNavigator,
            reversePathDirection: api.reversePathDirection,
            remapNavKeys:         api.remapNavKeys,
            findTapRoute:         api.findTapRoute,
            setVariant:           api.setVariant,
        },
        overlays: {
            setOverlayState:     api.setOverlayState,
            startHintAnimation:  api.startHintAnimation,
            stopHintAnimation:   api.stopHintAnimation,
        },
        hints: {
            setHintPaths:         api.setHintPaths,
            clearHintPaths:       api.clearHintPaths,
            pinCurrentHint:       api.pinCurrentHint,
            clearPersistedHint:   api.clearPersistedHint,
            pinCurrentHeatmap:    api.pinCurrentHeatmap,
            clearPersistedHeatmap: api.clearPersistedHeatmap,
        },
        solver: {
            cancelSolver:  api.cancelSolver,
            startSolverRun: api.startSolverRun,
            endSolverRun:  api.endSolverRun,
            isRunning:     api.isRunning,
        },
        review: {
            initReviewMode:        api.initReviewMode,
            loadReviewLevel:       api.loadReviewLevel,
            setReviewSubmissions:  api.setReviewSubmissions,
            removeReviewSubmission: api.removeReviewSubmission,
        },
        ratings: {
            refreshLevelRatingPane: api.refreshLevelRatingPane,
            toggleTag:              api.toggleLevelRatingTag,
            addCustomTag:           api.addLevelRatingCustomTag,
            removeCustomTag:        api.removeLevelRatingCustomTag,
            setScale:               api.setLevelRatingScale,
        },
    });
}
