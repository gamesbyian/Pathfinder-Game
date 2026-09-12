// Shared contracts for the orchestration.ts façade: attempt/solve-option/solve-result types,
// attempt-tier lifecycle-telemetry classification, and small pure utilities (attempt identity
// keys, ablation normalization, active-gate filtering) shared by every extracted orchestration-*
// execution module. Deliberately depends on nothing else under modules/solver/orchestration*.ts so
// every other extracted module — and orchestration.ts itself — can depend on this one without a
// cycle. See modules/solver/orchestration.ts's own header for the split this file is part of.
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig, ForcedPortalExit, ConnectivityRejectionObserver, JointObligationObserver } from './types.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { canonicalAblationFeatureName, OPT_IN_FEATURES } from './ablation-config.js';
import { normalizeSolverStageId } from './stage-policy.js';
import type { SolverStageId } from './stage-policy.js';
import { keyParity } from '../domain/cell-key.js';
import { formatAttemptIdentityKey } from './attempt-identity.mjs';

export type YieldFn = (() => Promise<void>) | null;
export type AttemptSearchDispatch = typeof runAttemptSearch;

export interface LegacyLatencyPortfolioExperimentDefinition {
    pass1Ms: number;
    pass2Ms: number;
    pass3Ms: number;
    pass2Configs: ReadonlySet<string>;
    pass3Configs: ReadonlySet<string>;
    conditionalPasses?: ReadonlyArray<{
        passNumber: number;
        capMs: number;
        configs: ReadonlySet<string>;
        when: {
            minReqInt?: number;
            minMustPass?: number;
            minMustCross?: number;
            minMustTurn?: number;
            minPortals?: number;
            minFlippingFilters?: number;
        };
    }>;
}
/** One recorded attempt's metadata. */
export interface Attempt {
    /** Canonical policy-stage identity; legacy booleans below are compatibility projections. */
    stageId: SolverStageId;
    gateKey: number; scoringProfileId: string; orderingBiasId: string | null; beamWidth: number | null;
    ok: boolean; elapsedMs: number; allocatedBudgetMs: number;
    /** Diagnostic-only ceilings visible at dispatch. Null denotes an uncapped currency. */
    allocatedWorkCeiling?: number | null;
    allocatedNodeCeiling?: number | null;
    /** Canonical work-meter delta for this attempt; emitted only with budget/lifecycle telemetry. */
    workSpent?: number;
    /** Explicit termination reason. Unlike `ok`/`timedOut`, this also distinguishes a technique
     *  crash from an ordinary negative search result. */
    outcome: 'success' | 'exhausted' | 'timed-out' | 'budget-starved' | 'error';
    /** Bounded, JSON-safe description only; arbitrary thrown values and stacks are never retained. */
    error?: { name: string; message: string; gateKey: number; configKey: string; scoringProfileId: string; orderingBiasId: string | null };
    passNumber?: number; configKey?: string; restart?: boolean; schedulerPhase?: 'legacy-latency-portfolio' | 'fallback';
    /** Diagnostic-only passthrough of the originating AttemptConfig's dispatch flags — not read
     *  by any solving logic, purely so external tooling (stress benchmark, audits) can tell a
     *  diverse beam / repair attempt apart from a plain one without re-deriving it from profile
     *  name and beamWidth. */
    mechanicBucketRetention?: boolean;
    repair?: boolean;
    repairMustTurnBiased?: boolean;
    /** Diagnostic-only passthrough for the experimental turn-aware bias attempt (see
     *  AttemptConfig.repairTurnBiased) — lets tooling tell it apart from an ordinary repair attempt.
     *  Not read by any solving logic. */
    repairTurnBiased?: boolean;
    /** Repair attempts only, diagnostic-only (see runEarlyRepairSearch's multi-seed retry) — absent
     *  (equivalent to 0) for the first, ordinary-seed round; present and nonzero only for a retry
     *  round reached after every active gate already failed at every earlier seed. Not read by
     *  any solving logic, purely so external tooling can tell a retry-round win apart from an
     *  ordinary one without re-deriving it from attempt order. */
    seedSalt?: number;
    /** Repair attempts only: the exact uint32 seed this attempt's randomized local search ran with
     *  (repairPrimarySeed(gateKey, seedSalt), repair-search.ts). Recorded so a fast randomized find
     *  is reproducible — the seed that drove it, which hint provenance would otherwise lose (a
     *  repair solve is not deterministic across seeds). Absent for deterministic dfs/beam attempts. */
    randomSeed?: number;
    /** Diagnostic-only, read by external tooling — not read by any solving logic. */
    nodesExpanded?: number;
    /** Failure-only: true if this attempt's search ran out of its own budget, false if it
     *  genuinely exhausted every avenue it tried within budget (dfsFromGateLDS/beamSearchFromGate
     *  distinguish these internally already; repairSearchFromGate has no exhaustion state of its
     *  own, so this is always true when present for a repair attempt). Absent on success. */
    timedOut?: boolean;
    /** Repair attempts only, failure only: the lowest computeBadness() score any restart reached
     *  (repair-search.ts) — how close the closest near-miss got to a valid solution, tracked
     *  across the WHOLE search. Absent for non-repair attempts and for successful ones. */
    bestBadness?: number;
    /** DFS/beam attempts only, timed-out failures only: a ONE-SHOT computeBadness() snapshot of
     *  wherever the search happened to be when it ran out of budget (search.ts) — NOT a tracked
     *  best-ever minimum like bestBadness above, just a single sample. Absent for repair attempts
     *  (which report bestBadness instead), for successful attempts, and for attempts that
     *  genuinely exhausted their search space rather than timing out. */
    finalBadness?: number;
    /** True only for attempts run by the 2026-07-16 goal-attraction-disabled-retry last-resort pass (see
     *  GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION below) — diagnostic-only passthrough, same pattern as
     *  `repair`/`repairMustTurnBiased` above, so external tooling and tests can tell these attempts
     *  apart from an ordinary main-search attempt using the exact same config without re-deriving it
     *  from attempt order/count. Not read by any solving logic. */
    goalAttractionDisabledRetry?: boolean;
    /** True only for attempts run by the 2026-08-15 STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY last-resort pass
     *  (see COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION) — same diagnostic-only shape as
     *  goalAttractionDisabledRetry above. Not read by any solving logic. */
    coarseStateNearTieRetentionRetry?: boolean;
    /** True only for attempts run by the 2026-08-15 STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY
     *  last-resort pass (see ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION) — same
     *  diagnostic-only shape as goalAttractionDisabledRetry/coarseStateNearTieRetentionRetry above. Not read by any
     *  solving logic. */
    admissibleOrderNonDefaultRetry?: boolean;
    /** True only for attempts run by the 2026-08-16 STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY
     *  last-resort pass (see CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION) — same
     *  diagnostic-only shape as goalAttractionDisabledRetry/coarseStateNearTieRetentionRetry/admissibleOrderNonDefaultRetry
     *  above. Not read by any solving logic. */
    connectivityAxisExhaustedRetry?: boolean;
    /** True only for attempts run by the 2026-08-16 STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY
     *  last-resort pass (see REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION) — same diagnostic-only
     *  shape as goalAttractionDisabledRetry/coarseStateNearTieRetentionRetry/admissibleOrderNonDefaultRetry/
     *  connectivityAxisExhaustedRetry above. Not read by any solving logic. */
    repairElitePrefixDfsRetry?: boolean;
    /** True only for attempts run by the 2026-08-19 STRATEGY_MC_NEIGHBOR_BUDGET_RETRY last-resort
     *  pass (see MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION) — same diagnostic-only shape as
     *  goalAttractionDisabledRetry/coarseStateNearTieRetentionRetry/admissibleOrderNonDefaultRetry/
     *  connectivityAxisExhaustedRetry/repairElitePrefixDfsRetry above. Not read by any solving
     *  logic. */
    mcNeighborBudgetRetry?: boolean;
    /** True only for attempts run by the 2026-08-20 STRATEGY_REPAIR_LATE_PROBE last-resort pass
     *  (see REPAIR_LATE_PROBE_NODE_BUDGET) — same diagnostic-only shape as
     *  goalAttractionDisabledRetry/coarseStateNearTieRetentionRetry/admissibleOrderNonDefaultRetry/
     *  connectivityAxisExhaustedRetry/repairElitePrefixDfsRetry/mcNeighborBudgetRetry above. Not
     *  read by any solving logic. */
    repairLateProbe?: boolean;
    /** True only for attempts run by runStaticPortfolio's own 2026-09-10 resumable-tranche residual
     *  pass (see SolveOpts.staticPortfolio.resumableResidualPass) — same diagnostic-only shape as
     *  goalAttractionDisabledRetry above, so external tooling can tell a residual-pass resume apart
     *  from an ordinary first-pass attempt on the same stageId='static-portfolio' without
     *  re-deriving it from attempt order/count. Not read by any solving logic. */
    resumableResidualTranche?: boolean;
    /** Diagnostic-only passthrough for the admissible-order-fallback-search.ts prototype (see
     *  AttemptConfig.admissibleOrder) — not read by any solving logic, purely so external tooling
     *  (scripts/method-probe.mjs) can tell it apart from an ordinary DFS attempt. */
    admissibleOrder?: boolean;
    /** Diagnostic-only passthrough for AttemptConfig.admissibleOrderNoTieBreak — lets tooling tell
     *  a no-tie-break admissible-order-fallback winner apart from a profile-tie-broken one. Not read by any
     *  solving logic. */
    admissibleOrderNoTieBreak?: boolean;
    /** Diagnostic-only passthrough for AttemptConfig.admissibleOrderLds — lets tooling tell an
     *  LDS-wrapped admissible-order-fallback winner apart from the plain unbounded search. Not read by any
     *  solving logic. */
    admissibleOrderLds?: boolean;
    /** @deprecated Historical attempt telemetry field accepted on read only.
     * Current attempts identify this tier with stageId='early-repair-search'. */
    earlyRepairSearch?: boolean;
    /** @deprecated Historical attempt telemetry field accepted on read only.
     * Current attempts identify this tier with stageId='repair-shrink-recovery'. */
    repairShrinkRecovery?: boolean;
    /** Diagnostic-only: this ordinary main-search attempt belongs to the late suffix allowed to
     *  consume the experimental reserved node slice. Never set when the experiment is disabled. */
    mainSearchLateReserve?: boolean;
}
/** The subset of Attempt's fields classifyAttemptTier actually reads — kept as its own minimal
 *  structural type (rather than requiring the full Attempt interface) so a duck-typed caller like
 *  hint-provenance.ts's AttemptLike can pass its own attempt objects straight through without
 *  needing every one of Attempt's required fields (gateKey/elapsedMs/allocatedBudgetMs/outcome).
 *  `stageId` is the canonical field classifyAttemptTier now reads first; every OTHER field here is
 *  a COMPATIBILITY-ONLY fallback for an attempt object that predates `stageId` (historical/
 *  persisted records, or a duck-typed test fixture) — see classifyAttemptTier's own doc. */
export interface AttemptTierFlags {
    stageId?: SolverStageId | string;
    repairLateProbe?: boolean;
    repairElitePrefixDfsRetry?: boolean;
    mcNeighborBudgetRetry?: boolean;
    connectivityAxisExhaustedRetry?: boolean;
    coarseStateNearTieRetentionRetry?: boolean;
    /** @deprecated Historical attempt telemetry field accepted on read only. */
    dedupNearTieRetry?: boolean;
    admissibleOrderNonDefaultRetry?: boolean;
    admissibleOrder?: boolean;
    earlyRepairSearch?: boolean;
    repair?: boolean;
    goalAttractionDisabledRetry?: boolean;
}

/** Maps a canonical `stageId` to classifyAttemptTier's own (pre-existing, string-literal) label
 *  vocabulary, for the two stages where they differ: `main-search` was always labeled 'main-ladder'
 *  here, and a repair-shrink-recovery attempt was always grouped under the broader
 *  'early-repair-search' label. Every other stageId already equals its own label. Kept as its own lookup
 *  rather than changing the label vocabulary itself, since hint-provenance.ts's `forcing.retryTier`
 *  and this file's own lifecycle telemetry both persist these exact strings. */
const STAGE_ID_TO_TIER_LABEL: Partial<Record<SolverStageId, string>> = {
    'main-search': 'main-ladder',
    'repair-shrink-recovery': 'early-repair-search',
};

/** Which ladder tier an attempt actually belongs to. Canonical policy identity first: an attempt
 *  carrying `stageId` (every attempt produced by the CURRENT solver — Attempt.stageId is a
 *  required field) is classified from that alone via STAGE_ID_TO_TIER_LABEL, one canonical read,
 *  no branching on internal policy state. The legacy boolean chain below only ever runs for an
 *  attempt WITHOUT `stageId` — compatibility only (historical/persisted records predating it, or a
 *  duck-typed fixture) — most-specific-first, because several retry tiers ALSO set `repair`/
 *  `admissibleOrder` on their attempts (they rerun repairConfigs/admissibleOrderConfigs), so their
 *  own distinguishing field must be checked before the broader bucket it would otherwise fall
 *  into. Do not add a new tier's policy decision to this fallback chain — give it a stageId
 *  instead (stage-policy.ts) and let this function read that.
 *
 *  The single shared source of truth for "which tier won" — used both for lifecycle-telemetry
 *  labeling (this file's own `finish()`) and for hint provenance
 *  (hint-provenance.ts's `deriveSolveAttemptInfo`, which stores this as `forcing.retryTier` so a
 *  persisted hint can be told apart from an ordinary main-ladder/repair-fallback/admissible-order-fallback
 *  find — see docs/solver-optimization-workstreams.md's Priority 0). */
export function classifyAttemptTier(attempt: AttemptTierFlags): string {
    if (attempt.stageId) {
        const stageId = normalizeSolverStageId(attempt.stageId);
        return STAGE_ID_TO_TIER_LABEL[stageId] ?? stageId;
    }
    // Compatibility-only fallback — see this function's own doc comment.
    return attempt.repairLateProbe ? 'late-repair-search'
        : attempt.repairElitePrefixDfsRetry ? 'repair-elite-prefix-dfs-retry'
            : attempt.mcNeighborBudgetRetry ? 'must-cross-neighbor-prune-disabled-retry'
                : attempt.connectivityAxisExhaustedRetry ? 'connectivity-axis-prune-disabled-retry'
                    : (attempt.coarseStateNearTieRetentionRetry || attempt.dedupNearTieRetry) ? 'coarse-state-near-tie-retention-disabled-retry'
                        : attempt.admissibleOrderNonDefaultRetry ? 'admissible-order-alternate-tiebreak-retry'
                            : attempt.admissibleOrder ? 'admissible-order-fallback'
                                : attempt.earlyRepairSearch ? 'early-repair-search'
                                    : attempt.repair ? 'repair-fallback'
                                        : attempt.goalAttractionDisabledRetry ? 'goal-attraction-disabled-retry'
                                            : 'main-ladder';
}
export interface AttemptResult { path: number[] | null; attempt: Attempt; }
export interface SearchResult { solution: number[] | null; attempts: Attempt[]; earlyNodeBudgetReached?: boolean; earlyWorkBudgetReached?: boolean; shrunkBiased?: ShrunkBiasedTier[]; }

/** One biased early-repair-search tier whose node budget STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET
 *  reduced, recorded so a later tier can restore what was withheld — see
 *  STRATEGY_REPAIR_SHRINK_RECOVERY. `fullNodeBudget` is the budget the tier would have had
 *  with the mechanism off; `grantedNodeBudget` is what it actually got. */
export interface ShrunkBiasedTier { config: AttemptConfig; fullNodeBudget: number; grantedNodeBudget: number; }
// Exported so the worker-client adapter (solver-worker-client.ts) can type its own `solve()`
// against the exact same option set the direct/on-thread solver accepts, rather than a hand-
// maintained subset — the drift between the two is exactly what let the worker adapter silently
// drop most SolveOpts fields for years (fixed 2026-08-20). Pure type export, zero runtime cost.
export interface SolveOpts {
    timeBudgetMs?: number | string;
    yieldFn?: (() => Promise<void>);
    ablation?: AblationConfig | null;
    forcedFirstStepKey?: number | null;
    forcedPortalExitKey?: ForcedPortalExit | null;
    /** Optional, in ADDITION to timeBudgetMs (never a substitute — every existing timeBudgetMs
     *  check and budget-share computation is completely untouched). Infinity (default) preserves
     *  prior behavior exactly for every existing caller. Offline tooling only (the level reducer,
     *  docs/solver-dev-tooling-plan.md Component G): a deterministic, machine-speed-independent
     *  cap so re-verifying a shrink candidate doesn't depend on wall-clock timing, which this
     *  session's own CPU-contention findings showed is unreliable in throttled environments. Not
     *  set by normal play/solve.
     *
     *  PRECISION CAVEAT: enforcement is fine-grained (2026-07-23) — every search primitive now
     *  self-limits against the remaining budget: the repair probe/fallback by round, and beam/DFS
     *  main-search attempts mid-search (beam at phase boundaries + every 256 frontier nodes, DFS every
     *  256 nodes). So overshoot is bounded by ~one check interval (tens to a few hundred nodes),
     *  NOT by a whole attempt's or the repair probe's internal ceiling the way it was before this
     *  was threaded through beam/DFS. The one remaining coarse case: the repair probe still bounds
     *  each seed-salt ROUND (up to EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET, 6,000,000) rather than mid-round,
     *  so a budget below a single biased round's cost can still overshoot by up to that round. */
    nodeBudget?: number;
    /** Preferred name for the solver's base canonical WORK allocation (work-meter.ts's unit:
     *  applyMove + 12*isConnected). The main attempt ladder divides this between gate x config pairs.
     *  Under historical production semantics this is NOT necessarily a whole-solve cap: additive
     *  fallback/retry stages may receive fresh work beyond it. */
    baseWorkBudget?: number;
    /** @deprecated Compatibility name for baseWorkBudget. If both are supplied they must match.
     *  Kept because existing workflows/artifacts use this public field extensively. If neither is
     *  supplied, legacy ms-shaped callers normalize once through budget-units.ts. */
    workBudget?: number;
    /** Experiment-only whole-solve enforcement: turns `workBudget` from the legacy scheduler's base
     * allocation into an immutable total work cap. Omitted/false preserves production additive tiers. */
    strictTotalWorkBudget?: boolean;
    /** Opt-in diagnostic attempt-ceiling fields. Omitted keeps ordinary result objects unchanged. */
    attemptBudgetTelemetry?: boolean;
    /** Opt-in per-technique lifecycle/progress summary for experiment artifacts. */
    lifecycleTelemetry?: boolean;
    schedulerMode?: 'production' | 'legacy-latency-portfolio-experiment' | 'legacy' | 'portfolio-experiment' | 'static-portfolio';
    /** Only read when schedulerMode === 'static-portfolio'. An ordered technique list sharing one
     *  cumulative work budget, each technique's own share additionally boundable by a flat or
     *  per-key cap — see runStaticPortfolio's own header comment and `2026-09-03-fixed-cap-
     *  portfolio-scheduler-implementation-design.md`. `techniqueConfigs` are already-parsed
     *  AttemptConfig objects, not string keys: parsing a canonical technique-identity string (e.g.
     *  `scripts/build-static-portfolio-plan.mjs`'s arm lists) into one is a caller/tooling concern
     *  (`scripts/attempt-config-key.mjs`), kept out of this browser-free core module. */
    staticPortfolio?: {
        techniqueConfigs: AttemptConfig[];
        workBudget: number;
        perTechniqueWorkCap?: number;
        /** Keyed by attemptConfigKey(config) — i.e. the same canonical string identity every other
         *  technique-key consumer in this codebase uses. A technique absent from this map falls
         *  back to perTechniqueWorkCap (or uncapped, if that is also absent). */
        perTechniqueWorkCapByKey?: Record<string, number>;
        /** Per-attempt wall-safety deadline; non-binding relative to the work-based allocation
         *  above. Defaults to STATIC_PORTFOLIO_ATTEMPT_BUDGET_MS (600,000ms) when omitted. */
        attemptBudgetMs?: number;
        /** Opt-in, default false/undefined (existing callers byte-for-byte unaffected): the
         *  resumable-tranche residual pass from reports/2026-09-05-static-portfolio-resumable-
         *  tranche-salvage-preflight.md. When true, runStaticPortfolio captures a continuation for
         *  every beamWidth-bearing first-pass attempt that ends CAPPED (its own tranche ceiling hit,
         *  `timedOut: true`) rather than naturally exhausted (`timedOut: false`), then — only if the
         *  whole first pass ends unsolved — resumes each eligible continuation, in original portfolio
         *  order, for at most one additional tranche equal to its own original per-technique cap,
         *  bounded by whatever of `workBudget` remains shared across the whole level. See that
         *  function's own header comment for the full contract. */
        resumableResidualPass?: boolean;
    };
    /** Unit-test-only per-solve dispatch override. Never persisted or exposed by Solver's facade. */
    attemptSearchForTesting?: AttemptSearchDispatch;
    /** Research-only isConnected() rejection observer (see ConnectivityRejectionObserver's doc in
     *  types.ts and docs/solver-optimization-workstreams.md item #0's learned-failure Stage A).
     *  Never persisted or exposed by Solver's facade; absent in every production caller. */
    connectivityRejectionObserver?: ConnectivityRejectionObserver;
    /** Research-only joint-obligation propagation observer (see JointObligationObserver's doc in
     *  types.ts and reports/2026-09-11-joint-obligation-propagation-observer-pilot-001.md). Never
     *  persisted or exposed by Solver's facade; absent in every production caller. */
    jointObligationObserver?: JointObligationObserver;
    legacyLatencyPortfolioExperiment?: LegacyLatencyPortfolioExperimentDefinition;
    /** @deprecated Historical option name; read for compatibility, never emitted. */
    portfolioExperiment?: LegacyLatencyPortfolioExperimentDefinition;
    /** Overrides REPAIR_ADDITIVE_BUDGET_MULTIPLIER for this solve only — offline batch tooling's cost
     *  control (see docs/solver-architecture.md's cost-gotcha note). A DEDICATED top-level option,
     *  deliberately NOT an ablation flag: every existing ablation-gated strategy toggle in this
     *  file and repair-search.ts checks `(!cfg || cfg.STRATEGY_X)` — "no ablation config at all"
     *  is the only way those default enabled, so passing ANY ablation object, even a sparse one
     *  that only sets an unrelated field, silently disables every OTHER unset strategy flag
     *  (STRATEGY_GATE_INTERLEAVING, STRATEGY_MIN_BUDGET_FLOOR, STRATEGY_ADAPTIVE_GATE_BUDGET,
     *  STRATEGY_EARLY_REPAIR_SEARCH, and repair-search.ts's stagnation-burst/elite-splice flags). This
     *  bug shipped once already (this field was originally REPAIR_BUDGET_FRACTION_OVERRIDE inside
     *  `ablation`) and silently broke every solve that used it — caught via a cross-check against
     *  scripts/solver-parallel/race.mjs, not by the original change's own testing, since that
     *  testing happened to only exercise levels that were going to stay unsolved either way. Fixed
     *  by moving it out of `ablation` entirely, same as `nodeBudget` above. Undefined (every
     *  existing/production caller) preserves REPAIR_ADDITIVE_BUDGET_MULTIPLIER exactly. */
    repairAdditiveBudgetMultiplierOverride?: number;
    /** Overrides GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape as repairAdditiveBudgetMultiplierOverride above, and for the same reason (NOT
     *  an ablation flag). Deliberately a SEPARATE override from repairAdditiveBudgetMultiplierOverride, not
     *  reusing it: they gate two independently-costed extensions (repair's iterated-local-search
     *  retry loop vs. this pass's single fixed-budget ladder rerun), and a batch-tooling caller may
     *  legitimately want one without the other — e.g. testing/calibrating THIS mechanism cheaply
     *  requires disabling repair's 6x extension (repairAdditiveBudgetMultiplierOverride: 0) while still
     *  letting this pass run at its normal size, which an earlier version of this field (gating
     *  the pass on repairAdditiveBudgetMultiplier > 0 instead of its own override) made impossible: a solver-
     *  testing sweep trying to isolate this pass's own contribution ended up re-triggering the full
     *  6x repair extension too, reintroducing exactly the multi-minute-per-level cost this
     *  session's repair-budget-fraction policy (docs/solver-architecture.md) was written to avoid
     *  in solver-testing workflows. Undefined (production default, and solver-controller.ts /
     *  review-controller.ts's interactive call sites) preserves GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_
     *  FRACTION exactly. */
    goalAttractionDisabledRetryBudgetFractionOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    attractionDiversityBudgetFractionOverride?: number;
    /** Overrides COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape and rationale as goalAttractionDisabledRetryBudgetFractionOverride above (NOT
     *  an ablation flag; a batch-tooling caller may want to isolate this pass's own cost). Undefined
     *  (production default, and solver-controller.ts/review-controller.ts's interactive call sites)
     *  preserves COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION exactly. */
    coarseStateNearTieRetentionRetryBudgetFractionOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    dedupNearTieRetryBudgetFractionOverride?: number;
    /** Overrides COARSE_STATE_NEAR_TIE_RETENTION_RETRY_NODE_RESERVE_FRACTION for this solve only — same dedicated
     *  top-level-option shape as admissibleOrderNodeReserveFractionOverride above, but NOT the same
     *  mechanism as of REVISION 2 (see the constant's own comment): this fraction is ADDITIVE headroom
     *  for the retry tier's own ceiling, not withheld from any earlier tier. 0 restores the tier's
     *  ceiling to plain `nodeBudget` (no extra headroom at all). Undefined (production default)
     *  preserves the constant exactly. */
    coarseStateNearTieRetentionRetryNodeReserveFractionOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    dedupNearTieRetryNodeReserveFractionOverride?: number;
    /** Overrides ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION for this solve only — same
     *  dedicated top-level-option shape as coarseStateNearTieRetentionRetryBudgetFractionOverride above (NOT an
     *  ablation flag). Undefined (production default, and solver-controller.ts/review-controller.ts's
     *  interactive call sites) preserves ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION exactly. */
    admissibleOrderNonDefaultRetryBudgetFractionOverride?: number;
    /** Overrides ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION for this solve only —
     *  same ADDITIVE-headroom shape as coarseStateNearTieRetentionRetryNodeReserveFractionOverride above (see that
     *  field's own comment): this fraction extends the retry tier's own ceiling past `nodeBudget`,
     *  never withheld from any earlier tier. 0 restores the tier's ceiling to plain `nodeBudget`.
     *  Undefined (production default) preserves the constant exactly. */
    admissibleOrderNonDefaultRetryNodeReserveFractionOverride?: number;
    /** Overrides CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION for this solve only — same
     *  dedicated top-level-option shape as coarseStateNearTieRetentionRetryBudgetFractionOverride above (NOT an
     *  ablation flag). Undefined (production default, and solver-controller.ts/review-controller.ts's
     *  interactive call sites) preserves CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION exactly. */
    connectivityAxisExhaustedRetryBudgetFractionOverride?: number;
    /** Overrides CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION for this solve only — same
     *  ADDITIVE-headroom shape as coarseStateNearTieRetentionRetryNodeReserveFractionOverride above (see that
     *  field's own comment): this fraction extends the retry tier's own ceiling past `nodeBudget`,
     *  never withheld from any earlier tier. 0 restores the tier's ceiling to plain `nodeBudget`.
     *  Undefined (production default) preserves the constant exactly. */
    connectivityAxisExhaustedRetryNodeReserveFractionOverride?: number;
    /** Overrides REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape as coarseStateNearTieRetentionRetryBudgetFractionOverride above (NOT an ablation
     *  flag). Undefined (production default) preserves the constant exactly. Unlike its three
     *  promoted siblings, this tier is still opt-in (STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY must
     *  also be explicitly set true in `ablation`) — this override only controls the BUDGET once the
     *  flag has already enabled the tier, same relationship as every prior tier's own pre-promotion
     *  lifecycle stage. */
    repairElitePrefixDfsRetryBudgetFractionOverride?: number;
    /** Overrides REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION for this solve only — same
     *  ADDITIVE-headroom shape as coarseStateNearTieRetentionRetryNodeReserveFractionOverride above (see that
     *  field's own comment): this fraction extends the retry tier's own ceiling past the preceding
     *  tier's own ceiling, never withheld from any earlier tier. 0 restores the tier's ceiling to
     *  the preceding tier's own ceiling exactly. Undefined (production default) preserves the
     *  constant exactly. */
    repairElitePrefixDfsRetryNodeReserveFractionOverride?: number;
    /** Overrides MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape as coarseStateNearTieRetentionRetryBudgetFractionOverride above (NOT an ablation
     *  flag). Undefined (production default) preserves the constant exactly. STRATEGY_MC_NEIGHBOR_
     *  BUDGET_RETRY is PROMOTED to default-ON (2026-08-19, GHA run 32224200709: corpus1 95/102
     *  identical solved set, corpus2 819→828, +9, zero regressions) — this override only controls the
     *  BUDGET; the tier now runs by default like its three promoted siblings above. */
    mcNeighborBudgetRetryBudgetFractionOverride?: number;
    /** Overrides MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION for this solve only — same ADDITIVE-
     *  headroom shape as coarseStateNearTieRetentionRetryNodeReserveFractionOverride above (see that field's own
     *  comment): this fraction extends the retry tier's own ceiling past the preceding tier's own
     *  ceiling, never withheld from any earlier tier. 0 restores the tier's ceiling to the preceding
     *  tier's own ceiling exactly. Undefined (production default) preserves the constant exactly. */
    mcNeighborBudgetRetryNodeReserveFractionOverride?: number;
    /** Overrides REPAIR_LATE_PROBE_NODE_BUDGET for this solve only — a flat node count, not a
     *  fraction (see that constant's own comment for why this tier's budget shape deliberately
     *  differs from every whole-ladder-rerun tier above it). Undefined (production default)
     *  preserves the constant exactly; 0 disables the tier's own node room (the tier's run
     *  condition also requires this to be > 0). STRATEGY_REPAIR_LATE_PROBE is default-on, so this
     *  override takes effect unless that flag is explicitly disabled. */
    repairLateProbeNodeBudgetOverride?: number;
    /** Overrides the number of REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS entries the
     *  late-repair-multiseed-retry tier consumes for this solve only — an experiment-only seam for
     *  the 7-vs-6 seed-count confirmation (reports/2026-09-05-repair-late-probe-six-seed-
     *  confirmation-preflight.md), NOT a permanent ablation flag. Must be an integer in
     *  [0, REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length]; an out-of-range or non-integer
     *  value is treated exactly like omitted. Undefined (production default) preserves the full
     *  constant exactly. computeStageBudgetPlan (stage-budget.ts) resolves this into the actual
     *  salt slice ONCE (repairLateProbeMultiSeedRetrySeedSalts) and both the additive node reserve
     *  and the orchestration loop below read that same resolved array, so budget and execution
     *  cannot drift apart — 6 always means exactly salts 1-6 with six per-seed reserves.
     *  STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY is default-on, so this override takes effect
     *  unless that flag (or the tier's own prerequisite repairLateProbeTierWillRun) is off. */
    repairLateProbeMultiSeedRetrySeedCountOverride?: number;
    /** Overrides ADMISSIBLE_ORDER_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape and rationale as the two overrides above (NOT an ablation flag, a
     *  THIRD independently-costed extension a batch-tooling caller may want to isolate). Undefined
     *  (production default, and solver-controller.ts/review-controller.ts's interactive call sites)
     *  preserves ADMISSIBLE_ORDER_BUDGET_FRACTION exactly. */
    admissibleOrderBudgetFractionOverride?: number;
    /** Overrides ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION for this solve only — the A/B knob for the
     *  node reserve, and deliberately NOT covered by `disableExtraBudgetPasses`: that flag already
     *  suppresses the tier outright, which zeroes the reserve through the tier's own run condition,
     *  so wiring it here too would be redundant. 0 restores the exact pre-reserve behaviour (every
     *  tier shares one undivided cumulative ceiling), which is what a before/after sweep sets on its
     *  baseline arm. Undefined (production default) preserves the constant exactly. */
    admissibleOrderNodeReserveFractionOverride?: number;
    /** Override for ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION for this solve only — same
     *  shape/rationale as admissibleOrderNodeReserveFractionOverride above, and likewise NOT covered
     *  by `disableExtraBudgetPasses` (STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE being off
     *  already zeroes this reserve through its own run condition). 0 restores the pre-reserve
     *  behavior (the tier's non-'default' profiles share 'default's own undivided ceiling).
     *  Undefined (production default) preserves the constant exactly. */
    admissibleOrderProfileNodeReserveFractionOverride?: number;
    /** Override for REPAIR_FALLBACK_NODE_RESERVE_FRACTION for this solve only — same A/B-knob
     *  shape and rationale as admissibleOrderNodeReserveFractionOverride above, and deliberately
     *  NOT covered by `disableExtraBudgetPasses` for the same reason: STRATEGY_REPAIR_FALLBACK_
     *  NODE_RESERVE being off already zeroes this reserve through its own run condition. 0 restores
     *  the pre-reserve behavior (the repair fallback loop shares one undivided ceiling with the
     *  whole main loop). Undefined (production default) preserves the constant exactly.
     *  Opt-in, default OFF (unlike the admissible-order-fallback reserve) — see the constant's own comment. */
    repairFallbackNodeReserveFractionOverride?: number;
    /** STRATEGY_REPAIR_SHRINK_RECOVERY's reserve fraction; defaults to
     *  REPAIR_SHRINK_RECOVERY_NODE_RESERVE_FRACTION. Same override rationale as its siblings. */
    repairShrinkRecoveryNodeReserveFractionOverride?: number;
    /** Override for GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE_FRACTION for this solve only — same shape,
     *  rationale, and opt-in-default-OFF status as repairFallbackNodeReserveFractionOverride above
     *  (STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE being off already zeroes this reserve through its
     *  own run condition, so it is likewise not covered by `disableExtraBudgetPasses`). 0 restores
     *  the pre-reserve behavior (the diversity pass shares its ceiling with the repair fallback loop
     *  undivided). Undefined (production default) preserves the constant exactly. */
    goalAttractionDisabledRetryNodeReserveFractionOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    attractionDiversityNodeReserveFractionOverride?: number;
    /** Override for the ordinary main-search late-suffix reserve fraction (production default-ON,
     *  see MAIN_SEARCH_LATE_RESERVE_FRACTION). Only takes effect when a finite `nodeBudget` is set
     *  (offline batch tooling) — never affects interactive Play/Editor/Review solves. The fraction
     *  is withheld from the repair probe and the main loop's early config prefix, then becomes
     *  available to the final N ordinary configs without reordering them. */
    mainSearchLateReserveFractionOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    mainLoopLateReserveFractionOverride?: number;
    /** Number of final ordinary configs eligible for the experimental reserve. See the fraction
     *  override above. Values are clamped to the main config count; 0 disables the reserve. */
    mainSearchLateReserveConfigCountOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    mainLoopLateReserveConfigCountOverride?: number;
    /** Override for EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE for this solve only — same
     *  dedicated-override shape as the reserve-fraction overrides above (NOT an ablation flag: the
     *  gate is read unconditionally inside the STRATEGY_EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BUDGET branch,
     *  so there is no existing opt-in/opt-out plumbing to piggyback on, and a fresh ablation flag
     *  would conflate "use the adaptive mechanism at all" with "which gate value" — two different
     *  questions). Exists so a matched batch-tooling sweep (recalibrating the gate from tagged
     *  earlyRepairSearch telemetry per docs/future-work.md item 4b) can compare candidate gate values
     *  against the production default without editing the constant and rebuilding. Undefined
     *  (every production/interactive caller) preserves EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE
     *  exactly. */
    earlyRepairSearchAdaptiveBiasedBadnessGateOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    repairProbeAdaptiveBiasedBadnessGateOverride?: number;
    /** Override for EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE for this solve only — same shape and
     *  rationale as earlyRepairSearchAdaptiveBiasedBadnessGateOverride above; kept as a separate field
     *  (not folded into one object) to match every other override in this file being a single
     *  scalar. Undefined (every production/interactive caller) preserves
     *  EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE exactly. */
    earlyRepairSearchAdaptiveBiasedMinScaleOverride?: number;
    /** @deprecated Historical option name accepted on read only. */
    repairProbeAdaptiveBiasedMinScaleOverride?: number;
    /** Convenience for offline batch tooling: sets repairAdditiveBudgetMultiplierOverride,
     *  goalAttractionDisabledRetryBudgetFractionOverride, coarseStateNearTieRetentionRetryBudgetFractionOverride,
     *  admissibleOrderBudgetFractionOverride, admissibleOrderNonDefaultRetryBudgetFractionOverride,
     *  connectivityAxisExhaustedRetryBudgetFractionOverride,
     *  repairElitePrefixDfsRetryBudgetFractionOverride,
     *  mcNeighborBudgetRetryBudgetFractionOverride, AND repairLateProbeNodeBudgetOverride all to 0
     *  (purely additive — an explicit value on any individual override still wins over this, so a
     *  caller can still isolate one extension's cost while suppressing the others via this flag).
     *  Exists because the individual overrides were deliberately kept separate (see
     *  goalAttractionDisabledRetryBudgetFractionOverride's own comment for why — a solver-testing sweep
     *  legitimately wants to disable just one of them sometimes), which means "no extra-budget-pass
     *  cost, period" requires remembering every one of them — documented in CLAUDE.md's
     *  solver-architecture gotchas as something "a future new batch tool needs to wire up... from
     *  the start, not just the historically-older repair one" (a warning this field's own addition
     *  for the admissible-order-fallback tier is a direct instance of — see that tier's own comment; the
     *  coarse-state-near-tie-retention-disabled-retry, admissible-order-alternate-tiebreak-retry, and connectivity-axis-prune-disabled-retry
     *  tiers are wired in here for exactly the same reason). This
     *  flag makes the common "suppress every extra-budget pass" case a single boolean instead of an
     *  N-field combo a caller has to remember and update every time a new pass is added, without
     *  removing the fine-grained escape hatch. Undefined (every existing caller) is a no-op — every
     *  underlying override resolves exactly as before this flag existed. */
    disableExtraBudgetPasses?: boolean;
    /** Winner-first pre-attempt (offline re-verify tooling only). Names one (configKey, gateKey)
     *  pair — from a compiled baseline's recorded winner — to try as a SINGLE attempt before the
     *  normal probe/ladder. `configKey` is matched against this level's own configured attempt list
     *  via attemptConfigKey (so the full config object, including its orderingBias/mechanicBucketRetention, is
     *  recovered from the current code, not reconstructed from the lossy baseline record); a miss
     *  (key no longer present, gate not active, or the attempt doesn't solve) falls straight through
     *  to the full flow below, having spent at most this one bounded attempt. Its `nodeBudget`
     *  bounds the miss cost (the winner, if the relevant code is unchanged, hits well under it);
     *  omitted, the prime shares the solve's own nodeBudget. VERDICT NOTE: this preserves the
     *  SOLVABILITY verdict, not cold-search ORDERING — a level whose recorded winner still solves
     *  but whose cold ladder no longer reaches it first is reported solved here where a cold run
     *  would not, so this is opt-in and only for "does the known solution still hold" runs, NEVER
     *  cold solver-capability benchmarking. Undefined (every production/normal caller) is a no-op.
     *  `seedSalt`: only meaningful when the matched config is a repair attempt (ignored otherwise —
     *  runAttemptSearch's seedSalt param has no effect on beam/DFS). repairSearchFromGate seeds its
     *  PRNG from repairPrimarySeed(gateKey, seedSalt), so a repair winner's solve is salt-dependent;
     *  the baseline's recorded winning attempt carries the exact salt it used (Attempt.seedSalt,
     *  absent/0 by convention — see its own field comment), so passing that through here replays the
     *  ACTUAL winning search, not just salt 0. Omitted (undefined), the prime uses salt 0 — the
     *  right default for a first-run baseline that predates this field, but a false-miss risk for a
     *  repair winner whose real salt was nonzero. */
    primeAttempt?: { gateKey: number; configKey: string; nodeBudget?: number; seedSalt?: number };
}
export interface SolveResult { ok: boolean; status: string; solution: number[] | null; solutions: number[][]; attempts: Attempt[]; totalMs: number; nodesExpanded: number; nodeBudgetReached?: boolean;
    /** Work units this solve spent (work-meter.ts). Machine-independent, unlike totalMs, and
     *  comparable across techniques, unlike nodesExpanded. */
    workSpent?: number;
    /** The solve's configured base work allocation. It is a true whole-solve ceiling only when
     * strictTotalWorkBudget was enabled; legacy additive stages may otherwise spend beyond it. */
    workBudget?: number;
    /** The wall-clock deadline cut this run short while work budget remained — so the result is
     *  INDETERMINATE, not a reproducible negative. Never record such a run as "unsolved". */
    deadlineTruncated?: boolean; solvedByPrime?: boolean;
    stageLifecycle?: Record<string, unknown>;
    /** Opt-in (opts.lifecycleTelemetry), diagnostic-only: the canonical per-stage BudgetEnvelope
     *  this solve's stage-budget cascade computed (stage-budget.ts's buildStageBudgetEnvelopes) —
     *  lets external tooling inspect the exact wall/node ceiling and headroom every stage was
     *  allotted without re-deriving it. Not read by any solving logic. */
    stageBudgetEnvelopes?: Partial<Record<SolverStageId, import('./stage-policy.js').BudgetEnvelope>>;
    schedulerMode?: 'production' | 'legacy-latency-portfolio-experiment' | 'static-portfolio'; legacyLatencyPortfolioExperiment?: { solvedBeforeFallback: boolean; fallbackAttemptCount: number; repeatedAttemptElapsedMs: number; repeatedPrefixNodeUpperBound: number; runtimeBreakdown?: { prepMs: number; portfolioAttemptSearchMs: number; schedulerOverheadMs: number; fallbackSearchMs: number; totalMs: number; }; };
    /** schedulerMode === 'static-portfolio' only: the winning technique's canonical configKey, or
     *  absent on an unsolved result. Every attempt already carries its own configKey; this is a
     *  convenience mirror of technique-census-cell.mjs's own winningConfigKey field so tooling
     *  built against that shape needs minimal adaptation. */
    staticPortfolioWinningConfigKey?: string;
    /** schedulerMode === 'static-portfolio' with staticPortfolio.resumableResidualPass only — see
     *  that option's own doc comment. `firstPassCaptureOvershoot` is real extra work the bounded-
     *  overshoot capture mechanism spent during the (otherwise frozen) first pass; report it
     *  alongside workSpent rather than describing the first pass as identical to a non-resumable
     *  control run — see docs/solver-evaluation-evidence.md's "if treatment buys additive work,
     *  report the larger envelope" rule. */
    resumableResidualPass?: {
        eligibleContinuationCount: number;
        residualDispatchCount: number;
        residualIncrementalWork: number;
        firstPassCaptureOvershoot: number;
    };
}

export function hasAttemptError(attempts: readonly Attempt[]): boolean {
    return attempts.some(attempt => attempt.outcome === 'error');
}

export function getFalseGoalTriggerSearchBudgetMs(level: NormalizedLevel): number {
    const area = (level.grid?.w || 0) * (level.grid?.h || 0);
    const special = (level.mustPassKeys?.length || 0) + (level.mustCrossKeys?.length || 0) +
        (level.portalMap?.size || 0) + (level.filterMap?.size || 0) +
        (level.flippingFilterMap?.size || 0);
    // The search runs a full DFS per gate and splits the budget across them, so the
    // search-dependent cost scales with gate count — otherwise an N-gate level gets
    // the same budget as a 1-gate level of equal size and times out mid-sweep,
    // silently dropping every gate after the first.
    // Coefficients are sized for the off-thread (Web Worker) search: the sweep no
    // longer blocks interaction, so the budget errs toward complete enumeration —
    // the old main-thread values timed out on typical mid-size levels.
    const gates = Math.max(1, level.gateKeys?.length || 1);
    const perGateCost = area * 45 + (level.requiredLength || 0) * 120 + special * 360;
    return Math.min(120000, Math.max(10000, 5000 + perGateCost * gates));
}

// `prep` is optional so callers without a prepared level (e.g. scripts/solver-parallel/race.mjs's
// job-count bookkeeping, which never calls prepLevel) keep their current unfiltered-on-portals
// behavior; passing it lets a portal level with zero TWIST pairs use the same ordinary parity
// filter as a portal-free level (reports/2026-09-09-portal-restoration-evidence-hardening-001.md
// section 4 — every portal jump then contributes zero parity flips, so the ordinary
// gate-feasibility invariant is unweakened).
export function getActiveGates(level: NormalizedLevel, gateKeys: number[], cfg: AblationConfig | null, prep?: PrepLevel | null): number[] {
    const noTwistPortals = level.portalMap.size === 0 || (prep != null && (prep.parityPortalDistMaps?.length ?? 0) === 0);
    if (!noTwistPortals || (cfg && !cfg.STRATEGY_PARITY_GATE_FILTER)) return gateKeys;

    const goalP = keyParity(level.goalKey);
    const feasible = gateKeys.filter(gk => (keyParity(gk) ^ goalP ^ (level.requiredLength & 1)) === 0);
    return feasible.length > 0 ? feasible : gateKeys;
}

/** Smallest attempt worth starting, per currency. The 50ms figure is historical; the node figure is
 *  its analogue and is a calibration knob for the Phase 2 experiment, not a tuned constant — at the
 *  measured 0.1M-2.1M nodes/sec spread (docs/solver-budget-determinism.md) 2,000 nodes is roughly
 *  1-20ms of work, i.e. deliberately at or below the ms floor so the node allocator does not abandon
 *  a ladder the ms allocator would have kept going. */
export const MIN_ATTEMPT_WORK = 2000;

// The key-formatting logic itself lives in attempt-identity.mjs — the canonical, single
// implementation shared with scripts/portfolio-solve-sweep-lib.mjs's own attemptConfigKey (which
// starts from a persisted Attempt record, not a live AttemptConfig, so it normalizes to
// AttemptIdentityFields on its own side rather than importing this thin adapter).
export function attemptConfigKey(config: AttemptConfig): string {
    return formatAttemptIdentityKey({
        scoringProfileId: config.scoringProfileId, orderingBiasId: config.orderingBias?.id ?? null,
        beamWidth: config.beamWidth, mechanicBucketRetention: config.mechanicBucketRetention, repair: config.repair,
        repairMustTurnBiased: config.repairMustTurnBiased, repairTurnBiased: config.repairTurnBiased,
        admissibleOrder: config.admissibleOrder, admissibleOrderNoTieBreak: config.admissibleOrderNoTieBreak,
        admissibleOrderLds: config.admissibleOrderLds,
    });
}


/**
 * Normalizes an externally-supplied ablation config into the one shape every downstream read
 * site can safely assume: either `null` (no ablation — the production/default fast path,
 * preserved byte-for-byte via `!cfg` checks throughout this file/repair-search.ts/scoring.ts/
 * hard-prune-pipeline.ts) or a fully-defaulted object where every flag not explicitly set by the
 * caller reads at its production default (most enabled, registered opt-ins disabled).
 *
 * Every one of those `(!cfg || cfg.SOME_FLAG)` read sites treats "no ablation config at all" as
 * the ONLY way an unset flag defaults to `true` — so a caller-supplied PARTIAL object (e.g.
 * `{ STRATEGY_EARLY_REPAIR_SEARCH: true }`) makes every OTHER unset flag read as `undefined` (falsy),
 * silently disabling it. This is exactly the bug SolveOpts's repairAdditiveBudgetMultiplierOverride field
 * comment documents shipping to production once already, and the reason this file's own
 * goal-attraction-disabled-retry pass below builds its overlay config through a hand-rolled Proxy instead
 * of a plain `{ ...cfg }` spread. Both of `solveLevel`/`runPortfolioExperiment` funnel every
 * externally-supplied `opts.ablation` through here before it ever reaches `prep._cfg` — the only
 * place any read site ever gets a cfg from — so a sparse override is safe from ANY entry point
 * (production call, orchestration.test.ts, scripts/run-repair-search.mjs, future tooling)
 * without every call site needing to remember to build it via ablation-config.ts's
 * `defaultConfig()`/`withFeatureDisabled()` helpers first.
 *
 * A Proxy, not a plain merged object: the flag set isn't enumerated here (scripts/ablation-
 * config.mjs's FEATURES list is the canonical registry, but it's Node-tooling-only and duplicating
 * it into this browser-bundled runtime module would just be a second list to keep in sync on
 * every new flag — the exact class of drift CLAUDE.md's LEVEL_KEY_FIELDS/fingerprint-version
 * gotchas warn about). Falls through to the real object for `ATTEMPT_ORDER`/`_randomSeed`
 * (non-boolean, attempts.ts-only fields whose absence must stay `undefined`, not `true`) and
 * implements `has`/`getOwnPropertyDescriptor`/`ownKeys` so `'FLAG' in cfg`,
 * `Object.prototype.hasOwnProperty.call(cfg, 'FLAG')`, and `{ ...cfg }` all still faithfully
 * reflect the caller's original object (attempts.ts's `PROFILE_*`/`TEMPLATE_*` checks, and this
 * file's own diversity-pass Proxy, both rely on exactly this).
 *
 * Exported (also re-exported from `testing-api.ts`) so external diagnostic tooling that needs to
 * hand-build a `prep._cfg` override — e.g. `scripts/stress/hint-divergence.mjs`'s per-flag
 * ablation sweep — gets this same provably-correct sparse-override behavior directly, rather than
 * reimplementing it by hand-listing every flag from `modules/solver/ablation-config.ts`'s `FEATURES`
 * (an earlier version of that tool did exactly this, complete only for the `SCORE_*` subset it
 * happened to need — harmless there since nothing in its own call path reads `PRUNE_*`/`STRATEGY_*`
 * flags, but a real instance of the exact footgun this comment describes, latent rather than
 * active only by accident of which functions it called). Prefer this over listing flags by hand
 * in any new tooling.
 */
const ABLATION_NON_FLAG_KEYS = new Set(['ATTEMPT_ORDER', '_randomSeed']);

// Flags whose real production default is OFF (opt-in-only, gated at their read site via
// `cfg && cfg.FLAG === true` rather than the standard `!cfg || cfg.FLAG` convention). The
// shared OPT_IN_FEATURES registry is also used by the experiment constructors. An opt-in flag's
// default can't be derived from "no entry in ABLATION_NON_FLAG_KEYS" the way a standard flag's
// can. Missing a flag from that registry is a REAL bug, not a missed optimization: an unset
// opt-in flag would fall through to this Proxy's generic `true` default
// below, silently turning it on for every caller that supplies ANY other non-null ablation
// override -- confirmed as the actual (not hypothetical) root cause of a 2026-08-07/08 turn-bias
// corpus-2 A/B reading net -7/-8 when disabling STRATEGY_REPAIR_NOGOOD_CACHE (a red herring) --
// the real culprit was `enable_flags=STRATEGY_REPAIR_TURN_BIAS` silently also enabling
// STRATEGY_REPAIR_ELITE_PREFIX_DFS (independently validated net-negative) via exactly this gap.
// See reports/2026-08-08-turnbias-elite-prefix-dfs-ablation-confound.md.
export function normalizeAblationConfig(raw: AblationConfig | null | undefined): AblationConfig | null {
    if (raw == null) return null;

    // Canonicalize historical feature aliases once at the boundary. This is the solver-wide
    // dual-read/single-write seam: old persisted configs remain readable, while enumeration/spread
    // of the normalized config exposes only canonical names. Conflicting old+new spellings fail
    // loudly rather than making precedence depend on object key order.
    const canonicalRaw: AblationConfig = {};
    for (const [rawKey, value] of Object.entries(raw)) {
        if (value === undefined) continue;
        const key = canonicalAblationFeatureName(rawKey);
        if (Object.prototype.hasOwnProperty.call(canonicalRaw, key) && canonicalRaw[key] !== value)
            throw new Error(`Conflicting ablation values for canonical feature ${key}`);
        canonicalRaw[key] = value;
    }

    const hasOwn = (prop: string) => Object.prototype.hasOwnProperty.call(canonicalRaw, prop);
    return new Proxy({} as AblationConfig, {
        get(_target, prop) {
            if (typeof prop !== 'string') return undefined;
            if (hasOwn(prop)) return canonicalRaw[prop];
            if (ABLATION_NON_FLAG_KEYS.has(prop)) return undefined;
            return !OPT_IN_FEATURES.has(prop);
        },
        has(_target, prop) {
            return typeof prop === 'string' && hasOwn(prop);
        },
        getOwnPropertyDescriptor(_target, prop) {
            if (typeof prop !== 'string' || !hasOwn(prop)) return undefined;
            return { value: canonicalRaw[prop], writable: true, enumerable: true, configurable: true };
        },
        ownKeys() {
            return Reflect.ownKeys(canonicalRaw);
        },
    });
}
