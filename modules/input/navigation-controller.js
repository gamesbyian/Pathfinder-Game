// Navigation controller: focus management, viewport resize, level navigation,
// mode switching, unsaved-changes guard, guide/win modal wiring.

export function createNavigationController({ core, state, ui, engine, levelUtils, editor, renderer }) {

    // --- Unsaved-changes guard ---

    const tryNavigate = (actionFn) => {
        if (state.ENGINE.mode === core.EDITOR && state.ENGINE.editor.isModified) {
            state.ENGINE.runtime.pendingAction = actionFn;
            ui.openModal('unsavedModal');
        } else {
            actionFn();
        }
    };

    document.getElementById('unsavedStayBtn').onclick = () => {
        ui.closeAllModals();
        state.ENGINE.runtime.pendingAction = null;
        ui.closeModal('unsavedModal');
    };
    document.getElementById('unsavedLeaveBtn').onclick = () => {
        ui.closeAllModals();
        ui.closeModal('unsavedModal');
        if (state.ENGINE.runtime.pendingAction) state.ENGINE.runtime.pendingAction();
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
        state.ENGINE.ui.focusGroup = group.name;
        state.ENGINE.ui.focusIndex = Math.max(0, Math.min(index, group.elements.length - 1));
        if (forceVisual) state.ENGINE.ui.gamepadFocusEnabled = true;
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
        state.ENGINE.ui.focusIndex = (state.ENGINE.ui.focusIndex + delta + group.elements.length) % group.elements.length;
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
            engine.loadReviewLevel(state.ENGINE.review.currentIdx > 0 ? state.ENGINE.review.currentIdx - 1 : subs.length - 1);
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
            engine.loadReviewLevel(state.ENGINE.review.currentIdx < subs.length - 1 ? state.ENGINE.review.currentIdx + 1 : 0);
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
    };
}
