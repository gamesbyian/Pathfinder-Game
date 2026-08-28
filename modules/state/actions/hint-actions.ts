// Hint slice state actions (engineState.hinter.*): hint path list, animation clock, and
// pinned hint/heat-map persistence.
import { buildPathListHeatmap } from '../../domain/heatmap.js';
import { selectDisplayHints } from '../../domain/hint-selection.js';
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';
import type { EngineLevel } from '../../domain/level-schema.js';

/** Required path length / non-gate winning-path cell count — mirrors solver's
 *  getRequiredPathCoverageRatio (kept local so the hint slice does not depend on the solver layer). */
function requiredPathCoverageRatio(level: EngineLevel | null | undefined): number {
    if (!level) return 0;
    const nonGateWinningPathCellCount = Math.max(1, level.grid.w * level.grid.h
        - level.blockSet.size - level.gooseSet.size - level.falseGoalKeys.size - level.gateKeys.length);
    return level.reqLen / nonGateWinningPathCellCount;
}

export function resetHintAnimationClock(stateOrEngine: StateOrEngine, { alpha = 0, index }: { alpha?: number; index?: number } = {}) {
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

export function setHintAnimationIndex(stateOrEngine: StateOrEngine, index: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index = index;
    return hinter.index;
}

export function advanceHintAnimationIndex(stateOrEngine: StateOrEngine, delta: number = 0) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index += delta;
    return hinter.index;
}

export function setHintAnimationAlpha(stateOrEngine: StateOrEngine, alpha: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.alpha = alpha;
    return hinter.alpha;
}

export function setHintHoldStartMsIfUnset(stateOrEngine: StateOrEngine, holdStartMs: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.holdStartMs) hinter.holdStartMs = holdStartMs;
    return hinter.holdStartMs;
}

export function setHintBlinkStartMsIfUnset(stateOrEngine: StateOrEngine, blinkStartMs: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.blinkStartMs) hinter.blinkStartMs = blinkStartMs;
    return hinter.blinkStartMs;
}

export function setHintFadeStartMs(stateOrEngine: StateOrEngine, fadeStartMs: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.fadeStartMs = fadeStartMs;
    return hinter.fadeStartMs;
}

export function setHintPaths(
    stateOrEngine: StateOrEngine, pathList: number[][] = [], source: string = 'none', currentIdx: number = 0,
    { curate = false }: { curate?: boolean } = {},
) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = pathList;
    hinter.source = source;
    // Heat-map is always built from the FULL path list — curation only affects what the player cycles.
    hinter.heatmap = buildPathListHeatmap(pathList);
    if (curate) {
        const sel = selectDisplayHints(pathList, {
            requiredPathCoverageRatio: requiredPathCoverageRatio(engineState.level),
            mustCrossKeys: engineState.level?.mustCrossKeys,
        });
        hinter.displayIndices = sel.indices;
        hinter.moreSolutionsSimilar = sel.moreButSimilar;
    } else {
        hinter.displayIndices = pathList.map((_, i) => i);
        hinter.moreSolutionsSimilar = false;
    }
    const n = hinter.displayIndices.length;
    hinter.currentPathIdx = n > 0 ? ((currentIdx % n) + n) % n : 0;
    return hinter;
}

export function clearHintPaths(stateOrEngine: StateOrEngine, { resetSource = true }: { resetSource?: boolean } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = [];
    hinter.displayIndices = [];
    hinter.moreSolutionsSimilar = false;
    hinter.currentPathIdx = 0;
    if (resetSource) hinter.source = 'none';
    hinter.heatmap = null;
    return hinter;
}

export function resetHinterForLevel(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    clearHintPaths(engineState);
    resetHintAnimationClock(engineState, { alpha: 0, index: 0 });
    clearPersistedHint(stateOrEngine);
    clearPersistedHeatmap(stateOrEngine);
    return engineState?.hinter ?? null;
}

export function pinCurrentHint(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.pathList?.length) return false;
    const pathIdx = hinter.displayIndices?.[hinter.currentPathIdx] ?? hinter.currentPathIdx;
    if (!hinter.pathList[pathIdx]) return false;
    hinter.persistedPath = [...hinter.pathList[pathIdx]];
    hinter.persistedHintIdx = hinter.currentPathIdx;
    return true;
}

export function clearPersistedHint(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedPath = [];
    hinter.persistedHintIdx = -1;
    return hinter;
}

export function pinCurrentHeatmap(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.heatmap || !hinter.pathList.length) return false;
    hinter.persistedHeatmap = new Map(hinter.heatmap);
    hinter.persistedHeatmapPathCount = hinter.pathList.length;
    return true;
}

export function clearPersistedHeatmap(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedHeatmap = null;
    hinter.persistedHeatmapPathCount = 0;
    return hinter;
}
