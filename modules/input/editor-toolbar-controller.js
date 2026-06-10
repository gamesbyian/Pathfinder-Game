// Editor toolbar controller: grid transforms, palette drag, pencil/eraser,
// undo/reset/new-level, help modal, metrics copy, trap-spot solver, and
// live editor-input bindings.

export function createEditorToolbarController({ core, state, ui, engine, levelUtils, editor, solverV2 }, { tryNavigate }) {

    // --- Grid transform buttons ---

    document.getElementById('gridRotateBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || !state.ENGINE.editor.workingLevel) return;
        const l = state.ENGINE.editor.workingLevel;
        levelUtils.transformLevel(l, (x, y) => ({ x: l.grid.h - 1 - y, y: x }), l.grid.h, l.grid.w, a => a === core.H ? core.V : core.H);
        ui.showMessage('Rotated', 'text-white font-black');
    };

    document.getElementById('gridMirrorBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || !state.ENGINE.editor.workingLevel) return;
        const l = state.ENGINE.editor.workingLevel;
        state.ENGINE.editor.mirrorHorizontal = !state.ENGINE.editor.mirrorHorizontal;
        ui.setInlineStyle('mirrorIconSvg', 'transform', state.ENGINE.editor.mirrorHorizontal ? 'rotate(90deg)' : 'rotate(0deg)');
        if (state.ENGINE.editor.mirrorHorizontal) {
            levelUtils.transformLevel(l, (x, y) => ({ x: l.grid.w - 1 - x, y }), l.grid.w, l.grid.h, a => a);
        } else {
            levelUtils.transformLevel(l, (x, y) => ({ x, y: l.grid.h - 1 - y }), l.grid.w, l.grid.h, a => a);
        }
        ui.showMessage('Mirrored', 'text-white font-black');
    };

    document.getElementById('gridSizeMinusBtn').onclick = () => { ui.closeAllModals(); levelUtils.changeGridSize(-1); };
    document.getElementById('gridSizePlusBtn').onclick  = () => { ui.closeAllModals(); levelUtils.changeGridSize(1); };

    // --- Pencil ---

    document.getElementById('editPencilBtn').onclick = () => { ui.closeAllModals(); editor.togglePencilMode(); };

    // --- Eraser (tap = undo last step; long-press = clear all) ---

    const eraserBtn = document.getElementById('editEraserBtn');
    let eraserTimer = null;
    let eraserFired = false;

    eraserBtn.addEventListener('pointerdown', () => {
        if (state.ENGINE.mode !== core.EDITOR && state.ENGINE.mode !== core.REVIEW) return;
        eraserTimer = setTimeout(() => {
            engine.PathNavigator.clear(state.ENGINE);
            ui.showMessage('Cleared', 'text-white font-black');
            eraserFired = true;
        }, 1500);
    });
    const handleEraserRelease = () => {
        if (eraserTimer) {
            clearTimeout(eraserTimer);
            if (!eraserFired) {
                if (state.ENGINE.path.length > 1) {
                    engine.PathNavigator.truncateTo(state.ENGINE, state.ENGINE.path.length - 2);
                } else {
                    engine.PathNavigator.clear(state.ENGINE);
                }
            }
            eraserTimer = null;
            eraserFired = false;
        }
    };
    eraserBtn.addEventListener('pointerup',    handleEraserRelease);
    eraserBtn.addEventListener('pointerleave', handleEraserRelease);

    // --- Grid history / lifecycle ---

    document.getElementById('editUndoGridBtn').onclick = () => { ui.closeAllModals(); editor.restoreEditorState(); };
    document.getElementById('editResetGrid').onclick   = () => { ui.closeAllModals(); editor.resetWorkingGrid(); ui.showMessage('Reset', 'text-white font-black'); };
    document.getElementById('editNewLevel').onclick    = () => tryNavigate(() => {
        ui.closeAllModals();
        editor.createNewLevel();
        ui.showMessage('New Level Created', 'text-white font-black');
    });

    // --- Editor help modal ---

    document.getElementById('editHelpBtn').onclick = () => {
        const isVisible = ui.isModalOpen('editorHelpModal');
        ui.closeAllModals();
        if (!isVisible) ui.openModal('editorHelpModal');
    };
    document.getElementById('closeEditorHelpX').onclick = () => ui.closeModal('editorHelpModal');

    // --- Copy current path metrics to inputs ---

    document.getElementById('editCopyMetrics').onclick = () => {
        ui.closeAllModals();
        if (!state.ENGINE.path.length) return;
        ui.setInputValue('editReqLen', engine.getRealLength());
        ui.setInputValue('editReqInt', state.ENGINE.intersections);
        editor.applyMetricsFromUI();
        ui.showMessage('Metrics Set', 'text-white font-black');
    };

    // --- Live editor input bindings ---

    ui.bindAll('.editor-input', 'input', () => {
        editor.markEditorInputsDirty();
        editor.applyMetricsFromUI();
    });
    ui.bindAll('#levelMetadataPanel input', 'input', () => {
        editor.markEditorInputsDirty();
        editor.applyMetadataFromUI();
    });

    // --- Palette drag-and-drop ---

    const palettePointerStarts = new Map();
    ui.bindAll('.palette-item[data-type]', 'pointerdown', (e, el) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        palettePointerStarts.set(e.pointerId, { type: el.dataset.type, x: e.clientX, y: e.clientY, moved: false });
    });
    window.addEventListener('pointermove', e => {
        const press = palettePointerStarts.get(e.pointerId);
        if (!press) return;
        const dx = Math.abs(e.clientX - press.x);
        const dy = Math.abs(e.clientY - press.y);
        if (!press.moved && (dx > 6 || dy > 6)) {
            press.moved = true;
            editor.handlePaletteToolPointerDown(press.type, { forceActivate: true });
        }
    });
    const releasePalettePress = e => {
        const press = palettePointerStarts.get(e.pointerId);
        if (!press) return;
        if (!press.moved) editor.handlePaletteToolPointerDown(press.type);
        palettePointerStarts.delete(e.pointerId);
    };
    window.addEventListener('pointerup',     releasePalettePress);
    window.addEventListener('pointercancel', releasePalettePress);

    // --- Trap-spot solver ---

    document.getElementById('editTrapSpotsBtn').onclick = async () => {
        const isHelpOpen = ui.isModalOpen('editorHelpModal');
        if (isHelpOpen) ui.closeModal('editorHelpModal');
        ui.closeAllModals();
        if (engine.isRunning() || state.ENGINE.activeSolverController) {
            ui.showSolverAlreadyRunning();
            return;
        }
        engine.stopHintAnimation();
        editor.applyMetricsFromUI();
        const l          = state.ENGINE.editor.workingLevel;
        const validation = editor.validateWorkingLevel();
        if (!validation?.ok) {
            ui.showMessage(validation?.reasons?.[0] || 'Level has validation errors.', 'text-red-500 font-bold');
            return;
        }
        const yieldFn = async () => { await new Promise(r => setTimeout(r, 0)); };
        state.ENGINE.activeSolverController = { cancel: () => {}, abort: () => {} };
        try {
            engine.setOverlayState(core.SOLVER_RUNNING);
            ui.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
            ui.setSolverDetailText('Scanning from each gate…');
            ui.setSolverTimerText('0.0s');
            ui.setSolverProgress(0);
            await new Promise(r => setTimeout(r, 0));
            const searchLevel = levelUtils.deepCloneLevel(l);
            const budgetMs    = solverV2.getTrapSpotBudgetMs(searchLevel);
            const t0          = Date.now();
            const overlayMinTimer = new Promise(r => setTimeout(r, 400));
            const timerInterval = setInterval(() => {
                ui.setSolverTimerText(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
            }, 100);
            let res;
            try {
                res = await solverV2.findTrapSpots(searchLevel, { timeLimit: budgetMs, yieldFn });
                await overlayMinTimer;
            } finally {
                clearInterval(timerInterval);
            }
            engine.setOverlayState(core.OVERLAY_NONE);
            editor.setTrapSpots(res.spots || new Set());
            state.ENGINE.isDirty = true;
            if (state.ENGINE.editor.validTrapSpots.size > 0) {
                ui.showMessage(`Found ${state.ENGINE.editor.validTrapSpots.size} spots.`, 'text-white font-black');
            } else if (res.timedOut) {
                ui.showMessage('Search timed out; results incomplete.', 'text-amber-300 font-black');
                const retry = window.confirm('Trap spot search timed out. Retry with a longer budget?');
                if (retry) {
                    // TEMP (2026-03-29): retry ceiling doubled twice from 120000ms to 480000ms.
                    // Revert target ceiling to 120000ms to return to original baseline.
                    const retryBudgetMs = Math.min(480000, Math.max((res.timeLimit || budgetMs) * 2, 10000));
                    const retryLevel    = levelUtils.deepCloneLevel(l);
                    engine.setOverlayState(core.SOLVER_RUNNING);
                    ui.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
                    ui.setSolverDetailText('Retrying with longer budget…');
                    ui.setSolverTimerText('0.0s');
                    ui.setSolverProgress(0);
                    await new Promise(r => setTimeout(r, 0));
                    const t1         = Date.now();
                    const retryTimer = setInterval(() => { ui.setSolverTimerText(`${((Date.now() - t1) / 1000).toFixed(1)}s`); }, 100);
                    let retryRes;
                    try {
                        retryRes = await solverV2.findTrapSpots(retryLevel, { timeLimit: retryBudgetMs, yieldFn });
                    } finally {
                        clearInterval(retryTimer);
                    }
                    engine.setOverlayState(core.OVERLAY_NONE);
                    editor.setTrapSpots(retryRes.spots || new Set());
                    state.ENGINE.isDirty = true;
                    if (state.ENGINE.editor.validTrapSpots.size > 0) {
                        ui.showMessage(`Found ${state.ENGINE.editor.validTrapSpots.size} spots after retry.`, 'text-white font-black');
                    } else if (retryRes.timedOut) {
                        ui.showMessage('Retry timed out; results incomplete.', 'text-amber-300 font-black');
                    } else {
                        ui.showMessage('No spots found.', 'text-white font-black');
                    }
                }
            } else {
                ui.showMessage('No spots found.', 'text-white font-black');
            }
        } catch (err) {
            console.error('Trap search failed:', err);
            ui.showMessage(`Search failed: ${err?.message || 'Unexpected error.'}`, 'text-red-500 font-bold');
            engine.setOverlayState(core.OVERLAY_NONE);
        } finally {
            state.ENGINE.activeSolverController = null;
            ui.setSolverControlsEnabled(true);
        }
    };
}
