import type { ControllerDeps } from '../state.js';
import {
    clearHintPaths as clearHintPathsState,
    clearPersistedHeatmap as clearPersistedHeatmapState,
    clearPersistedHint as clearPersistedHintState,
    markDirty,
    pinCurrentHeatmap as pinCurrentHeatmapState,
    pinCurrentHint as pinCurrentHintState,
    resetHintAnimationClock,
    setOverlayState as setOverlayStateValue
} from '../state-actions.js';
import { HINT_ANIMATING, OVERLAY_NONE } from '../app-constants.js';

export function createOverlayController({ state, ui }: ControllerDeps) {
    function applyHintPinState(isAnimating: any) {
        const hinter = state.engineState.hinter;
        ui.applyHintPinState(
            isAnimating,
            hinter.persistedPath.length > 0,
            isAnimating && hinter.pathList.length > 1,
            !!hinter.persistedHeatmap
        );
    }

    function setOverlayState(newState: any) {
        if (state.engineState.overlayState === newState) return true;
        if (state.engineState.overlayState === HINT_ANIMATING && newState !== HINT_ANIMATING) {
            resetHintAnimationClock(state, { alpha: 0 });
            applyHintPinState(false);
        }
        setOverlayStateValue(state, newState);
        markDirty(state);
        ui.setSolverAbortRequested(state.engineState.solver.abortRequested);
        ui.applyOverlayState(newState);
        return true;
    }

    function startHintAnimation() {
        if (!state.engineState.hinter.pathList.length) return;
        clearPersistedHintState(state);
        clearPersistedHeatmapState(state);
        setOverlayState(HINT_ANIMATING);
        resetHintAnimationClock(state, { alpha: 1, index: 0 });
        const hinter = state.engineState.hinter;
        const count = hinter.displayIndices?.length || hinter.pathList.length;
        const atLast = hinter.currentPathIdx >= count - 1;
        let msg = `Solution ${hinter.currentPathIdx + 1}/${count}`;
        if (hinter.moreSolutionsSimilar && atLast) msg += ' · other solutions exist, but closely resemble these';
        ui.showMessage(msg, 'success');
        applyHintPinState(true);
    }

    function stopHintAnimation() {
        clearHintPathsState(state, { resetSource: false });
        resetHintAnimationClock(state, { alpha: 0, index: 0 });
        setOverlayState(OVERLAY_NONE);
    }

    function clearHintPaths() {
        clearHintPathsState(state);
        if (state.engineState.overlayState === HINT_ANIMATING) setOverlayState(OVERLAY_NONE);
    }

    function pinCurrentHint() {
        if (!pinCurrentHintState(state)) return;
        setOverlayState(OVERLAY_NONE);
        markDirty(state);
        applyHintPinState(false);
    }

    function clearPersistedHint() {
        clearPersistedHintState(state);
        markDirty(state);
        applyHintPinState(state.engineState.overlayState === HINT_ANIMATING);
    }

    function pinCurrentHeatmap() {
        if (!pinCurrentHeatmapState(state)) return;
        markDirty(state);
        applyHintPinState(state.engineState.overlayState === HINT_ANIMATING);
    }

    function clearPersistedHeatmap() {
        clearPersistedHeatmapState(state);
        markDirty(state);
        applyHintPinState(state.engineState.overlayState === HINT_ANIMATING);
    }

    return {
        setOverlayState,
        startHintAnimation,
        stopHintAnimation,
        clearHintPaths,
        pinCurrentHint,
        clearPersistedHint,
        pinCurrentHeatmap,
        clearPersistedHeatmap
    };
}
