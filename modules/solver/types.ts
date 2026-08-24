import type { IntHashMap } from './int-hash-map.js';

export interface SolverSearchState {
    path: number[];
    visited: Uint16Array;
    edgeUsage: Uint8Array;
    ints: number;
    mustMask: number;
    mustCrossMask: number;
    crossCounts: Uint8Array;
    mpVisitedMask: number;
    portalJumps: number;
    flipperUsedMask: number;
    lastWasPortalJump: boolean;
    surroundMask: number;
    surroundNeighborRemainingMasks: Uint8Array;
    mustTurnMask: number;
    adjTurnMask: number;
}

export interface AttemptConfig {
    profileName: string;
    templateName?: string | null;
    beamWidth?: number | null;
    diverseBeam?: boolean;
    repair?: boolean;
    repairMustTurnBiased?: boolean;
    repairTurnBiased?: boolean;
    admissibleOrder?: boolean;
    admissibleOrderNoTieBreak?: boolean;
    admissibleOrderLds?: boolean;
    seedSalt?: number;
    flags?: Record<string, boolean>;
}

export interface AblationConfig {
    [key: string]: boolean | number | undefined;
}

/** A scoring weight vector. Missing values use the policy defaults at the read site. */
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
    /** Flipping-filter cells that can be entered but never left, so entering one can never be part
     *  of a solution — see prepLevel for the derivation. Treated as impassable by the connectivity
     *  BFS; deliberately still present in staticNeighborKeys (prepLevel explains why). */
    deadFlipperKeys: Set<number>;
    /** Grid width — the stride for denseIndex(). Distance arrays are dense (gridW * gridH), not
     *  KEY_SPACE-sized, so every read needs it. See distance.ts's denseIndex. */
    gridW: number;
    /** blocks ∪ geese ∪ gates, indexed by packed key — used by the isConnected BFS */
    reachBlockedArr: Uint8Array;
    /** Row-bitmap mirror of `reachBlockedArr`'s complement for the bit-parallel connectivity
     *  flood fill (topology.ts): `reachPassableRows[y]` has bit x set when (x, y) is NOT in
     *  blocks ∪ geese ∪ gates. `null` when the grid is too wide for one 32-bit word per row
     *  (see topology.ts's MAX_BITROW_DIM) — the flood fill falls back to its plain BFS then. */
    reachPassableRows: Uint32Array | null;
    /** packed keys of the flipping-filter cells, in flipperIndexMap's own index order — lets the
     *  flood fill map a set `flipperUsedMask` bit back to its cell without scanning the grid. */
    flipperKeys: Int32Array;
    /** packed key → index into mustPassKeys PLUS ONE, 0 meaning "not a must-pass cell" (same
     *  zero-means-absent bias as staticNeighborKeys below — every real read site undoes it with
     *  `- 1`; this comment previously said "-1 if not," which was stale and wrong). */
    mustPassIndex: Int8Array;
    /** packed key → index into mustCrossKeys PLUS ONE, 0 meaning "not a must-cross cell" — same
     *  convention as mustPassIndex above. */
    mustCrossIndex: Int8Array;
    /** packed key → index into the flipping-filter map PLUS ONE, 0 meaning "not a flipper cell"
     *  — same convention as mustPassIndex/mustCrossIndex above (this comment previously said
     *  "-1 if not," which was stale and wrong the same way theirs was). */
    flipperIndexMap: Int8Array;
    flipperInitAxes: Uint8Array;
    /** packed key → dense per-level cell index PLUS ONE, 0 meaning "not a live (non-block/goose)
     *  grid cell" — same zero-means-absent bias as mustPassIndex etc. A grid has at most a few
     *  hundred live cells while KEY_SPACE is 1,048,576; this is the one KEY_SPACE-sized array
     *  `staticNeighborKeys` below still needs to resolve a packed key to its dense row. See
     *  staticNeighborKeys' own comment for why this indirection exists. */
    cellDenseIndex: Uint8Array;
    /** `(cellDenseIndex[packedKey] - 1) * 4 + direction` → neighbor's packed key PLUS ONE, 0 if no
     *  static neighbor in that direction (direction order/axis: see encoding.ts's
     *  NEIGHBOR_DX/DY/AXIS). Dense-indexed (via cellDenseIndex above), not packed-key-indexed:
     *  sized `liveCellCount * 4` instead of `KEY_SPACE * 4` — the difference between allocating a
     *  ~900-slot array and a 4.2M-slot (16.8 MB) one, microbenchmarked at ~2ms per allocation for
     *  the old form purely from array size, not from filling it (only real cells were ever
     *  written either way). Every read site resolves the dense row via cellDenseIndex first. See
     *  reports/2026-08-23-dense-static-neighbor-keys.md. */
    staticNeighborKeys: Int32Array;
    /** gate key → forced first-move target key, only present when that gate is orthogonally
     *  adjacent to EXACTLY ONE must-cross cell (reports/2026-07-31-mustcross-forced-structure.md's
     *  step 3 — see prep.ts's own computation for the derivation). Read by dfsFromGate/
     *  beamSearchFromGate/repairSearchFromGate/admissible-order-search.ts at the very first move
     *  out of a gate, gated by PRUNE_MC_FORCED_FIRST_MOVE and only when the offline-tooling
     *  `_forcedFirstStepKey` override below hasn't already claimed the first move. */
    gateForcedFirstStepKey: Map<number, number>;
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
    /** This solve's OWN work counter, isolated from every other concurrent `solveLevel()` call in
     *  the same JS realm. Always present (initialized fresh to `{ units: 0 }` by `prepLevel()`) —
     *  never optional, so a caller can never accidentally read/write a shared fallback. Every
     *  canonical work unit (`applyMove`, `isConnected` — see work-meter.ts) increments BOTH this
     *  AND the legacy module-global `workMeter.units` (offline hint-discovery tooling that spans
     *  many sequential `solveLevel()` calls, e.g. diversification.ts/hint-ablation-generator.ts,
     *  still reads the module-global directly for cross-call cumulative tracking — that role is
     *  unaffected). Every budget-check comparison and per-solve accounting computation inside the
     *  attempt ladder and the four search techniques reads/derives from THIS field, not the module
     *  global, precisely so two concurrent solves in the same realm cannot see or consume each
     *  other's work. Fixed 2026-08-20 — see work-meter.ts's own comment for the incident this
     *  closes (a real, confirmed race: `workMeter.units` was previously a single module singleton
     *  every concurrent solve shared, so one solve's own `spent = workMeter.units - workStart`
     *  delta could include work a DIFFERENT concurrent solve did in between). */
    _workMeter: { units: number };
    /** Absolute `prep._workMeter.units` value at which the CURRENT attempt must stop, set by the
     *  attempt ladder before each attempt. Every search technique checks it in the same place it
     *  already checks its own budget, so all four stop on the same machine-independent quantity.
     *  Infinity/undefined = uncapped. See work-meter.ts. */
    _workCap?: number;
    /** Experiment-only immutable whole-solve cap; per-attempt allocations may only reduce it. */
    _strictWorkCap?: number;
    /** Reusable DFS/beam/repair search-state backing buffers (see search-state.ts's `createState`),
     *  keyed by call-site slot (`STATE_BUF_DFS`/`STATE_BUF_BEAM`/`STATE_BUF_REPAIR`) and lazily
     *  allocated on first use. Scoped to THIS prep (i.e. this one `solveLevel()` call) rather than
     *  module-global: the reuse-across-attempts optimization these buffers exist for only ever
     *  needs to span the attempts within one solve (same prep instance throughout), and scoping
     *  them per-prep — instead of per-JS-realm — is what makes two concurrent solves safe to
     *  interleave. Fixed 2026-08-20, same incident as `_workMeter` above: a module-global buffer
     *  pool meant a concurrently-running technique of the same kind (two overlapping DFS attempts,
     *  for example) could have its live `visited`/`edgeUsage` arrays cleared out from under it by
     *  the other solve's own next `createState` call. */
    _stateBufs?: ({ visited: Uint16Array; edgeUsage: Uint8Array } | undefined)[];
    /** Opt-in diagnostic output gate; never read by search policy. */
    _attemptBudgetTelemetry?: boolean;
    /** Research-only beam observer. Absent in every production call. The observer receives copied
     * replay-complete paths and may label them, but cannot affect search decisions. */
    _beamResearchObserver?: BeamResearchObserver | null;
    /** Test-only: force beamSearchFromGate's dedup/diversity keying onto the delimited-string
     *  fallback path even when the fast numeric encoding would fit — see beamNumericDedupKey's own
     *  comment in search.ts. Lets a differential test run the SAME level/search through both key
     *  representations and assert byte-identical results. Never read by production code paths;
     *  absent (falsy) preserves the default numeric-when-safe behavior. */
    _forceBeamDedupStringKeyForTests?: boolean;
    /** Research/test-only repair seed control. When absent, the long-standing gate/salt-derived
     * production seeds are used byte-for-byte. Both independent repair streams derive from it. */
    _repairResearchSeed?: number | null;
    /** Research-only repair elite sink. Receives copied paths after elite retention; never read by search. */
    _repairEliteResearchObserver?: RepairEliteResearchObserver | null;
    /** Research-only repair choice sink for diagnosing shared-draw/survivor-order interactions. */
    _repairChoiceResearchObserver?: RepairChoiceResearchObserver | null;
    /** Memoization cache for mustPassLowerBound, lazily created — see lower-bounds.ts. Sound to
     *  share across every attempt/gate within one solveLevel() call only because cache warming is
     *  semantically inert: the bound is a pure function of (pos, state.mpVisitedMask) for a fixed
     *  level/prep, and a hit must equal a fresh computation exactly. Keyed by one packed Number
     *  reserving the full schema-valid 30-bit visited mask; with current packed cell keys the
     *  composite stays below 2^50, safely inside Number's exact-integer range. The cache is never
     *  cleared mid-solve, so it is intentional cross-attempt mutable state and belongs in
     *  fresh-vs-preceded diagnostics even though prep itself is recreated for every solveLevel(). */
    _mpLowerBoundCache?: IntHashMap;
    /** Memoization cache for mustCrossLowerBound, lazily created — see lower-bounds.ts. Same
     *  cross-attempt semantic-inertness requirement as _mpLowerBoundCache, extended with each
     *  pending cell's crossCounts/axis state in the cache key (must-cross's bound depends on more
     *  than just the mask). */
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
    /** Guidance-only sibling of goalDistArr — see DistMapOpts.legacyGuidanceRouting's own comment
     *  in distance.ts. NOT a sound lower bound; scoring.ts only, gated by
     *  SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE. */
    guidanceGoalDistArr: Uint16Array;
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

export type BeamResearchStage = 'incoming-frontier' | 'generated' | 'hard-pruned'
    | 'post-hard-prune' | 'dedup-removed' | 'post-production-dedup'
    | 'score-width-culled' | 'diversity-culled' | 'post-score-width-cull' | 'post-diversity-selection';

export interface BeamResearchRecord {
    stage: BeamResearchStage;
    depth: number;
    work: number;
    paths: number[][];
    /** Present for removals/culls; indices refer to score-sorted pool order. */
    details?: Record<string, unknown>;
}

export interface BeamResearchObserver { observe(record: BeamResearchRecord): void; }

export interface RepairEliteResearchRecord {
    producer: 'repair'; path: number[]; badness: number; arrivalNodes: number; restart: number;
}
export interface RepairEliteResearchObserver { observe(record: RepairEliteResearchRecord): void; }
export interface RepairChoiceResearchRecord {
    prefix: number[]; survivors: number[]; chosenIndex: number; chosen: number;
    mode: 'only' | 'greedy' | 'explore' | 'must-turn-override'; primaryDraws: number[]; biasDraw: number | null;
}
export interface RepairChoiceResearchObserver { observe(record: RepairChoiceResearchRecord): void; }

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
