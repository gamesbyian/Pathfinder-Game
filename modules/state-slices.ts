import { createEditorState } from './editor/editor-model.js';
import type { EditorState } from './editor/editor-model.js';
import type { CellUsage } from './domain/types.js';
import type { EngineLevel } from './domain/level-schema.js';
import { PLAY, IDLE, OVERLAY_NONE } from './app-constants.js';

/**
 * Runtime state slice factories for the top-level ENGINE object.
 *
 * Ownership convention (see docs/refactor-notes/2026-06-20-app-architecture-refactor.md §#5): each slice has
 * an owning controller; all writes route through modules/state-actions.js helpers
 * (enforced by check:engine-state-boundary). Within a slice, fields are tagged:
 *   • authoritative — a source of truth; set deliberately by the owner.
 *   • derived       — recomputed from authoritative fields (e.g. rebuildDerivedState in
 *                     runtime/path-state.js); must NOT be treated as a game-logic input.
 *
 * Each slice is described by an explicit interface below; `EngineState` (bottom of file)
 * composes them. The interfaces are load-bearing: every state-action mutation in
 * modules/state/actions/*.ts is type-checked against the slice shape (see docs/typing.md).
 */

/** Undo snapshot captured by the engine before each path step (see engine.createSnapshot). */
export interface NavSnapshot {
    path: number[];
    isPortalJump: Set<number>;
    activeGateKey: number | null;
    logicState: string;
    detonatedFalseGoals: Set<number>;
}

/**
 * Navigation slice — owner: engine/path-navigator. The in-progress path is authoritative;
 * everything describing that path's structure is recomputed by rebuildDerivedState().
 */
export interface NavigationState {
    /** authoritative — packed cell keys */
    path: number[];
    /** authoritative — path indices reached via portal */
    isPortalJump: Set<number>;
    /** derived — visit count per cell */
    visitedCounts: Map<number, number>;
    /** derived — per-cell H/V axis usage */
    cellUsage: Map<number, CellUsage>;
    /** derived — re-entry count */
    intersections: number;
    /** authoritative — gate the path started from */
    activeGateKey: number | null;
    /** derived — flipping-filter traversals */
    flipCount: number;
    /** derived — animation tween of flipCount */
    visualFlipCount: number;
    /** derived — flipper crossing record (cell key → crossing count) */
    crossedFlippingFilters: Map<number, number>;
    /** derived — timestamp set when flipCount changes */
    lastFlipTime: number;
    /** authoritative — snapshots for undo */
    undoStack: NavSnapshot[];
    /** derived — per-cell turn direction ('cw'|'ccw'|'both'); lazily built by rebuildDerivedState */
    turnsAtMap?: Map<number, string>;
}

export const createNavigationState = (): NavigationState => ({
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
export interface HazardState {
    revealedGeese: Set<number>;
    armedFalseGoals: Set<number>;
    detonatedFalseGoals: Set<number>;
}

export const createHazardState = (): HazardState => ({
    revealedGeese: new Set(),
    armedFalseGoals: new Set(),
    detonatedFalseGoals: new Set(),
});

/** Solver slice — owner: engine/solver-manager. Run-lifecycle, all authoritative. */
export interface SolverState {
    /** the active run handle (abortable), or null when idle */
    controller: { abort: () => void } | null;
    abortRequested: boolean;
}

export const createSolverState = (): SolverState => ({
    controller: null,
    abortRequested: false,
});

/**
 * Hinter slice — owner: engine/solver-manager + submission-controller. `pathList`/
 * `source`/`persisted*` are authoritative; `heatmap` is derived (built from pathList by
 * buildPathListHeatmap); the `*StartMs`/`alpha`/`index` fields are animation-clock state.
 */
export interface HintDisplayState {
    /** authoritative — list of hint paths (packed cell keys). Full set — the heat-map builds from it. */
    pathList: number[][];
    /** authoritative — indices into pathList the player cycles through (curated subset in play mode,
     *  or all of them in editor/review). The heat-map still uses the full pathList. */
    displayIndices: number[];
    /** authoritative — true when hidden hints exist but merely resemble the displayed ones */
    moreSolutionsSimilar: boolean;
    /** authoritative — position within displayIndices of the active hint */
    currentPathIdx: number;
    /** derived (animation clock) */
    alpha: number;
    /** derived (animation clock) */
    index: number;
    /** authoritative — 'none' | 'saved' | 'solver' | … */
    source: string;
    /** derived (animation clock) */
    holdStartMs: number;
    /** derived (animation clock) */
    blinkStartMs: number;
    /** derived (animation clock) */
    fadeStartMs: number;
    /** authoritative — pinned hint path */
    persistedPath: number[];
    /** authoritative — index of the pinned hint, or -1 */
    persistedHintIdx: number;
    /** derived — heat map built from pathList (cell key → visit count) */
    heatmap: Map<number, number> | null;
    /** authoritative — pinned heat map */
    persistedHeatmap: Map<number, number> | null;
    /** authoritative — path count backing the pinned heat map */
    persistedHeatmapPathCount: number;
}

export const createHintDisplayState = (): HintDisplayState => ({
    pathList: [],                  // authoritative (full set)
    displayIndices: [],            // authoritative (cycled subset; heat-map still uses pathList)
    moreSolutionsSimilar: false,   // authoritative
    currentPathIdx: 0,             // authoritative (index into displayIndices)
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
export interface ViewportState {
    cellW: number;
    cellH: number;
    swapped: boolean;
    lastWidth: number;
    lastHeight: number;
}

export const createViewportState = (): ViewportState => ({
    cellW: 0,
    cellH: 0,
    swapped: false,
    lastWidth: 0,
    lastHeight: 0,
});

/** A review-mode submission record (player-submitted level, loaded from Firestore). */
export interface ReviewSubmission {
    id?: string;
    type?: string;
    levelData?: unknown;
    targetPublishedLevelId?: string;
    [key: string]: unknown;
}

/** Review slice — owner: engine/review-mode + input/review-controller. Authoritative. */
export interface ReviewState {
    submissions: ReviewSubmission[];
    currentIdx: number;
    savedPlayLevelIdx: number;
}

export const createReviewState = (): ReviewState => ({
    submissions: [],
    currentIdx: 0,
    savedPlayLevelIdx: 0,
});

/** UI session slice — owner: ui integration + input/navigation-controller. Authoritative. */
export interface UiSessionState {
    focusGroup: string;
    focusIndex: number;
    bLastPressTime: number;
    /** browser timer handle for the gamepad B-button single-press window */
    bSingleTimer: number | null;
    gamepadFocusEnabled: boolean;
    /** injected callback — invokes the grid's primary action under gamepad focus */
    gamepadGridPrimaryAction?: () => void;
}

export const createUiSessionState = (): UiSessionState => ({
    focusGroup: 'GRID',
    focusIndex: 0,
    bLastPressTime: 0,
    bSingleTimer: null,
    gamepadFocusEnabled: false,
});

/**
 * Runtime slice — owner: runtime/step-processor + theme-engine. `currentTheme` and
 * `pendingConfirmationAction` are authoritative; the pointer/tap fields are transient input state.
 */
export interface RuntimeState {
    /** authoritative (persisted via session state) */
    currentTheme: string;
    /** authoritative — queued confirm action, invoked on confirm */
    pendingConfirmationAction: (() => void) | null;
    /** transient input — active pointer id during a drag */
    activePointerId: number | null;
    /** transient input — pointer coord where the current tap began */
    tapStartCoord: { x: number; y: number } | null;
    /** transient input */
    tapMoved: boolean;
    /** Dev-Mode-only Play/Edit level source: 'published' | 'stress1' | 'stress2' — see
     *  modules/dev-corpus.ts. Review Mode and submission/approval always target the published
     *  corpus regardless of this setting. Not persisted across reloads (always resets to
     *  'published'), since it's a dev tool, not a player preference. */
    devCorpus: string;
}

export const createRuntimeState = (): RuntimeState => ({
    currentTheme: 'classic',       // authoritative (persisted via session state)
    pendingConfirmationAction: null,           // authoritative (queued confirm action)
    activePointerId: null,         // transient input
    tapStartCoord: null,           // transient input
    tapMoved: false,               // transient input
    devCorpus: 'published',
});

/** Gamepad slice — owner: input/navigation-controller. Transient input state. */
export interface GamepadState {
    lastButtons: boolean[];
    lastAxes: number[];
    nextMoveAt: number;
    hasPad: boolean;
    rafActive: boolean;
    rafId: number | null;
}

export const createGamepadState = (): GamepadState => ({
    lastButtons: [],
    lastAxes: [0, 0],
    nextMoveAt: 0,
    hasPad: false,
    rafActive: false,
    rafId: null,
});

/** Feature-flag slice — owner: options-controller. Authoritative, dev-toggled. */
export interface FlagState {
    useRefereeSolver: boolean;
    refereeDebug: boolean;
    warnNonCanonicalLevelFields: boolean;
}

export const createFlagState = (): FlagState => ({
    useRefereeSolver: true,
    refereeDebug: false,
    warnNonCanonicalLevelFields: false,
});

/** Level-rating slice — owner: engine/level-rating-manager. Authoritative; Firestore-backed. */
export interface LevelRatingState {
    fingerprint: string | null;
    levelNumber: number | null;
    loaded: boolean;
    /** stale-response guard (incremented per refresh) */
    requestId: number;
    tags: Set<string>;
    customTags: string[];
    difficulty: number;
    fun: number;
}

export const createLevelRatingState = (): LevelRatingState => ({
    fingerprint: null,
    levelNumber: null,
    loaded: false,
    requestId: 0,    // stale-response guard (incremented per refresh)
    tags: new Set(),
    customTags: [],
    difficulty: 0,
    fun: 0,
});

/** A visual ripple effect appended on path steps; aged out by pruneRipples/renderer. */
export interface Ripple {
    x: number;
    y: number;
    color?: string;
    startTime: number;
}

/** Player-facing gameplay options (geese/false-goal/dead-gate toggles), persisted. */
export interface GameOptions {
    geese: boolean;
    falseGoals: boolean;
    deadGates: boolean;
}

/**
 * Top-level ENGINE object — the single mutable runtime state tree. Each nested slice has
 * its own owner/interface above; the scalar fields here are owned as follows:
 *   mode/logicState/overlayState — engine state machine + overlay-controller (authoritative)
 *   isDevMode/cheatActive/cheatTimer — options-controller / level-flow (authoritative)
 *   levelIdx/orientation — level-flow (authoritative); level — level-flow (derived from data+orientation)
 *   ripples — renderer (derived/visual); isDirty — render-loop (derived signal)
 *   muted/options — options-controller (authoritative, persisted)
 *   resetStreak — level-flow (derived counter); foundHintsSinceLoad — submission-controller
 */
export interface EngineState {
    /** engine state machine — MODES value (PLAY/EDITOR/REVIEW) */
    mode: number;
    /** engine state machine — LogicStatus value */
    logicState: string;
    /** overlay-controller — OverlayStatus value */
    overlayState: string;
    isDevMode: boolean;
    cheatActive: boolean;
    levelIdx: number;
    orientation: number;
    /** the active normalized level, or null before the first load */
    level: EngineLevel | null;
    nav: NavigationState;
    hazards: HazardState;
    solver: SolverState;
    ripples: Ripple[];
    isDirty: boolean;
    muted: boolean;
    options: GameOptions;
    resetStreak: number;
    /** browser timer handle for the dev cheat overlay, or null */
    cheatTimer: number | null;
    hinter: HintDisplayState;
    viewport: ViewportState;
    /** completed level indices */
    progressSet: Set<number>;
    /** hint paths discovered this session (packed cell keys per path) */
    foundHintsSinceLoad: number[][];
    /** canonical Hint[] (path + provenance) mirror of foundHintsSinceLoad, aligned by path
     *  signature — see domain/hint-types.ts. A path found this session always has a matching
     *  record here, attached at the moment it's found, whether or not it's ultimately submitted. */
    foundHintsSinceLoadRecords: import('./domain/hint-types.js').Hint[];
    editor: EditorState;
    review: ReviewState;
    ui: UiSessionState;
    runtime: RuntimeState;
    gamepad: GamepadState;
    flags: FlagState;
    levelRating: LevelRatingState;
}

export function createEngineState(): EngineState {
    return {
        mode: PLAY,
        logicState: IDLE,
        overlayState: OVERLAY_NONE,
        isDevMode: false,
        cheatActive: false,
        levelIdx: 0,
        orientation: 0,
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
        hinter: createHintDisplayState(),
        viewport: createViewportState(),
        progressSet: new Set(),
        foundHintsSinceLoad: [],
        foundHintsSinceLoadRecords: [],
        editor: createEditorState(),
        review: createReviewState(),
        ui: createUiSessionState(),
        runtime: createRuntimeState(),
        gamepad: createGamepadState(),
        flags: createFlagState(),
        levelRating: createLevelRatingState(),
    };
}

// ── Anti-regression guard (compile-time) ─────────────────────────────────────
// The whole point of Initiative A is that ENGINE is a *real* type, not `any`. If a future
// edit lets `createEngineState`'s return type collapse back to `any` (e.g. a `: any` return
// annotation, or a slice factory degrading to `any`), `IsAny` resolves `true`, the conditional
// resolves to `never`, and the assignment below fails `check:types` — so the regression cannot
// land silently. See docs/archive/codebase-strengthening-plan.md, Initiative A.
type IsAny<T> = 0 extends (1 & T) ? true : false;
const _engineStateIsNotAny: IsAny<ReturnType<typeof createEngineState>> extends true ? never : true = true;
void _engineStateIsNotAny;
