// Canonical editor state schema.
// Provides the authoritative definition of editor state shape, testable and
// importable without pulling in any runtime or APP dependencies.

/** The editor session state shape. */
export interface EditorState {
    workingLevel: any | null;
    draggedObject: any | null;
    draggedFromGrid: boolean;
    selectedTool: string | null;
    isPencilMode: boolean;
    pendingPortal: number | null;
    undoStack: any[];
    validTrapSpots: Set<number>;
    isModified: boolean;
    emptyClickCount: number;
    mirrorHorizontal: boolean;
}

// Returns a fresh editor state object with all fields at their initial values.
// Call this whenever a new editor session starts; each call returns an
// independent object with its own collections (undoStack, validTrapSpots).
export function createEditorState(): EditorState {
    return {
        workingLevel:     null,
        draggedObject:    null,
        draggedFromGrid:  false,
        selectedTool:     null,
        isPencilMode:     false,
        pendingPortal:    null,
        undoStack:        [],
        validTrapSpots:   new Set<number>(),
        isModified:       false,
        emptyClickCount:  0,
        mirrorHorizontal: true,
    };
}
