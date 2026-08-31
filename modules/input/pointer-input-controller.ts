import type { RequireDeps } from '../state.js';
import {
    DRAGGING, EDITOR, EDIT_DRAG, FALSE_GOAL_ANIMATING, GOOSE_OVERLAY,
    HAZARD_TRIGGERED, HINT_ANIMATING, IDLE, PLAY, RESOLVED, REVIEW, SOLVER_RUNNING,
} from '../app-constants.js';
// Pointer-input controller: canvas pointerdown/pointermove/pointerup,
// drag-ghost update, and the gamepadGridPrimaryAction bridge.

import { getOccupant } from '../editor/editor-occupancy.js';
import { MoveContext } from '../domain/move-context.js';
import { decideEditorCellAction, shouldReversePencilPath, findNearestAxisGate } from './pointer-input-core.js';
import {
    incrementEditorEmptyClickCount,
    setEditorDraggedObject,
    setEditorEmptyClickCount,
    setGamepadGridPrimaryAction,
    setNavigationActiveGateKey,
    setResetStreak,
    setRuntimeActivePointerId,
    setRuntimeTapMoved,
    setRuntimeTapStartCoord
} from '../state-actions.js';

export function createPointerInputController({ state, ui, engine, levelUtils, editor, renderer }: RequireDeps<'levelUtils'>) {

    const handleDown = (e: { clientX: number; clientY: number }) => {
        if (state.ENGINE.solver.controller
            || state.ENGINE.logicState === RESOLVED
            || ([HINT_ANIMATING, FALSE_GOAL_ANIMATING, GOOSE_OVERLAY, SOLVER_RUNNING] as readonly string[]).includes(state.ENGINE.overlayState)) return;

        const p           = levelUtils.getGridCoord(e);
        const k           = levelUtils.PACK(p.x, p.y);
        const activeLevel = state.ENGINE.mode === PLAY
            ? state.ENGINE.level
            : state.ENGINE.editor.workingLevel;

        setResetStreak(state, 0);
        setRuntimeTapStartCoord(state, { x: p.x, y: p.y });
        setRuntimeTapMoved(state, false);

        // --- Editor/review drag-object mode (decision in pointer-input-core) ---
        if ((state.ENGINE.mode === EDITOR || state.ENGINE.mode === REVIEW)
                && !state.ENGINE.editor.isPencilMode) {
            const cellAction = decideEditorCellAction({
                hasOccupant:     !!getOccupant(activeLevel, k),
                hasSelectedTool: !!state.ENGINE.editor.selectedTool,
                emptyClickCount: state.ENGINE.editor.emptyClickCount,
            });
            if (cellAction.action === 'pickup') {
                setEditorEmptyClickCount(state, 0);
                setEditorDraggedObject(state, editor.pickUpObject(k));
                if (state.ENGINE.editor.draggedObject) {
                    engine.setLogicState(EDIT_DRAG);
                    ui.EditorDragGhost.update({ visible: true, cellSize: state.ENGINE.viewport.cellW, type: state.ENGINE.editor.draggedObject.type });
                }
            } else if (cellAction.action === 'place') {
                setEditorEmptyClickCount(state, 0);
                editor.placeEditorObject(k);
            } else {
                incrementEditorEmptyClickCount(state);
                if (cellAction.showPencilHint) ui.showMessage('Click pencil to draw.', 'info');
            }
            return;
        }

        // --- Path extension ---
        if (state.ENGINE.nav.path.length > 0) {
            // Switch gate while path has exactly one node
            if (state.ENGINE.nav.path.length === 1
                    && activeLevel.gateKeys.includes(k)
                    && k !== state.ENGINE.nav.activeGateKey) {
                engine.navigation.PathNavigator.clear(state.ENGINE);
                setNavigationActiveGateKey(state, k);
                engine.navigation.PathNavigator.pushStep(state.ENGINE, k, false);
                engine.setLogicState(DRAGGING);
                return;
            }
            // Pencil mode: allow reversing the path direction from the tail end
            if ((state.ENGINE.mode === EDITOR || state.ENGINE.mode === REVIEW)
                    && state.ENGINE.editor.isPencilMode
                    && shouldReversePencilPath(state.ENGINE.nav.path, k, p)) {
                engine.navigation.reversePathDirection();
            }
            // Tapping an earlier visited cell: truncate or allow legal intersection
            const lastIdx = state.ENGINE.nav.path.lastIndexOf(k);
            if (lastIdx !== -1 && lastIdx < state.ENGINE.nav.path.length - 1) {
                const legalIntersectionMove = levelUtils.isValidMove(k, state.ENGINE, activeLevel, MoveContext.TAP_ROUTE)
                    && !engine.game.wouldCreateBlockedTIntersection?.(state.ENGINE, k, activeLevel);
                if (!legalIntersectionMove) {
                    engine.navigation.PathNavigator.truncateTo(state.ENGINE, lastIdx);
                    engine.setLogicState(DRAGGING);
                    return;
                }
            }
            engine.setLogicState(DRAGGING);
            engine.game.handlePrimaryGridInput(p, { inputType: 'tap' });

        } else {
            // --- Path start ---
            if (!activeLevel) return;
            if ((state.ENGINE.mode === EDITOR || state.ENGINE.mode === REVIEW)
                    && state.ENGINE.editor.isPencilMode) {
                setNavigationActiveGateKey(state, null);
                engine.navigation.PathNavigator.pushStep(state.ENGINE, k, false);
                engine.setLogicState(DRAGGING);
                engine.game.handlePrimaryGridInput(p, { inputType: 'tap' });
            } else {
                // Find nearest same-axis gate (decision in pointer-input-core)
                const bestGate = findNearestAxisGate(activeLevel.gateKeys, k, p);
                if (bestGate !== null) {
                    setNavigationActiveGateKey(state, bestGate);
                    engine.navigation.PathNavigator.pushStep(state.ENGINE, bestGate, false);
                    engine.setLogicState(DRAGGING);
                    if (bestGate !== k) engine.game.handlePrimaryGridInput(p, { inputType: 'tap' });
                }
            }
        }
    };

    const handleUp = (e: { clientX: number; clientY: number }) => {
        if (state.ENGINE.logicState === EDIT_DRAG
                && (state.ENGINE.mode === EDITOR || state.ENGINE.mode === REVIEW)) {
            const canvas = renderer.getCanvas();
            const crect  = canvas.getBoundingClientRect();
            if (e.clientX >= crect.left && e.clientX <= crect.right
                    && e.clientY >= crect.top && e.clientY <= crect.bottom) {
                editor.placeEditorObject(levelUtils.PACK(levelUtils.getGridCoord(e).x, levelUtils.getGridCoord(e).y));
            } else if (state.ENGINE.editor.draggedFromGrid) {
                setEditorDraggedObject(state, null);
                editor.saveEditorState();
                ui.showMessage('Deleted', 'info');
            }
            setEditorDraggedObject(state, null);
            engine.setLogicState(IDLE);
        }
        if (state.ENGINE.logicState === DRAGGING) engine.setLogicState(IDLE);
    };

    // --- Canvas pointer listeners ---

    renderer.getCanvas().addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (state.ENGINE.runtime.activePointerId !== null) return;
        e.preventDefault();
        setRuntimeActivePointerId(state, e.pointerId);
        renderer.getCanvas().setPointerCapture(state.ENGINE.runtime.activePointerId);
        handleDown(e);
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
        // Drag-ghost update
        if ((state.ENGINE.mode === EDITOR || state.ENGINE.mode === REVIEW)
                && (state.ENGINE.editor.draggedObject || (state.ENGINE.editor.selectedTool && state.ENGINE.logicState === EDIT_DRAG))) {
            const type = state.ENGINE.editor.draggedObject
                ? state.ENGINE.editor.draggedObject.type
                : state.ENGINE.editor.selectedTool;
            const isOverPalette = ui.EditorDragGhost.isPointerOverPalette(e.clientX, e.clientY);
            ui.EditorDragGhost.update({ visible: true, x: e.clientX, y: e.clientY, cellSize: state.ENGINE.viewport.cellW, type, isOverPalette });
        } else {
            ui.EditorDragGhost.update({ visible: false });
        }

        if (e.pointerId !== state.ENGINE.runtime.activePointerId
                && state.ENGINE.logicState !== EDIT_DRAG) return;

        const dragCoord = levelUtils.getGridCoord(e);
        const tapStart  = state.ENGINE.runtime.tapStartCoord;
        if (tapStart && (dragCoord.x !== tapStart.x || dragCoord.y !== tapStart.y)) {
            setRuntimeTapMoved(state, true);
        }
        e.preventDefault();
        if (([DRAGGING, HAZARD_TRIGGERED] as readonly string[]).includes(state.ENGINE.logicState)) {
            engine.game.handlePrimaryGridInput(dragCoord, { inputType: 'drag' });
        }
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
        handleUp(e);
        if (state.ENGINE.runtime.activePointerId !== null
                && renderer.getCanvas().hasPointerCapture(state.ENGINE.runtime.activePointerId)) {
            renderer.getCanvas().releasePointerCapture(state.ENGINE.runtime.activePointerId);
        }
        setRuntimeActivePointerId(state, null);
        setRuntimeTapStartCoord(state, null);
        setRuntimeTapMoved(state, false);
    });

    // --- Gamepad bridge: press canvas centre ---

    const handleGridPressAtPoint = (clientX: any, clientY: any) => handleDown({ clientX, clientY });
    setGamepadGridPrimaryAction(state, () => {
        const canvas = renderer.getCanvas();
        const rect   = canvas.getBoundingClientRect();
        handleGridPressAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
}
