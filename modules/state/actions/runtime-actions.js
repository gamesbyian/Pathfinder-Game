// @ts-check
// Runtime slice state actions (engineState.runtime.*): pointer/tap tracking, the active
// theme name, and the queued pending action.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} tapStartCoord @returns {any} */
export function setRuntimeTapStartCoord(stateOrEngine, tapStartCoord) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.tapStartCoord = tapStartCoord;
    return runtime.tapStartCoord;
}

/** @param {any} stateOrEngine @param {any} tapMoved @returns {any} */
export function setRuntimeTapMoved(stateOrEngine, tapMoved) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return false;
    runtime.tapMoved = !!tapMoved;
    return runtime.tapMoved;
}

/** @param {any} stateOrEngine @param {any} activePointerId @returns {any} */
export function setRuntimeActivePointerId(stateOrEngine, activePointerId) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.activePointerId = activePointerId;
    return runtime.activePointerId;
}

/** @param {any} stateOrEngine @param {any} name @returns {any} */
export function setCurrentThemeName(stateOrEngine, name) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.currentTheme = name;
    return runtime.currentTheme;
}

/** @param {any} stateOrEngine @param {any} pendingAction @returns {any} */
export function setRuntimePendingAction(stateOrEngine, pendingAction) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.pendingAction = pendingAction;
    return runtime.pendingAction;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearRuntimePendingAction(stateOrEngine) {
    return setRuntimePendingAction(stateOrEngine, null);
}
