// Core engine state actions: top-level scalar fields (dirty/muted/mode/logic/overlay/
// level/cheat/reset-streak/dev-mode/flags/options) plus the top-level ripples and
// foundHintsSinceLoad collections.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';
import type { FlagState, GameOptions, Ripple } from '../../state-slices.js';
import type { EngineLevel } from '../../domain/level-schema.js';

export function markDirty(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = true;
    return engineState;
}

export function clearDirty(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = false;
    return engineState;
}

export function setMuted(stateOrEngine: StateOrEngine, muted: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.muted = !!muted;
    return engineState?.muted ?? false;
}

export function toggleMuted(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.muted = !engineState.muted;
    return engineState.muted;
}

export function addRipple(stateOrEngine: StateOrEngine, ripple: Ripple) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples.push(ripple);
    return engineState.ripples;
}

export function setRipples(stateOrEngine: StateOrEngine, ripples: Ripple[] = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.ripples = ripples;
    return engineState.ripples;
}

export function clearRipples(stateOrEngine: StateOrEngine) {
    return setRipples(stateOrEngine, []);
}

export function pruneRipples(stateOrEngine: StateOrEngine, nowMs: number, maxAgeMs: number = 600) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples = engineState.ripples.filter((ripple) => nowMs - ripple.startTime < maxAgeMs);
    return engineState.ripples;
}

export function setFoundHintsSinceLoad(stateOrEngine: StateOrEngine, hints: number[][] = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.foundHintsSinceLoad = hints;
    return engineState.foundHintsSinceLoad;
}

/** Canonical Hint[] mirror of setFoundHintsSinceLoad — see EngineState.foundHintsSinceLoadRecords. */
export function setFoundHintsSinceLoadRecords(
    stateOrEngine: StateOrEngine, hintRecords: import('../../domain/hint-types.js').Hint[] = [],
) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.foundHintsSinceLoadRecords = hintRecords;
    return engineState.foundHintsSinceLoadRecords;
}

export function toggleDevMode(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.isDevMode = !engineState.isDevMode;
    return engineState.isDevMode;
}

export function toggleFlag(stateOrEngine: StateOrEngine, flagName: keyof FlagState) {
    const engineState = resolveEngineState(stateOrEngine);
    const flags = engineState?.flags;
    if (!flags) return false;
    flags[flagName] = !flags[flagName];
    return flags[flagName];
}

export function setOptionValue(stateOrEngine: StateOrEngine, key: keyof GameOptions, value: boolean) {
    const engineState = resolveEngineState(stateOrEngine);
    const options = engineState?.options;
    if (!options) return undefined;
    options[key] = value;
    return options[key];
}

export function setCheatTimer(stateOrEngine: StateOrEngine, timer: number | null) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.cheatTimer = timer;
    return engineState.cheatTimer;
}

export function setCheatActive(stateOrEngine: StateOrEngine, active: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.cheatActive = !!active;
    return engineState.cheatActive;
}

export function incrementResetStreak(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return 0;
    engineState.resetStreak += 1;
    return engineState.resetStreak;
}

export function setResetStreak(stateOrEngine: StateOrEngine, resetStreak: number) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.resetStreak = resetStreak;
    return engineState.resetStreak;
}

export function setMode(stateOrEngine: StateOrEngine, mode: number) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.mode = mode;
    return engineState?.mode;
}

export function setLogicState(stateOrEngine: StateOrEngine, logicState: string) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.logicState = logicState;
    return engineState?.logicState;
}

export function setOverlayState(stateOrEngine: StateOrEngine, overlayState: string) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.overlayState = overlayState;
    return engineState?.overlayState;
}

export function setLevelIndex(stateOrEngine: StateOrEngine, levelIdx: number) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.levelIdx = levelIdx;
    return engineState?.levelIdx;
}

export function setOrientation(stateOrEngine: StateOrEngine, orientation: number) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.orientation = orientation;
    return engineState?.orientation;
}

export function setLevel(stateOrEngine: StateOrEngine, level: EngineLevel | null) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.level = level;
    return engineState?.level;
}
