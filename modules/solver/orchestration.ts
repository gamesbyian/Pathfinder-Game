import { PORTFOLIO_EXPERIMENT } from './portfolio-experiment.js';
import { OPT_IN_FEATURES } from './ablation-config.js';
import { getConfiguredAttemptConfigs, ATTRACTION_DIVERSITY_CANDIDATE_FLAGS, repairAttempt } from './attempts.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import { repairPrimarySeed } from './repair-search.js';
import { withSolverStage } from './stage-policy.js';
import type { SolverStageId } from './stage-policy.js';
import { keyParity } from '../domain/cell-key.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig, ForcedPortalExit } from './types.js';

type YieldFn = (() => Promise<void>) | null;
type AttemptSearchDispatch = typeof runAttemptSearch;
// Fault injection is associated with one prepared solve, never global process state. This keeps
// concurrent solves isolated while allowing orchestration tests to deterministically fail dispatch.
const testAttemptDispatches = new WeakMap<PrepLevel, AttemptSearchDispatch>();
function isSolverCancellation(value: unknown): boolean {
    try { return (value as { message?: unknown } | null)?.message === 'Solver:cancelled'; }
    catch { return false; }
}
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
 *  needing every one of Attempt's required fields (gateKey/elapsedMs/allocatedBudgetMs/outcome). */
export interface AttemptTierFlags {
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

/** Which ladder tier an attempt actually belongs to, most-specific-first: several of the newer
 *  retry tiers ALSO set `repair`/`admissibleOrder` on their attempts (they rerun repairConfigs/
 *  admissibleOrderConfigs), so their own distinguishing field must be checked before the broader
 *  bucket it would otherwise fall into, or it silently collapses into ordinary repair-fallback/
 *  admissible-order/main-ladder activity. The single shared source of truth for "which tier won" —
 *  used both for lifecycle-telemetry labeling (this file's own `finish()`) and for hint provenance
 *  (hint-provenance.ts's `deriveSolveAttemptInfo`, which stores this as `forcing.retryTier` so a
 *  persisted hint can be told apart from an ordinary main-ladder/repair-fallback/admissible-order
 *  find — see docs/solver-optimization-current-queue.md's Priority 0). */
export function classifyAttemptTier(attempt: AttemptTierFlags): string {
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
interface SearchResult { solution: number[] | null; attempts: Attempt[]; earlyNodeBudgetReached?: boolean; shrunkBiased?: ShrunkBiasedTier[]; }

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
    /** Total WORK this solve may spend (work-meter.ts's unit: applyMove + 12*isConnected), and the
     *  quantity the attempt ladder divides between gate x config pairs. This is the budget that
     *  matters: it is machine-independent, so the same (level, workBudget) produces the same search
     *  on any host under any load. Defaults to `timeBudgetMs * DEFAULT_WORK_PER_MS` so ms-shaped
     *  callers keep roughly their intended cost; pass it explicitly (CI, benches, corpus runs, any
     *  A/B) to pin the result exactly regardless of what the clock does. */
    workBudget?: number;
    /** Experiment-only whole-solve enforcement. Omitted/false preserves the historical production
     * scheduler, where `workBudget` sizes the main ladder and additive tiers can exceed it. */
    strictTotalWorkBudget?: boolean;
    /** Opt-in diagnostic attempt-ceiling fields. Omitted keeps ordinary result objects unchanged. */
    attemptBudgetTelemetry?: boolean;
    /** Opt-in per-technique lifecycle/progress summary for experiment artifacts. */
    lifecycleTelemetry?: boolean;
    schedulerMode?: 'legacy' | 'portfolio-experiment';
    /** Unit-test-only per-solve dispatch override. Never persisted or exposed by Solver's facade. */
    attemptSearchForTesting?: AttemptSearchDispatch;
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
    /** The work budget this solve was allotted — pairs with workSpent for provenance/cost analysis. */
    workBudget?: number;
    /** The wall-clock deadline cut this run short while work budget remained — so the result is
     *  INDETERMINATE, not a reproducible negative. Never record such a run as "unsolved". */
    deadlineTruncated?: boolean; solvedByPrime?: boolean;
    techniqueLifecycle?: Record<string, unknown>;
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

/** Work units per requested millisecond, used only to derive a `workBudget` for a caller that
 *  supplies only `timeBudgetMs`. A compatibility shim, not a law: work rate was measured at ~3.35M
 *  work/s uniformly across techniques (that uniformity is the point of the unit — see
 *  work-meter.ts), so this approximates what the requested milliseconds would actually have bought.
 *  Determinism does not come from this constant — it comes from passing `workBudget` explicitly,
 *  which every offline/CI/A-B caller should do. */
const DEFAULT_WORK_PER_MS = 3350;

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
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    let pairsLeft = baseConfigs.length * activeGates.length;
    let earlyNodeBudgetReached = false;
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
                return { solution: null, attempts, earlyNodeBudgetReached };
            }
            // Ablation: STRATEGY_MIN_BUDGET_FLOOR gates the per-attempt-config minimum
            // budget-share floor (long-multigate perimeter beams, must-cross diverse-beam
            // threads) — disabling it falls back to the flat even split for every config.
            const minFrac = (!cfg || cfg.STRATEGY_MIN_BUDGET_FLOOR) ? (baseConfigs[ci].minBudgetFraction ?? 0) : 0;
            // The remainder being divided is WORK, never wall clock — that is what makes the whole
            // schedule a function of (level, workBudget) alone. See work-meter.ts.
            const workSpent = prep._workMeter.units - workStart;
            if (workSpent >= workBudget) return { solution: null, attempts };
            const budgetLeft = workBudget - workSpent;
            let attBudget = attemptBudgetShare(budgetLeft, pairsLeft, budgetLeft / activeGates.length, minFrac);
            if (gateProgress && ci >= 1) {
                // adaptiveGateWeight is unbounded above ((share*n)**2 for a gate that has been
                // getting more than its "fair" 1/n share of progress) — every OTHER path through
                // attemptBudgetShare above (the plain even split, and the minBudgetFraction floor,
                // which is itself bounded by budgetLeft/activeGates.length) already keeps attBudget
                // <= budgetLeft by construction, so this clamp preserves that same invariant rather
                // than changing the weighting's own (validated, S142-scoped) relative aggressiveness.
                // Without it, a single heavily-weighted attempt could claim several times budgetLeft,
                // overspending this tier's declared workBudget before the outer `workSpent >= workBudget`
                // check on the NEXT iteration ever gets a chance to stop it.
                attBudget = Math.min(budgetLeft, Math.max(MIN_ATTEMPT_WORK, Math.floor(attBudget * adaptiveGateWeight(gateKey, gateProgress))));
            }
            if (attBudget < MIN_ATTEMPT_WORK) return { solution: null, attempts };
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
            if (gateProgress) {
                gateProgress.set(gateKey, (gateProgress.get(gateKey) ?? 0) + (result.attempt.nodesExpanded ?? 0));
            }
            attempts.push(result.attempt);
            pairsLeft--;
            if (result.path) return { solution: result.path, attempts, earlyNodeBudgetReached };
        }
    }
    return { solution: null, attempts, earlyNodeBudgetReached };
}

async function runGateSerialAttempts(
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel,
    prep: PrepLevel, timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget = Infinity, workBudget = Infinity, workStart = 0,
    earlyConfigNodeBudget = nodeBudget, lateConfigStart = baseConfigs.length,
): Promise<SearchResult> {
    const attempts: Attempt[] = [];
    const cfg = prep._cfg;
    let earlyNodeBudgetReached = false;
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
                return { solution: null, attempts, earlyNodeBudgetReached };
            }
            const elapsed = prep._workMeter.units - gateStartUnits;
            if (elapsed >= gateBudget) break;

            const remaining = gateBudget - elapsed;
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
            attempts.push(result.attempt);
            if (result.path) return { solution: result.path, attempts, earlyNodeBudgetReached };
        }
    }
    return { solution: null, attempts, earlyNodeBudgetReached };
}

/** Extra wall-clock budget granted to the repair fallback (see attempts.ts's
 *  needsRepairFallback) ON TOP of the level's normal timeBudgetMs — never carved out of the
 *  main DFS/beam loop's share. A first version reserved a fraction of the ORIGINAL budget for
 *  repair up front (shrinking mainBudgetMs before the main loop ran); that quietly regressed a
 *  previously-solid fix elsewhere on this exact feature gate whose fix WAS a tight budget race
 *  (won by getting more of the existing pool, not less) — confirmed via a clean A/B against the
 *  pre-repair code (see data/stress/README.md). Extending the total budget instead costs the main
 *  loop nothing on any level, ever — repair only ever adds wall time on levels where every
 *  earlier attempt has already failed. 3.0 (not 1.0): the stagnation-burst diversification in
 *  repair-search.ts needs a full anti-stagnation cycle to escape a plateau on some levels —
 *  measured 25-38s of pure repairSearchFromGate compute to solve S030/S033/S039 in isolation,
 *  and running through the full orchestration flow (after the main loop's own ~20s of DFS/beam
 *  work) was measurably slower than that isolated figure at the same nominal budget — so 3.0
 *  (60s) budgets in real margin rather than the bare isolated minimum.
 *
 *  6.0 (not 3.0): S043 (the must-turn/portal-parity double-guidance fix — see
 *  data/stress/README.md) needs its correct-direction turn AND its parity-mandatory portal to land
 *  in an order-dependent way that only some restarts hit, and reaching one of those restarts
 *  measured ~93s of pure repairSearchFromGate compute even from a cold, uncontended isolated
 *  call — already past the 60s (3.0×20000ms) budget the rest of the cluster needed. Confirmed
 *  via the full solveLevel() orchestration (not just isolated) at a scaled-up budget: S043
 *  solved in ~93s of repair's own time (132.9s total, including the main loop's unchanged
 *  beam attempts) — consistent with, not faster than, the isolated figure, so 3.0's
 *  isolated-vs-orchestration slowdown margin still applies on top. 6.0 (120s at the standard
 *  20s test budget) covers this with room to spare without changing anything about the main
 *  DFS/beam loop's own budget or timing on any level. */
export const REPAIR_EXTRA_BUDGET_FRACTION = 6.0;

/** Strictly-additional budget (same shape as REPAIR_EXTRA_BUDGET_FRACTION above, just a separate,
 *  much smaller fraction) for one extra pass of the SAME main-loop attempt ladder (mainConfigs),
 *  with attempts.ts's ATTRACTION_DIVERSITY_CANDIDATE_FLAGS disabled for the whole pass — tried only
 *  after BOTH the main loop AND the repair fallback have already failed on every active gate.
 *  Exists for the 2026-07-16 fragile-group finding (reports/2026-07-16-phase-d-fragile-group-
 *  ablation-diagnosis.md): a small family of position/attraction scoring terms can each, on their
 *  own level-specific orientations, lock an otherwise-solvable level into a self-defeating
 *  structural commitment; disabling the right one of them rescues the case, but which term is
 *  level-specific.
 *
 *  A WHOLE extra pass of the ladder, not one narrow attempt: the diagnosis that found each rescue
 *  disabled the flag globally across every profile/template attempt.ts's policy selects for that
 *  level (via opts.ablation, not a single attempt config), so a fix that only tries the flag off in
 *  one specific profile/template combination under-delivers relative to what was actually proven —
 *  confirmed empirically: an earlier version of this mechanism using a single default-profile DFS
 *  attempt rescued only 2 of 6 known-rescuable fragile variants (both from R02795, the one case
 *  whose winning profile happens to be the default one); switching to a full extra ladder pass (this
 *  version) is required to reach the R00156/R02960 cases, whose diagnosed rescue needs a
 *  beam/template attempt the single-attempt version never tried.
 *
 *  1.0 (not 0.15): the diagnosis's own ablation sweep gave the WHOLE main-loop ladder (not one
 *  attempt) a full 8s budget at --repair-budget-fraction=0 to find every rescue — i.e. the same
 *  shape of run this pass performs, just at the standard 20s test budget's own nominal size, not a
 *  fraction of it. An earlier version of this fraction (0.15, giving mainConfigs' ~16-way split
 *  only ~3s total) was measured to under-deliver: it rescued only 2 of 6 known-rescuable variants
 *  (both from R02795, whose winning config happens to be fast/early in the ladder), missing every
 *  R00156/R02960 case the diagnosis proved rescuable. Raising the fraction to 1.0 gives the pass
 *  the SAME size budget the diagnosis itself used, not a smaller one — see reports/2026-07-16-
 *  phase-d-attraction-diversity-implementation.md for the verification numbers this was checked
 *  against. Still far smaller than REPAIR_EXTRA_BUDGET_FRACTION's 6.0 (an iterated-local-search
 *  retry loop that benefits from more time in a way a single fixed-budget ladder rerun does not),
 *  and this pass only ever runs on a level that has ALREADY spent 1x + up to 6x timeBudgetMs
 *  failing everything else — the goal is a bounded last check, not another expensive tier. */
export const ATTRACTION_DIVERSITY_BUDGET_FRACTION = 1.0;

/** Per-PROFILE budget (same shape as the two fractions above, but applied once per
 *  attempts.ts ADMISSIBLE_ORDER_PROFILES entry, not once for the whole tier — see that call site's
 *  own comment for why: each profile runs as its own sequential sub-pass with this FULL fraction to
 *  itself, not a shared total split across profiles) for admissible-order-search.ts, a complete DFS
 *  variant that reuses the existing sound admissible-pruning gauntlet but orders children by
 *  admissible slack instead of soft heuristic score. Tried only after the main loop, repair
 *  fallback, AND attraction-diversity pass have all already failed on every active gate — mirroring
 *  their own last-resort placement, and stopping at the first profile that solves.
 *
 *  1.0 per profile, matching ATTRACTION_DIVERSITY_BUDGET_FRACTION's own reasoning: this technique's
 *  corpus-2 validation (reports/2026-07-24-admissible-order-search-corpus2-validation.md) ran EACH
 *  profile standalone at 8000ms, unshared, against levels the full production ladder had already
 *  failed — a budget on the same order as the standard 20-30s test budget's own nominal size, not a
 *  small fraction of it, and not divided among sibling profiles. Giving every one of
 *  ADMISSIBLE_ORDER_PROFILES this same full fraction (4 profiles today) means this tier's own
 *  worst-case cost is up to 4x timeBudgetMs, not 1x — accepted deliberately (see that array's own
 *  comment for the calibration bug this fixes) since a level only pays for MORE than one profile's
 *  worth when it has already failed every earlier profile too, and — same as the rest of this tier —
 *  it only runs at all after 1x + up to 6x + 1x timeBudgetMs has already been spent failing
 *  everything else. Batch/interactive callers that can't afford this keep the same escape hatch
 *  (admissibleOrderBudgetFractionOverride / disableExtraBudgetPasses) regardless of how many
 *  profiles are listed. Not yet tuned per-profile (all 4 currently share this one constant even
 *  though 'default' contributed far more of the validated solves than the other 3 combined) — a
 *  smaller dedicated fraction for the lower-yield profiles is a reasonable future refinement, but
 *  needs the same full-corpus-through-the-real-ladder validation this file's comment discipline
 *  requires before changing, not a guess. */
export const ADMISSIBLE_ORDER_BUDGET_FRACTION = 1.0;

/** Fraction of the caller's external `nodeBudget` WITHHELD from every earlier tier (repair probe,
 *  main loop, repair fallback, attraction-diversity pass) and left for the admissible-order tier.
 *
 *  WHY THIS EXISTS — the tier was provisioned in one unit and starved in another. Its budget above
 *  is a TIME fraction, but what actually stops a level in a batch run is `nodeBudget`, a single
 *  CUMULATIVE ceiling every tier checks against the same running `prep._metrics.nodesExpanded`.
 *  The earlier tiers therefore consumed the whole ceiling and this tier — last in line, and reached
 *  only after 1x + up to 6x + 1x timeBudgetMs has already failed — hit its own
 *  `nodesExpanded >= nodeBudget` guard and broke out immediately, having run nothing. Measured on
 *  the 2026-07-30T114427Z typical-budget corpus-2 baseline: of the 141 unsolved levels that carry a
 *  validated admissible-order hint, ALL 141 terminated at nodesExpanded >= the 20,000,000 cap after
 *  a mean of 14.4 ladder attempts, and an admissible-order sub-pass was recorded on exactly 1 of
 *  them (the tier's 'none' profile is exclusive to it, so the attempt log is unambiguous). Giving
 *  the tier more CLOCK could never have fixed this; it was receiving no NODES.
 *
 *  Same bug shape as the 2026-07-17 repair-probe node-budget starvation (see runRepairProbe's own
 *  comment): a component sized against its own internal budget while a different, external, cumulative
 *  budget is what really governs it.
 *
 *  A RESERVE, NOT A REORDER. The tier keeps its last-resort position; it is only guaranteed a slice
 *  of the ceiling to spend once it gets there. That is the smaller behavioural change, and the one
 *  the diagnosis implies — nothing measured says this technique should run EARLIER, only that it
 *  should run at all.
 *
 *  0.25, sized from that same baseline against both directions of a zero-sum reallocation:
 *    - Upside: 78 of the 141 levels' cheapest recorded admissible-order find cost <= 5,000,000
 *      nodes (the median find is 3.4M — 17% of the cap; this is a technique that needs a slice, not
 *      a bigger cap).
 *    - Downside: only 5 of the 434 currently-solved corpus-2 levels spend more than the 15,000,000
 *      the earlier tiers would retain. Solved levels spend a MEDIAN of 0.33M nodes (1.6% of the
 *      cap), so a slice withheld from the tail is drawn almost entirely from levels already failing.
 *    - The curve knees here: 0.20 covers 75 finds for the same 5 at risk, 0.30 covers 79 for 7.
 *  Neither number is a prediction — coverage is "the find is cheap enough to fit", not "it will
 *  reproduce through the real ladder" — but they bound a reallocation whose precedents in this repo
 *  (MST tightening -12, archetype routing -4/-8) came up negative, and this one's asymmetry is
 *  measured rather than assumed. A/B: reports/2026-07-30-admissible-order-node-reserve.md.
 *
 *  STRICTLY A NO-OP unless a finite external `nodeBudget` is set AND this tier is actually going to
 *  run (nonzero fraction, STRATEGY_ADMISSIBLE_ORDER enabled, at least one profile configured).
 *  `nodeBudget` is offline-batch-only, so every production path — Play/Editor/Review hint solves,
 *  which pass no nodeBudget and use disableExtraBudgetPasses anyway — is bit-identical to before.
 *  See solveLevel's own reserve resolution for the guard, and note in particular that the reserve
 *  must be 0 whenever the tier is suppressed, or an exhausted early tier would start reporting
 *  status 'failed' where it used to report 'node-budget-reached'. */
export const ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION = 0.25;

/** See the read site's own comment (`admissibleOrderProfileNodeReserve` in `solveLevel`) for the
 *  full derivation, the R03148 precedent this targets, and the asymmetric-risk caution specific to
 *  this mechanism. A fraction OF `admissibleOrderNodeReserve` (never of `nodeBudget` directly)
 *  withheld from the tier's dominant `'default'` profile specifically, for the other four profiles.
 *  0.15 is an unvalidated starting point, matching this session's other new reserves — opt-in,
 *  default OFF; do not promote without a dedicated A/B that specifically checks 'default'-winning
 *  levels are unaffected, not just that new solves appear. */
export const ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION = 0.15;

/** Default reserve fraction/config-count for main-loop late-suffix starvation mitigation.
 *  STRATEGY_MAIN_LOOP_LATE_RESERVE is production default-ON as of 2026-08-12; the mechanism is
 *  still a strict no-op unless a finite `nodeBudget` is supplied (offline batch tooling only —
 *  see mainLoopLateReserveEligible below), so this changed no interactive Play/Editor/Review
 *  behavior. 0.15 is the frozen level-blind population A/B's winning arm — see
 *  docs/main-loop-late-reserve-experiment.md and reports/2026-08-12-main-loop-late-reserve-population-ab.md. */
export const MAIN_LOOP_LATE_RESERVE_FRACTION = 0.15;
export const MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT = 4;

/** STRATEGY_REPAIR_FALLBACK_NODE_RESERVE (opt-in, default OFF — NEW, unvalidated mechanism, landed
 *  2026-08-13). Withholds a slice of `earlyTierNodeBudget` from the probe and the whole main loop
 *  (early + late suffix combined), the same way ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION withholds a
 *  slice from everything before IT — except this reserve protects the repair fallback loop (and,
 *  as a side effect, whatever the attraction-diversity pass finds still available afterward) from
 *  the main loop's own consumption.
 *
 *  THE PROBLEM: the repair fallback loop and the attraction-diversity pass share `earlyTierNodeBudget`
 *  with the main loop, completely unprotected — the main loop always runs first (it's simply the
 *  next stage in solveLevel's ladder) and can consume the entire pool before either ever gets a
 *  single node. Confirmed directly on an n=8 local repair-gated Corpus-2 sample (15,000,000-node
 *  budget, `--workers=1`): 5 of 6 unsolved levels gave the repair fallback loop ZERO attempts, and
 *  all 6 gave the attraction-diversity pass ZERO attempts — while the admissible-order tier, which
 *  DOES have its own reserve, got its own slice on every one of the same 6 levels. Same clean
 *  before/after control, same starvation shape as the already-fixed repair-probe/early-main-loop
 *  bug (STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET) and the already-fixed admissible-order bug
 *  (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION), one tier boundary further down the ladder.
 *
 *  THE MECHANISM (see the read-site's own two-revision history for the full derivation): a flat
 *  carve-out, but NOT directly from `earlyTierNodeBudget` the way ADMISSIBLE_ORDER_NODE_RESERVE_
 *  FRACTION carves from ITS ceiling — two revisions found that both naive placements (before the
 *  probe's own ceiling; independently after it with a Math.max clamp) actively regressed real
 *  solves by taking budget from something already load-bearing (the probe, the main loop's own
 *  attempt shares, or the already-validated STRATEGY_MAIN_LOOP_LATE_RESERVE's entire slice). The
 *  landed mechanism instead takes this fraction OF `mainLoopLateReserve` itself — "of whatever the
 *  late suffix would get, hand some to the fallback loop instead" — which is provably safe for the
 *  probe/early-config prefix (untouched, always) and only partially reduces (not zeroes) the late
 *  suffix's own room. Not the repair-probe fix's live-signal shrink either (that fix needed live
 *  conditioning because a STATIC shrink of the PROBE itself was zero-sum — see
 *  REPAIR_PROBE_ADAPTIVE_BIASED_BADNESS_GATE's own comment) — this is still a flat reserve, just
 *  scoped to a narrower, safer slice of the budget than the first two attempts used.
 *
 *  CALIBRATION CAVEAT: 0.15 is a starting point (a modest fraction OF the late-suffix reserve, not
 *  of the whole pool — considerably smaller in absolute terms than either existing reserve), NOT a
 *  value derived from any A/B on this specific mechanism. Landed opt-in, default OFF, specifically
 *  so it can be iterated on and measured before any promotion decision — do not promote without a
 *  dedicated A/B, per this codebase's standing discipline for every reserve/allocation mechanism
 *  above. */
export const REPAIR_FALLBACK_NODE_RESERVE_FRACTION = 0.15;

/** STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE (opt-in, default OFF — NEW, unvalidated mechanism,
 *  landed 2026-08-13, same day as and directly motivated by REPAIR_FALLBACK_NODE_RESERVE_FRACTION's
 *  own close-out). Protects the attraction-diversity pass's slice of `earlyTierNodeBudget` from the
 *  repair fallback loop specifically — not just from the main loop, which
 *  REPAIR_FALLBACK_NODE_RESERVE_FRACTION already (only incidentally) does.
 *
 *  THE PROBLEM: the repair fallback loop and the attraction-diversity pass run in that order and
 *  share one ceiling (`earlyTierNodeBudget`) — the repair loop always goes first, so it can consume
 *  every node `REPAIR_FALLBACK_NODE_RESERVE_FRACTION` freed up before the diversity pass ever gets
 *  one. That reserve's own close-out measurement (300-level GHA A/B + a 30-level local telemetry
 *  slice, see its own comment) proved this is exactly what happens in practice: every ordinary
 *  repair-fallback attempt burns its FULL node ceiling every time (near-identical ~337.5k nodes
 *  across 26/26 sampled attempts) — a plateau, not exhaustion-then-stop — so there is never anything
 *  left over for the diversity pass on a repair-gated level. The ORIGINAL n=8 measurement (quoted in
 *  REPAIR_FALLBACK_NODE_RESERVE_FRACTION's own comment) already showed this starkly: 6/6 unsolved
 *  sample levels gave the attraction-diversity pass ZERO attempts, same as the repair loop's 5/6.
 *
 *  UNLIKE the now-closed repair-fallback reserve, this pass is a plausible beneficiary of extra room:
 *  it is not an iterated-local-search restart loop that plateaus (see
 *  docs/repair-search-stagnation-escape-plan.md) — it is a full deterministic rerun of the SAME
 *  DFS/beam mainConfigs ladder with `SCORE_GOAL_ATTRACTION` disabled, built for a DIFFERENT, already-
 *  documented failure mode (a small family of position/attraction scoring terms locking an otherwise-
 *  solvable level into a self-defeating structural commitment — see ATTRACTION_DIVERSITY_BUDGET_
 *  FRACTION's own comment). Whether real node room actually helps it is exactly what this flag's own
 *  eventual A/B must show — this comment only establishes why the starvation premise is real and why
 *  the receptor is a priori more promising than the one just closed, not that the fix works.
 *
 *  THE MECHANISM: a fraction of the ALREADY-SAFE remainder `mainLoopLateReserve - repairFallback
 *  NodeReserve` (never of `mainLoopLateReserve` or `earlyTierNodeBudget` directly) — nesting one
 *  level deeper than the repair-fallback reserve nests inside `mainLoopLateReserve`, for the exact
 *  same reason: `repairFallbackNodeReserve + attractionDiversityNodeReserve <= mainLoopLateReserve`
 *  holds BY CONSTRUCTION (both fractions clamped to [0,1]), so `mainLoopNodeBudget >=
 *  mainLoopEarlyNodeBudget` still holds without a clamp, and the probe/early-config prefix stays
 *  completely untouched — the same soundness argument REPAIR_FALLBACK_NODE_RESERVE_FRACTION's own
 *  comment derives, one layer further down. The repair-fallback loop's own ceiling is capped at
 *  `earlyTierNodeBudget - attractionDiversityNodeReserve` (protecting the diversity pass's slice from
 *  it specifically); the diversity pass's own check is unchanged (`< earlyTierNodeBudget`), so it can
 *  spend its own reserved slice plus anything the repair loop left unused, exactly mirroring how the
 *  repair loop itself could already spend its reserve plus anything the main loop left unused.
 *
 *  CALIBRATION CAVEAT: 0.15 is a starting point copied from the repair-fallback reserve's own
 *  starting fraction, NOT derived from any A/B on this specific mechanism. Landed opt-in, default
 *  OFF, for the same reason and under the same standing discipline — do not promote without a
 *  dedicated A/B. */
export const ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION = 0.15;

/** STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY's node reserve, as a fraction of whatever
 *  `mainLoopLateReserve` remains after the repair-fallback and attraction-diversity reserves have
 *  taken their nested slices.
 *
 *  WHY THIS EXISTS: `STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET` shrinks a biased repair-probe
 *  tier's node budget on the evidence of the ordinary tier's `bestBadness`. That prediction is
 *  TERMINAL today — nothing ever restores the withheld nodes, and no later tier re-runs the biased
 *  config, so a mispredicted level simply loses whatever that tier would have found. Corpus-1's
 *  `R00408` is the confirmed case: ordinary badness 13 scales the biased tier to
 *  `max(0.35, 6/13) = 0.46`, cutting it from 6,000,000 to ~2,769,231 nodes, and
 *  `dfs:repair:repair(mustTurnBiased)` — that very tier — is the configuration that solves the
 *  level with the full budget in 9.97M total nodes. Shrunk, it fails and the level then exhausts a
 *  50,000,000-node ceiling. See
 *  reports/2026-08-14-corpus1-repair-probe-adaptive-regression.md.
 *
 *  WHY A LATE TIER RATHER THAN AN IMMEDIATE RETRY: re-running the shrunk tier inside the probe
 *  would pay `granted + full` on every level whose shrink was CORRECT — strictly worse than never
 *  shrinking at all, destroying the mechanism's entire reason to exist. Running it only after the
 *  main loop, repair fallback and attraction-diversity pass have all failed inverts that: levels
 *  that go on to solve elsewhere keep the full saving (the recovery never runs), and the recovery's
 *  cost lands only on levels that were already going to burn their whole ceiling.
 *
 *  WHY A RESERVE RATHER THAN A REORDER: the same starvation that
 *  `ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION` documents applies verbatim — `R00408`'s own failing
 *  trace shows the main loop and admissible-order tier consuming 24.4M and 12.5M nodes and the
 *  repair fallback never running at all, so a late tier with no withheld slice would reliably get
 *  zero nodes on exactly the levels it exists to rescue.
 *
 *  The recovery re-runs the shrunk config at its FULL budget rather than only the withheld
 *  remainder, because `repairSearchFromGate` is a pure function of `(gateKey, level, prep, profile,
 *  budget)` seeded only from `gateKey` — so a larger budget's trajectory strictly EXTENDS the
 *  smaller one's (the same property runRepairProbe's own doc comment already relies on). Replaying
 *  the granted prefix is therefore wasted compute, never a different or weaker search, and it is
 *  what makes recovery of the unshrunk result guaranteed rather than merely likely.
 *
 *  CALIBRATION CAVEAT: 0.5 is chosen so a single recovered tier can actually fit (a full biased
 *  budget is 6,000,000 nodes and the surviving late-reserve remainder is typically far smaller than
 *  the 50M ceiling), NOT derived from any A/B. Landed opt-in, default OFF, under the same standing
 *  discipline as the two reserves above — do not promote without a dedicated A/B on both corpora,
 *  and note that Corpus 1 was never in any arm of the mechanism this repairs. */
export const REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION = 0.5;
// (Read as a CEILING on the reserve, not its size: the reserve is `min(actual debt, this fraction of
// earlyTierNodeBudget)`, so it only ever withholds what a shrunk tier could really use.)

/** STRATEGY_DEDUP_NEAR_TIE_RETRY (PROMOTED to default-ON, 2026-08-15 — same day as the mechanism was
 *  built, tested opt-in, and population-validated; see the PROMOTION note below for why same-day
 *  promotion is justified here rather than the usual cooldown).
 *  A whole extra rerun of the SAME mainConfigs ladder, with STRATEGY_DEDUP_NEAR_TIE_RETENTION
 *  disabled for its duration — same shape as ATTRACTION_DIVERSITY_BUDGET_FRACTION just above,
 *  toggling search.ts's DEDUP_NEAR_TIE_MARGIN retention instead of SCORE_GOAL_ATTRACTION. Exists
 *  because a full-corpus GHA A/B (see DEDUP_NEAR_TIE_MARGIN's own comment) found that flag's
 *  default-ON retention nets -7 on Corpus 2 (27 gained / 34 lost) — not a rare edge case, so
 *  reverting it outright would give back the 27 gains for no net improvement on the loss side
 *  either. Every one of the 34 losses solves cheaply (median 6.5M nodes) WITHOUT retention, and
 *  every one of the 27 gains solves via the main ladder WITH retention — i.e. never reaches this
 *  tier — so a bounded last-resort retry with retention off should recover the losses without
 *  touching the gains. Tried DEAD LAST — after the main loop, repair fallback, attraction-diversity,
 *  repair-probe-shrink-recovery, AND the admissible-order tier have all already failed on every gate
 *  (REVISION 3, see dedupRetryNodeReserve's own comment at its computation site: an earlier position
 *  before the admissible-order tier let this tier's own extended ceiling silently starve that tier's
 *  entry guard on every level that doesn't need this one, since node accounting is one shared
 *  cumulative counter every tier's own guard checks independently).
 *
 *  PROMOTION (2026-08-15, same day as REVISION 3): went from opt-in/default-OFF to default-ON after a
 *  full-corpus GHA A/B (run 31902837955, additive-reserve + run-last design) confirmed **764/1700 on
 *  Corpus 2, +40 vs. the 724 with-fix baseline, with ZERO levels lost relative to baseline** — 33/34
 *  target losses recovered, all 27 original gains intact, +7 bonus solves, 0 collateral damage.
 *  Corpus 1 exactly matched its own baseline (95/102). This is the same-day third design revision
 *  (subtractive reserve → additive reserve → run-last), each population-tested before the next was
 *  trusted — the promotion is justified by the CLEANLINESS of the final result (a strict superset of
 *  the with-fix baseline's solved set, not merely a net-positive count), not by skipping validation
 *  rigor. Every production caller that already sets `disableExtraBudgetPasses: true` (the two
 *  interactive solve UIs, `solver-controller.ts`/`review-controller.ts`) is UNAFFECTED by this
 *  promotion — that flag zeroes this tier's budget fraction regardless of the ablation flag's default,
 *  exactly as it already does for the attraction-diversity and admissible-order tiers. The practical
 *  effect of promotion is scoped to callers that solve WITHOUT that flag (offline batch tooling,
 *  hint-discovery) — the same population this session's own validation A/Bs actually exercised.
 *
 *  1.0, matching ATTRACTION_DIVERSITY_BUDGET_FRACTION's own reasoning: a full nominal budget's
 *  worth for the whole ladder rerun, not a small fraction of it — this technique's own known-good
 *  cost data (search.ts's DEDUP_NEAR_TIE_MARGIN comment: p50=6.5M, p90=8.2M, max=34.8M of a 50M
 *  ceiling) needs headroom comparable to a level's own full first attempt at the ladder, not a
 *  sliver. NOT YET VALIDATED at population scale — this is a first cut sized from the loss
 *  population's own historical cost, not a calibrated A/B result. */
export const DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_DEDUP_NEAR_TIE_RETRY's own last-resort tier, as
 *  a fraction of `nodeBudget` — `dedupRetryNodeCeiling = nodeBudget + nodeBudget * this fraction`,
 *  NOT withheld from any earlier tier. See dedupRetryNodeReserve's own comment at its computation
 *  site (REVISION 2) for the full derivation and why this differs from every sibling reserve in this
 *  file (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION included), all of which subtract from
 *  `earlyTierNodeBudget` instead.
 *
 *  REVISION 2 (2026-08-15, same day as REVISION 1): the withheld-up-front design shipped, was
 *  population-validated (full-corpus GHA, `enable_flags=STRATEGY_DEDUP_NEAR_TIE_RETRY`), and turned
 *  out to be a net -17 (707 vs. the 724 baseline) — it hit its target exactly (33/34 losses
 *  recovered, 0/27 gains broken) but cost 65 unrelated levels whose main-loop ceiling was shrunk by
 *  this reserve even though they never needed the retry tier at all. Fixed by making the reserve
 *  ADDITIVE instead of subtractive (see dedupRetryNodeReserve's own comment for the mechanism) — safe
 *  by construction for production, where `nodeBudget` is always `Infinity` and this fraction is
 *  already forced to 0 regardless. Full data:
 *  reports/2026-08-15-connectivity-axis-exhausted-regression.md's "retry pass at population scale"
 *  section. RE-VALIDATED the same day, combined with REVISION 3's run-last reordering below (run
 *  31902837955): **764/1700, +40 vs. the 724 baseline, ZERO levels lost** — see
 *  DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION's own PROMOTION note above for the full result. This additive
 *  design plus REVISION 3's positioning is what's actually shipped, so that population run IS this
 *  revision's own validation, not a still-open follow-up.
 *
 *  REVISION 1 (2026-08-15, same day): an earlier version of this constant used a "floor at the
 *  tier's own call site" design instead (self-contained, no edit to the shared earlyTierNodeBudget
 *  chain) — deliberately chosen to avoid touching that chain's history of shipping regressions from
 *  exactly this kind of edit (see REPAIR_FALLBACK_NODE_RESERVE_FRACTION's own "REVISION 1"/
 *  "REVISION 2"). That version was caught locally, before any GHA spend: the floor was
 *  `max(remainder, nodeBudget * fraction)` capped by `nodeBudget - nodesExpanded` — and every one of
 *  this tier's 34 target levels reports `node-budget-reached` under the shipped default, i.e. the
 *  main loop alone already spends the ENTIRE nodeBudget, so the cap neutralized the floor to ~0 in
 *  precisely the case the floor exists to fix. Confirmed directly: R00180 reproduced its exact GHA
 *  node count (50,000,148) locally, then the retry pass received 0 nodes and could not run. REVISION
 *  1 switched to withholding the reserve up front instead (subtractive, sibling to
 *  ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION) — this genuinely gave the tier its reserved nodes, but at
 *  the population-scale cost REVISION 2 above fixes.
 *
 *  0.25: the loss population's own cost distribution (n=34, search.ts's DEDUP_NEAR_TIE_MARGIN
 *  comment) has p90=8.2M of the 50M production ceiling — 12.5M (0.25 * 50M) covers 33 of 34 with
 *  room to spare, missing only one outlier (34.8M, itself an atypical perimeterSweep@beam2000
 *  winner, not this population's dominant intersectionHarvest/objectiveFirst@beam5000 shape). Under
 *  REVISION 2 this is no longer withheld from anyone, so this sizing only controls how much EXTRA
 *  total node spend a flagged run accepts, not a redistribution tradeoff.
 *
 *  LOCAL SPOT-CHECK (2026-08-15, real solveLevel() through the full production ladder, 50M node /
 *  86.4M-work-per-ms budget, referee-validated, under REVISION 1's subtractive design): R00180 and
 *  R00901 (both typical-cost losses, needing 5.1M/4.3M nodes respectively in the control arm) are
 *  recovered by this tier exactly as predicted — R02110 (the 34.8M outlier) is not, also exactly as
 *  predicted, since 12.5M < 34.8M. This also caught and fixed a SEPARATE bug (see
 *  dedupRetryWorkStart/dedupRetryWorkBudget at the tier's call site): the node reserve alone was not
 *  sufficient — the retry pass shares runGateSerialAttempts/runInterleavedAttempts's WORK-based
 *  attemptBudgetShare split with every earlier tier by default, and that shared pool was already ~66%
 *  spent by the time this tier ran, starving its own attempts of work even with a full node reserve
 *  genuinely available. This 3-level spot-check should still hold under REVISION 2 (the tier's own
 *  ceiling only grew), but full re-validation is population-scale-only — see REVISION 2 above. */
export const DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION = 0.25;

/** STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY (PROMOTED to default-ON, 2026-08-15 — built and
 *  population-validated the same day, directly modeled on STRATEGY_DEDUP_NEAR_TIE_RETRY).
 *
 *  Applies that tier's now-validated "run dead last, additive-only budget" pattern to a SECOND
 *  known double-edged mechanism in this file: ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION
 *  (see that constant's own comment). That reserve withholds a slice of the admissible-order tier's
 *  own node budget from `'default'` (the dominant profile, which runs first) to give the OTHER
 *  profiles (`'none'`/`'mustCrossFirst'`/`'intersectionHarvest'`/`'nearClosureRescue'`) a genuine
 *  chance — `reports/2026-07-30-admissible-order-node-reserve.md` §4 found this recovers `R03148`
 *  (`'none'` solves it at 1.97M nodes when the reserve is OFF but never runs at all when it's ON and
 *  `'default'` eats the whole pool) — but a direct test also found the SAME reserve, at the SAME
 *  fraction, turns `R02644` from SOLVED to unsolved, because `'default'` there genuinely needed more
 *  than its reserve-shrunk ceiling. Real gain, real loss, same knob — exactly the shape a bounded
 *  last-resort retry is suited to, rather than a global reserve.
 *
 *  MECHANISM: instead of shrinking `'default'`'s ceiling in the tier's own (unreserved, unchanged)
 *  pass — so `R02644`-shaped levels keep their full, already-validated chance — this tier reruns
 *  ONLY the non-`'default'` profiles, with a FRESH additive node ceiling (`nodeBudget +
 *  ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION`, mirroring dedupRetryNodeCeiling) and a
 *  fresh, additive `prep._workCap` override (see the tier's own call-site comment for why this is
 *  necessary even though the admissible-order tier's own per-profile loop calls `runAttempt`
 *  directly rather than through the shared-pool `runInterleavedAttempts`/`runGateSerialAttempts`
 *  machinery dedup-retry's own work-starvation bug came from — `prep._workCap` is itself a single
 *  mutable field on `prep`, last set by whichever of those two functions most recently dispatched an
 *  attempt, so it is NOT reliably fresh for a `runAttempt`-direct caller positioned this late in the
 *  ladder either). `'default'` is never rerun here at all — it already got its full, unreduced shot
 *  in the tier's own earlier pass and failed, so repeating it with LESS effective room (this tier's
 *  reserve fraction, however sized) would only waste budget.
 *
 *  Positioned dead last, AFTER STRATEGY_DEDUP_NEAR_TIE_RETRY (same reasoning as that tier's own
 *  REVISION 3: nothing may run after this one that still checks an unextended `nodeBudget`/
 *  `earlyTierNodeBudget`-derived ceiling, or its own extension would starve that later tier exactly
 *  the way an earlier draft of the dedup-retry tier starved the admissible-order tier itself).
 *
 *  VALIDATED then PROMOTED (2026-08-15, same day): local spot-check confirmed `R03148` recovers
 *  (1,914,111 nodes for `'none'`, referee-valid) and `R02644` is unaffected at both a solving budget
 *  (60M, byte-identical `'default'` attempt in both arms) and a non-solving one (50M, identical
 *  failure in both arms). Population-scale GHA A/B (run 31910836458, against the `764/1700`
 *  `STRATEGY_DEDUP_NEAR_TIE_RETRY`-promoted baseline) confirmed **809/1700, +45, with ZERO levels
 *  lost relative to baseline** — a strict superset of the baseline's solved set, the same clean shape
 *  that justified promoting `STRATEGY_DEDUP_NEAR_TIE_RETRY`. Unlike that tier, this one's reserve
 *  fraction held up cleanly at population scale on the FIRST population attempt (no REVISION-2/
 *  REVISION-3-style correction needed after the initial local-validation fix from 0.25 to 0.5 — see
 *  ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION's own comment). See
 *  reports/2026-08-15-connectivity-axis-exhausted-regression.md's "Applying the pattern elsewhere"
 *  section for the full validation writeup. Both interactive solve UIs
 *  (`solver-controller.ts`/`review-controller.ts`) are unaffected by this promotion — they already
 *  set `disableExtraBudgetPasses: true`, which zeroes this tier's budget fraction regardless of the
 *  ablation flag's default. */
export const ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY's own
 *  last-resort tier, as a fraction of `nodeBudget` — same ADDITIVE (not withheld-from-anyone) design
 *  as DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION, adopted from the start here rather than arrived at
 *  after a REVISION 2 correction, since that correction's lesson is now established practice for any
 *  NEW last-resort tier in this file.
 *
 *  CORRECTION (2026-08-15, same day, local testing before any GHA spend): an initial 0.25 (matching
 *  DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's own starting fraction) was tried first and found
 *  useless — `R03148` still failed to recover at `nodeBudget=50M` (`+12.5M` reserve). Tracing why
 *  found real, unrelated baseline drift since `reports/2026-07-30-admissible-order-node-reserve.md`
 *  was written (16+ days, many intervening solver changes): at EVERY node-budget scale tested (20M,
 *  100M), the earlier tiers (main loop/repair/diversity) now exhaust their full `earlyTierNodeBudget`
 *  share and `'default'` then exhausts its own full remaining share too, WITHOUT EITHER SOLVING —
 *  `'default'`'s own historical 6.87M-node need (that report's own figure) has grown to ~12.5-25M
 *  depending on scale, byte-identical whether this flag is on or off (confirming the drift is
 *  unrelated to this mechanism). A diagnostic run with an artificially large reserve
 *  (`admissibleOrderNonDefaultRetryNodeReserveFractionOverride: 2.0`, giving up to +100M on a 50M
 *  budget) DID recover `R03148` — `'none'` still only needs **1,914,111 nodes**, essentially
 *  unchanged from the historical 1.97M figure, referee-valid — confirming the double-edged shape and
 *  the mechanism itself are both still real; only the reserve needed to actually REACH that cheap
 *  solve had grown, because the ladder now spends far more before this tier's turn ever comes.
 *
 *  0.5 (doubled from the 0.25 first cut): still NOT derived from a proper A/B — a single successful
 *  data point (R03148 needed roughly 14.4M of additional room past a 50M ceiling to reach `'none'`'s
 *  turn and solve, once dedup-retry's own extension is accounted for) informs the direction (bigger
 *  than 0.25) but not a rigorous size. Population-scale validation is what determines whether 0.5 is
 *  enough, too little, or (following DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's own precedent of a
 *  12.5M reserve missing exactly one 34.8M outlier) simply insufficient for some other level's own
 *  need — same asymmetric-risk caution as every other reserve fraction in this file. See
 *  `reports/2026-08-15-connectivity-axis-exhausted-regression.md`'s "Applying the pattern elsewhere"
 *  section for the full local validation writeup, R02644's confirmed non-regression, and R03148's
 *  before/after data. */
export const ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY (PROMOTED to production default-ON, 2026-08-16 —
 *  built the same day as STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY and directly modeled on both
 *  that tier and STRATEGY_DEDUP_NEAR_TIE_RETRY).
 *
 *  Applies the same "run dead last, additive-only budget" pattern to a THIRD known double-edged
 *  mechanism, and this one is the root flag this whole investigation started from:
 *  `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` (topology.ts's `isConnected`/`isConnectedForTrap`, read via
 *  `prep._cfg` at the connectivity-flood-fill call site shared by DFS, beam, repair, and
 *  admissible-order search through `prune-gauntlet.ts`'s move-pruning gauntlet). Default-ON, it
 *  treats both-axes-spent cells as walls in the flood-fill reachability check — a legitimate,
 *  usually-correct tightening, but the exact beam-width-threshold timing artifact this report traces
 *  (see "The mechanism, fully traced" above) means it occasionally prunes away the eventual winning
 *  lineage. The report's own single-attempt-config comparison (`reports/2026-08-15-connectivity-
 *  axis-exhausted-regression.md`'s "This is not isolated to R02248" section) found disabling this
 *  flag entirely recovers `R02114` and `R00592` (referee-valid) — the two originally-confirmed
 *  regressions `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s own near-tie retention does NOT reach, because their
 *  blocking collision is a different depth/shape a single runner-up slot doesn't cover — but the SAME
 *  single-attempt test found `R03248` goes the OTHER way: it solves WITH the flag on and fails
 *  WITHOUT it. Real gain (`R02114`/`R00592`), real loss (`R03248`), same knob — exactly the double-
 *  edged shape a bounded last-resort retry is suited to, for the third time in this file.
 *
 *  MECHANISM: identical shape to STRATEGY_DEDUP_NEAR_TIE_RETRY — reruns the SAME `mainConfigs` ladder
 *  (every DFS/beam attempt config) via `runInterleavedAttempts`/`runGateSerialAttempts`, with
 *  `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` disabled through a Proxy override on `prep._cfg`, a fresh
 *  additive node ceiling (`nodeBudget + CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION`),
 *  and a fresh additive work allocation (own `prep._workMeter.units` mark, sized via `DEFAULT_WORK_PER_MS`
 *  from this tier's own ms allocation — the exact fix DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's
 *  own history needed after its first shipped design shared the depleting pool). `R03248` is
 *  structurally protected the same way `R02644` was for the admissible-order tier: it already solves
 *  via the normal, flag-ON ladder, so `result.solution` is set and this tier's own `!result.solution`
 *  guard skips it entirely — it should never reach this tier at all.
 *
 *  Positioned dead last — AFTER STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY, the current true end of
 *  the ladder — for the identical reason both prior tiers were placed there: nothing may run after
 *  this one that still checks an unextended `nodeBudget`/`earlyTierNodeBudget`-derived ceiling, or
 *  this tier's own additive extension would starve it exactly the way an earlier draft of the
 *  dedup-retry tier starved the admissible-order tier itself.
 *
 *  POPULATION-VALIDATED AND PROMOTED (2026-08-16, GHA run 31918095910, solver ref
 *  `fc3040cb3959e499a9a8df56348e43cb4300b077`, vs the 31910836458 baseline): corpus1 95/95 — exactly
 *  the same solved-ID set, zero change. corpus2 809→819, **+10 solves, zero regressions**
 *  (`R00296`, `R00592`, `R02068`, `R02088`, `R02114`, `R02491`, `R02690`, `R02878`, `R03195`,
 *  `R03357`) — both originally-targeted levels (`R02114`, `R00592`) recovered as predicted, plus 8
 *  more the local spot-check never tested for. `R03248` (the local single-attempt-config counter-
 *  example) was NOT lost, confirming the `!result.solution` skip-guard protected it at population
 *  scale as designed.
 *
 *  Unlike the two prior (also promoted) tiers, `PRUNE_CONNECTIVITY_AXIS_EXHAUSTED` gates a much
 *  hotter, more frequently-hit code path (every connectivity check across every search technique) —
 *  this showed up as a real, meaningfully larger cost increase, not just a solved-count question:
 *  corpus1 nodes +18.7% (936.8M → 1,111.8M), work +12.2% (1,415.8M → 1,588.3M); corpus2 nodes +28.2%
 *  (78.50B → 100.61B), work +22.1% (97.23B → 118.72B). Promoted anyway per explicit user direction
 *  (the promotion bar for this file's retry-tier ladder is solved-count gain + zero regressions, not
 *  cost neutrality — every tier in this ladder is inherently a cost/coverage trade by construction),
 *  but this is the largest cost delta of the three promoted tiers by a wide margin and is the first
 *  data point worth watching if a FOURTH tier is ever stacked on top of this one: the ladder's
 *  worst-case multiplier on `nodeBudget` is now higher, and each additional tier's own headroom has
 *  to be judged against an already-more-expensive baseline. See
 *  `reports/2026-08-15-connectivity-axis-exhausted-regression.md`'s "Population-scale confirmation"
 *  section for the full writeup. */
export const CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own
 *  last-resort tier, as a fraction of `nodeBudget` — same ADDITIVE (not withheld-from-anyone) design
 *  as DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION/ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_
 *  FRACTION, adopted from the start here rather than arrived at after a correction, since that
 *  lesson is now established practice for any new last-resort tier in this file.
 *
 *  CORRECTION (2026-08-16, local testing before any GHA spend): an initial 0.25 (matching
 *  DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION's own original starting point) was tried first and
 *  found insufficient — both `R02114`/`R00592` still failed (`node-budget-reached` at the 75M
 *  ceiling). This tier is now the THIRD retry tier in the ladder, stacked after both
 *  `STRATEGY_DEDUP_NEAR_TIE_RETRY` (its own reserve up to +0.25×`nodeBudget`) and
 *  `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` (+0.5×`nodeBudget`) — in the worst case the ladder
 *  can already sit at up to `nodeBudget × 1.75` by the time this tier's own entry guard is checked,
 *  before this tier's own additive room even begins. A diagnostic run with an artificially large
 *  reserve override (2.0) DID recover both — `R02114` at 204,993 nodes and `R00592` at 220,726 nodes
 *  for the winning attempt (`objectiveFirst@2000` in both cases), essentially IDENTICAL to the
 *  original single-attempt-config figures — confirming the technique itself is exactly as cheap as
 *  that evidence suggested; the reserve simply needs to be large enough to let the tier's turn
 *  actually arrive, not to fund an expensive search once it does. Doubled the default to 0.5,
 *  matching ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION's own final value, and
 *  re-validated at that exact shipped setting (not the diagnostic override) before shipping — see
 *  `reports/2026-08-15-connectivity-axis-exhausted-regression.md`'s "Applying the pattern elsewhere"
 *  section for the full validation writeup. Population-validated at 0.5 (2026-08-16, run 31918095910):
 *  +10 corpus2 solves, zero regressions on either corpus — see this constant's sibling comment on
 *  `CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION` for the full population result. */
export const CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY (opt-in, default OFF — NEW, unvalidated mechanism,
 *  2026-08-16, built the same day as the three tiers above and directly modeled on them, but
 *  applied to a DIFFERENT known double-edged mechanism than any of the three: `STRATEGY_REPAIR_
 *  ELITE_PREFIX_DFS` (repair-search.ts's `elitePrefixDfsRepair`, gated by `attempt-dispatch.ts`'s
 *  own opt-in-only `enableElitePrefixDfs` read, NOT the `!cfg || cfg.FLAG` convention).
 *
 *  `reports/2026-08-07-repair-elite-prefix-dfs.md` found this mechanism sound and mechanistically
 *  real (a confirmed badness-improvement feedback loop, debug-traced), but net-negative in its own
 *  20-level A/B (4/20 solved vs. 5/20 with it off) — with ONE confirmed cause: `R02239` solves via
 *  ordinary repair at 14,194,203 nodes with the mechanism off, but exhausts the SAME repair call's
 *  own 15,000,000-node budget without solving when it's on. This is the identical "scarce shared
 *  node budget, zero-sum reallocation" shape `STRATEGY_DEDUP_NEAR_TIE_RETRY`/`STRATEGY_ADMISSIBLE_
 *  ORDER_NON_DEFAULT_RETRY`/`STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` were each built to fix —
 *  the report's own "what would need to change" section proposed shrinking the mechanism's own
 *  constants or narrowing its attempt grid, but never considered running it as an ADDITIVE,
 *  DEAD-LAST retry instead of inline within the ordinary repair fallback loop's own shared budget.
 *
 *  MECHANISM: unlike the three tiers above (which rerun `mainConfigs`), this reruns `repairConfigs`
 *  — the same per-config/per-gate manual loop shape as the ordinary repair fallback loop (and
 *  `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`'s own per-profile loop) rather than
 *  `runInterleavedAttempts`/`runGateSerialAttempts`. `prep._cfg` is Proxy-overridden to force
 *  `STRATEGY_REPAIR_ELITE_PREFIX_DFS: true` (the OPPOSITE polarity from the three tiers above,
 *  which each disable a flag — this one ENABLES one), which `attempt-dispatch.ts`'s `runAttemptSearch`
 *  reads to set `enableElitePrefixDfs` for `repairSearchFromGate`. Because the ordinary repair
 *  fallback loop above already ran to completion with the flag OFF and its own UNTOUCHED node
 *  ceiling, `R02239`-shaped levels are structurally protected exactly the way `R02644`/`R03248` were
 *  for the other two tiers: the ordinary loop's own budget is never shared with this tier, so a
 *  level that solves there is unaffected regardless of what this tier does afterward. Within THIS
 *  tier's own fresh additive budget, the elite-prefix-DFS sub-search still competes with ordinary
 *  repair exploration for nodes exactly as the original report described — that internal cost is
 *  accepted as this specific technique's own price of admission, the same way a whole-ladder rerun
 *  is accepted as `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s own cost; what changes is that the cost is no
 *  longer paid by a DIFFERENT, otherwise-successful attempt.
 *
 *  Positioned dead last — AFTER `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`, the current true end
 *  of the ladder — for the identical reason all three tiers above were placed there: nothing may
 *  run after this one that still checks an unextended ceiling, or this tier's own additive
 *  extension would starve it.
 *
 *  CLOSED, NOT PROMOTED (2026-08-19). Validated on the original 20-level closest-miss sample at
 *  TWO retry budgets (7.5M and the full 15M matching the original report's own ON-arm scale, via
 *  `scripts/stress/elite-prefix-dfs-retry-validate.mjs`, sharded across 10 parallel GHA jobs):
 *  **zero recoveries at either budget** — the protected (flag-off) loop alone solved 5/20
 *  (`R00342`/`R00877`/`R02022`/`R02220`/`R02239`, byte-identical at both budgets), and of the 15
 *  that failed there, none were rescued by a fresh, fully-uncontested retry pass either. Doubling
 *  the retry budget changed nothing, ruling out under-provisioning. This confirms the mechanism's
 *  real limitation was never the shared-budget displacement this tier structurally eliminates —
 *  `elitePrefixDfsRepair` itself doesn't have enough power to close these particular gaps at these
 *  budgets, full stop; the original report's own "badness improved from 4 to 3" evidence was always
 *  intermediate progress, never an actual extra solve, so this negative result is consistent with
 *  that report's own findings, not a reversal of them. Kept in the codebase (opt-in, default-OFF,
 *  zero production risk, sound reusable infrastructure) but NOT a promotion candidate without a
 *  materially different approach to the underlying operator itself. See
 *  `reports/2026-08-07-repair-elite-prefix-dfs.md`'s "Follow-up (2026-08-19)" section for the full
 *  writeup and data table. */
export const REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY's own last-resort
 *  tier, as a fraction of the PRECEDING tier's own ceiling (`connectivityRetryNodeCeiling`) — same
 *  "stack on the immediately-preceding tier's own ceiling" design `CONNECTIVITY_AXIS_EXHAUSTED_
 *  RETRY_NODE_RESERVE_FRACTION`'s own comment derives and explains (restarting from plain
 *  `nodeBudget` risks landing on the exact same absolute ceiling as an earlier tier at a
 *  coincidentally-equal fraction, giving this tier zero real headroom) — adopted from the start
 *  here rather than arrived at after a correction, since that lesson is now established practice
 *  for any new last-resort tier in this file. Starting value matches the three siblings' own final
 *  (post-correction) value; not yet locally or population validated at this exact setting. */
export const REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_MC_NEIGHBOR_BUDGET_RETRY (NEW, opt-in, default OFF — 2026-08-19). The FIFTH application
 *  of the "run dead last, additive-only budget" pattern, and the fourth distinct double-edged
 *  mechanism it has been pointed at: `PRUNE_MC_NEIGHBOR_BUDGET`.
 *
 *  WHY THIS MECHANISM. That prune was promoted default-ON on a strong level-blind population result
 *  (611/1700 OFF -> 665/1700 ON, 59 gained / 5 lost). The five losses were then individually
 *  diagnosed (`reports/2026-08-12-neighbor-budget-five-loss-diagnosis.md`): four of them share one
 *  clean mechanism — the exact deterministic beam attempt that WINS under OFF is still tried under
 *  ON, runs to a similar node count, and fails. Not budget exhaustion, not the already-fixed
 *  repair-seed reindexing issue: a bounded-width diverse-beam retention effect. That promotion
 *  deliberately accepted those five as "a small, bounded, already-understood cost" because no
 *  mechanism existed to recover them without giving back the 59 gains. This tier is that mechanism.
 *
 *  WHY NOW, AND WHAT IS CONFIRMED. Three of the five (`R00635`, `R02823`, `R02867`) have since been
 *  recovered by unrelated solver work and are solved at the 2026-08-16 capability baseline (run
 *  `31918095910`, 819/1700). The remaining two, `R02119` and `R02422`, are still unsolved there;
 *  `R02119` recovers at HEAD when the prune is disabled — referee-valid, level-blind, at the
 *  production 50M-node protocol, via `beam:mustCrossFirst@beam2000` at 25,863,058 nodes, matching the
 *  2026-08-12 diagnosis. `R02422` was ALSO reported to recover this way (via
 *  `beam:intersectionHarvest@beam5000(diverse)` at 50,333,677 nodes) but that finding does NOT
 *  reproduce — see MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION's own promotion comment below for the
 *  2026-08-19 re-verification (the config exhausts naturally at ~304,900 nodes regardless of this
 *  prune's setting; not a budget story). So the diagnosed mechanism is confirmed live only via
 *  `R02119` 8 days and ~95 corpus-2 solves later, not via both originally-claimed levels.
 *
 *  WHY LEVELS THE PRUNE HELPS ARE SAFE. Structurally protected exactly the way `R02644` was for
 *  `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` and `R03248` for
 *  `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY`: a level that benefits from the prune already solves
 *  via the normal flag-on ladder, so this tier's own `!result.solution` guard skips it entirely. The
 *  59 gains are never at risk, because this tier never runs on a level that solved.
 *
 *  THE ELIGIBILITY GATE — the one thing this tier does that its four predecessors do not.
 *  `prune-gauntlet.ts` only ever reaches `PRUNE_MC_NEIGHBOR_BUDGET` when `state.mustCrossMask !== 0`.
 *  A level whose `prep.initialMustCrossMask` is 0 therefore can never have had a single move rejected
 *  by this prune, so rerunning the ladder with it disabled is provably BIT-IDENTICAL to the ladder
 *  that already ran and failed — pure waste, not a second chance. Gating on that is sound (a
 *  soundness argument, not a heuristic predictor) and free (one field read at prep time, no hot-path
 *  instrumentation). It skips 389 of the 881 unsolved Corpus-2 levels outright — 44%.
 *
 *  This matters because the pattern's cost is compounding while its returns decay: the tiers landed
 *  +40, +45, +10, and 0 solves respectively, and the third alone cost +28.2% Corpus-2 nodes / +22.1%
 *  work, because each tier stacks another additive ceiling on the last (at `nodeBudget` 50M a failing
 *  level already runs to 100M). The three shipped tiers each pay their full cost on every unsolved
 *  level. Making the newest one pay only where it could possibly help is the cheapest available brake
 *  — and if this gate holds up at population scale, the same soundness-gate treatment is the obvious
 *  follow-up for reclaiming part of the cost already paid by the three tiers above.
 *
 *  1.0 = one full `timeBudgetMs` window, same as all four sibling tiers.
 *
 *  POPULATION-VALIDATED AND PROMOTED (2026-08-19, GHA run 32224200709 vs the 31918095910 baseline):
 *  corpus1 95/102 identical solved-ID set (zero change); corpus2 819→828, +9 solves (R02119,
 *  R02128, R02132, R02401, R02512, R02783, R02835, R02947, R03361), ZERO regressions. R02119
 *  recovered as predicted; R02422 did NOT recover in this shared-ladder-rerun population run despite
 *  the isolated single-config test above showing it recoverable — an open, non-blocking discrepancy
 *  (see ablation-config.ts's own comment), most likely the shared additive-budget rerun not giving
 *  `beam:intersectionHarvest@beam5000(diverse)` enough of the tier's reserve. Cost: corpus1 nodes
 *  +22.5%/work +12.4%, corpus2 nodes +23.0%/work +16.5% — comparable to (cheaper on corpus2 than)
 *  STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own promoted cost; promoted per the same established
 *  bar (solved-count gain plus zero regressions, not cost neutrality). */
export const MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION = 1.0;

/** Extra node headroom given ADDITIVELY to STRATEGY_MC_NEIGHBOR_BUDGET_RETRY's own ceiling, as a
 *  fraction of the PRECEDING tier's own ceiling (`repairElitePrefixDfsRetryNodeCeiling`), never
 *  withheld from any earlier tier.
 *
 *  STACKED ON THE PRECEDING TIER'S CEILING, not `nodeBudget` — the lesson
 *  `CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION`'s own comment paid for the hard way
 *  (two tiers whose fractions coincide compute the identical absolute ceiling, so the later one gets
 *  literally zero headroom no matter what fraction it is given), applied here from the start rather
 *  than rediscovered a fifth time.
 *
 *  SIZING (historical basis, not re-derived after the 2026-08-19 correction below). `R02422` was
 *  originally reported to need 50,333,677 cumulative nodes to solve in a from-scratch prune-off
 *  solve at the 50M protocol -- that figure does not reproduce (see MC_NEIGHBOR_BUDGET_RETRY_BUDGET_
 *  FRACTION's own promotion comment), but the fraction below was never retuned to a smaller number on
 *  the strength of that correction, since the actual population A/B (which supersedes any single-
 *  level sizing estimate) already validated the fraction as shipped. At 0.5 of a
 *  `repairElitePrefixDfsRetryNodeCeiling` that is itself 100M at `nodeBudget` 50M (both preceding
 *  retry tiers default-ON, elite-prefix-DFS retry default-OFF and contributing 0), that is 50M of
 *  genuine additive headroom. Calibrated to the confirmed targets, NOT to an A/B — expect to retune
 *  it downward once a population run shows what the tier actually spends, exactly as
 *  `ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION` was corrected from 0.25 to 0.5 before
 *  any GHA spend. Strictly a no-op when `nodeBudget` is `Infinity` (every production path) or the
 *  tier is ineligible/suppressed. */
export const MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION = 0.5;

/** STRATEGY_REPAIR_LATE_PROBE (default ON — promoted 2026-08-21 on a same-commit,
 *  deterministic A/B at main@e5034e8c: GHA runs 32453248184 (flag on) vs 32459711208 (flag off)
 *  read Corpus-1 96/102 vs 95/102 and Corpus-2 881/1700 vs 863/1700, i.e. +19 net gains and zero
 *  losses across both corpora). Priority 7 (docs/solver-
 *  optimization-current-queue.md): the census found 94 of 158 currently-unsolved Corpus-2 levels
 *  where repair wins in isolation are structurally excluded from EVER trying repair, because
 *  `needsRepairFallback` (`mustCross >= 2 AND mustPass >= 3`, or very-high reqInt) never matches
 *  them — `repairConfigs` is empty for the whole level, so neither the early probe
 *  (runRepairProbe) nor the ordinary fallback loop below ever run, regardless of budget or
 *  ordering. Widening `needsRepairFallback` itself was rejected (matched-comparison analysis found
 *  no single/pair feature cleanly separates "repair wins cheaply here" from the much larger
 *  ineligible population that never wins) — this tier sidesteps the "which levels" question
 *  entirely by trying repair ANYWAY, cheaply and unconditionally, on every level `repairConfigs`
 *  left untouched, but ONLY as the true dead-last tier, after every other technique has already
 *  failed.
 *
 *  WHY DEAD LAST, NOT EARLY (the shape this tier deliberately avoids): the existing repair PROBE
 *  (`runRepairProbe`, `REPAIR_PROBE_ORDINARY_NODE_BUDGET`) is already a small, bounded repair
 *  attempt — but it runs unconditionally BEFORE the main loop, on every solve of an eligible level,
 *  win or lose. Its own code comments document the resulting cost on a level where repair never
 *  succeeds: "the probe instead burns its FULL node budget as pure dead search every single
 *  solve" (confirmed on R02401, ~10.7s of unconditional overhead, the exact bug
 *  `repairBudgetFractionOverride: 0` was supposed to prevent). Naively widening THAT probe's
 *  eligibility would import the identical tax onto every newly-eligible level's EVERY solve, not
 *  just its failures. A dead-last placement instead means a level that already solves via any
 *  earlier technique — the overwhelming majority of any corpus — never reaches this tier at all,
 *  so it costs nothing there regardless of budget size; the "dead search" cost is paid only by
 *  levels that were already going to report unsolved.
 *
 *  SIZING: flat 2,000,000-node cap (REPAIR_LATE_PROBE_NODE_BUDGET below), deliberately NOT a
 *  fraction of `timeBudgetMs`/`nodeBudget` like the five whole-ladder-rerun tiers above — this
 *  tier's entire premise is being cheap and tightly bounded, not thorough (mirroring
 *  REPAIR_PROBE_ORDINARY_NODE_BUDGET's own flat-constant shape, not the fractional-reserve shape).
 *  Population-scale quantification (docs/solver-optimization-current-queue.md, same section): at a
 *  2,000,000-node cap, 26 of the 314 currently-unsolved Corpus-2 levels this tier can reach solve
 *  within budget (8.3%) — a real but modest recovery rate, with the large majority of newly-probed
 *  levels paying the full capped cost for nothing. Because of the dead-last placement, that cost
 *  is confined to already-failing levels (a batch/regression-timing cost), never a solve a player
 *  could otherwise win.
 *
 *  Positioned dead last — AFTER the must-cross-neighbor-budget retry tier above, the current true
 *  end of the ladder — for the identical reason as its five predecessors: nothing may run after
 *  this one that still checks an unextended ceiling, or this tier's own additive extension would
 *  starve it.
 *
 *  Default-ON (promoted 2026-08-21, see the population-scale A/B cited above): the flag check at
 *  this tier's own run condition below now uses the standard convention (`!cfg ||
 *  cfg.STRATEGY_REPAIR_LATE_PROBE`), matching every other default-on tier, so it runs for every
 *  production/interactive caller (cfg null) and any ablation config that doesn't explicitly
 *  disable it. Disable via `STRATEGY_REPAIR_LATE_PROBE: false` to get the pre-promotion shape
 *  back for an A/B. */
export const REPAIR_LATE_PROBE_NODE_BUDGET = 2_000_000;

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


export function attemptConfigKey(config: AttemptConfig): string {
    if (config.admissibleOrder) {
        const base = config.admissibleOrderNoTieBreak ? 'ida:none' : `ida:${config.profileName}`;
        return config.admissibleOrderLds ? `${base}(lds)` : base;
    }
    const mode = config.beamWidth ? 'beam' : 'dfs';
    const template = config.template?.id ? `/${config.template.id}` : '';
    const beam = config.beamWidth ? `@beam${config.beamWidth}` : '';
    const diverse = config.diverseBeam ? '(diverse)' : '';
    const repair = config.repair ? ':repair' : '';
    const biased = config.repairMustTurnBiased ? '(mustTurnBiased)' : config.repairTurnBiased ? '(turnBiased)' : '';
    return `${mode}:${config.profileName}${template}${beam}${diverse}${repair}${biased}`;
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
    const workBudget = Number(opts.workBudget) > 0
        ? Number(opts.workBudget)
        : Math.max(MIN_ATTEMPT_WORK, Math.floor(timeBudgetMs * DEFAULT_WORK_PER_MS));
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

    const finish = (solveResult: SolveResult): SolveResult => {
        if (!opts.lifecycleTelemetry) return solveResult;
        // Order matters for `winningIndex`/`stoppedByDeadline` too, not just labeling — see
        // classifyAttemptTier's own doc comment for the precedence rationale.
        const classify = classifyAttemptTier;
        const disabledExtras = opts.disableExtraBudgetPasses === true;
        const repairEnabled = !disabledExtras && Number(opts.repairBudgetFractionOverride ?? 1) !== 0;
        // NOTE on TDZ safety: this closure can be invoked from the primeAttempt early-return path
        // BELOW this point but ABOVE where `repairConfigs`/`mainConfigs`/`admissibleOrderNonDefault
        // Configs` are declared later in this function — referencing those consts here would throw
        // (temporal dead zone) on that path. Every predicate below is built ONLY from `baseConfigs`/
        // `prep`/`opts`/`cfg`, all already in scope by this point, matching the original 5
        // categories' own existing pattern (they never referenced those later consts either).
        const hasRepairConfig = baseConfigs.some(config => config.repair);
        const hasMainConfig = baseConfigs.some(config => !config.repair && !config.admissibleOrder);
        const hasNonDefaultAdmissibleOrderConfig = baseConfigs.some(config => config.admissibleOrder && config.profileName !== 'default');
        const runnable = new Map<string, boolean>([
            ['repair-probe', repairEnabled && (!cfg || cfg.STRATEGY_REPAIR_PROBE === true) && hasRepairConfig],
            ['main-ladder', hasMainConfig],
            ['repair-fallback', repairEnabled && hasRepairConfig],
            ['attraction-diversity', !disabledExtras && Number(opts.attractionDiversityBudgetFractionOverride ?? 1) !== 0
                && (!cfg || cfg.STRATEGY_ATTRACTION_DIVERSITY === true)],
            ['admissible-order', !disabledExtras && Number(opts.admissibleOrderBudgetFractionOverride ?? 1) !== 0
                && (!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER === true) && baseConfigs.some(config => config.admissibleOrder)],
            ['dedup-near-tie-retry', !disabledExtras && Number(opts.dedupNearTieRetryBudgetFractionOverride ?? 1) !== 0
                && !!(!cfg || cfg.STRATEGY_DEDUP_NEAR_TIE_RETRY)],
            ['admissible-order-non-default-retry', !disabledExtras && Number(opts.admissibleOrderNonDefaultRetryBudgetFractionOverride ?? 1) !== 0
                && !!(!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY) && hasNonDefaultAdmissibleOrderConfig],
            ['connectivity-axis-exhausted-retry', !disabledExtras && Number(opts.connectivityAxisExhaustedRetryBudgetFractionOverride ?? 1) !== 0
                && !!(!cfg || cfg.STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY)],
            ['repair-elite-prefix-dfs-retry', Number(opts.repairElitePrefixDfsRetryBudgetFractionOverride ?? (disabledExtras ? 0 : 1)) !== 0
                && !!(cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY === true) && hasRepairConfig],
            ['mc-neighbor-budget-retry', !disabledExtras && Number(opts.mcNeighborBudgetRetryBudgetFractionOverride ?? 1) !== 0
                && !!(!cfg || cfg.STRATEGY_MC_NEIGHBOR_BUDGET_RETRY) && prep.initialMustCrossMask !== 0],
            ['repair-late-probe', Number(opts.repairLateProbeNodeBudgetOverride ?? (disabledExtras ? 0 : 1)) !== 0
                && !!(!cfg || cfg.STRATEGY_REPAIR_LATE_PROBE) && !hasRepairConfig
                && !(cfg && 'STRATEGY_REPAIR_FALLBACK' in cfg && cfg.STRATEGY_REPAIR_FALLBACK === false)],
        ]);
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
    const repairFractionOverride = Number(opts.repairBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const repairBudgetFraction = Number.isFinite(repairFractionOverride) && repairFractionOverride >= 0
        ? repairFractionOverride
        : REPAIR_EXTRA_BUDGET_FRACTION;

    // opts.attractionDiversityBudgetFractionOverride — same shape/rationale as repairBudgetFraction's
    // own resolution just above. Hoisted here (rather than only just before the diversity pass itself
    // runs, much further down) for the SAME reason repairBudgetFraction was hoisted before the probe:
    // ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's own eligibility check, below, needs to know whether
    // the diversity pass would run at all before deciding whether reserving nodes for it is real or a
    // strand.
    const diversityFractionOverride = Number(opts.attractionDiversityBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const diversityBudgetFraction = Number.isFinite(diversityFractionOverride) && diversityFractionOverride >= 0
        ? diversityFractionOverride
        : ATTRACTION_DIVERSITY_BUDGET_FRACTION;

    // opts.dedupNearTieRetryBudgetFractionOverride — same shape/rationale/hoisting reason as
    // diversityBudgetFraction just above. STRATEGY_DEDUP_NEAR_TIE_RETRY is default-ON as of the
    // PROMOTION (see that flag's own comment) — `disableExtraBudgetPasses: true` (both interactive
    // solve UIs) still zeroes this fraction, same as every other extra-budget tier.
    const dedupRetryFractionOverride = Number(opts.dedupNearTieRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const dedupRetryBudgetFraction = Number.isFinite(dedupRetryFractionOverride) && dedupRetryFractionOverride >= 0
        ? dedupRetryFractionOverride
        : DEDUP_NEAR_TIE_RETRY_BUDGET_FRACTION;
    const dedupRetryNodeReserveFractionRaw = Number(opts.dedupNearTieRetryNodeReserveFractionOverride);
    const dedupRetryNodeReserveFraction = Number.isFinite(dedupRetryNodeReserveFractionRaw) && dedupRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, dedupRetryNodeReserveFractionRaw)
        : DEDUP_NEAR_TIE_RETRY_NODE_RESERVE_FRACTION;

    // opts.admissibleOrderNonDefaultRetryBudgetFractionOverride — same shape/rationale/hoisting
    // reason as dedupRetryBudgetFraction just above. PROMOTED to default-ON (see
    // ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION's own comment) — `disableExtraBudgetPasses:
    // true` (both interactive solve UIs) still zeroes this fraction, same as every other extra-budget
    // tier.
    const nonDefaultRetryFractionOverride = Number(opts.admissibleOrderNonDefaultRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const nonDefaultRetryBudgetFraction = Number.isFinite(nonDefaultRetryFractionOverride) && nonDefaultRetryFractionOverride >= 0
        ? nonDefaultRetryFractionOverride
        : ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION;
    const nonDefaultRetryNodeReserveFractionRaw = Number(opts.admissibleOrderNonDefaultRetryNodeReserveFractionOverride);
    const nonDefaultRetryNodeReserveFraction = Number.isFinite(nonDefaultRetryNodeReserveFractionRaw) && nonDefaultRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, nonDefaultRetryNodeReserveFractionRaw)
        : ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION;

    // opts.connectivityAxisExhaustedRetryBudgetFractionOverride — same shape/rationale/hoisting
    // reason as dedupRetryBudgetFraction/nonDefaultRetryBudgetFraction above. PROMOTED to
    // default-ON (see CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION's own comment), so the
    // `!cfg ||` check below is the standard promoted-default convention, matching its two promoted
    // siblings, not an opt-in check.
    const connectivityRetryFractionOverride = Number(opts.connectivityAxisExhaustedRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const connectivityRetryBudgetFraction = Number.isFinite(connectivityRetryFractionOverride) && connectivityRetryFractionOverride >= 0
        ? connectivityRetryFractionOverride
        : CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION;
    const connectivityRetryNodeReserveFractionRaw = Number(opts.connectivityAxisExhaustedRetryNodeReserveFractionOverride);
    const connectivityRetryNodeReserveFraction = Number.isFinite(connectivityRetryNodeReserveFractionRaw) && connectivityRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, connectivityRetryNodeReserveFractionRaw)
        : CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION;

    // opts.repairElitePrefixDfsRetryBudgetFractionOverride — same shape/hoisting reason as the
    // three above. Opt-in/default-OFF (NEW, unvalidated mechanism — see REPAIR_ELITE_PREFIX_DFS_
    // RETRY_BUDGET_FRACTION's own comment), so the `cfg &&` ... `=== true` check below (where this
    // tier's run condition is computed) is the opt-in convention, not the standard `!cfg || cfg.FLAG`
    // shape — matching every tier's own pre-promotion lifecycle stage. The convenience switch must
    // still suppress an explicitly selected experimental config: batch callers use it to mean no
    // additive work at all. As with the promoted tiers, an explicit per-tier override wins.
    const repairElitePrefixDfsRetryFractionOverride = Number(opts.repairElitePrefixDfsRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const repairElitePrefixDfsRetryBudgetFraction = Number.isFinite(repairElitePrefixDfsRetryFractionOverride) && repairElitePrefixDfsRetryFractionOverride >= 0
        ? repairElitePrefixDfsRetryFractionOverride
        : REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION;
    const repairElitePrefixDfsRetryNodeReserveFractionRaw = Number(opts.repairElitePrefixDfsRetryNodeReserveFractionOverride);
    const repairElitePrefixDfsRetryNodeReserveFraction = Number.isFinite(repairElitePrefixDfsRetryNodeReserveFractionRaw) && repairElitePrefixDfsRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, repairElitePrefixDfsRetryNodeReserveFractionRaw)
        : REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION;

    // opts.mcNeighborBudgetRetryBudgetFractionOverride — same shape/hoisting reason as the four
    // above. This tier is now default-ON, so omitting the convenience fallback here would make
    // disableExtraBudgetPasses leak an entire additive ladder rerun on must-cross levels.
    const mcNeighborBudgetRetryFractionOverride = Number(opts.mcNeighborBudgetRetryBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const mcNeighborBudgetRetryBudgetFraction = Number.isFinite(mcNeighborBudgetRetryFractionOverride) && mcNeighborBudgetRetryFractionOverride >= 0
        ? mcNeighborBudgetRetryFractionOverride
        : MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION;
    const mcNeighborBudgetRetryNodeReserveFractionRaw = Number(opts.mcNeighborBudgetRetryNodeReserveFractionOverride);
    const mcNeighborBudgetRetryNodeReserveFraction = Number.isFinite(mcNeighborBudgetRetryNodeReserveFractionRaw) && mcNeighborBudgetRetryNodeReserveFractionRaw >= 0
        ? Math.min(1, mcNeighborBudgetRetryNodeReserveFractionRaw)
        : MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION;

    // Admissible-order tier's NODE RESERVE (see ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION). Resolved
    // here, before the probe, because it has to shrink the ceiling every EARLIER tier runs against —
    // that is the whole mechanism. `earlyTierNodeBudget` replaces `nodeBudget` for the probe, the
    // main loop, the repair fallback and the attraction-diversity pass; the tier itself keeps the
    // full `nodeBudget`, so the nodes it can spend are exactly what the earlier tiers were denied.
    //
    // The reserve is deliberately computed from the tier's REAL run condition (fraction, ablation
    // flag, and a non-empty config list — the same three things its own loop below checks), not just
    // from the fraction: reserving nodes for a tier that will not run would strand them, turning a
    // 'node-budget-reached' result into a 'failed' one and silently shrinking the effective budget
    // of every disableExtraBudgetPasses caller — i.e. exactly the interactive UI paths whose bounded
    // cost REPAIR_PROBE's own 2026-07-17 fix was about restoring.
    const admissibleOrderFractionOverride = Number(opts.admissibleOrderBudgetFractionOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const admissibleOrderBudgetFraction = Number.isFinite(admissibleOrderFractionOverride) && admissibleOrderFractionOverride >= 0
        ? admissibleOrderFractionOverride
        : ADMISSIBLE_ORDER_BUDGET_FRACTION;
    const admissibleOrderTierWillRun = admissibleOrderBudgetFraction > 0
        && (!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER)
        && admissibleOrderConfigs.length > 0;
    const reserveFractionOverride = Number(opts.admissibleOrderNodeReserveFractionOverride);
    const admissibleOrderNodeReserveFraction = Number.isFinite(reserveFractionOverride) && reserveFractionOverride >= 0
        ? reserveFractionOverride
        : ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION;
    const admissibleOrderNodeReserve = (admissibleOrderTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * admissibleOrderNodeReserveFraction)
        : 0;

    // STRATEGY_DEDUP_NEAR_TIE_RETRY's own node reserve.
    //
    // REVISION 2 (2026-08-15, same day as REVISION 1 below): the withheld-up-front design (REVISION 1)
    // shipped, was population-validated via GHA, and turned out to be a net -17 (707 vs. the 724
    // baseline), not a recovery. It hit its actual target exactly as designed — 33 of 34 losses
    // recovered, 0 of 27 gains broken — but cost 65 UNRELATED levels (solved both with and without
    // the original retention fix) that now report `node-budget-reached`. Root cause: subtracting
    // `dedupRetryNodeReserve` from `earlyTierNodeBudget` shrinks the main loop's ceiling for EVERY
    // Corpus-2 level the instant the flag is globally on, not just the 34 that actually reach this
    // tier — any level whose real winning solve needed more than `nodeBudget - dedupRetryNodeReserve`
    // in the main loop now gets cut off before finding it. Full data:
    // reports/2026-08-15-connectivity-axis-exhausted-regression.md's "retry pass at population scale"
    // section.
    //
    // Fixed by making the reserve ADDITIVE instead of subtractive — the exact "extend, don't carve
    // from the existing pool" philosophy this tier's own WORK budget already uses (see
    // dedupRetryWorkStart/dedupRetryWorkBudget's own comment at the call site below, fixed the same
    // day for the same reason). `earlyTierNodeBudget` no longer includes this reserve at all — every
    // earlier tier (probe, main loop, repair fallback, attraction-diversity) keeps the FULL `nodeBudget`
    // (minus only `admissibleOrderNodeReserve`, unaffected by this change) exactly as if this tier
    // didn't exist. This tier gets its own EXTENDED ceiling, `dedupRetryNodeCeiling = nodeBudget +
    // dedupRetryNodeReserve`, used both for its entry guard and its call-site node-budget parameter
    // (previously plain `nodeBudget` in both places — a stale reference now that earlier tiers are no
    // longer shrunk, which would otherwise make this tier immediately skip: nodesExpanded can already
    // sit at or above the ORIGINAL nodeBudget by the time this tier is reached).
    //
    // SAFE BY CONSTRUCTION for production: `nodeBudget` is `Infinity` on every production path (Play/
    // Editor/Review/hint-discovery), where `dedupRetryNodeReserve` is already forced to 0 regardless
    // of this change (see below) — so `dedupRetryNodeCeiling === nodeBudget === Infinity` there,
    // unchanged. The cost of this fix is real total node spend ONLY on finite-nodeBudget offline batch
    // runs with the flag on — this tier's reserve is no longer "free" (redistributed from elsewhere),
    // it is a genuine addition to that run's per-level node ceiling, same tradeoff already accepted
    // for the WORK budget.
    //
    // REVISION 1 (2026-08-15, same day): the first shipped design withheld this reserve straight off
    // `nodeBudget`, SIBLING to admissibleOrderNodeReserve (both subtracted independently, not nested)
    // — chosen over an even earlier "floor at the tier's own call site" attempt, which was a no-op the
    // moment an earlier tier had already spent the entire nodeBudget (confirmed locally: R00180
    // reproduced its exact GHA node count, 50,000,148, then the retry pass got 0 nodes). REVISION 1
    // fixed that no-op — the tier genuinely got its reserved nodes — but at the population-scale cost
    // described above, which REVISION 2 fixes by no longer taking those nodes FROM anyone.
    // PROMOTED to default-ON (see the constant's own comment) — standard `(!cfg || cfg.FLAG)`
    // convention, same as admissibleOrderTierWillRun just below, not the opt-in `cfg && ... === true`
    // shape this used before promotion.
    const dedupRetryTierWillRun = dedupRetryBudgetFraction > 0 && !!(!cfg || cfg.STRATEGY_DEDUP_NEAR_TIE_RETRY);
    const dedupRetryNodeReserve = (dedupRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * dedupRetryNodeReserveFraction)
        : 0;
    const dedupRetryNodeCeiling = nodeBudget === Infinity ? Infinity : nodeBudget + dedupRetryNodeReserve;

    // STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY's own node reserve — additive from the start (see
    // ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. `admissibleOrderNonDefaultConfigs.length > 0`
    // guards against reserving for a tier with nothing to run (every profile besides 'default' absent
    // — e.g. STRATEGY_ADMISSIBLE_ORDER disabled entirely, though that already zeroes
    // admissibleOrderConfigs itself, or a hypothetical future config list containing only 'default').
    // PROMOTED to default-ON (see the constant's own comment) — standard `(!cfg || cfg.FLAG)`
    // convention, same as dedupRetryTierWillRun above, not the opt-in `cfg && ... === true` shape
    // this used before promotion.
    const nonDefaultRetryTierWillRun = nonDefaultRetryBudgetFraction > 0
        && !!(!cfg || cfg.STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY)
        && admissibleOrderNonDefaultConfigs.length > 0;
    const nonDefaultRetryNodeReserve = (nonDefaultRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * nonDefaultRetryNodeReserveFraction)
        : 0;
    const nonDefaultRetryNodeCeiling = nodeBudget === Infinity ? Infinity : nodeBudget + nonDefaultRetryNodeReserve;

    // STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own node reserve — additive from the start (see
    // CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. PROMOTED to default-ON (2026-08-16, run
    // 31918095910): corpus1 95/95 identical solved set (zero change), corpus2 809→819 (+10, zero
    // regressions) — see CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION's own comment.
    const connectivityRetryTierWillRun = connectivityRetryBudgetFraction > 0
        && !!(!cfg || cfg.STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY);
    const connectivityRetryNodeReserve = (connectivityRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(nodeBudget * connectivityRetryNodeReserveFraction)
        : 0;
    // STACKED on `nonDefaultRetryNodeCeiling` (the immediately-preceding tier's own ceiling), NOT
    // `nodeBudget` directly — found necessary by local testing before any GHA spend: at matching
    // fractions (both 0.5), `nodeBudget + connectivityRetryNodeReserve` computes to the EXACT SAME
    // absolute value as `nonDefaultRetryNodeCeiling` (both `1.5 × nodeBudget`), so the instant that
    // preceding tier maxes out its own ceiling on a failing attempt, this tier's entry guard
    // (`nodesExpanded < connectivityRetryNodeCeiling`) is already false — zero real headroom,
    // regardless of this tier's own reserve fraction. Confirmed directly: `R02114`/`R00592` both
    // recovered with an artificially large reserve override (2.0) but STILL failed at the shipped 0.5
    // default until this fix, landing at exactly the SAME `75,000,003`/`75,000,198` node counts either
    // way — proof the tier was never actually getting more room as the fraction changed. Stacking on
    // the preceding tier's own ceiling instead guarantees genuine additive headroom regardless of what
    // fraction that tier happens to use, rather than relying on the two fractions coincidentally
    // differing (which is what let `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY`'s own 0.5 vs.
    // `STRATEGY_DEDUP_NEAR_TIE_RETRY`'s 0.25 avoid this exact bug by accident, not by design — not
    // retroactively changed here, since both are already population-validated and shipped as-is).
    const connectivityRetryNodeCeiling = nonDefaultRetryNodeCeiling === Infinity ? Infinity : nonDefaultRetryNodeCeiling + connectivityRetryNodeReserve;

    // STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY's own node reserve — additive from the start (see
    // REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. Opt-in convention (`cfg && ... === true`) —
    // this is a NEW, unvalidated mechanism, unlike its three promoted siblings above.
    const repairElitePrefixDfsRetryTierWillRun = repairElitePrefixDfsRetryBudgetFraction > 0
        && !!(cfg && cfg.STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY === true)
        && repairConfigs.length > 0;
    const repairElitePrefixDfsRetryNodeReserve = (repairElitePrefixDfsRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(connectivityRetryNodeCeiling * repairElitePrefixDfsRetryNodeReserveFraction)
        : 0;
    // STACKED on `connectivityRetryNodeCeiling` (the immediately-preceding tier's own ceiling), NOT
    // `nodeBudget` directly — this tier is built with that lesson already applied from the start
    // (see REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION's own comment), rather than
    // discovering the same starvation bug a fourth time.
    const repairElitePrefixDfsRetryNodeCeiling = connectivityRetryNodeCeiling === Infinity
        ? Infinity
        : connectivityRetryNodeCeiling + repairElitePrefixDfsRetryNodeReserve;

    // STRATEGY_MC_NEIGHBOR_BUDGET_RETRY's own node reserve — additive from the start (see
    // MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION's own comment), never subtracted from
    // `earlyTierNodeBudget` or any other tier's ceiling. PROMOTED to default-ON (2026-08-19, GHA run
    // 32224200709 vs the 31918095910 baseline): corpus1 95/102 identical solved-ID set (zero change),
    // corpus2 819→828 (+9: R02119/R02128/R02132/R02401/R02512/R02783/R02835/R02947/R03361), ZERO
    // regressions. Cost: corpus1 nodes +22.5%/work +12.4%, corpus2 nodes +23.0%/work +16.5% —
    // comparable to (cheaper on corpus2 than) STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY's own
    // promoted cost. Standard opt-OUT convention (`!cfg || cfg.FLAG`), matching its three promoted
    // siblings — NOT the opt-in `cfg && cfg.FLAG === true` shape STRATEGY_REPAIR_ELITE_PREFIX_DFS_
    // RETRY above still uses (that one remains closed/opt-in). See ablation-config.ts's own comment
    // for the full mechanism and the R02422 non-recovery caveat.
    //
    // `prep.initialMustCrossMask !== 0` is this tier's SOUNDNESS-BASED eligibility gate, and the one
    // structural difference from its four predecessors. prune-gauntlet.ts reaches
    // PRUNE_MC_NEIGHBOR_BUDGET only when `state.mustCrossMask !== 0`, which can never hold on a level
    // that starts with no must-cross obligations — so on such a level the prune rejected exactly zero
    // moves, and rerunning the ladder with it disabled is provably BIT-IDENTICAL to the ladder that
    // just failed. Skipping it is therefore free in solves and free in cost, not a heuristic bet.
    // Folded into the reserve's own predicate (not just the loop guard) so an ineligible level does
    // not strand reserved nodes it will never spend — the lockstep requirement
    // ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history documents.
    const mcNeighborBudgetRetryTierWillRun = mcNeighborBudgetRetryBudgetFraction > 0
        && !!(!cfg || cfg.STRATEGY_MC_NEIGHBOR_BUDGET_RETRY)
        && prep.initialMustCrossMask !== 0;
    const mcNeighborBudgetRetryNodeReserve = (mcNeighborBudgetRetryTierWillRun && nodeBudget !== Infinity)
        ? Math.floor(repairElitePrefixDfsRetryNodeCeiling * mcNeighborBudgetRetryNodeReserveFraction)
        : 0;
    // STACKED on `repairElitePrefixDfsRetryNodeCeiling` (the immediately-preceding tier's own
    // ceiling), NOT `nodeBudget` directly — same reason as its two stacked predecessors.
    const mcNeighborBudgetRetryNodeCeiling = repairElitePrefixDfsRetryNodeCeiling === Infinity
        ? Infinity
        : repairElitePrefixDfsRetryNodeCeiling + mcNeighborBudgetRetryNodeReserve;

    // STRATEGY_REPAIR_LATE_PROBE — see REPAIR_LATE_PROBE_NODE_BUDGET's own comment for the full
    // rationale. `repairConfigs.length === 0` is USUALLY exactly "needsRepairFallback was false for
    // this level" (the same eligibility signal the early probe and ordinary fallback loop already
    // gate on) — this tier exists specifically FOR that population, so it is the opposite polarity
    // of every other repairConfigs.length check in this function. Default-ON (promoted
    // 2026-08-21) — same standard convention as its five predecessors.
    //
    // NOT a safe substitute for needsRepairFallback in general, though: `applyAttemptConfigOptions`
    // (attempts.ts) also empties `repairConfigs` when an ablation explicitly sets
    // `STRATEGY_REPAIR_FALLBACK: false` — a level a caller deliberately routed AWAY from repair, not
    // one repair was never eligible for. Fixed 2026-08-20: without the extra guard below, an
    // experiment combining `STRATEGY_REPAIR_LATE_PROBE: true` with `STRATEGY_REPAIR_FALLBACK: false`
    // (a natural pairing — "does the new tier's gain hold with the old fallback disabled") would
    // silently reintroduce repair through this tier, defeating the ablation's own purpose.
    const repairLateProbeNodeBudgetRaw = Number(opts.repairLateProbeNodeBudgetOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined));
    const repairLateProbeNodeBudget = Number.isFinite(repairLateProbeNodeBudgetRaw) && repairLateProbeNodeBudgetRaw >= 0
        ? repairLateProbeNodeBudgetRaw
        : REPAIR_LATE_PROBE_NODE_BUDGET;
    const repairLateProbeTierWillRun = repairLateProbeNodeBudget > 0
        && !!(!cfg || cfg.STRATEGY_REPAIR_LATE_PROBE)
        && repairConfigs.length === 0
        && !(cfg && 'STRATEGY_REPAIR_FALLBACK' in cfg && cfg.STRATEGY_REPAIR_FALLBACK === false);
    // Flat additive reserve, NOT scaled by nodeBudget/the preceding tier's ceiling — see
    // REPAIR_LATE_PROBE_NODE_BUDGET's own comment for why this tier's shape deliberately differs
    // from the five whole-ladder-rerun tiers above. Still stacked on the preceding tier's own
    // ceiling (never restarting from nodeBudget directly), for the same reason as its predecessors.
    const repairLateProbeNodeReserve = repairLateProbeTierWillRun ? repairLateProbeNodeBudget : 0;
    const repairLateProbeNodeCeiling = mcNeighborBudgetRetryNodeCeiling === Infinity
        ? Infinity
        : mcNeighborBudgetRetryNodeCeiling + repairLateProbeNodeReserve;

    // STRATEGY_RETRY_TIER_NODE_STAIRCASE (opt-in, default OFF) — whether the attraction-diversity pass
    // and the two promoted whole-ladder retry tiers subdivide their node reserve per config instead of
    // letting the first config consume all of it. See the flag's own comment in ablation-config.ts
    // for the measured defect, and STRATEGY_MC_NEIGHBOR_BUDGET_RETRY's own call site for the fix this
    // generalizes (that tier does it unconditionally, since it never shipped without it).
    //
    // Opt-in specifically because it is a REDISTRIBUTION, not a free win: capping the first config at
    // reserve/N can lose a level whose retry-tier win came from that config spending the whole
    // reserve. Both directions are real and only a full-corpus A/B can price them.
    const retryTierStaircase = !!(cfg && cfg.STRATEGY_RETRY_TIER_NODE_STAIRCASE === true);

    const earlyTierNodeBudget = nodeBudget === Infinity ? Infinity : nodeBudget - admissibleOrderNodeReserve;

    // STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE (opt-in, default OFF — NEW, unvalidated
    // mechanism, landed 2026-08-13). Protects the admissible-order tier's own non-'default' profiles
    // (`ADMISSIBLE_ORDER_PROFILES`'s `'none'`/`'mustCrossFirst'`/`'intersectionHarvest'`/
    // `'nearClosureRescue'`) from `'default'`, which runs first in that tier's own sequential loop
    // and can consume the tier's ENTIRE guaranteed pool (`admissibleOrderNodeReserve`) before any
    // other profile gets a single node — a documented real regression mode, not a hypothesis:
    // `reports/2026-07-30-admissible-order-node-reserve.md` §4 found R03148 solved by `'none'` at
    // 1.97M nodes when the tier's node reserve was OFF, but with it ON, `'default'` ate the whole
    // 20M-node slice and `'none'` never ran at all. That report explicitly declined to fix this
    // ("the obvious refinement — sub-slicing the reserve per profile instead of first-come-first-
    // served — is not made here... needs its own A/B, not a guess").
    //
    // ASYMMETRIC RISK, unlike this session's two prior reserves: `'default'` is this tier's dominant
    // contributor (CLAUDE.md: 103 of 115 validated solves; the same report: 21 of the 22 measured
    // gains). A reserve sized carelessly here can trade a large, PROVEN win for a small, speculative
    // one — the report's own explicit caution. Mitigated by nesting this reserve INSIDE
    // `admissibleOrderNodeReserve` (a fraction OF it, not of `nodeBudget` directly), so `'default'`
    // is guaranteed at least `earlyTierNodeBudget` worth of headroom (its full pre-reserve share)
    // PLUS the majority of the tier's own reserve — never less than
    // `(1 - ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION)` of it — by construction, same soundness
    // shape as REPAIR_FALLBACK_NODE_RESERVE_FRACTION/ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's own
    // nesting. Scoped narrowly to protecting the non-'default' profiles COLLECTIVELY from 'default'
    // specifically (they still compete first-come-first-served among themselves for the withheld
    // slice, same shape as the repair-fallback loop's own repairConfigs list) — this does NOT attempt
    // to guarantee fairness among 'none'/'mustCrossFirst'/'intersectionHarvest'/'nearClosureRescue'
    // relative to each other; that would be a separate, deeper question without current evidence.
    //
    // CALIBRATION CAVEAT: 0.15 is a starting point matching this session's other new reserves' own
    // starting fraction, NOT derived from any A/B on this specific mechanism — and given the
    // asymmetric risk above, a promotion decision needs explicit evidence that 'default'-winning
    // levels (not just currently-unsolved ones) are unaffected, not just that new solves appear.
    const admissibleOrderProfileNodeReserveEnabled = !!(cfg && cfg.STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE === true);
    const admissibleOrderProfileNodeReserveFractionRaw = Number(opts.admissibleOrderProfileNodeReserveFractionOverride);
    const admissibleOrderProfileNodeReserveFraction = Number.isFinite(admissibleOrderProfileNodeReserveFractionRaw) && admissibleOrderProfileNodeReserveFractionRaw >= 0
        ? Math.min(1, admissibleOrderProfileNodeReserveFractionRaw)
        : ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION;
    const admissibleOrderProfileNodeReserveEligible = admissibleOrderProfileNodeReserveEnabled
        && admissibleOrderProfileNodeReserveFraction > 0
        && admissibleOrderConfigs.length > 1
        && admissibleOrderNodeReserve > 0;
    const admissibleOrderProfileNodeReserve = admissibleOrderProfileNodeReserveEligible
        ? Math.floor(admissibleOrderNodeReserve * admissibleOrderProfileNodeReserveFraction)
        : 0;
    // The ceiling the tier's 'default' profile specifically may reach — always >= earlyTierNodeBudget
    // by construction (see above), so no clamp is needed. Every OTHER profile in the tier keeps
    // checking against the full `nodeBudget`, unchanged — mirroring `repairFallbackNodeCeiling`'s
    // identical pattern one tier up.
    const admissibleOrderDefaultProfileCeiling = nodeBudget === Infinity
        ? Infinity
        : nodeBudget - admissibleOrderProfileNodeReserve;

    // Ordinary main-loop late-suffix reserve. Production default-ON as of 2026-08-12 (fraction 0.15,
    // reports/2026-08-12-main-loop-late-reserve-population-ab.md) — standard `(!cfg || cfg.FLAG)`
    // convention, matching admissibleOrderTierWillRun above and every other non-opt-in flag, NOT the
    // opt-in `cfg && cfg.FLAG === true` convention (which stays inert whenever cfg is null — every
    // production interactive solve and any CLI run without --enable-flags — the exact wiring gap the
    // neighbor-budget promotion shipped with and had to fix separately; see
    // docs/solver-opt-in-experiment-ledger.md's "wiring gap" notes). Unlike a reorder, this retains
    // the exact config/gate iteration order: the repair probe and early config prefix see a reduced
    // absolute ceiling, while the final N ordinary configs see the ordinary tier's whole envelope
    // (`earlyTierNodeBudget`, which already excludes the independent admissible-order reserve).
    // After the ordinary main loop has offered that suffix its slice, repair/diversity may use any
    // remainder, so an inexpensive/exhausted suffix never strands budget. Still a strict no-op
    // without a finite `nodeBudget` (see `mainLoopLateReserveEligible` below), so this only affects
    // offline batch tooling, never interactive Play/Editor/Review solves.
    const mainLoopLateReserveEnabled = !!(!cfg || cfg.STRATEGY_MAIN_LOOP_LATE_RESERVE);
    const mainLoopLateReserveFractionRaw = Number(opts.mainLoopLateReserveFractionOverride);
    const mainLoopLateReserveFraction = Number.isFinite(mainLoopLateReserveFractionRaw) && mainLoopLateReserveFractionRaw >= 0
        ? Math.min(1, mainLoopLateReserveFractionRaw)
        : MAIN_LOOP_LATE_RESERVE_FRACTION;
    const mainLoopLateReserveCountRaw = Number(opts.mainLoopLateReserveConfigCountOverride);
    const mainLoopLateReserveConfigCount = Number.isFinite(mainLoopLateReserveCountRaw) && mainLoopLateReserveCountRaw >= 0
        ? Math.min(mainConfigs.length, Math.floor(mainLoopLateReserveCountRaw))
        : Math.min(mainConfigs.length, MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT);
    const mainLoopLateReserveEligible = mainLoopLateReserveEnabled
        && mainLoopLateReserveFraction > 0
        && mainLoopLateReserveConfigCount > 0
        && earlyTierNodeBudget !== Infinity;
    const mainLoopLateReserve = mainLoopLateReserveEligible
        ? Math.floor(earlyTierNodeBudget * mainLoopLateReserveFraction)
        : 0;
    // A tiny finite ceiling can round the requested fraction to zero. Treat that as fully inert:
    // no telemetry marker, no altered status, and no pretend beneficiary with a zero-node slice.
    const mainLoopLateReserveWillRun = mainLoopLateReserve > 0;
    // The repair probe's own ceiling, AND the main loop's early-config-prefix ceiling (see
    // runInterleavedAttempts/runGateSerialAttempts's `earlyConfigNodeBudget` param) — deliberately
    // untouched by the repair-fallback reserve below. See that reserve's own comment for why: an
    // earlier version of this reserve derived this value from an already-shrunk pool, which starved
    // the probe and the main loop's own attempts instead of purely reallocating idle capacity —
    // confirmed as a real, measured regression (see REPAIR_FALLBACK_NODE_RESERVE_FRACTION's comment).
    const mainLoopEarlyNodeBudget = earlyTierNodeBudget === Infinity
        ? Infinity
        : earlyTierNodeBudget - mainLoopLateReserve;
    const mainLoopLateConfigStart = mainLoopLateReserveWillRun
        ? mainConfigs.length - mainLoopLateReserveConfigCount
        : mainConfigs.length;

    // Repair-fallback node reserve (STRATEGY_REPAIR_FALLBACK_NODE_RESERVE, opt-in, default OFF —
    // unvalidated new mechanism, see this constant's own comment). The repair fallback loop and the
    // attraction-diversity pass share `earlyTierNodeBudget` with the WHOLE main loop (early + late
    // suffix combined), completely unprotected: the main loop always runs first and can consume the
    // entire pool before either ever gets a single node. Same starvation shape as the already-fixed
    // repair-probe/early-main-loop bug (STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET) and the
    // already-fixed admissible-order/everything-before-it bug (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION),
    // one tier boundary further down the ladder — same mechanism as the admissible-order reserve
    // (a flat carve-out from the ceiling the PRODUCER runs against, computed before the producer
    // runs), not the repair-probe fix's live-signal shrink, because here the receptor (the fallback
    // loop) needs a share of the pool it's currently denied entirely, not a scale-down of an
    // over-consuming producer's own budget.
    //
    // REVISION 1 (2026-08-13): the first version of this reserve reduced `earlyTierNodeBudget`
    // BEFORE deriving `mainLoopEarlyNodeBudget` — which is also the repair probe's own ceiling, and
    // (via the late-suffix budget-share formula in runInterleavedAttempts/runGateSerialAttempts)
    // also shrank every main-loop attempt's own node share, not just the late-suffix ones. Measured
    // directly on this session's n=12 local sample: net −2 (0 gained, 2 lost — R02823's probe
    // attempt truncated from 5,308,905 to 4,128,152 nodes, short of the 5,308,905 it needed to win;
    // R00602's winning beam attempt truncated from 282,246 to 9,990). Taking budget from the probe
    // and main loop is not "reallocating idle capacity" the way the admissible-order reserve does —
    // that pool is already load-bearing.
    //
    // REVISION 2 (2026-08-13): fixing revision 1 by computing this reserve as a fraction of
    // `earlyTierNodeBudget` directly, then clamping `mainLoopNodeBudget` to never drop below
    // `mainLoopEarlyNodeBudget` (Math.max), traded one bug for another: with both this fraction and
    // `mainLoopLateReserveFraction` at their same 0.15 default, `earlyTierNodeBudget -
    // repairFallbackNodeReserve` landed EXACTLY at `mainLoopEarlyNodeBudget` (both are 15% of the
    // same base), so the Math.max clamp silently zeroed the late suffix's entire
    // `mainLoopLateReserve` room every time — not a rare edge case, the default-parameter case.
    // Measured directly: R01856's winner (`beam:intersectionHarvest@beam5000`, a LATE-suffix config,
    // 175,097 cheap nodes in baseline) got zero main-loop attempts at all once this reserve claimed
    // the exact room the late reserve needed — a NEW regression this revision's own fix introduced,
    // caught by re-running the same n=12 sample rather than trusting the first fix's logic alone.
    //
    // THE FIX: this reserve is now a fraction of `mainLoopLateReserve` itself (the room ALREADY
    // set aside for the late suffix), not an independent claim on `earlyTierNodeBudget` — i.e. "of
    // whatever the late suffix would get, hand some of it to the fallback loop instead" rather than
    // two reserves independently competing for the same base pool. This makes `mainLoopNodeBudget
    // >= mainLoopEarlyNodeBudget` true BY CONSTRUCTION (repairFallbackNodeReserve <=
    // mainLoopLateReserve always, since the fraction is clamped to [0,1]) — no clamp needed, and the
    // late suffix keeps a share proportional to (1 - this fraction) rather than losing it outright.
    // ACCEPTED COUPLING: this reserve is a strict no-op whenever `mainLoopLateReserve` is 0 (whether
    // because STRATEGY_MAIN_LOOP_LATE_RESERVE is off, or its own config-count/fraction rounds to
    // zero) — there is nothing to carve from without repeating revision 1's mistake. Since
    // STRATEGY_MAIN_LOOP_LATE_RESERVE is production default-ON, this only matters for a caller that
    // explicitly disables it while enabling this flag; not fixed here (would need a second,
    // independent floor computation) per CLAUDE.md's smallest-change guidance — flagged, not solved.
    //
    // Gated on the SAME real-run condition the fallback loop's own `for` loop below already checks
    // (repairConfigs.length > 0 && repairBudgetFraction !== 0) — no separate ablation flag guards
    // that loop today, so this reserve's eligibility mirrors it exactly. Reserving for a level with
    // no repair fallback to protect would strand nodes, shrinking every disableExtraBudgetPasses
    // caller's effective budget for nothing — the same reasoning the admissible-order reserve's own
    // comment documents.
    //
    // OPT-IN convention (`cfg && cfg.FLAG === true`), NOT the standard `!cfg || cfg.FLAG` every
    // OTHER reserve/promoted flag in this file uses — deliberately: this is a brand-new, unvalidated
    // mechanism (see the constant's own comment), registered opt-in/default-OFF in
    // modules/solver/ablation-config.ts's OPT_IN_FEATURES, so it must stay OFF whenever `cfg` is null
    // (every production interactive solve and any CLI run without --enable-flags) — the exact
    // opposite-direction mismatch of the wiring-gap bug documented throughout
    // docs/solver-opt-in-experiment-ledger.md would result from using the standard convention here.
    const repairFallbackNodeReserveEnabled = !!(cfg && cfg.STRATEGY_REPAIR_FALLBACK_NODE_RESERVE === true);
    const repairFallbackNodeReserveFractionRaw = Number(opts.repairFallbackNodeReserveFractionOverride);
    const repairFallbackNodeReserveFraction = Number.isFinite(repairFallbackNodeReserveFractionRaw) && repairFallbackNodeReserveFractionRaw >= 0
        ? Math.min(1, repairFallbackNodeReserveFractionRaw)
        : REPAIR_FALLBACK_NODE_RESERVE_FRACTION;
    const repairFallbackNodeReserveEligible = repairFallbackNodeReserveEnabled
        && repairFallbackNodeReserveFraction > 0
        && repairConfigs.length > 0
        && repairBudgetFraction !== 0
        && mainLoopLateReserve > 0;
    const repairFallbackNodeReserve = repairFallbackNodeReserveEligible
        ? Math.floor(mainLoopLateReserve * repairFallbackNodeReserveFraction)
        : 0;

    // STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE (see ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION's
    // own comment for the full derivation). Nests one level deeper than repairFallbackNodeReserve
    // just above: a fraction OF the remainder `mainLoopLateReserve - repairFallbackNodeReserve`, so
    // `repairFallbackNodeReserve + attractionDiversityNodeReserve <= mainLoopLateReserve` holds by
    // construction (both fractions clamped to [0,1]) — no clamp needed, same soundness argument as
    // the reserve it nests inside. Same opt-in convention and same real-run-condition eligibility
    // shape (diversityBudgetFraction/STRATEGY_ATTRACTION_DIVERSITY mirror repairConfigs.length>0/
    // repairBudgetFraction!==0 above) so a level where the diversity pass would never run doesn't
    // strand nodes reserving for it.
    const attractionDiversityNodeReserveEnabled = !!(cfg && cfg.STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE === true);
    const attractionDiversityNodeReserveFractionRaw = Number(opts.attractionDiversityNodeReserveFractionOverride);
    const attractionDiversityNodeReserveFraction = Number.isFinite(attractionDiversityNodeReserveFractionRaw) && attractionDiversityNodeReserveFractionRaw >= 0
        ? Math.min(1, attractionDiversityNodeReserveFractionRaw)
        : ATTRACTION_DIVERSITY_NODE_RESERVE_FRACTION;
    const attractionDiversityNodeReserveEligible = attractionDiversityNodeReserveEnabled
        && attractionDiversityNodeReserveFraction > 0
        && diversityBudgetFraction !== 0
        && (!cfg || cfg.STRATEGY_ATTRACTION_DIVERSITY)
        && mainLoopLateReserve > repairFallbackNodeReserve;
    const attractionDiversityNodeReserve = attractionDiversityNodeReserveEligible
        ? Math.floor((mainLoopLateReserve - repairFallbackNodeReserve) * attractionDiversityNodeReserveFraction)
        : 0;

    // STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY (see REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION's
    // own comment for the full derivation). Only the ENABLE/fraction decision can be made here: the
    // reserve's SIZE depends on what the probe actually shrinks, which is not known until the probe
    // has run, so it is computed below once `shrunkBiasedTiers` is populated.
    //
    // OPT-IN convention (`cfg && cfg.FLAG === true`), matching the two new reserves above and NOT
    // the standard `!cfg || cfg.FLAG` the promoted flags use: brand-new and unvalidated, registered
    // in modules/solver/ablation-config.ts's OPT_IN_FEATURES, so it must stay OFF whenever `cfg` is null.
    const shrinkRecoveryEnabled = !!(cfg && cfg.STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY === true)
        && repairConfigs.length > 0
        && repairBudgetFraction !== 0
        && (!cfg || cfg.STRATEGY_REPAIR_PROBE)
        && (!cfg || cfg.STRATEGY_REPAIR_PROBE_ADAPTIVE_BIASED_BUDGET);
    const shrinkRecoveryFractionRaw = Number(opts.repairProbeShrinkRecoveryNodeReserveFractionOverride);
    const shrinkRecoveryFraction = Number.isFinite(shrinkRecoveryFractionRaw) && shrinkRecoveryFractionRaw >= 0
        ? Math.min(1, shrinkRecoveryFractionRaw)
        : REPAIR_PROBE_SHRINK_RECOVERY_NODE_RESERVE_FRACTION;

    // The ceiling the main loop's LATE SUFFIX may additionally reach beyond `mainLoopEarlyNodeBudget`
    // — always >= mainLoopEarlyNodeBudget by construction (see above), so no clamp is needed here.
    // `earlyTierNodeBudget` itself is unchanged and remains what the repair fallback loop and the
    // attraction-diversity pass check against below, so what they may spend is exactly what these two
    // reserves withheld from the main loop's late suffix specifically — never from the probe or the
    // early config prefix.
    const mainLoopNodeBudget = earlyTierNodeBudget === Infinity
        ? Infinity
        : earlyTierNodeBudget - repairFallbackNodeReserve - attractionDiversityNodeReserve;
    // The ceiling the repair-fallback loop itself may reach — `earlyTierNodeBudget` minus the slice
    // withheld specifically for the diversity pass, so the fallback loop (which the close-out
    // measurement confirmed always spends everything it's allowed to) cannot eat the room this
    // reserve exists to protect. Equals `earlyTierNodeBudget` whenever the reserve is ineligible
    // (default OFF), so this is a strict no-op in that case, same as every other reserve here.
    const repairFallbackNodeCeilingBase = earlyTierNodeBudget === Infinity
        ? Infinity
        : earlyTierNodeBudget - attractionDiversityNodeReserve;

    // Early, strictly-additive probe of the repair fallback — see REPAIR_PROBE_ORDINARY_NODE_BUDGET
    // / REPAIR_PROBE_BIASED_NODE_BUDGET. Absent (and free) on every level outside the repair
    // feature gate, since repairConfigs is empty there. Also skipped when the caller has explicitly
    // asked for zero repair-related cost (repairBudgetFractionOverride: 0).
    //
    // BUG FIXED 2026-07-17 (see reports/2026-07-17-attraction-diversity-dose-response.md's flagged
    // "unexplained observation" and the follow-up audit report): the probe's real cost is bounded
    // by its own fixed NODE budgets (REPAIR_PROBE_ORDINARY_NODE_BUDGET, up to
    // REPAIR_PROBE_ORDINARY_SEED_SALTS.length times, plus REPAIR_PROBE_BIASED_NODE_BUDGET on
    // must-turn levels) — NOT by timeBudgetMs and NOT by repairBudgetFractionOverride, which was
    // only ever wired into the LATER full-budget fallback loop below. Those node budgets were
    // calibrated against levels where the probe WINS quickly (see their own comment's "observed
    // winners" data); on a level where repair never succeeds at all, the probe instead burns its
    // FULL node budget as pure dead search every single solve, and on a heavily-constrained level
    // (many must-pass/must-cross/landmark checks raise real per-node cost) that dead search alone
    // can cost several seconds of wall time with zero way for a caller to suppress it — confirmed
    // directly on R02401 (repair-gated, mustCross:6/mustPass:8, never solved by repair): both
    // ordinary-tier probe attempts (2,000,000 nodes each, one per REPAIR_PROBE_ORDINARY_SEED_SALTS
    // entry) ran to completion, ~5.5s + ~5.2s, entirely unaffected by
    // repairBudgetFractionOverride: 0 — the exact ~10.7s this dose-response run's overshoot traced
    // to. This silently broke the documented cost guarantee for the two interactive UI callers too
    // (solver-controller.ts's "Find 1 Hint", review-controller.ts's review-approval solve, both of
    // which pass repairBudgetFractionOverride: 0 specifically to bound their ~30s progress-bar
    // promise) — the probe was never covered by that override at all, on any repair-gated level a
    // real player could hit. Fixed by skipping the probe outright when the resolved fraction is
    // exactly 0, the same "no repair-related cost, period" signal the later fallback loop already
    // honors. Every other value (undefined/production-default, or any nonzero override) leaves the
    // probe's own fixed node-budget behavior completely unchanged from before this fix.
    // Ablation: STRATEGY_REPAIR_PROBE skips only the probe (the full-budget fallback loop below
    // still runs), isolating the probe's own scheduling contribution from repair-search itself.
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
    const shrinkRecoveryDebt = shrinkRecoveryEnabled
        ? shrunkBiasedTiers.reduce((sum, t) => sum + t.fullNodeBudget, 0) : 0;
    const shrinkRecoveryNodeReserve = (shrinkRecoveryDebt > 0 && earlyTierNodeBudget !== Infinity)
        ? Math.min(shrinkRecoveryDebt, Math.floor(earlyTierNodeBudget * shrinkRecoveryFraction))
        : 0;
    // Every post-probe early tier's ceiling drops by the reserve; each equals its pre-reserve value
    // whenever the reserve is 0 (default OFF, or nothing shrunk), so this is a strict no-op then.
    const mainLoopNodeBudgetFinal = mainLoopNodeBudget === Infinity ? Infinity : mainLoopNodeBudget - shrinkRecoveryNodeReserve;
    const repairFallbackNodeCeiling = repairFallbackNodeCeilingBase === Infinity
        ? Infinity : repairFallbackNodeCeilingBase - shrinkRecoveryNodeReserve;
    const diversityNodeCeiling = earlyTierNodeBudget === Infinity
        ? Infinity : earlyTierNodeBudget - shrinkRecoveryNodeReserve;

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
        ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainLoopStartTime, yieldFn, mainLoopNodeBudgetFinal, workBudget, workStart, mainLoopEarlyNodeBudget, mainLoopLateConfigStart)
        : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainLoopStartTime, yieldFn, mainLoopNodeBudgetFinal, workBudget, workStart, mainLoopEarlyNodeBudget, mainLoopLateConfigStart);
    result.attempts = [...probeAttempts, ...result.attempts];
    const mainLoopEarlyTiersHitNodeCeiling = result.earlyNodeBudgetReached === true;

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
    const repairFallbackOriginalWorkCap = prep._workCap;
    try {
        const repairFallbackTotalBudget = Math.floor(timeBudgetMs * repairBudgetFraction);
        const repairFallbackWorkBudget = Math.max(MIN_ATTEMPT_WORK, Math.floor(repairFallbackTotalBudget * DEFAULT_WORK_PER_MS));
        prep._workCap = Math.min(prep._workMeter.units + repairFallbackWorkBudget, prep._strictWorkCap ?? Infinity);
        for (const repairConfig of repairConfigs) {
            if (result.solution) break;
            if (prep._metrics.nodesExpanded >= repairFallbackNodeCeiling) break;
            const repairTotalBudget = repairFallbackTotalBudget;
            const repairStart = Date.now();
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (prep._metrics.nodesExpanded >= repairFallbackNodeCeiling) break;
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
                const remainingNodeBudget = repairFallbackNodeCeiling === Infinity ? Infinity : Math.max(0, repairFallbackNodeCeiling - prep._metrics.nodesExpanded);
                const r = await runAttempt(gateKey, level, prep, repairConfig, repairBudget, Date.now(), yieldFn, remainingNodeBudget);
                result.attempts.push(withSolverStage(r.attempt, 'repair-fallback'));
                if (r.path) { result.solution = r.path; break; }
            }
        }
    } finally {
        prep._workCap = repairFallbackOriginalWorkCap;
    }

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
        const diversityBudget = Math.floor(timeBudgetMs * diversityBudgetFraction);
        // SCORE_* flags don't affect getConfiguredAttemptConfigs's config selection (only
        // STRATEGY_*/PROFILE_*/TEMPLATE_* do), so reusing mainConfigs (built under the original
        // cfg) under this overridden prep._cfg selects the exact same attempts the diagnosis's own
        // full re-solve-with-ablation would have selected.
        //
        // A Proxy, NOT a plain `{ ...(originalCfg ?? {}) }` spread: every ablation-gated check in
        // this file and repair-search.ts/attempts.ts reads `(!cfg || cfg.SOME_FLAG)` — "no ablation
        // object at all" is the only way an unset flag defaults to enabled. `originalCfg` is most
        // commonly `null` (the production default), so a plain spread produces a SPARSE object
        // ({ SCORE_GOAL_ATTRACTION: false } and nothing else) — a non-null object whose every OTHER
        // flag now reads as `undefined` (falsy), silently disabling STRATEGY_GATE_INTERLEAVING,
        // STRATEGY_MIN_BUDGET_FLOOR, STRATEGY_ARCHETYPE_ROUTING, etc. for the whole pass. This is
        // the exact bug SolveOpts's repairBudgetFractionOverride field comment already documents
        // shipping once before ("passing ANY ablation object... silently disables every OTHER unset
        // strategy flag") — caught here empirically: an initial version using the plain-spread form
        // failed to rescue any of the 3 known R00156/R02960 variants even at a full extra 15s
        // budget, while a standalone plain-ablation call (bypassing this pass entirely) rescued one
        // of them in 788ms — isolating the difference to exactly this. The Proxy instead falls
        // through to `!OPT_IN_FEATURES.has(prop)` for any flag not explicitly named here or already
        // set on originalCfg, faithfully reproducing "originalCfg's own settings, plus these
        // candidate flags off, plus everything else exactly as if no ablation config were present"
        // regardless of whether originalCfg itself was null or a real (sparse-or-not) config object.
        // FIXED 2026-08-20: an earlier version fell through to a blind `true`, which — for any prop
        // not covered by the two checks above — silently force-enabled every opt-in/default-OFF
        // strategy flag whenever this pass ran, the exact same bug `normalizeAblationConfig`'s own
        // comment already documents shipping once (2026-08-07/08 turn-bias/elite-prefix-dfs
        // confound). All 5 sibling retry-tier Proxies below had the same bug; fixed together.
        const originalCfg = prep._cfg;
        const diversityCfg: AblationConfig = new Proxy({} as AblationConfig, {
            get(_target, prop: string | symbol) {
                if (typeof prop !== 'string') return undefined;
                if ((ATTRACTION_DIVERSITY_CANDIDATE_FLAGS as readonly string[]).includes(prop)) return false;
                if (originalCfg && Object.prototype.hasOwnProperty.call(originalCfg, prop)) return originalCfg[prop];
                if (OPT_IN_FEATURES.has(prop)) return false;
                return true;
            },
        });
        prep._cfg = diversityCfg;
        try {
            const diversityStart = Date.now();
            // Pass the ABSOLUTE nodeBudget here, NOT a remaining/relative value — unlike the repair
            // loop just above (which calls runAttempt -> repairSearchFromGate, whose own nodeBudget
            // param counts nodes LOCAL to that one call, starting fresh at 0, so a remaining-budget
            // value is correct there), runInterleavedAttempts/runGateSerialAttempts check nodeBudget
            // directly against prep._metrics.nodesExpanded — the GLOBAL cumulative counter, already
            // carrying the main loop's own nodes — exactly as the main loop's own call to these same
            // functions does a few lines above (passing raw `nodeBudget`, not a remainder, since
            // nodesExpanded is 0 when IT runs). An earlier version of this copied the repair loop's
            // remaining-budget pattern without checking that these two callees have different
            // (absolute vs. local-relative) nodeBudget semantics — caught by a unit test: passing a
            // remaining value of e.g. 112 when 288 nodes were already globally spent made the check
            // `288 >= 112` true immediately, silently skipping the whole pass on any level where the
            // main loop's own node spend already exceeded the REMAINDER (even though plenty of
            // absolute budget was left).
            // (`earlyTierNodeBudget` rather than `nodeBudget`: still an ABSOLUTE ceiling, exactly as
            // this comment requires — just the reduced one this pass shares with the other early
            // tiers, so it cannot spend the admissible-order tier's reserve.)
            // STRATEGY_RETRY_TIER_NODE_STAIRCASE (opt-in, default OFF) — see that flag's own comment
            // in ablation-config.ts, and STRATEGY_MC_NEIGHBOR_BUDGET_RETRY's own call site below for
            // the measurement that found this defect. Off (every production caller and every existing
            // A/B arm), `staircaseEntry`/`staircaseStart` are `undefined`, both runners fall back to
            // their `earlyConfigNodeBudget = nodeBudget` / `lateConfigStart = baseConfigs.length`
            // defaults, and this call is byte-identical to before.
            const diversityStaircaseEntry = retryTierStaircase ? prep._metrics.nodesExpanded : undefined;
            const diversityStaircaseStart = retryTierStaircase ? 0 : undefined;
            const diversityResult = useInterleaving && activeGates.length > 1
                ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, diversityBudget, diversityStart, yieldFn, diversityNodeCeiling, workBudget, workStart, diversityStaircaseEntry, diversityStaircaseStart)
                : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, diversityBudget, diversityStart, yieldFn, diversityNodeCeiling, workBudget, workStart, diversityStaircaseEntry, diversityStaircaseStart);
            if (retryTierStaircase) for (const attempt of diversityResult.attempts) delete attempt.mainLoopLateReserve;
            diversityResult.attempts = diversityResult.attempts.map(attempt => withSolverStage(attempt, 'attraction-diversity'));
            result.attempts.push(...diversityResult.attempts);
            if (diversityResult.solution) result.solution = diversityResult.solution;
        } finally {
            prep._cfg = originalCfg;
        }
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
        const originalCfg = prep._cfg;
        const dedupRetryCfg: AblationConfig = new Proxy({} as AblationConfig, {
            get(_target, prop: string | symbol) {
                if (typeof prop !== 'string') return undefined;
                if (prop === 'STRATEGY_DEDUP_NEAR_TIE_RETENTION') return false;
                if (originalCfg && Object.prototype.hasOwnProperty.call(originalCfg, prop)) return originalCfg[prop];
                if (OPT_IN_FEATURES.has(prop)) return false;
                return true;
            },
        });
        prep._cfg = dedupRetryCfg;
        try {
            const dedupRetryTotalBudget = Math.floor(timeBudgetMs * dedupRetryBudgetFraction);
            const dedupRetryStart = Date.now();
            // FRESH, ADDITIVE work allocation — deliberately NOT (workBudget, workStart) shared with
            // every earlier tier. That shared pool is already largely spent by the time this tier
            // runs (main loop + repair fallback + attraction-diversity + admissible-order all draw
            // from it), which starves runGateSerialAttempts/runInterleavedAttempts's own work-based
            // attemptBudgetShare split even though dedupRetryNodeReserve genuinely protected the NODE
            // ceiling — found directly: R00180's winning config (beam:objectiveFirst@beam5000
            // (diverse), needs ~5.1M nodes) got only 3.7M WORK units under the shared pool (vs. 10.9M
            // when the ordinary main loop tries the identical config with a full pool), well short
            // given a node costs more than 1 work unit. Same "extend, don't carve from the existing
            // pool" philosophy REPAIR_EXTRA_BUDGET_FRACTION's own comment documents for wall time,
            // applied to work: a fresh `prep._workMeter.units` mark plus a work budget sized off this tier's
            // own ms allocation via DEFAULT_WORK_PER_MS, the same conversion solveLevel's own
            // top-level workBudget uses when a caller doesn't supply one explicitly.
            const dedupRetryWorkStart = prep._workMeter.units;
            const dedupRetryWorkBudget = Math.max(MIN_ATTEMPT_WORK, Math.floor(dedupRetryTotalBudget * DEFAULT_WORK_PER_MS));
            // Same absolute-vs-relative nodeBudget semantics as the diversity pass's own call —
            // see that call's comment for why this must be an ABSOLUTE ceiling, not a remainder.
            // `dedupRetryNodeCeiling` (nodeBudget + dedupRetryNodeReserve), not plain `nodeBudget` —
            // REVISION 2, see dedupRetryNodeReserve's own comment above.
            // STRATEGY_RETRY_TIER_NODE_STAIRCASE — see the diversity pass's own note above. Strictly
            // byte-identical to before when the flag is off, which is every production caller.
            const dedupRetryStaircaseEntry = retryTierStaircase ? prep._metrics.nodesExpanded : undefined;
            const dedupRetryStaircaseStart = retryTierStaircase ? 0 : undefined;
            const dedupRetryResult = useInterleaving && activeGates.length > 1
                ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, dedupRetryTotalBudget, dedupRetryStart, yieldFn, dedupRetryNodeCeiling, dedupRetryWorkBudget, dedupRetryWorkStart, dedupRetryStaircaseEntry, dedupRetryStaircaseStart)
                : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, dedupRetryTotalBudget, dedupRetryStart, yieldFn, dedupRetryNodeCeiling, dedupRetryWorkBudget, dedupRetryWorkStart, dedupRetryStaircaseEntry, dedupRetryStaircaseStart);
            if (retryTierStaircase) for (const attempt of dedupRetryResult.attempts) delete attempt.mainLoopLateReserve;
            dedupRetryResult.attempts = dedupRetryResult.attempts.map(attempt => withSolverStage(attempt, 'dedup-near-tie-retry'));
            result.attempts.push(...dedupRetryResult.attempts);
            if (dedupRetryResult.solution) result.solution = dedupRetryResult.solution;
        } finally {
            prep._cfg = originalCfg;
        }
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
        // cap and find nothing regardless of its own node ceiling. Restored in `finally` purely for
        // hygiene — this is the ladder's last tier, so nothing downstream reads `prep._workCap` again.
        const originalWorkCap = prep._workCap;
        try {
            const nonDefaultRetryTotalBudget = Math.floor(timeBudgetMs * nonDefaultRetryBudgetFraction);
            const nonDefaultRetryWorkBudget = Math.max(MIN_ATTEMPT_WORK, Math.floor(nonDefaultRetryTotalBudget * DEFAULT_WORK_PER_MS));
            prep._workCap = Math.min(prep._workMeter.units + nonDefaultRetryWorkBudget, prep._strictWorkCap ?? Infinity);
            // Same per-profile/per-gate loop shape as the admissible-order tier's own pass above
            // (deliberately NOT a single combined runInterleavedAttempts/runGateSerialAttempts call —
            // see that tier's own comment for why: every validated admissible-order solve was found
            // with its own full per-profile budget standalone). 'default' is excluded from
            // admissibleOrderNonDefaultConfigs entirely (see that list's own comment) — it already had
            // its full, unreduced shot above and is never retried here.
            for (const admissibleOrderConfig of admissibleOrderNonDefaultConfigs) {
                if (result.solution) break;
                if (prep._metrics.nodesExpanded >= nonDefaultRetryNodeCeiling) break;
                const retryStart = Date.now();
                for (let gi = 0; gi < activeGates.length; gi++) {
                    if (prep._metrics.nodesExpanded >= nonDefaultRetryNodeCeiling) break;
                    const gateKey = activeGates[gi];
                    const elapsed = Date.now() - retryStart;
                    const gatesLeft = activeGates.length - gi;
                    const retryBudget = Math.floor((nonDefaultRetryTotalBudget - elapsed) / gatesLeft);
                    if (retryBudget < 50) break;
                    const remainingNodeBudget = nonDefaultRetryNodeCeiling === Infinity
                        ? Infinity
                        : Math.max(0, nonDefaultRetryNodeCeiling - prep._metrics.nodesExpanded);
                    const r = await runAttempt(gateKey, level, prep, admissibleOrderConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget);
                    result.attempts.push(withSolverStage(r.attempt, 'admissible-order-non-default-retry'));
                    if (r.path) { result.solution = r.path; break; }
                }
            }
        } finally {
            prep._workCap = originalWorkCap;
        }
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
        const originalCfg = prep._cfg;
        const connectivityRetryCfg: AblationConfig = new Proxy({} as AblationConfig, {
            get(_target, prop: string | symbol) {
                if (typeof prop !== 'string') return undefined;
                if (prop === 'PRUNE_CONNECTIVITY_AXIS_EXHAUSTED') return false;
                if (originalCfg && Object.prototype.hasOwnProperty.call(originalCfg, prop)) return originalCfg[prop];
                if (OPT_IN_FEATURES.has(prop)) return false;
                return true;
            },
        });
        prep._cfg = connectivityRetryCfg;
        try {
            const connectivityRetryTotalBudget = Math.floor(timeBudgetMs * connectivityRetryBudgetFraction);
            const connectivityRetryStart = Date.now();
            // FRESH, ADDITIVE work allocation — same "extend, don't share the depleted pool"
            // philosophy as dedupRetryWorkStart/dedupRetryWorkBudget above (that tier's own history:
            // sharing the depleting (workBudget, workStart) pool with every earlier tier starved its
            // attempts of work even when the node reserve genuinely protected the node ceiling).
            const connectivityRetryWorkStart = prep._workMeter.units;
            const connectivityRetryWorkBudget = Math.max(MIN_ATTEMPT_WORK, Math.floor(connectivityRetryTotalBudget * DEFAULT_WORK_PER_MS));
            // STRATEGY_RETRY_TIER_NODE_STAIRCASE — see the diversity pass's own note above. Strictly
            // byte-identical to before when the flag is off, which is every production caller.
            const connectivityRetryStaircaseEntry = retryTierStaircase ? prep._metrics.nodesExpanded : undefined;
            const connectivityRetryStaircaseStart = retryTierStaircase ? 0 : undefined;
            const connectivityRetryResult = useInterleaving && activeGates.length > 1
                ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, connectivityRetryTotalBudget, connectivityRetryStart, yieldFn, connectivityRetryNodeCeiling, connectivityRetryWorkBudget, connectivityRetryWorkStart, connectivityRetryStaircaseEntry, connectivityRetryStaircaseStart)
                : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, connectivityRetryTotalBudget, connectivityRetryStart, yieldFn, connectivityRetryNodeCeiling, connectivityRetryWorkBudget, connectivityRetryWorkStart, connectivityRetryStaircaseEntry, connectivityRetryStaircaseStart);
            if (retryTierStaircase) for (const attempt of connectivityRetryResult.attempts) delete attempt.mainLoopLateReserve;
            connectivityRetryResult.attempts = connectivityRetryResult.attempts.map(attempt => withSolverStage(attempt, 'connectivity-axis-exhausted-retry'));
            result.attempts.push(...connectivityRetryResult.attempts);
            if (connectivityRetryResult.solution) result.solution = connectivityRetryResult.solution;
        } finally {
            prep._cfg = originalCfg;
        }
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
        const repairElitePrefixDfsRetryCfg: AblationConfig = new Proxy({} as AblationConfig, {
            get(_target, prop: string | symbol) {
                if (typeof prop !== 'string') return undefined;
                if (prop === 'STRATEGY_REPAIR_ELITE_PREFIX_DFS') return true;
                if (originalCfg && Object.prototype.hasOwnProperty.call(originalCfg, prop)) return originalCfg[prop];
                if (OPT_IN_FEATURES.has(prop)) return false;
                return true;
            },
        });
        prep._cfg = repairElitePrefixDfsRetryCfg;
        // FRESH, ADDITIVE `prep._workCap` override — same "extend, don't share the depleted pool"
        // philosophy as the non-default-retry tier's own override above (that tier's own history:
        // `prep._workCap` is a single mutable field this tier's own `runAttempt`-direct calls would
        // otherwise silently inherit stale from whichever earlier tier last wrote it).
        const originalWorkCap = prep._workCap;
        try {
            const repairElitePrefixDfsRetryTotalBudget = Math.floor(timeBudgetMs * repairElitePrefixDfsRetryBudgetFraction);
            const repairElitePrefixDfsRetryWorkBudget = Math.max(MIN_ATTEMPT_WORK, Math.floor(repairElitePrefixDfsRetryTotalBudget * DEFAULT_WORK_PER_MS));
            prep._workCap = Math.min(prep._workMeter.units + repairElitePrefixDfsRetryWorkBudget, prep._strictWorkCap ?? Infinity);
            // Same per-config/per-gate loop shape as the ordinary repair fallback loop above.
            for (const repairConfig of repairConfigs) {
                if (result.solution) break;
                if (prep._metrics.nodesExpanded >= repairElitePrefixDfsRetryNodeCeiling) break;
                const retryStart = Date.now();
                for (let gi = 0; gi < activeGates.length; gi++) {
                    if (prep._metrics.nodesExpanded >= repairElitePrefixDfsRetryNodeCeiling) break;
                    const gateKey = activeGates[gi];
                    const elapsed = Date.now() - retryStart;
                    const gatesLeft = activeGates.length - gi;
                    const retryBudget = Math.floor((repairElitePrefixDfsRetryTotalBudget - elapsed) / gatesLeft);
                    if (retryBudget < 50) break;
                    const remainingNodeBudget = repairElitePrefixDfsRetryNodeCeiling === Infinity
                        ? Infinity
                        : Math.max(0, repairElitePrefixDfsRetryNodeCeiling - prep._metrics.nodesExpanded);
                    const r = await runAttempt(gateKey, level, prep, repairConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget);
                    result.attempts.push(withSolverStage(r.attempt, 'repair-elite-prefix-dfs-retry'));
                    if (r.path) { result.solution = r.path; break; }
                }
            }
        } finally {
            prep._cfg = originalCfg;
            prep._workCap = originalWorkCap;
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
        const originalCfg = prep._cfg;
        const mcNeighborBudgetRetryCfg: AblationConfig = new Proxy({} as AblationConfig, {
            get(_target, prop: string | symbol) {
                if (typeof prop !== 'string') return undefined;
                if (prop === 'PRUNE_MC_NEIGHBOR_BUDGET') return false;
                if (originalCfg && Object.prototype.hasOwnProperty.call(originalCfg, prop)) return originalCfg[prop];
                if (OPT_IN_FEATURES.has(prop)) return false;
                return true;
            },
        });
        prep._cfg = mcNeighborBudgetRetryCfg;
        try {
            const mcNeighborBudgetRetryTotalBudget = Math.floor(timeBudgetMs * mcNeighborBudgetRetryBudgetFraction);
            const mcNeighborBudgetRetryStart = Date.now();
            // FRESH, ADDITIVE work allocation — same "extend, don't share the depleted pool"
            // philosophy as connectivityRetryWorkStart/connectivityRetryWorkBudget above.
            const mcNeighborBudgetRetryWorkStart = prep._workMeter.units;
            const mcNeighborBudgetRetryWorkBudget = Math.max(MIN_ATTEMPT_WORK, Math.floor(mcNeighborBudgetRetryTotalBudget * DEFAULT_WORK_PER_MS));
            // PER-CONFIG NODE SUBDIVISION — the one place this tier deliberately does NOT copy its
            // four predecessors, because measurement showed their shared shape is defective.
            //
            // THE DEFECT. runGateSerialAttempts/runInterleavedAttempts divide budget BETWEEN configs
            // in WORK units (`attemptBudgetShare` over `workBudget`), but treat the node ceiling as a
            // single shared ABSOLUTE cap with no per-config subdivision (`earlyConfigNodeBudget`
            // defaults to `nodeBudget`, which switches the staircase off). Every retry tier sizes its
            // fresh work budget as `timeBudgetMs * fraction * DEFAULT_WORK_PER_MS` — and under the
            // capability protocol `timeBudgetMs` is a deliberately NON-BINDING 24h deadline
            // (`deterministic=true`, see docs/solver-budget-determinism.md). That makes the work pool
            // ~2.9e11 units, so the work-based division never bites, and the FIRST config simply runs
            // until the tier's absolute node ceiling is gone. Measured directly on `R02119` (probe at
            // `nodeBudget` 10M): per-attempt elapsed inside each ladder-rerun tier was
            // `[10896, 0, 0, 0, 0, 0, 0, 0]` for the dedup-near-tie tier, `[21319, 0 x7]` for the
            // connectivity tier, `[685, 0 x7]` for the attraction-diversity pass, and `[39602, 0 x7]`
            // for this one before the fix — while the main loop, which passes the EXTERNAL (binding)
            // work budget, divided properly at `[10782, 473, 496, 482, 1561]`. Raising this tier's
            // reserve 4.5x changed nothing except how long config #1 ran (12.7s -> 77.1s), confirming
            // a division defect rather than under-provisioning. This is the same "fractions are
            // denominated in TIME but what actually stops a level is nodeBudget" trap CLAUDE.md
            // already documents for the admissible-order tier, resurfacing at a different call site.
            //
            // THE FIX. Reuse the staircase the main loop's own late-reserve wiring already provides:
            // `lateConfigStart = 0` makes every config a staircase step, and `earlyConfigNodeBudget`
            // set to the cumulative node count AT TIER ENTRY gives config i the cumulative cap
            // `entry + reserve * (i+1)/N`. A config that has already blown past its step is skipped
            // (the `continue` at that guard) rather than starving the rest of the ladder, so the
            // winning config is reached even when an earlier one would happily run forever — which is
            // exactly `R02119`'s shape (`dfs:perimeterSweep/cornerHarvest` never exhausts; the winner
            // `beam:mustCrossFirst@beam2000` is config #3).
            //
            // Deliberately scoped to THIS tier: the same defect in the three promoted tiers and the
            // diversity pass is a real, separately-measurable opportunity (they are currently paying a
            // full ladder-rerun reserve to rerun ONE config), but changing a shipped, population-
            // validated tier's search behavior is decision-bearing and needs its own full-corpus A/B —
            // it is not a free ride-along on this one. See the ledger entry for the follow-up.
            const mcNeighborBudgetRetryEntryNodes = prep._metrics.nodesExpanded;
            const mcNeighborBudgetRetryResult = useInterleaving && activeGates.length > 1
                ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, mcNeighborBudgetRetryTotalBudget, mcNeighborBudgetRetryStart, yieldFn, mcNeighborBudgetRetryNodeCeiling, mcNeighborBudgetRetryWorkBudget, mcNeighborBudgetRetryWorkStart, mcNeighborBudgetRetryEntryNodes, 0)
                : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, mcNeighborBudgetRetryTotalBudget, mcNeighborBudgetRetryStart, yieldFn, mcNeighborBudgetRetryNodeCeiling, mcNeighborBudgetRetryWorkBudget, mcNeighborBudgetRetryWorkStart, mcNeighborBudgetRetryEntryNodes, 0);
            for (const attempt of mcNeighborBudgetRetryResult.attempts) {
                Object.assign(attempt, withSolverStage(attempt, 'mc-neighbor-budget-retry'));
                // `lateConfigStart = 0` makes both runners tag every attempt `mainLoopLateReserve`,
                // which here means "took a staircase step", not "belongs to the main loop's late
                // reserve experiment". Strip it so telemetry consumers of that field are not polluted.
                delete attempt.mainLoopLateReserve;
            }
            result.attempts.push(...mcNeighborBudgetRetryResult.attempts);
            if (mcNeighborBudgetRetryResult.solution) result.solution = mcNeighborBudgetRetryResult.solution;
        } finally {
            prep._cfg = originalCfg;
        }
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
        const originalWorkCap = prep._workCap;
        try {
            const repairLateProbeWorkBudget = Math.max(MIN_ATTEMPT_WORK, Math.floor(repairLateProbeTotalBudget * DEFAULT_WORK_PER_MS));
            prep._workCap = Math.min(prep._workMeter.units + repairLateProbeWorkBudget, prep._strictWorkCap ?? Infinity);
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (prep._metrics.nodesExpanded >= repairLateProbeNodeCeiling) break;
                const ownBudgetRemaining = repairLateProbeNodeBudget - (prep._metrics.nodesExpanded - repairLateProbeEntryNodes);
                if (ownBudgetRemaining <= 0) break;
                const gateKey = activeGates[gi];
                const elapsed = Date.now() - repairLateProbeStart;
                const gatesLeft = activeGates.length - gi;
                const retryBudget = Math.floor((repairLateProbeTotalBudget - elapsed) / gatesLeft);
                if (retryBudget < 50) break;
                const outerCeilingRemaining = repairLateProbeNodeCeiling === Infinity
                    ? Infinity
                    : Math.max(0, repairLateProbeNodeCeiling - prep._metrics.nodesExpanded);
                const remainingNodeBudget = Math.min(ownBudgetRemaining, outerCeilingRemaining);
                const r = await runAttempt(gateKey, level, prep, repairLateProbeConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget);
                result.attempts.push(withSolverStage(r.attempt, 'repair-late-probe'));
                if (r.path) { result.solution = r.path; break; }
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
    const deadlineTruncated = totalMs >= timeBudgetMs && workSpent < workBudget && !nodeBudgetReached;
    // A technique exception is not evidence that the level exhausted, timed out, or consumed its
    // node allowance. Attempts after it still run, but an unsuccessful aggregate remains visibly
    // indeterminate even when a separate budget boundary was also reached later.
    const hadAttemptError = hasAttemptError(result.attempts);
    const status = hadAttemptError ? 'attempt-error'
        : nodeBudgetReached ? 'node-budget-reached'
        : deadlineTruncated ? 'deadline-truncated'
        : (workSpent >= workBudget ? 'work-budget-reached' : 'failed');
    return finish({ ok: false, status, solution: null, solutions: [], attempts: result.attempts, totalMs, nodesExpanded, nodeBudgetReached, deadlineTruncated, workSpent, workBudget });
}
