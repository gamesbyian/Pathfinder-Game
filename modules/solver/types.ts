// Solver-local type contracts. Type-only module (no runtime exports) — referenced by solver
// modules via `import type { T } from './types.js'` (ADR 0011 / docs/typing.md).

/**
 * The solver's mutable DFS/beam search state (see search-state.ts `createState`). All masks are
 * 32-bit integers; all keys are packed. Typed arrays are indexed by packed key (KEY_SPACE) or by
 * objective index.
 */
export interface SolverSearchState {
    /** packed cell keys of the current path */
    path: number[];
    /** visit count per cell (KEY_SPACE) */
    visited: Uint16Array;
    /** per-cell axis bits: 1=H used, 2=V used (KEY_SPACE) */
    edgeUsage: Uint8Array;
    /** intersection count so far */
    ints: number;
    /** bit i set while must-pass[i] is unvisited */
    mustMask: number;
    /** bit i set while must-cross[i] is unsatisfied */
    mustCrossMask: number;
    /** crossing count per must-cross cell */
    crossCounts: Uint8Array;
    /** bit i set once must-pass[i] is visited */
    mpVisitedMask: number;
    /** portal jumps so far (subtracted from counted length) */
    portalJumps: number;
    /** bit i set once flipper i has been used */
    flipperUsedMask: number;
    lastWasPortalJump: boolean;
    /** bit i set while surround[i] has unvisited neighbors */
    surroundMask: number;
    /** per surround cell: 8-bit unvisited-neighbor mask */
    surroundNeighborRemainingMasks: Uint8Array;
    /** bit i set while must-turn[i] is unsatisfied */
    mustTurnMask: number;
    /** bit i set while adj-turn[i] is unsatisfied */
    adjTurnMask: number;
}

/**
 * Ablation config (null/absent = all features enabled). Primarily a bag of boolean feature flags
 * (`SCORE_*`/`PRUNE_*`/`STRATEGY_*`/`PROFILE_*`/`TEMPLATE_*`), plus two special non-boolean controls
 * read by `attempts.ts` ordering: `ATTEMPT_ORDER` and `_randomSeed`.
 */
export interface AblationConfig {
    ATTEMPT_ORDER?: string;
    _randomSeed?: number;
    [flag: string]: boolean | string | number | undefined;
}

/**
 * One solver attempt configuration (gate × profile × optional template/beam). Built by
 * `getAttemptConfigs`; a `beamWidth` selects beam search (else DFS).
 */
export interface AttemptConfig {
    profileName: string;
    template: StructuralTemplate | null;
    beamWidth?: number;
    minBudgetFraction?: number;
    diverseBeam?: boolean;
    /** Dispatches to repairSearchFromGate (repair-search.js's iterated-local-search
     *  fallback) instead of DFS/beam. Mutually exclusive with beamWidth. */
    repair?: boolean;
}

/** A move-scoring weight profile (policy). All weights optional; each defaults to 1. */
export interface ScoringProfile {
    goalAttractionWeight?: number;
    objectiveAttractionWeight?: number;
    finishCommitmentWeight?: number;
    perimeterBiasWeight?: number;
    mustPassUrgencyWeight?: number;
    mustCrossUrgencyWeight?: number;
    intersectionSetupWeight?: number;
    antiDitherWeight?: number;
    revisitPenaltyWeight?: number;
}

/** A structural traversal template (perimeter/corner/side biases). All fields optional. */
export interface StructuralTemplate {
    id?: string;
    /** 'cw' | 'ccw' */
    perimeterDir?: string;
    branchBiasBoost?: number;
    directionPenalty?: number;
    edgeDriftPenalty?: number;
    prefersCorner?: boolean;
    cornerMissPenalty?: number;
    prefersSide?: boolean;
    sideSwitchPenalty?: number;
    /** 'x' | 'y' */
    sideAxis?: string;
    sideDir?: number;
    sideBiasBoost?: number;
    sideViolation?: number;
}

/** A surround/adj-turn neighbor entry. */
export interface SurroundNbr { i: number; bit: number; }
export interface AdjTurnNbr { i: number; dir: string; }
/** A forced portal-exit restriction (offline tooling only). */
export interface ForcedPortalExit { from: number; to: number; }

/**
 * Per-level precomputed solver data (see prep.ts `prepLevel`). **Partial/growing** — only the
 * fields read by already-typed solver modules are listed. Typed arrays are indexed by packed key.
 */
export interface PrepLevel {
    mustMaskForDFS: number;
    initialMustMask: number;
    initialMustCrossMask: number;
    initialSurroundMask?: number;
    initialMustTurnMask?: number;
    initialAdjTurnMask?: number;
    hasLandmarkConstraints: boolean;
    gateSet: Set<number>;
    /** blocks ∪ geese ∪ gates, indexed by packed key — used by the isConnected BFS */
    reachBlockedArr: Uint8Array;
    /** packed key → index into mustPassKeys, or -1 if not a must-pass cell */
    mustPassIndex: Int8Array;
    /** packed key → index into mustCrossKeys, or -1 if not a must-cross cell */
    mustCrossIndex: Int8Array;
    /** packed key → index into the flipping-filter map, or -1 if not a flipper cell */
    flipperIndexMap: Int8Array;
    flipperInitAxes: Uint8Array;
    /** flat [nk, axis, …] pairs */
    staticNeighbors: Map<number, Int32Array | number[]>;
    /** BFS dist-to-goal map */
    distMap: Map<number, number>;
    /** per must-pass cell: dist map */
    mustPassDistMaps: Map<number, number>[];
    /** per must-cross cell: dist map */
    mustCrossDistMaps: Map<number, number>[];
    /** per objective: dist map */
    objectiveDistMaps: Map<number, number>[];
    objectiveKeyToIndex: Map<number, number>;
    mustTurnKeys: number[];
    /** cells that can't host a false goal */
    trapInvalidSet: Set<number>;
    surroundInitNeighborMasks?: Uint8Array | number[];
    surroundNeighborIndex?: Map<number, SurroundNbr[]>;
    mustTurnCellIndex?: Map<number, number>;
    mustTurnDirs?: string[];
    adjTurnCellIndex?: Map<number, AdjTurnNbr[]>;
    _forcedPortalExitKey?: ForcedPortalExit | null;
    /** forced gate-exit key (offline tooling) */
    _forcedFirstStepKey?: number | null;
    /** mutable node-count accumulator */
    _metrics?: { nodesExpanded: number };

    // Distance/lower-bound precomputation. The objective-indexed arrays below are ALWAYS set by
    // prepLevel() (empty when the objective is absent), so they are non-optional:
    /** per must-pass cell: dist array */
    mpDistArrs: Uint16Array[];
    /** per must-cross cell: dist array */
    mcDistArrs: Uint16Array[];
    /** pairwise must-pass distances */
    mpPairDist: number[][];
    /** pairwise must-cross distances */
    mcPairDist: number[][];
    mustPassToGoalDist: number[];
    mustCrossToGoalDist: number[];
    /** BFS dist-to-goal per cell */
    goalDistArr: Uint16Array;
    /** must-pass ∪ must-cross keys */
    objectiveKeys: number[];
    /** per objective: dist array */
    objDistArrs: Uint16Array[];
    /** per flipper: approach map (even parity) */
    flipperApproachEven: Map<number, number>[];
    /** per flipper: approach map (odd parity) */
    flipperApproachOdd: Map<number, number>[];
    /** ablation config (null = all enabled) */
    _cfg?: AblationConfig | null;
    // Landmark-specific maps are present only on landmark levels (guarded at the call sites):
    mcApproachDistMaps?: { h: Map<number, number>; v: Map<number, number> }[];
    surroundNeighborDistMaps?: Map<number, number>[][];
    surroundNeighborKeys?: number[][];
    surroundNeighborGoalDist?: number[][];
    adjTurnDistMaps?: Map<number, number>[];
    adjTurnGoalDist?: number[];
}

/** Undo token returned by `applyMove` (landmark fields present only when hasLandmarkConstraints). */
export interface UndoToken {
    target: number;
    from: number;
    moveAxis: number;
    axisBit: number;
    isPortalJump: boolean;
    prevVisited: number;
    prevEdgeFrom: number;
    prevEdgeTarget: number;
    wasIntAdded: boolean;
    prevMustMask: number;
    prevMpVisitedMask: number;
    /** unused by undoMove (mustMask/mpVisitedMask restore wholesale) — kept for symmetry with mcIdx */
    mpIdx: number;
    prevMustCrossMask: number;
    /** -1 when `target` is not a must-cross cell */
    mcIdx: number;
    prevCrossCount: number;
    prevFlipperUsedMask: number;
    prevLastWasPortalJump: boolean;
    prevSurroundMask?: number;
    surroundNbrRestores?: { i: number; prevMask: number }[] | null;
    prevMustTurnMask?: number;
    prevAdjTurnMask?: number;
}
