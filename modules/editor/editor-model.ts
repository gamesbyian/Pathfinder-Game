// Canonical editor state schema.
// Provides the authoritative definition of editor state shape, testable and
// importable without pulling in any runtime or APP dependencies.

/** False-goal trigger scan lifecycle for the working level:
 *  'stale'    — triggerableFalseGoalCells doesn't reflect the current level (never scanned, or edited since)
 *  'scanning' — a scan is running; triggerableFalseGoalCells is filling in, falseGoalTriggerParityCandidates marks unknowns
 *  'complete' — a complete sweep finished; triggerableFalseGoalCells is exhaustive
 *  'partial'  — the scan timed out; triggerableFalseGoalCells is sound but may be incomplete
 *  'failed'   — the scan errored; retried after the next edit or explicit request */
export type FalseGoalTriggerScanState = 'stale' | 'scanning' | 'complete' | 'partial' | 'failed';

/** The editor session state shape. */
export interface EditorState {
    workingLevel: any | null;
    draggedObject: any | null;
    draggedFromGrid: boolean;
    selectedTool: string | null;
    isPencilMode: boolean;
    pendingPortal: number | null;
    undoStack: any[];
    triggerableFalseGoalCells: Set<number>;
    falseGoalTriggerScanState: FalseGoalTriggerScanState;
    /** Cells the cheap parity test can't rule out as triggerable false-goal cells — the honest
     *  "unknown, still scanning" overlay while a false-goal trigger scan is incomplete. */
    falseGoalTriggerParityCandidates: Set<number>;
    isModified: boolean;
    emptyClickCount: number;
    mirrorHorizontal: boolean;
}

// Returns a fresh editor state object with all fields at their initial values.
// Call this whenever a new editor session starts; each call returns an
// independent object with its own collections (undoStack, triggerableFalseGoalCells).
export function createEditorState(): EditorState {
    return {
        workingLevel:     null,
        draggedObject:    null,
        draggedFromGrid:  false,
        selectedTool:     null,
        isPencilMode:     false,
        pendingPortal:    null,
        undoStack:        [],
        triggerableFalseGoalCells:   new Set<number>(),
        falseGoalTriggerScanState:    'stale',
        falseGoalTriggerParityCandidates: new Set<number>(),
        isModified:       false,
        emptyClickCount:  0,
        mirrorHorizontal: true,
    };
}
