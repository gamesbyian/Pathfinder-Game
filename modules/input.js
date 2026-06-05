export function installInput(APP) {
    APP.Input = (() => {
        let initialized = false;
        const init = () => {
            if (initialized) return;
            initialized = true;
            APP.State.ENGINE.ui.gamepadGridPrimaryAction = () => {};
        const tryNavigate = (actionFn) => { if (APP.State.ENGINE.mode === APP.Core.EDITOR && APP.State.ENGINE.editor.isModified) { APP.State.ENGINE.runtime.pendingAction = actionFn; APP.UI.openModal('unsavedModal'); } else { actionFn(); } };
        document.getElementById('unsavedStayBtn').onclick = () => { APP.UI.closeAllModals(); APP.State.ENGINE.runtime.pendingAction = null; APP.UI.closeModal('unsavedModal'); };
        document.getElementById('unsavedLeaveBtn').onclick = () => { APP.UI.closeAllModals(); APP.UI.closeModal('unsavedModal'); if (APP.State.ENGINE.runtime.pendingAction) APP.State.ENGINE.runtime.pendingAction(); };

        const handleGridPressAtPoint = (clientX, clientY) => handleDown({ clientX, clientY });
        APP.State.ENGINE.ui.gamepadGridPrimaryAction = () => {
            const canvas = APP.Renderer.getCanvas(); const rect = canvas.getBoundingClientRect();
            handleGridPressAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        };

        const handleDown = (e) => {
            if (APP.State.ENGINE.activeSolverController || APP.State.ENGINE.logicState === APP.Core.RESOLVED || [APP.Core.HINT_ANIMATING, APP.Core.FALSE_GOAL_ANIMATING, APP.Core.GOOSE_OVERLAY, APP.Core.SOLVER_RUNNING].includes(APP.State.ENGINE.overlayState)) return;
            const p = APP.LevelUtils.getGridCoord(e); const k = APP.LevelUtils.PACK(p.x, p.y); const activeLevel = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
            APP.State.ENGINE.resetStreak = 0;
            APP.State.ENGINE.runtime.tapStartCoord = { x: p.x, y: p.y };
            APP.State.ENGINE.runtime.tapMoved = false;
            if (APP.State.ENGINE.mode === APP.Core.EDITOR && !APP.State.ENGINE.editor.isPencilMode) {
                const occupied = activeLevel.gateKeys.includes(k) || activeLevel.goalKey === k || activeLevel.falseGoalKeys.has(k) || activeLevel.blockSet.has(k) || activeLevel.gooseSet.has(k) || activeLevel.filterMap.has(k) || activeLevel.flippingFilterMap.has(k) || activeLevel.portalMap.has(k) || activeLevel.mustPassKeys.includes(k) || activeLevel.mustCrossKeys.includes(k);
                if (occupied) { APP.State.ENGINE.editor.emptyClickCount = 0; APP.State.ENGINE.editor.draggedObject = APP.Editor.pickUpObject(k); if (APP.State.ENGINE.editor.draggedObject) { APP.Engine.setLogicState(APP.Core.EDIT_DRAG); APP.UI.EditorDragGhost.update({ visible: true, cellSize: APP.State.ENGINE.viewport.cellW, type: APP.State.ENGINE.editor.draggedObject.type }); } } else if (APP.State.ENGINE.editor.selectedTool) { APP.State.ENGINE.editor.emptyClickCount = 0; APP.Editor.placeEditorObject(k); } else { APP.State.ENGINE.editor.emptyClickCount++; if (APP.State.ENGINE.editor.emptyClickCount >= 2) { APP.UI.showMessage("Click pencil to draw.", "text-white font-bold"); } } return;
            }
            if (APP.State.ENGINE.path.length > 0) {
                if (APP.State.ENGINE.path.length === 1 && activeLevel.gateKeys.includes(k) && k !== APP.State.ENGINE.activeGateKey) {
                    APP.Engine.PathNavigator.clear(APP.State.ENGINE);
                    APP.State.ENGINE.activeGateKey = k;
                    APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, k, false);
                    APP.Engine.setLogicState(APP.Core.DRAGGING);
                    return;
                }
                if (APP.State.ENGINE.mode === APP.Core.EDITOR && APP.State.ENGINE.editor.isPencilMode) {
                    const idx = APP.State.ENGINE.path.indexOf(k); let shouldReverse = false;
                    if (idx !== -1) { if (idx < APP.State.ENGINE.path.length / 2) shouldReverse = true; } else { const headP = APP.LevelUtils.UNPACK(APP.State.ENGINE.path[APP.State.ENGINE.path.length - 1]); const tailP = APP.LevelUtils.UNPACK(APP.State.ENGINE.path[0]); const distHead = Math.abs(p.x - headP.x) + Math.abs(p.y - headP.y); const distTail = Math.abs(p.x - tailP.x) + Math.abs(p.y - tailP.y); if (distTail < distHead) shouldReverse = true; }
                    if (shouldReverse) { APP.State.ENGINE.path.reverse(); const newJumps = new Set(); APP.State.ENGINE.isPortalJump.forEach(jIdx => newJumps.add(APP.State.ENGINE.path.length - jIdx)); APP.State.ENGINE.isPortalJump = newJumps; APP.Engine.rebuildDerivedPathState(APP.State.ENGINE); }
                }
                const lastIdx = APP.State.ENGINE.path.lastIndexOf(k);
                const headKey = APP.State.ENGINE.path[APP.State.ENGINE.path.length - 1];
                const headPos = APP.LevelUtils.UNPACK(headKey);
                const isOrthWithHead = p.x === headPos.x || p.y === headPos.y;
                const pathSegment = lastIdx === -1 ? [] : APP.State.ENGINE.path.slice(lastIdx, APP.State.ENGINE.path.length);
                const isContiguousOrthBacktrack = isOrthWithHead && pathSegment.length > 1 && pathSegment.every(segmentKey => {
                    const segmentPos = APP.LevelUtils.UNPACK(segmentKey);
                    return segmentPos.x === headPos.x || segmentPos.y === headPos.y;
                });
                const shouldTapBacktrack = lastIdx !== -1
                    && lastIdx < APP.State.ENGINE.path.length - 1
                    && isContiguousOrthBacktrack
                    && !activeLevel.mustCrossKeys.includes(k);
                if (shouldTapBacktrack) { APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, lastIdx); APP.Engine.setLogicState(APP.Core.DRAGGING); return; }
                APP.Engine.setLogicState(APP.Core.DRAGGING); APP.Engine.handlePrimaryGridInput(p, { inputType: 'tap' });
            } else {
                if (!activeLevel) return;
                if (APP.State.ENGINE.mode === APP.Core.EDITOR && APP.State.ENGINE.editor.isPencilMode) { APP.State.ENGINE.activeGateKey = null; APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, k, false); APP.Engine.setLogicState(APP.Core.DRAGGING); APP.Engine.handlePrimaryGridInput(p, { inputType: 'tap' }); } else {
                    let bestGate = null; if (activeLevel.gateKeys.includes(k)) { bestGate = k; } else { let minDist = Infinity; for (let i = 0; i < activeLevel.gateKeys.length; i++) { const gk = activeLevel.gateKeys[i]; const gp = APP.LevelUtils.UNPACK(gk); if (p.x === gp.x || p.y === gp.y) { const dist = Math.abs(p.x - gp.x) + Math.abs(p.y - gp.y); if (dist > 0 && dist < minDist) { minDist = dist; bestGate = gk; } } } }
                    if (bestGate !== null) { APP.State.ENGINE.activeGateKey = bestGate; APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, bestGate, false); APP.Engine.setLogicState(APP.Core.DRAGGING); if (bestGate !== k) { APP.Engine.handlePrimaryGridInput(p, { inputType: 'tap' }); } }
                }
            }
        };

        const handleUp = (e) => {
            if (APP.State.ENGINE.logicState === APP.Core.THEME_DRAG) {
                // Resolve from deepest hit node up to the swatch so child elements still count as valid drops.
                const dropTarget = document.elementFromPoint(e.clientX, e.clientY)?.closest('.theme-swatch');
                const dragState = APP.UI.ThemeEditor.getDragState();
                if (dropTarget && dragState.isDragging) {
                    APP.UI.ThemeEditor.applySwatchReplace({
                        sourceColor: dragState.color,
                        sourceTheme: dragState.theme,
                        sourceCategory: dragState.category,
                        targetSwatch: dropTarget
                    });
                }
                APP.Engine.setLogicState(APP.Core.IDLE); APP.UI.ThemeEditor.clearDragState(); APP.UI.ThemeEditor.setDragGhost({ visible: false });
                if (!APP.UI.ThemeEditor.hasTapSelection()) APP.UI.ThemeEditor.setSwatchSelected(null);
            }
            if (APP.State.ENGINE.logicState === APP.Core.EDIT_DRAG && APP.State.ENGINE.mode === APP.Core.EDITOR) { const canvas = APP.Renderer.getCanvas(); const crect = canvas.getBoundingClientRect(); if (e.clientX >= crect.left && e.clientX <= crect.right && e.clientY >= crect.top && e.clientY <= crect.bottom) { APP.Editor.placeEditorObject(APP.LevelUtils.PACK(APP.LevelUtils.getGridCoord(e).x, APP.LevelUtils.getGridCoord(e).y)); } else { if (APP.State.ENGINE.editor.draggedFromGrid) { APP.State.ENGINE.editor.draggedObject = null; APP.Editor.saveEditorState(); APP.UI.showMessage("Deleted", "text-white font-black"); } } APP.State.ENGINE.editor.draggedObject = null; APP.Engine.setLogicState(APP.Core.IDLE); } if (APP.State.ENGINE.logicState === APP.Core.DRAGGING) APP.Engine.setLogicState(APP.Core.IDLE);
        };

        APP.Renderer.getCanvas().addEventListener('pointerdown', e => { if (e.button !== 0 && e.pointerType === 'mouse') return; if (APP.State.ENGINE.runtime.activePointerId !== null) return; e.preventDefault(); APP.State.ENGINE.runtime.activePointerId = e.pointerId; APP.Renderer.getCanvas().setPointerCapture(APP.State.ENGINE.runtime.activePointerId); handleDown(e); });
        window.addEventListener('pointermove', e => {
            const themeDragState = APP.UI.ThemeEditor.getDragState();
            if (themeDragState.pointerId !== null && e.pointerId === themeDragState.pointerId && !themeDragState.isDragging) {
                const dx = Math.abs((themeDragState.startX ?? e.clientX) - e.clientX);
                const dy = Math.abs((themeDragState.startY ?? e.clientY) - e.clientY);
                if (dx > 6 || dy > 6) APP.UI.ThemeEditor.markPointerDrag();
            }
            if (APP.State.ENGINE.logicState === APP.Core.THEME_DRAG) {
                const dragState = APP.UI.ThemeEditor.getDragState();
                if (e.pointerId === dragState.pointerId || dragState.pointerId === null) {
                    APP.UI.ThemeEditor.setDragGhost({ visible: true, color: dragState.color, x: e.clientX, y: e.clientY });
                    e.preventDefault();
                    return;
                }
            }
            if (APP.State.ENGINE.mode === APP.Core.EDITOR && (APP.State.ENGINE.editor.draggedObject || (APP.State.ENGINE.editor.selectedTool && APP.State.ENGINE.logicState === APP.Core.EDIT_DRAG))) {
                const type = APP.State.ENGINE.editor.draggedObject ? APP.State.ENGINE.editor.draggedObject.type : APP.State.ENGINE.editor.selectedTool;
                const isOverPalette = APP.UI.EditorDragGhost.isPointerOverPalette(e.clientX, e.clientY);
                APP.UI.EditorDragGhost.update({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    cellSize: APP.State.ENGINE.viewport.cellW,
                    type,
                    isOverPalette
                });
            } else {
                APP.UI.EditorDragGhost.update({ visible: false });
            }
            if (e.pointerId !== APP.State.ENGINE.runtime.activePointerId && APP.State.ENGINE.logicState !== APP.Core.EDIT_DRAG) return;
            const dragCoord = APP.LevelUtils.getGridCoord(e);
            const tapStart = APP.State.ENGINE.runtime.tapStartCoord;
            if (tapStart && (dragCoord.x !== tapStart.x || dragCoord.y !== tapStart.y)) APP.State.ENGINE.runtime.tapMoved = true;
            e.preventDefault();
            if ([APP.Core.DRAGGING, APP.Core.HAZARD_TRIGGERED].includes(APP.State.ENGINE.logicState)) APP.Engine.handlePrimaryGridInput(dragCoord, { inputType: 'drag' });
        });
        window.addEventListener('pointerup', e => { handleUp(e); if (APP.State.ENGINE.runtime.activePointerId !== null && APP.Renderer.getCanvas().hasPointerCapture(APP.State.ENGINE.runtime.activePointerId)) APP.Renderer.getCanvas().releasePointerCapture(APP.State.ENGINE.runtime.activePointerId); APP.State.ENGINE.runtime.activePointerId = null; APP.State.ENGINE.runtime.tapStartCoord = null; APP.State.ENGINE.runtime.tapMoved = false; });

        [APP.Renderer.getCanvas(), document.getElementById('hintBtn'), document.getElementById('editCopyMetrics')].forEach(el => { if (!el) return; if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0'); });

        const GAMEPAD_MAP = { A: 0, B: 1, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
        const GAMEPAD_REPEAT_INITIAL = 220;
        const GAMEPAD_REPEAT_RATE = 100;

        function isModalActive() { return APP.UI.isModalOpen('guideModal') || APP.UI.isModalOpen('editorHelpModal') || APP.UI.isModalOpen('winModal') || APP.UI.isModalOpen('themeModal') || APP.UI.isModalOpen('unsavedModal'); }

        function getFocusableGroups() {
            const groups = [
                { name: 'GRID', elements: [document.getElementById('gameCanvas')] },
                { name: 'CONTROLS', elements: Array.from(document.querySelectorAll('#playControls button, #playControls [role="button"], #openThemeModalBtn, #muteBtn')).filter(el => !el.classList.contains('hidden') && el.offsetParent !== null) },
                { name: 'LEVEL', elements: [document.getElementById('prevLevelBtn'), document.getElementById('nextLevelBtn')].filter(Boolean) }
            ];
            if (APP.State.ENGINE.mode === APP.Core.EDITOR) groups.push({ name: 'METRICS', elements: [document.getElementById('editReqLen'), document.getElementById('editReqInt')].filter(Boolean) });
            return groups.filter(g => g.elements.length > 0);
        }

        function applyFocusVisual(el) {
            document.querySelectorAll('.gamepad-focus').forEach(node => APP.UI.removeClasses(node, ['gamepad-focus', 'ring-4', 'ring-sky-400', 'ring-offset-2']));
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
            if (el.id === 'gameCanvas') {
                APP.State.ENGINE.ui.gamepadGridPrimaryAction();
                return;
            }
            el.click();
        }

        function dismissGuideOrHelpModal() {
            if (APP.UI.isModalOpen('guideModal')) { APP.UI.closeModal('guideModal'); return true; }
            if (APP.UI.isModalOpen('editorHelpModal')) { APP.UI.closeModal('editorHelpModal'); return true; }
            return false;
        }

        function gamepadMoveGrid(dx, dy) {
            if (isModalActive()) return;
            const l = APP.State.ENGINE.mode === APP.Core.PLAY ? APP.State.ENGINE.level : APP.State.ENGINE.editor.workingLevel;
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
                if (dir === 'UP') gamepadMoveGrid(0, -1);
                if (dir === 'DOWN') gamepadMoveGrid(0, 1);
                if (dir === 'LEFT') gamepadMoveGrid(-1, 0);
                if (dir === 'RIGHT') gamepadMoveGrid(1, 0);
                return;
            }
            moveFocusWithinGroup((dir === 'LEFT' || dir === 'UP') ? -1 : 1);
        }

        function handleBPress() {
            const now = Date.now();
            if (now - APP.State.ENGINE.ui.bLastPressTime <= 320) {
                if (APP.State.ENGINE.ui.bSingleTimer) { clearTimeout(APP.State.ENGINE.ui.bSingleTimer); APP.State.ENGINE.ui.bSingleTimer = null; }
                cycleFocusGroup();
                APP.State.ENGINE.ui.bLastPressTime = 0;
                return;
            }
            APP.State.ENGINE.ui.bLastPressTime = now;
            APP.State.ENGINE.ui.bSingleTimer = setTimeout(() => { dismissGuideOrHelpModal(); APP.State.ENGINE.ui.bSingleTimer = null; }, 320);
        }

        function pollGamepadInput() {
            const pads = navigator.getGamepads ? navigator.getGamepads() : [];
            const pad = pads && pads[0];
            if (!pad) return;
            APP.State.ENGINE.gamepad.hasPad = true;
            const now = Date.now();

            const pressed = idx => !!pad.buttons[idx] && pad.buttons[idx].pressed;
            const wasPressed = idx => !!APP.State.ENGINE.gamepad.lastButtons[idx];
            const anyPressed = pad.buttons.some(b => !!b && b.pressed);
            if (anyPressed) APP.State.ENGINE.gamepad.hasPad = true;

            if (pressed(GAMEPAD_MAP.A) && !wasPressed(GAMEPAD_MAP.A)) activateFocusedControl();
            if (pressed(GAMEPAD_MAP.B) && !wasPressed(GAMEPAD_MAP.B)) handleBPress();

            const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
            let activeDir = null;
            for (const dir of dirs) {
                const idx = GAMEPAD_MAP[dir];
                if (pressed(idx)) { activeDir = dir; if (!wasPressed(idx)) { handleGamepadDirection(dir); APP.State.ENGINE.gamepad.nextMoveAt = now + GAMEPAD_REPEAT_INITIAL; } }
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
            APP.State.ENGINE.gamepad.rafId = null;
            APP.State.ENGINE.gamepad.rafActive = false;
        }

        function gamepadPollingTick() {
            pollGamepadInput();
            if (!hasConnectedGamepad()) {
                APP.State.ENGINE.gamepad.hasPad = false;
                APP.State.ENGINE.gamepad.lastButtons = [];
                stopGamepadPollingLoop();
                return;
            }
            APP.State.ENGINE.gamepad.rafId = requestAnimationFrame(gamepadPollingTick);
        }

        function startGamepadPollingLoop() {
            if (APP.State.ENGINE.gamepad.rafActive) return;
            APP.State.ENGINE.gamepad.rafActive = true;
            APP.State.ENGINE.gamepad.rafId = requestAnimationFrame(gamepadPollingTick);
        }

        window.addEventListener('gamepadconnected', () => {
            APP.State.ENGINE.gamepad.hasPad = true;
            pollGamepadInput();
            startGamepadPollingLoop();
            setFocusGroup(APP.State.ENGINE.ui.focusGroup || 'GRID', APP.State.ENGINE.ui.focusIndex || 0);
        });
        window.addEventListener('gamepaddisconnected', () => {
            if (hasConnectedGamepad()) return;
            APP.State.ENGINE.gamepad.hasPad = false;
            APP.State.ENGINE.gamepad.lastButtons = [];
            APP.State.ENGINE.ui.gamepadFocusEnabled = false;
            applyFocusVisual(null);
            stopGamepadPollingLoop();
        });
        if (hasConnectedGamepad()) startGamepadPollingLoop();
        setFocusGroup('CONTROLS', 0);

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

        document.getElementById('gridRotateBtn').onclick = () => { APP.UI.closeAllModals(); if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || !APP.State.ENGINE.editor.workingLevel) return; const l = APP.State.ENGINE.editor.workingLevel; APP.LevelUtils.transformLevel(l, (x, y) => ({ x: l.grid.h - 1 - y, y: x }), l.grid.h, l.grid.w, (a) => a === APP.Core.H ? APP.Core.V : APP.Core.H); APP.UI.showMessage("Rotated", "text-white font-black"); };
        document.getElementById('gridMirrorBtn').onclick = () => { APP.UI.closeAllModals(); if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || !APP.State.ENGINE.editor.workingLevel) return; const l = APP.State.ENGINE.editor.workingLevel; APP.State.ENGINE.editor.mirrorHorizontal = !APP.State.ENGINE.editor.mirrorHorizontal; APP.UI.setInlineStyle('mirrorIconSvg', 'transform', APP.State.ENGINE.editor.mirrorHorizontal ? 'rotate(90deg)' : 'rotate(0deg)'); if (APP.State.ENGINE.editor.mirrorHorizontal) { APP.LevelUtils.transformLevel(l, (x, y) => ({ x: l.grid.w - 1 - x, y: y }), l.grid.w, l.grid.h, (a) => a); } else { APP.LevelUtils.transformLevel(l, (x, y) => ({ x: x, y: l.grid.h - 1 - y }), l.grid.w, l.grid.h, (a) => a); } APP.UI.showMessage("Mirrored", "text-white font-black"); };
        document.getElementById('gridSizeMinusBtn').onclick = () => { APP.UI.closeAllModals(); APP.LevelUtils.changeGridSize(-1); };
        document.getElementById('gridSizePlusBtn').onclick = () => { APP.UI.closeAllModals(); APP.LevelUtils.changeGridSize(1); };
        document.getElementById('muteBtn').onclick = () => { APP.UI.closeAllModals(); APP.State.ENGINE.muted = !APP.State.ENGINE.muted; APP.UI.setInlineStyle('muteSlash', 'display', APP.State.ENGINE.muted ? 'block' : 'none'); };
        document.getElementById('orientationToggleBtn').onclick = () => { APP.UI.closeAllModals(); APP.State.ENGINE.ui.forceLandscapeLayout = !APP.State.ENGINE.ui.forceLandscapeLayout; APP.UI.updateLayoutMode(); APP.UI.updateAppScale(); APP.UI.updateViewport(); APP.UI.showMessage(APP.State.ENGINE.ui.forceLandscapeLayout ? 'Landscape layout on.' : 'Standard layout on.', 'text-sky-600'); };

        const perspectiveAction = () => { APP.UI.closeAllModals(); if (APP.State.ENGINE.activeSolverController) return; APP.State.ENGINE.variant = (APP.State.ENGINE.variant + 1) % 8; APP.UI.updateViewport(); APP.Engine.rebuildDerivedPathState(APP.State.ENGINE); APP.Core.SOUND_BUS.play("D5", "32n"); };
        document.getElementById('whoaBtn').onclick = perspectiveAction;

        document.getElementById('resetBtn').onclick = () => {
            APP.UI.closeAllModals();
            if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return;
            if (APP.State.ENGINE.cheatActive) {
                if (APP.State.ENGINE.cheatTimer) clearTimeout(APP.State.ENGINE.cheatTimer);
                APP.State.ENGINE.cheatTimer = setTimeout(() => { APP.State.ENGINE.cheatActive = false; }, 3000);
            } else {
                APP.State.ENGINE.resetStreak++;
                if (APP.State.ENGINE.resetStreak >= 5) {
                    APP.State.ENGINE.cheatActive = true;
                    APP.Core.SOUND_BUS.play("F5", "8n");
                    if (APP.State.ENGINE.cheatTimer) clearTimeout(APP.State.ENGINE.cheatTimer);
                    APP.State.ENGINE.cheatTimer = setTimeout(() => {
                        APP.State.ENGINE.cheatActive = false;
                        APP.State.ENGINE.resetStreak = 0;
                    }, 3000);
                }
            }
            APP.Engine.loadLevel(APP.State.ENGINE.levelIdx, { keepVariant: true });
        };

        document.getElementById('undoBtn').onclick = () => { APP.UI.closeAllModals(); if(APP.State.ENGINE.undoStack.length) APP.Engine.applySnapshot(APP.State.ENGINE.undoStack.pop()); };
        document.getElementById('devGenBtn').onclick = async () => { APP.UI.closeAllModals(); const hints = (APP.State.ENGINE.foundHintsSinceLoad || []).filter(path => APP.Solver.validateCandidatePath(APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.level), path)?.ok); if (!hints.length) { APP.UI.showMessage("No valid hints found yet.", ""); return; } const hintText = JSON.stringify(hints).replace(/\s/g, ''); APP.UI.setSolutionOutput(hintText); await APP.UI.copyText(hintText, { fallbackElId: 'solutionOutput' }); APP.UI.showMessage(`Copied ${hints.length} hint${hints.length === 1 ? '' : 's'}`, ""); };
        document.getElementById('editGenBtn').onclick = () => { APP.UI.closeAllModals(); APP.UI.setButtonState('editGenBtn', { enabled: true }); APP.Editor.generateLevelString(); };
        const copyCurrentPath = async () => {
            APP.UI.closeAllModals();
            if (APP.State.ENGINE.path.length > 0) {
                const pathStr = JSON.stringify(APP.State.ENGINE.path).replace(/\s/g, '');
                APP.UI.setSolutionOutput(pathStr);
                await APP.UI.copyText(pathStr, { fallbackElId: 'solutionOutput' });
                APP.UI.showMessage("Path Copied", "text-white font-black");
            }
        };
        document.getElementById('devCopyBtn').onclick = copyCurrentPath;
        document.getElementById('editCopyBtn').onclick = copyCurrentPath;

        const hintBtn = document.getElementById('hintBtn');
        const showSavedHint = () => {
            if (APP.State.ENGINE.level?.hints?.length > 0) {
                APP.State.ENGINE.hinter.pathList = APP.State.ENGINE.level.hints;
                APP.State.ENGINE.hinter.currentPathIdx = (APP.State.ENGINE.hinter.source === 'saved' ? (APP.State.ENGINE.hinter.currentPathIdx + 1) % APP.State.ENGINE.hinter.pathList.length : 0);
                APP.State.ENGINE.hinter.source = 'saved';
                APP.Solver.startHintAnimation();
            } else APP.UI.showMessage("No saved hint.", "text-white font-black");
        };
        // Play Mode hint plays saved hints from levels.js only; it never runs the
        // solver. The Edit Mode Solve button is the sole solver entry point.
        hintBtn.onclick = () => {
            APP.UI.closeAllModals();
            if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return;
            showSavedHint();
        };

        document.getElementById('solverCloseBtn').onclick = () => {
            if (!APP.Solver.isRunning()) {
                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                return;
            }
            APP.UI.showMessage('Stopping solver…', 'text-amber-400 font-bold');
            APP.Solver.cancel();
        };
        document.addEventListener('keydown', (e) => {
            if (!APP.State.ENGINE.isDevMode) return;
            if (e.shiftKey && e.key.toLowerCase() === 'r') {
                APP.State.ENGINE.flags.useRefereeSolver = !APP.State.ENGINE.flags.useRefereeSolver;
                APP.UI.showMessage(`Referee solver ${APP.State.ENGINE.flags.useRefereeSolver ? 'ON' : 'OFF'}`, 'text-white font-black');
            }
        });
        const handleWinClose = (callback) => { const circle = document.getElementById('winCircle'); circle.classList.add('animate-spin-grow-fade'); setTimeout(() => { circle.classList.remove('animate-spin-grow-fade'); APP.UI.closeModal('winModal'); callback(); }, 1000); };
        document.getElementById('copyWinDataBtn').onclick = async () => { if (document.getElementById('winSolutionOutput').value) await APP.UI.copyText(document.getElementById('winSolutionOutput').value, { fallbackElId: 'winSolutionOutput' }); };
        document.getElementById('prevLevelBtn').onclick = () => tryNavigate(() => { APP.UI.closeAllModals(); if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return; const levels = APP.LevelUtils.getRawLevels(); APP.Engine.loadLevel(APP.State.ENGINE.levelIdx > 0 ? APP.State.ENGINE.levelIdx - 1 : levels.length - 1); APP.UI.setSolutionOutput(''); });
        document.getElementById('nextLevelBtn').onclick = () => tryNavigate(() => { APP.UI.closeAllModals(); if (APP.State.ENGINE.overlayState !== APP.Core.OVERLAY_NONE || APP.State.ENGINE.activeSolverController) return; const levels = APP.LevelUtils.getRawLevels(); APP.Engine.loadLevel(APP.State.ENGINE.levelIdx < levels.length - 1 ? APP.State.ENGINE.levelIdx + 1 : 0); APP.UI.setSolutionOutput(''); });
        document.getElementById('nextLevelModalBtn').onclick = () => { const levels = APP.LevelUtils.getRawLevels(); handleWinClose(() => { if (APP.State.ENGINE.levelIdx < levels.length - 1) APP.Engine.loadLevel(APP.State.ENGINE.levelIdx + 1); }); };
        document.getElementById('dismissWinModalBtn').onclick = () => handleWinClose(() => { APP.Engine.setLogicState(APP.Core.IDLE); });

        document.getElementById('guideBtn').onclick = () => {
            const isVisible = APP.UI.isModalOpen('guideModal');
            APP.UI.closeAllModals();
            if (!isVisible) APP.UI.openModal('guideModal');
        };
        document.getElementById('closeGuideX').onclick = () => APP.UI.closeModal('guideModal');

        const tModal = document.getElementById('themeModal');
        document.getElementById('openThemeModalBtn').onclick = () => {
            if (APP.UI.isModalOpen('themeModal')) {
                APP.UI.closeModal('themeModal');
                closeEditor();
                return;
            }
            APP.UI.closeAllModals();
            APP.UI.updateLayoutMode();
            APP.Themes.populateThemes();
            refreshThemeFooter();
            APP.UI.openModal('themeModal');
        };
        document.getElementById('closeThemeModalBtn').onclick = () => { APP.UI.closeModal('themeModal'); closeEditor(); };
        document.getElementById('dismissThemeModalBtn').onclick = () => { APP.UI.closeModal('themeModal'); closeEditor(); };
        document.getElementById('openThemeEditorBtn').onclick = () => { APP.UI.ThemeEditor.openEditorView(); };
        const closeEditor = () => { APP.UI.ThemeEditor.closeEditorView(); refreshThemeFooter(); };
        const refreshThemeFooter = () => {
            const editBtn = document.getElementById('openThemeEditorBtn');
            const footer = document.getElementById('themeSelectFooter');
            const dismissBtn = document.getElementById('dismissThemeModalBtn');
            const canModify = APP.State.ENGINE.isDevMode || APP.State.ENGINE.mode === APP.Core.EDITOR;
            if (editBtn) editBtn.classList.toggle('hidden', !canModify);
            if (footer) footer.classList.toggle('justify-center', !canModify);
            if (footer) footer.classList.toggle('justify-between', canModify);
            if (dismissBtn) dismissBtn.classList.remove('hidden');
        };
        document.getElementById('backToThemeSelectBtn').onclick = closeEditor;
        document.getElementById('doneThemeEditBtn').onclick = closeEditor;
        document.getElementById('devToggleBtn').onclick = () => { APP.State.ENGINE.isDevMode = !APP.State.ENGINE.isDevMode; APP.Engine.updatePlayModeLayout(); APP.UI.showMessage(APP.State.ENGINE.isDevMode ? "Dev Enabled" : "Player Enabled", "text-white font-black"); };
        APP.UI.bindAll('.editor-input', 'input', () => {
            APP.Editor.markEditorInputsDirty();
            APP.Editor.applyMetricsFromUI();
        });
        document.getElementById('modeToggleBtn').onclick = () => { APP.UI.closeAllModals(); APP.Editor.enterEditorMode(); };
        document.getElementById('editModeToggleBtn').onclick = () => tryNavigate(() => { APP.UI.closeAllModals(); APP.Editor.exitEditorMode(); });

        document.getElementById('editTrapSpotsBtn').onclick = async () => {
            const isVisible = APP.UI.isModalOpen('editorHelpModal');
            if (isVisible) APP.UI.closeModal('editorHelpModal');
            APP.UI.closeAllModals();
            if (APP.Solver.isRunning() || APP.State.ENGINE.activeSolverController) {
                APP.UI.showSolverAlreadyRunning();
                return;
            }
            APP.Solver.stopHintAnimation();
            APP.Editor.applyMetricsFromUI();
            const l = APP.State.ENGINE.editor.workingLevel;
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
                const budgetMs = APP.SolverV2.getTrapSpotBudgetMs(searchLevel);
                const t0 = Date.now();
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
                APP.Renderer.render();
                if (APP.State.ENGINE.editor.validTrapSpots.size > 0) {
                    APP.UI.showMessage(`Found ${APP.State.ENGINE.editor.validTrapSpots.size} spots.`, 'text-white font-black');
                } else if (res.timedOut) {
                    APP.UI.showMessage('Search timed out; results incomplete.', 'text-amber-300 font-black');
                    const retry = window.confirm('Trap spot search timed out. Retry with a longer budget?');
                    if (retry) {
                        // TEMP (2026-03-29): trap-spot retry ceiling doubled a second time from 240000ms to 480000ms (4x original 120000ms).
                        // Revert target ceiling to 120000ms to return to original baseline.
                        const retryBudgetMs = Math.min(480000, Math.max((res.timeLimit || budgetMs) * 2, 10000));
                        const retryLevel = APP.LevelUtils.deepCloneLevel(l);
                        APP.Engine.setOverlayState(APP.Core.SOLVER_RUNNING);
                        APP.UI.setModalContent('searchLabel', 'Searching for Trap Spots...', 'text');
                        APP.UI.setSolverDetailText('Retrying with longer budget…');
                        APP.UI.setSolverTimerText('0.0s');
                        APP.UI.setSolverProgress(0);
                        await new Promise(r => setTimeout(r, 0));
                        const t1 = Date.now();
                        const retryTimer = setInterval(() => { APP.UI.setSolverTimerText(`${((Date.now() - t1) / 1000).toFixed(1)}s`); }, 100);
                        let retryRes;
                        try {
                            retryRes = await APP.SolverV2.findTrapSpots(retryLevel, { timeLimit: retryBudgetMs, yieldFn });
                        } finally {
                            clearInterval(retryTimer);
                        }
                        APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                        APP.Editor.setTrapSpots(retryRes.spots || new Set());
                        APP.Renderer.render();
                        if (APP.State.ENGINE.editor.validTrapSpots.size > 0) APP.UI.showMessage(`Found ${APP.State.ENGINE.editor.validTrapSpots.size} spots after retry.`, 'text-white font-black');
                        else if (retryRes.timedOut) APP.UI.showMessage('Retry timed out; results incomplete.', 'text-amber-300 font-black');
                        else APP.UI.showMessage('No spots found.', 'text-white font-black');
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
        const palettePointerStarts = new Map();
        APP.UI.bindAll('.palette-item[data-type]', 'pointerdown', (e, el) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            palettePointerStarts.set(e.pointerId, {
                type: el.dataset.type,
                x: e.clientX,
                y: e.clientY,
                target: el,
                moved: false
            });
        });
        window.addEventListener('pointermove', (e) => {
            const press = palettePointerStarts.get(e.pointerId);
            if (!press) return;
            const dx = Math.abs(e.clientX - press.x);
            const dy = Math.abs(e.clientY - press.y);
            if (!press.moved && (dx > 6 || dy > 6)) {
                press.moved = true;
                APP.Editor.handlePaletteToolPointerDown(press.type, { forceActivate: true });
            }
        });
        const releasePalettePress = (e) => {
            const press = palettePointerStarts.get(e.pointerId);
            if (!press) return;
            if (!press.moved) APP.Editor.handlePaletteToolPointerDown(press.type);
            palettePointerStarts.delete(e.pointerId);
        };
        window.addEventListener('pointerup', releasePalettePress);
        window.addEventListener('pointercancel', releasePalettePress);
        document.getElementById('editPencilBtn').onclick = () => { APP.UI.closeAllModals(); APP.Editor.togglePencilMode(); };

        const eraserBtn = document.getElementById('editEraserBtn'); let eraserTimer = null, eraserFired = false;
        eraserBtn.addEventListener('pointerdown', (e) => { if (APP.State.ENGINE.mode !== APP.Core.EDITOR) return; eraserTimer = setTimeout(() => { APP.Engine.PathNavigator.clear(APP.State.ENGINE); APP.UI.showMessage("Cleared", "text-white font-black"); eraserFired = true; }, 1500); });
        const handleEraserRelease = () => { if (eraserTimer) { clearTimeout(eraserTimer); if (!eraserFired) { if (APP.State.ENGINE.path.length > 1) APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, APP.State.ENGINE.path.length - 2); else APP.Engine.PathNavigator.clear(APP.State.ENGINE); } eraserTimer = null; eraserFired = false; } };
        eraserBtn.addEventListener('pointerup', handleEraserRelease); eraserBtn.addEventListener('pointerleave', handleEraserRelease);

        document.getElementById('editUndoGridBtn').onclick = () => { APP.UI.closeAllModals(); APP.Editor.restoreEditorState(); };
        document.getElementById('editResetGrid').onclick = () => { APP.UI.closeAllModals(); APP.Editor.resetWorkingGrid(); APP.UI.showMessage("Reset", "text-white font-black"); };
        document.getElementById('editNewLevel').onclick = () => tryNavigate(() => {
            APP.UI.closeAllModals();
            APP.Editor.createNewLevel();
            APP.UI.showMessage("New Level Created", "text-white font-black");
        });
        document.getElementById('editHelpBtn').onclick = () => {
            const isVisible = APP.UI.isModalOpen('editorHelpModal');
            APP.UI.closeAllModals();
            if (!isVisible) APP.UI.openModal('editorHelpModal');
        };
        document.getElementById('closeEditorHelpX').onclick = () => APP.UI.closeModal('editorHelpModal');
        document.getElementById('editMegaSolver').onclick = async () => {
            APP.UI.closeAllModals();
            if (APP.State.ENGINE.activeSolverController) return;
            let _cancelled = false;
            const cancelSolve = () => {
                if (_cancelled) return;
                _cancelled = true;
                APP.UI.setModalContent('searchLabel', 'Stopping… finishing current stage safely.', 'text');
                APP.UI.setButtonState('solverCloseBtn', { enabled: false });
            };
            const yieldFn = async () => {
                await new Promise(r => setTimeout(r, 0));
                if (_cancelled) throw new Error('SolverV2:cancelled');
            };
            APP.State.ENGINE.activeSolverController = { cancel: cancelSolve, abort: cancelSolve };
            APP.State.ENGINE.solverAbortRequested = false;
            const abortPoll = setInterval(() => { if (APP.State.ENGINE.solverAbortRequested) cancelSolve(); }, 100);
            try {
                APP.Engine.setOverlayState(APP.Core.SOLVER_RUNNING);
                APP.UI.setSolverControlsEnabled(false);
                APP.UI.setSolverTimerText('0.0s');
                APP.UI.setSolverDetailText('Searching…');
                APP.UI.setSolverProgress(0);
                await new Promise(r => setTimeout(r, 0));
                const level = APP.LevelUtils.deepCloneLevel(APP.State.ENGINE.editor.workingLevel);
                const budgetMs = 30000;
                const t0 = Date.now();
                const overlayMinTimer = new Promise(r => setTimeout(r, 400));
                const timerInterval = setInterval(() => {
                    const elapsed = (Date.now() - t0) / 1000;
                    APP.UI.setSolverTimerText(`${elapsed.toFixed(1)}s`);
                    APP.UI.setSolverProgress(Math.min(95, elapsed / (budgetMs / 1000) * 100));
                }, 100);
                let result;
                try {
                    result = await APP.SolverV2.solve(level, { timeBudgetMs: budgetMs, yieldFn });
                    await overlayMinTimer;
                } finally {
                    clearInterval(timerInterval);
                }
                if (result.ok && Array.isArray(result.solution) && result.solution.length > 0) {
                    APP.UI.setSolverProgress(100);
                    APP.State.ENGINE.hinter.pathList = [result.solution];
                    APP.State.ENGINE.hinter.currentPathIdx = 0;
                    APP.State.ENGINE.hinter.source = 'solver';
                    APP.Solver.startHintAnimation();
                } else {
                    APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
                    APP.UI.showMessage('No solution found within time limit.', 'text-yellow-400 font-bold');
                }
            } catch (err) {
                if (err?.message !== 'SolverV2:cancelled') {
                    console.error('SolverV2 failed:', err);
                    APP.UI.showMessage(`Solve failed: ${err?.message || 'Unexpected error.'}`, 'text-red-500 font-bold');
                }
                APP.Engine.setOverlayState(APP.Core.OVERLAY_NONE);
            } finally {
                clearInterval(abortPoll);
                APP.State.ENGINE.activeSolverController = null;
                APP.State.ENGINE.solverAbortRequested = false;
                APP.UI.setSolverControlsEnabled(true);
            }
        };
        document.getElementById('editCopyMetrics').onclick = () => { APP.UI.closeAllModals(); if (APP.State.ENGINE.path.length > 0) { const len = APP.Engine.getRealLength(); APP.UI.setInputValue('editReqLen', len); APP.UI.setInputValue('editReqInt', APP.State.ENGINE.intersections); APP.Editor.applyMetricsFromUI(); APP.UI.showMessage("Metrics Set", "text-white font-black"); } };

        };
        return { init };
    })();
}
