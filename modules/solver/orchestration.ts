// The solver's stable compatibility façade: every public './orchestration.js' export is
// re-exported from here unchanged, whether it now lives in this file or in one of the
// orchestration-{contracts,run-attempt,main-search,early-repair,legacy-portfolio,static-portfolio}
// .ts modules it coordinates. This file itself keeps solveLevel — the attempt-ladder coordinator
// calling into every module above — plus the stage-budget.ts re-export block below. See
// modules/solver/README.md.
import { legacyMsToWork } from './budget-units.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { prepLevel } from './prep.js';
import { withSolverStage } from './stage-policy.js';
import { buildSolverStagePlan } from './stage-plan.js';
import type { NormalizedLevel } from '../domain/types.js';

import { runAttempt, testAttemptDispatches } from './orchestration-run-attempt.js';
import { runInterleavedAttempts, runGateSerialAttempts } from './orchestration-main-search.js';
import { runEarlyRepairSearch } from './orchestration-early-repair.js';
import { runLegacyLatencyPortfolioExperiment } from './orchestration-legacy-portfolio.js';
import { runStaticPortfolio } from './orchestration-static-portfolio.js';
import { runAdditiveRetryTiers } from './orchestration-additive-retry-tiers.js';
import { attemptConfigKey, normalizeAblationConfig, getActiveGates, hasAttemptError, classifyAttemptTier, MIN_ATTEMPT_WORK } from './orchestration-contracts.js';
import { EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE, EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE } from './orchestration-early-repair.js';
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
        return runLegacyLatencyPortfolioExperiment(level, opts, timeBudgetMs, yieldFn, solveLevel);
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
    // Every OTHER stageBudgetPlan field the additive retry-tier ladder itself reads (the *BudgetFraction,
    // *TierWillRun, *NodeCeiling fields, retryTierStaircase, earlyTierNodeBudget,
    // admissibleOrderDefaultProfileCeiling, shrinkRecoveryEnabled) is destructured inside
    // orchestration-additive-retry-tiers.ts's own runAdditiveRetryTiers instead of here — this
    // function passes the whole `stageBudgetPlan` object through to it rather than re-aliasing
    // fields it no longer reads itself. Only the fields solveLevel's OWN code (outside that
    // extracted ladder) reads are aliased here.
    const {
        repairAdditiveBudgetMultiplier, admissibleOrderNodeReserve,
        mainSearchLateReserve, mainSearchEarlyNodeBudget, mainSearchLateConfigStart,
        mainSearchLateReserveEnabled, mainSearchLateReserveFraction, mainSearchLateReserveConfigCount,
        repairFallbackNodeReserve, goalAttractionDisabledRetryNodeReserve,
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
    // shrinkRecoveryNodeReserve/repairFallbackNodeCeiling/diversityNodeCeiling are read inside
    // orchestration-additive-retry-tiers.ts's own runAdditiveRetryTiers instead of here — see that
    // destructure's own comment above.
    const { mainSearchNodeBudgetFinal } = shrinkRecoveryBudget;

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

    const { earlyTiersHitNodeCeiling } = await runAdditiveRetryTiers({
        result, repairConfigs, admissibleOrderConfigs, admissibleOrderNonDefaultConfigs, mainConfigs,
        activeGates, cfg, prep, level, yieldFn, timeBudgetMs, workBudget, workStart, nodeBudget,
        useInterleaving, shrunkBiasedTiers, stageBudgetPlan, shrinkRecoveryBudget,
    });

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
