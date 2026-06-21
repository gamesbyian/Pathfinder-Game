// @ts-check
import { createEditorState } from './editor/editor-model.js';

/**
 * Runtime state slice factories for the top-level ENGINE object.
 *
 * Ownership convention (see docs/refactor-notes/2026-06-20-app-architecture-refactor.md §#5): each slice has
 * an owning controller; all writes route through modules/state-actions.js helpers
 * (enforced by check:engine-state-boundary). Within a slice, fields are tagged:
 *   • authoritative — a source of truth; set deliberately by the owner.
 *   • derived       — recomputed from authoritative fields (e.g. rebuildDerivedState in
 *                     runtime/path-state.js); must NOT be treated as a game-logic input.
 */

/**
 * Navigation slice — owner: engine/path-navigator. The in-progress path is authoritative;
 * everything describing that path's structure is recomputed by rebuildDerivedState().
 * @typedef {Object} NavigationState
 * @property {number[]}            path                   authoritative — packed cell keys
 * @property {Set<number>}         isPortalJump           authoritative — path indices reached via portal
 * @property {?number}             activeGateKey          authoritative — gate the path started from
 * @property {number[]}            undoStack              authoritative — snapshots for undo
 * @property {Map<number,number>}  visitedCounts          derived — visit count per cell
 * @property {Map<number,number>}  cellUsage              derived — per-cell axis-usage bits
 * @property {number}              intersections          derived — re-entry count
 * @property {number}              flipCount              derived — flipping-filter traversals
 * @property {Map<number,*>}       crossedFlippingFilters derived — flipper crossing record
 * @property {number}              visualFlipCount        derived — animation tween of flipCount
 * @property {number}              lastFlipTime           derived — timestamp set when flipCount changes
 * @returns {NavigationState}
 */
export const createNavigationState = () => ({
    path: [],                            // authoritative
    isPortalJump: new Set(),             // authoritative
    visitedCounts: new Map(),            // derived (rebuildDerivedState)
    cellUsage: new Map(),                // derived (rebuildDerivedState)
    intersections: 0,                    // derived (rebuildDerivedState)
    activeGateKey: null,                 // authoritative
    flipCount: 0,                        // derived (rebuildDerivedState)
    visualFlipCount: 0,                  // derived (render-loop animation tween)
    crossedFlippingFilters: new Map(),   // derived (rebuildDerivedState)
    lastFlipTime: 0,                     // derived (set when flipCount changes)
    undoStack: [],                       // authoritative
});

/** Hazard slice — owner: engine/hazard-controller. All fields authoritative. */
export const createHazardState = () => ({
    revealedGeese: new Set(),
    armedFalseGoals: new Set(),
    detonatedFalseGoals: new Set(),
});

/** Solver slice — owner: engine/solver-manager. Run-lifecycle, all authoritative. */
export const createSolverState = () => ({
    controller: null,
    abortRequested: false,
});

/**
 * Hinter slice — owner: engine/solver-manager + submission-controller. `pathList`/
 * `source`/`persisted*` are authoritative; `heatmap` is derived (built from pathList by
 * buildPathListHeatmap); the `*StartMs`/`alpha`/`index` fields are animation-clock state.
 */
export const createHinterState = () => ({
    pathList: [],                  // authoritative
    currentPathIdx: 0,             // authoritative
    alpha: 0,                      // derived (animation clock)
    index: 0,                      // derived (animation clock)
    source: 'none',                // authoritative
    holdStartMs: 0,                // derived (animation clock)
    blinkStartMs: 0,               // derived (animation clock)
    fadeStartMs: 0,                // derived (animation clock)
    persistedPath: [],             // authoritative (pinned hint)
    persistedHintIdx: -1,          // authoritative
    heatmap: null,                 // derived (from pathList)
    persistedHeatmap: null,        // authoritative (pinned heat map)
    persistedHeatmapPathCount: 0,  // authoritative
});

/** Viewport slice — owner: renderer. All fields derived from canvas/grid sizing. */
export const createViewportState = () => ({
    cellW: 0,
    cellH: 0,
    swapped: false,
    lastWidth: 0,
    lastHeight: 0,
});

/** Review slice — owner: engine/review-mode + input/review-controller. Authoritative. */
export const createReviewState = () => ({
    submissions: [],
    currentIdx: 0,
    savedPlayLevelIdx: 0,
});

/** UI session slice — owner: ui integration + input/navigation-controller. Authoritative. */
export const createUiSessionState = () => ({
    focusGroup: 'GRID',
    focusIndex: 0,
    bLastPressTime: 0,
    bSingleTimer: null,
    gamepadFocusEnabled: false,
});

/**
 * Runtime slice — owner: runtime/step-processor + theme-engine. `currentTheme` and
 * `pendingAction` are authoritative; the pointer/tap fields are transient input state.
 */
export const createRuntimeState = () => ({
    currentTheme: 'classic',       // authoritative (persisted via session state)
    pendingAction: null,           // authoritative (queued confirm action)
    activePointerId: null,         // transient input
    tapStartCoord: null,           // transient input
    tapMoved: false,               // transient input
});

/** Gamepad slice — owner: input/navigation-controller. Transient input state. */
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

/** Level-rating slice — owner: engine/level-rating-manager. Authoritative; Firestore-backed. */
export const createLevelRatingState = () => ({
    fingerprint: null,
    levelNumber: null,
    loaded: false,
    requestId: 0,    // stale-response guard (incremented per refresh)
    tags: new Set(),
    customTags: [],
    difficulty: 0,
    fun: 0,
});

/**
 * Top-level ENGINE object — the single mutable runtime state tree. Each nested slice has
 * its own owner/typedef above; the scalar fields here are owned as follows:
 *   mode/logicState/overlayState — engine state machine + overlay-controller (authoritative)
 *   isDevMode/cheatActive/cheatTimer — options-controller / level-flow (authoritative)
 *   levelIdx/variant — level-flow (authoritative); level — level-flow (derived from data+variant)
 *   ripples — renderer (derived/visual); isDirty — render-loop (derived signal)
 *   muted/options — options-controller (authoritative, persisted)
 *   resetStreak — level-flow (derived counter); foundHintsSinceLoad — submission-controller
 */
/** @param {{ core: any }} deps @returns {any} */
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
        levelRating: createLevelRatingState(),
    };
}
