// Hint slice state actions (engineState.hinter.*): hint path list, animation clock, and
// pinned hint/heat-map persistence.
import { buildPathListHeatmap } from '../../domain/heatmap.js';
import { resolveEngineState } from './shared.js';

export function resetHintAnimationClock(stateOrEngine: any, { alpha = 0, index }: any = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.alpha = alpha;
    if (index !== undefined) hinter.index = index;
    hinter.holdStartMs = 0;
    hinter.blinkStartMs = 0;
    hinter.fadeStartMs = 0;
    return hinter;
}

export function setHintAnimationIndex(stateOrEngine: any, index: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index = index;
    return hinter.index;
}

export function advanceHintAnimationIndex(stateOrEngine: any, delta: any = 0) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index += delta;
    return hinter.index;
}

export function setHintAnimationAlpha(stateOrEngine: any, alpha: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.alpha = alpha;
    return hinter.alpha;
}

export function setHintHoldStartMsIfUnset(stateOrEngine: any, holdStartMs: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.holdStartMs) hinter.holdStartMs = holdStartMs;
    return hinter.holdStartMs;
}

export function setHintBlinkStartMsIfUnset(stateOrEngine: any, blinkStartMs: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.blinkStartMs) hinter.blinkStartMs = blinkStartMs;
    return hinter.blinkStartMs;
}

export function setHintFadeStartMs(stateOrEngine: any, fadeStartMs: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.fadeStartMs = fadeStartMs;
    return hinter.fadeStartMs;
}

export function setHintPaths(stateOrEngine: any, pathList: any = [], source: any = 'none', currentIdx: any = 0) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = pathList;
    hinter.currentPathIdx = currentIdx;
    hinter.source = source;
    hinter.heatmap = buildPathListHeatmap(pathList);
    return hinter;
}

export function clearHintPaths(stateOrEngine: any, { resetSource = true }: any = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = [];
    hinter.currentPathIdx = 0;
    if (resetSource) hinter.source = 'none';
    hinter.heatmap = null;
    return hinter;
}

export function resetHinterForLevel(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    clearHintPaths(engineState);
    resetHintAnimationClock(engineState, { alpha: 0, index: 0 });
    clearPersistedHint(stateOrEngine);
    clearPersistedHeatmap(stateOrEngine);
    return engineState?.hinter ?? null;
}

export function pinCurrentHint(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.pathList?.length) return false;
    hinter.persistedPath = [...hinter.pathList[hinter.currentPathIdx]];
    hinter.persistedHintIdx = hinter.currentPathIdx;
    return true;
}

export function clearPersistedHint(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedPath = [];
    hinter.persistedHintIdx = -1;
    return hinter;
}

export function pinCurrentHeatmap(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.heatmap || !hinter.pathList.length) return false;
    hinter.persistedHeatmap = new Map(hinter.heatmap);
    hinter.persistedHeatmapPathCount = hinter.pathList.length;
    return true;
}

export function clearPersistedHeatmap(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedHeatmap = null;
    hinter.persistedHeatmapPathCount = 0;
    return hinter;
}
