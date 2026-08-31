import type { ControllerDeps } from '../state.js';
// Gamepad controller: polling loop, button/direction handling, connected/disconnected events.
import {
    resetGamepadConnectionState,
    setGamepadFocusEnabled,
    setGamepadHasPad,
    setGamepadLastButtons,
    setGamepadNextMoveAt,
    setGamepadRafState,
    setUiBLastPressTime,
    setUiBSingleTimer
} from '../state-actions.js';

const GAMEPAD_MAP: Record<string, number> = { A: 0, B: 1, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const GAMEPAD_REPEAT_INITIAL = 220;
const GAMEPAD_REPEAT_RATE    = 100;

export function createGamepadController({ state }: ControllerDeps, navController: any) {
    const {
        setFocusGroup,
        cycleFocusGroup,
        moveFocusWithinGroup,
        activateFocusedControl,
        applyFocusVisual,
        dismissGuideOrHelpModal,
        // Shared with the keyboard path (navigation-controller) so grid play is identical
        // and modal/overlay-guarded in one place.
        moveGridHead,
    } = navController;

    function handleGamepadDirection(dir: any) {
        if (state.engineState.ui.focusGroup === 'GRID') {
            if (dir === 'UP')    moveGridHead(0, -1);
            if (dir === 'DOWN')  moveGridHead(0,  1);
            if (dir === 'LEFT')  moveGridHead(-1, 0);
            if (dir === 'RIGHT') moveGridHead(1,  0);
            return;
        }
        moveFocusWithinGroup((dir === 'LEFT' || dir === 'UP') ? -1 : 1);
    }

    function handleBPress() {
        const now = Date.now();
        if (now - state.engineState.ui.bLastPressTime <= 320) {
            if (state.engineState.ui.bSingleTimer) {
                clearTimeout(state.engineState.ui.bSingleTimer);
                setUiBSingleTimer(state, null);
            }
            cycleFocusGroup();
            setUiBLastPressTime(state, 0);
            return;
        }
        setUiBLastPressTime(state, now);
        // Cast: setTimeout returns number (DOM) here, but Timeout under node types (the test tsconfig).
        setUiBSingleTimer(state, setTimeout(() => {
            dismissGuideOrHelpModal();
            setUiBSingleTimer(state, null);
        }, 320) as unknown as number);
    }

    function pollGamepadInput() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad  = pads && pads[0];
        if (!pad) return;
        setGamepadHasPad(state, true);
        const now = Date.now();

        const pressed    = (idx: any) => !!pad.buttons[idx] && pad.buttons[idx].pressed;
        const wasPressed = (idx: any) => !!state.engineState.gamepad.lastButtons[idx];
        const anyPressed = pad.buttons.some((b: any) => !!b && b.pressed);
        if (anyPressed) setGamepadHasPad(state, true);

        if (pressed(GAMEPAD_MAP.A) && !wasPressed(GAMEPAD_MAP.A)) activateFocusedControl();
        if (pressed(GAMEPAD_MAP.B) && !wasPressed(GAMEPAD_MAP.B)) handleBPress();

        const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        let activeDir = null;
        for (const dir of dirs) {
            const idx = GAMEPAD_MAP[dir];
            if (pressed(idx)) {
                activeDir = dir;
                if (!wasPressed(idx)) {
                    handleGamepadDirection(dir);
                    setGamepadNextMoveAt(state, now + GAMEPAD_REPEAT_INITIAL);
                }
            }
        }
        if (activeDir && now >= state.engineState.gamepad.nextMoveAt) {
            handleGamepadDirection(activeDir);
            setGamepadNextMoveAt(state, now + GAMEPAD_REPEAT_RATE);
        }

        setGamepadLastButtons(state, pad.buttons.map((b: any) => b.pressed));
    }

    function hasConnectedGamepad() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        return !!(pads && Array.from(pads).some((pad: any) => !!pad));
    }

    function stopGamepadPollingLoop() {
        if (state.engineState.gamepad.rafId !== null) cancelAnimationFrame(state.engineState.gamepad.rafId);
        setGamepadRafState(state, { rafId: null, rafActive: false });
    }

    function gamepadPollingTick() {
        pollGamepadInput();
        if (!hasConnectedGamepad()) {
            resetGamepadConnectionState(state);
            stopGamepadPollingLoop();
            return;
        }
        setGamepadRafState(state, { rafId: requestAnimationFrame(gamepadPollingTick) });
    }

    function startGamepadPollingLoop() {
        if (state.engineState.gamepad.rafActive) return;
        setGamepadRafState(state, { rafActive: true, rafId: requestAnimationFrame(gamepadPollingTick) });
    }

    window.addEventListener('gamepadconnected', () => {
        setGamepadHasPad(state, true);
        pollGamepadInput();
        startGamepadPollingLoop();
        setFocusGroup(state.engineState.ui.focusGroup || 'GRID', state.engineState.ui.focusIndex || 0);
    });
    window.addEventListener('gamepaddisconnected', () => {
        if (hasConnectedGamepad()) return;
        resetGamepadConnectionState(state);
        setGamepadFocusEnabled(state, false);
        applyFocusVisual(null);
        stopGamepadPollingLoop();
    });

    if (hasConnectedGamepad()) startGamepadPollingLoop();
}
