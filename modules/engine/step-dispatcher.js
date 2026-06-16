import { computeStep } from '../runtime/step-processor.js';
import { ActionType } from '../runtime/actions.js';
import { runEffects } from '../runtime/effect-runner.js';
import { MoveContext } from '../domain/move-context.js';
import { areWinMetricsSatisfied as areWinMetricsSatisfiedImpl,
         checkWinConditionImpl } from '../runtime/game-rules.js';
import { wouldCreateBlockedTIntersection,
         pushStep as pushStepImpl } from '../runtime/path-state.js';
import { addRipple, markDirty, setEditorModified,
         setNavigationLastFlipTime, truncateNavigationPath } from '../state-actions.js';

/**
 * Creates the step-processing pipeline: low-level nav helpers used inside
 * computeStep, the event dispatcher for step outcomes, and processStep itself.
 *
 * @param {{
 *   core: object,
 *   state: object,
 *   themes: object,
 *   levelUtils: object,
 *   setLogicState: Function,
 *   rebuildDerivedPathState: Function,
 *   createSnapshot: Function,
 *   onJumpScare: Function,
 *   onBombDetonation: Function,
 *   onWin: Function,
 * }} deps
 */
export function createStepDispatcher({
    core, state, themes, levelUtils,
    setLogicState, rebuildDerivedPathState, createSnapshot,
    onJumpScare, onBombDetonation, onWin,
}) {
    // Low-level nav mutator used inside computeStep callbacks.
    // Unlike PathNavigator.pushStep it does not set isDirty or assert consistency,
    // because processStep handles those at the outer level.
    const pushStepOnNav = (nav, key, isJump, level) => {
        const oldFlipCount = nav.flipCount;
        pushStepImpl(nav, key, isJump, level);
        if (nav.flipCount !== oldFlipCount) setNavigationLastFlipTime(nav, Date.now());
    };

    // Truncates nav path to targetLen and resets logic state if mid-gesture.
    // Used by computeStep when backtracking.
    const truncateNavTo = (nav, targetLen) => {
        if (!truncateNavigationPath(nav, targetLen)) return;
        if ([core.DRAGGING, core.PORTAL_PAUSE, core.HAZARD_TRIGGERED].includes(state.ENGINE.logicState)) {
            setLogicState(core.IDLE);
        }
        rebuildDerivedPathState(state.ENGINE);
    };

    // Stable helpers object passed into computeStep on every call.
    // portalThemeColor is refreshed per-step since the theme can change between levels.
    const stepHelpers = {
        isValidMove:                    (k, s, l, ctx) => levelUtils.isValidMove(k, s, l, ctx),
        wouldCreateBlockedTIntersection,
        resolvePortal:                  (l, k) => levelUtils.resolvePortal(l, k),
        areWinMetricsSatisfied:         areWinMetricsSatisfiedImpl,
        getPortalDisplayColor:          (l, k, c) => levelUtils.getPortalDisplayColor(l, k, c),
        UNPACK:                         levelUtils.UNPACK,
        pushStepOnNav,
        truncateNavTo,
        createNavSnapshot:              createSnapshot,
        checkWinCondition:              (nav, level, mode, logicState) =>
            checkWinConditionImpl(nav.path, level, mode, logicState, nav.isPortalJump, nav.visitedCounts, nav.intersections),
        MoveContext,
        HAZARD_TRIGGERED:               core.HAZARD_TRIGGERED,
        PORTAL_PAUSE:                   core.PORTAL_PAUSE,
        EDITOR:                         core.EDITOR,
        REVIEW:                         core.REVIEW,
        portalThemeColor:               '#d946ef',
    };

    const stepEffectAdapters = {
        playSound:          (note, dur) => core.SOUND_BUS.play(note, dur),
        showGooseJumpScare: ()          => onJumpScare(),
        showBombDetonation: (fx)        => onBombDetonation(fx.key),
    };

    function dispatchStepEvent(event) {
        if (event.type === ActionType.LOGIC_STATE_CHANGE) { setLogicState(event.value); return; }
        if (event.type === ActionType.WIN)                { onWin(); return; }
        runEffects([event], stepEffectAdapters);
    }

    function processStep(key) {
        const activeLevel = state.ENGINE.mode === core.PLAY
            ? state.ENGINE.level
            : state.ENGINE.editor.workingLevel;
        stepHelpers.portalThemeColor = themes.THEMES[themes.getCurrentTheme()]?.colors?.portal || '#d946ef';
        const { outcome, events, mutations } = computeStep(
            state.ENGINE.nav, state.ENGINE.hazards, state.ENGINE.mode,
            state.ENGINE.logicState, activeLevel, key, stepHelpers
        );
        if (outcome !== null) {
            markDirty(state);
            if (state.ENGINE.mode === core.EDITOR) setEditorModified(state, true);
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
