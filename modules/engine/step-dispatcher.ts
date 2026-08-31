import { computeStep, type StepEvent } from '../runtime/step-processor.js';
import { GameEventType } from '../runtime/actions.js';
import { runEffects } from '../runtime/effect-runner.js';
import { MoveContext } from '../domain/move-context.js';
import { UNPACK } from '../domain/cell-key.js';
import { isValidMove } from '../domain/move-rules.js';
import { getPortalDisplayColor, resolvePortal } from '../domain/portal-utils.js';
import { areWinMetricsSatisfied as areWinMetricsSatisfiedImpl,
         checkWinConditionImpl } from '../runtime/game-rules.js';
import { wouldCreateBlockedTIntersection as wouldCreateBlockedTIntersectionImpl,
         pushStep as pushStepImpl } from '../runtime/path-state.js';
import { addRipple, markDirty, setEditorModified,
         setNavigationLastFlipTime, truncateNavigationPath } from '../state-actions.js';
import { DRAGGING, EDITOR, HAZARD_TRIGGERED, IDLE, PLAY, PORTAL_PAUSE, REVIEW } from '../app-constants.js';

/**
 * Creates the step-processing pipeline: low-level nav helpers used inside
 * computeStep, the event dispatcher for step outcomes, and processStep itself.
 *
 * @param {{
 *   audioService: object,
 *   state: object,
 *   themes: object,
 *   setLogicState: Function,
 *   rebuildDerivedPathState: Function,
 *   createSnapshot: Function,
 *   onJumpScare: Function,
 *   onFalseGoalDetonation: Function,
 *   onWin: Function,
 * }} deps
 */
export function createStepDispatcher({
    state, themes, audioService,
    setLogicState, rebuildDerivedPathState, createSnapshot,
    onJumpScare, onFalseGoalDetonation, onWin,
}: any) {
    // Low-level nav mutator used inside computeStep callbacks.
    // Unlike PathNavigator.pushStep it does not set isDirty or assert consistency,
    // because processStep handles those at the outer level.
    const pushStepOnNav = (nav: any, key: any, isJump: any, level: any) => {
        const oldFlipCount = nav.flipCount;
        pushStepImpl(nav, key, isJump, level);
        if (nav.flipCount !== oldFlipCount) setNavigationLastFlipTime(nav, Date.now());
    };

    // Truncates nav path to targetLen and resets logic state if mid-gesture.
    // Used by computeStep when backtracking.
    const truncateNavTo = (nav: any, targetLen: any) => {
        if (!truncateNavigationPath(nav, targetLen)) return;
        if ([DRAGGING, PORTAL_PAUSE, HAZARD_TRIGGERED].includes(state.engineState.logicState)) {
            setLogicState(IDLE);
        }
        rebuildDerivedPathState(state.engineState);
    };

    // Stable helpers object passed into computeStep on every call.
    // portalThemeColor is refreshed per-step since the theme can change between levels.
    const stepHelpers = {
        isValidMove:                    (k: any, s: any, l: any, ctx: any) => isValidMove(k, s, l, ctx),
        // The pure step port hands a live nav slice; the impl widens it to TapRouteState
        // (it tolerates the missing fields — see runtime/path-state). Bridge it here, at the
        // adapter boundary, so step-processor's port stays honestly typed to what it provides.
        wouldCreateBlockedTIntersection: (s: any, k: any, l: any) => wouldCreateBlockedTIntersectionImpl(s, k, l),
        resolvePortal:                  (l: any, k: any) => resolvePortal(l, k),
        areWinMetricsSatisfied:         areWinMetricsSatisfiedImpl,
        getPortalDisplayColor:          (l: any, k: any, c: any) => getPortalDisplayColor(l, k, c),
        UNPACK,
        pushStepOnNav,
        truncateNavTo,
        createNavSnapshot:              createSnapshot,
        checkWinCondition:              (nav: any, level: any, mode: any, logicState: any) =>
            checkWinConditionImpl(nav.path, level, mode, logicState, nav.isPortalJump, nav.visitedCounts, nav.intersections, nav.turnsAtMap),
        MoveContext,
        HAZARD_TRIGGERED,
        PORTAL_PAUSE,
        EDITOR,
        REVIEW,
        portalThemeColor:               '#d946ef',
    };

    const stepEffectAdapters = {
        playSound:          (note: any, dur: any) => audioService.play(note, dur),
        showGooseJumpScare: ()          => onJumpScare(),
        showFalseGoalDetonation: (fx: any)   => onFalseGoalDetonation(fx.key),
    };

    function dispatchStepEvent(event: StepEvent) {
        if (event.type === GameEventType.LOGIC_STATE_CHANGE) { setLogicState(event.value); return; }
        if (event.type === GameEventType.WIN)                { onWin(); return; }
        runEffects([event], stepEffectAdapters);
    }

    function processStep(key: any) {
        const activeLevel = state.engineState.mode === PLAY
            ? state.engineState.level
            : state.engineState.editor.workingLevel;
        stepHelpers.portalThemeColor = themes.THEMES[themes.getCurrentTheme()]?.colors?.portal || '#d946ef';
        const { outcome, events, mutations } = computeStep(
            state.engineState.nav, state.engineState.hazards, state.engineState.mode,
            state.engineState.logicState, activeLevel, key, stepHelpers
        );
        if (outcome !== null) {
            markDirty(state);
            if (state.engineState.mode === EDITOR) setEditorModified(state, true);
        }
        const now = Date.now();
        for (const { x, y, color } of mutations.ripples) {
            addRipple(state, { x, y, startTime: now, color });
        }
        for (const event of events) dispatchStepEvent(event);
        return outcome === 'backtrack' ? 'valid' : outcome;
    }

    return { processStep, pushStepOnNav, truncateNavTo, stepHelpers };
}
