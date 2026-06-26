// Runtime slice state actions (engineState.runtime.*): pointer/tap tracking, the active
// theme name, and the queued pending action.
import { resolveEngineState } from './shared.js';

export function setRuntimeTapStartCoord(stateOrEngine: any, tapStartCoord: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.tapStartCoord = tapStartCoord;
    return runtime.tapStartCoord;
}

export function setRuntimeTapMoved(stateOrEngine: any, tapMoved: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return false;
    runtime.tapMoved = !!tapMoved;
    return runtime.tapMoved;
}

export function setRuntimeActivePointerId(stateOrEngine: any, activePointerId: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.activePointerId = activePointerId;
    return runtime.activePointerId;
}

export function setCurrentThemeName(stateOrEngine: any, name: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.currentTheme = name;
    return runtime.currentTheme;
}

export function setRuntimePendingAction(stateOrEngine: any, pendingAction: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.pendingAction = pendingAction;
    return runtime.pendingAction;
}

export function clearRuntimePendingAction(stateOrEngine: any) {
    return setRuntimePendingAction(stateOrEngine, null);
}
