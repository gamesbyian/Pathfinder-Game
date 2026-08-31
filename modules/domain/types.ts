// Shared type contracts for the domain/runtime/solver layers. Type-only module (no runtime
// exports) — referenced by `.ts` modules via `import type { ... } from './types.js'` and by
// not-yet-converted `.js` modules via `import('./types.js').TypeName` (ADR 0011 / docs/typing.md).

import type { TurnDir } from './level-schema.js';

/** A portal pair's two endpoint cells (used for rendering + parity checks). */
export interface PortalVisual { k1: number; k2: number; }

/** Grid dimensions in cells. */
export interface GridSize { w: number; h: number; }

/** A resolved portal exit. `dest` is the packed destination key, or -1 if the portal is unpaired. */
export interface PortalExit { dest: number; }

/**
 * The engine's internal, normalized level shape (0-based, packed cell keys; produced by
 * `normalizeLevel` / `normalizeRawLevel`). This interface grows as more modules are typed — only
 * fields needed by already-typed modules are guaranteed complete; see docs/typing.md.
 */
export interface NormalizedLevel {
    grid: GridSize;
    /** packed key of the true goal (or -1/undefined) */
    goalKey: number;
    /** packed keys of gates */
    gateKeys: number[];
    blockSet: Set<number>;
    gooseSet: Set<number>;
    falseGoalKeys: Set<number>;
    /** entry key → exit */
    portalMap: Map<number, PortalExit>;
    /** present in the full engine level, omitted by the solver normalizer */
    portalVisuals?: PortalVisual[];
    filterMap: Map<number, any>;
    flippingFilterMap: Map<number, any>;
    mustPassKeys: number[];
    mustCrossKeys: number[];
    requiredLength: number;
    requiredIntersections: number;
    surroundKeys?: number[];
    /** must-turn cell → 'either'|'cw'|'ccw' */
    mustPassTurnDirs?: Map<number, TurnDir>;
    adjacentTurnKeys?: number[];
    /** parallel to adjacentTurnKeys */
    adjacentTurnDirs?: TurnDir[];
    landmarkMeta?: Map<number, { objectType: string; role: string }>;
    id?: number | null;
    level?: number;
    hints?: number[][];
}

/**
 * The subset of navigation state the win/metric rules read (a projection of the live nav slice,
 * or a reconstructed snapshot). All packed keys.
 */
export interface PathMetricsState {
    path: number[];
    isPortalJump: Set<number>;
    intersections: number;
    visitedCounts: Map<number, number>;
    /** cell → 'cw'|'ccw'|'both' */
    turnsAtMap?: Map<number, string>;
}

/** Per-cell axis usage (which of the H/V edges through a cell are used). */
export interface CellUsage { h: boolean; v: boolean; }

/**
 * The mutable nav fields `pushStep()` reads and writes. A projection narrower than {@link
 * TapRouteState} (it never touches `mode`/`armedFalseGoals`/`revealedGeese`), so it is satisfied
 * by both the live nav slice (`NavigationState`) and a full `TapRouteState` — letting the engine
 * pass its nav slice directly without an impedance cast.
 */
export interface NavStepState {
    path: number[];
    isPortalJump: Set<number>;
    visitedCounts: Map<number, number>;
    cellUsage: Map<number, CellUsage>;
    intersections: number;
    activeGateKey: number | null;
    flipCount: number;
    crossedFlippingFilters: Map<number, number>;
    turnsAtMap?: Map<number, string>;
}

/**
 * The flat, self-contained movement state used by the pure tap-route transition
 * (`cloneTapRouteState` and friends in runtime/path-state.js). A superset of the win/metric
 * projection — assignable to both {@link MoveState} and {@link PathMetricsState}.
 */
export interface TapRouteState {
    mode: number;
    path: number[];
    isPortalJump: Set<number>;
    visitedCounts: Map<number, number>;
    cellUsage: Map<number, CellUsage>;
    intersections: number;
    flipCount: number;
    crossedFlippingFilters: Map<number, number>;
    activeGateKey: number;
    turnsAtMap: Map<number, string>;
    armedFalseGoals: Set<number>;
    revealedGeese: Set<number>;
}

/** Nav fields shared by the nested (.nav) and flat forms of {@link MoveState}. */
export interface NavFields {
    path?: number[];
    visitedCounts?: Map<number, number>;
    cellUsage?: Map<number, CellUsage>;
    isPortalJump?: Set<number>;
    intersections?: number;
    flipCount?: number;
    crossedFlippingFilters?: Map<number, number>;
    turnsAtMap?: Map<number, string>;
}

/**
 * Flexible move-evaluation state accepted by `isValidMove`: either a nested engineState (with
 * `.nav`/`.hazards` sub-objects) or a flat snapshot. All fields optional — the function resolves
 * nested-or-flat via optional chaining + `??`.
 */
export type MoveState = NavFields & {
    mode?: number;
    nav?: NavFields;
    hazards?: { armedFalseGoals?: Set<number> };
    counts?: Map<number, number>;
    usage?: Map<number, CellUsage>;
    jumpSet?: Set<number>;
    armedFalseGoals?: Set<number>;
    crossedSet?: Map<number, number>;
};

/** Options for `isValidMove` (the static MoveContext flags plus state-derived overrides). */
export interface MoveOptions {
    isStrict?: boolean;
    allowJump?: boolean;
    forbidPortals?: boolean;
    mode?: number;
    armedFalseGoals?: Set<number>;
    _flipCount?: number;
    crossedSet?: Map<number, number>;
    checkHazards?: boolean;
    checkFalseGoals?: boolean;
    checkWinMetrics?: boolean;
    disabledPrunes?: string[];
    diagnostics?: { reasonCode?: string; reasonDetail?: any } | null;
}
