// Pointer-input controller: canvas pointerdown/pointermove/pointerup,
// drag-ghost update, and the gamepadGridPrimaryAction bridge.

import { getOccupant } from '../editor/editor-occupancy.js';
import { MoveContext } from '../domain/move-context.js';

export function createPointerInputController({ core, state, ui, engine, levelUtils, editor, renderer }) {

    const handleDown = (e) => {
        if (state.ENGINE.activeSolverController
            || state.ENGINE.logicState === core.RESOLVED
            || [core.HINT_ANIMATING, core.FALSE_GOAL_ANIMATING, core.GOOSE_OVERLAY, core.SOLVER_RUNNING].includes(state.ENGINE.overlayState)) return;

        const p           = levelUtils.getGridCoord(e);
        const k           = levelUtils.PACK(p.x, p.y);
        const activeLevel = state.ENGINE.mode === core.PLAY
            ? state.ENGINE.level
            : state.ENGINE.editor.workingLevel;

        state.ENGINE.resetStreak           = 0;
        state.ENGINE.runtime.tapStartCoord = { x: p.x, y: p.y };
        state.ENGINE.runtime.tapMoved      = false;

        // --- Editor/review drag-object mode ---
        if ((state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW)
                && !state.ENGINE.editor.isPencilMode) {
            if (getOccupant(activeLevel, k)) {
                state.ENGINE.editor.emptyClickCount = 0;
                state.ENGINE.editor.draggedObject   = editor.pickUpObject(k);
                if (state.ENGINE.editor.draggedObject) {
                    engine.setLogicState(core.EDIT_DRAG);
                    ui.EditorDragGhost.update({ visible: true, cellSize: state.ENGINE.viewport.cellW, type: state.ENGINE.editor.draggedObject.type });
                }
            } else if (state.ENGINE.editor.selectedTool) {
                state.ENGINE.editor.emptyClickCount = 0;
                editor.placeEditorObject(k);
            } else {
                state.ENGINE.editor.emptyClickCount++;
                if (state.ENGINE.editor.emptyClickCount >= 2) {
                    ui.showMessage('Click pencil to draw.', 'text-white font-bold');
                }
            }
            return;
        }

        // --- Path extension ---
        if (state.ENGINE.path.length > 0) {
            // Switch gate while path has exactly one node
            if (state.ENGINE.path.length === 1
                    && activeLevel.gateKeys.includes(k)
                    && k !== state.ENGINE.activeGateKey) {
                engine.PathNavigator.clear(state.ENGINE);
                state.ENGINE.activeGateKey = k;
                engine.PathNavigator.pushStep(state.ENGINE, k, false);
                engine.setLogicState(core.DRAGGING);
                return;
            }
            // Pencil mode: allow reversing the path direction from the tail end
            if ((state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW)
                    && state.ENGINE.editor.isPencilMode) {
                const idx = state.ENGINE.path.indexOf(k);
                let shouldReverse = false;
                if (idx !== -1) {
                    if (idx < state.ENGINE.path.length / 2) shouldReverse = true;
                } else {
                    const headP = levelUtils.UNPACK(state.ENGINE.path[state.ENGINE.path.length - 1]);
                    const tailP = levelUtils.UNPACK(state.ENGINE.path[0]);
                    const distHead = Math.abs(p.x - headP.x) + Math.abs(p.y - headP.y);
                    const distTail = Math.abs(p.x - tailP.x) + Math.abs(p.y - tailP.y);
                    if (distTail < distHead) shouldReverse = true;
                }
                if (shouldReverse) {
                    state.ENGINE.path.reverse();
                    const newJumps = new Set();
                    state.ENGINE.isPortalJump.forEach(jIdx => newJumps.add(state.ENGINE.path.length - 1 - jIdx));
                    state.ENGINE.isPortalJump = newJumps;
                    engine.rebuildDerivedPathState(state.ENGINE);
                }
            }
            // Tapping an earlier visited cell: truncate or allow legal intersection
            const lastIdx = state.ENGINE.path.lastIndexOf(k);
            if (lastIdx !== -1 && lastIdx < state.ENGINE.path.length - 1) {
                const legalIntersectionMove = levelUtils.isValidMove(k, state.ENGINE, activeLevel, MoveContext.TAP_ROUTE)
                    && !engine.wouldCreateBlockedTIntersection?.(state.ENGINE, k, activeLevel);
                if (!legalIntersectionMove) {
                    engine.PathNavigator.truncateTo(state.ENGINE, lastIdx);
                    engine.setLogicState(core.DRAGGING);
                    return;
                }
            }
            engine.setLogicState(core.DRAGGING);
            engine.handlePrimaryGridInput(p, { inputType: 'tap' });

        } else {
            // --- Path start ---
            if (!activeLevel) return;
            if ((state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW)
                    && state.ENGINE.editor.isPencilMode) {
                state.ENGINE.activeGateKey = null;
                engine.PathNavigator.pushStep(state.ENGINE, k, false);
                engine.setLogicState(core.DRAGGING);
                engine.handlePrimaryGridInput(p, { inputType: 'tap' });
            } else {
                // Find nearest same-axis gate
                let bestGate = null;
                if (activeLevel.gateKeys.includes(k)) {
                    bestGate = k;
                } else {
                    let minDist = Infinity;
                    for (let i = 0; i < activeLevel.gateKeys.length; i++) {
                        const gk   = activeLevel.gateKeys[i];
                        const gp   = levelUtils.UNPACK(gk);
                        if (p.x === gp.x || p.y === gp.y) {
                            const dist = Math.abs(p.x - gp.x) + Math.abs(p.y - gp.y);
                            if (dist > 0 && dist < minDist) { minDist = dist; bestGate = gk; }
                        }
                    }
                }
                if (bestGate !== null) {
                    state.ENGINE.activeGateKey = bestGate;
                    engine.PathNavigator.pushStep(state.ENGINE, bestGate, false);
                    engine.setLogicState(core.DRAGGING);
                    if (bestGate !== k) engine.handlePrimaryGridInput(p, { inputType: 'tap' });
                }
            }
        }
    };

    const handleUp = (e) => {
        if (state.ENGINE.logicState === core.EDIT_DRAG
                && (state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW)) {
            const canvas = renderer.getCanvas();
            const crect  = canvas.getBoundingClientRect();
            if (e.clientX >= crect.left && e.clientX <= crect.right
                    && e.clientY >= crect.top && e.clientY <= crect.bottom) {
                editor.placeEditorObject(levelUtils.PACK(levelUtils.getGridCoord(e).x, levelUtils.getGridCoord(e).y));
            } else if (state.ENGINE.editor.draggedFromGrid) {
                state.ENGINE.editor.draggedObject = null;
                editor.saveEditorState();
                ui.showMessage('Deleted', 'text-white font-black');
            }
            state.ENGINE.editor.draggedObject = null;
            engine.setLogicState(core.IDLE);
        }
        if (state.ENGINE.logicState === core.DRAGGING) engine.setLogicState(core.IDLE);
    };

    // --- Canvas pointer listeners ---

    renderer.getCanvas().addEventListener('pointerdown', e => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (state.ENGINE.runtime.activePointerId !== null) return;
        e.preventDefault();
        state.ENGINE.runtime.activePointerId = e.pointerId;
        renderer.getCanvas().setPointerCapture(state.ENGINE.runtime.activePointerId);
        handleDown(e);
    });

    window.addEventListener('pointermove', e => {
        // Drag-ghost update
        if ((state.ENGINE.mode === core.EDITOR || state.ENGINE.mode === core.REVIEW)
                && (state.ENGINE.editor.draggedObject || (state.ENGINE.editor.selectedTool && state.ENGINE.logicState === core.EDIT_DRAG))) {
            const type = state.ENGINE.editor.draggedObject
                ? state.ENGINE.editor.draggedObject.type
                : state.ENGINE.editor.selectedTool;
            const isOverPalette = ui.EditorDragGhost.isPointerOverPalette(e.clientX, e.clientY);
            ui.EditorDragGhost.update({ visible: true, x: e.clientX, y: e.clientY, cellSize: state.ENGINE.viewport.cellW, type, isOverPalette });
        } else {
            ui.EditorDragGhost.update({ visible: false });
        }

        if (e.pointerId !== state.ENGINE.runtime.activePointerId
                && state.ENGINE.logicState !== core.EDIT_DRAG) return;

        const dragCoord = levelUtils.getGridCoord(e);
        const tapStart  = state.ENGINE.runtime.tapStartCoord;
        if (tapStart && (dragCoord.x !== tapStart.x || dragCoord.y !== tapStart.y)) {
            state.ENGINE.runtime.tapMoved = true;
        }
        e.preventDefault();
        if ([core.DRAGGING, core.HAZARD_TRIGGERED].includes(state.ENGINE.logicState)) {
            engine.handlePrimaryGridInput(dragCoord, { inputType: 'drag' });
        }
    });

    window.addEventListener('pointerup', e => {
        handleUp(e);
        if (state.ENGINE.runtime.activePointerId !== null
                && renderer.getCanvas().hasPointerCapture(state.ENGINE.runtime.activePointerId)) {
            renderer.getCanvas().releasePointerCapture(state.ENGINE.runtime.activePointerId);
        }
        state.ENGINE.runtime.activePointerId = null;
        state.ENGINE.runtime.tapStartCoord   = null;
        state.ENGINE.runtime.tapMoved        = false;
    });

    // --- Gamepad bridge: press canvas centre ---

    const handleGridPressAtPoint = (clientX, clientY) => handleDown({ clientX, clientY });
    state.ENGINE.ui.gamepadGridPrimaryAction = () => {
        const canvas = renderer.getCanvas();
        const rect   = canvas.getBoundingClientRect();
        handleGridPressAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    };
}
