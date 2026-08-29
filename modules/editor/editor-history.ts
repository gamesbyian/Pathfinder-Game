// Editor undo-history management for the Pathfinder editor.
// These functions accept explicit editor/hinter state objects rather than
// reading from a global APP, so they can be tested without a full APP bootstrap.

import type { EditorState } from './editor-model.js';

const MAX_UNDO_STACK = 50;

/**
 * Saves a snapshot of the current working level onto the undo stack.
 * Mutates `editorState` and `hinterState` in place.
 * `deepCloneFn` must accept a level object and return a deep copy.
 */
export function saveEditorSnapshot(
    editorState: EditorState, hinterState: { pathList: any[] }, deepCloneFn: (level: any) => any,
): void {
    editorState.isModified = true;
    editorState.undoStack.push(deepCloneFn(editorState.workingLevel));
    if (editorState.undoStack.length > MAX_UNDO_STACK) editorState.undoStack.shift();
    hinterState.pathList = [];
}

/**
 * Pops the most recent snapshot from the undo stack and restores it.
 * Mutates `editorState` and `hinterState` in place.
 * Returns { pendingPortal } (the portal key re-derived from the restored level),
 * or null if the undo stack was empty (no change made).
 */
export function restoreEditorSnapshot(
    editorState: EditorState, hinterState: { pathList: any[] },
): { pendingPortal: number | null } | null {
    if (!editorState.undoStack.length) return null;
    editorState.isModified = true;
    editorState.workingLevel = editorState.undoStack.pop();
    let pendingPortal: number | null = null;
    editorState.workingLevel.portalMap.forEach((v: any, k: number) => { if (v.dest === -1) pendingPortal = k; });
    editorState.pendingPortal = pendingPortal;
    hinterState.pathList = [];
    editorState.triggerableFalseGoalCells.clear();
    editorState.falseGoalTriggerParityCandidates?.clear();
    editorState.falseGoalTriggerScanState = 'stale';
    return { pendingPortal };
}
