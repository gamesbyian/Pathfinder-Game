// Navigation controller: focus management, viewport resize, level navigation,
// mode switching, unsaved-changes guard, guide/win modal wiring.
import { popNavigationUndoStack, setGamepadFocusEnabled, setNavigationActiveGateKey, setUiFocusGroupState, setUiFocusIndex } from '../state-actions.js';

export function createNavigationController({ core, state, ui, engine, levelUtils, editor, renderer }) {

    // --- Unsaved-changes guard ---

    const tryNavigate = (actionFn) => {
        if (state.ENGINE.mode === core.EDITOR && state.ENGINE.editor.isModified) {
            engine.setPendingAction(actionFn);
            ui.openModal('unsavedModal');
        } else {
            actionFn();
        }
    };

    document.getElementById('unsavedStayBtn').onclick = () => {
        ui.closeAllModals();
        engine.clearPendingAction();
        ui.closeModal('unsavedModal');
    };
    document.getElementById('unsavedLeaveBtn').onclick = () => {
        ui.closeAllModals();
        ui.closeModal('unsavedModal');
        engine.executePendingAction();
    };

    // --- Gamepad focus groups ---

    function getFocusableGroups() {
        const groups = [
            { name: 'GRID', elements: [document.getElementById('gameCanvas')] },
            { name: 'CONTROLS', elements: Array.from(document.querySelectorAll('#playControls button, #playControls [role="button"], #openThemeModalBtn')).filter(el => !el.classList.contains('hidden') && el.offsetParent !== null) },
            { name: 'LEVEL', elements: [document.getElementById('prevLevelBtn'), document.getElementById('nextLevelBtn')].filter(Boolean) }
        ];
        if (state.ENGINE.mode === core.EDITOR) {
            groups.push({ name: 'METRICS', elements: [document.getElementById('editReqLen'), document.getElementById('editReqInt')].filter(Boolean) });
        }
        return groups.filter(g => g.elements.length > 0);
    }

    function applyFocusVisual(el) {
        document.querySelectorAll('.gamepad-focus').forEach(node =>
            ui.removeClasses(node, ['gamepad-focus', 'ring-4', 'ring-sky-400', 'ring-offset-2'])
        );
        if (!state.ENGINE.ui.gamepadFocusEnabled || !el) return;
        ui.addClasses(el, ['gamepad-focus', 'ring-4', 'ring-sky-400', 'ring-offset-2']);
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    }

    function setFocusGroup(groupName, index = 0, forceVisual = false) {
        const groups = getFocusableGroups();
        const gIdx   = Math.max(0, groups.findIndex(g => g.name === groupName));
        const group  = groups[gIdx] || groups[0];
        if (!group) return;
        setUiFocusGroupState(state, group.name, Math.max(0, Math.min(index, group.elements.length - 1)));
        if (forceVisual) setGamepadFocusEnabled(state, true);
        applyFocusVisual(group.elements[state.ENGINE.ui.focusIndex]);
    }

    function cycleFocusGroup() {
        const groups = getFocusableGroups();
        if (!groups.length) return;
        const idx  = groups.findIndex(g => g.name === state.ENGINE.ui.focusGroup);
        const next = groups[(idx + 1 + groups.length) % groups.length];
        setFocusGroup(next.name, 0, true);
    }

    function moveFocusWithinGroup(delta) {
        const groups = getFocusableGroups();
        const group  = groups.find(g => g.name === state.ENGINE.ui.focusGroup);
        if (!group || !group.elements.length) return;
        setUiFocusIndex(state, (state.ENGINE.ui.focusIndex + delta + group.elements.length) % group.elements.length);
        applyFocusVisual(group.elements[state.ENGINE.ui.focusIndex]);
    }

    function activateFocusedControl() {
        const groups = getFocusableGroups();
        const group  = groups.find(g => g.name === state.ENGINE.ui.focusGroup);
        const el     = group?.elements?.[state.ENGINE.ui.focusIndex];
        if (!el) return;
        if (el.id === 'gameCanvas') { state.ENGINE.ui.gamepadGridPrimaryAction(); return; }
        el.click();
    }

    function dismissGuideOrHelpModal() {
        if (ui.isModalOpen('guideModal'))      { ui.closeModal('guideModal');      return true; }
        if (ui.isModalOpen('editorHelpModal')) { ui.closeModal('editorHelpModal'); return true; }
        return false;
    }

    // --- Viewport resize ---

    const viewportUpdateHandler = () => {
        ui.updateAppScale();
        setFocusGroup(state.ENGINE.ui.focusGroup || 'GRID', state.ENGINE.ui.focusIndex || 0);
    };
    window.addEventListener('resize', viewportUpdateHandler);
    window.addEventListener('orientationchange', viewportUpdateHandler);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', viewportUpdateHandler);
        window.visualViewport.addEventListener('scroll', viewportUpdateHandler);
    }
    ui.updateAppScale();

    // --- Level navigation ---

    document.getElementById('prevLevelBtn').onclick = () => tryNavigate(() => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        if (state.ENGINE.mode === core.REVIEW) {
            const subs = state.ENGINE.review.submissions;
            if (!subs.length) return;
            engine.review.loadReviewLevel(state.ENGINE.review.currentIdx > 0 ? state.ENGINE.review.currentIdx - 1 : subs.length - 1);
        } else {
            const levels = levelUtils.getRawLevels();
            engine.loadLevel(state.ENGINE.levelIdx > 0 ? state.ENGINE.levelIdx - 1 : levels.length - 1);
            ui.setSolutionOutput('');
        }
    });

    document.getElementById('nextLevelBtn').onclick = () => tryNavigate(() => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || state.ENGINE.solver.controller) return;
        if (state.ENGINE.mode === core.REVIEW) {
            const subs = state.ENGINE.review.submissions;
            if (!subs.length) return;
            engine.review.loadReviewLevel(state.ENGINE.review.currentIdx < subs.length - 1 ? state.ENGINE.review.currentIdx + 1 : 0);
        } else {
            const levels = levelUtils.getRawLevels();
            engine.loadLevel(state.ENGINE.levelIdx < levels.length - 1 ? state.ENGINE.levelIdx + 1 : 0);
            ui.setSolutionOutput('');
        }
    });

    // --- Win modal ---

    const handleWinClose = (callback) => {
        const circle = document.getElementById('winCircle');
        circle.classList.add('animate-spin-grow-fade');
        setTimeout(() => {
            circle.classList.remove('animate-spin-grow-fade');
            ui.closeModal('winModal');
            callback();
        }, 1000);
    };

    document.getElementById('nextLevelModalBtn').onclick = () => {
        const levels = levelUtils.getRawLevels();
        handleWinClose(() => { if (state.ENGINE.levelIdx < levels.length - 1) engine.loadLevel(state.ENGINE.levelIdx + 1); });
    };
    document.getElementById('dismissWinModalBtn').onclick = () => handleWinClose(() => engine.setLogicState(core.IDLE));
    document.getElementById('copyWinDataBtn').onclick = async () => {
        const val = document.getElementById('winSolutionOutput').value;
        if (val) await ui.copyText(val, { fallbackElId: 'winSolutionOutput' });
    };

    // --- Guide modal ---

    document.getElementById('guideBtn').onclick = () => {
        const isVisible = ui.isModalOpen('guideModal');
        ui.closeAllModals();
        if (!isVisible) ui.openModal('guideModal');
    };
    document.getElementById('closeGuideX').onclick = () => ui.closeModal('guideModal');

    // --- Mode toggle ---

    document.getElementById('modeToggleShellBtn').onclick = () => {
        if (state.ENGINE.mode === core.REVIEW) {
            tryNavigate(() => {
                ui.closeAllModals();
                engine.switchMode(core.PLAY);
            });
        } else if (state.ENGINE.mode === core.EDITOR) {
            tryNavigate(() => { ui.closeAllModals(); editor.exitEditorMode(); });
        } else {
            ui.closeAllModals();
            editor.enterEditorMode();
        }
    };

    // --- Keyboard navigation ---
    // The grid (canvas) is keyboard-playable: while it holds focus, arrow keys move the path
    // head (same effect as the gamepad d-pad in the GRID group) and Backspace/Delete undoes
    // the last step. Native Tab already moves between the real <button> controls; the
    // focus-visible styling in styles/components.css makes that focus visible.

    const anyModalOpen = () =>
        !!document.querySelector('.screen-modal:not(.hidden), .modal-overlay:not(.hidden)');

    function moveGridHead(dx, dy) {
        if (anyModalOpen() || state.ENGINE.overlayState !== core.OVERLAY_NONE) return;
        const level = state.ENGINE.mode === core.PLAY ? state.ENGINE.level : state.ENGINE.editor.workingLevel;
        if (!level) return;
        if (!state.ENGINE.nav.path.length) {
            const gateKey = level.gateKeys?.length ? level.gateKeys[0] : null;
            if (gateKey == null) return;
            setNavigationActiveGateKey(state, gateKey);
            engine.navigation.PathNavigator.pushStep(state.ENGINE, gateKey, false);
            engine.setLogicState(core.DRAGGING);
        }
        const head = levelUtils.UNPACK(state.ENGINE.nav.path[state.ENGINE.nav.path.length - 1]);
        engine.attemptMoveTo({ x: head.x + dx, y: head.y + dy });
    }

    const ARROW_DELTAS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    document.addEventListener('keydown', (e) => {
        if (document.activeElement !== renderer.getCanvas()) return;
        const delta = ARROW_DELTAS[e.key];
        if (delta) { e.preventDefault(); moveGridHead(delta[0], delta[1]); return; }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            const snapshot = popNavigationUndoStack(state);
            if (snapshot) engine.applySnapshot(snapshot);
        }
    });

    // --- Tabindex setup ---

    [renderer.getCanvas(), document.getElementById('hintBtn'), document.getElementById('editCopyMetrics')].forEach(el => {
        if (!el) return;
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    });

    setFocusGroup('CONTROLS', 0);

    return {
        tryNavigate,
        setFocusGroup,
        cycleFocusGroup,
        moveFocusWithinGroup,
        activateFocusedControl,
        applyFocusVisual,
        dismissGuideOrHelpModal,
        moveGridHead,
    };
}
