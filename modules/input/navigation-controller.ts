import { activeLevel, type RequireDeps } from '../state.js';
import { DRAGGING, EDITOR, IDLE, OVERLAY_NONE, PLAY, REVIEW } from '../app-constants.js';
// Navigation controller: focus management, viewport resize, level navigation,
// mode switching, unsaved-changes guard, guide/win modal wiring.
import { popNavigationUndoStack, setGamepadFocusEnabled, setNavigationActiveGateKey, setUiFocusGroupState, setUiFocusIndex } from '../state-actions.js';
import { prevIndexWrap, nextIndexWrap, validIndexWrap, needsUnsavedGuard, clampFocusIndex, nextGroupIndex, wrapWithinGroup } from './navigation-core.js';
import { UNPACK } from '../domain/cell-key.js';

export function createNavigationController({ state, ui, engine, data, editor, renderer }: RequireDeps<'data'>) {

    // --- Unsaved-changes guard ---

    const tryNavigate = (actionFn: any) => {
        if (needsUnsavedGuard(state.ENGINE.mode, state.ENGINE.editor.isModified, EDITOR)) {
            engine.setPendingAction(actionFn);
            ui.openModal('unsavedModal');
        } else {
            actionFn();
        }
    };

    (document.getElementById('unsavedStayBtn') as any).onclick = () => {
        ui.closeAllModals();
        engine.clearPendingAction();
        ui.closeModal('unsavedModal');
    };
    (document.getElementById('unsavedLeaveBtn') as any).onclick = () => {
        ui.closeAllModals();
        ui.closeModal('unsavedModal');
        engine.executePendingAction();
    };

    // --- Gamepad focus groups ---

    function getFocusableGroups() {
        const groups = [
            { name: 'GRID', elements: [(document.getElementById('gameCanvas') as any)] },
            { name: 'CONTROLS', elements: Array.from((document.querySelectorAll('#playControls button, #playControls [role="button"], #openThemeModalBtn') as any)).filter((el) => !(el as HTMLElement).classList.contains('hidden') && (el as HTMLElement).offsetParent !== null) },
            { name: 'LEVEL', elements: [(document.getElementById('prevLevelBtn') as any), (document.getElementById('nextLevelBtn') as any)].filter(Boolean) }
        ];
        if (state.ENGINE.mode === EDITOR) {
            groups.push({ name: 'METRICS', elements: [(document.getElementById('editReqLen') as any), (document.getElementById('editReqInt') as any)].filter(Boolean) });
        }
        return groups.filter((g: any) => g.elements.length > 0);
    }

    function applyFocusVisual(el: HTMLElement | null) {
        (document.querySelectorAll('.gamepad-focus') as any).forEach((node: Element) =>
            ui.removeClasses(node, ['gamepad-focus', 'ring-4', 'ring-sky-400', 'ring-offset-2'])
        );
        if (!state.ENGINE.ui.gamepadFocusEnabled || !el) return;
        ui.addClasses(el, ['gamepad-focus', 'ring-4', 'ring-sky-400', 'ring-offset-2']);
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    }

    function setFocusGroup(groupName: any, index: any = 0, forceVisual: any = false) {
        const groups = getFocusableGroups();
        const gIdx   = Math.max(0, groups.findIndex((g: any) => g.name === groupName));
        const group  = groups[gIdx] || groups[0];
        if (!group) return;
        setUiFocusGroupState(state, group.name, clampFocusIndex(index, group.elements.length));
        if (forceVisual) setGamepadFocusEnabled(state, true);
        applyFocusVisual(group.elements[state.ENGINE.ui.focusIndex]);
    }

    function cycleFocusGroup() {
        const groups = getFocusableGroups();
        if (!groups.length) return;
        const idx  = groups.findIndex((g: any) => g.name === state.ENGINE.ui.focusGroup);
        const next = groups[nextGroupIndex(idx, groups.length)];
        setFocusGroup(next.name, 0, true);
    }

    function moveFocusWithinGroup(delta: any) {
        const groups = getFocusableGroups();
        const group  = groups.find((g: any) => g.name === state.ENGINE.ui.focusGroup);
        if (!group || !group.elements.length) return;
        setUiFocusIndex(state, wrapWithinGroup(state.ENGINE.ui.focusIndex, delta, group.elements.length));
        applyFocusVisual(group.elements[state.ENGINE.ui.focusIndex]);
    }

    function activateFocusedControl() {
        const groups = getFocusableGroups();
        const group  = groups.find((g: any) => g.name === state.ENGINE.ui.focusGroup);
        const el     = group?.elements?.[state.ENGINE.ui.focusIndex];
        if (!el) return;
        if (el.id === 'gameCanvas') { state.ENGINE.ui.gamepadGridPrimaryAction?.(); return; }
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

    (document.getElementById('prevLevelBtn') as any).onclick = () => tryNavigate(() => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== OVERLAY_NONE || state.ENGINE.solver.controller) return;
        if (state.ENGINE.mode === REVIEW) {
            const subs = state.ENGINE.review.submissions;
            if (!subs.length) return;
            engine.review.loadReviewLevel(prevIndexWrap(state.ENGINE.review.currentIdx, subs.length));
        } else {
            const levels = data.getLevels();
            engine.game.loadLevel(validIndexWrap(state.ENGINE.levelIdx, levels.length, -1, (idx) => !!levels[idx]));
            ui.setSolutionOutput('');
        }
    });

    (document.getElementById('nextLevelBtn') as any).onclick = () => tryNavigate(() => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== OVERLAY_NONE || state.ENGINE.solver.controller) return;
        if (state.ENGINE.mode === REVIEW) {
            const subs = state.ENGINE.review.submissions;
            if (!subs.length) return;
            engine.review.loadReviewLevel(nextIndexWrap(state.ENGINE.review.currentIdx, subs.length));
        } else {
            const levels = data.getLevels();
            engine.game.loadLevel(validIndexWrap(state.ENGINE.levelIdx, levels.length, 1, (idx) => !!levels[idx]));
            ui.setSolutionOutput('');
        }
    });

    // --- Win modal ---

    const handleWinClose = (callback: any) => {
        const circle = (document.getElementById('winCircle') as any);
        circle.classList.add('animate-spin-grow-fade');
        setTimeout(() => {
            circle.classList.remove('animate-spin-grow-fade');
            ui.closeModal('winModal');
            callback();
        }, 1000);
    };

    (document.getElementById('nextLevelModalBtn') as any).onclick = () => {
        const levels = data.getLevels();
        handleWinClose(() => { if (state.ENGINE.levelIdx < levels.length - 1) engine.game.loadLevel(state.ENGINE.levelIdx + 1); });
    };
    (document.getElementById('dismissWinModalBtn') as any).onclick = () => handleWinClose(() => engine.setLogicState(IDLE));
    (document.getElementById('copyWinDataBtn') as any).onclick = async () => {
        const val = (document.getElementById('winSolutionOutput') as any).value;
        if (val) await ui.copyText(val, { fallbackElId: 'winSolutionOutput' });
    };

    // --- Guide modal ---

    (document.getElementById('guideBtn') as any).onclick = () => {
        const isVisible = ui.isModalOpen('guideModal');
        ui.closeAllModals();
        if (!isVisible) ui.openModal('guideModal');
    };
    (document.getElementById('closeGuideX') as any).onclick = () => ui.closeModal('guideModal');

    // --- Mode toggle ---

    (document.getElementById('modeToggleShellBtn') as any).onclick = () => {
        if (state.ENGINE.mode === REVIEW) {
            tryNavigate(() => {
                ui.closeAllModals();
                engine.switchMode(PLAY);
            });
        } else if (state.ENGINE.mode === EDITOR) {
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

    function moveGridHead(dx: any, dy: any) {
        if (anyModalOpen() || state.ENGINE.overlayState !== OVERLAY_NONE) return;
        const level = activeLevel(state.ENGINE);
        if (!level) return;
        if (!state.ENGINE.nav.path.length) {
            const gateKey = level.gateKeys?.length ? level.gateKeys[0] : null;
            if (gateKey == null) return;
            setNavigationActiveGateKey(state, gateKey);
            engine.navigation.PathNavigator.pushStep(state.ENGINE, gateKey, false);
            engine.setLogicState(DRAGGING);
        }
        const head = UNPACK(state.ENGINE.nav.path[state.ENGINE.nav.path.length - 1]);
        engine.game.attemptMoveTo({ x: head.x + dx, y: head.y + dy });
    }

    const ARROW_DELTAS: Record<string, number[]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    document.addEventListener('keydown', (e: KeyboardEvent) => {
        if (document.activeElement !== renderer.getCanvas()) return;
        const delta = ARROW_DELTAS[e.key];
        if (delta) { e.preventDefault(); moveGridHead(delta[0], delta[1]); return; }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            const snapshot = popNavigationUndoStack(state);
            if (snapshot) engine.game.applySnapshot(snapshot);
        }
    });

    // --- Tabindex setup ---

    [renderer.getCanvas(), (document.getElementById('hintBtn') as any), (document.getElementById('editCopyMetrics') as any)].forEach((el: HTMLElement) => {
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
