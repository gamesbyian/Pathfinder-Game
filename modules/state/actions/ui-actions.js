// @ts-check
// UI/input session state actions: the UI focus/session slice (engineState.ui.*) and the
// gamepad input slice (engineState.gamepad.*). Both describe input/session state, so they
// live together. Note the gamepad-prefixed focus helpers write the `ui` slice.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} gamepadGridPrimaryAction @returns {any} */
export function setGamepadGridPrimaryAction(stateOrEngine, gamepadGridPrimaryAction) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.gamepadGridPrimaryAction = gamepadGridPrimaryAction;
    return ui.gamepadGridPrimaryAction;
}

/** @param {any} stateOrEngine @param {any} focusGroup @param {any} focusIndex @returns {any} */
export function setUiFocusGroupState(stateOrEngine, focusGroup, focusIndex) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return null;
    ui.focusGroup = focusGroup;
    ui.focusIndex = focusIndex;
    return ui;
}

/** @param {any} stateOrEngine @param {any} gamepadFocusEnabled @returns {any} */
export function setGamepadFocusEnabled(stateOrEngine, gamepadFocusEnabled) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return false;
    ui.gamepadFocusEnabled = !!gamepadFocusEnabled;
    return ui.gamepadFocusEnabled;
}

/** @param {any} stateOrEngine @param {any} focusIndex @returns {any} */
export function setUiFocusIndex(stateOrEngine, focusIndex) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.focusIndex = focusIndex;
    return ui.focusIndex;
}

/** @param {any} stateOrEngine @param {any} bLastPressTime @returns {any} */
export function setUiBLastPressTime(stateOrEngine, bLastPressTime) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.bLastPressTime = bLastPressTime;
    return ui.bLastPressTime;
}

/** @param {any} stateOrEngine @param {any} bSingleTimer @returns {any} */
export function setUiBSingleTimer(stateOrEngine, bSingleTimer) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.bSingleTimer = bSingleTimer;
    return ui.bSingleTimer;
}

/** @param {any} stateOrEngine @param {any} hasPad @returns {any} */
export function setGamepadHasPad(stateOrEngine, hasPad) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return false;
    gamepad.hasPad = !!hasPad;
    return gamepad.hasPad;
}

/** @param {any} stateOrEngine @param {any} nextMoveAt @returns {any} */
export function setGamepadNextMoveAt(stateOrEngine, nextMoveAt) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return undefined;
    gamepad.nextMoveAt = nextMoveAt;
    return gamepad.nextMoveAt;
}

/** @param {any} stateOrEngine @param {any} [lastButtons] @returns {any} */
export function setGamepadLastButtons(stateOrEngine, lastButtons = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return null;
    gamepad.lastButtons = lastButtons;
    return gamepad.lastButtons;
}

/** @param {any} stateOrEngine @param {any} [rafState] @returns {any} */
export function setGamepadRafState(stateOrEngine, rafState = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return null;
    if (Object.hasOwn(rafState, 'rafId')) gamepad.rafId = rafState.rafId;
    if (Object.hasOwn(rafState, 'rafActive')) gamepad.rafActive = rafState.rafActive;
    return gamepad;
}

/** @param {any} stateOrEngine @returns {any} */
export function resetGamepadConnectionState(stateOrEngine) {
    setGamepadHasPad(stateOrEngine, false);
    setGamepadLastButtons(stateOrEngine, []);
    return resolveEngineState(stateOrEngine)?.gamepad ?? null;
}
