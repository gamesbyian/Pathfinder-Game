// @ts-check
// Hint slice state actions (engineState.hinter.*): hint path list, animation clock, and
// pinned hint/heat-map persistence.
import { buildPathListHeatmap } from '../../domain/heatmap.js';
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} [opts] @returns {any} */
export function resetHintAnimationClock(stateOrEngine, { alpha = 0, index } = {}) {
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

/** @param {any} stateOrEngine @param {any} index @returns {any} */
export function setHintAnimationIndex(stateOrEngine, index) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index = index;
    return hinter.index;
}

/** @param {any} stateOrEngine @param {any} [delta] @returns {any} */
export function advanceHintAnimationIndex(stateOrEngine, delta = 0) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index += delta;
    return hinter.index;
}

/** @param {any} stateOrEngine @param {any} alpha @returns {any} */
export function setHintAnimationAlpha(stateOrEngine, alpha) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.alpha = alpha;
    return hinter.alpha;
}

/** @param {any} stateOrEngine @param {any} holdStartMs @returns {any} */
export function setHintHoldStartMsIfUnset(stateOrEngine, holdStartMs) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.holdStartMs) hinter.holdStartMs = holdStartMs;
    return hinter.holdStartMs;
}

/** @param {any} stateOrEngine @param {any} blinkStartMs @returns {any} */
export function setHintBlinkStartMsIfUnset(stateOrEngine, blinkStartMs) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.blinkStartMs) hinter.blinkStartMs = blinkStartMs;
    return hinter.blinkStartMs;
}

/** @param {any} stateOrEngine @param {any} fadeStartMs @returns {any} */
export function setHintFadeStartMs(stateOrEngine, fadeStartMs) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.fadeStartMs = fadeStartMs;
    return hinter.fadeStartMs;
}

/** @param {any} stateOrEngine @param {any} [pathList] @param {any} [source] @param {any} [currentIdx] @returns {any} */
export function setHintPaths(stateOrEngine, pathList = [], source = 'none', currentIdx = 0) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = pathList;
    hinter.currentPathIdx = currentIdx;
    hinter.source = source;
    hinter.heatmap = buildPathListHeatmap(pathList);
    return hinter;
}

/** @param {any} stateOrEngine @param {any} [opts] @returns {any} */
export function clearHintPaths(stateOrEngine, { resetSource = true } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = [];
    hinter.currentPathIdx = 0;
    if (resetSource) hinter.source = 'none';
    hinter.heatmap = null;
    return hinter;
}

/** @param {any} stateOrEngine @returns {any} */
export function resetHinterForLevel(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    clearHintPaths(engineState);
    resetHintAnimationClock(engineState, { alpha: 0, index: 0 });
    clearPersistedHint(stateOrEngine);
    clearPersistedHeatmap(stateOrEngine);
    return engineState?.hinter ?? null;
}

/** @param {any} stateOrEngine @returns {any} */
export function pinCurrentHint(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.pathList?.length) return false;
    hinter.persistedPath = [...hinter.pathList[hinter.currentPathIdx]];
    hinter.persistedHintIdx = hinter.currentPathIdx;
    return true;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearPersistedHint(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedPath = [];
    hinter.persistedHintIdx = -1;
    return hinter;
}

/** @param {any} stateOrEngine @returns {any} */
export function pinCurrentHeatmap(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.heatmap || !hinter.pathList.length) return false;
    hinter.persistedHeatmap = new Map(hinter.heatmap);
    hinter.persistedHeatmapPathCount = hinter.pathList.length;
    return true;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearPersistedHeatmap(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedHeatmap = null;
    hinter.persistedHeatmapPathCount = 0;
    return hinter;
}
