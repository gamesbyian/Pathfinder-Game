// Gamepad controller: polling loop, button/direction handling, connected/disconnected events.

const GAMEPAD_MAP = { A: 0, B: 1, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const GAMEPAD_REPEAT_INITIAL = 220;
const GAMEPAD_REPEAT_RATE    = 100;

export function installGamepadController(APP, navController) {
    const {
        setFocusGroup,
        cycleFocusGroup,
        moveFocusWithinGroup,
        activateFocusedControl,
        applyFocusVisual,
        dismissGuideOrHelpModal,
    } = navController;

    function isModalActive() {
        return APP.UI.isModalOpen('guideModal')
            || APP.UI.isModalOpen('editorHelpModal')
            || APP.UI.isModalOpen('winModal')
            || APP.UI.isModalOpen('themeModal')
            || APP.UI.isModalOpen('unsavedModal')
            || APP.UI.isModalOpen('publishedLevelsModal');
    }

    function gamepadMoveGrid(dx, dy) {
        if (isModalActive()) return;
        const l = APP.State.ENGINE.mode === APP.Core.PLAY
            ? APP.State.ENGINE.level
            : APP.State.ENGINE.editor.workingLevel;
        if (!l) return;
        if (!APP.State.ENGINE.path.length) {
            const firstGate = l.gateKeys && l.gateKeys.length ? APP.LevelUtils.UNPACK(l.gateKeys[0]) : null;
            if (!firstGate) return;
            APP.State.ENGINE.activeGateKey = l.gateKeys[0];
            APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, l.gateKeys[0], false);
            APP.Engine.setLogicState(APP.Core.DRAGGING);
        }
        const head = APP.LevelUtils.UNPACK(APP.State.ENGINE.path[APP.State.ENGINE.path.length - 1]);
        APP.Engine.attemptMoveTo({ x: head.x + dx, y: head.y + dy });
    }

    function handleGamepadDirection(dir) {
        if (APP.State.ENGINE.ui.focusGroup === 'GRID') {
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
        if (now - APP.State.ENGINE.ui.bLastPressTime <= 320) {
            if (APP.State.ENGINE.ui.bSingleTimer) {
                clearTimeout(APP.State.ENGINE.ui.bSingleTimer);
                APP.State.ENGINE.ui.bSingleTimer = null;
            }
            cycleFocusGroup();
            APP.State.ENGINE.ui.bLastPressTime = 0;
            return;
        }
        APP.State.ENGINE.ui.bLastPressTime = now;
        APP.State.ENGINE.ui.bSingleTimer = setTimeout(() => {
            dismissGuideOrHelpModal();
            APP.State.ENGINE.ui.bSingleTimer = null;
        }, 320);
    }

    function pollGamepadInput() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad  = pads && pads[0];
        if (!pad) return;
        APP.State.ENGINE.gamepad.hasPad = true;
        const now = Date.now();

        const pressed    = idx => !!pad.buttons[idx] && pad.buttons[idx].pressed;
        const wasPressed = idx => !!APP.State.ENGINE.gamepad.lastButtons[idx];
        const anyPressed = pad.buttons.some(b => !!b && b.pressed);
        if (anyPressed) APP.State.ENGINE.gamepad.hasPad = true;

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
                    APP.State.ENGINE.gamepad.nextMoveAt = now + GAMEPAD_REPEAT_INITIAL;
                }
            }
        }
        if (activeDir && now >= APP.State.ENGINE.gamepad.nextMoveAt) {
            handleGamepadDirection(activeDir);
            APP.State.ENGINE.gamepad.nextMoveAt = now + GAMEPAD_REPEAT_RATE;
        }

        APP.State.ENGINE.gamepad.lastButtons = pad.buttons.map(b => b.pressed);
    }

    function hasConnectedGamepad() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        return !!(pads && Array.from(pads).some(pad => !!pad));
    }

    function stopGamepadPollingLoop() {
        if (APP.State.ENGINE.gamepad.rafId !== null) cancelAnimationFrame(APP.State.ENGINE.gamepad.rafId);
        APP.State.ENGINE.gamepad.rafId    = null;
        APP.State.ENGINE.gamepad.rafActive = false;
    }

    function gamepadPollingTick() {
        pollGamepadInput();
        if (!hasConnectedGamepad()) {
            APP.State.ENGINE.gamepad.hasPad      = false;
            APP.State.ENGINE.gamepad.lastButtons = [];
            stopGamepadPollingLoop();
            return;
        }
        APP.State.ENGINE.gamepad.rafId = requestAnimationFrame(gamepadPollingTick);
    }

    function startGamepadPollingLoop() {
        if (APP.State.ENGINE.gamepad.rafActive) return;
        APP.State.ENGINE.gamepad.rafActive = true;
        APP.State.ENGINE.gamepad.rafId     = requestAnimationFrame(gamepadPollingTick);
    }

    window.addEventListener('gamepadconnected', () => {
        APP.State.ENGINE.gamepad.hasPad = true;
        pollGamepadInput();
        startGamepadPollingLoop();
        setFocusGroup(APP.State.ENGINE.ui.focusGroup || 'GRID', APP.State.ENGINE.ui.focusIndex || 0);
    });
    window.addEventListener('gamepaddisconnected', () => {
        if (hasConnectedGamepad()) return;
        APP.State.ENGINE.gamepad.hasPad          = false;
        APP.State.ENGINE.gamepad.lastButtons     = [];
        APP.State.ENGINE.ui.gamepadFocusEnabled  = false;
        applyFocusVisual(null);
        stopGamepadPollingLoop();
    });

    if (hasConnectedGamepad()) startGamepadPollingLoop();
}
