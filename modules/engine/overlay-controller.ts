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
        const hinter = state.ENGINE.hinter;
        ui.applyHintPinState(
            isAnimating,
            hinter.persistedPath.length > 0,
            isAnimating && hinter.pathList.length > 1,
            !!hinter.persistedHeatmap
        );
    }

    function setOverlayState(newState: any) {
        if (state.ENGINE.overlayState === newState) return true;
        if (state.ENGINE.overlayState === HINT_ANIMATING && newState !== HINT_ANIMATING) {
            resetHintAnimationClock(state, { alpha: 0 });
            applyHintPinState(false);
        }
        setOverlayStateValue(state, newState);
        markDirty(state);
        ui.setSolverAbortRequested(state.ENGINE.solver.abortRequested);
        ui.applyOverlayState(newState);
        return true;
    }

    function startHintAnimation() {
        if (!state.ENGINE.hinter.pathList.length) return;
        clearPersistedHintState(state);
        clearPersistedHeatmapState(state);
        setOverlayState(HINT_ANIMATING);
        resetHintAnimationClock(state, { alpha: 1, index: 0 });
        const hinter = state.ENGINE.hinter;
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
        if (state.ENGINE.overlayState === HINT_ANIMATING) setOverlayState(OVERLAY_NONE);
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
        applyHintPinState(state.ENGINE.overlayState === HINT_ANIMATING);
    }

    function pinCurrentHeatmap() {
        if (!pinCurrentHeatmapState(state)) return;
        markDirty(state);
        applyHintPinState(state.ENGINE.overlayState === HINT_ANIMATING);
    }

    function clearPersistedHeatmap() {
        clearPersistedHeatmapState(state);
        markDirty(state);
        applyHintPinState(state.ENGINE.overlayState === HINT_ANIMATING);
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
