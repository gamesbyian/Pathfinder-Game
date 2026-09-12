// The solver's stable compatibility façade: every public './orchestration.js' export is
// re-exported from here unchanged, whether it now lives in this file or in one of the
// orchestration-{contracts,run-attempt,main-search,early-repair,legacy-portfolio,static-portfolio}
// .ts modules it coordinates. This file itself keeps solveLevel — the attempt-ladder coordinator
// calling into every module above — plus the stage-budget.ts re-export block below. See
// modules/solver/README.md.
import { legacyMsToWork, scaledStageWorkBudget } from './budget-units.js';
import { withWorkCapScope } from './budget-context.js';
import { getConfiguredAttemptConfigs, GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS, repairAttempt } from './attempts.js';
import { prepLevel } from './prep.js';
import { withSolverStage } from './stage-policy.js';
import { buildSolverStagePlan } from './stage-plan.js';
import { buildRetryTierAblationOverride, runWholeLadderRetryTier } from './stage-executors.js';
import type { NormalizedLevel } from '../domain/types.js';

import { runAttempt, testAttemptDispatches } from './orchestration-run-attempt.js';
import { runInterleavedAttempts, runGateSerialAttempts } from './orchestration-main-search.js';
import { runEarlyRepairSearch } from './orchestration-early-repair.js';
import { runLegacyLatencyPortfolioExperiment } from './orchestration-legacy-portfolio.js';
import { runStaticPortfolio } from './orchestration-static-portfolio.js';
import { attemptConfigKey, normalizeAblationConfig, getActiveGates, hasAttemptError, classifyAttemptTier, MIN_ATTEMPT_WORK } from './orchestration-contracts.js';
import { EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE } from './orchestration-early-repair.js';
import type { Attempt, ShrunkBiasedTier, SolveOpts, SolveResult } from './orchestration-contracts.js';

// Re-exported for compatibility with every existing './orchestration.js' import path.
export type { Attempt, AttemptTierFlags, SolveOpts, AttemptResult, SearchResult } from './orchestration-contracts.js';
export { classifyAttemptTier, attemptConfigKey, normalizeAblationConfig, getActiveGates, getFalseGoalTriggerSearchBudgetMs } from './orchestration-contracts.js';
export { runAttempt } from './orchestration-run-attempt.js';
export { attemptBudgetShare } from './orchestration-main-search.js';
export {
    EARLY_REPAIR_SEARCH_ATTEMPT_MS_CAP, EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET,
    EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE,
} from './orchestration-early-repair.js';

// buildRetryTierAblationOverride/runWholeLadderRetryTier: the shared stage-executors.ts adapter for
// the four "rerun mainConfigs under one forced flag" retry tiers — see its own header comment.
// repair-elite-prefix-dfs-retry still builds its own override directly (a different execution shape).

// Retry-tier budget fraction/reserve constants and their re-derivation cascade now live in
// stage-budget.ts (the canonical budget-policy module — see its own header comment). Re-exported
// here so existing external consumers (scripts/solver-parallel/race.mjs) keep importing them from
// this module's public surface unchanged.
export {
    REPAIR_ADDITIVE_BUDGET_MULTIPLIER, GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION, ADMISSIBLE_ORDER_BUDGET_FRACTION,
    ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION, ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION,
    MAIN_SEARCH_LATE_RESERVE_FRACTION, MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT, REPAIR_FALLBACK_NODE_RESERVE_FRACTION,
    GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE_FRACTION, REPAIR_SHRINK_RECOVERY_NODE_RESERVE_FRACTION,
    COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION, COARSE_STATE_NEAR_TIE_RETENTION_RETRY_NODE_RESERVE_FRACTION,
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
// REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS is NOT imported here: this file's own
// late-repair-multiseed-retry block iterates stageBudgetPlan's own resolved
// repairLateProbeMultiSeedRetrySeedSalts (computeStageBudgetPlan, stage-budget.ts) instead of the
// raw constant, so an experiment-only seed-count override (repairLateProbeMultiSeedRetrySeedCount
// Override) cannot drift between the additive reserve and the actual execution loop.

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
    const schedulerMode = opts.schedulerMode === 'portfolio-experiment'
        ? 'legacy-latency-portfolio-experiment'
        : opts.schedulerMode === 'legacy' || opts.schedulerMode === undefined
            ? 'production'
            : opts.schedulerMode;
    if (schedulerMode === 'legacy-latency-portfolio-experiment') {
        return runLegacyLatencyPortfolioExperiment(level, opts, timeBudgetMs, yieldFn);
    }
    if (schedulerMode === 'static-portfolio') {
        if (!opts.staticPortfolio) throw new Error("solveLevel: schedulerMode 'static-portfolio' requires opts.staticPortfolio");
        return runStaticPortfolio(level, opts);
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
    if (opts.jointObligationObserver) prep._jointObligationObserver = opts.jointObligationObserver;
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

    // Build attempt configs, then apply ablation profile/orderingBias filters and ordering overrides.
    const baseConfigs = getConfiguredAttemptConfigs(level, cfg);
    const activeGates = getActiveGates(level, gateKeys, cfg, prep);

    // The repair fallback(s) (attempts.ts's needsRepairFallback / repairMustTurnBiasedAttempt) and
    // the admissible-order-fallback-search tier (attempts.ts's ADMISSIBLE_ORDER_PROFILES) are both pulled out
    // of the normal per-config loop and run afterward, each with its own extra budget
    // (REPAIR_ADDITIVE_BUDGET_MULTIPLIER / ADMISSIBLE_ORDER_BUDGET_FRACTION) — mainConfigs excludes both
    // so neither competes for a share of timeBudgetMs. repairConfigs is absent on every level outside
    // its feature gate; admissibleOrderConfigs is present on every level (see that tier's own
    // unconditional-placement comment) unless STRATEGY_ADMISSIBLE_ORDER is explicitly disabled.
    const repairConfigs = baseConfigs.filter(c => c.repair);
    const admissibleOrderConfigs = baseConfigs.filter(c => c.admissibleOrder);
    // STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY's own config list (see that flag's own comment,
    // ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION) — 'default' excluded, since it already
    // gets a full unreduced shot in the admissible-order-fallback tier's own earlier pass and this tier never
    // reruns it.
    const admissibleOrderNonDefaultConfigs = admissibleOrderConfigs.filter(c => c.scoringProfileId !== 'default');
    const mainConfigs = baseConfigs.filter(c => !c.repair && !c.admissibleOrder);

    // opts.repairAdditiveBudgetMultiplierOverride (NOT an ablation flag — see SolveOpts's field comment for
    // why) lets offline batch tooling shrink/grow the repair fallback's extra budget for a
    // faster/bounded dev-loop run, without touching the tuned production constant — absent (the
    // common case) preserves REPAIR_ADDITIVE_BUDGET_MULTIPLIER exactly. Resolved here, before the early
    // probe below, rather than only just before the full-budget fallback loop further down: an
    // explicit 0 override means "no repair-related cost at all," and the probe is a repair-related
    // cost too (see its gate's own comment for why this matters).
    // Canonical budget-policy cascade (stage-budget.ts) — every retry-tier fraction/reserve/ceiling
    // computed in one place. See computeStageBudgetPlan's own doc for why this must run before the
    // repair probe (below): the admissible-order-fallback/retry-tier reserves have to shrink the ceiling
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
        repairAdditiveBudgetMultiplier, diversityBudgetFraction, coarseStateNearTieRetentionRetryBudgetFraction, nonDefaultRetryBudgetFraction,
        connectivityRetryBudgetFraction, repairElitePrefixDfsRetryBudgetFraction, mcNeighborBudgetRetryBudgetFraction,
        admissibleOrderBudgetFraction, admissibleOrderTierWillRun, admissibleOrderNodeReserve,
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
        mainSearchLateReserve, mainSearchEarlyNodeBudget, mainSearchLateConfigStart,
        mainSearchLateReserveEnabled, mainSearchLateReserveFraction, mainSearchLateReserveConfigCount,
        repairFallbackNodeReserve, goalAttractionDisabledRetryNodeReserve,
        shrinkRecoveryEnabled,
    } = stageBudgetPlan;
    // WORK-budget mirror of mainSearchLateReserve/mainSearchEarlyNodeBudget above (2026-08-26 fix for the
    // confirm-residual-001 scheduling gap -- see docs/solver-opt-in-experiment-ledger.md's
    // STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE row and
    // reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md's confirm-residual-001
    // subsection). MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT's protection for the trailing configs only ever
    // worked against the NODE dimension: runInterleavedAttempts/runGateSerialAttempts's own WORK-budget
    // stop conditions had no equivalent carve-out, so a work-expensive early config population could
    // exhaust `workBudget` while `nodeBudget` still had headroom, silently defeating the reserve --
    // confirmed directly on real generated levels in that confirmation attempt (25/25 routing-regime-
    // eligible-and-residual rows truncated after only 4 of 6 configs despite the node reserve
    // nominally protecting the trailing 5).
    //
    // Lives here, not in stage-budget.ts, because `workBudget` is a solveLevel-local input never
    // threaded into computeStageBudgetPlan (every other WORK-dimension computation -- workSpent,
    // gateBudget, attemptBudgetShare -- already lives in this file, not there). Same fraction and
    // config-count policy as the node-side reserve, mirrored onto the other resource dimension; see
    // that reserve's own comment (stage-budget.ts) for the eligibility/rounding-to-zero rationale,
    // which applies identically here.
    const mainSearchLateWorkReserveEligible = mainSearchLateReserveEnabled
        && mainSearchLateReserveFraction > 0
        && mainSearchLateReserveConfigCount > 0
        && workBudget !== Infinity;
    const mainSearchLateWorkReserve = mainSearchLateWorkReserveEligible
        ? Math.floor(workBudget * mainSearchLateReserveFraction)
        : 0;
    const mainSearchEarlyWorkBudget = mainSearchLateWorkReserve > 0
        ? workBudget - mainSearchLateWorkReserve
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
        const hasNonDefaultAdmissibleOrderConfig = baseConfigs.some(config => config.admissibleOrder && config.scoringProfileId !== 'default');
        // Canonical eligibility: buildSolverStagePlan (stage-plan.ts) pairs every SOLVER_STAGE_IDS
        // entry (stage-policy.ts) with the SAME eligibility booleans stageBudgetPlan computed and
        // the real dispatch below gates on — one canonical source, not a second hand-written
        // expression per stage. Stages this pre-probe plan cannot cover (prime, early-repair-search-
        // shrink-recovery, the portfolio-only stages — see buildSolverStagePlan's own doc) report
        // `eligible: undefined` and are filtered out; every other stage is covered and in the
        // same declared order as before (stage-policy.ts's SOLVER_STAGE_IDS order matches this
        // telemetry's own historical row order exactly).
        const solverStagePlan = buildSolverStagePlan({ budgetPlan: stageBudgetPlan, mainSearchEligible: hasMainConfig });
        const runnable = new Map<string, boolean>(
            solverStagePlan
                .filter((entry): entry is typeof entry & { eligible: boolean } => entry.eligible !== undefined)
                .map(entry => [entry.spec.id === 'main-search' ? 'main-ladder' : entry.spec.id, entry.eligible]),
        );
        const instantiated = new Map<string, boolean>([
            ['early-repair-search', hasRepairConfig],
            ['main-ladder', hasMainConfig],
            ['repair-fallback', hasRepairConfig],
            ['goal-attraction-disabled-retry', hasMainConfig],
            ['admissible-order-fallback', baseConfigs.some(config => config.admissibleOrder)],
            ['coarse-state-near-tie-retention-disabled-retry', hasMainConfig],
            ['admissible-order-alternate-tiebreak-retry', hasNonDefaultAdmissibleOrderConfig],
            ['connectivity-axis-prune-disabled-retry', hasMainConfig],
            ['repair-elite-prefix-dfs-retry', hasRepairConfig],
            ['must-cross-neighbor-prune-disabled-retry', hasMainConfig],
            // Inverted, deliberately: this tier's own structural precondition is the OPPOSITE of
            // repair-fallback's (see repairLateProbeTierWillRun's own comment) — it exists FOR
            // levels with no repair config in the ladder, not levels that have one.
            ['late-repair-search', !hasRepairConfig],
            ['guidance-goal-distance-retry', hasMainConfig],
            // Inverted for the same reason as late-repair-search above: this tier synthesizes its
            // own repair attempt as a multi-seed extension of late-repair-search, so it shares that
            // tier's structural precondition (no configured repair fallback), not repair-fallback's.
            ['late-repair-multiseed-retry', !hasRepairConfig],
        ]);
        const order = [...runnable.keys()];
        const lastTechnique = solveResult.attempts.length ? classify(solveResult.attempts.at(-1)!) : null;
        const winningIndex = solveResult.ok
            ? Math.max(0, order.indexOf(classify(solveResult.attempts.find(attempt => attempt.ok) ?? solveResult.attempts.at(-1)!)))
            : -1;
        solveResult.stageLifecycle = Object.fromEntries(order.map((name, index) => {
            const attempts = solveResult.attempts.filter(attempt => classify(attempt) === name);
            const reached = attempts.length > 0;
            const nodeStarvedAtDispatch = reached && attempts.every(attempt => attempt.allocatedNodeCeiling === 0);
            // CAVEAT for admissible-order-fallback/admissible-order-alternate-tiebreak-retry (see
            // attempt-dispatch.ts's budgetStarvedAtDispatch comment): allocatedWorkCeiling reading 0
            // does not mean the search stopped short for either of those two techniques, because
            // admissibleOrderSearch's hot loop does not consult prep._workCap by default (only the
            // opt-in STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT changes that,
            // and only for the alternate-tiebreak-retry tier). Empirically, EVERY corpus-2 unsolved
            // level admissible-order-fallback reports workStarved for still shows substantial real
            // actualWork/actualNodes (mean ~15M/~12.5M — see reports/2026-09-10-ws1-existing-data-
            // exposure-classification-001.md) — i.e. a full, uncapped attempt that still failed, not
            // a starved one. Do not read this field as "give this stage more budget" for those two
            // techniques without cross-checking actualWork/actualNodes first.
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
            Object.assign(primeResult.attempt, withSolverStage(primeResult.attempt, 'explicit-prime'));
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
    if (repairConfigs.length > 0 && repairAdditiveBudgetMultiplier !== 0 && (!cfg || cfg.STRATEGY_EARLY_REPAIR_SEARCH)) {
        // No `prep._workCap` override here, deliberately: this probe runs BEFORE the main ladder
        // (`runInterleavedAttempts`/`runGateSerialAttempts`, below) ever executes, so — unlike every
        // tier further down this function — there is no earlier attempt that could have left a stale
        // cap for it to inherit. `prep._workCap` is genuinely unset (null) at this point in normal
        // (non-strict) mode; pinned by orchestration.test.ts's own
        // 'strictTotalWorkBudget installs one remaining-work cap across every additive path' test.
        const probe = await runEarlyRepairSearch(repairConfigs, activeGates, level, prep, yieldFn, cfg, mainSearchEarlyNodeBudget,
            opts.earlyRepairSearchAdaptiveBiasedBadnessGateOverride ?? opts.repairProbeAdaptiveBiasedBadnessGateOverride ?? EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE,
            opts.earlyRepairSearchAdaptiveBiasedMinScaleOverride ?? opts.repairProbeAdaptiveBiasedMinScaleOverride ?? EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE);
        probeAttempts.push(...probe.attempts);
        shrunkBiasedTiers = probe.shrunkBiased ?? [];
        if (probe.solution) {
            const totalMs = Date.now() - levelStartTime;
            const nodesExpanded = prep._metrics.nodesExpanded;
            return finish({ ok: true, status: 'success', solution: probe.solution, solutions: [probe.solution], attempts: probeAttempts, totalMs, nodesExpanded, workSpent: prep._workMeter.units - workStart, workBudget });
        }
        // The probe now self-limits against the external nodeBudget (see runEarlyRepairSearch's own
        // comment) but only between seed-salt rounds, its smallest independently-costed unit — it
        // can still overshoot by up to one round's own cost, so re-check before spending any more
        // nodes in the main loop.
        //
        // Only an EARLY return when nothing is being held back for the admissible-order-fallback tier, the
        // repair-fallback reserve, OR the goal-attraction-disabled-retry reserve. With a reserve in play, a
        // probe that exhausts the early-tier ceiling must fall THROUGH to whichever tier it is rather
        // than end the solve — returning here would spend the reserve on nothing, which is the
        // precise failure this reserve exists to fix. Falling through is safe and needs no further
        // guards: the main loop's runners, the repair loop and the diversity pass each re-check their
        // own ceiling (`mainSearchNodeBudget` / `repairFallbackNodeCeiling` / `earlyTierNodeBudget`) and
        // no-op, so control reaches whichever tier has room having spent no extra nodes.
        if (prep._metrics.nodesExpanded >= mainSearchEarlyNodeBudget && admissibleOrderNodeReserve === 0 && mainSearchLateReserve === 0 && repairFallbackNodeReserve === 0 && goalAttractionDisabledRetryNodeReserve === 0) {
            const totalMs = Date.now() - levelStartTime;
            return finish({ ok: false, status: hasAttemptError(probeAttempts) ? 'attempt-error' : 'node-budget-reached', solution: null, solutions: [], attempts: probeAttempts, totalMs, nodesExpanded: prep._metrics.nodesExpanded, nodeBudgetReached: true, workSpent: prep._workMeter.units - workStart, workBudget });
        }
    }

    // Now that the probe has run, size STRATEGY_REPAIR_SHRINK_RECOVERY's reserve to the ACTUAL
    // debt it must repay. The recovery re-runs a shrunk config from scratch (repairSearchFromGate
    // has no resume API), so repaying only the withheld difference is not enough — it needs the
    // tier's FULL budget to reach the point the shrink cut off. Reserving `full - granted` was tried
    // first and measurably fails: on R00408 it left the recovery 2,812,495 nodes against the
    // 5,965,490 its winning attempt actually needs.
    //
    // Carved from `earlyTierNodeBudget` as a PEER of admissibleOrderNodeReserve rather than nested
    // inside `mainSearchLateReserve` (where the two opt-in reserves above sit): a full biased budget
    // is 6,000,000 nodes, larger than the whole late-reserve slice at any realistic ceiling, so a
    // nested slice structurally cannot fund this tier. Bounded by `shrinkRecoveryFraction` of the
    // early-tier ceiling so it can never starve the tiers it sits behind.
    const shrinkRecoveryBudget = computeShrinkRecoveryBudget(stageBudgetPlan, shrunkBiasedTiers);
    const { shrinkRecoveryNodeReserve, mainSearchNodeBudgetFinal, repairFallbackNodeCeiling, diversityNodeCeiling } = shrinkRecoveryBudget;

    // Multi-gate levels: interleave configs across gates (config-outer, gate-inner).
    // This prevents Gate 1 exhausting its full budget before Gate 2 ever gets to try
    // Config 1 — crucial when Gate 1 is structurally infeasible but parity-feasible.
    // Ablation: STRATEGY_GATE_INTERLEAVING can force the gate-outer (non-interleaved) loop.
    //
    // Deliberately timed from mainSearchStartTime (now), NOT levelStartTime: both main-search
    // runners compute each attempt's share as timeBudgetMs minus elapsed-since-start, so
    // timing them from the original levelStartTime would let the probe's wall-clock silently
    // shrink the main loop's own budget — reintroducing exactly the "reserve budget up front"
    // regression mechanism REPAIR_ADDITIVE_BUDGET_MULTIPLIER's own comment documents (S017). A
    // first version of this probe used levelStartTime here and was caught by a full-corpus
    // regression sweep: several fast main-search solves (S038, S050, S026, S027, S110, S023,
    // S018) lost just enough of their first attempt's budget to fail it, cascading into the
    // full repair fallback chain (some 50-100x slower). mainSearchStartTime gives the main loop
    // its full, untouched timeBudgetMs window regardless of how long the probe ran.
    const useInterleaving = (!cfg || cfg.STRATEGY_GATE_INTERLEAVING);
    const mainSearchStartTime = Date.now();
    const result = useInterleaving && activeGates.length > 1
        ? await runInterleavedAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainSearchStartTime, yieldFn, mainSearchNodeBudgetFinal, workBudget, workStart, mainSearchEarlyNodeBudget, mainSearchLateConfigStart, mainSearchEarlyWorkBudget)
        : await runGateSerialAttempts(activeGates, mainConfigs, level, prep, timeBudgetMs, mainSearchStartTime, yieldFn, mainSearchNodeBudgetFinal, workBudget, workStart, mainSearchEarlyNodeBudget, mainSearchLateConfigStart, mainSearchLateWorkReserveEligible ? mainSearchLateReserveFraction : 0);
    result.attempts = [...probeAttempts, ...result.attempts];
    const mainSearchEarlyTiersHitNodeCeiling = result.earlyNodeBudgetReached === true;
    const mainSearchEarlyTiersHitWorkCeiling = result.earlyWorkBudgetReached === true;

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
    if (!result.solution && diversityBudgetFraction > 0 && (!cfg || cfg.STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY) && prep._metrics.nodesExpanded < earlyTierNodeBudget) {
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
            const profileCeiling = admissibleOrderConfig.scoringProfileId === 'default'
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
    // BEFORE the admissible-order-fallback tier, its own extended ceiling let it burn `prep._metrics.
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
    if (!result.solution && coarseStateNearTieRetentionRetryTierWillRun && prep._metrics.nodesExpanded < coarseStateNearTieRetentionRetryNodeCeiling) {
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
    if (!result.solution && nonDefaultRetryTierWillRun && prep._metrics.nodesExpanded < nonDefaultRetryNodeCeiling) {
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
    if (!result.solution && connectivityRetryTierWillRun && prep._metrics.nodesExpanded < connectivityRetryNodeCeiling) {
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
    if (!result.solution && repairElitePrefixDfsRetryTierWillRun && prep._metrics.nodesExpanded < repairElitePrefixDfsRetryNodeCeiling) {
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
    if (!result.solution && mcNeighborBudgetRetryTierWillRun && prep._metrics.nodesExpanded < mcNeighborBudgetRetryNodeCeiling) {
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
    if (!result.solution && goalAttractionGuidanceDistanceRetryTierWillRun && prep._metrics.nodesExpanded < goalAttractionGuidanceDistanceRetryNodeCeiling) {
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
    if (!result.solution && repairLateProbeMultiSeedRetryTierWillRun && prep._metrics.nodesExpanded < repairLateProbeMultiSeedRetryNodeCeiling) {
        const repairLateProbeMultiSeedConfig = repairAttempt();
        const originalWorkCap = prep._workCap;
        try {
            seedLoop:
            for (const seedSalt of repairLateProbeMultiSeedRetrySeedSalts) {
                if (prep._metrics.nodesExpanded >= repairLateProbeMultiSeedRetryNodeCeiling) break;
                const roundStart = Date.now();
                const roundEntryNodes = prep._metrics.nodesExpanded;
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
                    result.attempts.push(withSolverStage(r.attempt, 'late-repair-multiseed-retry'));
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
    const nodeBudgetReached = nodeBudget !== Infinity && (nodesExpanded >= nodeBudget || earlyTiersHitNodeCeiling || mainSearchEarlyTiersHitNodeCeiling);
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
    // (mainSearchEarlyWorkBudget/mainSearchEarlyTiersHitWorkCeiling): without the OR term, a level whose
    // early configs were cut off at that reduced ceiling, but whose later tiers (repair fallback,
    // admissible order) then exhaust their own search naturally below the full workBudget, would
    // report workBudgetReached: false / status 'failed' — hiding that the main loop itself was
    // budget-limited, not searched out. Bit-identical to the plain `workSpent >= workBudget` check
    // whenever the reserve never triggered (every caller before this fix, and any run with an
    // infinite workBudget).
    const workBudgetReached = workBudget !== Infinity && (workSpent >= workBudget || mainSearchEarlyTiersHitWorkCeiling);
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
