// UI/input session state actions: the UI focus/session slice (engineState.ui.*) and the
// gamepad input slice (engineState.gamepad.*). Both describe input/session state, so they
// live together. Note the gamepad-prefixed focus helpers write the `ui` slice.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';

export function setGamepadGridPrimaryAction(stateOrEngine: StateOrEngine, gamepadGridPrimaryAction: () => void) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.gamepadGridPrimaryAction = gamepadGridPrimaryAction;
    return ui.gamepadGridPrimaryAction;
}

export function setUiFocusGroupState(stateOrEngine: StateOrEngine, focusGroup: string, focusIndex: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return null;
    ui.focusGroup = focusGroup;
    ui.focusIndex = focusIndex;
    return ui;
}

export function setGamepadFocusEnabled(stateOrEngine: StateOrEngine, gamepadFocusEnabled: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return false;
    ui.gamepadFocusEnabled = !!gamepadFocusEnabled;
    return ui.gamepadFocusEnabled;
}

export function setUiFocusIndex(stateOrEngine: StateOrEngine, focusIndex: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.focusIndex = focusIndex;
    return ui.focusIndex;
}

export function setUiBLastPressTime(stateOrEngine: StateOrEngine, bLastPressTime: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.bLastPressTime = bLastPressTime;
    return ui.bLastPressTime;
}

export function setUiBSingleTimer(stateOrEngine: StateOrEngine, bSingleTimer: number | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.bSingleTimer = bSingleTimer;
    return ui.bSingleTimer;
}

export function setGamepadHasPad(stateOrEngine: StateOrEngine, hasPad: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return false;
    gamepad.hasPad = !!hasPad;
    return gamepad.hasPad;
}

export function setGamepadNextMoveAt(stateOrEngine: StateOrEngine, nextMoveAt: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return undefined;
    gamepad.nextMoveAt = nextMoveAt;
    return gamepad.nextMoveAt;
}

export function setGamepadLastButtons(stateOrEngine: StateOrEngine, lastButtons: boolean[] = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return null;
    gamepad.lastButtons = lastButtons;
    return gamepad.lastButtons;
}

export function setGamepadRafState(stateOrEngine: StateOrEngine, rafState: { rafId?: number | null; rafActive?: boolean } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return null;
    if (Object.hasOwn(rafState, 'rafId')) gamepad.rafId = rafState.rafId ?? null;
    if (Object.hasOwn(rafState, 'rafActive')) gamepad.rafActive = rafState.rafActive ?? false;
    return gamepad;
}

export function resetGamepadConnectionState(stateOrEngine: StateOrEngine) {
    setGamepadHasPad(stateOrEngine, false);
    setGamepadLastButtons(stateOrEngine, []);
    return resolveEngineState(stateOrEngine)?.gamepad ?? null;
}
