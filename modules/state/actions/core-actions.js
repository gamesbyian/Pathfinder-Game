// Core engine state actions: top-level scalar fields (dirty/muted/mode/logic/overlay/
// level/cheat/reset-streak/dev-mode/flags/options) plus the top-level ripples and
// foundHintsSinceLoad collections.
import { resolveEngineState } from './shared.js';

export function markDirty(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = true;
    return engineState;
}

export function clearDirty(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = false;
    return engineState;
}

export function setMuted(stateOrEngine, muted) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.muted = !!muted;
    return engineState?.muted ?? false;
}

export function toggleMuted(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.muted = !engineState.muted;
    return engineState.muted;
}

export function addRipple(stateOrEngine, ripple) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples.push(ripple);
    return engineState.ripples;
}

export function setRipples(stateOrEngine, ripples = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.ripples = ripples;
    return engineState.ripples;
}

export function clearRipples(stateOrEngine) {
    return setRipples(stateOrEngine, []);
}

export function pruneRipples(stateOrEngine, nowMs, maxAgeMs = 600) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples = engineState.ripples.filter(ripple => nowMs - ripple.startTime < maxAgeMs);
    return engineState.ripples;
}

export function setFoundHintsSinceLoad(stateOrEngine, hints = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.foundHintsSinceLoad = hints;
    return engineState.foundHintsSinceLoad;
}

export function toggleDevMode(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.isDevMode = !engineState.isDevMode;
    return engineState.isDevMode;
}

export function toggleFlag(stateOrEngine, flagName) {
    const engineState = resolveEngineState(stateOrEngine);
    const flags = engineState?.flags;
    if (!flags) return false;
    flags[flagName] = !flags[flagName];
    return flags[flagName];
}

export function setOptionValue(stateOrEngine, key, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const options = engineState?.options;
    if (!options) return undefined;
    options[key] = value;
    return options[key];
}

export function setCheatTimer(stateOrEngine, timer) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.cheatTimer = timer;
    return engineState.cheatTimer;
}

export function setCheatActive(stateOrEngine, active) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.cheatActive = !!active;
    return engineState.cheatActive;
}

export function incrementResetStreak(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return 0;
    engineState.resetStreak += 1;
    return engineState.resetStreak;
}

export function setResetStreak(stateOrEngine, resetStreak) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.resetStreak = resetStreak;
    return engineState.resetStreak;
}

export function setMode(stateOrEngine, mode) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.mode = mode;
    return engineState?.mode;
}

export function setLogicState(stateOrEngine, logicState) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.logicState = logicState;
    return engineState?.logicState;
}

export function setOverlayState(stateOrEngine, overlayState) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.overlayState = overlayState;
    return engineState?.overlayState;
}

export function setLevelIndex(stateOrEngine, levelIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.levelIdx = levelIdx;
    return engineState?.levelIdx;
}

export function setVariant(stateOrEngine, variant) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.variant = variant;
    return engineState?.variant;
}

export function setLevel(stateOrEngine, level) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.level = level;
    return engineState?.level;
}
