// Pointer-input controller: canvas pointerdown/pointermove/pointerup,
// drag-ghost update, and the gamepadGridPrimaryAction bridge.

import { getOccupant } from '../editor/editor-occupancy.js';
import { MoveContext } from '../domain/move-context.js';

export function installPointerInputController(APP) {

    const handleDown = (e) => {
        if (APP.State.ENGINE.activeSolverController
            || APP.State.ENGINE.logicState === APP.Core.RESOLVED
            || [APP.Core.HINT_ANIMATING, APP.Core.FALSE_GOAL_ANIMATING, APP.Core.GOOSE_OVERLAY, APP.Core.SOLVER_RUNNING].includes(APP.State.ENGINE.overlayState)) return;

        const p           = APP.LevelUtils.getGridCoord(e);
        const k           = APP.LevelUtils.PACK(p.x, p.y);
        const activeLevel = APP.State.ENGINE.mode === APP.Core.PLAY
            ? APP.State.ENGINE.level
            : APP.State.ENGINE.editor.workingLevel;

        APP.State.ENGINE.resetStreak            = 0;
        APP.State.ENGINE.runtime.tapStartCoord  = { x: p.x, y: p.y };
        APP.State.ENGINE.runtime.tapMoved       = false;

        // --- Editor/review drag-object mode ---
        if ((APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW)
                && !APP.State.ENGINE.editor.isPencilMode) {
            if (getOccupant(activeLevel, k)) {
                APP.State.ENGINE.editor.emptyClickCount = 0;
                APP.State.ENGINE.editor.draggedObject   = APP.Editor.pickUpObject(k);
                if (APP.State.ENGINE.editor.draggedObject) {
                    APP.Engine.setLogicState(APP.Core.EDIT_DRAG);
                    APP.UI.EditorDragGhost.update({ visible: true, cellSize: APP.State.ENGINE.viewport.cellW, type: APP.State.ENGINE.editor.draggedObject.type });
                }
            } else if (APP.State.ENGINE.editor.selectedTool) {
                APP.State.ENGINE.editor.emptyClickCount = 0;
                APP.Editor.placeEditorObject(k);
            } else {
                APP.State.ENGINE.editor.emptyClickCount++;
                if (APP.State.ENGINE.editor.emptyClickCount >= 2) {
                    APP.UI.showMessage('Click pencil to draw.', 'text-white font-bold');
                }
            }
            return;
        }

        // --- Path extension ---
        if (APP.State.ENGINE.path.length > 0) {
            // Switch gate while path has exactly one node
            if (APP.State.ENGINE.path.length === 1
                    && activeLevel.gateKeys.includes(k)
                    && k !== APP.State.ENGINE.activeGateKey) {
                APP.Engine.PathNavigator.clear(APP.State.ENGINE);
                APP.State.ENGINE.activeGateKey = k;
                APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, k, false);
                APP.Engine.setLogicState(APP.Core.DRAGGING);
                return;
            }
            // Pencil mode: allow reversing the path direction from the tail end
            if ((APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW)
                    && APP.State.ENGINE.editor.isPencilMode) {
                const idx = APP.State.ENGINE.path.indexOf(k);
                let shouldReverse = false;
                if (idx !== -1) {
                    if (idx < APP.State.ENGINE.path.length / 2) shouldReverse = true;
                } else {
                    const headP = APP.LevelUtils.UNPACK(APP.State.ENGINE.path[APP.State.ENGINE.path.length - 1]);
                    const tailP = APP.LevelUtils.UNPACK(APP.State.ENGINE.path[0]);
                    const distHead = Math.abs(p.x - headP.x) + Math.abs(p.y - headP.y);
                    const distTail = Math.abs(p.x - tailP.x) + Math.abs(p.y - tailP.y);
                    if (distTail < distHead) shouldReverse = true;
                }
                if (shouldReverse) {
                    APP.State.ENGINE.path.reverse();
                    const newJumps = new Set();
                    APP.State.ENGINE.isPortalJump.forEach(jIdx => newJumps.add(APP.State.ENGINE.path.length - 1 - jIdx));
                    APP.State.ENGINE.isPortalJump = newJumps;
                    APP.Engine.rebuildDerivedPathState(APP.State.ENGINE);
                }
            }
            // Tapping an earlier visited cell: truncate or allow legal intersection
            const lastIdx = APP.State.ENGINE.path.lastIndexOf(k);
            if (lastIdx !== -1 && lastIdx < APP.State.ENGINE.path.length - 1) {
                const legalIntersectionMove = APP.LevelUtils.isValidMove(k, APP.State.ENGINE, activeLevel, MoveContext.TAP_ROUTE)
                    && !APP.Engine.wouldCreateBlockedTIntersection?.(APP.State.ENGINE, k, activeLevel);
                if (!legalIntersectionMove) {
                    APP.Engine.PathNavigator.truncateTo(APP.State.ENGINE, lastIdx);
                    APP.Engine.setLogicState(APP.Core.DRAGGING);
                    return;
                }
            }
            APP.Engine.setLogicState(APP.Core.DRAGGING);
            APP.Engine.handlePrimaryGridInput(p, { inputType: 'tap' });

        } else {
            // --- Path start ---
            if (!activeLevel) return;
            if ((APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW)
                    && APP.State.ENGINE.editor.isPencilMode) {
                APP.State.ENGINE.activeGateKey = null;
                APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, k, false);
                APP.Engine.setLogicState(APP.Core.DRAGGING);
                APP.Engine.handlePrimaryGridInput(p, { inputType: 'tap' });
            } else {
                // Find nearest same-axis gate
                let bestGate = null;
                if (activeLevel.gateKeys.includes(k)) {
                    bestGate = k;
                } else {
                    let minDist = Infinity;
                    for (let i = 0; i < activeLevel.gateKeys.length; i++) {
                        const gk   = activeLevel.gateKeys[i];
                        const gp   = APP.LevelUtils.UNPACK(gk);
                        if (p.x === gp.x || p.y === gp.y) {
                            const dist = Math.abs(p.x - gp.x) + Math.abs(p.y - gp.y);
                            if (dist > 0 && dist < minDist) { minDist = dist; bestGate = gk; }
                        }
                    }
                }
                if (bestGate !== null) {
                    APP.State.ENGINE.activeGateKey = bestGate;
                    APP.Engine.PathNavigator.pushStep(APP.State.ENGINE, bestGate, false);
                    APP.Engine.setLogicState(APP.Core.DRAGGING);
                    if (bestGate !== k) APP.Engine.handlePrimaryGridInput(p, { inputType: 'tap' });
                }
            }
        }
    };

    const handleUp = (e) => {
        if (APP.State.ENGINE.logicState === APP.Core.EDIT_DRAG
                && (APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW)) {
            const canvas = APP.Renderer.getCanvas();
            const crect  = canvas.getBoundingClientRect();
            if (e.clientX >= crect.left && e.clientX <= crect.right
                    && e.clientY >= crect.top && e.clientY <= crect.bottom) {
                APP.Editor.placeEditorObject(APP.LevelUtils.PACK(APP.LevelUtils.getGridCoord(e).x, APP.LevelUtils.getGridCoord(e).y));
            } else if (APP.State.ENGINE.editor.draggedFromGrid) {
                APP.State.ENGINE.editor.draggedObject = null;
                APP.Editor.saveEditorState();
                APP.UI.showMessage('Deleted', 'text-white font-black');
            }
            APP.State.ENGINE.editor.draggedObject = null;
            APP.Engine.setLogicState(APP.Core.IDLE);
        }
        if (APP.State.ENGINE.logicState === APP.Core.DRAGGING) APP.Engine.setLogicState(APP.Core.IDLE);
    };

    // --- Canvas pointer listeners ---

    APP.Renderer.getCanvas().addEventListener('pointerdown', e => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (APP.State.ENGINE.runtime.activePointerId !== null) return;
        e.preventDefault();
        APP.State.ENGINE.runtime.activePointerId = e.pointerId;
        APP.Renderer.getCanvas().setPointerCapture(APP.State.ENGINE.runtime.activePointerId);
        handleDown(e);
    });

    window.addEventListener('pointermove', e => {
        // Drag-ghost update
        if ((APP.State.ENGINE.mode === APP.Core.EDITOR || APP.State.ENGINE.mode === APP.Core.REVIEW)
                && (APP.State.ENGINE.editor.draggedObject || (APP.State.ENGINE.editor.selectedTool && APP.State.ENGINE.logicState === APP.Core.EDIT_DRAG))) {
            const type = APP.State.ENGINE.editor.draggedObject
                ? APP.State.ENGINE.editor.draggedObject.type
                : APP.State.ENGINE.editor.selectedTool;
            const isOverPalette = APP.UI.EditorDragGhost.isPointerOverPalette(e.clientX, e.clientY);
            APP.UI.EditorDragGhost.update({ visible: true, x: e.clientX, y: e.clientY, cellSize: APP.State.ENGINE.viewport.cellW, type, isOverPalette });
        } else {
            APP.UI.EditorDragGhost.update({ visible: false });
        }

        if (e.pointerId !== APP.State.ENGINE.runtime.activePointerId
                && APP.State.ENGINE.logicState !== APP.Core.EDIT_DRAG) return;

        const dragCoord = APP.LevelUtils.getGridCoord(e);
        const tapStart  = APP.State.ENGINE.runtime.tapStartCoord;
        if (tapStart && (dragCoord.x !== tapStart.x || dragCoord.y !== tapStart.y)) {
            APP.State.ENGINE.runtime.tapMoved = true;
        }
        e.preventDefault();
        if ([APP.Core.DRAGGING, APP.Core.HAZARD_TRIGGERED].includes(APP.State.ENGINE.logicState)) {
            APP.Engine.handlePrimaryGridInput(dragCoord, { inputType: 'drag' });
        }
    });

    window.addEventListener('pointerup', e => {
        handleUp(e);
        if (APP.State.ENGINE.runtime.activePointerId !== null
                && APP.Renderer.getCanvas().hasPointerCapture(APP.State.ENGINE.runtime.activePointerId)) {
            APP.Renderer.getCanvas().releasePointerCapture(APP.State.ENGINE.runtime.activePointerId);
        }
        APP.State.ENGINE.runtime.activePointerId = null;
        APP.State.ENGINE.runtime.tapStartCoord   = null;
        APP.State.ENGINE.runtime.tapMoved        = false;
    });

    // --- Gamepad bridge: press canvas centre ---

    const handleGridPressAtPoint = (clientX, clientY) => handleDown({ clientX, clientY });
    APP.State.ENGINE.ui.gamepadGridPrimaryAction = () => {
        const canvas = APP.Renderer.getCanvas();
        const rect   = canvas.getBoundingClientRect();
        handleGridPressAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    };
}
