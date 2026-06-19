import { createEditorState } from './editor/editor-model.js';

export const createNavigationState = () => ({
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
});

export const createHazardState = () => ({
    revealedGeese: new Set(),
    armedFalseGoals: new Set(),
    detonatedFalseGoals: new Set(),
});

export const createSolverState = () => ({
    controller: null,
    abortRequested: false,
});

export const createHinterState = () => ({
    pathList: [],
    currentPathIdx: 0,
    alpha: 0,
    index: 0,
    source: 'none',
    holdStartMs: 0,
    blinkStartMs: 0,
    fadeStartMs: 0,
    persistedPath: [],
    persistedHintIdx: -1,
    heatmap: null,
    persistedHeatmap: null,
    persistedHeatmapPathCount: 0,
});

export const createViewportState = () => ({
    cellW: 0,
    cellH: 0,
    swapped: false,
    lastWidth: 0,
    lastHeight: 0,
});

export const createReviewState = () => ({
    submissions: [],
    currentIdx: 0,
    savedPlayLevelIdx: 0,
});

export const createUiSessionState = () => ({
    focusGroup: 'GRID',
    focusIndex: 0,
    bLastPressTime: 0,
    bSingleTimer: null,
    gamepadFocusEnabled: false,
});

export const createRuntimeState = () => ({
    currentTheme: 'classic',
    pendingAction: null,
    activePointerId: null,
    tapStartCoord: null,
    tapMoved: false,
});

export const createGamepadState = () => ({
    lastButtons: [],
    lastAxes: [0, 0],
    nextMoveAt: 0,
    hasPad: false,
    rafActive: false,
    rafId: null,
});

export const createFlagState = () => ({
    useRefereeSolver: true,
    refereeDebug: false,
    warnNonCanonicalLevelFields: false,
});

export function createEngineState({ core }) {
    return {
        mode: core.PLAY,
        logicState: core.IDLE,
        overlayState: core.OVERLAY_NONE,
        isDevMode: false,
        cheatActive: false,
        levelIdx: 0,
        variant: 0,
        level: null,
        nav: createNavigationState(),
        hazards: createHazardState(),
        solver: createSolverState(),
        ripples: [],
        isDirty: true,
        muted: true,
        options: { geese: true, falseGoals: true, deadGates: true },
        titleClickCount: 0,
        titleClickTimer: null,
        resetStreak: 0,
        cheatTimer: null,
        hinter: createHinterState(),
        viewport: createViewportState(),
        progressSet: new Set(),
        foundHintsSinceLoad: [],
        editor: createEditorState(),
        review: createReviewState(),
        ui: createUiSessionState(),
        runtime: createRuntimeState(),
        gamepad: createGamepadState(),
        flags: createFlagState(),
    };
}
