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

export function createOverlayController({ core, state, ui }: ControllerDeps) {
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
        if (state.ENGINE.overlayState === core.HINT_ANIMATING && newState !== core.HINT_ANIMATING) {
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
        setOverlayState(core.HINT_ANIMATING);
        resetHintAnimationClock(state, { alpha: 1, index: 0 });
        ui.showMessage(`Solution ${state.ENGINE.hinter.currentPathIdx + 1}/${state.ENGINE.hinter.pathList.length}`, 'success');
        applyHintPinState(true);
    }

    function stopHintAnimation() {
        clearHintPathsState(state, { resetSource: false });
        resetHintAnimationClock(state, { alpha: 0, index: 0 });
        setOverlayState(core.OVERLAY_NONE);
    }

    function clearHintPaths() {
        clearHintPathsState(state);
        if (state.ENGINE.overlayState === core.HINT_ANIMATING) setOverlayState(core.OVERLAY_NONE);
    }

    function pinCurrentHint() {
        if (!pinCurrentHintState(state)) return;
        setOverlayState(core.OVERLAY_NONE);
        markDirty(state);
        applyHintPinState(false);
    }

    function clearPersistedHint() {
        clearPersistedHintState(state);
        markDirty(state);
        applyHintPinState(state.ENGINE.overlayState === core.HINT_ANIMATING);
    }

    function pinCurrentHeatmap() {
        if (!pinCurrentHeatmapState(state)) return;
        markDirty(state);
        applyHintPinState(state.ENGINE.overlayState === core.HINT_ANIMATING);
    }

    function clearPersistedHeatmap() {
        clearPersistedHeatmapState(state);
        markDirty(state);
        applyHintPinState(state.ENGINE.overlayState === core.HINT_ANIMATING);
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
