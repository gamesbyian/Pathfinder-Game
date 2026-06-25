// Editor toolbar controller: grid transforms, palette drag, pencil/eraser,
// undo/reset/new-level, help modal, metrics copy, trap-spot solver, and
// live editor-input bindings.
import { clearEditorValidTrapSpots, markDirty, setEditorModified, setEditorPendingPortal, toggleEditorMirrorHorizontal } from '../state-actions.js';
import { LANDMARK_TOOL_DEFS } from '../editor/editor-occupancy.js';
import { LANDMARK_COLORS } from '../domain/landmark-rules.js';

export function createEditorToolbarController({ core, state, ui, engine, levelUtils, editor, solverV2 }, { tryNavigate }) {

    // --- Grid transform orchestration ---
    // Pure level coord mapping is in levelUtils.applyCoordMapToLevel /
    // levelUtils.shiftLevelCoords. The functions below handle the surrounding
    // engine state mutations (path remapping, rebuild, viewport update).

    function applyCoordTransform(l, coordMap, newW, newH, axisMap) {
        editor.saveEditorState();
        const mapKey = (k) => {
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

    function changeGridSize(delta) {
        const eng = state.ENGINE;
        if (eng.overlayState !== core.OVERLAY_NONE || !eng.editor.workingLevel) return;
        const l = eng.editor.workingLevel;
        const newSize = l.grid.w + delta;
        if (newSize < 6 || newSize > 15) {
            ui.showMessage('Size limit reached', 'warning');
            return;
        }
        const bounds = levelUtils.getLevelBounds(l);
        let shiftX = 0, shiftY = 0;
        if (bounds) {
            const width  = bounds.maxX - bounds.minX + 1;
            const height = bounds.maxY - bounds.minY + 1;
            if (newSize < width || newSize < height) {
                ui.showMessage('Cannot shrink: items blocking', 'error');
                return;
            }
            if (bounds.maxX >= newSize) shiftX = newSize - 1 - bounds.maxX;
            if (bounds.maxY >= newSize) shiftY = newSize - 1 - bounds.maxY;
        }
        if (delta < 0 && l.mustCrossKeys.some(k => {
            const p = levelUtils.UNPACK(k);
            const nx = p.x + shiftX;
            const ny = p.y + shiftY;
            return nx === 0 || nx === newSize - 1 || ny === 0 || ny === newSize - 1;
        })) {
            ui.showMessage('Cannot shrink: MustCross near edge', 'error');
            return;
        }
        editor.saveEditorState();
        if (shiftX !== 0 || shiftY !== 0) {
            levelUtils.shiftLevelCoords(l, shiftX, shiftY);
            const shiftKey = k => { const p = levelUtils.UNPACK(k); return levelUtils.PACK(p.x + shiftX, p.y + shiftY); };
            if (eng.editor.pendingPortal) setEditorPendingPortal(state, shiftKey(eng.editor.pendingPortal));
            engine.navigation.remapNavKeys(shiftKey);
            engine.hints.clearHintPaths();
            clearEditorValidTrapSpots(state);
        }
        l.grid.w = newSize;
        l.grid.h = newSize;
        const pathOutOfBounds = eng.nav.path.some(k => {
            const p = levelUtils.UNPACK(k);
            return p.x < 0 || p.y < 0 || p.x >= newSize || p.y >= newSize;
        });
        if (pathOutOfBounds) engine.navigation.PathNavigator.clear(eng);
        setEditorModified(state, true);
        ui.updateViewport();
        markDirty(eng);
        ui.showMessage(`Grid: ${newSize}x${newSize}`, 'info');
    }

    // --- Grid transform buttons ---

    document.getElementById('gridRotateBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || !state.ENGINE.editor.workingLevel) return;
        const l = state.ENGINE.editor.workingLevel;
        applyCoordTransform(l, (x, y) => ({ x: l.grid.h - 1 - y, y: x }), l.grid.h, l.grid.w, a => a === core.H ? core.V : core.H);
        ui.showMessage('Rotated', 'info');
    };

    document.getElementById('gridMirrorBtn').onclick = () => {
        ui.closeAllModals();
        if (state.ENGINE.overlayState !== core.OVERLAY_NONE || !state.ENGINE.editor.workingLevel) return;
        const l = state.ENGINE.editor.workingLevel;
        toggleEditorMirrorHorizontal(state);
        ui.setInlineStyle('mirrorIconSvg', 'transform', state.ENGINE.editor.mirrorHorizontal ? 'rotate(90deg)' : 'rotate(0deg)');
        if (state.ENGINE.editor.mirrorHorizontal) {
            applyCoordTransform(l, (x, y) => ({ x: l.grid.w - 1 - x, y }), l.grid.w, l.grid.h, a => a);
        } else {
            applyCoordTransform(l, (x, y) => ({ x, y: l.grid.h - 1 - y }), l.grid.w, l.grid.h, a => a);
        }
        ui.showMessage('Mirrored', 'info');
    };

    document.getElementById('gridSizeMinusBtn').onclick = () => { ui.closeAllModals(); changeGridSize(-1); };
    document.getElementById('gridSizePlusBtn').onclick  = () => { ui.closeAllModals(); changeGridSize(1); };

    // --- Pencil ---

    document.getElementById('editPencilBtn').onclick = () => { ui.closeAllModals(); editor.togglePencilMode(); };

    // --- Eraser (tap = undo last step; long-press = clear all) ---

    const eraserBtn = document.getElementById('editEraserBtn');
    let eraserTimer = null;
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

    document.getElementById('editUndoGridBtn').onclick = () => { ui.closeAllModals(); editor.restoreEditorState(); };
    document.getElementById('editResetGrid').onclick   = () => { ui.closeAllModals(); editor.resetWorkingGrid(); ui.showMessage('Reset', 'info'); };
    document.getElementById('editNewLevel').onclick    = () => tryNavigate(() => {
        ui.closeAllModals();
        editor.createNewLevel();
        ui.setClassState('reviewEmptyMsg', 'hidden', true);
        ui.showMessage('New Level Created', 'info');
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

    const PALETTE_GROUPS = {
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

    const variantPopup  = document.getElementById('paletteVariantPopup');
    let   popupGroupId  = null;

    // A landmark variant shows its own true color (matching the canvas
    // renderer); non-landmark variants (mustPass, filters, flips) fall back
    // to the group's theme-accent color.
    function variantColor(groupId, toolType) {
        const landmarkDef = LANDMARK_TOOL_DEFS[toolType];
        if (landmarkDef) return LANDMARK_COLORS[landmarkDef.objectType] || PALETTE_GROUPS[groupId].color;
        return PALETTE_GROUPS[groupId].color;
    }

    function getGroupEl(groupId) {
        return document.querySelector(`.palette-expandable[data-group="${groupId}"]`);
    }

    function setGroupVariant(groupId, toolType) {
        const group = PALETTE_GROUPS[groupId];
        if (!group) return;
        const variant = group.variants.find(v => v.type === toolType);
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

    function showVariantPopup(groupId, anchorEl) {
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
            item.addEventListener('pointerdown', ev => {
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

    document.addEventListener('pointerdown', e => {
        if (popupGroupId && variantPopup && !variantPopup.contains(e.target)) hideVariantPopup();
    }, { capture: true });

    // --- Palette drag-and-drop ---

    const palettePointerStarts = new Map();
    ui.bindAll('.palette-item[data-type]', 'pointerdown', (e, el) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        palettePointerStarts.set(e.pointerId, {
            type:  el.dataset.type,
            group: el.dataset.group || null,
            el,
            x: e.clientX, y: e.clientY, moved: false,
        });
    });
    window.addEventListener('pointermove', e => {
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
    const releasePalettePress = e => {
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
    ui.bindAll('.palette-item[data-type]', 'keydown', (e, el) => {
        if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
        e.preventDefault();
        const group = el.dataset.group || null;
        if (group) showVariantPopup(group, el);
        else editor.handlePaletteToolPointerDown(el.dataset.type);
    });

    // --- Trap-spot solver ---

    document.getElementById('editTrapSpotsBtn').onclick = async () => {
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
        let _trapT0 = 0, _trapLastTenths = -1;
        const yieldFn = async () => {
            const tenths = Math.floor((Date.now() - _trapT0) * 10 / 1000);
            if (tenths !== _trapLastTenths) {
                _trapLastTenths = tenths;
                ui.setSolverTimerText(`${(tenths / 10).toFixed(1)}s`);
            }
            await new Promise(r => setTimeout(r, 0));
        };
        engine.solver.startSolverRun({ cancel: () => {}, abort: () => {} });
        try {
            engine.overlays.setOverlayState(core.SOLVER_RUNNING);
            ui.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
            ui.setSolverDetailText('Scanning from each gate…');
            ui.setSolverTimerText('0.0s');
            ui.setSolverProgress(0);
            await new Promise(r => setTimeout(r, 0));
            const searchLevel = levelUtils.deepCloneLevel(l);
            const budgetMs    = solverV2.getTrapSpotBudgetMs(searchLevel);
            const t0          = Date.now();
            const overlayMinTimer = new Promise(r => setTimeout(r, 400));
            _trapT0 = t0;
            _trapLastTenths = -1;
            const res = await solverV2.findTrapSpots(searchLevel, { timeLimit: budgetMs, yieldFn });
            await overlayMinTimer;
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
            editor.setTrapSpots(res.spots || new Set());
            markDirty(state);
            if (state.ENGINE.editor.validTrapSpots.size > 0) {
                ui.showMessage(`Found ${state.ENGINE.editor.validTrapSpots.size} spots.`, 'info');
            } else if (res.timedOut) {
                ui.showMessage('Search timed out; results incomplete.', 'warning');
                const retry = window.confirm('Trap spot search timed out. Retry with a longer budget?');
                if (retry) {
                    // TEMP (2026-03-29): retry ceiling doubled twice from 120000ms to 480000ms.
                    // Revert target ceiling to 120000ms to return to original baseline.
                    const retryBudgetMs = Math.min(480000, Math.max((res.timeLimit || budgetMs) * 2, 10000));
                    const retryLevel    = levelUtils.deepCloneLevel(l);
                    engine.overlays.setOverlayState(core.SOLVER_RUNNING);
                    ui.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
                    ui.setSolverDetailText('Retrying with longer budget…');
                    ui.setSolverTimerText('0.0s');
                    ui.setSolverProgress(0);
                    await new Promise(r => setTimeout(r, 0));
                    const t1 = Date.now();
                    _trapT0 = t1;
                    _trapLastTenths = -1;
                    const retryRes = await solverV2.findTrapSpots(retryLevel, { timeLimit: retryBudgetMs, yieldFn });
                    engine.overlays.setOverlayState(core.OVERLAY_NONE);
                    editor.setTrapSpots(retryRes.spots || new Set());
                    markDirty(state);
                    if (state.ENGINE.editor.validTrapSpots.size > 0) {
                        ui.showMessage(`Found ${state.ENGINE.editor.validTrapSpots.size} spots after retry.`, 'info');
                    } else if (retryRes.timedOut) {
                        ui.showMessage('Retry timed out; results incomplete.', 'warning');
                    } else {
                        ui.showMessage('No spots found.', 'info');
                    }
                }
            } else {
                ui.showMessage('No spots found.', 'info');
            }
        } catch (err) {
            console.error('Trap search failed:', err);
            ui.showMessage(`Search failed: ${err?.message || 'Unexpected error.'}`, 'error');
            engine.overlays.setOverlayState(core.OVERLAY_NONE);
        } finally {
            engine.solver.endSolverRun();
            ui.setSolverControlsEnabled(true);
        }
    };
}
