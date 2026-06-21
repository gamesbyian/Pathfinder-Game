// @ts-check
// Core engine state actions: top-level scalar fields (dirty/muted/mode/logic/overlay/
// level/cheat/reset-streak/dev-mode/flags/options) plus the top-level ripples and
// foundHintsSinceLoad collections.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @returns {any} */
export function markDirty(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = true;
    return engineState;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearDirty(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = false;
    return engineState;
}

/** @param {any} stateOrEngine @param {any} muted @returns {any} */
export function setMuted(stateOrEngine, muted) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.muted = !!muted;
    return engineState?.muted ?? false;
}

/** @param {any} stateOrEngine @returns {any} */
export function toggleMuted(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.muted = !engineState.muted;
    return engineState.muted;
}

/** @param {any} stateOrEngine @param {any} ripple @returns {any} */
export function addRipple(stateOrEngine, ripple) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples.push(ripple);
    return engineState.ripples;
}

/** @param {any} stateOrEngine @param {any} [ripples] @returns {any} */
export function setRipples(stateOrEngine, ripples = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.ripples = ripples;
    return engineState.ripples;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearRipples(stateOrEngine) {
    return setRipples(stateOrEngine, []);
}

/** @param {any} stateOrEngine @param {any} nowMs @param {any} [maxAgeMs] @returns {any} */
export function pruneRipples(stateOrEngine, nowMs, maxAgeMs = 600) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples = engineState.ripples.filter((/** @type {any} */ ripple) => nowMs - ripple.startTime < maxAgeMs);
    return engineState.ripples;
}

/** @param {any} stateOrEngine @param {any} [hints] @returns {any} */
export function setFoundHintsSinceLoad(stateOrEngine, hints = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.foundHintsSinceLoad = hints;
    return engineState.foundHintsSinceLoad;
}

/** @param {any} stateOrEngine @returns {any} */
export function toggleDevMode(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.isDevMode = !engineState.isDevMode;
    return engineState.isDevMode;
}

/** @param {any} stateOrEngine @param {any} flagName @returns {any} */
export function toggleFlag(stateOrEngine, flagName) {
    const engineState = resolveEngineState(stateOrEngine);
    const flags = engineState?.flags;
    if (!flags) return false;
    flags[flagName] = !flags[flagName];
    return flags[flagName];
}

/** @param {any} stateOrEngine @param {any} key @param {any} value @returns {any} */
export function setOptionValue(stateOrEngine, key, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const options = engineState?.options;
    if (!options) return undefined;
    options[key] = value;
    return options[key];
}

/** @param {any} stateOrEngine @param {any} timer @returns {any} */
export function setCheatTimer(stateOrEngine, timer) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.cheatTimer = timer;
    return engineState.cheatTimer;
}

/** @param {any} stateOrEngine @param {any} active @returns {any} */
export function setCheatActive(stateOrEngine, active) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.cheatActive = !!active;
    return engineState.cheatActive;
}

/** @param {any} stateOrEngine @returns {any} */
export function incrementResetStreak(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return 0;
    engineState.resetStreak += 1;
    return engineState.resetStreak;
}

/** @param {any} stateOrEngine @param {any} resetStreak @returns {any} */
export function setResetStreak(stateOrEngine, resetStreak) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.resetStreak = resetStreak;
    return engineState.resetStreak;
}

/** @param {any} stateOrEngine @param {any} mode @returns {any} */
export function setMode(stateOrEngine, mode) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.mode = mode;
    return engineState?.mode;
}

/** @param {any} stateOrEngine @param {any} logicState @returns {any} */
export function setLogicState(stateOrEngine, logicState) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.logicState = logicState;
    return engineState?.logicState;
}

/** @param {any} stateOrEngine @param {any} overlayState @returns {any} */
export function setOverlayState(stateOrEngine, overlayState) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.overlayState = overlayState;
    return engineState?.overlayState;
}

/** @param {any} stateOrEngine @param {any} levelIdx @returns {any} */
export function setLevelIndex(stateOrEngine, levelIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.levelIdx = levelIdx;
    return engineState?.levelIdx;
}

/** @param {any} stateOrEngine @param {any} variant @returns {any} */
export function setVariant(stateOrEngine, variant) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.variant = variant;
    return engineState?.variant;
}

/** @param {any} stateOrEngine @param {any} level @returns {any} */
export function setLevel(stateOrEngine, level) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.level = level;
    return engineState?.level;
}
