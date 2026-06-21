// @ts-check
// Navigation slice state actions (engineState.nav.*): the in-progress path, portal-jump
// set, active gate, undo stack, and flip-count animation bookkeeping.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} [snapshot] @returns {any} */
export function setNavigationSnapshot(stateOrEngine, snapshot = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return null;
    nav.path = [...(snapshot.path || [])];
    nav.isPortalJump = new Set(snapshot.isPortalJump || []);
    nav.activeGateKey = snapshot.activeGateKey ?? null;
    return nav;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearNavigation(stateOrEngine) {
    return setNavigationSnapshot(stateOrEngine, {
        path: [],
        isPortalJump: [],
        activeGateKey: null
    });
}

/** @param {any} stateOrEngine @param {any} targetIdx @returns {any} */
export function truncateNavigationPath(stateOrEngine, targetIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav?.path || targetIdx < -1 || targetIdx >= nav.path.length - 1) return null;
    nav.path.splice(targetIdx + 1);
    nav.isPortalJump = new Set([...nav.isPortalJump].filter(jumpIdx => jumpIdx <= targetIdx));
    if (nav.path.length === 0) nav.activeGateKey = null;
    return nav;
}

/** @param {any} stateOrEngine @returns {any} */
export function reverseNavigationPath(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav?.path) return null;
    nav.path.reverse();
    nav.isPortalJump = new Set([...nav.isPortalJump].map(jumpIdx => nav.path.length - 1 - jumpIdx));
    return nav;
}

/** @param {any} stateOrEngine @param {any} mapFn @returns {any} */
export function remapNavigationKeys(stateOrEngine, mapFn) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav?.path || typeof mapFn !== 'function') return null;
    nav.path = nav.path.map((/** @type {any} */ key) => key === -1 ? -1 : mapFn(key));
    if (nav.activeGateKey != null) nav.activeGateKey = mapFn(nav.activeGateKey);
    return nav;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearNavigationUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return null;
    nav.undoStack = [];
    return nav.undoStack;
}

/** @param {any} stateOrEngine @returns {any} */
export function popNavigationUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav?.undoStack?.length) return undefined;
    return nav.undoStack.pop();
}

/** @param {any} stateOrEngine @param {any} [step] @returns {any} */
export function stepVisualFlipCount(stateOrEngine, step = 0.15) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return false;
    if (nav.visualFlipCount < nav.flipCount) {
        nav.visualFlipCount = Math.min(nav.flipCount, nav.visualFlipCount + step);
        return true;
    }
    if (nav.visualFlipCount > nav.flipCount) {
        nav.visualFlipCount = Math.max(nav.flipCount, nav.visualFlipCount - step);
        return true;
    }
    return false;
}

/** @param {any} stateOrEngine @param {any} activeGateKey @returns {any} */
export function setNavigationActiveGateKey(stateOrEngine, activeGateKey) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return undefined;
    nav.activeGateKey = activeGateKey;
    return nav.activeGateKey;
}

/** @param {any} stateOrEngine @param {any} lastFlipTime @returns {any} */
export function setNavigationLastFlipTime(stateOrEngine, lastFlipTime) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav) return undefined;
    nav.lastFlipTime = lastFlipTime;
    return nav.lastFlipTime;
}
