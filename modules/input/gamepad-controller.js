// Gamepad controller: polling loop, button/direction handling, connected/disconnected events.

const GAMEPAD_MAP = { A: 0, B: 1, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const GAMEPAD_REPEAT_INITIAL = 220;
const GAMEPAD_REPEAT_RATE    = 100;

export function createGamepadController({ core, state, ui, engine, levelUtils }, navController) {
    const {
        setFocusGroup,
        cycleFocusGroup,
        moveFocusWithinGroup,
        activateFocusedControl,
        applyFocusVisual,
        dismissGuideOrHelpModal,
    } = navController;

    function isModalActive() {
        return ui.isModalOpen('guideModal')
            || ui.isModalOpen('editorHelpModal')
            || ui.isModalOpen('winModal')
            || ui.isModalOpen('themeModal')
            || ui.isModalOpen('unsavedModal')
            || ui.isModalOpen('publishedLevelsModal');
    }

    function gamepadMoveGrid(dx, dy) {
        if (isModalActive()) return;
        const l = state.ENGINE.mode === core.PLAY
            ? state.ENGINE.level
            : state.ENGINE.editor.workingLevel;
        if (!l) return;
        if (!state.ENGINE.path.length) {
            const firstGate = l.gateKeys && l.gateKeys.length ? levelUtils.UNPACK(l.gateKeys[0]) : null;
            if (!firstGate) return;
            state.ENGINE.activeGateKey = l.gateKeys[0];
            engine.PathNavigator.pushStep(state.ENGINE, l.gateKeys[0], false);
            engine.setLogicState(core.DRAGGING);
        }
        const head = levelUtils.UNPACK(state.ENGINE.path[state.ENGINE.path.length - 1]);
        engine.attemptMoveTo({ x: head.x + dx, y: head.y + dy });
    }

    function handleGamepadDirection(dir) {
        if (state.ENGINE.ui.focusGroup === 'GRID') {
            if (dir === 'UP')    gamepadMoveGrid(0, -1);
            if (dir === 'DOWN')  gamepadMoveGrid(0,  1);
            if (dir === 'LEFT')  gamepadMoveGrid(-1, 0);
            if (dir === 'RIGHT') gamepadMoveGrid(1,  0);
            return;
        }
        moveFocusWithinGroup((dir === 'LEFT' || dir === 'UP') ? -1 : 1);
    }

    function handleBPress() {
        const now = Date.now();
        if (now - state.ENGINE.ui.bLastPressTime <= 320) {
            if (state.ENGINE.ui.bSingleTimer) {
                clearTimeout(state.ENGINE.ui.bSingleTimer);
                state.ENGINE.ui.bSingleTimer = null;
            }
            cycleFocusGroup();
            state.ENGINE.ui.bLastPressTime = 0;
            return;
        }
        state.ENGINE.ui.bLastPressTime = now;
        state.ENGINE.ui.bSingleTimer = setTimeout(() => {
            dismissGuideOrHelpModal();
            state.ENGINE.ui.bSingleTimer = null;
        }, 320);
    }

    function pollGamepadInput() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad  = pads && pads[0];
        if (!pad) return;
        state.ENGINE.gamepad.hasPad = true;
        const now = Date.now();

        const pressed    = idx => !!pad.buttons[idx] && pad.buttons[idx].pressed;
        const wasPressed = idx => !!state.ENGINE.gamepad.lastButtons[idx];
        const anyPressed = pad.buttons.some(b => !!b && b.pressed);
        if (anyPressed) state.ENGINE.gamepad.hasPad = true;

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
                    state.ENGINE.gamepad.nextMoveAt = now + GAMEPAD_REPEAT_INITIAL;
                }
            }
        }
        if (activeDir && now >= state.ENGINE.gamepad.nextMoveAt) {
            handleGamepadDirection(activeDir);
            state.ENGINE.gamepad.nextMoveAt = now + GAMEPAD_REPEAT_RATE;
        }

        state.ENGINE.gamepad.lastButtons = pad.buttons.map(b => b.pressed);
    }

    function hasConnectedGamepad() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        return !!(pads && Array.from(pads).some(pad => !!pad));
    }

    function stopGamepadPollingLoop() {
        if (state.ENGINE.gamepad.rafId !== null) cancelAnimationFrame(state.ENGINE.gamepad.rafId);
        state.ENGINE.gamepad.rafId     = null;
        state.ENGINE.gamepad.rafActive = false;
    }

    function gamepadPollingTick() {
        pollGamepadInput();
        if (!hasConnectedGamepad()) {
            state.ENGINE.gamepad.hasPad      = false;
            state.ENGINE.gamepad.lastButtons = [];
            stopGamepadPollingLoop();
            return;
        }
        state.ENGINE.gamepad.rafId = requestAnimationFrame(gamepadPollingTick);
    }

    function startGamepadPollingLoop() {
        if (state.ENGINE.gamepad.rafActive) return;
        state.ENGINE.gamepad.rafActive = true;
        state.ENGINE.gamepad.rafId     = requestAnimationFrame(gamepadPollingTick);
    }

    window.addEventListener('gamepadconnected', () => {
        state.ENGINE.gamepad.hasPad = true;
        pollGamepadInput();
        startGamepadPollingLoop();
        setFocusGroup(state.ENGINE.ui.focusGroup || 'GRID', state.ENGINE.ui.focusIndex || 0);
    });
    window.addEventListener('gamepaddisconnected', () => {
        if (hasConnectedGamepad()) return;
        state.ENGINE.gamepad.hasPad         = false;
        state.ENGINE.gamepad.lastButtons    = [];
        state.ENGINE.ui.gamepadFocusEnabled = false;
        applyFocusVisual(null);
        stopGamepadPollingLoop();
    });

    if (hasConnectedGamepad()) startGamepadPollingLoop();
}
