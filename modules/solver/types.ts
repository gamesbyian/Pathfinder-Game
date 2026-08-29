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
 * Ablation config (null/absent = production defaults; most features on, experimental opt-ins off).
 * Primarily a bag of boolean feature flags
 * (`SCORE_*`/`PRUNE_*`/`STRATEGY_*`/`PROFILE_*`/`TEMPLATE_*`), plus two special non-boolean controls
 * read by `attempts.ts` ordering: `ATTEMPT_ORDER` and `_randomSeed`.
 */
export interface AblationConfig {
    ATTEMPT_ORDER?: string;
    _randomSeed?: number;
    [flag: string]: boolean | string | number | undefined;
}

/**
 * One solver attempt configuration (gate × scoring profile × optional ordering bias/beam). Built by
 * `getAttemptConfigs`; a `beamWidth` selects beam search (else DFS).
 */
export interface AttemptConfig {
    scoringProfileId: string;
    orderingBias: StructuralOrderingBias | null;
    beamWidth?: number;
    minBudgetFraction?: number;
    mechanicBucketRetention?: boolean;
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
    /** Only meaningful alongside `repair: true`. Enables repair-search.ts's shared turn-aware
     *  selective bias (enableTurnBias) for this attempt only. Added default-OFF, ONLY under an
     *  explicit STRATEGY_REPAIR_TURN_BIAS ablation flag (production null-cfg never adds it), and
     *  placed FIRST among the repair configs so the early probe tries it first — turn bias solves
     *  its levels fast (~6 s), and wired last it only won in the ~60 s fallback. Placing it first can
     *  displace an ordinary-repair probe solve into the (slower) fallback; that is acceptable churn,
     *  not a veto — the project bar is net-monotonic-after-recovery (retain gains, recover any
     *  standing regression), which the corpus-2 refresh's before/after solved-count + timing A/B is
     *  what prices. See reports/2026-07-22-repair-stagnation-turnbias-production-wiring-validation.md
     *  and the investigation synthesis. */
    repairTurnBiased?: boolean;
    /** Dispatches to admissible-order-search.ts's admissibleOrderSearch instead of DFS/beam/repair.
     *  `scoringProfileId` selects the tie-break profile (admissible slack is always the primary
     *  ordering), not a DFS/beam scoring profile in the usual sense. Routed by
     *  attempts.ts's getAttemptConfigs (see ADMISSIBLE_ORDER_PROFILES) as a last-resort tier run in
     *  its own dedicated budget slice by orchestration.ts's solveLevel, after the main ladder,
     *  repair fallback, and attraction-diversity pass have all failed — mirroring the repair
     *  fallback's own separate-tier pattern. Also reachable standalone via scripts/method-probe.mjs's
     *  canonical `admissible-order|tieBreak=<profile>|lds=off` identities for isolated per-level testing. Mutually exclusive with beamWidth/repair.
     *  See admissible-order-search.ts's own doc for what the technique is and isn't. */
    admissibleOrder?: boolean;
    /** Only meaningful alongside `admissibleOrder: true`. Skips the soft-score tie-break entirely
     *  (admissible-order-search.ts's rankByAdmissibleSlack receives `null` instead of a resolved
     *  ScoringProfile), reproducing the technique's ORIGINAL ordering from before the same-day
     *  tuning experiment made the tie-break unconditional — see that file's own doc. `profileName`
     *  is ignored when this is set (still required as a string by the type, conventionally 'none').
     *  A real, if small, population of the technique's earliest validated solves specifically
     *  needed this no-tie-break ordering and stopped reproducing once every profile (including
     *  'default') started tie-breaking unconditionally. */
    admissibleOrderNoTieBreak?: boolean;
    /** Only meaningful alongside `admissibleOrder: true`. Dispatches to admissible-order-search.ts's
     *  admissibleOrderSearchLDS instead of calling admissibleOrderSearch directly. TESTED AND
     *  REJECTED (2026-07-24, see that function's own doc and reports/2026-07-24-admissible-order-
     *  search-corpus2-validation.md): measured against all 117 of this technique's validated solves,
     *  LDS used MORE nodes on every level that solved within the standard budget and regressed 9 of
     *  117 into outright timeout — kept only as an opt-in, zero-default-risk, documented negative
     *  result, reachable via scripts/method-probe.mjs's `ida:<profile>(lds)`; never produced by
     *  attempts.ts/ADMISSIBLE_ORDER_PROFILES and not a candidate for production wiring without new
     *  evidence. */
    admissibleOrderLds?: boolean;
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
     *  weight — except SCORING_PROFILES.repair sets it to 0 (see scoring.ts's must-turn urgency
     *  term and data/stress/README.md for why repair specifically opts out: this term's constant
     *  background pull throughout exploration measurably destabilized repair's convergence). */
    mustTurnUrgencyWeight?: number;
    /** Reward for choosing the specific exit direction that satisfies a pending must-turn
     *  cell's cw/ccw requirement once standing at it — decoupled from mustTurnUrgencyWeight
     *  because it's a much more localized signal (only nonzero at the cell itself, not a
     *  constant pull). Despite that locality, SCORING_PROFILES.repair still sets it to 0: a
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

/** A structural ordering bias (perimeter/corner/side biases). All fields optional. */
export interface StructuralOrderingBias {
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
    /** `denseIndex(packedKey, gridW) * 4 + direction` → neighbor's packed key PLUS ONE, 0 if no
     *  static neighbor in that direction. Sized `gridW * gridH * 4` (at most ~900 slots), with
     *  block/goose rows left zero. This keeps the compact adjacency table without a KEY_SPACE-sized
     *  packed-key-to-row indirection. See reports/2026-08-23-dense-static-neighbor-keys.md. */
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
    /** Research-only isConnected() rejection observer — see ConnectivityRejectionObserver's doc. */
    _connectivityRejectionObserver?: ConnectivityRejectionObserver | null;
    /** Test-only: force beamSearchFromGate's coarse-state-merge/mechanic-bucket-retention keying onto the delimited-string
     *  fallback path even when the fast numeric encoding would fit — see beamNumericCoarseStateKey's own
     *  comment in search.ts. Lets a differential test run the SAME level/search through both key
     *  representations and assert byte-identical results. Never read by production code paths;
     *  absent (falsy) preserves the default numeric-when-safe behavior. */
    _forceBeamCoarseStateStringKeyForTests?: boolean;
    /** Research/test-only repair seed control. When absent, the long-standing gate/salt-derived
     * production seeds are used byte-for-byte. Both independent repair streams derive from it. */
    _repairResearchSeed?: number | null;
    /** Research-only repair elite sink. Receives copied paths after elite retention; never read by search. */
    _repairEliteResearchObserver?: RepairEliteResearchObserver | null;
    /** Research-only repair choice sink for diagnosing shared-draw/survivor-order interactions. */
    _repairChoiceResearchObserver?: RepairChoiceResearchObserver | null;
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
    /** Guidance-only sibling of goalDistArr — see DistMapOpts.legacyGuidanceRouting's own comment
     *  in distance.ts. NOT a sound lower bound; scoring.ts only, gated by
     *  SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE. */
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
    | 'post-hard-prune' | 'coarse-state-merge-removed' | 'post-production-coarse-state-merge'
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

/** Research-only isConnected() rejection observer (see docs/solver-optimization-current-queue.md
 *  item #0's "learned-failure search" thread and reports/2026-08-24-learned-failure-certificate-
 *  audit.md's Stage A). Absent in every production call; observing an already-computed rejection
 *  reason changes no pruning/ordering/budget decision. */
export type ConnectivityRejectionSubtype = 'goal' | 'must-pass' | 'must-cross' | 'volume';

export interface ConnectivityRejectionRecord {
    subtype: ConnectivityRejectionSubtype;
    /** Index into level.mustPassKeys/mustCrossKeys; present only for the matching subtype. */
    objectiveIndex?: number;
    pos: number;
    /** Reuses nogood-cache.ts's repair-state signature — an exact-state fingerprint, not a proof of
     *  future-state equivalence (see that file's own caveat). */
    stateFingerprint: string;
    intNeeded: number;
    mpVisitedMask: number;
    mustCrossMask: number;
    /** isConnected's reserved-intersection-wall regime (mcOpenMask !== 0) was active for this call. */
    reservedWallActive: boolean;
    freshVolume: number;
    /** Only meaningful on portal-free levels, mirroring isConnected's own volume-check gating. */
    remainingSteps: number | null;
    /** prep._workMeter.units at the moment of rejection — a work-point proxy for Stage A's "how far
     *  into the search do failures occur" question. */
    work: number;
    /** Present only when the observer opted in via `includeBoundarySketch` (Stage B — see that
     *  report's own "structural reason sketch" section). Read from the flood fill's own scratch
     *  (already materialized at the rejection point); never a second flood fill. */
    boundarySketch?: ConnectivityBoundarySketch;
}

/** Stage B (docs/solver-optimization-current-queue.md item #0's learned-failure thread): a bounded,
 *  conservative sketch of the flood fill that just rejected — NOT itself a proven reason. Two
 *  rejections sharing a sketch means their reached region and immediate boundary blockers matched;
 *  it does not by itself prove they share a sound logical cause (see that report's own caution that
 *  a coarse/geometric match is discovery evidence, not a certificate). */
export interface ConnectivityBoundarySketch {
    /** Canonical per-row reached-set bitmask (hex-encoded, one 32-bit word per grid row) — the exact
     *  same representation `_rowReached` already holds when the bit-parallel flood fill ran, read
     *  directly rather than rebuilt. Two rejections with an identical fingerprint reached the exact
     *  same set of cells (not merely the same resource-state tuple). */
    reachedFingerprint: string;
    /** Cells adjacent to the reached region that were NOT reached, with the specific reason
     *  `_reachCanEnter` would have rejected them for. Deduplicated; unbounded in principle but never
     *  larger than the grid's own cell count (<=225 per CLAUDE.md). */
    boundaryBlockers: { cell: number; reason: ConnectivityBoundaryBlockerReason }[];
}

export type ConnectivityBoundaryBlockerReason = 'static' | 'used-flipper' | 'axis-exhausted' | 'visited-wall';

export interface ConnectivityRejectionObserver {
    observe(record: ConnectivityRejectionRecord): void;
    /** Opt-in Stage B mode: also compute and attach `boundarySketch` to every record. Off by
     *  default (Stage A's own scope) since scanning/canonicalizing the boundary has a real cost
     *  that should be measured separately from Stage A's plain field capture. */
    includeBoundarySketch?: boolean;
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
