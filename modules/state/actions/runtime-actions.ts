// Runtime slice state actions (engineState.runtime.*): pointer/tap tracking, the active
// theme name, and the queued pending action.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';

export function setRuntimeTapStartCoord(stateOrEngine: StateOrEngine, tapStartCoord: { x: number; y: number } | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.tapStartCoord = tapStartCoord;
    return runtime.tapStartCoord;
}

export function setRuntimeTapMoved(stateOrEngine: StateOrEngine, tapMoved: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return false;
    runtime.tapMoved = !!tapMoved;
    return runtime.tapMoved;
}

export function setRuntimeActivePointerId(stateOrEngine: StateOrEngine, activePointerId: number | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.activePointerId = activePointerId;
    return runtime.activePointerId;
}

export function setCurrentThemeName(stateOrEngine: StateOrEngine, name: string) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.currentTheme = name;
    return runtime.currentTheme;
}

export function setRuntimePendingAction(stateOrEngine: StateOrEngine, pendingAction: (() => void) | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.pendingAction = pendingAction;
    return runtime.pendingAction;
}

export function clearRuntimePendingAction(stateOrEngine: StateOrEngine) {
    return setRuntimePendingAction(stateOrEngine, null);
}
