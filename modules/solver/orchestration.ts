import { PORTFOLIO_EXPERIMENT } from './portfolio-experiment.js';
import { legacyMsToWork } from './budget-units.js';
import { withWorkCapScope } from './budget-context.js';
import { OPT_IN_FEATURES } from './ablation-config.js';
import { getConfiguredAttemptConfigs, ATTRACTION_DIVERSITY_CANDIDATE_FLAGS, repairAttempt } from './attempts.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import { repairPrimarySeed } from './repair-search.js';
import { withSolverStage } from './stage-policy.js';
import type { SolverStageId } from './stage-policy.js';
import { buildSolverStagePlan } from './stage-plan.js';
import { formatAttemptIdentityKey } from './attempt-identity.mjs';
import { buildRetryTierAblationOverride, runWholeLadderRetryTier } from './stage-executors.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig, ForcedPortalExit, ConnectivityRejectionObserver } from './types.js';

type YieldFn = (() => Promise<void>) | null;
type AttemptSearchDispatch = typeof runAttemptSearch;
// Fault injection is associated with one prepared solve, never global process state. This keeps
// concurrent solves isolated while allowing orchestration tests to deterministically fail dispatch.
const testAttemptDispatches = new WeakMap<PrepLevel, AttemptSearchDispatch>();
function isSolverCancellation(value: unknown): boolean {
    try { return (value as { message?: unknown } | null)?.message === 'Solver:cancelled'; }
    catch { return false; }
}

// buildRetryTierAblationOverride and runWholeLadderRetryTier now live in stage-executors.ts — the
// canonical execution adapter for the four "rerun mainConfigs under one forced flag" retry tiers
// (attraction-diversity, dedup-near-tie-retry, connectivity-axis-exhausted-retry, mc-neighbor-
// budget-retry). repair-elite-prefix-dfs-retry still builds its own override directly (a genuinely
// different execution shape — see stage-executors.ts's own header comment for why it wasn't
// folded into the same adapter), importing the shared builder rather than keeping a sixth copy.
interface PortfolioExperimentDefinition {
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
    gateKey: number; profile: string; template: string | null; beamWidth: number | null;
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
    error?: { name: string; message: string; gateKey: number; configKey: string; profile: string; template: string | null };
    passNumber?: number; configKey?: string; restart?: boolean; schedulerPhase?: 'portfolio' | 'fallback';
    /** Diagnostic-only passthrough of the originating AttemptConfig's dispatch flags — not read
     *  by any solving logic, purely so external tooling (stress benchmark, audits) can tell a
     *  diverse beam / repair attempt apart from a plain one without re-deriving it from profile
     *  name and beamWidth. */
    diverseBeam?: boolean;
    repair?: boolean;
    repairMustTurnBiased?: boolean;
    /** Diagnostic-only passthrough for the experimental turn-aware bias attempt (see
     *  AttemptConfig.repairTurnBiased) — lets tooling tell it apart from an ordinary repair attempt.
     *  Not read by any solving logic. */
    repairTurnBiased?: boolean;
    /** Repair attempts only, diagnostic-only (see runRepairProbe's multi-seed retry) — absent
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
    /** True only for attempts run by the 2026-07-16 attraction-diversity last-resort pass (see
     *  ATTRACTION_DIVERSITY_BUDGET_FRACTION below) — diagnostic-only passthrough, same pattern as
     *  `repair`/`repairMustTurnBiased` above, so external tooling and tests can tell these attempts
     *  apart from an ordinary main-loop attempt using the exact same config without re-deriving it
     *  from attempt order/count. Not read by any solving logic. */
    attractionDiversity?: boolean;
    /** True only for attempts run by the 2026-08-15 STRATEGY_DEDUP_NEAR_TIE_RETRY last-resort pass
     *  (see DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION) — same diagnostic-only shape as
     *  attractionDiversity above. Not read by any solving logic. */
    dedupNearTieRetry?: boolean;
    /** True only for attempts run by the 2026-08-15 STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY
     *  last-resort pass (see ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION) — same
     *  diagnostic-only shape as attractionDiversity/dedupNearTieRetry above. Not read by any
     *  solving logic. */
    admissibleOrderNonDefaultRetry?: boolean;
    /** True only for attempts run by the 2026-08-16 STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY
     *  last-resort pass (see CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION) — same
     *  diagnostic-only shape as attractionDiversity/dedupNearTieRetry/admissibleOrderNonDefaultRetry
     *  above. Not read by any solving logic. */
    connectivityAxisExhaustedRetry?: boolean;
    /** True only for attempts run by the 2026-08-16 STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY
     *  last-resort pass (see REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION) — same diagnostic-only
     *  shape as attractionDiversity/dedupNearTieRetry/admissibleOrderNonDefaultRetry/
     *  connectivityAxisExhaustedRetry above. Not read by any solving logic. */
    repairElitePrefixDfsRetry?: boolean;
    /** True only for attempts run by the 2026-08-19 STRATEGY_MC_NEIGHBOR_BUDGET_RETRY last-resort
     *  pass (see MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION) — same diagnostic-only shape as
     *  attractionDiversity/dedupNearTieRetry/admissibleOrderNonDefaultRetry/
     *  connectivityAxisExhaustedRetry/repairElitePrefixDfsRetry above. Not read by any solving
     *  logic. */
    mcNeighborBudgetRetry?: boolean;
    /** True only for attempts run by the 2026-08-20 STRATEGY_REPAIR_LATE_PROBE last-resort pass
     *  (see REPAIR_LATE_PROBE_NODE_BUDGET) — same diagnostic-only shape as
     *  attractionDiversity/dedupNearTieRetry/admissibleOrderNonDefaultRetry/
     *  connectivityAxisExhaustedRetry/repairElitePrefixDfsRetry/mcNeighborBudgetRetry above. Not
     *  read by any solving logic. */
    repairLateProbe?: boolean;
    /** Diagnostic-only passthrough for the admissible-order-search.ts prototype (see
     *  AttemptConfig.admissibleOrder) — not read by any solving logic, purely so external tooling
     *  (scripts/method-probe.mjs) can tell it apart from an ordinary DFS attempt. */
    admissibleOrder?: boolean;
    /** Diagnostic-only passthrough for AttemptConfig.admissibleOrderNoTieBreak — lets tooling tell
     *  a no-tie-break admissible-order winner apart from a profile-tie-broken one. Not read by any
     *  solving logic. */
    admissibleOrderNoTieBreak?: boolean;
    /** Diagnostic-only passthrough for AttemptConfig.admissibleOrderLds — lets tooling tell an
     *  LDS-wrapped admissible-order winner apart from the plain unbounded search. Not read by any
     *  solving logic. */
    admissibleOrderLds?: boolean;
    /** True only for attempts run inside runRepairProbe (the early, node-budget-capped probe tier),
     *  as opposed to the same repair config run later by the full-budget repair fallback loop —
     *  both produce `repair`-flagged attempts with the same shape, so without this tag external
     *  tooling cannot tell which phase a given repair attempt's `bestBadness` reading came from.
     *  Added so REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE/_MIN_SCALE (see that constant's own
     *  comment) can be recalibrated from ordinary batch-tool output alone — filtering persisted
     *  attempts by `repairProbe && repair && !repairMustTurnBiased && !repairTurnBiased`
     *  reconstructs exactly the `ordinaryBestBadness` signal runRepairProbe computes internally, and
     *  the biased probe attempt's own `ok`/`bestBadness` shows what the scaled budget actually
     *  achieved. Not read by any solving logic. */
    repairProbe?: boolean;
    /** True only for attempts run by the STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY tier — a re-run of a
     *  biased probe config at the full budget the adaptive shrink withheld from it. Also carries
     *  `repairProbe: true` (it IS a probe config), so probe-population tooling keeps counting it;
     *  this flag is what separates a recovered attempt from the original shrunken one. */
    repairProbeShrinkRecovery?: boolean;
    /** Diagnostic-only: this ordinary main-loop attempt belongs to the late suffix allowed to
     *  consume the experimental reserved node slice. Never set when the experiment is disabled. */
    mainLoopLateReserve?: boolean;
}
/** The subset of Attempt's fields classifyAttemptTier actually reads — kept as its own minimal
 *  structural type (rather than requiring the full Attempt interface) so a duck-typed caller like
 *  hint-provenance.ts's AttemptLike can pass its own attempt objects straight through without
 *  needing every one of Attempt's required fields (gateKey/elapsedMs/allocatedBudgetMs/outcome).
 *  `stageId` is the canonical field classifyAttemptTier now reads first; every OTHER field here is
 *  a COMPATIBILITY-ONLY fallback for an attempt object that predates `stageId` (historical/
 *  persisted records, or a duck-typed test fixture) — see classifyAttemptTier's own doc. */
export interface AttemptTierFlags {
    stageId?: SolverStageId;
    repairLateProbe?: boolean;
    repairElitePrefixDfsRetry?: boolean;
    mcNeighborBudgetRetry?: boolean;
    connectivityAxisExhaustedRetry?: boolean;
    dedupNearTieRetry?: boolean;
    admissibleOrderNonDefaultRetry?: boolean;
    admissibleOrder?: boolean;
    repairProbe?: boolean;
    repair?: boolean;
    attractionDiversity?: boolean;
}

/** Maps a canonical `stageId` to classifyAttemptTier's own (pre-existing, string-literal) label
 *  vocabulary, for the two stages where they differ: `main-loop` was always labeled 'main-ladder'
 *  here, and a repair-probe-shrink-recovery attempt was always grouped under the broader
 *  'repair-probe' label (it also carries legacy `repairProbe: true` — see stage-policy.ts's
 *  legacyStageTags). Every other stageId already equals its own label. Kept as its own lookup
 *  rather than changing the label vocabulary itself, since hint-provenance.ts's `forcing.retryTier`
 *  and this file's own lifecycle telemetry both persist these exact strings. */
const STAGE_ID_TO_TIER_LABEL: Partial<Record<SolverStageId, string>> = {
    'main-loop': 'main-ladder',
    'repair-probe-shrink-recovery': 'repair-probe',
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
 *  persisted hint can be told apart from an ordinary main-ladder/repair-fallback/admissible-order
 *  find — see docs/solver-optimization-current-queue.md's Priority 0). */
export function classifyAttemptTier(attempt: AttemptTierFlags): string {
    if (attempt.stageId) return STAGE_ID_TO_TIER_LABEL[attempt.stageId] ?? attempt.stageId;
    // Compatibility-only fallback — see this function's own doc comment.
    return attempt.repairLateProbe ? 'repair-late-probe'
        : attempt.repairElitePrefixDfsRetry ? 'repair-elite-prefix-dfs-retry'
            : attempt.mcNeighborBudgetRetry ? 'mc-neighbor-budget-retry'
                : attempt.connectivityAxisExhaustedRetry ? 'connectivity-axis-exhausted-retry'
                    : attempt.dedupNearTieRetry ? 'dedup-near-tie-retry'
                        : attempt.admissibleOrderNonDefaultRetry ? 'admissible-order-non-default-retry'
                            : attempt.admissibleOrder ? 'admissible-order'
                                : attempt.repairProbe ? 'repair-probe'
                                    : attempt.repair ? 'repair-fallback'
                                        : attempt.attractionDiversity ? 'attraction-diversity'
                                            : 'main-ladder';
}
interface AttemptResult { path: number[] | null; attempt: Attempt; }
interface SearchResult { solution: number[] | null; attempts: Attempt[]; earlyNodeBudgetReached?: boolean; earlyWorkBudgetReached?: boolean; shrunkBiased?: ShrunkBiasedTier[]; }

/** One biased repair-probe tier whose node budget STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET
 *  reduced, recorded so a later tier can restore what was withheld — see
 *  STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY. `fullNodeBudget` is the budget the tier would have had
 *  with the mechanism off; `grantedNodeBudget` is what it actually got. */
interface ShrunkBiasedTier { config: AttemptConfig; fullNodeBudget: number; grantedNodeBudget: number; }
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
     *  main-loop attempts mid-search (beam at phase boundaries + every 256 frontier nodes, DFS every
     *  256 nodes). So overshoot is bounded by ~one check interval (tens to a few hundred nodes),
     *  NOT by a whole attempt's or the repair probe's internal ceiling the way it was before this
     *  was threaded through beam/DFS. The one remaining coarse case: the repair probe still bounds
     *  each seed-salt ROUND (up to REPAIR_PROBE_BIASED_NODE_BUDGET, 6,000,000) rather than mid-round,
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
    schedulerMode?: 'legacy' | 'portfolio-experiment';
    /** Unit-test-only per-solve dispatch override. Never persisted or exposed by Solver's facade. */
    attemptSearchForTesting?: AttemptSearchDispatch;
    /** Research-only isConnected() rejection observer (see ConnectivityRejectionObserver's doc in
     *  types.ts and docs/solver-optimization-current-queue.md item #0's learned-failure Stage A).
     *  Never persisted or exposed by Solver's facade; absent in every production caller. */
    connectivityRejectionObserver?: ConnectivityRejectionObserver;
    portfolioExperiment?: PortfolioExperimentDefinition;
    /** Overrides REPAIR_EXTRA_BUDGET_FRACTION for this solve only — offline batch tooling's cost
     *  control (see docs/solver-architecture.md's cost-gotcha note). A DEDICATED top-level option,
     *  deliberately NOT an ablation flag: every existing ablation-gated strategy toggle in this
     *  file and repair-search.ts checks `(!cfg || cfg.STRATEGY_X)` — "no ablation config at all"
     *  is the only way those default enabled, so passing ANY ablation object, even a sparse one
     *  that only sets an unrelated field, silently disables every OTHER unset strategy flag
     *  (STRATEGY_GATE_INTERLEAVING, STRATEGY_MIN_BUDGET_FLOOR, STRATEGY_ADAPTIVE_GATE_BUDGET,
     *  STRATEGY_REPAIR_PROBE, and repair-search.ts's stagnation-burst/elite-splice flags). This
     *  bug shipped once already (this field was originally REPAIR_BUDGET_FRACTION_OVERRIDE inside
     *  `ablation`) and silently broke every solve that used it — caught via a cross-check against
     *  scripts/solver-parallel/race.mjs, not by the original change's own testing, since that
     *  testing happened to only exercise levels that were going to stay unsolved either way. Fixed
     *  by moving it out of `ablation` entirely, same as `nodeBudget` above. Undefined (every
     *  existing/production caller) preserves REPAIR_EXTRA_BUDGET_FRACTION exactly. */
    repairBudgetFractionOverride?: number;
    /** Overrides ATTRACTION_DIVERSITY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape as repairBudgetFractionOverride above, and for the same reason (NOT
     *  an ablation flag). Deliberately a SEPARATE override from repairBudgetFractionOverride, not
     *  reusing it: they gate two independently-costed extensions (repair's iterated-local-search
     *  retry loop vs. this pass's single fixed-budget ladder rerun), and a batch-tooling caller may
     *  legitimately want one without the other — e.g. testing/calibrating THIS mechanism cheaply
     *  requires disabling repair's 6x extension (repairBudgetFractionOverride: 0) while still
     *  letting this pass run at its normal size, which an earlier version of this field (gating
     *  the pass on repairBudgetFraction > 0 instead of its own override) made impossible: a solver-
     *  testing sweep trying to isolate this pass's own contribution ended up re-triggering the full
     *  6x repair extension too, reintroducing exactly the multi-minute-per-level cost this
     *  session's repair-budget-fraction policy (docs/solver-architecture.md) was written to avoid
     *  in solver-testing workflows. Undefined (production default, and solver-controller.ts /
     *  review-controller.ts's interactive call sites) preserves ATTRACTION_DIVERSITY_BUDGET_
     *  FRACTION exactly. */
    attractionDiversityBudgetFractionOverride?: number;
    /** Overrides DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape and rationale as attractionDiversityBudgetFractionOverride above (NOT
     *  an ablation flag; a batch-tooling caller may want to isolate this pass's own cost). Undefined
     *  (production default, and solver-controller.ts/review-controller.ts's interactive call sites)
     *  preserves DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION exactly. */
    dedupNearTieRetryBudgetFractionOverride?: number;
    /** Overrides DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION for this solve only — same dedicated
     *  top-level-option shape as admissibleOrderNodeReserveFractionOverride above, but NOT the same
     *  mechanism as of REVISION 2 (see the constant's own comment): this fraction is ADDITIVE headroom
     *  for the retry tier's own ceiling, not withheld from any earlier tier. 0 restores the tier's
     *  ceiling to plain `nodeBudget` (no extra headroom at all). Undefined (production default)
     *  preserves the constant exactly. */
    dedupNearTieRetryNodeReserveFractionOverride?: number;
    /** Overrides ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION for this solve only — same
     *  dedicated top-level-option shape as dedupNearTieRetryBudgetFractionOverride above (NOT an
     *  ablation flag). Undefined (production default, and solver-controller.ts/review-controller.ts's
     *  interactive call sites) preserves ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION exactly. */
    admissibleOrderNonDefaultRetryBudgetFractionOverride?: number;
    /** Overrides ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION for this solve only —
     *  same ADDITIVE-headroom shape as dedupNearTieRetryNodeReserveFractionOverride above (see that
     *  field's own comment): this fraction extends the retry tier's own ceiling past `nodeBudget`,
     *  never withheld from any earlier tier. 0 restores the tier's ceiling to plain `nodeBudget`.
     *  Undefined (production default) preserves the constant exactly. */
    admissibleOrderNonDefaultRetryNodeReserveFractionOverride?: number;
    /** Overrides CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION for this solve only — same
     *  dedicated top-level-option shape as dedupNearTieRetryBudgetFractionOverride above (NOT an
     *  ablation flag). Undefined (production default, and solver-controller.ts/review-controller.ts's
     *  interactive call sites) preserves CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION exactly. */
    connectivityAxisExhaustedRetryBudgetFractionOverride?: number;
    /** Overrides CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION for this solve only — same
     *  ADDITIVE-headroom shape as dedupNearTieRetryNodeReserveFractionOverride above (see that
     *  field's own comment): this fraction extends the retry tier's own ceiling past `nodeBudget`,
     *  never withheld from any earlier tier. 0 restores the tier's ceiling to plain `nodeBudget`.
     *  Undefined (production default) preserves the constant exactly. */
    connectivityAxisExhaustedRetryNodeReserveFractionOverride?: number;
    /** Overrides REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape as dedupNearTieRetryBudgetFractionOverride above (NOT an ablation
     *  flag). Undefined (production default) preserves the constant exactly. Unlike its three
     *  promoted siblings, this tier is still opt-in (STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY must
     *  also be explicitly set true in `ablation`) — this override only controls the BUDGET once the
     *  flag has already enabled the tier, same relationship as every prior tier's own pre-promotion
     *  lifecycle stage. */
    repairElitePrefixDfsRetryBudgetFractionOverride?: number;
    /** Overrides REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION for this solve only — same
     *  ADDITIVE-headroom shape as dedupNearTieRetryNodeReserveFractionOverride above (see that
     *  field's own comment): this fraction extends the retry tier's own ceiling past the preceding
     *  tier's own ceiling, never withheld from any earlier tier. 0 restores the tier's ceiling to
     *  the preceding tier's own ceiling exactly. Undefined (production default) preserves the
     *  constant exactly. */
    repairElitePrefixDfsRetryNodeReserveFractionOverride?: number;
    /** Overrides MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION for this solve only — same dedicated
     *  top-level-option shape as dedupNearTieRetryBudgetFractionOverride above (NOT an ablation
     *  flag). Undefined (production default) preserves the constant exactly. STRATEGY_MC_NEIGHBOR_
     *  BUDGET_RETRY is PROMOTED to default-ON (2026-08-19, GHA run 32224200709: corpus1 95/102
     *  identical solved set, corpus2 819→828, +9, zero regressions) — this override only controls the
     *  BUDGET; the tier now runs by default like its three promoted siblings above. */
    mcNeighborBudgetRetryBudgetFractionOverride?: number;
    /** Overrides MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION for this solve only — same ADDITIVE-
     *  headroom shape as dedupNearTieRetryNodeReserveFractionOverride above (see that field's own
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
     *  Opt-in, default OFF (unlike the admissible-order reserve) — see the constant's own comment. */
    repairFallbackNodeReserveFractionOverride?: number;
    /** STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY's reserve fraction; defaults to
     *  REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION. Same override rationale as its siblings. */
    repairProbeShrinkRecoveryNodeReserveFractionOverride?: number;
    /** Override for ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION for this solve only — same shape,
     *  rationale, and opt-in-default-OFF status as repairFallbackNodeReserveFractionOverride above
     *  (STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE being off already zeroes this reserve through its
     *  own run condition, so it is likewise not covered by `disableExtraBudgetPasses`). 0 restores
     *  the pre-reserve behavior (the diversity pass shares its ceiling with the repair fallback loop
     *  undivided). Undefined (production default) preserves the constant exactly. */
    attractionDiversityNodeReserveFractionOverride?: number;
    /** Override for the ordinary main-loop late-suffix reserve fraction (production default-ON,
     *  see MAIN_LOOP_LATE_RESERVE_FRACTION). Only takes effect when a finite `nodeBudget` is set
     *  (offline batch tooling) — never affects interactive Play/Editor/Review solves. The fraction
     *  is withheld from the repair probe and the main loop's early config prefix, then becomes
     *  available to the final N ordinary configs without reordering them. */
    mainLoopLateReserveFractionOverride?: number;
    /** Number of final ordinary configs eligible for the experimental reserve. See the fraction
     *  override above. Values are clamped to the main config count; 0 disables the reserve. */
    mainLoopLateReserveConfigCountOverride?: number;
    /** Override for REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE for this solve only — same
     *  dedicated-override shape as the reserve-fraction overrides above (NOT an ablation flag: the
     *  gate is read unconditionally inside the STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET branch,
     *  so there is no existing opt-in/opt-out plumbing to piggyback on, and a fresh ablation flag
     *  would conflate "use the adaptive mechanism at all" with "which gate value" — two different
     *  questions). Exists so a matched batch-tooling sweep (recalibrating the gate from tagged
     *  repairProbe telemetry per docs/future-work.md item 4b) can compare candidate gate values
     *  against the production default without editing the constant and rebuilding. Undefined
     *  (every production/interactive caller) preserves REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE
     *  exactly. */
    repairProbeAdaptiveBiasedBadnessGateOverride?: number;
    /** Override for REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE for this solve only — same shape and
     *  rationale as repairProbeAdaptiveBiasedBadnessGateOverride above; kept as a separate field
     *  (not folded into one object) to match every other override in this file being a single
     *  scalar. Undefined (every production/interactive caller) preserves
     *  REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE exactly. */
    repairProbeAdaptiveBiasedMinScaleOverride?: number;
    /** Convenience for offline batch tooling: sets repairBudgetFractionOverride,
     *  attractionDiversityBudgetFractionOverride, dedupNearTieRetryBudgetFractionOverride,
     *  admissibleOrderBudgetFractionOverride, admissibleOrderNonDefaultRetryBudgetFractionOverride,
     *  connectivityAxisExhaustedRetryBudgetFractionOverride,
     *  repairElitePrefixDfsRetryBudgetFractionOverride,
     *  mcNeighborBudgetRetryBudgetFractionOverride, AND repairLateProbeNodeBudgetOverride all to 0
     *  (purely additive — an explicit value on any individual override still wins over this, so a
     *  caller can still isolate one extension's cost while suppressing the others via this flag).
     *  Exists because the individual overrides were deliberately kept separate (see
     *  attractionDiversityBudgetFractionOverride's own comment for why — a solver-testing sweep
     *  legitimately wants to disable just one of them sometimes), which means "no extra-budget-pass
     *  cost, period" requires remembering every one of them — documented in CLAUDE.md's
     *  solver-architecture gotchas as something "a future new batch tool needs to wire up... from
     *  the start, not just the historically-older repair one" (a warning this field's own addition
     *  for the admissible-order tier is a direct instance of — see that tier's own comment; the
     *  dedup-near-tie-retry, admissible-order-non-default-retry, and connectivity-axis-exhausted-retry
     *  tiers are wired in here for exactly the same reason). This
     *  flag makes the common "suppress every extra-budget pass" case a single boolean instead of an
     *  N-field combo a caller has to remember and update every time a new pass is added, without
     *  removing the fine-grained escape hatch. Undefined (every existing caller) is a no-op — every
     *  underlying override resolves exactly as before this flag existed. */
    disableExtraBudgetPasses?: boolean;
    /** Winner-first pre-attempt (offline re-verify tooling only). Names one (configKey, gateKey)
     *  pair — from a compiled baseline's recorded winner — to try as a SINGLE attempt before the
     *  normal probe/ladder. `configKey` is matched against this level's own configured attempt list
     *  via attemptConfigKey (so the full config object, including its template/diverseBeam, is
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
interface SolveResult { ok: boolean; status: string; solution: number[] | null; solutions: number[][]; attempts: Attempt[]; totalMs: number; nodesExpanded: number; nodeBudgetReached?: boolean;
    /** Work units this solve spent (work-meter.ts). Machine-independent, unlike totalMs, and
     *  comparable across techniques, unlike nodesExpanded. */
    workSpent?: number;
    /** The solve's configured base work allocation. It is a true whole-solve ceiling only when
     * strictTotalWorkBudget was enabled; legacy additive stages may otherwise spend beyond it. */
    workBudget?: number;
    /** The wall-clock deadline cut this run short while work budget remained — so the result is
     *  INDETERMINATE, not a reproducible negative. Never record such a run as "unsolved". */
    deadlineTruncated?: boolean; solvedByPrime?: boolean;
    techniqueLifecycle?: Record<string, unknown>;
    /** Opt-in (opts.lifecycleTelemetry), diagnostic-only: the canonical per-stage BudgetEnvelope
     *  this solve's stage-budget cascade computed (stage-budget.ts's buildStageBudgetEnvelopes) —
     *  lets external tooling inspect the exact wall/node ceiling and headroom every stage was
     *  allotted without re-deriving it. Not read by any solving logic. */
    stageBudgetEnvelopes?: Partial<Record<SolverStageId, import('./stage-policy.js').BudgetEnvelope>>;
    schedulerMode?: 'legacy' | 'portfolio-experiment'; portfolio?: { solvedBeforeFallback: boolean; fallbackAttemptCount: number; repeatedAttemptElapsedMs: number; repeatedPrefixNodeUpperBound: number; runtimeBreakdown?: { prepMs: number; portfolioAttemptSearchMs: number; schedulerOverheadMs: number; fallbackSearchMs: number; totalMs: number; }; }; }

function hasAttemptError(attempts: readonly Attempt[]): boolean {
    return attempts.some(attempt => attempt.outcome === 'error');
}

export function getTrapSpotBudgetMs(level: NormalizedLevel): number {
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
    const perGateCost = area * 45 + (level.reqLen || 0) * 120 + special * 360;
    return Math.min(120000, Math.max(10000, 5000 + perGateCost * gates));
}

export function getActiveGates(level: NormalizedLevel, gateKeys: number[], cfg: AblationConfig | null): number[] {
    if (level.portalMap.size !== 0 || (cfg && !cfg.STRATEGY_PARITY_GATE_FILTER)) return gateKeys;

    const goalP = keyParity(level.goalKey);
    const feasible = gateKeys.filter(gk => (keyParity(gk) ^ goalP ^ (level.reqLen & 1)) === 0);
    return feasible.length > 0 ? feasible : gateKeys;
}

// nodeBudget/nodesOut: optional, repair-only (see runRepairProbe) — a deterministic,
// machine-speed-independent cap used ONLY by the early repair probe so its win/loss decision
// depends on work done, not wall-clock luck under contention (see docs/solver-architecture.md's
// "Wall-clock-gated search probes" section). Infinity/null preserve prior ms-only behavior
// exactly for every other caller (the main ladder, the full-budget repair fallback).
//
// Exported (also added to SOLVER_TESTING_API) so offline tooling can run ONE attempt config
// against ONE gate directly, bypassing getAttemptConfigs/the probe/the fallback loop entirely —
// see scripts/method-probe.mjs. Every production caller (this file's own main loop, repair probe,
// fallback loop) is unaffected by the export; it's the same function, called the same way.
export async function runAttempt(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel,
    attemptConfig: AttemptConfig, attBudget: number, attStart: number, yieldFn: YieldFn,
    nodeBudget = Infinity, nodesOut: { nodesExpanded?: number; timedOut?: boolean; bestBadness?: number; finalBadness?: number } | null = null,
    // Repair-only (see runRepairProbe's multi-seed retry) — additively XORed into
    // repairSearchFromGate's own gate-derived PRNG seed (repair-search.ts), so a retry round
    // samples a genuinely different randomized search trajectory over the exact same level/gate
    // instead of repeating byte-for-byte the same (possibly unlucky) run. 0 (default, every
    // caller but the retry round) is a no-op — behavior is byte-for-byte unchanged from before
    // this parameter existed. No effect on beam/DFS (they don't take a seedSalt at all).
    seedSalt = 0,
): Promise<AttemptResult> {
    const { profileName, template, beamWidth, diverseBeam, repair, repairMustTurnBiased, repairTurnBiased, admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds } = attemptConfig;
    const profile = POLICY_PROFILES[profileName] ?? POLICY_PROFILES.default;
    // Always non-null internally so every branch below can report through the same object,
    // whether or not the caller supplied one (runRepairProbe passes its own, to also read
    // nodesExpanded back for its cross-gate node-budget accounting; ordinary callers don't).
    const searchOut = nodesOut ?? {};
    const nodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
    const workBefore = prep._workMeter.units;
    const allocatedWorkCeiling = prep._workCap == null
        ? null
        : Math.max(0, prep._workCap - prep._workMeter.units);
    let path: number[] | null = null;
    let attemptError: Attempt['error'] | undefined;
    try {
        const dispatch = testAttemptDispatches.get(prep) ?? runAttemptSearch;
        path = await dispatch(attemptConfig, gateKey, level, prep, profile, attBudget, attStart, yieldFn, nodeBudget, searchOut, seedSalt);
    } catch (err) {
        if (isSolverCancellation(err)) throw err;
        const thrown = err as { name?: unknown; message?: unknown } | null;
        const bounded = (value: unknown, fallback: string, max: number) => {
            let text: string;
            try { text = typeof value === 'string' ? value : value == null ? fallback : String(value); }
            catch { text = fallback; }
            return text.slice(0, max);
        };
        const safeField = (key: 'name' | 'message') => {
            try { return thrown?.[key]; } catch { return undefined; }
        };
        attemptError = {
            name: bounded(safeField('name'), 'Error', 120),
            message: bounded(safeField('message') ?? err, 'Unknown attempt error', 500),
            gateKey,
            configKey: bounded(attemptConfigKey(attemptConfig), 'unknown', 240),
            profile: bounded(profileName, 'unknown', 120),
            template: template?.id == null ? null : bounded(template.id, 'unknown', 120),
        };
    }
    const attMs = Date.now() - attStart;
    const nodesAfter = prep._metrics ? prep._metrics.nodesExpanded : 0;
    const workAfter = prep._workMeter.units;
    const budgetStarvedAtDispatch = prep._attemptBudgetTelemetry
        && (allocatedWorkCeiling === 0 || (Number.isFinite(nodeBudget) && nodeBudget === 0));
    return {
        path,
        attempt: withSolverStage({
            gateKey,
            profile: profileName,
            template: template?.id ?? null,
            beamWidth: beamWidth ?? null,
            ok: !!path,
            outcome: path ? 'success' : attemptError ? 'error' : budgetStarvedAtDispatch ? 'budget-starved'
                : searchOut.timedOut === true ? 'timed-out' : searchOut.timedOut === false ? 'exhausted' : 'budget-starved',
            ...(attemptError ? { error: attemptError } : {}),
            elapsedMs: attMs,
            allocatedBudgetMs: attBudget,
            ...(prep._attemptBudgetTelemetry ? {
                allocatedWorkCeiling,
                allocatedNodeCeiling: Number.isFinite(nodeBudget) ? nodeBudget : null,
                workSpent: workAfter - workBefore,
            } : {}),
            nodesExpanded: nodesAfter - nodesBefore,
            ...(repair && seedSalt ? { seedSalt } : {}),
            ...(repair ? { randomSeed: repairPrimarySeed(gateKey, seedSalt) } : {}),
            ...(!path && !attemptError && searchOut.timedOut !== undefined ? { timedOut: searchOut.timedOut } : {}),
            ...(!path && !attemptError && Number.isFinite(searchOut.bestBadness) ? { bestBadness: searchOut.bestBadness } : {}),
            ...(!path && !attemptError && Number.isFinite(searchOut.finalBadness) ? { finalBadness: searchOut.finalBadness } : {}),
            ...(diverseBeam ? { diverseBeam: true } : {}),
            ...(repair ? { repair: true } : {}),
            ...(repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
            ...(repairTurnBiased ? { repairTurnBiased: true } : {}),
            ...(admissibleOrder ? { admissibleOrder: true } : {}),
            ...(admissibleOrderNoTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
            ...(admissibleOrderLds ? { admissibleOrderLds: true } : {}),
        }, 'main-loop'),
    };
}

/** Many-gate levels (≥ this) dilute budget across configs×gates faster than genuinely
 *  infeasible gates get pruned out (16 configs × 4 gates = 64 even slices on a 4-gate
 *  level — stress-corpus finding: S118). Deliberately 4, not 3: nodesExpanded is a noisy
 *  proxy (a structurally bushier dead-end gate can out-expand a constrained correct one),
 *  and a 3-gate A/B (S142) regressed solved→timeout under this weighting — so it's scoped
 *  to the population it was verified on. No published level has more than 3 gates, so this
 *  threshold means the published corpus is provably untouched by this code path. */
const ADAPTIVE_GATE_THRESHOLD = 4;
/** Floor on the per-gate weight multiplier once adaptive weighting kicks in: even a gate
 *  that shows little search activity keeps this fraction of its flat even-split share, so
 *  an efficiently-pruned-but-actually-correct gate is never starved to near zero. */
const ADAPTIVE_GATE_WEIGHT_FLOOR = 0.35;

/** Weight for `gateKey`'s next budget share, based on nodesExpanded accumulated so far
 *  (a proxy for "this gate has live search activity" vs. "attempts here prune out fast").
 *  Returns 1 (no skew) until every gate has contributed at least one data point. */
/** The solver's SINGLE attempt-budget allocation point — both attempt loops below route through it.
 *
 *  `attBudget = minBudgetFraction > 0 ? max(floor(minFloorBase * minBudgetFraction), evenShare)
 *                                     : evenShare`, where `evenShare = floor(remaining / unitsLeft)`.
 *  The two loops differ ONLY in what they pass as `minFloorBase` (the interleaved loop floors
 *  against a whole gate's share; the sequential loop against the gate's own remaining budget), which
 *  is exactly the difference that was easy to get wrong while the arithmetic lived inline twice.
 *
 *  DELIBERATELY CURRENCY-AGNOSTIC: nothing here is milliseconds. It divides a remainder of *some*
 *  budget among the units still to be served. Today every caller passes milliseconds, which is the
 *  root of the solver's run-to-run non-determinism — `remaining` is then derived from wall clock, so
 *  machine speed resizes every attempt and compounds across the ladder (84.2% of genuine repeat runs
 *  fail to reproduce their node count; see docs/solver-budget-determinism.md). Switching the
 *  currency to nodes is that document's Phase 2 and changes this function's two call sites, not this
 *  function. Extracting it is Phase 1, and is a strict no-op: the formula is unchanged.
 *
 *  Not the only budget arithmetic in the file — the repair fallback, the attraction-diversity pass
 *  and the admissible-order tier each scale `timeBudgetMs` by their own FRACTION rather than
 *  dividing a remainder, so they are a separate (and currency-agnostic-by-construction) concern. */
/** Smallest attempt worth starting, per currency. The 50ms figure is historical; the node figure is
 *  its analogue and is a calibration knob for the Phase 2 experiment, not a tuned constant — at the
 *  measured 0.1M-2.1M nodes/sec spread (docs/solver-budget-determinism.md) 2,000 nodes is roughly
 *  1-20ms of work, i.e. deliberately at or below the ms floor so the node allocator does not abandon
 *  a ladder the ms allocator would have kept going. */
const MIN_ATTEMPT_WORK = 2000;

/** The ms-to-work calibration lives in budget-units.ts so every compatibility boundary shares one
 * committed value. Allocation determinism comes from explicit work budgets, not from that rate. */

export function attemptBudgetShare(remaining: number, unitsLeft: number, minFloorBase: number, minBudgetFraction: number): number {
    const evenShare = Math.floor(remaining / unitsLeft);
    return minBudgetFraction > 0
        ? Math.max(Math.floor(minFloorBase * minBudgetFraction), evenShare)
        : evenShare;
}

function adaptiveGateWeight(gateKey: number, gateProgress: Map<number, number>): number {
    const total = [...gateProgress.values()].reduce((a, b) => a + b, 0);
    if (total <= 0) return 1;
    const n = gateProgress.size;
    const share = (gateProgress.get(gateKey) ?? 0) / total;
    return Math.max(ADAPTIVE_GATE_WEIGHT_FLOOR, (share * n) ** 2);
}

async function runInterleavedAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget = Infinity, workBudget = Infinity, workStart = 0,
    earlyConfigNodeBudget = nodeBudget, lateConfigStart = baseConfigs.length,
    earlyConfigWorkBudget = workBudget,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    let pairsLeft = baseConfigs.length * activeGates.length;
    let earlyNodeBudgetReached = false;
    let earlyWorkBudgetReached = false;
    const lateConfigCount = baseConfigs.length - lateConfigStart;
    const latePairCount = lateConfigCount * activeGates.length;

    // Adaptive gate weighting only engages on genuinely dilution-prone levels, and only
    // from the second full config round onward — round 0 always runs at the flat even
    // split so every gate contributes at least one real signal before any skew applies.
    // Ablation: STRATEGY_ADAPTIVE_GATE_BUDGET forces the flat even split at any gate count.
    const cfg = prep._cfg;
    const adaptive = (!cfg || cfg.STRATEGY_ADAPTIVE_GATE_BUDGET) && activeGates.length >= ADAPTIVE_GATE_THRESHOLD;
    const gateProgress = adaptive ? new Map(activeGates.map(g => [g, 0])) : null;

    configLoop: for (let ci = 0; ci < baseConfigs.length; ci++) {
        for (let gi = 0; gi < activeGates.length; gi++) {
            const gateKey = activeGates[gi];
            const elapsed = Date.now() - levelStartTime;
            const latePairIndex = ci >= lateConfigStart
                ? (ci - lateConfigStart) * activeGates.length + gi
                : -1;
            // Give every beneficiary pair its own cumulative slice. Merely exposing the whole
            // reserve to the suffix would let its first config/gate consume everything and recreate
            // the same starvation one position later.
            const configNodeBudget = latePairIndex >= 0
                ? earlyConfigNodeBudget + Math.floor((nodeBudget - earlyConfigNodeBudget) * (latePairIndex + 1) / latePairCount)
                : earlyConfigNodeBudget;
            const nodesSpent = prep._metrics ? prep._metrics.nodesExpanded : 0;
            if (elapsed >= timeBudgetMs) return { solution: null, attempts };
            if (nodesSpent >= configNodeBudget) {
                if (earlyConfigNodeBudget < nodeBudget && ci < lateConfigStart) {
                    earlyNodeBudgetReached = true;
                    pairsLeft = (baseConfigs.length - lateConfigStart) * activeGates.length;
                    ci = lateConfigStart - 1;
                    continue configLoop;
                }
                if (latePairIndex + 1 < latePairCount) { pairsLeft--; continue; }
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            // WORK-side mirror of the node-side check just above (2026-08-26 fix for the
            // confirm-residual-001 gap — see solveLevel's mainLoopLateWorkReserveEligible comment for
            // the full rationale). Before this, the only work-budget stop condition in this loop was
            // the flat check that used to live where budgetLeft is now computed below
            // (`workSpent >= workBudget`), with no reserve carve-out at all: a work-expensive early
            // config population could exhaust workBudget long before ever reaching the reserve-
            // protected late suffix, even while the NODE dimension above still had headroom. Same
            // escalating-slice-per-late-pair shape as configNodeBudget, keyed off workBudget instead
            // of nodeBudget.
            const configWorkBudget = latePairIndex >= 0
                ? earlyConfigWorkBudget + Math.floor((workBudget - earlyConfigWorkBudget) * (latePairIndex + 1) / latePairCount)
                : earlyConfigWorkBudget;
            const workSpent = prep._workMeter.units - workStart;
            if (workSpent >= configWorkBudget) {
                if (earlyConfigWorkBudget < workBudget && ci < lateConfigStart) {
                    earlyWorkBudgetReached = true;
                    pairsLeft = (baseConfigs.length - lateConfigStart) * activeGates.length;
                    ci = lateConfigStart - 1;
                    continue configLoop;
                }
                if (latePairIndex + 1 < latePairCount) { pairsLeft--; continue; }
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR gates the per-attempt-config minimum
            // budget-share floor (long-multigate perimeter beams, must-cross diverse-beam
            // threads) — disabling it falls back to the flat even split for every config.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            // The remainder being divided is WORK, never wall clock — that is what makes the whole
            // schedule a function of (level, workBudget) alone. See work-meter.ts. Divided out of
            // configWorkBudget (the late-reserve-aware ceiling computed above), not the flat
            // workBudget, so a late-window config's own attempt allocation stays capped at its own
            // escalating slice too — mirroring remainingNodeBudget's identical use of configNodeBudget
            // (rather than the flat nodeBudget) below.
            const budgetLeft = configWorkBudget - workSpent;
            let attBudget = attemptBudgetShare(budgetLeft, pairsLeft, budgetLeft / activeGates.length, minFrac);
            if (gateProgress && ci >= 1) {
                // adaptiveGateWeight is unbounded above ((share*n)**2 for a gate that has been
                // getting more than its "fair" 1/n share of progress) — every OTHER path through
                // attemptBudgetShare above (the plain even split, and the minBudgetFraction floor,
                // which is itself bounded by budgetLeft/activeGates.length) already keeps attBudget
                // <= budgetLeft by construction, so this clamp preserves that same invariant rather
                // than changing the weighting's own (validated, S142-scoped) relative aggressiveness.
                // Without it, a single heavily-weighted attempt could claim several times budgetLeft,
                // overspending this tier's declared workBudget before the outer `workSpent >= configWorkBudget`
                // check on the NEXT iteration ever gets a chance to stop it.
                attBudget = Math.min(budgetLeft, Math.max(MIN_ATTEMPT_WORK, Math.floor(attBudget * adaptiveGateWeight(gateKey, gateProgress))));
            }
            if (attBudget < MIN_ATTEMPT_WORK) return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            prep._workCap = Math.min(prep._workMeter.units + attBudget, prep._strictWorkCap ?? Infinity);

            // Remaining GLOBAL node budget, recomputed fresh before each attempt (same pattern as the
            // repair fallback below): beam/DFS count nodes LOCAL to the call, so the remainder makes a
            // single attempt stop mid-search when the cumulative budget is hit, instead of only being
            // caught by the between-attempts check above after it has already run its full time slice.
            const remainingNodeBudget = configNodeBudget === Infinity ? Infinity : Math.max(0, configNodeBudget - (prep._metrics ? prep._metrics.nodesExpanded : 0));
            // The attempt's ms figure is the DEADLINE's remainder, not a share — it can truncate
            // the attempt but never sized it. prep._workCap (above) is what actually bounds it.
            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], timeBudgetMs - elapsed, Date.now(), yieldFn, remainingNodeBudget);
            if (ci >= lateConfigStart) result.attempt.mainLoopLateReserve = true;
            if (ci < lateConfigStart && (prep._metrics ? prep._metrics.nodesExpanded : 0) >= earlyConfigNodeBudget) {
                earlyNodeBudgetReached = earlyConfigNodeBudget < nodeBudget;
            }
            if (ci < lateConfigStart && (prep._workMeter.units - workStart) >= earlyConfigWorkBudget) {
                earlyWorkBudgetReached = earlyConfigWorkBudget < workBudget;
            }
            if (gateProgress) {
                gateProgress.set(gateKey, (gateProgress.get(gateKey) ?? 0) + (result.attempt.nodesExpanded ?? 0));
            }
            attempts.push(result.attempt);
            pairsLeft--;
            if (result.path) return { solution: result.path, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
        }
    }
    return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
}

async function runGateSerialAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget = Infinity, workBudget = Infinity, workStart = 0,
    earlyConfigNodeBudget = nodeBudget, lateConfigStart = baseConfigs.length,
    lateWorkReserveFraction = 0,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    const cfg = prep._cfg;
    let earlyNodeBudgetReached = false;
    let earlyWorkBudgetReached = false;
    const lateConfigCount = baseConfigs.length - lateConfigStart;
    const latePairCount = lateConfigCount * activeGates.length;

    for (let gi = 0; gi < activeGates.length; gi++) {
        const gateKey = activeGates[gi];
        const gateElapsed = Date.now() - levelStartTime;
        if (gateElapsed >= timeBudgetMs) return { solution: null, attempts };
        if ((prep._metrics ? prep._metrics.nodesExpanded : 0) >= nodeBudget) return { solution: null, attempts };

        // This gate's slice of the remaining WORK, and the mark it measures its own spend from.
        const gateStartUnits = prep._workMeter.units;
        const workSpent = prep._workMeter.units - workStart;
        if (workSpent >= workBudget) return { solution: null, attempts };
        const gatesLeft = activeGates.length - gi;
        const gateBudget = Math.floor((workBudget - workSpent) / gatesLeft);
        // WORK-side mirror of earlyConfigNodeBudget, sized fresh per gate (2026-08-26 fix for the
        // confirm-residual-001 gap — see runInterleavedAttempts's identical-purpose configWorkBudget,
        // and solveLevel's mainLoopLateWorkReserveEligible comment, for the full rationale). Unlike
        // the node dimension, work here is already divided into a fresh per-gate slice (gateBudget,
        // just above) rather than one shared global pool, so the reserve is carved as a FRACTION of
        // each gate's own slice rather than an absolute global ceiling threaded in from the caller.
        // `lateConfigCount === 0` (no reserve window at all) forces this to exactly gateBudget
        // regardless of the fraction, matching earlyConfigNodeBudget defaulting to nodeBudget
        // whenever the reserve is disabled.
        const earlyGateWorkBudget = lateConfigCount > 0
            ? gateBudget - Math.floor(gateBudget * lateWorkReserveFraction)
            : gateBudget;

        for (let ci = 0; ci < baseConfigs.length; ci++) {
            const latePairIndex = ci >= lateConfigStart
                ? gi * lateConfigCount + (ci - lateConfigStart)
                : -1;
            const configNodeBudget = latePairIndex >= 0
                ? earlyConfigNodeBudget + Math.floor((nodeBudget - earlyConfigNodeBudget) * (latePairIndex + 1) / latePairCount)
                : earlyConfigNodeBudget;
            if (earlyConfigNodeBudget < nodeBudget && (prep._metrics ? prep._metrics.nodesExpanded : 0) >= configNodeBudget) {
                if (ci < lateConfigStart) { earlyNodeBudgetReached = true; continue; }
                if (latePairIndex + 1 < latePairCount) continue;
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            const configWorkBudget = latePairIndex >= 0
                ? earlyGateWorkBudget + Math.floor((gateBudget - earlyGateWorkBudget) * (latePairIndex + 1) / latePairCount)
                : earlyGateWorkBudget;
            const elapsed = prep._workMeter.units - gateStartUnits;
            if (earlyGateWorkBudget < gateBudget && elapsed >= configWorkBudget) {
                if (ci < lateConfigStart) { earlyWorkBudgetReached = true; continue; }
                if (latePairIndex + 1 < latePairCount) continue;
                return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
            }
            if (elapsed >= gateBudget) break;

            const remaining = configWorkBudget - elapsed;
            const attemptsLeft = baseConfigs.length - ci;
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR — see runInterleavedAttempts's identical gate.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            const attBudget = attemptBudgetShare(remaining, attemptsLeft, remaining, minFrac);
            if (attBudget < MIN_ATTEMPT_WORK) break;
            prep._workCap = Math.min(prep._workMeter.units + attBudget, prep._strictWorkCap ?? Infinity);

            // Remaining GLOBAL node budget — see runInterleavedAttempts's identical recompute.
            const remainingNodeBudget = configNodeBudget === Infinity ? Infinity : Math.max(0, configNodeBudget - (prep._metrics ? prep._metrics.nodesExpanded : 0));
            const result = await runAttempt(gateKey, level, prep, baseConfigs[ci], timeBudgetMs - (Date.now() - levelStartTime), Date.now(), yieldFn, remainingNodeBudget);
            if (ci >= lateConfigStart) result.attempt.mainLoopLateReserve = true;
            if (ci < lateConfigStart && (prep._metrics ? prep._metrics.nodesExpanded : 0) >= earlyConfigNodeBudget) {
                earlyNodeBudgetReached = earlyConfigNodeBudget < nodeBudget;
            }
            if (ci < lateConfigStart && (prep._workMeter.units - gateStartUnits) >= earlyGateWorkBudget) {
                earlyWorkBudgetReached = earlyGateWorkBudget < gateBudget;
            }
            attempts.push(result.attempt);
            if (result.path) return { solution: result.path, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
        }
    }
    return { solution: null, attempts, earlyNodeBudgetReached, earlyWorkBudgetReached };
}

// Retry-tier budget fraction/reserve constants and their re-derivation cascade now live in
// stage-budget.ts (the canonical budget-policy module — see its own header comment). Re-exported
// here so existing external consumers (scripts/solver-parallel/race.mjs) keep importing them from
// this module's public surface unchanged.
export {
    REPAIR_EXTRA_BUDGET_FRACTION, ATTRACTION_DIVERSITY_BUDGET_FRACTION, ADMISSIBLE_ORDER_BUDGET_FRACTION,
    ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION, ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION,
    MAIN_LOOP_LATE_RESERVE_FRACTION, MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT, REPAIR_FALLBACK_NODE_RESERVE_FRACTION,
    ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION, REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION,
    DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION, DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION,
    ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION, ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION,
    CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION, CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION,
    REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION, REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION,
    MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION, MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION,
    REPAIR_LATE_PROBE_NODE_BUDGET,
} from './stage-budget.js';
// The constants re-exported above are NOT also imported here — nothing else in this file reads
// them locally (every real use lives inside stage-budget.ts's own computeStageBudgetPlan now);
// the `export { ... } from` statement is self-contained and needs no paired import.
import { computeStageBudgetPlan, computeShrinkRecoveryBudget, buildStageBudgetEnvelopes } from './stage-budget.js';
// Genuinely imported (not just re-exported): this file's own repair-late-probe-multi-seed-retry
// block iterates the array directly, unlike the fraction constants above which are only ever
// consumed inside stage-budget.ts's computeStageBudgetPlan.
import { REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS } from './stage-budget.js';

/** Small, strictly ADDITIONAL budgets (never subtracted from mainConfigs' timeBudgetMs or from
 *  REPAIR_EXTRA_BUDGET_FRACTION's own later allotment) given to a cheap early probe of the
 *  repair fallback, tried BEFORE the ordinary DFS/beam main loop — see runRepairProbe.
 *
 *  Stress-corpus finding: on the repair-gated feature regime (attempts.ts's
 *  needsRepairFallback), the winning repair attempt itself typically finishes in well under
 *  these allotments (measured across the known cluster: several ordinary wins under 1.2s; the
 *  two levels that need the must-turn-biased attempt specifically, S033/S043, took ~3.4s/~4.1s
 *  cold) while the main loop ahead of it burns its full ~20s budget on strategies that provably
 *  exhaust their own search space without succeeding (see data/stress/README.md item 6's
 *  full-instrumentation finding — none of those attempts are cut off by budget, they run out of
 *  search space on their own) — i.e. for most of this regime, the main loop's own budget is
 *  pure scheduling tax on top of repair's real work, not search that matters. A bonus, not the
 *  design basis: repairSearchFromGate also measurably degrades in throughput when run after the
 *  main loop's own ~20s of work (REPAIR_EXTRA_BUDGET_FRACTION's own comment, S033/S043
 *  writeups), so probing it cold, before that contention, can only help.
 *
 *  Deliberately small and strictly additive: repairSearchFromGate is a pure function of
 *  (gateKey, level, prep, profile, budget) with a seed derived only from gateKey (mulberry32,
 *  never wall-clock/Math.random — see repair-search.ts), so a failed probe merely repeats a
 *  deterministic prefix of the restarts the later full-budget call performs anyway: wasted
 *  compute on levels where the probe fails to solve, never a correctness or effective-
 *  search-depth cost. This is the same reasoning that ruled out the earlier, reverted design
 *  that shrank the pool a later attempt's own budget was computed against (regressed S017 — see
 *  REPAIR_EXTRA_BUDGET_FRACTION's comment): this probe shrinks nothing, it only ever adds an
 *  extra chance to exit early. Levels outside the repair feature gate never see this code path
 *  at all (repairConfigs is empty, checked before the probe runs), so it is provably a no-op on
 *  the published corpus, exactly as the full-budget repair loop already is.
 *
 *  Sized small on purpose, and split into two tiers after measuring a real tax/benefit
 *  trade-off: the repair feature gate (needsRepairFallback) is far broader than the levels that
 *  actually need repair in the stress corpus — a full-corpus scan found 48 levels that match
 *  the gate but already solve fast via the ordinary main loop (repair never engages for them)
 *  against only 13 that actually need it, so every level in the 48 pays whatever this probe
 *  costs as pure tax. A single flat 5000ms budget (tested first) caught the full known cluster
 *  including S033/S043, but pushed the aggregate tax on the 48 to roughly the size of the
 *  cluster's own savings. A single flat 1500ms budget shrank the tax a lot but missed S033/S043
 *  entirely (their win needs the must-turn-biased attempt specifically, which only exists on
 *  must-turn levels — a full-corpus scan found only 9 of the 48 tax-paying levels have one).
 *  Splitting the two tiers gets both: the ordinary tier stays small (low tax on all 48), the
 *  biased tier stays large enough to reliably catch S033/S043 while only the 9 must-turn
 *  members of the 48 pay its larger tax.
 *
 *  NODE-COUNT, not ms (see docs/solver-architecture.md's "Wall-clock-gated search probes"
 *  section for the full determinism rationale and the specific published-corpus repro this
 *  fixed, per the Determinism Report): the probe's original ms-based race could
 *  non-deterministically return one of two different, both-valid solutions on a
 *  repair-gated level depending on CPU/memory contention at solve time — a probe that would
 *  succeed within its ms window on an uncontended run could miss it on a contended one, since
 *  the same nominal ms window covers fewer actual search nodes under contention. Node count
 *  is a pure function of (gateKey, level, prep, profile) given repairSearchFromGate's own
 *  seeded-per-gate determinism, so the SAME probe decision is reached regardless of machine
 *  speed or contention.
 *
 *  Calibrated by direct measurement (not by converting the old ms constants via an assumed
 *  nodes/ms rate, which would reintroduce a guess) via repairSearchFromGate called directly
 *  on the winning (gate, config) pair, isolated from the rest of the ladder's own node cost:
 *  ordinary-tier observed winners across the published corpus + the known stress cluster —
 *  pub#136 1,267,700 nodes (~1365ms, the largest observed — notably already close to the old
 *  1500ms ceiling), pub#146 172,978, pub#144 41,446, S039 149,513 — so 2,000,000 comfortably
 *  covers the largest observed case with ~58% headroom. Biased-tier: S043 972,527 nodes
 *  (~2179ms) is the only known must-turn-biased win that should be caught this early; S033
 *  needs 10,190,617 nodes (~25s) even cold and is NOT meant to be caught by this probe (it's
 *  caught later by the full REPAIR_EXTRA_BUDGET_FRACTION fallback loop today, same as before
 *  this change) — 6,000,000 clears S043 with a large margin while staying safely below S033's
 *  true cost, preserving which level falls through to the full fallback vs. gets caught early.
 *  Re-measure (repairSearchFromGate called directly per the recipe above, NOT the full
 *  2000-level stress corpus — too slow for this kind of per-level direct-replay measurement)
 *  before changing either value. */
const REPAIR_PROBE_ORDINARY_NODE_BUDGET = 2_000_000;
// Exported for orchestration.test.ts's STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET regression
// tests, which assert the exact scaled node budget a mocked biased-tier attempt is called with.
export const REPAIR_PROBE_BIASED_NODE_BUDGET = 6_000_000;

/** Per-attempt wall-clock trip-wire for `runRepairProbe` (see its own call site's comment): meant
 *  to catch only a genuinely pathological per-node cost or host distress, never to be the actual
 *  deciding factor — the node budgets above are. A flat 30-second value (this constant's value
 *  until 2026-08-12) assumed >=66,667 nodes/sec was always achievable, which measured CPU
 *  contention alone falsified: solving 5 levels at `--workers=4` on a 4-core host (not even
 *  oversubscribed — 4 processes on 4 cores) reproducibly dropped one repair-probe attempt's
 *  throughput to ~37,000-43,000 nodes/sec, well under the old cap's implicit floor, silently
 *  truncating the attempt below its intended node budget and changing which levels solved purely
 *  as a function of how contended the host happened to be — see
 *  reports/2026-08-12-worker-count-sensitivity-repair-probe-wallclock.md. A flat constant (rather
 *  than one derived per-attempt from `gateNodeBudget`) is sufficient here because `gateNodeBudget`
 *  is always <= REPAIR_PROBE_BIASED_NODE_BUDGET (6,000,000): 20 minutes for that many nodes needs
 *  only ~5,000 nodes/sec sustained, roughly 7-8x below the measured contended rate above and
 *  >100x below nominal uncontended throughput (~650,000 nodes/sec, measured on the same host) —
 *  generous enough to survive materially worse contention than what was measured, while staying a
 *  genuinely bounded backstop. Safe for the ~30s interactive latency promise (Play's "Find a
 *  Hint", Review's approval solve): both pass `repairBudgetFractionOverride: 0`, which skips the
 *  probe outright (see its call site's own `repairBudgetFraction !== 0` gate) rather than relying
 *  on this cap to bound it. */
export const REPAIR_PROBE_ATTEMPT_MS_CAP = 1_200_000;

/** How much of REPAIR_PROBE_BIASED_NODE_BUDGET the heuristically-PREDICTED technique gets when both
 *  biased tiers are present (attempts.ts's predictLikelyBiasedRepairTechnique, under
 *  STRATEGY_REPAIR_TURN_BIAS) — the other (fallback) tier gets the remainder. 0.75 chosen to keep
 *  the predicted tier close to its full pre-split calibration (see REPAIR_PROBE_BIASED_NODE_BUDGET's
 *  own comment) while still giving the fallback technique a real, non-zero shot. Two prior designs
 *  measured on a full corpus-2 refresh and rejected: an even 50/50 split (net -3 vs. the run before
 *  it: each half-budget attempt too weak to reproduce known wins like S043's 4.3M-node need against
 *  a 3M cap) and excluding the fallback entirely (net -2 vs. the original turn-bias-off baseline:
 *  the predictor's own ~74% accuracy means a real fraction of levels get zero chance via the
 *  technique they actually needed). See reports/2026-07-23-turnbias-corpus2-ab-validation.md's
 *  "Update" sections for both prior measurements. Needs its own corpus-2 A/B before promotion. */
const REPAIR_PROBE_PREDICTED_TIER_SHARE = 0.75;

/** STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET (production default-ON as of 2026-08-13, promoted
 *  — see the "PROMOTION" paragraph at the end of this comment for the decision and its caveats):
 *  a single-signal, single-recipient instance of "online failure-conditioned allocation"
 *  (docs/solver-interoperability-and-cooperation-plan.md §17, docs/future-work.md item #4).
 *
 *  BACKGROUND — this is a *refinement*, not a confirmation, of the hypothesis that motivated it.
 *  The 2026-08-12 main-loop-late-reserve full-corpus sweep (635/1700, down from 694 in a since-
 *  found-confounded A/B arm) was suspected to be explained by runRepairProbe's wall-clock-fix
 *  (2bfefc660) now letting a contended probe attempt spend its FULL intended node budget instead
 *  of being silently truncated, starving `STRATEGY_MAIN_LOOP_LATE_RESERVE`'s reserved slice —
 *  see reports/2026-08-12-main-loop-late-reserve-population-ab.md's "Follow-up" section. Tracing
 *  the actual code (this file's reserve resolution, above solveLevel's probe call site) shows that
 *  hypothesis is WRONG AS STATED: both the admissible-order reserve and the main-loop late reserve
 *  are computed and carved out of `nodeBudget` BEFORE the probe ever runs, and the probe's own
 *  external node ceiling (`mainLoopEarlyNodeBudget`, passed as this function's `nodeBudget` param)
 *  already excludes both — the probe is structurally incapable of spending into either reserve.
 *
 *  What IS real, confirmed directly on a small local sample (a dozen repair-gated Corpus-2 levels,
 *  15,000,000-node budget, `--workers=1`, uncontended — see
 *  reports/2026-08-12-repair-probe-early-main-loop-starvation.md): the repair probe and the
 *  "early" (pre-late-reserve) main-loop configs draw from the SAME unprotected shared pool,
 *  `mainLoopEarlyNodeBudget`, with the probe going first and taking whatever it needs (up to its
 *  own fixed worst case, ~10,000,000 with one biased tier) before the early main-loop configs ever
 *  get a turn. On 7 of 12 sample levels the probe alone consumed the entire pool
 *  (mainLoopEarlyNodeBudget itself, ~9,562,500 at this budget), leaving the early main-loop
 *  configs exactly zero nodes. A blanket, level-blind STATIC shrink of the probe's own budget
 *  (tested locally via a scale factor matching the measured pre-fix contended-throughput ratio,
 *  ~0.55) is a real but ZERO-SUM lever on this sample: it recovered one level (R00602: probe
 *  freed ~4.06M nodes, an early main-loop config then solved it in 520,775) but broke another
 *  (R02823: its own solution lay inside the biased repair tier's search at 9,308,917 nodes — a
 *  static 0.55 cap truncated it at 5,500,015, well short). This is exactly the failure mode CLAUDE.md
 *  warns a static reallocation risks, and it directly motivates conditioning the shrink on live
 *  evidence instead of applying it unconditionally.
 *
 *  THE SIGNAL: `repairSearchFromGate` already reports `bestBadness` on every failed attempt (the
 *  lowest near-miss score any restart reached — repair-search.ts) — current-invocation evidence,
 *  no exact-level history, satisfies docs/solver-level-blindness.md. On the same 12-level sample,
 *  the one level that genuinely needed the biased tier's full budget (R02823) had already shown
 *  a LOW ordinary-tier bestBadness (min 4 across its two ordinary rounds) before the biased tier
 *  ran — i.e. the ordinary tier's own live evidence already signaled "repair is close." Every
 *  other sampled level's ordinary-tier minimum badness was >= 6, mostly >= 15.
 *
 *  THE MECHANISM: after the ordinary-tier rounds fail, if a biased repair config is about to run,
 *  scale its node budget by `min(1, max(MIN_SCALE, BADNESS_GATE / ordinaryBestBadness))` — a
 *  strict no-op (scale 1) whenever the live evidence already looks promising (badness <=
 *  BADNESS_GATE, as R02823's did), and a bounded shrink (never below MIN_SCALE — a participation
 *  floor, never zero, per solver-interoperability-and-cooperation-plan.md §17.3) when it doesn't.
 *  Freeing nodes this way benefits whichever tier runs next against the same shared ceiling
 *  (mainLoopEarlyNodeBudget) — normally the early main-loop configs — without touching either
 *  protected reserve or requiring a new recipient-side change.
 *
 *  CALIBRATION CAVEAT: MIN_SCALE=0.35 is still picked from the original n=12 local sample (n=1 for
 *  the "needs full budget" case) — a starting point, not a re-derived constant. Re-measure before
 *  changing it, per this file's own established discipline for tuned constants (see e.g.
 *  REPAIR_PROBE_ORDINARY_SEED_SALTS's calibration history above). BADNESS_GATE has since been
 *  re-derived once — see GATE RECALIBRATION below.
 *
 *  PROMOTION (2026-08-13): a 300-level stratified level-blind GHA A/B (250 of the 512-level
 *  eligible population + 50 control, real 50,000,000-node production budget, matching
 *  solver-stress-refresh.yml's own default — .github/workflows/solver-repair-probe-adaptive-
 *  sample-ab.yml) reproduced the local pilot's zero-loss shape at 25x the sample size: control
 *  108/300, treatment 109/300, net +1 (1 gained: R02719, mustCross=8/mustTurn=5/reqInt=9 —
 *  squarely inside the eligible population, not a control-bucket artifact; 0 lost), nodes -1.5%,
 *  work -9.0%. Promoted to production default-ON on this evidence at the project owner's explicit
 *  direction. This is a REAL DEVIATION from this ledger's own stated bar (a dedicated
 *  full-population Corpus-2 A/B) — 300/1700 (250/512 eligible) is strong stratified supporting
 *  evidence, not the full-population result the bar calls for. Recorded here rather than glossed
 *  over: if a future full-corpus run surfaces a loss this sample didn't catch, that is the
 *  expected shape of the risk being accepted, not a surprise. See
 *  reports/2026-08-12-repair-probe-early-main-loop-starvation.md and
 *  docs/solver-opt-in-experiment-ledger.md for the full record.
 *
 *  GATE RECALIBRATION (2026-08-13): a saved-artifact audit of the promotion A/B above
 *  (reports/2026-08-13-existing-solve-data-tuning-opportunities.md) found a sharp yield gradient —
 *  ordinary-tier badness <=5 correlated with an 18.4% direct-repair win rate, falling to 0% above
 *  20 — and nominated a matched BADNESS_GATE=10/8/6 sweep (MIN_SCALE held fixed) as a follow-up.
 *  Re-running the SAME 300-level stratified sample/seed/budget as the promotion A/B, three times
 *  (blank/gate=10 baseline, gate=8, gate=6, via the same workflow's new repair_probe_adaptive_
 *  badness_gate dispatch input): baseline 88/300; gate=8 and gate=6 both 89/300, the identical gain
 *  (R02663) over baseline with zero losses at either gate. Gate=6 strictly dominated gate=8 on cost
 *  (nodes -0.7%/work -4.1% vs. baseline, vs. gate=8's -0.5%/-2.1%), so 6 was chosen over 8. Applied
 *  to production at the project owner's explicit direction, at the same evidentiary bar (sample
 *  size, real production node budget) the on/off promotion above used. See
 *  reports/2026-08-12-repair-probe-early-main-loop-starvation.md's "Gate/min-scale recalibration:
 *  GHA A/B" section for the full per-arm breakdown and run ids. */
export const REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE = 6;
export const REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE = 0.35;

/** Additional seeds (see runAttempt's seedSalt param) to retry an already-failed ORDINARY probe
 *  round with, before falling through to the full (much more expensive) ladder.
 *  repairSearchFromGate's randomized local search is seeded from the gate's own coordinates
 *  (repair-search.ts's `rand`), so its outcome on a given (level, gate) is one sample from a
 *  genuinely high-variance distribution, not a deterministic verdict on that level's real
 *  difficulty — confirmed directly with scripts/repair-direct-probe.mjs's --races flag and by
 *  calling repairSearchFromGate directly per seed (see
 *  reports/families/2026-07-15-{symmetry-orientation-bias,re-embedded-cousin-grid-growth}.md for
 *  the investigation this grew out of). A whole-level rotation or a grid re-embedding incidentally
 *  changes this seed by changing the gate's coordinates — which is the leading explanation for why
 *  those two sibling/cousin generation modes showed the strongest repair-probe sensitivity in that
 *  investigation, despite changing nothing about the puzzle's actual difficulty. Retrying the SAME
 *  (gate, level) with a few additional seeds targets that variance directly, independent of
 *  orientation.
 *
 *  **Width is a recall-vs-cost tradeoff, not a free correctness win — measured, not assumed —
 *  and re-measured after repair-search.ts's elite-splice pool was fixed (it had gone silently
 *  dead from a July 10 correctness fix — see CLAUDE.md's repair-search gotcha and
 *  reports/2026-07-16-repair-search-elite-splice-regression.md), since that fix changed
 *  single-seed convergence enough to invalidate the original calibration below.**
 *
 *  Original calibration (pre-elite-splice-fix, repair-search effectively never spliced from a
 *  near-miss — every restart fresh-started from the gate): salts [0,1,2,3,4] (4 retries) were
 *  picked from which single salt rescued each of 4 hand-checked cases (P00146 + 3 rotated
 *  siblings — needed salts 1, 2, 2, 4 respectively). That width passed `solver:bench --check`
 *  (160/160, no regressions) but a full-corpus before/after speed sweep caught what the
 *  solvability check couldn't see: total time went from 42.0s to 47.7s (+14%) at
 *  budgetMs=30000, entirely from one level (P00144) whose probe exhausted all 4 retry seeds
 *  (never rescued at any of them) before falling through to the same fallback path that solved
 *  it anyway — pure waste, only partly offset by the one level (P00146) the retries did rescue.
 *  Narrowed to [0,1,2] (2 retries) in response, restoring the corpus to a ~0.5% wash.
 *
 *  **Re-calibration after the elite-splice fix landed** (same method — repairSearchFromGate
 *  called directly per seed, 2,000,000-node budget, same P00146 + 3 rotated siblings, plus all 4
 *  actual repair-gated published levels: P00136/P00144/P00145/P00146, the full population
 *  `needsRepairFallback` currently selects): the picture changed completely. Every one of the 3
 *  rotated siblings and 3 of the 4 real levels (P00136, P00144, P00146) now solve on **seed 0
 *  alone** — cheaply (7k-256k nodes, well under the budget) — meaning the retry loop never even
 *  reaches salt 1 for any of them anymore; splicing from the elite pool was doing exactly the job
 *  the retries used to compensate for. Only one real level, P00145, still needs a retry: seed 0
 *  fails (exhausts the full budget), but seed 1 rescues it cheaply (805,745 nodes) — no case in
 *  this re-calibration (9 total: 4 real levels + the 1 parent + 3 siblings the width was
 *  originally tuned on) needs salt 2 to rescue. Narrowed further to [0,1] (1 retry) on this
 *  basis: keeps the one known rescue (P00145, at salt 1) at zero cost for the 3 levels that no
 *  longer need any retry at all, and caps a still-unrescuable level's worst-case probe cost at 2x
 *  the base budget instead of 3x. This is still a small sample (n=9, mostly one family plus the
 *  tiny 4-level real population) — re-measure with the same rigor before widening or narrowing
 *  again, especially if a *different* repair-gated level (a new publish, or a stress-corpus case)
 *  is found needing a seed beyond 1.
 *
 *  Deliberately scoped to the ORDINARY tier only (REPAIR_PROBE_ORDINARY_NODE_BUDGET), not the
 *  must-turn-biased one: no rescue evidence was gathered for the biased tier, and its own history
 *  (see repair-search.ts's EXIT_GUIDANCE_EPSILON_BOOST comment — S030 regressed at every nonzero
 *  nudge tried, even on an independent RNG stream) shows it's unusually sensitive to any change, so
 *  widening it without specific evidence is a needless risk. Each retry salt gets the SAME node
 *  budget as the first round — strictly additive: only reached when every active gate has already
 *  failed at every earlier salt, so a level whose probe already succeeds on the first (default)
 *  seed is completely unaffected. Ablation: STRATEGY_REPAIR_PROBE_MULTI_SEED (default enabled).
 *  Re-verify with a full-corpus before/after speed sweep (not just solver:bench --check — see
 *  CLAUDE.md's gotcha on this and docs/testing.md's "Speed, separately from solvability") before
 *  changing this list again. */
const REPAIR_PROBE_ORDINARY_SEED_SALTS = [0, 1];

/** Tries each repairConfig (ordinary, then must-turn-biased if present) at a per-config node
 *  budget (REPAIR_PROBE_ORDINARY_NODE_BUDGET / _BIASED_NODE_BUDGET — see their comment) split
 *  across activeGates by nodes consumed so far (mirrors the per-gate ms-budget split the
 *  full-budget repair loop in solveLevel uses, just node-counted and at much smaller totals).
 *  The outer per-gate/per-attempt ms budget (attBudget, below) stays a generous, effectively
 *  non-binding safety net — the node budget is what actually decides the probe's outcome. The
 *  ORDINARY config is additionally retried across REPAIR_PROBE_ORDINARY_SEED_SALTS (see its own
 *  comment) before moving on to the next config or giving up — every salt after the first only
 *  runs if every active gate already failed at every earlier salt; the must-turn-biased config
 *  always runs at a single seed (salt 0), unchanged from before this retry existed.
 *
 *  BUG FIXED 2026-07-17: `nodeBudget` (the caller's EXTERNAL SolveOpts.nodeBudget, offline-tooling
 *  only — see that field's own comment) was never threaded into this function at all, so the probe
 *  always ran its full internal worst case (ordinary tier up to REPAIR_PROBE_ORDINARY_SEED_SALTS.
 *  length × REPAIR_PROBE_ORDINARY_NODE_BUDGET, plus REPAIR_PROBE_BIASED_NODE_BUDGET on must-turn
 *  levels — up to ~10,000,000 nodes combined) regardless of how small an external budget the caller
 *  asked for. solveLevel()'s own re-check *after* the probe returns (`if
 *  (prep._metrics.nodesExpanded >= nodeBudget) ...`) only ever reports the overshoot, it can't
 *  prevent it. Confirmed at scale on the real corpus-2 batch workflow (`.github/workflows/solver-
 *  corpus2-batch-*.yml`'s `--node-budget=8000000` default): 621/621 repair-gated levels that hit
 *  `status: 'node-budget-reached'` had burned the probe's ~10,000,000-node worst case (exceeding
 *  the 8,000,000 external budget by ~25% every time) with EVERY attempt tagged `repair` — meaning
 *  the main DFS/beam loop, the full-budget repair fallback, and the attraction-diversity pass never
 *  ran AT ALL on any of them. This is the entire `repair-close`+`repair-far` unsolved-cluster
 *  population (`reports/stress/unsolved-failure-clusters.json`: 114 + 507 = 621, an exact match) —
 *  their "badness" telemetry and cluster classification reflect only how close the PROBE got, not
 *  the full pipeline. See reports/2026-07-17-repair-probe-node-budget-starvation.md for the full
 *  investigation. Fixed by checking the external nodeBudget before each seed-salt round (the
 *  smallest independently-costed probe unit) and bailing out early if it's already exhausted —
 *  same granularity/precision caveat as every other nodeBudget check in this file (can still
 *  overshoot by up to one seed-salt round's own cost, never by the full combined worst case). */
async function runRepairProbe(
    repairConfigs: AttemptConfig[], activeGates: number[], level: NormalizedLevel,
    prep: PrepLevel, yieldFn: YieldFn, cfg: AblationConfig | null, nodeBudget = Infinity,
    badnessGate = REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE, minScale = REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    const shrunkBiased: ShrunkBiasedTier[] = [];
    // REPAIR_PROBE_BIASED_NODE_BUDGET was calibrated (see its own comment) against exactly one
    // biased tier's worst case (repairMustTurnBiased, the only one that existed at the time). When a
    // second biased tier is also present (repairTurnBiased, under STRATEGY_REPAIR_TURN_BIAS, in
    // attempts.ts's non-exclusive predicted-then-fallback order), weight the fixed budget between
    // them by REPAIR_PROBE_PREDICTED_TIER_SHARE (see its own comment for why a plain 50/50 split and
    // full exclusion were both tried and rejected) instead of granting each the full amount — two
    // full-budget biased tiers running sequentially would otherwise burn double the calibrated cost
    // before the main loop/fallback ever gets a share of a bounded external nodeBudget (confirmed:
    // this starved the main loop's own attempts on a 2026-07-23 corpus-2 A/B — see
    // reports/2026-07-23-turnbias-corpus2-ab-validation.md). Byte-identical to before when only one
    // (or zero) biased tier is present, the common/production case. `biasedSeen` counts biased tiers
    // as they're encountered in `repairConfigs`' own order, which attempts.ts always builds
    // predicted-tier-first — so index 0 here always means "the predicted one," never an arbitrary
    // first-in-array accident.
    const biasedConfigCount = repairConfigs.filter(c => c.repairMustTurnBiased || c.repairTurnBiased).length;
    const biasedNodeBudgetForTier = (indexAmongBiased: number): number => {
        if (biasedConfigCount <= 1) return REPAIR_PROBE_BIASED_NODE_BUDGET;
        const share = indexAmongBiased === 0 ? REPAIR_PROBE_PREDICTED_TIER_SHARE : 1 - REPAIR_PROBE_PREDICTED_TIER_SHARE;
        return Math.floor(REPAIR_PROBE_BIASED_NODE_BUDGET * share);
    };
    let biasedSeen = 0;
    for (const repairConfig of repairConfigs) {
        // The turn-biased attempt, like the must-turn-biased one, is a heavier single-seed search
        // (see repair-search.ts) — give it the biased probe budget and a single seed salt.
        const isBiased = repairConfig.repairMustTurnBiased || repairConfig.repairTurnBiased;
        let fixedProbeNodeBudget = isBiased ? biasedNodeBudgetForTier(biasedSeen++) : REPAIR_PROBE_ORDINARY_NODE_BUDGET;
        // STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET (production default-ON as of 2026-08-13 —
        // see REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE's own comment for the full derivation):
        // scale the biased tier's node budget down when the ordinary tier's own live bestBadness
        // evidence (already reported by repairSearchFromGate on every failed attempt,
        // current-invocation only) shows no sign repair is close. Strict no-op whenever the
        // ordinary tier hasn't run, reported no finite badness, or already looks promising
        // (badness <= the gate). Standard (!cfg || cfg.FLAG) convention, NOT opt-in (cfg &&
        // cfg.FLAG === true) — matching PRUNE_MC_NEIGHBOR_BUDGET's and
        // STRATEGY_MAIN_LOOP_LATE_RESERVE's own promotions and the wiring-gap lesson both shipped
        // with (docs/solver-opt-in-experiment-ledger.md): the opt-in convention stays inert
        // whenever cfg is null, which is every production interactive solve and any CLI run
        // without --enable-flags.
        if (isBiased && (!cfg || cfg.STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET)) {
            const ordinaryBestBadness = attempts.reduce((min, a) => (
                a.repair && !a.repairMustTurnBiased && !a.repairTurnBiased && Number.isFinite(a.bestBadness)
                    ? Math.min(min, a.bestBadness as number) : min
            ), Infinity);
            if (Number.isFinite(ordinaryBestBadness)) {
                const scale = Math.min(1, Math.max(
                    minScale,
                    badnessGate / ordinaryBestBadness,
                ));
                const fullNodeBudget = fixedProbeNodeBudget;
                fixedProbeNodeBudget = Math.floor(fixedProbeNodeBudget * scale);
                // Record what was withheld so STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY can restore it
                // if every other tier later fails. Recorded even when the flag is off — this is
                // pure bookkeeping on an already-computed value, it changes no search behavior, and
                // making it conditional would mean the recovery tier's eligibility depended on two
                // flags instead of one.
                if (fixedProbeNodeBudget < fullNodeBudget) {
                    shrunkBiased.push({ config: repairConfig, fullNodeBudget, grantedNodeBudget: fixedProbeNodeBudget });
                }
            }
        }
        const seedSalts = (!isBiased && (!cfg || cfg.STRATEGY_REPAIR_PROBE_MULTI_SEED))
            ? REPAIR_PROBE_ORDINARY_SEED_SALTS : [0];
        for (const seedSalt of seedSalts) {
            // Cap THIS round's own node budget by whatever's left of the external ceiling, not just
            // check whether it's already been exceeded — a single round can cost up to
            // fixedProbeNodeBudget (2,000,000 ordinary / 6,000,000 biased) on its own, so a
            // start-of-round-only check that doesn't shrink the round's OWN budget would still let
            // one round blow straight through a much smaller remaining headroom (this was the
            // original version of this fix, caught by direct reproduction before landing: it left
            // nodesExpanded at 10,000,084 against an 8,000,000 external nodeBudget, unchanged from
            // the pre-fix behavior, because the check before the last round saw "4,000,038 used,
            // 8,000,000 budget, plenty of room" without accounting for the round's own 6,000,000 cost).
            const nodesSoFar = prep._metrics ? prep._metrics.nodesExpanded : 0;
            const remainingExternal = nodeBudget === Infinity ? Infinity : Math.max(0, nodeBudget - nodesSoFar);
            const probeNodeBudget = Math.min(fixedProbeNodeBudget, remainingExternal);
            if (probeNodeBudget < 50) return { solution: null, attempts, shrunkBiased };
            let nodesUsed = 0;
            for (let gi = 0; gi < activeGates.length; gi++) {
                const gateKey = activeGates[gi];
                const gatesLeft = activeGates.length - gi;
                const gateNodeBudget = Math.floor((probeNodeBudget - nodesUsed) / gatesLeft);
                if (gateNodeBudget < 50) break;
                // attBudget (ms) is a generous safety-net trip-wire only, well above any observed
                // real-world cost for a probe-worthy (node-budget-bounded) win — the node budget
                // above is the actual decision; this only guards against a pathological
                // per-node-cost level or a bug in the node-count mechanism itself. See
                // REPAIR_PROBE_ATTEMPT_MS_CAP's own comment: it must be generous enough to survive
                // real CPU contention too, not just a fast/idle host.
                const nodesOut: { nodesExpanded?: number } = {};
                const r = await runAttempt(gateKey, level, prep, repairConfig, REPAIR_PROBE_ATTEMPT_MS_CAP, Date.now(), yieldFn, gateNodeBudget, nodesOut, seedSalt);
                // repairProbe: true marks every attempt this function produces (see Attempt.repairProbe's
                // own comment) so external tooling can distinguish a probe-phase repair attempt's
                // bestBadness from the same repair config re-run later by the full-budget fallback loop.
                attempts.push(withSolverStage(r.attempt, 'repair-probe'));
                nodesUsed += nodesOut.nodesExpanded ?? gateNodeBudget;
                if (r.path) return { solution: r.path, attempts, shrunkBiased };
            }
        }
    }
    return { solution: null, attempts, shrunkBiased };
}


// The key-formatting logic itself lives in attempt-identity.mjs — the canonical, single
// implementation shared with scripts/portfolio-solve-sweep-lib.mjs's own attemptConfigKey (which
// starts from a persisted Attempt record, not a live AttemptConfig, so it normalizes to
// AttemptIdentityFields on its own side rather than importing this thin adapter).
export function attemptConfigKey(config: AttemptConfig): string {
    return formatAttemptIdentityKey({
        profileName: config.profileName, templateId: config.template?.id ?? null,
        beamWidth: config.beamWidth, diverseBeam: config.diverseBeam, repair: config.repair,
        repairMustTurnBiased: config.repairMustTurnBiased, repairTurnBiased: config.repairTurnBiased,
        admissibleOrder: config.admissibleOrder, admissibleOrderNoTieBreak: config.admissibleOrderNoTieBreak,
        admissibleOrderLds: config.admissibleOrderLds,
    });
}

function portfolioFeatureSummary(level: NormalizedLevel): Record<string, number> {
    return {
        reqInt: level.reqInt ?? 0,
        mustPass: level.mustPassKeys?.length ?? 0,
        mustCross: level.mustCrossKeys?.length ?? 0,
        mustTurn: level.mustPassTurnDirs?.size ?? 0,
        portals: level.portalMap?.size ?? 0,
        flippingFilters: level.flippingFilterMap?.size ?? 0,
    };
}

function portfolioFeatureGateMatches(level: NormalizedLevel, gate: NonNullable<PortfolioExperimentDefinition['conditionalPasses']>[number]['when']): boolean {
    const f = portfolioFeatureSummary(level);
    return (gate.minReqInt == null || f.reqInt >= gate.minReqInt)
        && (gate.minMustPass == null || f.mustPass >= gate.minMustPass)
        && (gate.minMustCross == null || f.mustCross >= gate.minMustCross)
        && (gate.minMustTurn == null || f.mustTurn >= gate.minMustTurn)
        && (gate.minPortals == null || f.portals >= gate.minPortals)
        && (gate.minFlippingFilters == null || f.flippingFilters >= gate.minFlippingFilters);
}

/**
 * Normalizes an externally-supplied ablation config into the one shape every downstream read
 * site can safely assume: either `null` (no ablation — the production/default fast path,
 * preserved byte-for-byte via `!cfg` checks throughout this file/repair-search.ts/scoring.ts/
 * prune-gauntlet.ts) or a fully-defaulted object where every flag not explicitly set by the
 * caller reads at its production default (most enabled, registered opt-ins disabled).
 *
 * Every one of those `(!cfg || cfg.SOME_FLAG)` read sites treats "no ablation config at all" as
 * the ONLY way an unset flag defaults to `true` — so a caller-supplied PARTIAL object (e.g.
 * `{ STRATEGY_REPAIR_PROBE: true }`) makes every OTHER unset flag read as `undefined` (falsy),
 * silently disabling it. This is exactly the bug SolveOpts's repairBudgetFractionOverride field
 * comment documents shipping to production once already, and the reason this file's own
 * attraction-diversity pass below builds its overlay config through a hand-rolled Proxy instead
 * of a plain `{ ...cfg }` spread. Both of `solveLevel`/`runPortfolioExperiment` funnel every
 * externally-supplied `opts.ablation` through here before it ever reaches `prep._cfg` — the only
 * place any read site ever gets a cfg from — so a sparse override is safe from ANY entry point
 * (production call, orchestration.test.ts, scripts/repair-direct-probe.mjs, future tooling)
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
    // Optional config properties commonly arrive as explicit `undefined` after object spreads.
    // Treat that exactly like omission; otherwise `{ STRATEGY_X: undefined }` disables a
    // default-on strategy while `{}` enables it, despite both representing "no override".
    const hasOwn = (prop: string) => Object.prototype.hasOwnProperty.call(raw, prop) && raw[prop] !== undefined;
    return new Proxy({} as AblationConfig, {
        get(_target, prop) {
            if (typeof prop !== 'string') return undefined;
            if (hasOwn(prop)) return raw[prop];
            if (ABLATION_NON_FLAG_KEYS.has(prop)) return undefined;
            return !OPT_IN_FEATURES.has(prop);
        },
        has(_target, prop) {
            return typeof prop === 'string' && hasOwn(prop);
        },
        getOwnPropertyDescriptor(_target, prop) {
            if (typeof prop !== 'string' || !hasOwn(prop)) return undefined;
            return { value: raw[prop], writable: true, enumerable: true, configurable: true };
        },
        ownKeys() {
            return Reflect.ownKeys(raw);
        },
    });
}

async function runAttemptSlice(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel, attemptConfig: AttemptConfig,
    capMs: number, yieldFn: YieldFn, metadata: Pick<Attempt, 'passNumber' | 'restart' | 'schedulerPhase'> = {},
): Promise<AttemptResult> {
    const result = await runAttempt(gateKey, level, prep, attemptConfig, capMs, Date.now(), yieldFn);
    result.attempt.configKey = attemptConfigKey(attemptConfig);
    Object.assign(result.attempt, metadata);
    if (metadata.schedulerPhase === 'portfolio') Object.assign(result.attempt, withSolverStage(result.attempt, 'portfolio-pass'));
    return result;
}

async function runPortfolioExperiment(
    level: NormalizedLevel, opts: SolveOpts, timeBudgetMs: number, yieldFn: YieldFn,
): Promise<SolveResult> {
    const experiment = opts.portfolioExperiment ?? PORTFOLIO_EXPERIMENT;
    const portfolioStart = Date.now();
    const prepStart = Date.now();
    const prep = prepLevel(level);
    if (opts.attemptSearchForTesting) testAttemptDispatches.set(prep, opts.attemptSearchForTesting);
    if (opts.connectivityRejectionObserver) prep._connectivityRejectionObserver = opts.connectivityRejectionObserver;
    const prepMs = Date.now() - prepStart;
    const cfg = normalizeAblationConfig(opts.ablation);
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = (opts.forcedFirstStepKey != null) ? opts.forcedFirstStepKey : null;
    prep._forcedPortalExitKey = (opts.forcedPortalExitKey != null) ? opts.forcedPortalExitKey : null;

    const baseConfigs = getConfiguredAttemptConfigs(level, cfg);
    const activeGates = getActiveGates(level, Array.isArray(level.gateKeys) ? level.gateKeys : [], cfg);
    const attempts: Attempt[] = [];
    const seen = new Map<string, Attempt>();
    let repeatedAttemptElapsedMs = 0;
    let repeatedPrefixNodeUpperBound = 0;

    const runPass = async (passNumber: number, capMs: number, allow: ((key: string) => boolean)): Promise<number[] | null> => {
        for (const attemptConfig of baseConfigs) {
            const configKey = attemptConfigKey(attemptConfig);
            if (!allow(configKey)) continue;
            for (const gateKey of activeGates) {
                const sliceKey = `${configKey}#${gateKey}`;
                const previous = seen.get(sliceKey);
                const result = await runAttemptSlice(gateKey, level, prep, attemptConfig, capMs, yieldFn, {
                    passNumber,
                    restart: !!previous,
                    schedulerPhase: 'portfolio',
                });
                if (previous) {
                    repeatedAttemptElapsedMs += previous.elapsedMs;
                    repeatedPrefixNodeUpperBound += previous.nodesExpanded ?? 0;
                }
                seen.set(sliceKey, result.attempt);
                attempts.push(result.attempt);
                if (result.path) return result.path;
            }
        }
        return null;
    };

    let solution = await runPass(1, experiment.pass1Ms, () => true);
    if (!solution) solution = await runPass(2, experiment.pass2Ms, key => experiment.pass2Configs.has(key));
    if (!solution) solution = await runPass(3, experiment.pass3Ms, key => experiment.pass3Configs.has(key));
    if (!solution && experiment.conditionalPasses) {
        for (const conditionalPass of experiment.conditionalPasses) {
            if (!portfolioFeatureGateMatches(level, conditionalPass.when)) continue;
            solution = await runPass(conditionalPass.passNumber, conditionalPass.capMs, key => conditionalPass.configs.has(key));
            if (solution) break;
        }
    }

    const portfolioAttemptSearchMs = () => attempts.reduce((sum, attempt) => sum + attempt.elapsedMs, 0);
    const portfolioRuntimeBreakdown = (totalMs: number, fallbackSearchMs = 0) => ({
        prepMs,
        portfolioAttemptSearchMs: portfolioAttemptSearchMs(),
        schedulerOverheadMs: Math.max(0, totalMs - prepMs - portfolioAttemptSearchMs() - fallbackSearchMs),
        fallbackSearchMs,
        totalMs,
    });

    if (solution) {
        const totalMs = Date.now() - portfolioStart;
        return {
            ok: true,
            status: 'success',
            solution,
            solutions: [solution],
            attempts,
            totalMs,
            nodesExpanded: prep._metrics.nodesExpanded,
            schedulerMode: 'portfolio-experiment',
            portfolio: { solvedBeforeFallback: true, fallbackAttemptCount: 0, repeatedAttemptElapsedMs, repeatedPrefixNodeUpperBound, runtimeBreakdown: portfolioRuntimeBreakdown(totalMs) },
        };
    }

    const fallback = await solveLevel(level, { ...opts, schedulerMode: 'legacy', timeBudgetMs });
    const fallbackAttempts = fallback.attempts.map(attempt => ({ ...attempt, schedulerPhase: 'fallback' as const }));
    const combinedAttempts = [...attempts, ...fallbackAttempts];
    const totalMs = Date.now() - portfolioStart;
    return {
        ...fallback,
        // The fallback owns the usual budget/deadline status, except that an error in an earlier
        // portfolio pass still makes an unsuccessful combined solve indeterminate.
        status: !fallback.ok && hasAttemptError(combinedAttempts) ? 'attempt-error' : fallback.status,
        attempts: combinedAttempts,
        totalMs,
        nodesExpanded: prep._metrics.nodesExpanded + fallback.nodesExpanded,
        schedulerMode: 'portfolio-experiment',
        portfolio: {
            solvedBeforeFallback: false,
            fallbackAttemptCount: fallback.attempts.length,
            repeatedAttemptElapsedMs,
            repeatedPrefixNodeUpperBound,
            runtimeBreakdown: portfolioRuntimeBreakdown(totalMs, fallback.totalMs),
        },
    };
}

export async function solveLevel(level: NormalizedLevel, opts: SolveOpts = {}): Promise<SolveResult> {
    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
    const nodeBudget = Number(opts.nodeBudget) > 0 ? Number(opts.nodeBudget) : Infinity;
    // The ladder always divides WORK, never wall clock. `timeBudgetMs` survives only as an outer
    // deadline that can truncate a solve, never as an input to an allocation or escalation
    // decision, so a solve is a function of (level, workBudget). See work-meter.ts.
    const explicitBaseWorkBudget = Number(opts.baseWorkBudget) > 0 ? Number(opts.baseWorkBudget) : null;
    const legacyWorkBudget = Number(opts.workBudget) > 0 ? Number(opts.workBudget) : null;
    if (explicitBaseWorkBudget !== null && legacyWorkBudget !== null && explicitBaseWorkBudget !== legacyWorkBudget) {
        throw new Error(`baseWorkBudget (${explicitBaseWorkBudget}) and legacy workBudget (${legacyWorkBudget}) disagree`);
    }
    const workBudget = explicitBaseWorkBudget ?? legacyWorkBudget ?? legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK);
    const yieldFn = typeof opts.yieldFn === 'function' ? opts.yieldFn : null;
    if (opts.schedulerMode === 'portfolio-experiment') {
        return runPortfolioExperiment(level, opts, timeBudgetMs, yieldFn);
    }
    const levelStartTime = Date.now();
    const prep = prepLevel(level);
    // This solve's own isolated counter (see PrepLevel._workMeter) — always 0 for a fresh prep, but
    // read explicitly rather than hardcoded, matching every other workStart-style snapshot in this
    // file and staying correct regardless of prepLevel()'s own initialization details.
    const workStart = prep._workMeter.units;
    // Opt-in only. Existing production behavior deliberately remains untouched until a matched
    // confirmation can measure the solve-set effect of converting additive passes to one cap.
    prep._strictWorkCap = opts.strictTotalWorkBudget ? workStart + workBudget : undefined;
    if (prep._strictWorkCap !== undefined) prep._workCap = prep._strictWorkCap;
    prep._attemptBudgetTelemetry = opts.attemptBudgetTelemetry === true || opts.lifecycleTelemetry === true
        || opts.strictTotalWorkBudget === true;
    if (opts.attemptSearchForTesting) testAttemptDispatches.set(prep, opts.attemptSearchForTesting);
    if (opts.connectivityRejectionObserver) prep._connectivityRejectionObserver = opts.connectivityRejectionObserver;
    const gateKeys = Array.isArray(level.gateKeys) ? level.gateKeys : [];

    // Ablation config: attach to prep so all inner functions can read it. Normalized (see
    // normalizeAblationConfig above) so a caller-supplied PARTIAL config can never silently
    // disable every other unset flag.
    const cfg = normalizeAblationConfig(opts.ablation);
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    // Offline tooling hook (hint-diversification audits): when set, the very first
    // move out of a gate is restricted to this single packed cell key. Read by
    // getNeighbors()'s callers in search.js only when pos === the gate it started from.
    // No effect on normal play/solve — opts.forcedFirstStepKey is never set in production.
    prep._forcedFirstStepKey = (opts.forcedFirstStepKey != null) ? opts.forcedFirstStepKey : null;
    // Same offline tooling hook, for the move immediately after a portal jump instead of
    // the gate. { from: portalDestKey, to: forcedNextKey }. Read by getNeighbors() in
    // search-state.js. No effect on normal play/solve — never set in production.
    prep._forcedPortalExitKey = (opts.forcedPortalExitKey != null) ? opts.forcedPortalExitKey : null;

    // Build attempt configs, then apply ablation profile/template filters and ordering overrides.
    const baseConfigs = getConfiguredAttemptConfigs(level, cfg);
    const activeGates = getActiveGates(level, gateKeys, cfg);

    // The repair fallback(s) (attempts.ts's needsRepairFallback / repairMustTurnBiasedAttempt) and
    // the admissible-order-search tier (attempts.ts's ADMISSIBLE_ORDER_PROFILES) are both pulled out
    // of the normal per-config loop and run afterward, each with its own extra budget
    // (REPAIR_EXTRA_BUDGET_FRACTION / ADMISSIBLE_ORDER_BUDGET_FRACTION) — mainConfigs excludes both
    // so neither competes for a share of timeBudgetMs. repairConfigs is absent on every level outside
    // its feature gate; admissibleOrderConfigs is present on every level (see that tier's own
    // unconditional-placement comment) unless STRATEGY_ADMISSIBLE_ORDER is explicitly disabled.
    const repairConfigs = baseConfigs.filter(c => c.repair);
    const admissibleOrderConfigs = baseConfigs.filter(c => c.admissibleOrder);
    // STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY's own config list (see that flag's own comment,
    // ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION) — 'default' excluded, since it already
    // gets a full unreduced shot in the admissible-order tier's own earlier pass and this tier never
    // reruns it.
    const admissibleOrderNonDefaultConfigs = admissibleOrderConfigs.filter(c => c.profileName !== 'default');
    const mainConfigs = baseConfigs.filter(c => !c.repair && !c.admissibleOrder);

    // opts.repairBudgetFractionOverride (NOT an ablation flag — see SolveOpts's field comment for
    // why) lets offline batch tooling shrink/grow the repair fallback's extra budget for a
    // faster/bounded dev-loop run, without touching the tuned production constant — absent (the
    // common case) preserves REPAIR_EXTRA_BUDGET_FRACTION exactly. Resolved here, before the early
    // probe below, rather than only just before the full-budget fallback loop further down: an
    // explicit 0 override means "no repair-related cost at all," and the probe is a repair-related
    // cost too (see its gate's own comment for why this matters).
    // Canonical budget-policy cascade (stage-budget.ts) — every retry-tier fraction/reserve/ceiling
    // computed in one place. See computeStageBudgetPlan's own doc for why this must run before the
    // repair probe (below): the admissible-order/dedup/etc. reserves have to shrink the ceiling
    // every EARLIER tier runs against, which only works if they're resolved up front.
    const stageBudgetPlan = computeStageBudgetPlan({
        opts, cfg, nodeBudget, timeBudgetMs,
        repairConfigsCount: repairConfigs.length,
        admissibleOrderConfigsCount: admissibleOrderConfigs.length,
        admissibleOrderNonDefaultConfigsCount: admissibleOrderNonDefaultConfigs.length,
        mainConfigsCount: mainConfigs.length,
        initialMustCrossMask: prep.initialMustCrossMask,
    });
    // Only the fields Part B's dispatch/telemetry actually READ are aliased here — every other
    // plan field (intermediate reserves, the *TierWillRun booleans buildSolverStagePlan reads
    // straight off stageBudgetPlan, the shrink-recovery inputs computeShrinkRecoveryBudget reads
    // straight off stageBudgetPlan) stays reachable on stageBudgetPlan itself without a redundant
    // local alias.
    const {
        repairBudgetFraction, diversityBudgetFraction, dedupRetryBudgetFraction, nonDefaultRetryBudgetFraction,
        connectivityRetryBudgetFraction, repairElitePrefixDfsRetryBudgetFraction, mcNeighborBudgetRetryBudgetFraction,
        admissibleOrderBudgetFraction, admissibleOrderTierWillRun, admissibleOrderNodeReserve,
        dedupRetryTierWillRun, dedupRetryNodeCeiling,
        nonDefaultRetryTierWillRun, nonDefaultRetryNodeCeiling,
        connectivityRetryTierWillRun, connectivityRetryNodeCeiling,
        repairElitePrefixDfsRetryTierWillRun, repairElitePrefixDfsRetryNodeCeiling,
        mcNeighborBudgetRetryTierWillRun, mcNeighborBudgetRetryNodeCeiling,
        repairLateProbeNodeBudget, repairLateProbeTierWillRun, repairLateProbeNodeCeiling,
        goalAttractionLegacyDistanceRetryBudgetFraction, goalAttractionLegacyDistanceRetryTierWillRun,
        goalAttractionLegacyDistanceRetryNodeCeiling,
        repairLateProbeMultiSeedRetryTierWillRun, repairLateProbeMultiSeedRetryNodeCeiling,
        retryTierStaircase, earlyTierNodeBudget, admissibleOrderDefaultProfileCeiling,
        mainLoopLateReserve, mainLoopEarlyNodeBudget, mainLoopLateConfigStart,
        mainLoopLateReserveEnabled, mainLoopLateReserveFraction, mainLoopLateReserveConfigCount,
        repairFallbackNodeReserve, attractionDiversityNodeReserve,
        shrinkRecoveryEnabled,
    } = stageBudgetPlan;
    // WORK-budget mirror of mainLoopLateReserve/mainLoopEarlyNodeBudget above (2026-08-26 fix for the
    // confirm-residual-001 scheduling gap -- see docs/solver-opt-in-experiment-ledger.md's
    // STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE row and
    // reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md's confirm-residual-001
    // subsection). MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT's protection for the trailing configs only ever
    // worked against the NODE dimension: runInterleavedAttempts/runGateSerialAttempts's own WORK-budget
    // stop conditions had no equivalent carve-out, so a work-expensive early config population could
    // exhaust `workBudget` while `nodeBudget` still had headroom, silently defeating the reserve --
    // confirmed directly on real generated levels in that confirmation attempt (25/25 archetype-
    // eligible-and-residual rows truncated after only 4 of 6 configs despite the node reserve
    // nominally protecting the trailing 5).
    //
    // Lives here, not in stage-budget.ts, because `workBudget` is a solveLevel-local input never
    // threaded into computeStageBudgetPlan (every other WORK-dimension computation -- workSpent,
    // gateBudget, attemptBudgetShare -- already lives in this file, not there). Same fraction and
    // config-count policy as the node-side reserve, mirrored onto the other resource dimension; see
    // that reserve's own comment (stage-budget.ts) for the eligibility/rounding-to-zero rationale,
    // which applies identically here.
    const mainLoopLateWorkReserveEligible = mainLoopLateReserveEnabled
        && mainLoopLateReserveFraction > 0
        && mainLoopLateReserveConfigCount > 0
        && workBudget !== Infinity;
    const mainLoopLateWorkReserve = mainLoopLateWorkReserveEligible
        ? Math.floor(workBudget * mainLoopLateReserveFraction)
        : 0;
    const mainLoopEarlyWorkBudget = mainLoopLateWorkReserve > 0
        ? workBudget - mainLoopLateWorkReserve
        : workBudget;
    // Canonical per-stage BudgetEnvelope projection of the same plan (stage-policy.ts) — every
    // node ceiling above is a bare scalar for the SAME reason dispatch reads it that way (see
    // buildStageBudgetEnvelopes's own doc); this object is the typed, stage-keyed record of those
    // same numbers, exposed on the result (see `finish`, opts.lifecycleTelemetry) for diagnostic
    // introspection rather than routed through at every dispatch call site.
    const stageBudgetEnvelopes = buildStageBudgetEnvelopes(stageBudgetPlan, { timeBudgetMs, nodeBudget });

    const finish = (solveResult: SolveResult): SolveResult => {
        if (!opts.lifecycleTelemetry) return solveResult;
        solveResult.stageBudgetEnvelopes = stageBudgetEnvelopes;
        // Order matters for `winningIndex`/`stoppedByDeadline` too, not just labeling — see
        // classifyAttemptTier's own doc comment for the precedence rationale.
        const classify = classifyAttemptTier;
        const hasRepairConfig = baseConfigs.some(config => config.repair);
        const hasMainConfig = baseConfigs.some(config => !config.repair && !config.admissibleOrder);
        const hasNonDefaultAdmissibleOrderConfig = baseConfigs.some(config => config.admissibleOrder && config.profileName !== 'default');
        // Canonical eligibility: buildSolverStagePlan (stage-plan.ts) pairs every SOLVER_STAGE_IDS
        // entry (stage-policy.ts) with the SAME eligibility booleans stageBudgetPlan computed and
        // the real dispatch below gates on — one canonical source, not a second hand-written
        // expression per stage. Stages this pre-probe plan cannot cover (prime, repair-probe-
        // shrink-recovery, the portfolio-only stages — see buildSolverStagePlan's own doc) report
        // `eligible: undefined` and are filtered out; every other stage is covered and in the
        // same declared order as before (stage-policy.ts's SOLVER_STAGE_IDS order matches this
        // telemetry's own historical row order exactly).
        const solverStagePlan = buildSolverStagePlan({ budgetPlan: stageBudgetPlan, mainLoopEligible: hasMainConfig });
        const runnable = new Map<string, boolean>(
            solverStagePlan
                .filter((entry): entry is typeof entry & { eligible: boolean } => entry.eligible !== undefined)
                .map(entry => [entry.spec.id === 'main-loop' ? 'main-ladder' : entry.spec.id, entry.eligible]),
        );
        const instantiated = new Map<string, boolean>([
            ['repair-probe', hasRepairConfig],
            ['main-ladder', hasMainConfig],
            ['repair-fallback', hasRepairConfig],
            ['attraction-diversity', hasMainConfig],
            ['admissible-order', baseConfigs.some(config => config.admissibleOrder)],
            ['dedup-near-tie-retry', hasMainConfig],
            ['admissible-order-non-default-retry', hasNonDefaultAdmissibleOrderConfig],
            ['connectivity-axis-exhausted-retry', hasMainConfig],
            ['repair-elite-prefix-dfs-retry', hasRepairConfig],
            ['mc-neighbor-budget-retry', hasMainConfig],
            // Inverted, deliberately: this tier's own structural precondition is the OPPOSITE of
            // repair-fallback's (see repairLateProbeTierWillRun's own comment) — it exists FOR
            // levels with no repair config in the ladder, not levels that have one.
            ['repair-late-probe', !hasRepairConfig],
        ]);
        const order = [...runnable.keys()];
        const lastTechnique = solveResult.attempts.length ? classify(solveResult.attempts.at(-1)!) : null;
        const winningIndex = solveResult.ok
            ? Math.max(0, order.indexOf(classify(solveResult.attempts.find(attempt => attempt.ok) ?? solveResult.attempts.at(-1)!)))
            : -1;
        solveResult.techniqueLifecycle = Object.fromEntries(order.map((name, index) => {
            const attempts = solveResult.attempts.filter(attempt => classify(attempt) === name);
            const reached = attempts.length > 0;
            const nodeStarvedAtDispatch = reached && attempts.every(attempt => attempt.allocatedNodeCeiling === 0);
            const workStarvedAtDispatch = reached && attempts.every(attempt => attempt.allocatedWorkCeiling === 0);
            const nodeStarved = runnable.get(name) === true && (nodeStarvedAtDispatch
                || (!reached && !solveResult.ok && solveResult.status === 'node-budget-reached'));
            const workStarved = runnable.get(name) === true && (workStarvedAtDispatch
                || (!reached && !solveResult.ok && solveResult.status === 'work-budget-reached'));
            return [name, {
                mechanicallyEligible: instantiated.get(name) === true,
                instantiated: instantiated.get(name) === true,
                reached,
                skippedBecauseSolvedEarlier: runnable.get(name) === true && solveResult.ok && !reached && index > winningIndex,
                starvedByNodeBudget: nodeStarved,
                starvedByWorkBudget: workStarved,
                skippedByRoutingOrConfiguration: runnable.get(name) !== true,
                exhaustedSearchSpace: reached && attempts.every(attempt => attempt.outcome === 'exhausted'),
                stoppedByDeadline: reached && solveResult.deadlineTruncated === true && name === lastTechnique,
                allocatedNodeCeilings: attempts.map(attempt => attempt.allocatedNodeCeiling ?? null),
                allocatedWorkCeilings: attempts.map(attempt => attempt.allocatedWorkCeiling ?? null),
                actualNodes: attempts.reduce((sum, attempt) => sum + Number(attempt.nodesExpanded ?? 0), 0),
                actualWork: attempts.every(attempt => attempt.workSpent != null)
                    ? attempts.reduce((sum, attempt) => sum + Number(attempt.workSpent), 0) : null,
                attempts: attempts.length,
                bestProgress: attempts.filter(attempt => attempt.bestBadness != null || attempt.finalBadness != null)
                    .map(attempt => ({ nodes: attempt.nodesExpanded ?? null, bestBadness: attempt.bestBadness ?? null, finalBadness: attempt.finalBadness ?? null })),
            }];
        }));
        return solveResult;
    };

    // Winner-first pre-attempt (opts.primeAttempt — offline re-verify tooling only; see the field's
    // own comment for the semantics and the solvability-vs-ordering verdict caveat). Runs exactly the
    // one baseline-recorded winning config at its gate before the probe/ladder; a hit skips all the
    // non-winning configs the ladder would otherwise try first. A miss (config key not in this
    // level's list, gate not active, or the attempt fails within its own bounded budget) falls
    // through to the normal probe/ladder — its node spend already counts toward the cumulative
    // budget like any other attempt, and (below) its own Attempt record is also preserved in
    // telemetry, not silently dropped. No effect when opts.primeAttempt is undefined (every
    // production/normal caller).
    // A missed prime's own attempt is recorded here and merged into every subsequent return path
    // below via probeAttempts (see its declaration a few lines down) — so a miss's search work is
    // fully visible in telemetry (attempts/nodesExpanded), not silently absorbed into "the ladder
    // just happened to run a bit longer."
    let primeMissAttempt: Attempt | null = null;
    if (opts.primeAttempt) {
        const primeConfig = baseConfigs.find(c => attemptConfigKey(c) === opts.primeAttempt!.configKey);
        if (primeConfig && activeGates.includes(opts.primeAttempt.gateKey)) {
            const primeNodeBudget = Number(opts.primeAttempt.nodeBudget) > 0 ? Number(opts.primeAttempt.nodeBudget) : nodeBudget;
            const primeSeedSalt = Number.isFinite(opts.primeAttempt.seedSalt) ? Number(opts.primeAttempt.seedSalt) : 0;
            const primeResult = await runAttempt(opts.primeAttempt.gateKey, level, prep, primeConfig, timeBudgetMs, Date.now(), yieldFn, primeNodeBudget, null, primeSeedSalt);
            Object.assign(primeResult.attempt, withSolverStage(primeResult.attempt, 'prime'));
            primeResult.attempt.configKey = opts.primeAttempt.configKey;
            if (primeResult.path) {
                const totalMs = Date.now() - levelStartTime;
                return finish({ ok: true, status: 'success', solution: primeResult.path, solutions: [primeResult.path], attempts: [primeResult.attempt], totalMs, nodesExpanded: prep._metrics.nodesExpanded, solvedByPrime: true, workSpent: prep._workMeter.units - workStart, workBudget });
            }
            primeMissAttempt = primeResult.attempt;
        }
    }
    const probeAttempts: Attempt[] = primeMissAttempt ? [primeMissAttempt] : [];
    let shrunkBiasedTiers: ShrunkBiasedTier[] = [];
    if (repairConfigs.length > 0 && repairBudgetFraction !== 0 && (!cfg || cfg.STRATEGY_REPAIR_PROBE)) {
        // No `prep._workCap` override here, deliberately: this probe runs BEFORE the main ladder
        // (`runInterleavedAttempts`/`runGateSerialAttempts`, below) ever executes, so — unlike every
        // tier further down this function — there is no earlier attempt that could have left a stale
        // cap for it to inherit. `prep._workCap` is genuinely unset (null) at this point in normal
        // (non-strict) mode; pinned by orchestration.test.ts's own
        // 'strictTotalWorkBudget installs one remaining-work cap across every additive path' test.
        const probe = await runRepairProbe(repairConfigs, activeGates, level, prep, yieldFn, cfg, mainLoopEarlyNodeBudget,
            opts.repairProbeAdaptiveBiasedBadnessGateOverride ?? REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE,
            opts.repairProbeAdaptiveBiasedMinScaleOverride ?? REPAIR_PROBE_ADAPTIVE_BIASED_MIN_SCALE);
        probeAttempts.push(...probe.attempts);
        shrunkBiasedTiers = probe.shrunkBiased ?? [];
        if (probe.solution) {
            const totalMs = Date.now() - levelStartTime;
            const nodesExpanded = prep._metrics.nodesExpanded;
            return finish({ ok: true, status: 'success', solution: probe.solution, solutions: [probe.solution], attempts: probeAttempts, totalMs, nodesExpanded, workSpent: prep._workMeter.units - workStart, workBudget });
        }
        // The probe now self-limits against the external nodeBudget (see runRepairProbe's own
        // comment) but only between seed-salt rounds, its smallest independently-costed unit — it
        // can still overshoot by up to one round's own cost, so re-check before spending any more
        // nodes in the main loop.
        //
        // Only an EARLY return when nothing is being held back for the admissible-order tier, the
        // repair-fallback reserve, OR the attraction-diversity reserve. With a reserve in play, a
        // probe that exhausts the early-tier ceiling must fall THROUGH to whichever tier it is rather
        // than end the solve — returning here would spend the reserve on nothing, which is the
        // precise failure this reserve exists to fix. Falling through is safe and needs no further
        // guards: the main loop's runners, the repair loop and the diversity pass each re-check their
        // own ceiling (`mainLoopNodeBudget` / `repairFallbackNodeCeiling` / `earlyTierNodeBudget`) and
        // no-op, so control reaches whichever tier has room having spent no extra nodes.
        if (prep._metrics.nodesExpanded >= mainLoopEarlyNodeBudget && admissibleOrderNodeReserve === 0 && mainLoopLateReserve === 0 && repairFallbackNodeReserve === 0 && attractionDiversityNodeReserve === 0) {
            const totalMs = Date.now() - levelStartTime;
            return finish({ ok: false, status: hasAttemptError(probeAttempts) ? 'attempt-error' : 'node-budget-reached', solution: null, solutions: [], attempts: probeAttempts, totalMs, nodesExpanded: prep._metrics.nodesExpanded, nodeBudgetReached: true, workSpent: prep._workMeter.units - workStart, workBudget });
        }
    }

    // Now that the probe has run, size STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY's reserve to the ACTUAL
    // debt it must repay. The recovery re-runs a shrunk config from scratch (repairSearchFromGate
    // has no resume API), so repaying only the withheld difference is not enough — it needs the
    // tier's FULL budget to reach the point the shrink cut off. Reserving `full - granted` was tried
    // first and measurably fails: on R00408 it left the recovery 2,812,495 nodes against the
    // 5,965,490 its winning attempt actually needs.
    //
    // Carved from `earlyTierNodeBudget` as a PEER of admissibleOrderNodeReserve rather than nested
    // inside `mainLoopLateReserve` (where the two opt-in reserves above sit): a full biased budget
    // is 6,000,000 nodes, larger than the whole late-reserve slice at any realistic ceiling, so a
    // nested slice structurally cannot fund this tier. Bounded by `shrinkRecoveryFraction` of the
    // early-tier ceiling so it can never starve the tiers it sits behind.
    const shrinkRecoveryBudget = computeShrinkRecoveryBudget(stageBudgetPlan, shrunkBiasedTiers);
    const { shrinkRecoveryNodeReserve, mainLoopNodeBudgetFinal, repairFallbackNodeCeiling, diversityNodeCeiling } = shrinkRecoveryBudget;

    // Multi-gate levels: interleave configs across gates (config-outer, gate-inner).
    // This prevents Gate 1 exhausting its full budget before Gate 2 ever gets to try
    // Config 1 — crucial when Gate 1 is structurally infeasible but parity-feasible.
    // Ablation: STRATEGY_GATE_INTERLEAVING can force the gate-outer (non-interleaved) loop.
    //
    // Deliberately timed from mainLoopStartTime (now), NOT levelStartTime: both main-loop
    // runners compute each attempt's share as timeBudgetMs minus elapsed-since-start, so
    // timing them from the original levelStartTime would let the probe's wall-clock silently
    // shrink the main loop's own budget — reintroducing exactly the "reserve budget up front"
    // regression mechanism REPAIR_EXTRA_BUDGET_FRACTION's own comment documents (S017). A
    // first version of this probe used levelStartTime here and was caught by a full-corpus
    // regression sweep: several fast main-loop solves (S038, S050, S026, S027, S110, S023,
    // S018) lost just enough of their first attempt's budget to fail it, cascading into the
    // full repair fallback chain (some 50-100x slower). mainLoopStartTime gives the main loop
    // its full, untouched timeBudgetMs window regardless of how long the probe ran.
    const useInterleaving = (!cfg || cfg.STRATEGY_GATE_INTERLEAVING);
    const mainLoopStartTime = Date.now();
    const result = useInterleaving && activeGates.length > 1
        ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainLoopStartTime, yieldFn, mainLoopNodeBudgetFinal, workBudget, workStart, mainLoopEarlyNodeBudget, mainLoopLateConfigStart, mainLoopEarlyWorkBudget)
        : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainLoopStartTime, yieldFn, mainLoopNodeBudgetFinal, workBudget, workStart, mainLoopEarlyNodeBudget, mainLoopLateConfigStart, mainLoopLateWorkReserveEligible ? mainLoopLateReserveFraction : 0);
    result.attempts = [...probeAttempts, ...result.attempts];
    const mainLoopEarlyTiersHitNodeCeiling = result.earlyNodeBudgetReached === true;
    const mainLoopEarlyTiersHitWorkCeiling = result.earlyWorkBudgetReached === true;

    // repairBudgetFraction was already resolved above (before the early probe) — reused here
    // unchanged for the full-budget fallback loop, same as before this fix. Checks against
    // `repairFallbackNodeCeiling`, NOT `earlyTierNodeBudget` directly, so this loop cannot spend the
    // attraction-diversity pass's own reserved slice — see ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's
    // own comment. Identical to `earlyTierNodeBudget` whenever that reserve is ineligible (default).
    //
    // FRESH, ADDITIVE `prep._workCap` override (2026-08-20 fix, same rationale as the early probe's
    // own override just above and repairElitePrefixDfsRetry's below): this loop's `runAttempt` calls
    // used to silently inherit whatever `prep._workCap` the main loop (or the probe just above) last
    // wrote, which can already be exhausted on exactly the levels this loop exists for.
    const repairFallbackTotalBudget = Math.floor(timeBudgetMs * repairBudgetFraction);
    const repairFallbackWorkBudget = legacyMsToWork(repairFallbackTotalBudget, MIN_ATTEMPT_WORK);
    await withWorkCapScope(prep, prep._workMeter.units + repairFallbackWorkBudget, async () => {
        for (const repairConfig of repairConfigs) {
            if (result.solution) break;
            if (prep._metrics!.nodesExpanded >= repairFallbackNodeCeiling) break;
            const repairTotalBudget = repairFallbackTotalBudget;
            const repairStart = Date.now();
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (prep._metrics!.nodesExpanded >= repairFallbackNodeCeiling) break;
                const gateKey = activeGates[gi];
                const elapsed = Date.now() - repairStart;
                const gatesLeft = activeGates.length - gi;
                const repairBudget = Math.floor((repairTotalBudget - elapsed) / gatesLeft);
                if (repairBudget < 50) break;
                // Remaining GLOBAL node budget, recomputed fresh before each call: repairSearchFromGate's
                // own nodeBudget param counts nodes LOCAL to that one call (nodesExpandedLocal starts at
                // 0 each time), so passing the external total directly would compare a per-call counter
                // against a whole-solve target — recomputing the remainder keeps it correct regardless
                // of how many nodes earlier attempts already spent.
                const remainingNodeBudget = repairFallbackNodeCeiling === Infinity ? Infinity : Math.max(0, repairFallbackNodeCeiling - prep._metrics!.nodesExpanded);
                const r = await runAttempt(gateKey, level, prep, repairConfig, repairBudget, Date.now(), yieldFn, remainingNodeBudget);
                result.attempts.push(withSolverStage(r.attempt, 'repair-fallback'));
                if (r.path) { result.solution = r.path; break; }
            }
        }
    });

    // Last-resort attraction-diversity pass (ATTRACTION_DIVERSITY_BUDGET_FRACTION, attempts.ts's
    // ATTRACTION_DIVERSITY_CANDIDATE_FLAGS) — a whole extra rerun of the SAME mainConfigs ladder,
    // with the candidate scoring flag(s) disabled for its duration, only after the main loop AND
    // repair fallback have both already failed on every gate. See the fraction constant's own
    // comment for why a whole-ladder rerun (not one narrow attempt) is needed, and why the budget
    // is small and strictly additive, same pattern as the repair loop just above.
    //
    // opts.attractionDiversityBudgetFractionOverride is its OWN dedicated override, deliberately
    // separate from repairBudgetFractionOverride (see that field's own comment on SolveOpts for
    // why) — solver-controller.ts / review-controller.ts pass 0 for both, to keep their interactive
    // progress bar's ~30s promise; a solver-testing sweep can pass 0 for just this one to isolate
    // repair's own cost, or 0 for repair's while leaving this one at its default to isolate this
    // pass's own cost. opts.disableExtraBudgetPasses is a purely-additive convenience that sets
    // 0 for both at once (see its own comment on SolveOpts) — prefer it over remembering both
    // individual overrides unless a sweep specifically needs to isolate just one.
    // (diversityBudgetFraction itself is resolved earlier, alongside repairBudgetFraction — see that
    // resolution's own comment for why ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's eligibility check
    // needs it before this point.)
    if (!result.solution && diversityBudgetFraction > 0 && (!cfg || cfg.STRATEGY_ATTRACTION_DIVERSITY) && prep._metrics.nodesExpanded < earlyTierNodeBudget) {
        // SCORE_* flags don't affect getConfiguredAttemptConfigs's config selection (only
        // STRATEGY_*/PROFILE_*/TEMPLATE_* do), so reusing mainConfigs (built under the original
        // cfg) under the executor's overridden prep._cfg selects the exact same attempts the
        // diagnosis's own full re-solve-with-ablation would have selected.
        //
        // NODE CEILING: `diversityNodeCeiling`, not a remaining/relative value — unlike the repair
        // loop just above (which calls runAttempt -> repairSearchFromGate, whose own nodeBudget
        // param counts nodes LOCAL to that one call), runInterleavedAttempts/runGateSerialAttempts
        // (which this executor calls) check nodeBudget directly against the GLOBAL cumulative
        // prep._metrics.nodesExpanded — an absolute ceiling, same as the main loop's own call to
        // these same functions above. `earlyTierNodeBudget` rather than plain `nodeBudget`: the
        // reduced ceiling this pass shares with the other early tiers, so it cannot spend the
        // admissible-order tier's reserve.
        //
        // WORK POOL: the OUTER, already-depleting (workBudget, workStart) — unlike every promoted
        // retry tier below, deliberately NOT a fresh one (this pass predates that fix and has never
        // been re-measured with it; see dedup-near-tie-retry's own call site for why a fresh pool
        // matters for a tier whose ceiling is genuinely protected but whose work share isn't).
        const diversityResult = await runWholeLadderRetryTier({
            stageId: 'attraction-diversity',
            proxyOverrides: Object.fromEntries((ATTRACTION_DIVERSITY_CANDIDATE_FLAGS as readonly string[]).map(flag => [flag, false])),
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: Math.floor(timeBudgetMs * diversityBudgetFraction),
            nodeCeiling: diversityNodeCeiling, workBudget, workStart,
            staircase: retryTierStaircase,
        });
        result.attempts.push(...diversityResult.attempts);
        if (diversityResult.solution) result.solution = diversityResult.solution;
    }

    // STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY: restore what the adaptive shrink withheld, but only
    // once the main loop, repair fallback and attraction-diversity pass have all already failed —
    // see REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION's own comment for why the placement
    // (not an immediate retry) is what preserves the shrink's savings, and why the tier needs its
    // own withheld slice rather than a reorder.
    //
    // Re-runs each shrunk config at its FULL budget: repairSearchFromGate's trajectory for a larger
    // budget strictly extends the smaller one's (pure function of (gateKey, level, prep, profile,
    // budget), seeded only from gateKey), so this replays the already-granted prefix and then
    // continues into exactly the search the shrink cut off. Strict no-op when nothing was shrunk.
    if (!result.solution && shrunkBiasedTiers.length > 0 && shrinkRecoveryEnabled
        && prep._metrics.nodesExpanded < earlyTierNodeBudget) {
        for (const shrunk of shrunkBiasedTiers) {
            if (result.solution) break;
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (result.solution) break;
                // `earlyTierNodeBudget` (absolute, cumulative) is this tier's own ceiling, so it may
                // spend its reserved slice plus whatever the earlier tiers left unused — exactly the
                // pattern the diversity pass already uses against its own ceiling.
                // The reserve is a FLOOR, not merely a derived remainder. Every node check in this
                // file is round-granular and may overshoot its ceiling by up to one attempt's own
                // cost ("can still overshoot by up to one round's own cost" — see runRepairProbe's
                // own comment), and a single main-loop attempt can be tens of millions of nodes. On
                // R00408 the main loop overshot its reduced ceiling by ~375,000 nodes and ate that
                // much of this tier's slice, leaving 5,624,791 against the 5,965,490 its winning
                // attempt needs — the tier fired and still failed by ~340,000 nodes. Taking the max
                // of the plain remainder and the reserve makes the withheld slice actually
                // withheld; the overshoot then comes out of the total rather than out of this tier.
                // Still hard-bounded by the true external ceiling, so nodeBudget is never exceeded.
                const remainingEarly = earlyTierNodeBudget === Infinity
                    ? Infinity
                    : Math.max(0, earlyTierNodeBudget - prep._metrics.nodesExpanded);
                const remainingTotal = nodeBudget === Infinity
                    ? Infinity
                    : Math.max(0, nodeBudget - prep._metrics.nodesExpanded);
                const remaining = Math.min(remainingTotal, Math.max(remainingEarly, shrinkRecoveryNodeReserve));
                if (remaining < 50) break;
                const gatesLeft = activeGates.length - gi;
                const gateNodeBudget = Math.min(shrunk.fullNodeBudget, Math.floor(remaining / gatesLeft));
                if (gateNodeBudget <= shrunk.grantedNodeBudget) break;
                const nodesOut: { nodesExpanded?: number } = {};
                const r = await runAttempt(activeGates[gi], level, prep, shrunk.config, REPAIR_PROBE_ATTEMPT_MS_CAP,
                    Date.now(), yieldFn, gateNodeBudget, nodesOut);
                result.attempts.push(withSolverStage(r.attempt, 'repair-probe-shrink-recovery'));
                if (r.path) result.solution = r.path;
            }
        }
    }

    // Last-resort admissible-order-search tier (ADMISSIBLE_ORDER_BUDGET_FRACTION, attempts.ts's
    // ADMISSIBLE_ORDER_PROFILES), only after the main loop, repair fallback, AND attraction-diversity
    // pass have all already failed on every gate. EACH profile gets its OWN full, unshared budget
    // slice, divided across gates only (never diluted by sibling profiles) — same per-config,
    // per-gate-division, early-exit shape as the repair fallback loop above, NOT the attraction-
    // diversity pass's single combined rerun. This matters because every one of this technique's
    // validated solves was found with its own full per-profile budget standalone (method-probe.mjs's
    // `--only=ida:<one profile>` runs, never multiple profiles sharing one call) — an earlier version
    // of this wiring ran every listed profile through ONE combined runInterleavedAttempts/
    // runGateSerialAttempts call sharing ADMISSIBLE_ORDER_BUDGET_FRACTION's single total, which
    // starved 'default' (this technique's largest contributor, 103 of 115 validated solves) well
    // below its validated condition — confirmed directly: several already-validated 'default'-profile
    // solves failed to reproduce through the real solveLevel() ladder until this per-config
    // restructure. See that constant's own comment for the worst-case-time tradeoff this accepts.
    // Whether the node ceiling actually STOPPED an earlier tier, sampled here — after the diversity
    // pass, before the admissible-order tier spends the reserve. Without this, the reserve would
    // corrupt the `nodeBudgetReached` signal: a level whose early tiers were cut off at
    // `earlyTierNodeBudget` but whose admissible-order tier then exhausts its own search naturally
    // (below the full `nodeBudget`) would report `nodeBudgetReached: false` / status 'failed' —
    // claiming the ladder ran to completion when in fact the ceiling truncated most of it. Batch
    // tooling reads that flag to tell "budget-limited" from "searched out", so the distinction is
    // load-bearing, and getting it wrong understates how many levels are still budget-limited.
    const earlyTiersHitNodeCeiling = earlyTierNodeBudget !== Infinity
        && prep._metrics.nodesExpanded >= earlyTierNodeBudget;

    // admissibleOrderBudgetFraction / admissibleOrderTierWillRun were resolved above, before the
    // probe, because the node reserve they gate has to shrink every earlier tier's ceiling. This
    // loop's own condition is `admissibleOrderTierWillRun`, the exact predicate the reserve was
    // computed from — the two MUST stay in lockstep, or the solve either strands reserved nodes
    // (reserved, tier skipped) or gives the tier a slice that was never withheld (tier runs, no
    // reserve). Note this tier alone still checks the FULL `nodeBudget`: that difference is the fix.
    if (admissibleOrderTierWillRun) {
        for (const admissibleOrderConfig of admissibleOrderConfigs) {
            if (result.solution) break;
            // 'default' checks its own reduced ceiling (admissibleOrderDefaultProfileCeiling); every
            // other profile checks the full nodeBudget, unchanged — see
            // ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION's own comment. Equals nodeBudget whenever
            // that reserve is ineligible (default OFF), so this is a strict no-op in that case.
            const profileCeiling = admissibleOrderConfig.profileName === 'default'
                ? admissibleOrderDefaultProfileCeiling
                : nodeBudget;
            if (prep._metrics.nodesExpanded >= profileCeiling) break;
            const admissibleOrderTotalBudget = Math.floor(timeBudgetMs * admissibleOrderBudgetFraction);
            const admissibleOrderStart = Date.now();
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (prep._metrics.nodesExpanded >= profileCeiling) break;
                const gateKey = activeGates[gi];
                const elapsed = Date.now() - admissibleOrderStart;
                const gatesLeft = activeGates.length - gi;
                const admissibleOrderBudget = Math.floor((admissibleOrderTotalBudget - elapsed) / gatesLeft);
                if (admissibleOrderBudget < 50) break;
                // Remaining GLOBAL node budget — see the repair fallback loop's identical recompute.
                const remainingNodeBudget = profileCeiling === Infinity ? Infinity : Math.max(0, profileCeiling - prep._metrics.nodesExpanded);
                const r = await runAttempt(gateKey, level, prep, admissibleOrderConfig, admissibleOrderBudget, Date.now(), yieldFn, remainingNodeBudget);
                result.attempts.push(withSolverStage(r.attempt, 'admissible-order'));
                if (r.path) { result.solution = r.path; break; }
            }
        }
    }

    // Last-resort dedup-near-tie-retry pass (DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION,
    // STRATEGY_DEDUP_NEAR_TIE_RETRY) — see that flag's own comment in ablation-config.ts and
    // DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION's own comment above for the full rationale. Same
    // Proxy-override shape as the attraction-diversity pass above, toggling
    // STRATEGY_DEDUP_NEAR_TIE_RETENTION instead of SCORE_GOAL_ATTRACTION. PROMOTED to default-ON (see
    // the constant's own comment) — the flag check below (`!cfg ||` ...) is the standard default-on
    // convention, so this block runs for every caller unless `disableExtraBudgetPasses: true` zeroes
    // its budget fraction (both interactive solve UIs) or `cfg` explicitly disables the flag.
    //
    // REVISION 3 (2026-08-15, same day as REVISION 2 above): moved to run LAST — after repair-probe-
    // shrink-recovery AND the admissible-order tier, not before them — because REVISION 2's additive
    // `dedupRetryNodeCeiling` created a NEW starvation bug the moment it was tested locally against
    // three of the 65 REVISION-1 collateral levels (R00050/R00059/R00238, all solved via `ida:default`
    // in the with-fix baseline, needing 37.6M-48.4M of the 50M ceiling): with this tier positioned
    // BEFORE the admissible-order tier, its own extended ceiling let it burn `prep._metrics.
    // nodesExpanded` all the way past the original `nodeBudget` (up to `nodeBudget +
    // dedupRetryNodeReserve`) on every one of the ~1666 levels that don't need it — and the
    // admissible-order tier's own entry guard (`nodesExpanded >= profileCeiling`, itself derived from
    // plain `nodeBudget`, unaware of dedupRetryNodeCeiling) then trips immediately, skipping the tier
    // ENTIRELY rather than merely shrinking its share. Extending one tier's ceiling doesn't help if a
    // LATER tier's own guard still checks the unextended `nodeBudget` — the fix has to be "run last, so
    // nothing downstream can be starved" rather than "run early with a bigger ceiling." This is the
    // SAME class of bug CLAUDE.md's node-budget gotcha describes (one cumulative counter, provisioning
    // a tier doesn't provision anyone after it) in a new shape: here the provisioned tier itself was
    // the one doing the starving, by running too EARLY rather than by being under-reserved.
    //
    // With this reorder, every earlier tier (main loop, repair fallback, attraction-diversity,
    // repair-probe-shrink-recovery, admissible-order) is COMPLETELY unaffected by this tier's
    // existence — none of their own ceilings reference dedupRetryNodeReserve or dedupRetryNodeCeiling
    // at all (see earlyTierNodeBudget's own comment). This tier's additive extension only ever spends
    // room past every other tier's own full-strength, unshrunk attempt — genuine bonus room, not
    // borrowed from (or lent to) anyone. This reordering, combined with the additive reserve above,
    // IS what full-corpus GHA run 31902837955 validated (764/1700, +40, zero losses) — see
    // DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION's own PROMOTION comment for the result.
    // `dedupRetryTierWillRun` is the SAME predicate dedupRetryNodeReserve is derived from — the two
    // must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history: drift either way
    // strands the reserve or spends one that was never allocated).
    if (!result.solution && dedupRetryTierWillRun && prep._metrics.nodesExpanded < dedupRetryNodeCeiling) {
        // FRESH, ADDITIVE work allocation — deliberately NOT (workBudget, workStart) shared with
        // every earlier tier. That shared pool is already largely spent by the time this tier runs
        // (main loop + repair fallback + attraction-diversity + admissible-order all draw from it),
        // which starves runGateSerialAttempts/runInterleavedAttempts's own work-based
        // attemptBudgetShare split even though dedupRetryNodeReserve genuinely protected the NODE
        // ceiling — found directly: R00180's winning config (beam:objectiveFirst@beam5000
        // (diverse), needs ~5.1M nodes) got only 3.7M WORK units under the shared pool (vs. 10.9M
        // when the ordinary main loop tries the identical config with a full pool), well short given
        // a node costs more than 1 work unit. Same "extend, don't carve from the existing pool"
        // philosophy REPAIR_EXTRA_BUDGET_FRACTION's own comment documents for wall time, applied to
        // work: a fresh `prep._workMeter.units` mark plus a work budget sized off this tier's own ms
        // allocation via the legacy ms-to-work conversion, the same conversion solveLevel's own top-level
        // workBudget uses when a caller doesn't supply one explicitly.
        const dedupRetryTotalBudget = Math.floor(timeBudgetMs * dedupRetryBudgetFraction);
        const dedupRetryResult = await runWholeLadderRetryTier({
            stageId: 'dedup-near-tie-retry', proxyOverrides: { STRATEGY_DEDUP_NEAR_TIE_RETENTION: false },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: dedupRetryTotalBudget, nodeCeiling: dedupRetryNodeCeiling,
            workBudget: legacyMsToWork(dedupRetryTotalBudget, MIN_ATTEMPT_WORK),
            workStart: prep._workMeter.units,
            staircase: retryTierStaircase,
        });
        result.attempts.push(...dedupRetryResult.attempts);
        if (dedupRetryResult.solution) result.solution = dedupRetryResult.solution;
    }

    // Last-resort admissible-order non-default-profile retry pass
    // (ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION, STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_
    // RETRY) — see that flag's own comment in ablation-config.ts and the constant's own comment
    // above for the full rationale. PROMOTED to default-ON (see the constant's own comment) — the
    // flag check below (`!cfg ||` ...) is the standard default-on convention, so this block runs for
    // every caller unless `disableExtraBudgetPasses: true` zeroes its budget fraction (both
    // interactive solve UIs) or `cfg` explicitly disables the flag.
    //
    // Positioned dead last — AFTER the dedup-near-tie-retry tier above, for the identical reason that
    // tier itself was moved to run after the admissible-order tier (REVISION 3, see
    // dedupRetryNodeReserve's own comment): nothing may run after this tier that still checks an
    // unextended `nodeBudget`/`earlyTierNodeBudget`-derived ceiling, or this tier's own additive
    // extension would starve it. Nothing does — this is the true end of the ladder.
    //
    // `nonDefaultRetryTierWillRun` is the SAME predicate nonDefaultRetryNodeReserve is derived from —
    // the two must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history: drift
    // either way strands the reserve or spends one that was never allocated).
    if (!result.solution && nonDefaultRetryTierWillRun && prep._metrics.nodesExpanded < nonDefaultRetryNodeCeiling) {
        // FRESH, ADDITIVE `prep._workCap` override — same "extend, don't share the depleted pool"
        // philosophy as dedupRetryWorkStart/dedupRetryWorkBudget above, applied here even though this
        // tier calls `runAttempt` directly (like the admissible-order tier's own per-profile loop)
        // rather than through runInterleavedAttempts/runGateSerialAttempts's shared-pool
        // attemptBudgetShare machinery dedup-retry's bug came from. `prep._workCap` is still a SINGLE
        // mutable field those two functions last wrote before this tier runs (from the main loop,
        // ordinarily) — nothing resets it fresh for a `runAttempt`-direct caller positioned this late,
        // so without this override this tier would silently inherit a stale, likely-already-exceeded
        // cap and find nothing regardless of its own node ceiling. withWorkCapScope owns/restores the
        // compatibility field lexically so no later stage can inherit this tier's cap.
        const nonDefaultRetryTotalBudget = Math.floor(timeBudgetMs * nonDefaultRetryBudgetFraction);
        const nonDefaultRetryWorkBudget = legacyMsToWork(nonDefaultRetryTotalBudget, MIN_ATTEMPT_WORK);
        await withWorkCapScope(prep, prep._workMeter.units + nonDefaultRetryWorkBudget, async () => {
            // Same per-profile/per-gate loop shape as the admissible-order tier's own pass above
            // (deliberately NOT a single combined runInterleavedAttempts/runGateSerialAttempts call —
            // see that tier's own comment for why: every validated admissible-order solve was found
            // with its own full per-profile budget standalone). 'default' is excluded from
            // admissibleOrderNonDefaultConfigs entirely (see that list's own comment) — it already had
            // its full, unreduced shot above and is never retried here.
            for (const admissibleOrderConfig of admissibleOrderNonDefaultConfigs) {
                if (result.solution) break;
                if (prep._metrics!.nodesExpanded >= nonDefaultRetryNodeCeiling) break;
                const retryStart = Date.now();
                for (let gi = 0; gi < activeGates.length; gi++) {
                    if (prep._metrics!.nodesExpanded >= nonDefaultRetryNodeCeiling) break;
                    const gateKey = activeGates[gi];
                    const elapsed = Date.now() - retryStart;
                    const gatesLeft = activeGates.length - gi;
                    const retryBudget = Math.floor((nonDefaultRetryTotalBudget - elapsed) / gatesLeft);
                    if (retryBudget < 50) break;
                    const remainingNodeBudget = nonDefaultRetryNodeCeiling === Infinity
                        ? Infinity
                        : Math.max(0, nonDefaultRetryNodeCeiling - prep._metrics!.nodesExpanded);
                    const r = await runAttempt(gateKey, level, prep, admissibleOrderConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget);
                    result.attempts.push(withSolverStage(r.attempt, 'admissible-order-non-default-retry'));
                    if (r.path) { result.solution = r.path; break; }
                }
            }
        });
    }

    // Last-resort connectivity-axis-exhausted retry pass (CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_
    // FRACTION, STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY) — see that flag's own comment in
    // ablation-config.ts and the constant's own comment above for the full rationale. Same
    // Proxy-override shape as the dedup-near-tie-retry pass above, toggling
    // PRUNE_CONNECTIVITY_AXIS_EXHAUSTED instead of STRATEGY_DEDUP_NEAR_TIE_RETENTION. PROMOTED to
    // default-ON (2026-08-16, run 31918095910: corpus1 95/95 unchanged, corpus2 +10/-0) - the flag
    // check below (`!cfg ||` ...) is the promoted-default convention, matching its two sibling tiers;
    // an explicit `{STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: false}` still disables it.
    //
    // Positioned dead last — AFTER the admissible-order-non-default-retry tier above, the current
    // true end of the ladder — for the identical reason both prior retry tiers were placed there:
    // nothing may run after this one that still checks an unextended `nodeBudget`/
    // `earlyTierNodeBudget`-derived ceiling, or this tier's own additive extension would starve it.
    //
    // `connectivityRetryTierWillRun` is the SAME predicate connectivityRetryNodeReserve is derived
    // from — the two must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history:
    // drift either way strands the reserve or spends one that was never allocated).
    if (!result.solution && connectivityRetryTierWillRun && prep._metrics.nodesExpanded < connectivityRetryNodeCeiling) {
        // FRESH, ADDITIVE work allocation — same "extend, don't share the depleted pool" philosophy
        // as dedup-near-tie-retry's own call site above (that tier's own history: sharing the
        // depleting (workBudget, workStart) pool with every earlier tier starved its attempts of
        // work even when the node reserve genuinely protected the node ceiling).
        const connectivityRetryTotalBudget = Math.floor(timeBudgetMs * connectivityRetryBudgetFraction);
        const connectivityRetryResult = await runWholeLadderRetryTier({
            stageId: 'connectivity-axis-exhausted-retry', proxyOverrides: { PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: connectivityRetryTotalBudget, nodeCeiling: connectivityRetryNodeCeiling,
            workBudget: legacyMsToWork(connectivityRetryTotalBudget, MIN_ATTEMPT_WORK),
            workStart: prep._workMeter.units,
            staircase: retryTierStaircase,
        });
        result.attempts.push(...connectivityRetryResult.attempts);
        if (connectivityRetryResult.solution) result.solution = connectivityRetryResult.solution;
    }

    // Last-resort repair-elite-prefix-DFS retry pass (REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_
    // FRACTION, STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY) — see that flag's own comment in
    // ablation-config.ts and the constant's own comment above for the full rationale. Unlike the
    // three tiers above (which rerun `mainConfigs` via runInterleavedAttempts/runGateSerialAttempts,
    // or the admissible-order-non-default-retry tier's own per-profile loop over admissible-order
    // configs), this reruns `repairConfigs` via the SAME per-config/per-gate manual loop shape as
    // the ordinary repair fallback loop above, with `prep._cfg` Proxy-overridden to force
    // `STRATEGY_REPAIR_ELITE_PREFIX_DFS: true` — the OPPOSITE polarity from every tier above (each
    // of which disables a flag; this one enables one). Opt-in/default-OFF (NEW, unvalidated
    // mechanism) — the flag check below (`cfg &&` ... `=== true`) is the opt-in convention, so this
    // block is a strict no-op for every production/interactive caller (cfg null) until explicitly
    // enabled.
    //
    // Positioned dead last — AFTER the connectivity-axis-exhausted-retry tier above, the current
    // true end of the ladder — for the identical reason all three tiers above were placed there:
    // nothing may run after this one that still checks an unextended ceiling, or this tier's own
    // additive extension would starve it.
    //
    // `repairElitePrefixDfsRetryTierWillRun` is the SAME predicate repairElitePrefixDfsRetryNodeReserve
    // is derived from — the two must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own
    // history: drift either way strands the reserve or spends one that was never allocated).
    if (!result.solution && repairElitePrefixDfsRetryTierWillRun && prep._metrics.nodesExpanded < repairElitePrefixDfsRetryNodeCeiling) {
        const originalCfg = prep._cfg;
        const repairElitePrefixDfsRetryCfg = buildRetryTierAblationOverride(originalCfg, { STRATEGY_REPAIR_ELITE_PREFIX_DFS: true });
        prep._cfg = repairElitePrefixDfsRetryCfg;
        // FRESH, ADDITIVE work scope — same "extend, don't share the depleted pool" philosophy as
        // the non-default-retry tier above, but with lexical ownership/restoration.
        const repairElitePrefixDfsRetryTotalBudget = Math.floor(timeBudgetMs * repairElitePrefixDfsRetryBudgetFraction);
        const repairElitePrefixDfsRetryWorkBudget = legacyMsToWork(repairElitePrefixDfsRetryTotalBudget, MIN_ATTEMPT_WORK);
        try {
            await withWorkCapScope(prep, prep._workMeter.units + repairElitePrefixDfsRetryWorkBudget, async () => {
                // Same per-config/per-gate loop shape as the ordinary repair fallback loop above.
                for (const repairConfig of repairConfigs) {
                    if (result.solution) break;
                    if (prep._metrics!.nodesExpanded >= repairElitePrefixDfsRetryNodeCeiling) break;
                    const retryStart = Date.now();
                    for (let gi = 0; gi < activeGates.length; gi++) {
                        if (prep._metrics!.nodesExpanded >= repairElitePrefixDfsRetryNodeCeiling) break;
                        const gateKey = activeGates[gi];
                        const elapsed = Date.now() - retryStart;
                        const gatesLeft = activeGates.length - gi;
                        const retryBudget = Math.floor((repairElitePrefixDfsRetryTotalBudget - elapsed) / gatesLeft);
                        if (retryBudget < 50) break;
                        const remainingNodeBudget = repairElitePrefixDfsRetryNodeCeiling === Infinity
                            ? Infinity
                            : Math.max(0, repairElitePrefixDfsRetryNodeCeiling - prep._metrics!.nodesExpanded);
                        const r = await runAttempt(gateKey, level, prep, repairConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget);
                        result.attempts.push(withSolverStage(r.attempt, 'repair-elite-prefix-dfs-retry'));
                        if (r.path) { result.solution = r.path; break; }
                    }
                }
            });
        } finally {
            prep._cfg = originalCfg;
        }
    }

    // Last-resort must-cross-neighbor-budget retry pass (MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION,
    // STRATEGY_MC_NEIGHBOR_BUDGET_RETRY) — see that flag's own comment in ablation-config.ts and the
    // constant's own comment above for the full rationale. Same Proxy-override, same mainConfigs
    // rerun shape as the dedup-near-tie-retry and connectivity-axis-exhausted-retry passes above,
    // toggling PRUNE_MC_NEIGHBOR_BUDGET instead. PROMOTED to default-ON (2026-08-19) — the flag check
    // in `mcNeighborBudgetRetryTierWillRun` now uses the standard opt-OUT convention (`!cfg ||
    // cfg.FLAG`), so this block runs for every production/interactive caller (cfg null) by default,
    // same as its three promoted siblings; still gated on `prep.initialMustCrossMask !== 0`
    // regardless (soundness, not polarity).
    //
    // Positioned dead last — AFTER the repair-elite-prefix-DFS-retry tier above, the current true end
    // of the ladder — for the identical reason all four tiers above were placed there: nothing may
    // run after this one that still checks an unextended `nodeBudget`/`earlyTierNodeBudget`-derived
    // ceiling, or this tier's own additive extension would starve it.
    //
    // `mcNeighborBudgetRetryTierWillRun` is the SAME predicate mcNeighborBudgetRetryNodeReserve is
    // derived from — including its `initialMustCrossMask` eligibility gate — so the two stay in
    // lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history: drift either way strands the
    // reserve or spends one that was never allocated).
    if (!result.solution && mcNeighborBudgetRetryTierWillRun && prep._metrics.nodesExpanded < mcNeighborBudgetRetryNodeCeiling) {
        // PER-CONFIG NODE SUBDIVISION (staircase: true below) — the one place this tier deliberately
        // does NOT copy its three ladder-rerun siblings, because measurement showed their shared
        // shape (one undivided node ceiling across every config in the rerun) is defective.
        //
        // THE DEFECT. runGateSerialAttempts/runInterleavedAttempts divide budget BETWEEN configs in
        // WORK units (`attemptBudgetShare` over `workBudget`), but treat the node ceiling as a
        // single shared ABSOLUTE cap with no per-config subdivision unless the staircase is used.
        // Every retry tier sizes its fresh work budget as `timeBudgetMs * fraction and converts that legacy ms-shaped amount to work` — and under the capability protocol `timeBudgetMs` is a deliberately
        // NON-BINDING 24h deadline (`deterministic=true`, see docs/solver-budget-determinism.md).
        // That makes the work pool ~2.9e11 units, so the work-based division never bites, and the
        // FIRST config simply runs until the tier's absolute node ceiling is gone. Measured directly
        // on `R02119` (probe at `nodeBudget` 10M): per-attempt elapsed inside each ladder-rerun tier
        // was `[10896, 0, 0, 0, 0, 0, 0, 0]` for the dedup-near-tie tier, `[21319, 0 x7]` for the
        // connectivity tier, `[685, 0 x7]` for the attraction-diversity pass, and `[39602, 0 x7]` for
        // this one before the fix — while the main loop, which passes the EXTERNAL (binding) work
        // budget, divided properly at `[10782, 473, 496, 482, 1561]`. Raising this tier's reserve
        // 4.5x changed nothing except how long config #1 ran (12.7s -> 77.1s), confirming a division
        // defect rather than under-provisioning. This is the same "fractions are denominated in TIME
        // but what actually stops a level is nodeBudget" trap CLAUDE.md already documents for the
        // admissible-order tier, resurfacing at a different call site.
        //
        // THE FIX. Reuse the staircase the main loop's own late-reserve wiring already provides
        // (runWholeLadderRetryTier's `staircase: true` — a config that has already blown past its own
        // cumulative step is skipped rather than starving the rest of the ladder, so the winning
        // config is reached even when an earlier one would happily run forever — exactly `R02119`'s
        // shape, `dfs:perimeterSweep/cornerHarvest` never exhausts; the winner
        // `beam:mustCrossFirst@beam2000` is config #3).
        //
        // Deliberately scoped to THIS tier: the same defect in the three promoted tiers and the
        // diversity pass is a real, separately-measurable opportunity (they are currently paying a
        // full ladder-rerun reserve to rerun ONE config), but changing a shipped, population-
        // validated tier's search behavior is decision-bearing and needs its own full-corpus A/B — it
        // is not a free ride-along on this one. See the ledger entry for the follow-up.
        const mcNeighborBudgetRetryTotalBudget = Math.floor(timeBudgetMs * mcNeighborBudgetRetryBudgetFraction);
        const mcNeighborBudgetRetryResult = await runWholeLadderRetryTier({
            stageId: 'mc-neighbor-budget-retry', proxyOverrides: { PRUNE_MC_NEIGHBOR_BUDGET: false },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: mcNeighborBudgetRetryTotalBudget, nodeCeiling: mcNeighborBudgetRetryNodeCeiling,
            workBudget: legacyMsToWork(mcNeighborBudgetRetryTotalBudget, MIN_ATTEMPT_WORK),
            workStart: prep._workMeter.units,
            staircase: true,
        });
        result.attempts.push(...mcNeighborBudgetRetryResult.attempts);
        if (mcNeighborBudgetRetryResult.solution) result.solution = mcNeighborBudgetRetryResult.solution;
    }

    // Last-resort repair-late-probe pass (REPAIR_LATE_PROBE_NODE_BUDGET, STRATEGY_REPAIR_LATE_PROBE)
    // — see that constant's own comment for the full rationale. Unlike every tier above (which
    // rerun `mainConfigs` or `repairConfigs`), `repairConfigs` is EMPTY here by construction (this
    // tier's own eligibility gate is `repairConfigs.length === 0`), so there is no existing config
    // list to replay — a single plain repair attempt is built directly via `repairAttempt()`, the
    // same builder `attempts.ts` uses for the ordinary case, and run through the same per-gate
    // manual loop shape as the ordinary repair fallback loop / repair-elite-prefix-DFS-retry tier
    // above (not runInterleavedAttempts/runGateSerialAttempts, which only ever see `mainConfigs`).
    //
    // Positioned dead last — AFTER the must-cross-neighbor-budget retry tier above, the current true
    // end of the ladder — for the identical reason as its five predecessors: nothing may run after
    // this one that still checks an unextended ceiling, or this tier's own additive extension would
    // starve it.
    //
    // `repairLateProbeTierWillRun` is the SAME predicate repairLateProbeNodeReserve is derived from
    // — the two must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history: drift
    // either way strands the reserve or spends one that was never allocated).
    if (!result.solution && repairLateProbeTierWillRun && prep._metrics.nodesExpanded < repairLateProbeNodeCeiling) {
        const repairLateProbeConfig = repairAttempt();
        // Generous, deliberately non-binding time budget (ms, divided across gates below purely for
        // fairness between them — not a work-unit conversion) — matching the capability protocol's
        // own convention that nodeBudget is the real constraint here, not time; see
        // REPAIR_LATE_PROBE_NODE_BUDGET's own comment on why this tier's budget is a flat node cap.
        const repairLateProbeTotalBudget = timeBudgetMs;
        const repairLateProbeStart = Date.now();
        // The tier's own flat budget is tracked independently of the stacked-ceiling chain, entirely
        // by design: `repairLateProbeNodeCeiling` (like every ceiling above it) collapses to Infinity
        // whenever the caller's `nodeBudget` is Infinity — the actual production/interactive case —
        // which would otherwise leave THIS tier's own cap unenforced (an early implementation shipped
        // exactly that gap: caught locally when a level's late-probe attempt spent 2,498,406 nodes
        // against a declared 2,000,000 cap, because unused headroom left over by the preceding tier's
        // own unspent reserve bled into "remaining ceiling room" and was handed straight to this
        // tier). `repairLateProbeEntryNodes` anchors the tier's own spend to where IT started, so the
        // per-call bound below is always `min(flat cap remaining, outer ceiling remaining)` — never
        // just the outer ceiling — regardless of whether nodeBudget is finite or Infinity.
        const repairLateProbeEntryNodes = prep._metrics.nodesExpanded;
        // FRESH, ADDITIVE `prep._workCap` override — same "extend, don't share the depleted pool"
        // philosophy as repairElitePrefixDfsRetry's own override above (that tier's own history:
        // `prep._workCap` is a single mutable field this tier's own `runAttempt`-direct calls would
        // otherwise silently inherit stale from whichever earlier tier last wrote it). An earlier
        // version of this tier omitted this entirely — invisible under the census-style validation
        // this tier shipped with (huge non-binding `timeBudgetMs`, so the last tier's own workCap
        // still had astronomical headroom) but a real starvation risk under production's actual
        // ~30s `timeBudgetMs`, where an earlier tier's last attempt can leave `prep._workCap` at or
        // near `prep._workMeter.units` — repair-search.ts/search.ts's own budget checks read
        // `prep._workMeter.units >= (prep._workCap ?? Infinity)` as a hard stop, so a stale, already-spent
        // cap would make this tier's very first `runAttempt` call terminate immediately regardless of
        // its own generous node/time budget.
        const repairLateProbeWorkBudget = legacyMsToWork(repairLateProbeTotalBudget, MIN_ATTEMPT_WORK);
        await withWorkCapScope(prep, prep._workMeter.units + repairLateProbeWorkBudget, async () => {
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (prep._metrics!.nodesExpanded >= repairLateProbeNodeCeiling) break;
                const ownBudgetRemaining = repairLateProbeNodeBudget - (prep._metrics!.nodesExpanded - repairLateProbeEntryNodes);
                if (ownBudgetRemaining <= 0) break;
                const gateKey = activeGates[gi];
                const elapsed = Date.now() - repairLateProbeStart;
                const gatesLeft = activeGates.length - gi;
                const retryBudget = Math.floor((repairLateProbeTotalBudget - elapsed) / gatesLeft);
                if (retryBudget < 50) break;
                const outerCeilingRemaining = repairLateProbeNodeCeiling === Infinity
                    ? Infinity
                    : Math.max(0, repairLateProbeNodeCeiling - prep._metrics!.nodesExpanded);
                const remainingNodeBudget = Math.min(ownBudgetRemaining, outerCeilingRemaining);
                const r = await runAttempt(gateKey, level, prep, repairLateProbeConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget);
                result.attempts.push(withSolverStage(r.attempt, 'repair-late-probe'));
                if (r.path) { result.solution = r.path; break; }
            }
        });
    }

    // Last-resort SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE retry pass (GOAL_ATTRACTION_LEGACY_
    // DISTANCE_RETRY_BUDGET_FRACTION, STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY) — see that
    // constant's own comment in stage-budget.ts and docs/solver-optimization-current-queue.md
    // Priority 7 for the full rationale. The plain global SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE
    // flag (attempts.ts/scoring.ts) was measured net -5 across three populations (73-level loss
    // population +9/-3; 90-level gain population 0/-11; published corpus unchanged) because it
    // forces the legacy (pre-6f00baf) distance map even on levels the corrected map already solves
    // early. This tier instead reruns the whole `mainConfigs` ladder with that flag forced ON, but
    // ONLY after every earlier tier — including repair-late-probe, the previous true end of the
    // ladder — has already failed, so it structurally cannot touch that loss population: a level
    // that solves earlier never reaches this tier. Same `runWholeLadderRetryTier`/`proxyOverrides`
    // shape as STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY. Promoted default-ON 2026-08-23 after a
    // population-scale A/B (73-level loss population +3/-0; 90-level gain population 0/-0;
    // published corpus unchanged — see docs/solver-opt-in-experiment-ledger.md); the flag check
    // below (`!cfg ||` ... ) is the default-ON convention.
    //
    // Positioned dead last — AFTER the repair-late-probe tier above, the current true end of the
    // ladder — for the identical reason every tier above it is placed there: nothing may run after
    // this one that still checks an unextended ceiling, or this tier's own additive extension would
    // starve it.
    //
    // `goalAttractionLegacyDistanceRetryTierWillRun` is the SAME predicate
    // goalAttractionLegacyDistanceRetryNodeReserve is derived from (stage-budget.ts) — the two must
    // stay in lockstep.
    if (!result.solution && goalAttractionLegacyDistanceRetryTierWillRun && prep._metrics.nodesExpanded < goalAttractionLegacyDistanceRetryNodeCeiling) {
        const goalAttractionLegacyDistanceRetryTotalBudget = Math.floor(timeBudgetMs * goalAttractionLegacyDistanceRetryBudgetFraction);
        const goalAttractionLegacyDistanceRetryResult = await runWholeLadderRetryTier({
            stageId: 'goal-attraction-legacy-distance-retry', proxyOverrides: { SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE: true },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: goalAttractionLegacyDistanceRetryTotalBudget, nodeCeiling: goalAttractionLegacyDistanceRetryNodeCeiling,
            workBudget: legacyMsToWork(goalAttractionLegacyDistanceRetryTotalBudget, MIN_ATTEMPT_WORK),
            workStart: prep._workMeter.units,
            staircase: retryTierStaircase,
        });
        result.attempts.push(...goalAttractionLegacyDistanceRetryResult.attempts);
        if (goalAttractionLegacyDistanceRetryResult.solution) result.solution = goalAttractionLegacyDistanceRetryResult.solution;
    }

    // Last-resort repair-late-probe MULTI-SEED retry (REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_
    // SALTS, STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY, promoted default-ON 2026-08-23) — see
    // that constant's own comment in stage-budget.ts for the full rationale and validated
    // evidence. Dead-last additive extension of repair-late-probe:
    // for the exact same repairConfigsCount===0 population, retry the SAME repairAttempt() builder
    // across several more PRNG seeds (repair-late-probe itself already tried seed salt 0), each
    // seed getting its own full REPAIR_LATE_PROBE_NODE_BUDGET reserve. Structurally identical to
    // the repair-late-probe block above (same per-gate manual loop, same builder), just looped over
    // seeds and positioned after goal-attraction-legacy-distance-retry, the current true end of the
    // ladder.
    //
    // `repairLateProbeMultiSeedRetryTierWillRun` is the SAME predicate
    // repairLateProbeMultiSeedRetryNodeReserve is derived from (stage-budget.ts) — the two must
    // stay in lockstep.
    if (!result.solution && repairLateProbeMultiSeedRetryTierWillRun && prep._metrics.nodesExpanded < repairLateProbeMultiSeedRetryNodeCeiling) {
        const repairLateProbeMultiSeedConfig = repairAttempt();
        const originalWorkCap = prep._workCap;
        try {
            seedLoop:
            for (const seedSalt of REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS) {
                if (prep._metrics.nodesExpanded >= repairLateProbeMultiSeedRetryNodeCeiling) break;
                const roundStart = Date.now();
                const roundEntryNodes = prep._metrics.nodesExpanded;
                const roundWorkBudget = legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK);
                prep._workCap = Math.min(prep._workMeter.units + roundWorkBudget, prep._strictWorkCap ?? Infinity);
                for (let gi = 0; gi < activeGates.length; gi++) {
                    if (prep._metrics.nodesExpanded >= repairLateProbeMultiSeedRetryNodeCeiling) break;
                    const ownBudgetRemaining = repairLateProbeNodeBudget - (prep._metrics.nodesExpanded - roundEntryNodes);
                    if (ownBudgetRemaining <= 0) break;
                    const gateKey = activeGates[gi];
                    const elapsed = Date.now() - roundStart;
                    const gatesLeft = activeGates.length - gi;
                    const retryBudget = Math.floor((timeBudgetMs - elapsed) / gatesLeft);
                    if (retryBudget < 50) break;
                    const outerCeilingRemaining = repairLateProbeMultiSeedRetryNodeCeiling === Infinity
                        ? Infinity
                        : Math.max(0, repairLateProbeMultiSeedRetryNodeCeiling - prep._metrics.nodesExpanded);
                    const remainingNodeBudget = Math.min(ownBudgetRemaining, outerCeilingRemaining);
                    const r = await runAttempt(gateKey, level, prep, repairLateProbeMultiSeedConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget, null, seedSalt);
                    result.attempts.push(withSolverStage(r.attempt, 'repair-late-probe-multi-seed-retry'));
                    if (r.path) { result.solution = r.path; break seedLoop; }
                }
            }
        } finally {
            prep._workCap = originalWorkCap;
        }
    }

    const totalMs = Date.now() - levelStartTime;
    const nodesExpanded = prep._metrics.nodesExpanded;
    // "The node ceiling stopped a tier" — either the full budget is spent, or the early tiers were
    // truncated at the reduced ceiling to fund the reserve (see earlyTiersHitNodeCeiling). With no
    // reserve (every production caller, and any run with an infinite nodeBudget) the second term is
    // always false and this is bit-identical to the original `nodesExpanded >= nodeBudget`.
    const nodeBudgetReached = nodeBudget !== Infinity && (nodesExpanded >= nodeBudget || earlyTiersHitNodeCeiling || mainLoopEarlyTiersHitNodeCeiling);
    if (result.solution) {
        return finish({ ok: true, status: 'success', solution: result.solution, solutions: [result.solution], attempts: result.attempts, totalMs, nodesExpanded, workSpent: prep._workMeter.units - workStart, workBudget });
    }
    // The wall-clock deadline is the solver's ONE remaining non-deterministic exit, and it is not
    // needed for termination — a finite workBudget already guarantees that, since work rises
    // monotonically and every technique checks it every 256 iterations. The deadline exists purely
    // to keep a latency promise to a human. So rather than pretend it never fires, make it
    // OBSERVABLE: a run the deadline cut short while work remained is not a reproducible negative,
    // it is an indeterminate result, and no caller should record it as "this level is unsolved".
    // Offline callers (CI, benches, corpus runs, any A/B) should leave timeBudgetMs generous and
    // bound the run with workBudget alone, in which case this can never be set.
    // See docs/solver-budget-determinism.md.
    const workSpent = prep._workMeter.units - workStart;
    // Mirrors nodeBudgetReached's own reduced-ceiling accounting above, now that the main loop's
    // WORK dimension can also be truncated below the full workBudget by its own late reserve
    // (mainLoopEarlyWorkBudget/mainLoopEarlyTiersHitWorkCeiling): without the OR term, a level whose
    // early configs were cut off at that reduced ceiling, but whose later tiers (repair fallback,
    // admissible order) then exhaust their own search naturally below the full workBudget, would
    // report workBudgetReached: false / status 'failed' — hiding that the main loop itself was
    // budget-limited, not searched out. Bit-identical to the plain `workSpent >= workBudget` check
    // whenever the reserve never triggered (every caller before this fix, and any run with an
    // infinite workBudget).
    const workBudgetReached = workBudget !== Infinity && (workSpent >= workBudget || mainLoopEarlyTiersHitWorkCeiling);
    const deadlineTruncated = totalMs >= timeBudgetMs && !nodeBudgetReached && !workBudgetReached;
    // A technique exception is not evidence that the level exhausted, timed out, or consumed its
    // node allowance. Attempts after it still run, but an unsuccessful aggregate remains visibly
    // indeterminate even when a separate budget boundary was also reached later.
    const hadAttemptError = hasAttemptError(result.attempts);
    const status = hadAttemptError ? 'attempt-error'
        : nodeBudgetReached ? 'node-budget-reached'
        : deadlineTruncated ? 'deadline-truncated'
        : (workBudgetReached ? 'work-budget-reached' : 'failed');
    return finish({ ok: false, status, solution: null, solutions: [], attempts: result.attempts, totalMs, nodesExpanded, nodeBudgetReached, deadlineTruncated, workSpent, workBudget });
}
