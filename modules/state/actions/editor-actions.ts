// Editor slice state actions (engineState.editor.*): working level, tool/pencil state,
// undo stack, drag state, trap spots, and session reset.
import { resolveEngineState } from './shared.js';

export function setEditorWorkingLevel(stateOrEngine: any, workingLevel: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.workingLevel = workingLevel;
    return editor.workingLevel;
}

export function setEditorPencilMode(stateOrEngine: any, isPencilMode: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !!isPencilMode;
    return editor.isPencilMode;
}

export function setEditorModified(stateOrEngine: any, isModified: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isModified = !!isModified;
    return editor.isModified;
}

export function setEditorEmptyClickCount(stateOrEngine: any, emptyClickCount: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount = emptyClickCount;
    return editor.emptyClickCount;
}

export function incrementEditorEmptyClickCount(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount += 1;
    return editor.emptyClickCount;
}

export function setEditorMetrics(stateOrEngine: any, metrics: any = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    if (Object.hasOwn(metrics, 'reqLen')) workingLevel.reqLen = metrics.reqLen;
    if (Object.hasOwn(metrics, 'reqInt')) workingLevel.reqInt = metrics.reqInt;
    return workingLevel;
}

export function setEditorWorkingHints(stateOrEngine: any, hints: any = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    workingLevel.hints = hints;
    return workingLevel.hints;
}

export function resetEditorWorkingGrid(stateOrEngine: any) {
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

export function clearEditorUndoStack(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.undoStack = [];
    return editor.undoStack;
}

export function popEditorUndoStack(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor?.undoStack?.length) return undefined;
    return editor.undoStack.pop();
}

export function clearEditorValidTrapSpots(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots.clear();
    return editor.validTrapSpots;
}

export function setEditorDraggedFromGrid(stateOrEngine: any, draggedFromGrid: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.draggedFromGrid = !!draggedFromGrid;
    return editor.draggedFromGrid;
}

export function setEditorPendingPortal(stateOrEngine: any, pendingPortal: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.pendingPortal = pendingPortal;
    return editor.pendingPortal;
}

export function setEditorDraggedObject(stateOrEngine: any, draggedObject: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.draggedObject = draggedObject;
    return editor.draggedObject;
}

export function setEditorValidTrapSpots(stateOrEngine: any, validTrapSpots: any = new Set()) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots = validTrapSpots || new Set();
    return editor.validTrapSpots;
}

export function setEditorSelectedTool(stateOrEngine: any, selectedTool: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.selectedTool = selectedTool;
    return editor.selectedTool;
}

export function toggleEditorPencilMode(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !editor.isPencilMode;
    return editor.isPencilMode;
}

export function toggleEditorMirrorHorizontal(stateOrEngine: any) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.mirrorHorizontal = !editor.mirrorHorizontal;
    return editor.mirrorHorizontal;
}

export function resetEditorSession(stateOrEngine: any, options: any = {}) {
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
