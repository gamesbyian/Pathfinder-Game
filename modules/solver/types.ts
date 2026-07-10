// Solver-local type contracts. Type-only module (no runtime exports) — referenced by solver
// modules via `import type { T } from './types.js'` (ADR 0011 / docs/typing.md).

import type { IntHashMap } from './int-hash-map.js';

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
    /** Only meaningful alongside `repair: true`. Enables repair-search.ts's must-turn
     *  exit-guidance nudge (EXIT_GUIDANCE_EPSILON_BOOST) for this attempt only — see
     *  attempts.ts's repairMustTurnBiasedAttempt and data/stress/README.md's S043 writeup. Kept as a
     *  SEPARATE, later attempt rather than turned on for the ordinary repair attempt because the
     *  nudge measurably regressed an already-solved must-turn cluster level (S030) even at very
     *  low probabilities — appending it as its own attempt (which only ever runs after the
     *  unbiased repair attempt has already failed) makes the risk purely additive: a level whose
     *  ordinary repair attempt succeeds never reaches this one. */
    repairMustTurnBiased?: boolean;
}

/** A move-scoring weight profile (policy). All weights optional; each defaults to 1. */
export interface ScoringProfile {
    goalAttractionWeight?: number;
    objectiveAttractionWeight?: number;
    finishCommitmentWeight?: number;
    perimeterBiasWeight?: number;
    mustPassUrgencyWeight?: number;
    mustCrossUrgencyWeight?: number;
    /** Distance-to-cell pull toward pending must-turn landmarks. Defaults to 1 like every other
     *  weight — except POLICY_PROFILES.repair sets it to 0 (see scoring.ts's must-turn urgency
     *  term and data/stress/README.md for why repair specifically opts out: this term's constant
     *  background pull throughout exploration measurably destabilized repair's convergence). */
    mustTurnUrgencyWeight?: number;
    /** Reward for choosing the specific exit direction that satisfies a pending must-turn
     *  cell's cw/ccw requirement once standing at it — decoupled from mustTurnUrgencyWeight
     *  because it's a much more localized signal (only nonzero at the cell itself, not a
     *  constant pull). Despite that locality, POLICY_PROFILES.repair still sets it to 0: a
     *  scoring.ts bug fix made this term start actually firing under repair's calling
     *  convention (previously silently dead there — see scoring.ts), and even its default
     *  weight of 1 regressed an already-solved must-turn level. See policy.ts and
     *  data/stress/README.md's S043 writeup for the reproducible A/B and the safer fix that lives in
     *  repair-search.ts instead. */
    mustTurnExitGuidanceWeight?: number;
    /** Guidance toward the nearer terminal of a mismatched-parity ("twist") portal when the
     *  level's gate/goal/reqLen parity relationship makes a portal-less path of exactly reqLen
     *  moves combinatorially impossible (see scoring.ts's portal-parity guidance term and
     *  prep.ts / data/stress/README.md's S043 writeup). Defaults to 1 like every other weight. */
    portalParityGuidanceWeight?: number;
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
    /** packed key → 1 if a gate cell, 0 otherwise */
    gateFlags: Uint8Array;
    /** blocks ∪ geese ∪ gates, indexed by packed key — used by the isConnected BFS */
    reachBlockedArr: Uint8Array;
    /** packed key → index into mustPassKeys, or -1 if not a must-pass cell */
    mustPassIndex: Int8Array;
    /** packed key → index into mustCrossKeys, or -1 if not a must-cross cell */
    mustCrossIndex: Int8Array;
    /** packed key → index into the flipping-filter map, or -1 if not a flipper cell */
    flipperIndexMap: Int8Array;
    flipperInitAxes: Uint8Array;
    /** packed key * 4 + direction → neighbor's packed key, or -1 if no static neighbor in
     *  that direction (direction order/axis: see encoding.ts's NEIGHBOR_DX/DY/AXIS). */
    staticNeighborKeys: Int32Array;
    /** BFS dist-to-goal map */
    distMap: Map<number, number>;
    /** per must-pass cell: dist map */
    mustPassDistMaps: Map<number, number>[];
    /** per must-cross cell: dist map */
    mustCrossDistMaps: Map<number, number>[];
    /** per objective: dist map */
    objectiveDistMaps: Map<number, number>[];
    mustTurnKeys: number[];
    /** cells that can't host a false goal */
    trapInvalidSet: Set<number>;
    surroundInitNeighborMasks?: Uint8Array | number[];
    surroundNeighborIndex?: Map<number, SurroundNbr[]>;
    /** packed key → index into mustTurnKeys, or -1 if not a must-turn cell (always present,
     *  all -1 when there are no must-turn cells — same convention as mustPassIndex etc.) */
    mustTurnCellIndex: Int8Array;
    mustTurnDirs?: string[];
    adjTurnCellIndex?: Map<number, AdjTurnNbr[]>;
    _forcedPortalExitKey?: ForcedPortalExit | null;
    /** forced gate-exit key (offline tooling) */
    _forcedFirstStepKey?: number | null;
    /** mutable node-count accumulator */
    _metrics?: { nodesExpanded: number };
    /** Memoization cache for mustPassLowerBound, lazily created — see lower-bounds.ts. Sound to
     *  share across every attempt/gate within one solveLevel() call (same prep instance for all
     *  of them): the bound is a pure function of (pos, state.mpVisitedMask) alone, nothing
     *  attempt/gate-specific. Keyed by a single packed number (see lower-bounds.ts), never
     *  cleared mid-solve — prep itself is recreated fresh per solveLevel() call, so the cache
     *  can never leak across levels or across separate solves of the same level. IntHashMap (not
     *  a plain Map) — see int-hash-map.ts — since this is the hottest cache in the solver and the
     *  key space is too large (~2^44) for a dense array. */
    _mpLowerBoundCache?: IntHashMap;
    /** Memoization cache for mustCrossLowerBound, lazily created — see lower-bounds.ts. Same
     *  safety argument as _mpLowerBoundCache, extended with each pending cell's crossCounts/axis
     *  state in the cache key (must-cross's bound depends on more than just the mask). */
    _mcLowerBoundCache?: IntHashMap;

    // Distance/lower-bound precomputation. The objective-indexed arrays below are ALWAYS set by
    // prepLevel() (empty when the objective is absent), so they are non-optional:
    /** per must-pass cell: dist array */
    mpDistArrs: Uint16Array[];
    /** per must-cross cell: dist array */
    mcDistArrs: Uint16Array[];
    /** pairwise must-pass distances — flat row-major, index [i * mustPassKeys.length + j] */
    mpPairDist: Float64Array;
    /** pairwise must-cross distances — flat row-major, index [i * mustCrossKeys.length + j] */
    mcPairDist: Float64Array;
    mustPassToGoalDist: number[];
    mustCrossToGoalDist: number[];
    /** BFS dist-to-goal per cell */
    goalDistArr: Uint16Array;
    /** must-pass ∪ must-cross keys */
    objectiveKeys: number[];
    /** per objective: dist array */
    objDistArrs: Uint16Array[];
    /** per flipper: approach dist array (even parity); `empty` = no valid approach source
     *  exists at all (grid edge / all-blocked) — distinct from "sources exist but this
     *  particular query is unreachable" (an all-0xFFFF array can't tell those apart alone). */
    flipperApproachEven: { dist: Uint16Array; empty: boolean }[];
    /** per flipper: approach dist array (odd parity) — see flipperApproachEven. */
    flipperApproachOdd: { dist: Uint16Array; empty: boolean }[];
    /** ablation config (null = all enabled) */
    _cfg?: AblationConfig | null;
    /** Portal pairs whose two terminals have mismatched cell parity ("twist" portals) — see
     *  prep.ts's portal-parity guidance comment and data/stress/README.md's S043 writeup. Empty for
     *  portal-free levels and levels where every portal pair is same-parity. */
    parityPortalDistMaps?: { a: number; b: number; dist: Uint16Array }[];
    // Landmark-specific maps are present only on landmark levels (guarded at the call sites).
    // surround/adjTurn/mustTurn/mcApproach/parityPortal dist maps are all flattened to
    // Uint16Array (distMapToArray) for O(1) access in scoreMove/lower-bounds.ts's hot loops.
    // vEmpty/hEmpty: true when buildAxisApproachMap found zero valid approach sources at all
    // (distinct from "sources exist but this query is unreachable" — see prep.ts).
    mcApproachDistMaps?: { h: Uint16Array; hEmpty: boolean; v: Uint16Array; vEmpty: boolean }[];
    surroundNeighborDistMaps?: Uint16Array[][];
    surroundNeighborKeys?: number[][];
    surroundNeighborGoalDist?: number[][];
    adjTurnDistMaps?: Uint16Array[];
    adjTurnGoalDist?: number[];
    /** per must-turn cell: single-source BFS distance-to-cell array (see prep.ts) */
    mustTurnDistMaps?: Uint16Array[];
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
