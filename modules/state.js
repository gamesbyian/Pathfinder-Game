export function installState(APP) {
    APP.State = (() => {
        const ENGINE = {
        mode: APP.Core.PLAY,
        logicState: APP.Core.IDLE,
        overlayState: APP.Core.OVERLAY_NONE,
        isDevMode: false,
        levelIdx: 0,
        variant: 0,
        level: null,
        path: [],
        isPortalJump: new Set(),
        visitedCounts: new Map(),
        cellUsage: new Map(),
        intersections: 0,
        activeGateKey: null,
        flipCount: 0,
        visualFlipCount: 0,
        crossedFlippingFilters: new Map(),
        detonatedFalseGoals: new Set(),
        armedFalseGoals: new Set(),
        undoStack: [],
        revealedGeese: new Set(),
        ripples: [],
        isDirty: true,
        gooseEncounteredThisLevel: false,
        muted: true,
        rainbowActive: true,
        titleClickCount: 0,
        titleClickTimer: null,
        resetStreak: 0,
        lastFlipTime: 0,
        cheatTimer: null,
        hinter: { pathList: [], currentPathIdx: 0, alpha: 0, index: 0, source: 'none', holdStartMs: 0, blinkStartMs: 0, fadeStartMs: 0 },
        activeSolverController: null,
        solverAbortRequested: false,
        viewport: { cellW: 0, cellH: 0, swapped: false, lastWidth: 0, lastHeight: 0 },
        themeDragColor: null,
        themeDragTheme: null,
        themeDragCategory: null,
        themeTapSelectedColor: null,
        themeTapSelectedTheme: null,
        themeTapCategory: null,
        progressSet: new Set(),
        foundHintsSinceLoad: [],
        editor: { workingLevel: null, draggedObject: null, draggedFromGrid: false, selectedTool: null, isPencilMode: false, pendingPortal: null, undoStack: [], validTrapSpots: new Set(), isModified: false, emptyClickCount: 0, mirrorHorizontal: true }
        ,ui: { isLandscapeLayout: false, forceLandscapeLayout: false, focusGroup: 'GRID', focusIndex: 0, bLastPressTime: 0, bSingleTimer: null, gamepadFocusEnabled: false }
        ,runtime: { currentTheme: 'classic', messageTimer: null, pendingAction: null, activePointerId: null, tapStartCoord: null, tapMoved: false }
        ,gamepad: { lastButtons: [], lastAxes: [0, 0], nextMoveAt: 0, hasPad: false, rafActive: false, rafId: null }
        ,flags: { useRefereeSolver: true, refereeDebug: false, warnNonCanonicalLevelFields: false }
    };
        return { ENGINE };
    })();
}
