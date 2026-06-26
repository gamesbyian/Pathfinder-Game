// Editor slice state actions (engineState.editor.*): working level, tool/pencil state,
// undo stack, drag state, trap spots, and session reset.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';
import type { EditorState } from '../../editor/editor-model.js';

// The editor working level and dragged object are the editor boundary's deliberately-loose
// shapes; reference the EditorState contract's field types rather than re-declaring them, so
// they tighten automatically if EditorState is tightened (see docs/typing.md, editor boundary).
type WorkingLevel = EditorState['workingLevel'];
type DraggedObject = EditorState['draggedObject'];

export function setEditorWorkingLevel(stateOrEngine: StateOrEngine, workingLevel: WorkingLevel) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.workingLevel = workingLevel;
    return editor.workingLevel;
}

export function setEditorPencilMode(stateOrEngine: StateOrEngine, isPencilMode: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !!isPencilMode;
    return editor.isPencilMode;
}

export function setEditorModified(stateOrEngine: StateOrEngine, isModified: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isModified = !!isModified;
    return editor.isModified;
}

export function setEditorEmptyClickCount(stateOrEngine: StateOrEngine, emptyClickCount: number) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount = emptyClickCount;
    return editor.emptyClickCount;
}

export function incrementEditorEmptyClickCount(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount += 1;
    return editor.emptyClickCount;
}

export function setEditorMetrics(stateOrEngine: StateOrEngine, metrics: { reqLen?: number; reqInt?: number } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    if (Object.hasOwn(metrics, 'reqLen')) workingLevel.reqLen = metrics.reqLen;
    if (Object.hasOwn(metrics, 'reqInt')) workingLevel.reqInt = metrics.reqInt;
    return workingLevel;
}

export function setEditorWorkingHints(stateOrEngine: StateOrEngine, hints: number[][] = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    workingLevel.hints = hints;
    return workingLevel.hints;
}

export function resetEditorWorkingGrid(stateOrEngine: StateOrEngine) {
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

export function clearEditorUndoStack(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.undoStack = [];
    return editor.undoStack;
}

export function popEditorUndoStack(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor?.undoStack?.length) return undefined;
    return editor.undoStack.pop();
}

export function clearEditorValidTrapSpots(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots.clear();
    return editor.validTrapSpots;
}

export function setEditorDraggedFromGrid(stateOrEngine: StateOrEngine, draggedFromGrid: unknown) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.draggedFromGrid = !!draggedFromGrid;
    return editor.draggedFromGrid;
}

export function setEditorPendingPortal(stateOrEngine: StateOrEngine, pendingPortal: number | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.pendingPortal = pendingPortal;
    return editor.pendingPortal;
}

export function setEditorDraggedObject(stateOrEngine: StateOrEngine, draggedObject: DraggedObject) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.draggedObject = draggedObject;
    return editor.draggedObject;
}

export function setEditorValidTrapSpots(stateOrEngine: StateOrEngine, validTrapSpots: Set<number> = new Set()) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots = validTrapSpots || new Set();
    return editor.validTrapSpots;
}

export function setEditorSelectedTool(stateOrEngine: StateOrEngine, selectedTool: string | null) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.selectedTool = selectedTool;
    return editor.selectedTool;
}

export function toggleEditorPencilMode(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !editor.isPencilMode;
    return editor.isPencilMode;
}

export function toggleEditorMirrorHorizontal(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.mirrorHorizontal = !editor.mirrorHorizontal;
    return editor.mirrorHorizontal;
}

interface ResetEditorSessionOptions {
    workingLevel?: WorkingLevel;
    isPencilMode?: boolean;
    clearTrapSpots?: boolean;
    emptyClickCount?: number;
    isModified?: boolean;
}

export function resetEditorSession(stateOrEngine: StateOrEngine, options: ResetEditorSessionOptions = {}) {
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
