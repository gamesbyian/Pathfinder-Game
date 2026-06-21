// @ts-check
// Editor undo-history management for the Pathfinder editor.
// These functions accept explicit editor/hinter state objects rather than
// reading from a global APP, so they can be tested without a full APP bootstrap.

/** @typedef {import('./editor-model.js').EditorState} EditorState */

const MAX_UNDO_STACK = 50;

/**
 * Saves a snapshot of the current working level onto the undo stack.
 * Mutates `editorState` and `hinterState` in place.
 * `deepCloneFn` must accept a level object and return a deep copy.
 * @param {EditorState} editorState @param {{ pathList: any[] }} hinterState
 * @param {(level: any) => any} deepCloneFn @returns {void}
 */
export function saveEditorSnapshot(editorState, hinterState, deepCloneFn) {
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
 * @param {EditorState} editorState @param {{ pathList: any[] }} hinterState
 * @returns {{ pendingPortal: number|null }|null}
 */
export function restoreEditorSnapshot(editorState, hinterState) {
    if (!editorState.undoStack.length) return null;
    editorState.isModified = true;
    editorState.workingLevel = editorState.undoStack.pop();
    /** @type {number|null} */
    let pendingPortal = null;
    editorState.workingLevel.portalMap.forEach((/** @type {any} */ v, /** @type {number} */ k) => { if (v.dest === -1) pendingPortal = k; });
    editorState.pendingPortal = pendingPortal;
    hinterState.pathList = [];
    editorState.validTrapSpots.clear();
    return { pendingPortal };
}
