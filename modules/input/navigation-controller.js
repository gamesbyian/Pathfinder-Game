// Navigation controller: focus management, viewport resize, level navigation,
// mode switching, unsaved-changes guard, guide/win modal wiring.

export function installNavigationController(APP) {

    // --- Unsaved-changes guard ---

    const tryNavigate = (actionFn) => {
        if (APP.State.ENGINE.mode === APP.Core.EDITOR && APP.State.ENGINE.editor.isModified) {
            APP.State.ENGINE.runtime.pendingAction = actionFn;
            APP.UI.openModal('unsavedModal');
        } else {
            actionFn();
        }
    };

    document.getElementById('unsavedStayBtn').onclick = () => {
        APP.UI.closeAllModals();
        APP.State.ENGINE.runtime.pendingAction = null;
        APP.UI.closeModal('unsavedModal');
    };
    document.getElementById('unsavedLeaveBtn').onclick = () => {
        APP.UI.closeAllModals();
        APP.UI.closeModal('unsavedModal');
        if (APP.State.ENGINE.runtime.pendingAction) APP.State.ENGINE.runtime.pendingAction();
    };

    // --- Gamepad focus groups ---

    function getFocusableGroups() {
        const groups = [
            { name: 'GRID', elements: [document.getElementById('gameCanvas')] },
            { name: 'CONTROLS', elements: Array.from(document.querySelectorAll('#playControls button, #playControls [role="button"], #openThemeModalBtn')).filter(el => !el.classList.contains('hidden') && el.offsetParent !== null) },
            { name: 'LEVEL', elements: [document.getElementById('prevLevelBtn'), document.getElementById('nextLevelBtn')].filter(Boolean) }
        ];
        if (APP.State.ENGINE.mode === APP.Core.EDITOR) {
            groups.push({ name: 'METRICS', elements: [document.getElementById('editReqLen'), document.getElementById('editReqInt')].filter(Boolean) });
        }
        return groups.filter(g => g.elements.length > 0);
    }

    function applyFocusVisual(el) {
        document.querySelectorAll('.gamepad-focus').forEach(node =>
            APP.UI.removeClasses(node, ['gamepad-focus', 'ring-4', 'ring-sky-400', 'ring-offset-2'])
        );
        if (!APP.State.ENGINE.ui.gamepadFocusEnabled || !el) return;
        APP.UI.addClasses(el, ['gamepad-focus', 'ring-4', 'ring-sky-400', 'ring-offset-2']);
        if (typeof el.focus === 'function') el.focus({ preventScroll: true });
    }

    function setFocusGroup(groupName, index = 0, forceVisual = false) {
        const groups = getFocusableGroups();
        const gIdx = Math.max(0, groups.findIndex(g => g.name === groupName));
        const group = groups[gIdx] || groups[0];
        if (!group) return;
        APP.State.ENGINE.ui.focusGroup = group.name;
        APP.State.ENGINE.ui.focusIndex = Math.max(0, Math.min(index, group.elements.length - 1));
        if (forceVisual) APP.State.ENGINE.ui.gamepadFocusEnabled = true;
        applyFocusVisual(group.elements[APP.State.ENGINE.ui.focusIndex]);
    }

    function cycleFocusGroup() {
        const groups = getFocusableGroups();
        if (!groups.length) return;
        const idx = groups.findIndex(g => g.name === APP.State.ENGINE.ui.focusGroup);
        const next = groups[(idx + 1 + groups.length) % groups.length];
        setFocusGroup(next.name, 0, true);
    }

    function moveFocusWithinGroup(delta) {
        const groups = getFocusableGroups();
        const group = groups.find(g => g.name === APP.State.ENGINE.ui.focusGroup);
        if (!group || !group.elements.length) return;
        APP.State.ENGINE.ui.focusIndex = (APP.State.ENGINE.ui.focusIndex + delta + group.elements.length) % group.elements.length;
        applyFocusVisual(group.elements[APP.State.ENGINE.ui.focusIndex]);
    }

    function activateFocusedControl() {
        const groups = getFocusableGroups();
        const group = groups.find(g => g.name === APP.State.ENGINE.ui.focusGroup);
        const el = group?.elements?.[APP.State.ENGINE.ui.focusIndex];
        if (!el) return;
        if (el.id === 'gameCanvas') { APP.State.ENGINE.ui.gamepadGridPrimaryAction(); return; }
        el.click();
    }

    function dismissGuideOrHelpModal() {
        if (APP.UI.isModalOpen('guideModal')) { APP.UI.closeModal('guideModal'); return true; }
        if (APP.UI.isModalOpen('editorHelpModal')) { APP.UI.closeModal('editorHelpModal'); return true; }
        return false;
    }

    // --- Viewport resize ---

    const viewportUpdateHandler = () => {
        APP.UI.updateAppScale();
        setFocusGroup(APP.State.ENGINE.ui.focusGroup || 'GRID', APP.State.ENGINE.ui.focusIndex || 0);
    };
    window.addEventListener('resize', viewportUpdateHandler);
    window.addEventListener('orientationchange', viewportUpdateHandler);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', viewportUpdateHandler);
        window.visualViewport.addEventListener('scroll', viewportUpdateHandler);
    }
    APP.UI.updateAppScale();

    // --- Level navigation ---

    document.getElementById('prevLevelBtn').onclick = () => tryNavigate(() => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return;
        if (APP.State.ENGINE.mode === APP.Core.REVIEW) {
            const subs = APP.State.ENGINE.review.submissions;
            if (!subs.length) return;
            APP.Engine.loadReviewLevel(APP.State.ENGINE.review.currentIdx > 0 ? APP.State.ENGINE.review.currentIdx - 1 : subs.length - 1);
        } else {
            const levels = APP.LevelUtils.getRawLevels();
            APP.Engine.loadLevel(APP.State.ENGINE.levelIdx > 0 ? APP.State.ENGINE.levelIdx - 1 : levels.length - 1);
            APP.UI.setSolutionOutput('');
        }
    });

    document.getElementById('nextLevelBtn').onclick = () => tryNavigate(() => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return;
        if (APP.State.ENGINE.mode === APP.Core.REVIEW) {
            const subs = APP.State.ENGINE.review.submissions;
            if (!subs.length) return;
            APP.Engine.loadReviewLevel(APP.State.ENGINE.review.currentIdx < subs.length - 1 ? APP.State.ENGINE.review.currentIdx + 1 : 0);
        } else {
            const levels = APP.LevelUtils.getRawLevels();
            APP.Engine.loadLevel(APP.State.ENGINE.levelIdx < levels.length - 1 ? APP.State.ENGINE.levelIdx + 1 : 0);
            APP.UI.setSolutionOutput('');
        }
    });

    // --- Win modal ---

    const handleWinClose = (callback) => {
        const circle = document.getElementById('winCircle');
        circle.classList.add('animate-spin-grow-fade');
        setTimeout(() => {
            circle.classList.remove('animate-spin-grow-fade');
            APP.UI.closeModal('winModal');
            callback();
        }, 1000);
    };

    document.getElementById('nextLevelModalBtn').onclick = () => {
        const levels = APP.LevelUtils.getRawLevels();
        handleWinClose(() => { if (APP.State.ENGINE.levelIdx < levels.length - 1) APP.Engine.loadLevel(APP.State.ENGINE.levelIdx + 1); });
    };
    document.getElementById('dismissWinModalBtn').onclick = () => handleWinClose(() => APP.Engine.setLogicState(APP.Core.IDLE));
    document.getElementById('copyWinDataBtn').onclick = async () => {
        const val = document.getElementById('winSolutionOutput').value;
        if (val) await APP.UI.copyText(val, { fallbackElId: 'winSolutionOutput' });
    };

    // --- Guide modal ---

    document.getElementById('guideBtn').onclick = () => {
        const isVisible = APP.UI.isModalOpen('guideModal');
        APP.UI.closeAllModals();
        if (!isVisible) APP.UI.openModal('guideModal');
    };
    document.getElementById('closeGuideX').onclick = () => APP.UI.closeModal('guideModal');

    // --- Mode toggle ---

    document.getElementById('modeToggleShellBtn').onclick = () => {
        if (APP.State.ENGINE.mode === APP.Core.REVIEW) {
            tryNavigate(() => {
                APP.UI.closeAllModals();
                APP.State.ENGINE.levelIdx = APP.State.ENGINE.review.savedPlayLevelIdx;
                APP.Engine.switchMode(APP.Core.PLAY);
            });
        } else if (APP.State.ENGINE.mode === APP.Core.EDITOR) {
            tryNavigate(() => { APP.UI.closeAllModals(); APP.Editor.exitEditorMode(); });
        } else {
            APP.UI.closeAllModals();
            APP.Editor.enterEditorMode();
        }
    };

    // --- Tabindex setup ---

    [APP.Renderer.getCanvas(), document.getElementById('hintBtn'), document.getElementById('editCopyMetrics')].forEach(el => {
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
