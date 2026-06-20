// Runtime slice state actions (engineState.runtime.*): pointer/tap tracking, the active
// theme name, and the queued pending action.
import { resolveEngineState } from './shared.js';

export function setRuntimeTapStartCoord(stateOrEngine, tapStartCoord) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.tapStartCoord = tapStartCoord;
    return runtime.tapStartCoord;
}

export function setRuntimeTapMoved(stateOrEngine, tapMoved) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return false;
    runtime.tapMoved = !!tapMoved;
    return runtime.tapMoved;
}

export function setRuntimeActivePointerId(stateOrEngine, activePointerId) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.activePointerId = activePointerId;
    return runtime.activePointerId;
}

export function setCurrentThemeName(stateOrEngine, name) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.currentTheme = name;
    return runtime.currentTheme;
}

export function setRuntimePendingAction(stateOrEngine, pendingAction) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.pendingAction = pendingAction;
    return runtime.pendingAction;
}

export function clearRuntimePendingAction(stateOrEngine) {
    return setRuntimePendingAction(stateOrEngine, null);
}
