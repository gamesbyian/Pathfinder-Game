// @ts-check
// Editor slice state actions (engineState.editor.*): working level, tool/pencil state,
// undo stack, drag state, trap spots, and session reset.
import { resolveEngineState } from './shared.js';

/** @param {any} stateOrEngine @param {any} workingLevel @returns {any} */
export function setEditorWorkingLevel(stateOrEngine, workingLevel) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.workingLevel = workingLevel;
    return editor.workingLevel;
}

/** @param {any} stateOrEngine @param {any} isPencilMode @returns {any} */
export function setEditorPencilMode(stateOrEngine, isPencilMode) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !!isPencilMode;
    return editor.isPencilMode;
}

/** @param {any} stateOrEngine @param {any} isModified @returns {any} */
export function setEditorModified(stateOrEngine, isModified) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isModified = !!isModified;
    return editor.isModified;
}

/** @param {any} stateOrEngine @param {any} emptyClickCount @returns {any} */
export function setEditorEmptyClickCount(stateOrEngine, emptyClickCount) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount = emptyClickCount;
    return editor.emptyClickCount;
}

/** @param {any} stateOrEngine @returns {any} */
export function incrementEditorEmptyClickCount(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount += 1;
    return editor.emptyClickCount;
}

/** @param {any} stateOrEngine @param {any} [metrics] @returns {any} */
export function setEditorMetrics(stateOrEngine, metrics = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    if (Object.hasOwn(metrics, 'reqLen')) workingLevel.reqLen = metrics.reqLen;
    if (Object.hasOwn(metrics, 'reqInt')) workingLevel.reqInt = metrics.reqInt;
    return workingLevel;
}

/** @param {any} stateOrEngine @param {any} [hints] @returns {any} */
export function setEditorWorkingHints(stateOrEngine, hints = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    workingLevel.hints = hints;
    return workingLevel.hints;
}

/** @param {any} stateOrEngine @returns {any} */
export function resetEditorWorkingGrid(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    Object.assign(workingLevel, {
        gateKeys: [],
        goalKey: -1,
        falseGoalKeys: new Set(),
        blockSet: new Set(),
        gooseSet: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        portalMap: new Map(),
        portalVisuals: [],
        hints: []
    });
    return workingLevel;
}

/** @param {any} stateOrEngine @returns {any} */
export function clearEditorUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.undoStack = [];
    return editor.undoStack;
}

/** @param {any} stateOrEngine @returns {any} */
export function popEditorUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor?.undoStack?.length) return undefined;
    return editor.undoStack.pop();
}

/** @param {any} stateOrEngine @returns {any} */
export function clearEditorValidTrapSpots(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots.clear();
    return editor.validTrapSpots;
}

/** @param {any} stateOrEngine @param {any} draggedFromGrid @returns {any} */
export function setEditorDraggedFromGrid(stateOrEngine, draggedFromGrid) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.draggedFromGrid = !!draggedFromGrid;
    return editor.draggedFromGrid;
}

/** @param {any} stateOrEngine @param {any} pendingPortal @returns {any} */
export function setEditorPendingPortal(stateOrEngine, pendingPortal) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.pendingPortal = pendingPortal;
    return editor.pendingPortal;
}

/** @param {any} stateOrEngine @param {any} draggedObject @returns {any} */
export function setEditorDraggedObject(stateOrEngine, draggedObject) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.draggedObject = draggedObject;
    return editor.draggedObject;
}

/** @param {any} stateOrEngine @param {any} [validTrapSpots] @returns {any} */
export function setEditorValidTrapSpots(stateOrEngine, validTrapSpots = new Set()) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots = validTrapSpots || new Set();
    return editor.validTrapSpots;
}

/** @param {any} stateOrEngine @param {any} selectedTool @returns {any} */
export function setEditorSelectedTool(stateOrEngine, selectedTool) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.selectedTool = selectedTool;
    return editor.selectedTool;
}

/** @param {any} stateOrEngine @returns {any} */
export function toggleEditorPencilMode(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !editor.isPencilMode;
    return editor.isPencilMode;
}

/** @param {any} stateOrEngine @returns {any} */
export function toggleEditorMirrorHorizontal(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.mirrorHorizontal = !editor.mirrorHorizontal;
    return editor.mirrorHorizontal;
}

/** @param {any} stateOrEngine @param {any} [options] @returns {any} */
export function resetEditorSession(stateOrEngine, options = {}) {
    if (Object.hasOwn(options, 'workingLevel')) {
        setEditorWorkingLevel(stateOrEngine, options.workingLevel);
    }
    setEditorPencilMode(stateOrEngine, options.isPencilMode ?? false);
    clearEditorUndoStack(stateOrEngine);
    if (options.clearTrapSpots !== false) clearEditorValidTrapSpots(stateOrEngine);
    setEditorEmptyClickCount(stateOrEngine, options.emptyClickCount ?? 0);
    setEditorModified(stateOrEngine, options.isModified ?? false);
    return resolveEngineState(stateOrEngine)?.editor ?? null;
}
