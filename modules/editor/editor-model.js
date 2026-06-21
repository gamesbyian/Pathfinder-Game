// @ts-check
// Canonical editor state schema.
// Provides the authoritative definition of editor state shape, testable and
// importable without pulling in any runtime or APP dependencies.

/**
 * The editor session state shape.
 * @typedef {Object} EditorState
 * @property {any|null}      workingLevel
 * @property {any|null}      draggedObject
 * @property {boolean}       draggedFromGrid
 * @property {string|null}   selectedTool
 * @property {boolean}       isPencilMode
 * @property {number|null}   pendingPortal
 * @property {any[]}         undoStack
 * @property {Set<number>}   validTrapSpots
 * @property {boolean}       isModified
 * @property {number}        emptyClickCount
 * @property {boolean}       mirrorHorizontal
 */

// Returns a fresh editor state object with all fields at their initial values.
// Call this whenever a new editor session starts; each call returns an
// independent object with its own collections (undoStack, validTrapSpots).
/** @returns {EditorState} */
export function createEditorState() {
    return {
        workingLevel:     null,
        draggedObject:    null,
        draggedFromGrid:  false,
        selectedTool:     null,
        isPencilMode:     false,
        pendingPortal:    null,
        undoStack:        [],
        validTrapSpots:   new Set(),
        isModified:       false,
        emptyClickCount:  0,
        mirrorHorizontal: true,
    };
}
