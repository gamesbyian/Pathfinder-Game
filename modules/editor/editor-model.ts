// Canonical editor state schema.
// Provides the authoritative definition of editor state shape, testable and
// importable without pulling in any runtime or APP dependencies.

/** Trap-scan lifecycle for the working level:
 *  'stale'    — validTrapSpots doesn't reflect the current level (never scanned, or edited since)
 *  'scanning' — a scan is running; validTrapSpots is filling in, trapParityCandidates marks unknowns
 *  'done'     — a complete sweep finished; validTrapSpots is exhaustive
 *  'partial'  — the scan timed out; validTrapSpots is sound but may be incomplete
 *  'failed'   — the scan errored; retried after the next edit or explicit request */
export type TrapScanState = 'stale' | 'scanning' | 'done' | 'partial' | 'failed';

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
    trapScanState: TrapScanState;
    /** Cells the cheap parity test can't rule out as trap spots — the honest
     *  "unknown, still scanning" overlay while a trap scan is incomplete. */
    trapParityCandidates: Set<number>;
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
        trapScanState:    'stale',
        trapParityCandidates: new Set<number>(),
        isModified:       false,
        emptyClickCount:  0,
        mirrorHorizontal: true,
    };
}
