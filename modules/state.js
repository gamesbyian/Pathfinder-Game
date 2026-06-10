import { createEditorState } from './editor/editor-model.js';

export function createState({ core }) {
    const ENGINE = {
        mode: core.PLAY,
        logicState: core.IDLE,
        overlayState: core.OVERLAY_NONE,
        isDevMode: false,
        cheatActive: false,
        levelIdx: 0,
        variant: 0,
        level: null,

        // Path-traversal state
        nav: {
            path: [],
            isPortalJump: new Set(),
            visitedCounts: new Map(),
            cellUsage: new Map(),
            intersections: 0,
            activeGateKey: null,
            flipCount: 0,
            visualFlipCount: 0,
            crossedFlippingFilters: new Map(),
            lastFlipTime: 0,
            undoStack: [],
        },

        // Hazard state
        hazards: {
            revealedGeese: new Set(),
            armedFalseGoals: new Set(),
            detonatedFalseGoals: new Set(),
        },

        // Solver lifecycle
        solver: {
            controller: null,
            abortRequested: false,
        },

        ripples: [],
        isDirty: true,
        muted: true,
        options: { geese: true, falseGoals: true, deadGates: true },
        titleClickCount: 0,
        titleClickTimer: null,
        resetStreak: 0,
        cheatTimer: null,
        hinter: { pathList: [], currentPathIdx: 0, alpha: 0, index: 0, source: 'none', holdStartMs: 0, blinkStartMs: 0, fadeStartMs: 0 },
        viewport: { cellW: 0, cellH: 0, swapped: false, lastWidth: 0, lastHeight: 0 },
        themeDragColor: null,
        themeDragTheme: null,
        themeDragCategory: null,
        themeTapSelectedColor: null,
        themeTapSelectedTheme: null,
        themeTapCategory: null,
        progressSet: new Set(),
        foundHintsSinceLoad: [],
        editor: createEditorState(),
        review: { submissions: [], currentIdx: 0, savedPlayLevelIdx: 0 },
        ui: { focusGroup: 'GRID', focusIndex: 0, bLastPressTime: 0, bSingleTimer: null, gamepadFocusEnabled: false },
        runtime: { currentTheme: 'classic', pendingAction: null, activePointerId: null, tapStartCoord: null, tapMoved: false },
        gamepad: { lastButtons: [], lastAxes: [0, 0], nextMoveAt: 0, hasPad: false, rafActive: false, rafId: null },
        flags: { useRefereeSolver: true, refereeDebug: false, warnNonCanonicalLevelFields: false }
    };
    return { ENGINE };
}
