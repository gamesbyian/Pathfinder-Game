import type { ControllerDeps } from '../state.js';
// Editor toolbar controller: grid transforms, palette drag, pencil/eraser,
// undo/reset/new-level, help modal, metrics copy, trap-spot solver, and
// live editor-input bindings.
import { clearEditorValidTrapSpots, markDirty, setEditorModified, setEditorPendingPortal, toggleEditorMirrorHorizontal } from '../state-actions.js';
import { LANDMARK_TOOL_DEFS } from '../editor/editor-occupancy.js';
import { LANDMARK_COLORS } from '../domain/landmark-rules.js';
import { planGridResize, computeTrapRetryBudget } from './editor-toolbar-core.js';

export function createEditorToolbarController({ core, state, ui, engine, levelUtils, editor, solverApi }: ControllerDeps, { tryNavigate }: any) {

    // --- Grid transform orchestration ---
    // Pure level coord mapping is in levelUtils.applyCoordMapToLevel /
    // levelUtils.shiftLevelCoords. The functions below handle the surrounding
    // engine state mutations (path remapping, rebuild, viewport update).

    function applyCoordTransform(l: any, coordMap: any, newW: any, newH: any, axisMap: any) {
        editor.saveEditorState();
        const mapKey = (k: any) => {
            if (k === -1) return -1;
            const { x, y } = levelUtils.UNPACK(k);
            const tp = coordMap(x, y);
            return levelUtils.PACK(tp.x, tp.y);
        };
        levelUtils.applyCoordMapToLevel(l, coordMap, newW, newH, axisMap);
        const eng = state.ENGINE;
        if (eng.editor.pendingPortal) setEditorPendingPortal(state, mapKey(eng.editor.pendingPortal));
        engine.navigation.remapNavKeys(mapKey);
        engine.hints.clearHintPaths();
        clearEditorValidTrapSpots(state);
        setEditorModified(state, true);
        ui.updateViewport();
    }

    function changeGridSize(delta: any) {
        const eng = state.ENGINE;
        if (eng.overlayState !== core.OVERLAY_NONE || !eng.editor.workingLevel) return;
        const l = eng.editor.workingLevel;
        // Feasibility + shift planning is pure (editor-toolbar-core); the controller applies it.
        const bounds = levelUtils.getLevelBounds(l);
        const mustCrossCoords = l.mustCrossKeys.map((k: any) => levelUtils.UNPACK(k));
        const pathCoords      = eng.nav.path.map((k: any) => levelUtils.UNPACK(k));
        const plan = planGridResize(l.grid.w, delta, bounds, mustCrossCoords, pathCoords);
        if (!plan.ok) {
            ui.showMessage(plan.message, plan.reason === 'limit' ? 'warning' : 'error');
            return;
        }
        const { newSize, shiftX, shiftY, pathOutOfBounds } = plan;
        editor.saveEditorState();
        if (shiftX !== 0 || shiftY !== 0) {
            levelUtils.shiftLevelCoords(l, shiftX, shiftY);
            const shiftKey = (k: any) => { const p = levelUtils.UNPACK(k); return levelUtils.PACK(p.x + shiftX, p.y + shiftY); };
            if (eng.editor.pendingPortal) setEditorPendingPortal(state, shiftKey(eng.editor.pendingPortal));
            engine.navigation.remapNavKeys(shiftKey);
            engine.hints.clearHintPaths();
            clearEditorValidTrapSpots(state);
        }
        l.grid.w = newSize;
        l.grid.h = newSize;
        if (pathOutOfBounds) engine.navigation.PathNavigator.clear(eng);
        setEditorModified(state, true);
        ui.updateViewport();
        markDirty(eng);
        ui.showMessage(`Grid: ${newSize}x${newSize}`, 'info');
    }

    // --- Grid transform buttons ---

    (document.getElementById('gridRotateBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || !state.ENGINE.editor.workingLevel) return;
        const l = state.ENGINE.editor.workingLevel;
        applyCoordTransform(l, (x: any, y: any) => ({ x: l.grid.h - 1 - y, y: x }), l.grid.h, l.grid.w, (a: any) => a === core.H ? core.V : core.H);
        ui.showMessage('Rotated', 'info');
    };

    (document.getElementById('gridMirrorBtn') as any).onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || !state.ENGINE.editor.workingLevel) return;
        const l = state.ENGINE.editor.workingLevel;
        toggleEditorMirrorHorizontal(state);
        ui.setInlineStyle('mirrorIconSvg', 'transform', state.ENGINE.editor.mirrorHorizontal ? 'rotate(90deg)' : 'rotate(0deg)');
        if (state.ENGINE.editor.mirrorHorizontal) {
            applyCoordTransform(l, (x: any, y: any) => ({ x: l.grid.w - 1 - x, y }), l.grid.w, l.grid.h, (a: any) => a);
        } else {
            applyCoordTransform(l, (x: any, y: any) => ({ x, y: l.grid.h - 1 - y }), l.grid.w, l.grid.h, (a: any) => a);
        }
        ui.showMessage('Mirrored', 'info');
    };

    (document.getElementById('gridSizeMinusBtn') as any).onclick = () => { ui.closeAllModals(); changeGridSize(-1); };
    (document.getElementById('gridSizePlusBtn') as any).onclick  = () => { ui.closeAllModals(); changeGridSize(1); };

    // --- Pencil ---

    (document.getElementById('editPencilBtn') as any).onclick = () => { ui.closeAllModals(); editor.togglePencilMode(); };

    // --- Eraser (tap = undo last step; long-press = clear all) ---

    const eraserBtn = (document.getElementById('editEraserBtn') as any);
    let eraserTimer: any = null;
    let eraserFired = false;

    eraserBtn.addEventListener('pointerdown', () => {
        if (state.ENGINE.mode !== core.EDITOR && state.ENGINE.mode !== core.REVIEW) return;
        eraserTimer = setTimeout(() => {
            engine.navigation.PathNavigator.clear(state.ENGINE);
            ui.showMessage('Cleared', 'info');
            eraserFired = true;
        }, 1500);
    });
    const handleEraserRelease = () => {
        if (eraserTimer) {
            clearTimeout(eraserTimer);
            if (!eraserFired) {
                if (state.ENGINE.nav.path.length > 1) {
                    engine.navigation.PathNavigator.truncateTo(state.ENGINE, state.ENGINE.nav.path.length - 2);
                } else {
                    engine.navigation.PathNavigator.clear(state.ENGINE);
                }
            }
            eraserTimer = null;
            eraserFired = false;
        }
    };
    eraserBtn.addEventListener('pointerup',    handleEraserRelease);
    eraserBtn.addEventListener('pointerleave', handleEraserRelease);

    // --- Grid history / lifecycle ---

    (document.getElementById('editUndoGridBtn') as any).onclick = () => { ui.closeAllModals(); editor.restoreEditorState(); };
    (document.getElementById('editResetGrid') as any).onclick   = () => { ui.closeAllModals(); editor.resetWorkingGrid(); ui.showMessage('Reset', 'info'); };
    (document.getElementById('editNewLevel') as any).onclick    = () => tryNavigate(() => {
        ui.closeAllModals();
        editor.createNewLevel();
        ui.setClassState('reviewEmptyMsg', 'hidden', true);
        ui.showMessage('New Level Created', 'info');
    });

    // --- Editor help modal ---

    (document.getElementById('editHelpBtn') as any).onclick = () => {
        const isVisible = ui.isModalOpen('editorHelpModal');
        ui.closeAllModals();
        if (!isVisible) ui.openModal('editorHelpModal');
    };
    (document.getElementById('closeEditorHelpX') as any).onclick = () => ui.closeModal('editorHelpModal');

    // --- Copy current path metrics to inputs ---

    (document.getElementById('editCopyMetrics') as any).onclick = () => {
        ui.closeAllModals();
        if (!state.ENGINE.nav.path.length) return;
        ui.setInputValue('editReqLen', engine.game.getRealLength());
        ui.setInputValue('editReqInt', state.ENGINE.nav.intersections);
        editor.applyMetricsFromUI();
        ui.showMessage('Metrics Set', 'info');
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

    // --- Palette group variants popup ---

    const PALETTE_GROUPS: Record<string, any> = {
        visit: {
            color: 'var(--theme-pin)',
            variants: [
                { type: 'mustPass',     label: 'Required', def: '#def-mustpass' },
                { type: 'library',      label: 'Turn ↔',  def: '#def-mustturn' },
                { type: 'libraryLeft',  label: 'Turn ↶',  def: '#def-mustturnl' },
                { type: 'libraryRight', label: 'Turn ↷',  def: '#def-mustturnr' },
            ],
        },
        filter: {
            color: 'var(--theme-filter)',
            variants: [
                { type: 'filterH', label: 'H-Filter', def: '#def-filterH' },
                { type: 'filterV', label: 'V-Filter', def: '#def-filterV' },
            ],
        },
        flip: {
            color: 'var(--theme-filter)',
            variants: [
                { type: 'flipH', label: 'H-Flip', def: '#def-flipH' },
                { type: 'flipV', label: 'V-Flip', def: '#def-flipV' },
            ],
        },
        surround: {
            color: 'var(--theme-pin)',
            variants: [
                { type: 'park',   label: 'Park',   def: '#def-park' },
                { type: 'market', label: 'Market', def: '#def-market' },
            ],
        },
        adjTurn: {
            color: 'var(--theme-portal)',
            variants: [
                { type: 'fountain',      label: 'Fountain',   def: '#def-fountain' },
                { type: 'fountainLeft',  label: 'Fountain ↶', def: '#def-fountain' },
                { type: 'fountainRight', label: 'Fountain ↷', def: '#def-fountain' },
                { type: 'lamppost',      label: 'Lamppost',   def: '#def-lamppost' },
                { type: 'lamppostLeft',  label: 'Lamppost ↶', def: '#def-lamppost' },
                { type: 'lamppostRight', label: 'Lamppost ↷', def: '#def-lamppost' },
            ],
        },
    };

    const variantPopup  = (document.getElementById('paletteVariantPopup') as any);
    let   popupGroupId: any  = null;

    // A landmark variant shows its own true color (matching the canvas
    // renderer); non-landmark variants (mustPass, filters, flips) fall back
    // to the group's theme-accent color.
    function variantColor(groupId: any, toolType: any) {
        const landmarkDef = LANDMARK_TOOL_DEFS[toolType];
        if (landmarkDef) return LANDMARK_COLORS[landmarkDef.objectType] || PALETTE_GROUPS[groupId].color;
        return PALETTE_GROUPS[groupId].color;
    }

    function getGroupEl(groupId: any) {
        return (document.querySelector(`.palette-expandable[data-group="${groupId}"]`) as any);
    }

    function setGroupVariant(groupId: any, toolType: any) {
        const group = PALETTE_GROUPS[groupId];
        if (!group) return;
        const variant = group.variants.find((v: any) => v.type === toolType);
        if (!variant) return;
        const el = getGroupEl(groupId);
        if (!el) return;
        el.dataset.type = toolType;
        const useEl = el.querySelector('.palette-group-icon');
        if (useEl) useEl.setAttribute('href', variant.def);
        const svgEl = el.querySelector('svg');
        if (svgEl) svgEl.style.color = variantColor(groupId, toolType);
    }

    // Correct each collapsed group button's color for its current variant —
    // index.html's inline style is just a generic placeholder.
    for (const groupId of Object.keys(PALETTE_GROUPS)) {
        const el = getGroupEl(groupId);
        if (el?.dataset.type) setGroupVariant(groupId, el.dataset.type);
    }

    function hideVariantPopup() {
        if (variantPopup) variantPopup.classList.add('hidden');
        popupGroupId = null;
    }

    function showVariantPopup(groupId: any, anchorEl: any) {
        const group = PALETTE_GROUPS[groupId];
        if (!group || !variantPopup) return;
        popupGroupId = groupId;
        const groupEl    = getGroupEl(groupId);
        const activeType = groupEl?.dataset.type;

        variantPopup.replaceChildren();
        for (const v of group.variants) {
            const item = document.createElement('div');
            item.className = 'palette-variant-item' + (v.type === activeType ? ' pv-active' : '');
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.style.color = variantColor(groupId, v.type);
            const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
            use.setAttribute('href', v.def);
            svg.appendChild(use);
            const label = document.createElement('span');
            label.className = 'palette-variant-label';
            label.textContent = v.label;
            item.appendChild(svg);
            item.appendChild(label);
            item.addEventListener('pointerdown', (ev: any) => {
                ev.stopPropagation();
                setGroupVariant(groupId, v.type);
                hideVariantPopup();
                editor.handlePaletteToolPointerDown(v.type);
            });
            variantPopup.appendChild(item);
        }

        variantPopup.style.top  = '-9999px';
        variantPopup.style.left = '-9999px';
        variantPopup.classList.remove('hidden');
        const rect = anchorEl.getBoundingClientRect();
        const pw   = variantPopup.offsetWidth;
        const ph   = variantPopup.offsetHeight;
        let top  = rect.top - ph - 8;
        let left = rect.left + rect.width / 2 - pw / 2;
        if (top < 8) top = rect.bottom + 8;
        if (left < 8) left = 8;
        if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
        variantPopup.style.top  = `${top}px`;
        variantPopup.style.left = `${left}px`;
    }

    document.addEventListener('pointerdown', (e: any) => {
        if (popupGroupId && variantPopup && !variantPopup.contains(e.target)) hideVariantPopup();
    }, { capture: true });

    // --- Palette drag-and-drop ---

    const palettePointerStarts = new Map();
    ui.bindAll('.palette-item[data-type]', 'pointerdown', (e: any, el: any) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        palettePointerStarts.set(e.pointerId, {
            type:  el.dataset.type,
            group: el.dataset.group || null,
            el,
            x: e.clientX, y: e.clientY, moved: false,
        });
    });
    window.addEventListener('pointermove', (e: any) => {
        const press = palettePointerStarts.get(e.pointerId);
        if (!press) return;
        const dx = Math.abs(e.clientX - press.x);
        const dy = Math.abs(e.clientY - press.y);
        if (!press.moved && (dx > 6 || dy > 6)) {
            press.moved = true;
            hideVariantPopup();
            editor.handlePaletteToolPointerDown(press.type, { forceActivate: true });
        }
    });
    const releasePalettePress = (e: any) => {
        const press = palettePointerStarts.get(e.pointerId);
        if (!press) return;
        if (!press.moved) {
            if (press.group) showVariantPopup(press.group, press.el);
            else editor.handlePaletteToolPointerDown(press.type);
        }
        palettePointerStarts.delete(e.pointerId);
    };
    window.addEventListener('pointerup',     releasePalettePress);
    window.addEventListener('pointercancel', releasePalettePress);

    // Keyboard activation mirrors a palette tap: Enter/Space selects the tool, or opens the
    // variant popup for an expandable group. Palette items stay <div role="button"> (not
    // <button>) because they are also pointer drag sources — a real button would fire a
    // native click on pointer-release and double-trigger releasePalettePress.
    ui.bindAll('.palette-item[data-type]', 'keydown', (e: any, el: any) => {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault();
        const group = el.dataset.group || null;
        if (group) showVariantPopup(group, el);
        else editor.handlePaletteToolPointerDown(el.dataset.type);
    });

    // --- Trap-spot solver ---

    (document.getElementById('editTrapSpotsBtn') as any).onclick = async () => {
        const isHelpOpen = ui.isModalOpen('editorHelpModal');
        if (isHelpOpen) ui.closeModal('editorHelpModal');
        ui.closeAllModals();
        if (engine.solver.isRunning() || state.ENGINE.solver.controller) {
            ui.showSolverAlreadyRunning();
            return;
        }
        engine.overlays.stopHintAnimation();
        editor.applyMetricsFromUI();
        const l          = state.ENGINE.editor.workingLevel;
        const validation = editor.validateWorkingLevel();
        if (!validation?.ok) {
            ui.showMessage(validation?.reasons?.[0] || 'Level has validation errors.', 'error');
            return;
        }
        let _trapT0 = 0, _trapLastTenths = -1, _cancelled = false;
        const yieldFn = async () => {
            const tenths = Math.floor((Date.now() - _trapT0) * 10 / 1000);
            if (tenths !== _trapLastTenths) {
                _trapLastTenths = tenths;
                ui.setSolverTimerText(`${(tenths / 10).toFixed(1)}s`);
            }
            await new Promise((r: any) => setTimeout(r, 0));
            if (_cancelled) throw new Error('Solver:cancelled');
        };
        // Per-gate progress: the search reports which gate it's on so the user can
        // watch a multi-gate sweep advance rather than staring at a static spinner.
        const onProgress = ({ gatesProcessed, totalGates, spots }: any) => {
            ui.setSolverDetailText(`Scanned ${gatesProcessed}/${totalGates} gate${totalGates === 1 ? '' : 's'} — ${spots} spot${spots === 1 ? '' : 's'} so far`);
            ui.setSolverProgress(totalGates > 0 ? (gatesProcessed / totalGates) * 100 : 0);
        };
        // Apply a result to the grid + message the user. Returns true when the search
        // was incomplete (timed out) so the caller can offer a longer-budget retry.
        // Crucially, an incomplete sweep is ALWAYS surfaced — even when spots were
        // found — so a partial result is never shown as if it were complete.
        const reportTrap = (res: any) => {
            editor.setTrapSpots(res.spots || new Set());
            markDirty(state);
            const found = state.ENGINE.editor.validTrapSpots.size;
            const s = (n: number) => n === 1 ? '' : 's';
            if (res.status === 'aborted') {
                ui.showMessage(found > 0 ? `Search cancelled — ${found} spot${s(found)} found so far (incomplete).` : 'Search cancelled.', 'warning');
                return false;
            }
            if (!res.timedOut) {
                ui.showMessage(found > 0 ? `Found ${found} spot${s(found)}.` : 'No valid trap spots — no path can end on any empty cell at these settings.', found > 0 ? 'info' : 'warning');
                return false;
            }
            ui.showMessage(
                found > 0
                    ? `Found ${found} spot${s(found)} so far, but the search timed out after ${res.gatesCompleted}/${res.totalGates} gates — results may be incomplete.`
                    : `Search timed out after ${res.gatesCompleted}/${res.totalGates} gates; no spots found yet.`,
                'warning');
            return true;
        };
        const cancelTrap = () => { _cancelled = true; ui.setModalContent('searchLabel', 'Stopping…', 'text'); };
        engine.solver.startSolverRun({ cancel: cancelTrap, abort: cancelTrap });
        const abortPoll = setInterval(() => { if (state.ENGINE.solver.abortRequested) cancelTrap(); }, 100);
        try {
            engine.overlays.setOverlayState(core.SOLVER_RUNNING);
            ui.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
            ui.setSolverDetailText('Scanning from each gate…');
            ui.setSolverTimerText('0.0s');
            ui.setSolverProgress(0);
            await new Promise((r: any) => setTimeout(r, 0));
            const searchLevel = levelUtils.deepCloneLevel(l);
            const budgetMs    = solverApi.getTrapSpotBudgetMs(searchLevel);
            const overlayMinTimer = new Promise((r: any) => setTimeout(r, 400));
            _trapT0 = Date.now();
            _trapLastTenths = -1;
            const res = await solverApi.findTrapSpots(searchLevel, { timeLimit: budgetMs, yieldFn, onProgress });
            await overlayMinTimer;
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
            const offerRetry = reportTrap(res);
            if (offerRetry && !_cancelled && window.confirm('Trap spot search timed out and results may be incomplete. Retry with a longer budget?')) {
                // TEMP (2026-03-29): retry ceiling doubled twice from 120000ms to 480000ms.
                // Revert target ceiling to 120000ms to return to original baseline.
                const retryBudgetMs = computeTrapRetryBudget(res.timeLimit, budgetMs);
                const retryLevel    = levelUtils.deepCloneLevel(l);
                engine.overlays.setOverlayState(core.SOLVER_RUNNING);
                ui.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
                ui.setSolverDetailText('Retrying with longer budget…');
                ui.setSolverTimerText('0.0s');
                ui.setSolverProgress(0);
                await new Promise((r: any) => setTimeout(r, 0));
                _trapT0 = Date.now();
                _trapLastTenths = -1;
                const retryRes = await solverApi.findTrapSpots(retryLevel, { timeLimit: retryBudgetMs, yieldFn, onProgress });
                engine.overlays.setOverlayState(core.OVERLAY_NONE);
                reportTrap(retryRes);
            }
        } catch (err: any) {
            console.error('Trap search failed:', err);
            ui.showMessage(`Search failed: ${err?.message || 'Unexpected error.'}`, 'error');
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
        } finally {
            clearInterval(abortPoll);
            engine.solver.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    };
}
