import {
    clearHintPaths as clearHintPathsState,
    clearPersistedHint as clearPersistedHintState,
    markDirty,
    pinCurrentHint as pinCurrentHintState,
    resetHintAnimationClock,
    setOverlayState as setOverlayStateValue
} from '../state-actions.js';

export function createOverlayController({ core, state, ui }) {
    function setOverlayState(newState) {
        if (state.ENGINE.overlayState === newState) return true;
        if (state.ENGINE.overlayState === core.HINT_ANIMATING && newState !== core.HINT_ANIMATING) {
            resetHintAnimationClock(state, { alpha: 0 });
            ui.applyHintPinState(false, state.ENGINE.hinter.persistedPath.length > 0);
        }
        setOverlayStateValue(state, newState);
        markDirty(state);
        ui.setSolverAbortRequested(state.ENGINE.solver.abortRequested);
        ui.applyOverlayState(newState);
        return true;
    }

    function startHintAnimation() {
        if (!state.ENGINE.hinter.pathList.length) return;
        setOverlayState(core.HINT_ANIMATING);
        resetHintAnimationClock(state, { alpha: 1, index: 0 });
        ui.showMessage(`Solution ${state.ENGINE.hinter.currentPathIdx + 1}/${state.ENGINE.hinter.pathList.length}`, 'text-emerald-600');
        ui.applyHintPinState(true, state.ENGINE.hinter.persistedPath.length > 0);
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
        ui.applyHintPinState(false, true);
    }

    function clearPersistedHint() {
        clearPersistedHintState(state);
        markDirty(state);
        ui.applyHintPinState(state.ENGINE.overlayState === core.HINT_ANIMATING, false);
    }

    return {
        setOverlayState,
        startHintAnimation,
        stopHintAnimation,
        clearHintPaths,
        pinCurrentHint,
        clearPersistedHint
    };
}
