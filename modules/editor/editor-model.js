// Canonical editor state schema and tool constants.
// Provides the authoritative definition of editor state shape and the
// exhaustive list of tool types — making both testable and importable
// without pulling in any runtime or APP dependencies.

export const DEFAULT_TOOL = 'gate';

export const TOOL_TYPES = Object.freeze([
    'gate', 'goal', 'false_goal', 'block', 'goose',
    'must_pass', 'must_cross', 'filter_h', 'filter_v',
    'flip_h', 'flip_v', 'portal', 'eraser',
]);

// Returns a fresh editor state object with all fields at their initial values.
// Call this whenever a new editor session starts; each call returns an
// independent object with its own collections (undoStack, validTrapSpots).
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
