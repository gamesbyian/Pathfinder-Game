import { activeLevel, type RequireDeps } from './state.js';
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
    setOrientation as setOrientationState,
    toggleMuted as toggleMutedState,
} from './state-actions.js';
import { DRAGGING, EDITOR, EDIT_DRAG, IDLE, PORTAL_PAUSE, REVIEW } from './app-constants.js';

// Declarative grouped-facade membership: the single source of truth for which flat engine
// methods each narrow namespace (game/navigation/overlays/hints/solver/review/ratings) exposes.
// A group is either an array of flat method names (exposed unchanged) or an object mapping an
// exposed name → its flat method name (for the ratings renames). buildGroupedFacade() projects
// these straight off the flat `api`, so the grouped and flat surfaces are the same references by
// construction — they cannot drift, and the membership lives in exactly one place (this map, which
// the facade test imports rather than re-declaring). See
// docs/refactor-notes/2026-06-20-app-architecture-refactor.md (#3) and review-plan #8.
export const ENGINE_FACADE_GROUPS: Record<string, string[] | Record<string, string>> = {
    game: ['loadLevel', 'resetRunState', 'processStep', 'checkWinCondition', 'areWinMetricsSatisfied',
        'wouldCreateBlockedTIntersection', 'attemptMoveTo', 'handlePrimaryGridInput', 'createSnapshot',
        'applySnapshot', 'getRealLength', 'getPackedPath', 'getIntersections', 'rebuildDerivedPathState',
        'assertStateConsistency'],
    navigation: ['PathNavigator', 'reversePathDirection', 'remapNavKeys', 'findTapRoute', 'setOrientation'],
    overlays: ['setOverlayState', 'startHintAnimation', 'stopHintAnimation'],
    hints: ['setHintPaths', 'clearHintPaths', 'pinCurrentHint', 'clearPersistedHint', 'pinCurrentHeatmap',
        'clearPersistedHeatmap'],
    solver: ['cancelSolver', 'startSolverRun', 'endSolverRun', 'isRunning'],
    review: ['initReviewMode', 'loadReviewLevel', 'setReviewSubmissions', 'removeReviewSubmission', 'removeAndAdvance'],
    ratings: {
        refreshLevelRatingPane: 'refreshLevelRatingPane',
        toggleTag:              'toggleLevelRatingTag',
        addCustomTag:           'addLevelRatingCustomTag',
        removeCustomTag:        'removeLevelRatingCustomTag',
        setScale:               'setLevelRatingScale',
    },
};

/** Build the grouped namespaces by projecting ENGINE_FACADE_GROUPS off the flat `api`. */
export function buildGroupedFacade(api: Record<string, any>): Record<string, Record<string, any>> {
    const grouped: Record<string, Record<string, any>> = {};
    for (const [group, spec] of Object.entries(ENGINE_FACADE_GROUPS)) {
        const ns: Record<string, any> = {};
        const entries = Array.isArray(spec)
            ? spec.map((name) => [name, name] as const)
            : Object.entries(spec);
        for (const [exposed, flat] of entries) ns[exposed] = api[flat];
        grouped[group] = ns;
    }
    return grouped;
}

export function createEngine({ state, ui, renderer, levelUtils, themes, data, persistence, editor, audioService, reportError }: RequireDeps<'levelUtils' | 'data'>) {

    // Wrapper: resolves level from state; pure logic is in runtime/game-rules.js.
    // Accepts either full engineState (with .nav sub-object) or a flat state (for tests).
    function areWinMetricsSatisfied(engineState: any = state.ENGINE, level: any) {
        const lvl = level !== undefined ? level : activeLevel(engineState);
        return areWinMetricsSatisfiedImpl(engineState.nav ?? engineState, lvl);
    }

    // Generates packed cell keys for a straight horizontal or vertical path segment.
    // Used only by attemptMoveTo for continuous pointer drag.
    const buildStraightPathSteps = (headPos: any, target: any) => {
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

    function attemptMoveTo(target: any, _opts: any = {}) {
        if ((state.ENGINE.mode === EDITOR || state.ENGINE.mode === REVIEW) && !state.ENGINE.editor.isPencilMode) return;
        if (!state.ENGINE.nav.path.length) return;
        const headPos = levelUtils.UNPACK(state.ENGINE.nav.path[state.ENGINE.nav.path.length - 1]);
        if (state.ENGINE.logicState === PORTAL_PAUSE) {
            if (target.x !== headPos.x || target.y !== headPos.y) setLogicState(DRAGGING);
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
        if (!state.ENGINE.level) return;
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

    function applySnapshot(snap: any) {
        // State restoration lives in PathNavigator.applySnapshot (unit-testable without booting);
        // engine adds only the UI message-clear side effect.
        PathNavigator.applySnapshot(state.ENGINE, snap);
        ui.showMessage('', '');
    }

    // Wrapper: accepts either full engineState (has .nav) or flat state (for tests).
    function getRealLength(engineState: any = state.ENGINE) { return getRealLengthImpl(engineState.nav ?? engineState); }

    // Wrapper: determines level, delegates to runtime/path-state.js, then tracks lastFlipTime.
    function rebuildDerivedPathState(engineState: any = state.ENGINE) {
        const nav = engineState.nav ?? engineState;
        const oldFlipCount = nav.flipCount;
        const level = activeLevel(engineState);
        rebuildDerivedState(nav, level);
        if (nav.flipCount !== oldFlipCount) setNavigationLastFlipTime(nav, Date.now());
    }

    function assertStateConsistency(engineState: any = state.ENGINE) {
        if (!engineState.isDevMode) return;
        const l = activeLevel(engineState);
        if (!l) return;
        const nav = engineState.nav ?? engineState;
        const originalIntersections = nav.intersections;
        const originalCounts        = new Map(nav.visitedCounts);
        rebuildDerivedPathState(engineState);
        if (originalIntersections !== nav.intersections) {
            console.error('Invariant broken: Intersections mismatch.');
        }
        originalCounts.forEach((v: any, k: any) => {
            if (nav.visitedCounts.get(k) !== v) console.error('Invariant broken: Visited count mismatch.');
        });
    }

    function setLogicState(newState: any) {
        if (newState !== IDLE && !VALID_LOGIC_TRANSITIONS[state.ENGINE.logicState]?.includes(newState)) {
            console.warn(`Blocked Logic Transition: ${state.ENGINE.logicState} -> ${newState}`);
            return false;
        }
        if (state.ENGINE.logicState === EDIT_DRAG && newState !== EDIT_DRAG) {
            ui.EditorDragGhost.update({ visible: false });
        }
        setLogicStateValue(state, newState);
        return true;
    }

    // --- Controller instantiation chain ---

    const PathNavigator = createPathNavigator({
        getLevel: (engineState: any) => activeLevel(engineState),
        setLogicState,
        rebuildDerivedPathState,
        assertStateConsistency
    });

    const levelRatingManager = createLevelRatingManager({ state, ui, data, levelUtils, persistence, reportError });
    const { refreshForCurrentLevel: refreshLevelRatingPane } = levelRatingManager;

    const { resetEmptyReviewState, loadReviewLevel, setReviewSubmissions, removeReviewSubmission, removeAndAdvance } =
        createReviewModeController({ state, ui, levelUtils, editor, PathNavigator, refreshLevelRatingPane });

    const overlayController = createOverlayController({ state, ui });
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

    const hazardController = createHazardController({ state, ui, setOverlayState, audioService });
    const { triggerJumpScare, triggerFalseGoalDetonation, clearFalseGoalTimers } = hazardController;

    const winController = createWinController({ state, ui, data, persistence, reportError, setLogicState, audioService });
    const { handleWin } = winController;

    const { processStep } = createStepDispatcher({
        state, themes, levelUtils, audioService,
        setLogicState, rebuildDerivedPathState, createSnapshot,
        onJumpScare: triggerJumpScare,
        onFalseGoalDetonation: triggerFalseGoalDetonation,
        onWin: handleWin,
    });

    const { findTapRoute } = createTapRouter({ state, levelUtils });

    const { applyPlayChallengeOptions, showOptionsBlockedModalIfNeeded } =
        createChallengeOptionsController({ state, ui, levelUtils });

    const { loop } = createRenderLoop({ state, themes, ui, renderer, setOverlayState });

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
        state, ui, data, levelUtils, persistence, editor, audioService, reportError,
        PathNavigator,
        clearFalseGoalTimers,
        applyPlayChallengeOptions, showOptionsBlockedModalIfNeeded,
        resetEmptyReviewState,
        setLogicState, setOverlayState,
        refreshLevelRatingPane,
    });

    // --- Thin wrappers over state-actions ---

    function setOrientation(v: any) {
        setOrientationState(state, v);
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
    function remapNavKeys(mapFn: any) {
        remapNavigationKeys(state, mapFn);
        rebuildDerivedPathState(state.ENGINE);
        markDirty(state);
    }

    function setMuted(muted: any)  { setMutedState(state, muted); }
    function toggleMute()     { toggleMutedState(state); }
    function setPendingAction(fn: any)   { setRuntimePendingActionState(state, fn); }
    function clearPendingAction()   { clearRuntimePendingActionState(state); }
    function executePendingAction() { if (state.ENGINE.runtime.pendingAction) state.ENGINE.runtime.pendingAction(); }
    function setOption(key: any, value: any)  { setOptionValue(state, key, value); }

    const api = {
        loadLevel,
        resetRunState,
        handlePrimaryGridInput(k: any, opts: any)             { return attemptMoveTo(k, opts); },
        attemptMoveTo(target: any, opts: any)                  { return attemptMoveTo(target, opts); },
        processStep(key: any)                             { return processStep(key); },
        checkWinCondition()                          { return checkWinCondition(); },
        areWinMetricsSatisfied(engineState: any, level: any)   { return areWinMetricsSatisfied(engineState, level); },
        wouldCreateBlockedTIntersection(engineState: any, key: any, level: any) { return wouldCreateBlockedTIntersectionImpl(engineState?.nav ?? engineState, key, level); },
        triggerJumpScare()                           { return triggerJumpScare(); },
        triggerFalseGoalDetonation(key: any)               { return triggerFalseGoalDetonation(key); },
        createSnapshot()                             { return createSnapshot(); },
        applySnapshot(snap: any)                          { return applySnapshot(snap); },
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
        setOrientation,
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
        removeAndAdvance,
        initReviewMode,
        isRunning,
        setPendingAction,
        clearPendingAction,
        executePendingAction,
        setOption,
        findTapRoute,
        refreshLevelRatingPane,
        toggleLevelRatingTag(tag: any)          { return levelRatingManager.toggleTag(tag); },
        addLevelRatingCustomTag(tag: any)       { return levelRatingManager.addCustomTag(tag); },
        removeLevelRatingCustomTag(tag: any)    { return levelRatingManager.removeCustomTag(tag); },
        setLevelRatingScale(scale: any, value: any)  { return levelRatingManager.setScale(scale, value); },
    };

    // Grouped facade (migration target). The flat methods above remain the backward-compatible
    // surface; these namespaces let callers depend on a narrow slice of engine behavior instead of
    // the whole god-object. The grouped entries are projected off the flat `api` by
    // buildGroupedFacade() from the ENGINE_FACADE_GROUPS map above, so the two surfaces are the same
    // references by construction and can never drift. Migrate callers group-by-group; the flat
    // surface stays because cross-cutting methods (setLogicState/switchMode/setOption/loop/…) have no
    // grouped home and are still consumed flat. See review-plan #8.
    return Object.assign(api, buildGroupedFacade(api));
}
