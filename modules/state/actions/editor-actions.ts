// Editor slice state actions (engineState.editor.*): working level, tool/pencil state,
// undo stack, drag state, triggerable false-goal cells, and session reset.
import { resolveEngineState } from './shared.js';
import type { StateOrEngine } from './shared.js';
import type { EditorState, FalseGoalTriggerScanState } from '../../editor/editor-model.js';

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

export function setEditorMetrics(stateOrEngine: StateOrEngine, metrics: { requiredLength?: number; requiredIntersections?: number } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    if (Object.hasOwn(metrics, 'requiredLength')) workingLevel.requiredLength = metrics.requiredLength;
    if (Object.hasOwn(metrics, 'requiredIntersections')) workingLevel.requiredIntersections = metrics.requiredIntersections;
    return workingLevel;
}

export function setEditorWorkingHints(stateOrEngine: StateOrEngine, hints: number[][] = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    workingLevel.hints = hints;
    return workingLevel.hints;
}

/** Canonical Hint[] (path + provenance) mirror of setEditorWorkingHints's plain-path array — see
 *  domain/hint-types.ts. Kept as a parallel field (not folded into .hints itself) so every
 *  existing consumer that treats workingLevel.hints as plain paths (dedup/novelty/UI cycling)
 *  keeps working unchanged; only submission reconciles the two via reconcileHints(). */
export function setEditorWorkingHintRecords(stateOrEngine: StateOrEngine, hintRecords: import('../../domain/hint-types.js').Hint[] = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    workingLevel.hintRecords = hintRecords;
    return workingLevel.hintRecords;
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

// Clearing the spots is the single invalidation point for false-goal-trigger-scan results: every
// level-mutating path routes through here, so it also marks the scan stale and drops
// the candidate overlay — an in-flight scan observes the state change and aborts.
export function clearEditorTriggerableFalseGoalCells(stateOrEngine: StateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.triggerableFalseGoalCells.clear();
    editor.falseGoalTriggerParityCandidates?.clear();
    editor.falseGoalTriggerScanState = 'stale';
    return editor.triggerableFalseGoalCells;
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

export function setEditorTriggerableFalseGoalCells(stateOrEngine: StateOrEngine, triggerableFalseGoalCells: Set<number> = new Set()) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.triggerableFalseGoalCells = triggerableFalseGoalCells || new Set();
    return editor.triggerableFalseGoalCells;
}

/** Streaming variant: merge newly-found spots into the existing set (mid-scan). */
export function addEditorTriggerableFalseGoalCells(stateOrEngine: StateOrEngine, keys: Iterable<number>) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    for (const k of keys) editor.triggerableFalseGoalCells.add(k);
    return editor.triggerableFalseGoalCells;
}

export function setEditorFalseGoalTriggerScanState(stateOrEngine: StateOrEngine, falseGoalTriggerScanState: FalseGoalTriggerScanState) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.falseGoalTriggerScanState = falseGoalTriggerScanState;
    return editor.falseGoalTriggerScanState;
}

export function setEditorFalseGoalTriggerParityCandidates(stateOrEngine: StateOrEngine, candidates: Set<number> = new Set()) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.falseGoalTriggerParityCandidates = candidates || new Set();
    return editor.falseGoalTriggerParityCandidates;
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
    clearTriggerableFalseGoalCells?: boolean;
    emptyClickCount?: number;
    isModified?: boolean;
}

export function resetEditorSession(stateOrEngine: StateOrEngine, options: ResetEditorSessionOptions = {}) {
    if (Object.hasOwn(options, 'workingLevel')) {
        setEditorWorkingLevel(stateOrEngine, options.workingLevel);
    }
    setEditorPencilMode(stateOrEngine, options.isPencilMode ?? false);
    clearEditorUndoStack(stateOrEngine);
    if (options.clearTriggerableFalseGoalCells !== false) clearEditorTriggerableFalseGoalCells(stateOrEngine);
    setEditorEmptyClickCount(stateOrEngine, options.emptyClickCount ?? 0);
    setEditorModified(stateOrEngine, options.isModified ?? false);
    return resolveEngineState(stateOrEngine)?.editor ?? null;
}
