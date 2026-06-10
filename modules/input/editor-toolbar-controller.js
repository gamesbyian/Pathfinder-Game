// Editor toolbar controller: grid transforms, palette drag, pencil/eraser,
// undo/reset/new-level, help modal, metrics copy, trap-spot solver, and
// live editor-input bindings.

import { createRenderModel } from '../render/create-render-model.js';

export function installEditorToolbarController(APP, { tryNavigate }) {

    // --- Grid transform buttons ---

    document.getElementById('gridRotateBtn').onclick = () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || !APP.State.ENGINE.editor.workingLevel) return;
        const l = APP.State.ENGINE.editor.workingLevel;
        APP.LevelUtils.transformLevel(l, (x, y) => ({ x: l.grid.h - 1 - y, y: x }), l.grid.h, l.grid.w, a => a === APP.Core.H ? APP.Core.V : APP.Core.H);
        APP.UI.showMessage('Rotated', 'text-white font-black');
    };

    document.getElementById('gridMirrorBtn').onclick = () => {
        APP.UI.closeAllModals();
        if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || !APP.State.ENGINE.editor.workingLevel) return;
        const l = APP.State.ENGINE.editor.workingLevel;
        APP.State.ENGINE.editor.mirrorHorizontal = !APP.State.ENGINE.editor.mirrorHorizontal;
        APP.UI.setInlineStyle('mirrorIconSvg', 'transform', APP.State.ENGINE.editor.mirrorHorizontal ? 'rotate(90deg)' : 'rotate(0deg)');
        if (APP.State.ENGINE.editor.mirrorHorizontal) {
            APP.LevelUtils.transformLevel(l, (x, y) => ({ x: l.grid.w - 1 - x, y }), l.grid.w, l.grid.h, a => a);
        } else {
            APP.LevelUtils.transformLevel(l, (x, y) => ({ x, y: l.grid.h - 1 - y }), l.grid.w, l.grid.h, a => a);
        }
        APP.UI.showMessage('Mirrored', 'text-white font-black');
    };

    document.getElementById('gridSizeMinusBtn').onclick = () => { APP.UI.closeAllModals(); APP.LevelUtils.changeGridSize(-1); };
    document.getElementById('gridSizePlusBtn').onclick  = () => { APP.UI.closeAllModals(); APP.LevelUtils.changeGridSize(1); };

    // --- Pencil ---

    document.getElementById('editPencilBtn').onclick = () => { APP.UI.closeAllModals(); APP.Editor.togglePencilMode(); };

    // --- Eraser (tap = undo last step; long-press = clear all) ---

    const eraserBtn = document.getElementById('editEraserBtn');
    let eraserTimer = null;
    let eraserFired = false;

    eraserBtn.addEventListener('pointerdown', () => {
        if (APP.State.ENGINE.mode !== APP.Core.EDITOR && APP.State.ENGINE.mode !== APP.Core.REVIEW) return;
        eraserTimer = setTimeout(() => {
            APP.Engine.PathNavigator.clear(APP.State.ENGINE);
            APP.UI.showMessage('Cleared', 'text-white font-black');
            eraserFired = true;
        }, 1500);
    });
    const handleEraserRelease = () => {
        if (eraserTimer) {
            clearTimeout(eraserTimer);
            if (!eraserFired) {
                if (APP.State.ENGINE.path.length > 1) {
                    APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, APP.State.ENGINE.path.length - 2);
                } else {
                    APP.Engine.PathNavigator.clear(APP.State.ENGINE);
                }
            }
            eraserTimer = null;
            eraserFired = false;
        }
    };
    eraserBtn.addEventListener('pointerup',    handleEraserRelease);
    eraserBtn.addEventListener('pointerleave', handleEraserRelease);

    // --- Grid history / lifecycle ---

    document.getElementById('editUndoGridBtn').onclick = () => { APP.UI.closeAllModals(); APP.Editor.restoreEditorState(); };
    document.getElementById('editResetGrid').onclick   = () => { APP.UI.closeAllModals(); APP.Editor.resetWorkingGrid(); APP.UI.showMessage('Reset', 'text-white font-black'); };
    document.getElementById('editNewLevel').onclick    = () => tryNavigate(() => {
        APP.UI.closeAllModals();
        APP.Editor.createNewLevel();
        APP.UI.showMessage('New Level Created', 'text-white font-black');
    });

    // --- Editor help modal ---

    document.getElementById('editHelpBtn').onclick = () => {
        const isVisible = APP.UI.isModalOpen('editorHelpModal');
        APP.UI.closeAllModals();
        if (!isVisible) APP.UI.openModal('editorHelpModal');
    };
    document.getElementById('closeEditorHelpX').onclick = () => APP.UI.closeModal('editorHelpModal');

    // --- Copy current path metrics to inputs ---

    document.getElementById('editCopyMetrics').onclick = () => {
        APP.UI.closeAllModals();
        if (!APP.State.ENGINE.path.length) return;
        APP.UI.setInputValue('editReqLen', APP.Engine.getRealLength());
        APP.UI.setInputValue('editReqInt', APP.State.ENGINE.intersections);
        APP.Editor.applyMetricsFromUI();
        APP.UI.showMessage('Metrics Set', 'text-white font-black');
    };

    // --- Live editor input bindings ---

    APP.UI.bindAll('.editor-input', 'input', () => {
        APP.Editor.markEditorInputsDirty();
        APP.Editor.applyMetricsFromUI();
    });
    APP.UI.bindAll('#levelMetadataPanel input', 'input', () => {
        APP.Editor.markEditorInputsDirty();
        APP.Editor.applyMetadataFromUI();
    });

    // --- Palette drag-and-drop ---

    const palettePointerStarts = new Map();
    APP.UI.bindAll('.palette-item[data-type]', 'pointerdown', (e, el) => {
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
            APP.Editor.handlePaletteToolPointerDown(press.type, { forceActivate: true });
        }
    });
    const releasePalettePress = e => {
        const press = palettePointerStarts.get(e.pointerId);
        if (!press) return;
        if (!press.moved) APP.Editor.handlePaletteToolPointerDown(press.type);
        palettePointerStarts.delete(e.pointerId);
    };
    window.addEventListener('pointerup',     releasePalettePress);
    window.addEventListener('pointercancel', releasePalettePress);

    // --- Trap-spot solver ---

    document.getElementById('editTrapSpotsBtn').onclick = async () => {
        const isHelpOpen = APP.UI.isModalOpen('editorHelpModal');
        if (isHelpOpen) APP.UI.closeModal('editorHelpModal');
        APP.UI.closeAllModals();
        if (APP.Solver.isRunning() || APP.State.ENGINE.activeSolverController) {
            APP.UI.showSolverAlreadyRunning();
            return;
        }
        APP.Solver.stopHintAnimation();
        APP.Editor.applyMetricsFromUI();
        const l          = APP.State.ENGINE.editor.workingLevel;
        const validation = APP.Editor.validateWorkingLevel();
        if (!validation?.ok) {
            APP.UI.showMessage(validation?.reasons?.[0] || 'Level has validation errors.', 'text-red-500 font-bold');
            return;
        }
        const yieldFn = async () => { await new Promise(r => setTimeout(r, 0)); };
        APP.State.ENGINE.activeSolverController = { cancel: () => {}, abort: () => {} };
        try {
            APP.Engine.setOverlayState(APP.Core.SOLVER_RUNNING);
            APP.UI.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
            APP.UI.setSolverDetailText('Scanning from each gate…');
            APP.UI.setSolverTimerText('0.0s');
            APP.UI.setSolverProgress(0);
            await new Promise(r => setTimeout(r, 0));
            const searchLevel = APP.LevelUtils.deepCloneLevel(l);
            const budgetMs    = APP.SolverV2.getTrapSpotBudgetMs(searchLevel);
            const t0          = Date.now();
            const overlayMinTimer = new Promise(r => setTimeout(r, 400));
            const timerInterval = setInterval(() => {
                APP.UI.setSolverTimerText(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
            }, 100);
            let res;
            try {
                res = await APP.SolverV2.findTrapSpots(searchLevel, { timeLimit: budgetMs, yieldFn });
                await overlayMinTimer;
            } finally {
                clearInterval(timerInterval);
            }
            APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
            APP.Editor.setTrapSpots(res.spots || new Set());
            APP.Renderer.render(createRenderModel(APP));
            if (APP.State.ENGINE.editor.validTrapSpots.size > 0) {
                APP.UI.showMessage(`Found ${APP.State.ENGINE.editor.validTrapSpots.size} spots.`, 'text-white font-black');
            } else if (res.timedOut) {
                APP.UI.showMessage('Search timed out; results incomplete.', 'text-amber-300 font-black');
                const retry = window.confirm('Trap spot search timed out. Retry with a longer budget?');
                if (retry) {
                    // TEMP (2026-03-29): retry ceiling doubled twice from 120000ms to 480000ms.
                    // Revert target ceiling to 120000ms to return to original baseline.
                    const retryBudgetMs = Math.min(480000, Math.max((res.timeLimit || budgetMs) * 2, 10000));
                    const retryLevel    = APP.LevelUtils.deepCloneLevel(l);
                    APP.Engine.setOverlayState(APP.Core.SOLVER_RUNNING);
                    APP.UI.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
                    APP.UI.setSolverDetailText('Retrying with longer budget…');
                    APP.UI.setSolverTimerText('0.0s');
                    APP.UI.setSolverProgress(0);
                    await new Promise(r => setTimeout(r, 0));
                    const t1         = Date.now();
                    const retryTimer = setInterval(() => { APP.UI.setSolverTimerText(`${((Date.now() - t1) / 1000).toFixed(1)}s`); }, 100);
                    let retryRes;
                    try {
                        retryRes = await APP.SolverV2.findTrapSpots(retryLevel, { timeLimit: retryBudgetMs, yieldFn });
                    } finally {
                        clearInterval(retryTimer);
                    }
                    APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                    APP.Editor.setTrapSpots(retryRes.spots || new Set());
                    APP.Renderer.render(createRenderModel(APP));
                    if (APP.State.ENGINE.editor.validTrapSpots.size > 0) {
                        APP.UI.showMessage(`Found ${APP.State.ENGINE.editor.validTrapSpots.size} spots after retry.`, 'text-white font-black');
                    } else if (retryRes.timedOut) {
                        APP.UI.showMessage('Retry timed out; results incomplete.', 'text-amber-300 font-black');
                    } else {
                        APP.UI.showMessage('No spots found.', 'text-white font-black');
                    }
                }
            } else {
                APP.UI.showMessage('No spots found.', 'text-white font-black');
            }
        } catch (err) {
            console.error('Trap search failed:', err);
            APP.UI.showMessage(`Search failed: ${err?.message || 'Unexpected error.'}`, 'text-red-500 font-bold');
            APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
        } finally {
            APP.State.ENGINE.activeSolverController = null;
            APP.UI.setSolverControlsEnabled(true);
        }
    };
}
