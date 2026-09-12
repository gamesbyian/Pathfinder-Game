// The last-resort additive retry-tier ladder: everything solveLevel (orchestration.ts) tries
// AFTER the main DFS/beam search fails and BEFORE it assembles a final SolveResult -- the ordinary
// repair fallback, the goal-attraction-disabled-retry pass, repair-shrink-recovery, the
// admissible-order-fallback tier and its non-default-profile retry, the
// coarse-state-near-tie-retention/connectivity-axis/repair-elite-prefix-dfs/must-cross-neighbor
// retries, late-repair-search (+ its multi-seed retry), and the guidance-goal-distance retry.
// Every tier here is strictly additive (gated on `!result.solution`, running in the exact fixed
// order below) and mutates the SAME `result` object the caller passed in, exactly as when this
// code lived inline in solveLevel -- this extraction moves the block verbatim into its own
// function, changing no stage order, eligibility, budget, or telemetry shape. See
// orchestration.ts's own header for the split this file is part of.
import { scaledStageWorkBudget } from './budget-units.js';
import { withWorkCapScope } from './budget-context.js';
import { GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS, repairAttempt } from './attempts.js';
import { withSolverStage } from './stage-policy.js';
import { buildRetryTierAblationOverride, runWholeLadderRetryTier } from './stage-executors.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig, AblationConfig } from './types.js';
import type { StageBudgetPlan } from './stage-budget.js';
import type { computeShrinkRecoveryBudget } from './stage-budget.js';
import { runAttempt } from './orchestration-run-attempt.js';
import { runInterleavedAttempts, runGateSerialAttempts } from './orchestration-main-search.js';
import { EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP } from './orchestration-early-repair.js';
import { MIN_ATTEMPT_WORK } from './orchestration-contracts.js';
import type { SearchResult, ShrunkBiasedTier, YieldFn } from './orchestration-contracts.js';

export interface AdditiveRetryTiersInput {
    result: SearchResult;
    repairConfigs: AttemptConfig[];
    admissibleOrderConfigs: AttemptConfig[];
    admissibleOrderNonDefaultConfigs: AttemptConfig[];
    mainConfigs: AttemptConfig[];
    activeGates: number[];
    cfg: AblationConfig | null;
    prep: PrepLevel;
    level: NormalizedLevel;
    yieldFn: YieldFn;
    timeBudgetMs: number;
    workBudget: number;
    workStart: number;
    nodeBudget: number;
    // Same loosely-typed truthy value AblationConfig's index signature gives solveLevel's own
    // `useInterleaving` local (`!cfg || cfg.STRATEGY_GATE_INTERLEAVING`) — only ever used here in a
    // truthy check (`useInterleaving && activeGates.length > 1 ? ... : ...`), never as a strict bool.
    useInterleaving: boolean | string | number | undefined;
    shrunkBiasedTiers: ShrunkBiasedTier[];
    stageBudgetPlan: StageBudgetPlan;
    shrinkRecoveryBudget: ReturnType<typeof computeShrinkRecoveryBudget>;
}

/** Runs every last-resort additive retry tier, in the fixed production order, against the shared
 *  `result` (mutated in place, same as the inline code this was extracted from -- see this file's
 *  own header). Returns whether the reduced early-tier ceiling (not the full `nodeBudget`) is what
 *  actually stopped search, for solveLevel's own nodeBudgetReached accounting. */
export async function runAdditiveRetryTiers({
    result, repairConfigs, admissibleOrderConfigs, admissibleOrderNonDefaultConfigs, mainConfigs,
    activeGates, cfg, prep, level, yieldFn, timeBudgetMs, workBudget, workStart, nodeBudget,
    useInterleaving, shrunkBiasedTiers, stageBudgetPlan, shrinkRecoveryBudget,
}: AdditiveRetryTiersInput): Promise<{ earlyTiersHitNodeCeiling: boolean }> {
    const {
        repairAdditiveBudgetMultiplier, diversityBudgetFraction, coarseStateNearTieRetentionRetryBudgetFraction, nonDefaultRetryBudgetFraction,
        connectivityRetryBudgetFraction, repairElitePrefixDfsRetryBudgetFraction, mcNeighborBudgetRetryBudgetFraction,
        admissibleOrderBudgetFraction, admissibleOrderTierWillRun,
        coarseStateNearTieRetentionRetryTierWillRun, coarseStateNearTieRetentionRetryNodeCeiling,
        nonDefaultRetryTierWillRun, nonDefaultRetryNodeCeiling,
        connectivityRetryTierWillRun, connectivityRetryNodeCeiling,
        repairElitePrefixDfsRetryTierWillRun, repairElitePrefixDfsRetryNodeCeiling,
        mcNeighborBudgetRetryTierWillRun, mcNeighborBudgetRetryNodeCeiling,
        repairLateProbeNodeBudget, repairLateProbeTierWillRun, repairLateProbeNodeCeiling,
        goalAttractionGuidanceDistanceRetryBudgetFraction, goalAttractionGuidanceDistanceRetryTierWillRun,
        goalAttractionGuidanceDistanceRetryNodeCeiling,
        repairLateProbeMultiSeedRetryTierWillRun, repairLateProbeMultiSeedRetryNodeCeiling,
        repairLateProbeMultiSeedRetrySeedSalts,
        retryTierStaircase, earlyTierNodeBudget, admissibleOrderDefaultProfileCeiling,
        shrinkRecoveryEnabled,
    } = stageBudgetPlan;
    const { shrinkRecoveryNodeReserve, repairFallbackNodeCeiling, diversityNodeCeiling } = shrinkRecoveryBudget;

    // repairAdditiveBudgetMultiplier was already resolved above (before the early probe) — reused here
    // unchanged for the full-budget fallback loop, same as before this fix. Checks against
    // `repairFallbackNodeCeiling`, NOT `earlyTierNodeBudget` directly, so this loop cannot spend the
    // goal-attraction-disabled-retry pass's own reserved slice — see GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE_FRACTION's
    // own comment. Identical to `earlyTierNodeBudget` whenever that reserve is ineligible (default).
    //
    // FRESH, ADDITIVE `prep._workCap` override (2026-08-20 fix, same rationale as the early probe's
    // own override just above and repairElitePrefixDfsRetry's below): this loop's `runAttempt` calls
    // used to silently inherit whatever `prep._workCap` the main loop (or the probe just above) last
    // wrote, which can already be exhausted on exactly the levels this loop exists for.
    //
    // `repairFallbackWorkBudget` is sized off the solve's own resolved `workBudget` (queue #2 step-3
    // migration, 2026-08-28 — second site after coarse-state-near-tie-retention-disabled-retry; see
    // reports/2026-08-28-coarse-state-near-tie-retention-disabled-retry-work-dose-migration.md for the full account of what
    // this pattern does and does not preserve), not re-derived from `timeBudgetMs` a second time.
    // Behavior-preserving for live play (this loop never runs there — repairConfigs is empty unless
    // a repair-eligible level reaches it, and both real interactive callers still zero
    // `repairAdditiveBudgetMultiplier` via `disableExtraBudgetPasses`) and for the plain-default no-override
    // call shape (`REPAIR_ADDITIVE_BUDGET_MULTIPLIER` is the integer `6.0`, so `legacyMsToWork` linearity
    // makes the two formulas produce the identical number there). NOT behavior-preserving for the
    // offline capability-sweep call shape (explicit `workBudget` disproportionate to a huge
    // non-binding `timeBudgetMs`) — same genuine, deliberate dose correction as the first site.
    // `repairFallbackTotalBudget` (ms) is kept: it still sizes the per-gate wall-deadline slice
    // (`repairBudget` below) passed to `runAttempt`, a genuine latency safety bound subordinate to
    // `prep._workCap` for actual allocation, not a work-sizing input in its own right.
    const repairFallbackTotalBudget = Math.floor(timeBudgetMs * repairAdditiveBudgetMultiplier);
    const repairFallbackWorkBudget = scaledStageWorkBudget(workBudget, repairAdditiveBudgetMultiplier, MIN_ATTEMPT_WORK);
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

    // Last-resort goal-attraction-disabled-retry pass (GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION, attempts.ts's
    // GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS) — a whole extra rerun of the SAME mainConfigs ladder,
    // with the candidate scoring flag(s) disabled for its duration, only after the main loop AND
    // repair fallback have both already failed on every gate. See the fraction constant's own
    // comment for why a whole-ladder rerun (not one narrow attempt) is needed, and why the budget
    // is small and strictly additive, same pattern as the repair loop just above.
    //
    // opts.goalAttractionDisabledRetryBudgetFractionOverride is its OWN dedicated override, deliberately
    // separate from repairAdditiveBudgetMultiplierOverride (see that field's own comment on SolveOpts for
    // why) — solver-controller.ts / review-controller.ts pass 0 for both, to keep their interactive
    // progress bar's ~30s promise; a solver-testing sweep can pass 0 for just this one to isolate
    // repair's own cost, or 0 for repair's while leaving this one at its default to isolate this
    // pass's own cost. opts.disableExtraBudgetPasses is a purely-additive convenience that sets
    // 0 for both at once (see its own comment on SolveOpts) — prefer it over remembering both
    // individual overrides unless a sweep specifically needs to isolate just one.
    // (diversityBudgetFraction itself is resolved earlier, alongside repairAdditiveBudgetMultiplier — see that
    // resolution's own comment for why GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE_FRACTION's eligibility check
    // needs it before this point.)
    if (!result.solution && diversityBudgetFraction > 0 && (!cfg || cfg.STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY) && prep._metrics!.nodesExpanded < earlyTierNodeBudget) {
        // SCORE_* flags don't affect getConfiguredAttemptConfigs's config selection (only
        // STRATEGY_*/PROFILE_*/TEMPLATE_* do), so reusing mainConfigs (built under the original
        // cfg) under the executor's overridden prep._cfg selects the exact same attempts the
        // diagnosis's own full re-solve-with-ablation would have selected.
        //
        // NODE CEILING: `diversityNodeCeiling`, not a remaining/relative value — unlike the repair
        // loop just above (which calls runAttempt -> repairSearchFromGate, whose own nodeBudget
        // param counts nodes LOCAL to that one call), runInterleavedAttempts/runGateSerialAttempts
        // (which this executor calls) check nodeBudget directly against the GLOBAL cumulative
        // prep._metrics!.nodesExpanded — an absolute ceiling, same as the main loop's own call to
        // these same functions above. `earlyTierNodeBudget` rather than plain `nodeBudget`: the
        // reduced ceiling this pass shares with the other early tiers, so it cannot spend the
        // admissible-order-fallback tier's reserve.
        //
        // WORK POOL: STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL was promoted to
        // production default-ON 2026-09-10 (see docs/solver-opt-in-experiment-ledger.md and
        // reports/2026-09-05-goal-attraction-disabled-retry-fresh-work-pool-confirmation-002-preflight.md)
        // after 2026-09-02 telemetry (reports/2026-09-02-goal-attraction-disabled-retry-work-pool-
        // starvation.md) found sharing the outer, already-depleting pool starves 64% of otherwise-
        // eligible attempts to zero real search even with the sibling node reserve on. The
        // fresh-vs-shared WORK-START decision for this stage is now owned centrally by
        // `runWholeLadderRetryTier`'s `retryTierEffectiveWorkStart` (stage-executors.ts), which
        // treats null/unset as ON and overrides whatever `workStart` this call site passes — so
        // `workStart` below is passed through unmodified. Only the WORK-BUDGET SIZE still needs the
        // explicit flag check here: a fresh pool is sized off `diversityBudgetFraction` of the
        // solve's own `workBudget` (this tier's fraction is 1.0, so a full-sized fresh pool),
        // while an explicit-false ablation keeps sharing the outer `workBudget` unscaled.
        const freshWorkPoolEnabled = cfg?.STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL !== false;
        const diversityWorkBudget = freshWorkPoolEnabled
            ? scaledStageWorkBudget(workBudget, diversityBudgetFraction, MIN_ATTEMPT_WORK)
            : workBudget;
        const diversityResult = await runWholeLadderRetryTier({
            stageId: 'goal-attraction-disabled-retry',
            proxyOverrides: Object.fromEntries((GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS as readonly string[]).map(flag => [flag, false])),
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: Math.floor(timeBudgetMs * diversityBudgetFraction),
            nodeCeiling: diversityNodeCeiling, workBudget: diversityWorkBudget, workStart,
            staircase: retryTierStaircase,
        });
        result.attempts.push(...diversityResult.attempts);
        if (diversityResult.solution) result.solution = diversityResult.solution;
    }

    // STRATEGY_REPAIR_SHRINK_RECOVERY: restore what the adaptive shrink withheld, but only
    // once the main loop, repair fallback and goal-attraction-disabled-retry pass have all already failed —
    // see REPAIR_SHRINK_RECOVERY_NODE_RESERVE_FRACTION's own comment for why the placement
    // (not an immediate retry) is what preserves the shrink's savings, and why the tier needs its
    // own withheld slice rather than a reorder.
    //
    // Re-runs each shrunk config at its FULL budget: repairSearchFromGate's trajectory for a larger
    // budget strictly extends the smaller one's (pure function of (gateKey, level, prep, profile,
    // budget), seeded only from gateKey), so this replays the already-granted prefix and then
    // continues into exactly the search the shrink cut off. Strict no-op when nothing was shrunk.
    if (!result.solution && shrunkBiasedTiers.length > 0 && shrinkRecoveryEnabled
        && prep._metrics!.nodesExpanded < earlyTierNodeBudget) {
        for (const shrunk of shrunkBiasedTiers) {
            if (result.solution) break;
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (result.solution) break;
                // `earlyTierNodeBudget` (absolute, cumulative) is this tier's own ceiling, so it may
                // spend its reserved slice plus whatever the earlier tiers left unused — exactly the
                // pattern the diversity pass already uses against its own ceiling.
                // The reserve is a FLOOR, not merely a derived remainder. Every node check in this
                // file is round-granular and may overshoot its ceiling by up to one attempt's own
                // cost ("can still overshoot by up to one round's own cost" — see runEarlyRepairSearch's
                // own comment), and a single main-search attempt can be tens of millions of nodes. On
                // R00408 the main loop overshot its reduced ceiling by ~375,000 nodes and ate that
                // much of this tier's slice, leaving 5,624,791 against the 5,965,490 its winning
                // attempt needs — the tier fired and still failed by ~340,000 nodes. Taking the max
                // of the plain remainder and the reserve makes the withheld slice actually
                // withheld; the overshoot then comes out of the total rather than out of this tier.
                // Still hard-bounded by the true external ceiling, so nodeBudget is never exceeded.
                const remainingEarly = earlyTierNodeBudget === Infinity
                    ? Infinity
                    : Math.max(0, earlyTierNodeBudget - prep._metrics!.nodesExpanded);
                const remainingTotal = nodeBudget === Infinity
                    ? Infinity
                    : Math.max(0, nodeBudget - prep._metrics!.nodesExpanded);
                const remaining = Math.min(remainingTotal, Math.max(remainingEarly, shrinkRecoveryNodeReserve));
                if (remaining < 50) break;
                const gatesLeft = activeGates.length - gi;
                const gateNodeBudget = Math.min(shrunk.fullNodeBudget, Math.floor(remaining / gatesLeft));
                if (gateNodeBudget <= shrunk.grantedNodeBudget) break;
                const nodesOut: { nodesExpanded?: number } = {};
                const r = await runAttempt(activeGates[gi], level, prep, shrunk.config, EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP,
                    Date.now(), yieldFn, gateNodeBudget, nodesOut);
                result.attempts.push(withSolverStage(r.attempt, 'repair-shrink-recovery'));
                if (r.path) result.solution = r.path;
            }
        }
    }

    // Last-resort admissible-order-fallback-search tier (ADMISSIBLE_ORDER_BUDGET_FRACTION, attempts.ts's
    // ADMISSIBLE_ORDER_PROFILES), only after the main loop, repair fallback, AND goal-attraction-disabled-retry
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
    // pass, before the admissible-order-fallback tier spends the reserve. Without this, the reserve would
    // corrupt the `nodeBudgetReached` signal: a level whose early tiers were cut off at
    // `earlyTierNodeBudget` but whose admissible-order-fallback tier then exhausts its own search naturally
    // (below the full `nodeBudget`) would report `nodeBudgetReached: false` / status 'failed' —
    // claiming the ladder ran to completion when in fact the ceiling truncated most of it. Batch
    // tooling reads that flag to tell "budget-limited" from "searched out", so the distinction is
    // load-bearing, and getting it wrong understates how many levels are still budget-limited.
    const earlyTiersHitNodeCeiling = earlyTierNodeBudget !== Infinity
        && prep._metrics!.nodesExpanded >= earlyTierNodeBudget;

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
            const profileCeiling = admissibleOrderConfig.scoringProfileId === 'default'
                ? admissibleOrderDefaultProfileCeiling
                : nodeBudget;
            if (prep._metrics!.nodesExpanded >= profileCeiling) break;
            const admissibleOrderTotalBudget = Math.floor(timeBudgetMs * admissibleOrderBudgetFraction);
            const admissibleOrderStart = Date.now();
            for (let gi = 0; gi < activeGates.length; gi++) {
                if (prep._metrics!.nodesExpanded >= profileCeiling) break;
                const gateKey = activeGates[gi];
                const elapsed = Date.now() - admissibleOrderStart;
                const gatesLeft = activeGates.length - gi;
                const admissibleOrderBudget = Math.floor((admissibleOrderTotalBudget - elapsed) / gatesLeft);
                if (admissibleOrderBudget < 50) break;
                // Remaining GLOBAL node budget — see the repair fallback loop's identical recompute.
                const remainingNodeBudget = profileCeiling === Infinity ? Infinity : Math.max(0, profileCeiling - prep._metrics!.nodesExpanded);
                const r = await runAttempt(gateKey, level, prep, admissibleOrderConfig, admissibleOrderBudget, Date.now(), yieldFn, remainingNodeBudget);
                result.attempts.push(withSolverStage(r.attempt, 'admissible-order-fallback'));
                if (r.path) { result.solution = r.path; break; }
            }
        }
    }

    // Last-resort coarse-state-near-tie-retention-disabled-retry pass (COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION,
    // STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY) — see that flag's own comment in ablation-config.ts and
    // COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION's own comment above for the full rationale. Same
    // Proxy-override shape as the goal-attraction-disabled-retry pass above, toggling
    // STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION instead of SCORE_GOAL_ATTRACTION. PROMOTED to default-ON (see
    // the constant's own comment) — the flag check below (`!cfg ||` ...) is the standard default-on
    // convention, so this block runs for every caller unless `disableExtraBudgetPasses: true` zeroes
    // its budget fraction (both interactive solve UIs) or `cfg` explicitly disables the flag.
    //
    // REVISION 3 (2026-08-15, same day as REVISION 2 above): moved to run LAST — after early-repair-search-
    // shrink-recovery AND the admissible-order-fallback tier, not before them — because REVISION 2's additive
    // `coarseStateNearTieRetentionRetryNodeCeiling` created a NEW starvation bug the moment it was tested locally against
    // three of the 65 REVISION-1 collateral levels (R00050/R00059/R00238, all solved via `ida:default`
    // in the with-fix baseline, needing 37.6M-48.4M of the 50M ceiling): with this tier positioned
    // BEFORE the admissible-order-fallback tier, its own extended ceiling let it burn `prep._metrics!.
    // nodesExpanded` all the way past the original `nodeBudget` (up to `nodeBudget +
    // coarseStateNearTieRetentionRetryNodeReserve`) on every one of the ~1666 levels that don't need it — and the
    // admissible-order-fallback tier's own entry guard (`nodesExpanded >= profileCeiling`, itself derived from
    // plain `nodeBudget`, unaware of coarseStateNearTieRetentionRetryNodeCeiling) then trips immediately, skipping the tier
    // ENTIRELY rather than merely shrinking its share. Extending one tier's ceiling doesn't help if a
    // LATER tier's own guard still checks the unextended `nodeBudget` — the fix has to be "run last, so
    // nothing downstream can be starved" rather than "run early with a bigger ceiling." This is the
    // SAME class of bug CLAUDE.md's node-budget gotcha describes (one cumulative counter, provisioning
    // a tier doesn't provision anyone after it) in a new shape: here the provisioned tier itself was
    // the one doing the starving, by running too EARLY rather than by being under-reserved.
    //
    // With this reorder, every earlier tier (main loop, repair fallback, goal-attraction-disabled-retry,
    // repair-shrink-recovery, admissible-order-fallback) is COMPLETELY unaffected by this tier's
    // existence — none of their own ceilings reference coarseStateNearTieRetentionRetryNodeReserve or coarseStateNearTieRetentionRetryNodeCeiling
    // at all (see earlyTierNodeBudget's own comment). This tier's additive extension only ever spends
    // room past every other tier's own full-strength, unshrunk attempt — genuine bonus room, not
    // borrowed from (or lent to) anyone. This reordering, combined with the additive reserve above,
    // IS what full-corpus GHA run 31902837955 validated (764/1700, +40, zero losses) — see
    // COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION's own PROMOTION comment for the result.
    // `coarseStateNearTieRetentionRetryTierWillRun` is the SAME predicate coarseStateNearTieRetentionRetryNodeReserve is derived from — the two
    // must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history: drift either way
    // strands the reserve or spends one that was never allocated).
    if (!result.solution && coarseStateNearTieRetentionRetryTierWillRun && prep._metrics!.nodesExpanded < coarseStateNearTieRetentionRetryNodeCeiling) {
        // FRESH, ADDITIVE work allocation — deliberately NOT (workBudget, workStart) shared with
        // every earlier tier. That shared pool is already largely spent by the time this tier runs
        // (main loop + repair fallback + goal-attraction-disabled-retry + admissible-order-fallback all draw from it),
        // which starves runGateSerialAttempts/runInterleavedAttempts's own work-based
        // attemptBudgetShare split even though coarseStateNearTieRetentionRetryNodeReserve genuinely protected the NODE
        // ceiling — found directly: R00180's winning config (beam:objectiveFirst@beam5000
        // (diverse), needs ~5.1M nodes) got only 3.7M WORK units under the shared pool (vs. 10.9M
        // when the ordinary main loop tries the identical config with a full pool), well short given
        // a node costs more than 1 work unit. Same "extend, don't carve from the existing pool"
        // philosophy REPAIR_ADDITIVE_BUDGET_MULTIPLIER's own comment documents for wall time, applied to
        // work: a fresh `prep._workMeter.units` mark plus a work budget sized off this tier's own
        // fraction of the solve's own resolved `workBudget` (queue #2 step-3 migration, 2026-08-28
        // — see docs/solver-budget-determinism.md's additive-tier debt inventory). Previously this
        // work pool was re-derived from `timeBudgetMs` a second time via the legacy ms-to-work
        // conversion, which meant an explicit `baseWorkBudget` override that disagreed with what
        // `timeBudgetMs` implied was silently ignored for THIS tier's own dose, and changing only
        // the (intended non-binding) deadline could change how much work this tier bought. Deriving
        // from `workBudget` instead reproduces the exact same number in the common (no override)
        // case — `legacyMsToWork` is linear and `workBudget` already equals what that same
        // conversion of `timeBudgetMs` would give there, and `coarseStateNearTieRetentionRetryBudgetFraction` is always
        // an integer (1.0) — so this IS a behavior-preserving representation change for that common
        // case and for every live-play call (both real interactive callers force this tier's own
        // fraction to 0 regardless). It is deliberately NOT behavior-preserving when a caller
        // supplies an explicit `baseWorkBudget`/`workBudget` disproportionate to a huge non-binding
        // `timeBudgetMs` (the offline capability-sweep/confirmation-workflow call shape): there, the
        // old code's effectively-infinite ms-derived pool is replaced by the caller's real, much
        // smaller `workBudget` — a genuine, deliberate dose correction for that stratum, not a
        // silent no-op. See reports/2026-08-28-coarse-state-near-tie-retention-disabled-retry-work-dose-migration.md for the
        // full account and what was verified for each call shape. `coarseStateNearTieRetentionRetryTotalBudget` (ms) is
        // kept for `totalBudgetMs` below: that field is a genuine wall-clock safety deadline, not a
        // work-sizing input, and must stay scaled by the same fraction as the work pool so it
        // remains non-binding relative to the (now correctly bounded) allocation on a slow host.
        const coarseStateNearTieRetentionRetryTotalBudget = Math.floor(timeBudgetMs * coarseStateNearTieRetentionRetryBudgetFraction);
        const coarseStateNearTieRetentionRetryResult = await runWholeLadderRetryTier({
            stageId: 'coarse-state-near-tie-retention-disabled-retry', proxyOverrides: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION: false },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: coarseStateNearTieRetentionRetryTotalBudget, nodeCeiling: coarseStateNearTieRetentionRetryNodeCeiling,
            workBudget: scaledStageWorkBudget(workBudget, coarseStateNearTieRetentionRetryBudgetFraction, MIN_ATTEMPT_WORK),
            workStart: prep._workMeter.units,
            staircase: retryTierStaircase,
        });
        result.attempts.push(...coarseStateNearTieRetentionRetryResult.attempts);
        if (coarseStateNearTieRetentionRetryResult.solution) result.solution = coarseStateNearTieRetentionRetryResult.solution;
    }

    // Last-resort admissible-order-fallback non-default-profile retry pass
    // (ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION, STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_
    // RETRY) — see that flag's own comment in ablation-config.ts and the constant's own comment
    // above for the full rationale. PROMOTED to default-ON (see the constant's own comment) — the
    // flag check below (`!cfg ||` ...) is the standard default-on convention, so this block runs for
    // every caller unless `disableExtraBudgetPasses: true` zeroes its budget fraction (both
    // interactive solve UIs) or `cfg` explicitly disables the flag.
    //
    // Positioned dead last — AFTER the coarse-state-near-tie-retention-disabled-retry tier above, for the identical reason that
    // tier itself was moved to run after the admissible-order-fallback tier (REVISION 3, see
    // coarseStateNearTieRetentionRetryNodeReserve's own comment): nothing may run after this tier that still checks an
    // unextended `nodeBudget`/`earlyTierNodeBudget`-derived ceiling, or this tier's own additive
    // extension would starve it. Nothing does — this is the true end of the ladder.
    //
    // `nonDefaultRetryTierWillRun` is the SAME predicate nonDefaultRetryNodeReserve is derived from —
    // the two must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history: drift
    // either way strands the reserve or spends one that was never allocated).
    if (!result.solution && nonDefaultRetryTierWillRun && prep._metrics!.nodesExpanded < nonDefaultRetryNodeCeiling) {
        // FRESH, ADDITIVE `prep._workCap` override — same "extend, don't share the depleted pool"
        // philosophy as coarseStateNearTieRetentionRetryWorkStart/coarseStateNearTieRetentionRetryWorkBudget above, applied here even though this
        // tier calls `runAttempt` directly (like the admissible-order-fallback tier's own per-profile loop)
        // rather than through runInterleavedAttempts/runGateSerialAttempts's shared-pool
        // attemptBudgetShare machinery coarse-state near-tie retry's bug came from. `prep._workCap` is still a SINGLE
        // mutable field those two functions last wrote before this tier runs (from the main loop,
        // ordinarily) — nothing resets it fresh for a `runAttempt`-direct caller positioned this late,
        // so without this override this tier would silently inherit a stale, likely-already-exceeded
        // cap and find nothing regardless of its own node ceiling. withWorkCapScope owns/restores the
        // compatibility field lexically so no later stage can inherit this tier's cap.
        //
        // `nonDefaultRetryWorkBudget` sized off the solve's own resolved `workBudget` (queue #2
        // step-3 migration, 2026-08-28 — third site, same pattern/caveats as coarse-state-near-tie-retention-disabled-retry's
        // and repair-fallback's own migrations; see reports/2026-08-28-coarse-state-near-tie-retention-disabled-retry-work-
        // dose-migration.md for the full account). `ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_
        // FRACTION` is the integer `1.0`, so behavior-preserving for live play (this tier's fraction
        // is also zeroed by `disableExtraBudgetPasses`) and the plain-default no-override call shape;
        // a deliberate dose correction, not a no-op, for the offline capability-sweep call shape.
        // `nonDefaultRetryTotalBudget` (ms) is kept for the per-gate wall-deadline slice
        // (`retryBudget` below) — latency safety, not a work-sizing input.
        const nonDefaultRetryTotalBudget = Math.floor(timeBudgetMs * nonDefaultRetryBudgetFraction);
        const nonDefaultRetryWorkBudget = scaledStageWorkBudget(workBudget, nonDefaultRetryBudgetFraction, MIN_ATTEMPT_WORK);
        // STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT (default off, see
        // ablation-config.ts): the ONLY call site in the codebase allowed to pass true to
        // runAttempt's enforceAdmissibleOrderWorkCap param — this loop runs entirely inside the
        // withWorkCapScope call immediately below, so prep._workCap is exactly this tier's own
        // fraction-scaled ceiling for its whole duration, never a leftover/outer value. See
        // reports/2026-09-10-admissible-order-non-default-retry-matched-work-methodology-001.md for
        // why this tier's fraction previously had no code path capable of binding.
        const enforceAdmissibleOrderWorkCap = prep._cfg?.STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT === true;
        await withWorkCapScope(prep, prep._workMeter.units + nonDefaultRetryWorkBudget, async () => {
            // Same per-profile/per-gate loop shape as the admissible-order-fallback tier's own pass above
            // (deliberately NOT a single combined runInterleavedAttempts/runGateSerialAttempts call —
            // see that tier's own comment for why: every validated admissible-order-fallback solve was found
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
                    const r = await runAttempt(gateKey, level, prep, admissibleOrderConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget, null, 0, enforceAdmissibleOrderWorkCap);
                    result.attempts.push(withSolverStage(r.attempt, 'admissible-order-alternate-tiebreak-retry'));
                    if (r.path) { result.solution = r.path; break; }
                }
            }
        });
    }

    // Last-resort connectivity-axis-exhausted retry pass (CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_
    // FRACTION, STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY) — see that flag's own comment in
    // ablation-config.ts and the constant's own comment above for the full rationale. Same
    // Proxy-override shape as the coarse-state-near-tie-retention-disabled-retry pass above, toggling
    // PRUNE_CONNECTIVITY_AXIS_EXHAUSTED instead of STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION. PROMOTED to
    // default-ON (2026-08-16, run 31918095910: corpus1 95/95 unchanged, corpus2 +10/-0) - the flag
    // check below (`!cfg ||` ...) is the promoted-default convention, matching its two sibling tiers;
    // an explicit `{STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY: false}` still disables it.
    //
    // Positioned dead last — AFTER the admissible-order-alternate-tiebreak-retry tier above, the current
    // true end of the ladder — for the identical reason both prior retry tiers were placed there:
    // nothing may run after this one that still checks an unextended `nodeBudget`/
    // `earlyTierNodeBudget`-derived ceiling, or this tier's own additive extension would starve it.
    //
    // `connectivityRetryTierWillRun` is the SAME predicate connectivityRetryNodeReserve is derived
    // from — the two must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own history:
    // drift either way strands the reserve or spends one that was never allocated).
    if (!result.solution && connectivityRetryTierWillRun && prep._metrics!.nodesExpanded < connectivityRetryNodeCeiling) {
        // FRESH, ADDITIVE work allocation — same "extend, don't share the depleted pool" philosophy
        // as coarse-state-near-tie-retention-disabled-retry's own call site above (that tier's own history: sharing the
        // depleting (workBudget, workStart) pool with every earlier tier starved its attempts of
        // work even when the node reserve genuinely protected the node ceiling).
        // Queue #2 step-3 work-dose migration (2026-09-01): size this tier's fresh work pool
        // from the solve's already-resolved canonical workBudget instead of independently converting
        // its timeBudgetMs-derived wall allocation back into work. CONNECTIVITY_AXIS_EXHAUSTED_RETRY_
        // BUDGET_FRACTION is 1.0, so the plain-default/no-explicit-work call shape is algebraically
        // identical; explicit-work research callers now get the work dose they actually requested.
        // The ms total remains below solely as the tier's wall-clock safety deadline.
        const connectivityRetryTotalBudget = Math.floor(timeBudgetMs * connectivityRetryBudgetFraction);
        const connectivityRetryResult = await runWholeLadderRetryTier({
            stageId: 'connectivity-axis-prune-disabled-retry', proxyOverrides: { PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: connectivityRetryTotalBudget, nodeCeiling: connectivityRetryNodeCeiling,
            workBudget: scaledStageWorkBudget(workBudget, connectivityRetryBudgetFraction, MIN_ATTEMPT_WORK),
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
    // or the admissible-order-alternate-tiebreak-retry tier's own per-profile loop over admissible-order-fallback
    // configs), this reruns `repairConfigs` via the SAME per-config/per-gate manual loop shape as
    // the ordinary repair fallback loop above, with `prep._cfg` Proxy-overridden to force
    // `STRATEGY_REPAIR_ELITE_PREFIX_DFS: true` — the OPPOSITE polarity from every tier above (each
    // of which disables a flag; this one enables one). Opt-in/default-OFF (NEW, unvalidated
    // mechanism) — the flag check below (`cfg &&` ... `=== true`) is the opt-in convention, so this
    // block is a strict no-op for every production/interactive caller (cfg null) until explicitly
    // enabled.
    //
    // Positioned dead last — AFTER the connectivity-axis-prune-disabled-retry tier above, the current
    // true end of the ladder — for the identical reason all three tiers above were placed there:
    // nothing may run after this one that still checks an unextended ceiling, or this tier's own
    // additive extension would starve it.
    //
    // `repairElitePrefixDfsRetryTierWillRun` is the SAME predicate repairElitePrefixDfsRetryNodeReserve
    // is derived from — the two must stay in lockstep (ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION's own
    // history: drift either way strands the reserve or spends one that was never allocated).
    if (!result.solution && repairElitePrefixDfsRetryTierWillRun && prep._metrics!.nodesExpanded < repairElitePrefixDfsRetryNodeCeiling) {
        const originalCfg = prep._cfg;
        const repairElitePrefixDfsRetryCfg = buildRetryTierAblationOverride(originalCfg, { STRATEGY_REPAIR_ELITE_PREFIX_DFS: true });
        prep._cfg = repairElitePrefixDfsRetryCfg;
        // FRESH, ADDITIVE work scope — same "extend, don't share the depleted pool" philosophy as
        // the non-default-retry tier above, but with lexical ownership/restoration.
        // Queue #2 step-3 work-dose migration (2026-09-02, seventh migrated site): size this tier's
        // fresh work pool from the solve's already-resolved canonical workBudget instead of
        // independently converting its timeBudgetMs-derived wall allocation back into work.
        // REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION is 1.0, so the plain-default/no-explicit-work
        // call shape is algebraically identical (and this opt-in/default-OFF tier is unreachable
        // there regardless); explicit-work research callers now get the work dose they actually
        // requested. The ms total remains below solely as the tier's wall-clock safety deadline.
        // Same pattern as repair-fallback's own migration (also a withWorkCapScope fresh pool).
        const repairElitePrefixDfsRetryTotalBudget = Math.floor(timeBudgetMs * repairElitePrefixDfsRetryBudgetFraction);
        const repairElitePrefixDfsRetryWorkBudget = scaledStageWorkBudget(workBudget, repairElitePrefixDfsRetryBudgetFraction, MIN_ATTEMPT_WORK);
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
    // rerun shape as the coarse-state-near-tie-retention-disabled-retry and connectivity-axis-prune-disabled-retry passes above,
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
    if (!result.solution && mcNeighborBudgetRetryTierWillRun && prep._metrics!.nodesExpanded < mcNeighborBudgetRetryNodeCeiling) {
        // PER-CONFIG NODE SUBDIVISION (staircase: true below) — the one place this tier deliberately
        // does NOT copy its three ladder-rerun siblings, because measurement showed their shared
        // shape (one undivided node ceiling across every config in the rerun) is defective.
        //
        // THE DEFECT. runGateSerialAttempts/runInterleavedAttempts divide budget BETWEEN configs in
        // WORK units (`attemptBudgetShare` over `workBudget`), but treat the node ceiling as a
        // single shared ABSOLUTE cap with no per-config subdivision unless the staircase is used.
        // At the time this staircase was diagnosed, these whole-ladder retry tiers sized fresh
        // work from `timeBudgetMs * fraction` and converted that legacy ms-shaped amount back to
        // work. Under the capability protocol `timeBudgetMs` is a deliberately NON-BINDING 24h
        // deadline (`deterministic=true`, see docs/solver-budget-determinism.md). Workstream 2 is
        // migrating those work doses one site at a time; this tier's migration is immediately below.
        // In the historical measurement, that produced a ~2.9e11-unit work pool, so work-based
        // division never bit and the
        // FIRST config simply runs until the tier's absolute node ceiling is gone. Measured directly
        // on `R02119` (probe at `nodeBudget` 10M): per-attempt elapsed inside each ladder-rerun tier
        // was `[10896, 0, 0, 0, 0, 0, 0, 0]` for the coarse-state-near-tie-retention tier, `[21319, 0 x7]` for the
        // connectivity tier, `[685, 0 x7]` for the goal-attraction-disabled-retry pass, and `[39602, 0 x7]` for
        // this one before the fix — while the main loop, which passes the EXTERNAL (binding) work
        // budget, divided properly at `[10782, 473, 496, 482, 1561]`. Raising this tier's reserve
        // 4.5x changed nothing except how long config #1 ran (12.7s -> 77.1s), confirming a division
        // defect rather than under-provisioning. This is the same "fractions are denominated in TIME
        // but what actually stops a level is nodeBudget" trap CLAUDE.md already documents for the
        // admissible-order-fallback tier, resurfacing at a different call site.
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
            stageId: 'must-cross-neighbor-prune-disabled-retry', proxyOverrides: { PRUNE_MC_NEIGHBOR_BUDGET: false },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: mcNeighborBudgetRetryTotalBudget, nodeCeiling: mcNeighborBudgetRetryNodeCeiling,
            // Work-dose migration (2026-09-01): this tier's own historical comment already
            // diagnosed the 24h capability deadline -> enormous legacyMsToWork pool as the reason
            // work subdivision failed to bind. Size the fresh pool from the solve's resolved
            // canonical workBudget instead. The ms total remains the wall-clock safety deadline.
            workBudget: scaledStageWorkBudget(workBudget, mcNeighborBudgetRetryBudgetFraction, MIN_ATTEMPT_WORK),
            workStart: prep._workMeter.units,
            staircase: true,
        });
        result.attempts.push(...mcNeighborBudgetRetryResult.attempts);
        if (mcNeighborBudgetRetryResult.solution) result.solution = mcNeighborBudgetRetryResult.solution;
    }

    // Last-resort late-repair-search pass (REPAIR_LATE_PROBE_NODE_BUDGET, STRATEGY_REPAIR_LATE_PROBE)
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
    if (!result.solution && repairLateProbeTierWillRun && prep._metrics!.nodesExpanded < repairLateProbeNodeCeiling) {
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
        const repairLateProbeEntryNodes = prep._metrics!.nodesExpanded;
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
        // Queue #2 step-3 work-dose migration (2026-09-02, eighth migrated site, and the first found
        // outside the original nine-site CI-ratchet inventory: this site's `repairLateProbeTotalBudget
        // = timeBudgetMs` line has no `* fraction` multiplication, so it never matched the ratchet's
        // regex-based debt scan even though it shares the exact same legacyMsToWork(totalBudget-shaped
        // ms) -> fresh-work-cap pattern as every sibling tier above). Size the fresh cap from the
        // solve's already-resolved canonical workBudget (fraction 1, matching the implicit `* 1`
        // this site's ms total always had) instead of reconverting timeBudgetMs. The plain-default/
        // no-explicit-work call shape is algebraically identical (workBudget itself is already
        // the legacy ms-to-work compatibility conversion of timeBudgetMs there — see workBudget's own
        // resolution above); explicit-
        // work research callers now get the work dose they actually requested. The ms total remains
        // above solely as this tier's own per-gate time-slicing/wall-clock safety input.
        const repairLateProbeWorkBudget = scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK);
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
                result.attempts.push(withSolverStage(r.attempt, 'late-repair-search'));
                if (r.path) { result.solution = r.path; break; }
            }
        });
    }

    // Last-resort SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE retry pass (GOAL_ATTRACTION_GUIDANCE_
    // DISTANCE_RETRY_BUDGET_FRACTION, STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY) — see that
    // constant's own comment in stage-budget.ts and docs/solver-optimization-workstreams.md
    // Priority 7 for the full rationale. The plain global SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE
    // flag (attempts.ts/scoring.ts) was measured net -5 across three populations (73-level loss
    // population +9/-3; 90-level gain population 0/-11; published corpus unchanged) because it
    // forces the legacy (pre-6f00baf) distance map even on levels the corrected map already solves
    // early. This tier instead reruns the whole `mainConfigs` ladder with that flag forced ON, but
    // ONLY after every earlier tier — including late-repair-search, the previous true end of the
    // ladder — has already failed, so it structurally cannot touch that loss population: a level
    // that solves earlier never reaches this tier. Same `runWholeLadderRetryTier`/`proxyOverrides`
    // shape as STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY. Promoted default-ON 2026-08-23 after a
    // population-scale A/B (73-level loss population +3/-0; 90-level gain population 0/-0;
    // published corpus unchanged — see docs/solver-opt-in-experiment-ledger.md); the flag check
    // below (`!cfg ||` ... ) is the default-ON convention.
    //
    // Positioned dead last — AFTER the late-repair-search tier above, the current true end of the
    // ladder — for the identical reason every tier above it is placed there: nothing may run after
    // this one that still checks an unextended ceiling, or this tier's own additive extension would
    // starve it.
    //
    // `goalAttractionGuidanceDistanceRetryTierWillRun` is the SAME predicate
    // goalAttractionGuidanceDistanceRetryNodeReserve is derived from (stage-budget.ts) — the two must
    // stay in lockstep.
    if (!result.solution && goalAttractionGuidanceDistanceRetryTierWillRun && prep._metrics!.nodesExpanded < goalAttractionGuidanceDistanceRetryNodeCeiling) {
        // Queue #2 step-3 work-dose migration (2026-09-02, sixth migrated site): size this tier's
        // fresh work pool from the solve's already-resolved canonical workBudget instead of
        // independently converting its timeBudgetMs-derived wall allocation back into work.
        // GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY_BUDGET_FRACTION is 1.0, so the plain-default/
        // no-explicit-work call shape is algebraically identical; explicit-work research callers now
        // get the work dose they actually requested. The ms total remains below solely as the tier's
        // wall-clock safety deadline. Same pattern as connectivity-axis-prune-disabled-retry and
        // must-cross-neighbor-prune-disabled-retry's own migrations.
        const goalAttractionGuidanceDistanceRetryTotalBudget = Math.floor(timeBudgetMs * goalAttractionGuidanceDistanceRetryBudgetFraction);
        const goalAttractionGuidanceDistanceRetryResult = await runWholeLadderRetryTier({
            stageId: 'guidance-goal-distance-retry', proxyOverrides: { SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE: true },
            activeGates, mainConfigs, level, prep, yieldFn,
            runLadder: useInterleaving && activeGates.length > 1 ? runInterleavedAttempts : runGateSerialAttempts,
            totalBudgetMs: goalAttractionGuidanceDistanceRetryTotalBudget, nodeCeiling: goalAttractionGuidanceDistanceRetryNodeCeiling,
            workBudget: scaledStageWorkBudget(workBudget, goalAttractionGuidanceDistanceRetryBudgetFraction, MIN_ATTEMPT_WORK),
            workStart: prep._workMeter.units,
            staircase: retryTierStaircase,
        });
        result.attempts.push(...goalAttractionGuidanceDistanceRetryResult.attempts);
        if (goalAttractionGuidanceDistanceRetryResult.solution) result.solution = goalAttractionGuidanceDistanceRetryResult.solution;
    }

    // Last-resort late-repair-search MULTI-SEED retry (REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_
    // SALTS, STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY, promoted default-ON 2026-08-23) — see
    // that constant's own comment in stage-budget.ts for the full rationale and validated
    // evidence. Dead-last additive extension of late-repair-search:
    // for the exact same repairConfigsCount===0 population, retry the SAME repairAttempt() builder
    // across several more PRNG seeds (late-repair-search itself already tried seed salt 0), each
    // seed getting its own full REPAIR_LATE_PROBE_NODE_BUDGET reserve. Structurally identical to
    // the late-repair-search block above (same per-gate manual loop, same builder), just looped over
    // seeds and positioned after guidance-goal-distance-retry, the current true end of the
    // ladder.
    //
    // `repairLateProbeMultiSeedRetryTierWillRun` is the SAME predicate
    // repairLateProbeMultiSeedRetryNodeReserve is derived from (stage-budget.ts) — the two must
    // stay in lockstep. The loop below iterates `repairLateProbeMultiSeedRetrySeedSalts`, the SAME
    // resolved array the reserve above was sized from (computeStageBudgetPlan, stage-budget.ts) —
    // not the raw REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS constant — so
    // repairLateProbeMultiSeedRetrySeedCountOverride (orchestration.ts SolveOpts) always resolves
    // budget and execution to the identical salt slice.
    if (!result.solution && repairLateProbeMultiSeedRetryTierWillRun && prep._metrics!.nodesExpanded < repairLateProbeMultiSeedRetryNodeCeiling) {
        const repairLateProbeMultiSeedConfig = repairAttempt();
        const originalWorkCap = prep._workCap;
        try {
            seedLoop:
            for (const seedSalt of repairLateProbeMultiSeedRetrySeedSalts) {
                if (prep._metrics!.nodesExpanded >= repairLateProbeMultiSeedRetryNodeCeiling) break;
                const roundStart = Date.now();
                const roundEntryNodes = prep._metrics!.nodesExpanded;
                // Queue #2 step-3 work-dose migration (2026-09-02, ninth migrated site, found by the
                // step-4 whole-ladder deadline-independence test below empirically catching a 10x
                // allocatedWorkCeiling swing between a 60s and a 600s non-binding timeBudgetMs on this
                // exact tier): each round's fresh prep._workCap extension used to reconvert the raw
                // caller timeBudgetMs directly, the same debt pattern as every sibling tier above, just
                // without a `*TotalBudget` intermediate — this line was the OTHER of the two names the
                // ratchet's approvedDirectMsToWorkSites set treated as a permanent, legitimate
                // conversion, which this empirical finding disproves for this call site specifically.
                // Size it from the solve's already-resolved canonical workBudget instead (fraction 1,
                // matching late-repair-search's own migration and this tier's own historical dose,
                // which was never scaled by any fraction of its own). Algebraically identical in the
                // plain-default call shape, where workBudget itself already equals the legacy
                // ms-to-work compatibility conversion of timeBudgetMs — see workBudget's own resolution
                // above. `timeBudgetMs` remains used below solely for this round's per-gate
                // time-slicing/wall-clock safety input, exactly as every migrated sibling tier's own ms
                // total does.
                const roundWorkBudget = scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK);
                prep._workCap = Math.min(prep._workMeter.units + roundWorkBudget, prep._strictWorkCap ?? Infinity);
                for (let gi = 0; gi < activeGates.length; gi++) {
                    if (prep._metrics!.nodesExpanded >= repairLateProbeMultiSeedRetryNodeCeiling) break;
                    const ownBudgetRemaining = repairLateProbeNodeBudget - (prep._metrics!.nodesExpanded - roundEntryNodes);
                    if (ownBudgetRemaining <= 0) break;
                    const gateKey = activeGates[gi];
                    const elapsed = Date.now() - roundStart;
                    const gatesLeft = activeGates.length - gi;
                    const retryBudget = Math.floor((timeBudgetMs - elapsed) / gatesLeft);
                    if (retryBudget < 50) break;
                    const outerCeilingRemaining = repairLateProbeMultiSeedRetryNodeCeiling === Infinity
                        ? Infinity
                        : Math.max(0, repairLateProbeMultiSeedRetryNodeCeiling - prep._metrics!.nodesExpanded);
                    const remainingNodeBudget = Math.min(ownBudgetRemaining, outerCeilingRemaining);
                    const r = await runAttempt(gateKey, level, prep, repairLateProbeMultiSeedConfig, retryBudget, Date.now(), yieldFn, remainingNodeBudget, null, seedSalt);
                    result.attempts.push(withSolverStage(r.attempt, 'late-repair-multiseed-retry'));
                    if (r.path) { result.solution = r.path; break seedLoop; }
                }
            }
        } finally {
            prep._workCap = originalWorkCap;
        }
    }

    return { earlyTiersHitNodeCeiling };
}
