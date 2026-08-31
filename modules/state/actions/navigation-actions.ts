// Navigation slice state actions (engineState.nav.*): the in-progress path, portal-jump
// set, active gate, undo stack, and flip-count animation bookkeeping.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';
import type { EngineState, NavigationState } from '../../state-slices.js';

// Several nav actions accept the engine state OR a bare nav slice directly (callers pass
// `engineState.nav` in hot paths). This resolves any of State / EngineState / NavigationState
// to the nav slice it mutates.
type NavInput = StateOrEngine | NavigationState;
function resolveNav(input: NavInput): NavigationState | undefined {
    const engine = (input as { engineState?: EngineState })?.engineState ?? input;
    if (!engine) return undefined;
    return (engine as EngineState).nav ?? (engine as NavigationState);
}

interface NavSnapshotInput {
    path?: number[];
    isPortalJump?: Iterable<number> | null;
    activeGateKey?: number | null;
}

export function setNavigationSnapshot(stateOrEngine: StateOrEngine, snapshot: NavSnapshotInput = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return null;
    nav.path = [...(snapshot.path || [])];
    nav.isPortalJump = new Set(snapshot.isPortalJump || []);
    nav.activeGateKey = snapshot.activeGateKey ?? null;
    return nav;
}

export function clearNavigation(stateOrEngine: StateOrEngine) {
    return setNavigationSnapshot(stateOrEngine, {
        path: [],
        isPortalJump: [],
        activeGateKey: null
    });
}

export function truncateNavigationPath(stateOrEngine: NavInput, targetIdx: number) {
    const nav = resolveNav(stateOrEngine);
    if (!nav?.path || targetIdx < -1 || targetIdx >= nav.path.length - 1) return null;
    nav.path.splice(targetIdx + 1);
    nav.isPortalJump = new Set([...nav.isPortalJump].filter(jumpIdx => jumpIdx <= targetIdx));
    if (nav.path.length === 0) nav.activeGateKey = null;
    return nav;
}

export function reverseNavigationPath(stateOrEngine: NavInput) {
    const nav = resolveNav(stateOrEngine);
    if (!nav?.path) return null;
    nav.path.reverse();
    nav.isPortalJump = new Set([...nav.isPortalJump].map(jumpIdx => nav.path.length - 1 - jumpIdx));
    return nav;
}

export function remapNavigationKeys(stateOrEngine: NavInput, mapFn: (key: number) => number) {
    const nav = resolveNav(stateOrEngine);
    if (!nav?.path || typeof mapFn !== 'function') return null;
    nav.path = nav.path.map((key) => key === -1 ? -1 : mapFn(key));
    if (nav.activeGateKey != null) nav.activeGateKey = mapFn(nav.activeGateKey);
    return nav;
}

export function clearNavigationUndoStack(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return null;
    nav.undoStack = [];
    return nav.undoStack;
}

export function popNavigationUndoStack(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav?.undoStack?.length) return undefined;
    return nav.undoStack.pop();
}

export function stepVisualFlipCount(stateOrEngine: StateOrEngine, step: number = 0.15) {
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

export function setNavigationActiveGateKey(stateOrEngine: StateOrEngine, activeGateKey: number | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return undefined;
    nav.activeGateKey = activeGateKey;
    return nav.activeGateKey;
}

export function setNavigationLastFlipTime(stateOrEngine: NavInput, lastFlipTime: number) {
    const nav = resolveNav(stateOrEngine);
    if (!nav) return undefined;
    nav.lastFlipTime = lastFlipTime;
    return nav.lastFlipTime;
}
