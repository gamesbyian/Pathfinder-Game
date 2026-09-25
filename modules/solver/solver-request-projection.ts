import { FEATURES, defaultConfig } from './ablation-config.js';
import { legacyMsToWork } from './budget-units.js';
import {
    attemptConfigKey,
    MIN_ATTEMPT_WORK,
    normalizeAblationConfig,
} from './orchestration-contracts.js';
import type { SolveOpts } from './orchestration-contracts.js';
import {
    ADMISSIBLE_ORDER_BUDGET_FRACTION,
    ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION,
    ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION,
    ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION,
    ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION,
    COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION,
    COARSE_STATE_NEAR_TIE_RETENTION_RETRY_NODE_RESERVE_FRACTION,
    CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION,
    CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION,
    GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION,
    GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE_FRACTION,
    MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT,
    MAIN_SEARCH_LATE_RESERVE_FRACTION,
    MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION,
    MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION,
    REPAIR_ADDITIVE_BUDGET_MULTIPLIER,
    REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION,
    REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION,
    REPAIR_FALLBACK_NODE_RESERVE_FRACTION,
    REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS,
    REPAIR_LATE_PROBE_NODE_BUDGET,
    REPAIR_SHRINK_RECOVERY_NODE_RESERVE_FRACTION,
} from './stage-budget.js';
import {
    EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE,
    EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE,
    EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET,
    EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET,
} from './orchestration-early-repair.js';
import { STATIC_PORTFOLIO_ATTEMPT_BUDGET_MS } from './orchestration-static-portfolio.js';
import { LEGACY_LATENCY_PORTFOLIO_EXPERIMENT } from './legacy-latency-portfolio-experiment.js';
import { stableStringify } from '../canonical-json.mjs';

export const SOLVER_REQUEST_PROJECTION_SCHEMA_VERSION = 1;

/**
 * These are exactly the SolveOpts fields classified as solver-semantic in
 * docs/solver-request-semantics-inventory.json at the time this projection was introduced.
 * A focused test compares this list against that machine-readable authority so a new field cannot
 * silently escape request-identity classification.
 */
export const SOLVER_REQUEST_SEMANTIC_FIELDS = Object.freeze([
    'timeBudgetMs',
    'ablation',
    'nodeBudget',
    'baseWorkBudget',
    'strictTotalWorkBudget',
    'schedulerMode',
    'staticPortfolio',
    'legacyLatencyPortfolioExperiment',
    'repairAdditiveBudgetMultiplierOverride',
    'goalAttractionDisabledRetryBudgetFractionOverride',
    'coarseStateNearTieRetentionRetryBudgetFractionOverride',
    'coarseStateNearTieRetentionRetryNodeReserveFractionOverride',
    'admissibleOrderNonDefaultRetryBudgetFractionOverride',
    'admissibleOrderNonDefaultRetryNodeReserveFractionOverride',
    'connectivityAxisExhaustedRetryBudgetFractionOverride',
    'connectivityAxisExhaustedRetryNodeReserveFractionOverride',
    'repairElitePrefixDfsRetryBudgetFractionOverride',
    'repairElitePrefixDfsRetryNodeReserveFractionOverride',
    'mcNeighborBudgetRetryBudgetFractionOverride',
    'mcNeighborBudgetRetryNodeReserveFractionOverride',
    'repairLateProbeNodeBudgetOverride',
    'repairLateProbeMultiSeedRetrySeedCountOverride',
    'admissibleOrderBudgetFractionOverride',
    'admissibleOrderNodeReserveFractionOverride',
    'admissibleOrderProfileNodeReserveFractionOverride',
    'repairFallbackNodeReserveFractionOverride',
    'repairShrinkRecoveryNodeReserveFractionOverride',
    'goalAttractionDisabledRetryNodeReserveFractionOverride',
    'mainSearchLateReserveFractionOverride',
    'mainSearchLateReserveConfigCountOverride',
    'earlyRepairSearchAdaptiveBiasedBadnessGateOverride',
    'earlyRepairSearchAdaptiveBiasedMinScaleOverride',
    'earlyRepairSearchOrdinaryNodeBudgetOverride',
    'earlyRepairSearchBiasedNodeBudgetOverride',
    'disableExtraBudgetPasses',
] as const);

function nonNegativeOr(value: unknown, fallback: number): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function unitFractionOr(value: unknown, fallback: number): number {
    return Math.min(1, nonNegativeOr(value, fallback));
}

function additiveOr(value: unknown, disabled: boolean, fallback: number): number {
    const requested = value ?? (disabled ? 0 : undefined);
    return nonNegativeOr(requested, fallback);
}

function canonicalAblation(raw: SolveOpts['ablation']) {
    const normalized = normalizeAblationConfig(raw);
    const defaults = defaultConfig();
    const flags = Object.fromEntries(Object.keys(FEATURES).sort().map((name) => [
        name,
        Boolean(normalized ? normalized[name] : defaults[name]),
    ]));
    return {
        flags,
        attemptOrder: normalized?.ATTEMPT_ORDER ?? null,
        randomSeed: normalized?._randomSeed ?? null,
    };
}

function canonicalLegacyLatencyExperiment(experiment: NonNullable<SolveOpts['legacyLatencyPortfolioExperiment']>) {
    return {
        pass1Ms: experiment.pass1Ms,
        pass2Ms: experiment.pass2Ms,
        pass3Ms: experiment.pass3Ms,
        pass2Configs: [...experiment.pass2Configs].sort(),
        pass3Configs: [...experiment.pass3Configs].sort(),
        conditionalPasses: (experiment.conditionalPasses ?? []).map(pass => ({
            passNumber: pass.passNumber,
            capMs: pass.capMs,
            configs: [...pass.configs].sort(),
            when: { ...pass.when },
        })),
    };
}

function canonicalStaticPortfolio(portfolio: NonNullable<SolveOpts['staticPortfolio']>) {
    const caps = portfolio.perTechniqueWorkCapByKey ?? {};
    return {
        techniqueConfigs: portfolio.techniqueConfigs.map(attemptConfigKey),
        workBudget: portfolio.workBudget,
        perTechniqueWorkCap: Number.isFinite(portfolio.perTechniqueWorkCap)
            ? portfolio.perTechniqueWorkCap
            : null,
        perTechniqueWorkCapByKey: Object.fromEntries(
            Object.keys(caps).sort().map(key => [key, caps[key]]),
        ),
        attemptBudgetMs: portfolio.attemptBudgetMs ?? STATIC_PORTFOLIO_ATTEMPT_BUDGET_MS,
        resumableResidualPass: portfolio.resumableResidualPass === true,
    };
}

/**
 * Canonical run-wide solver-request projection.
 *
 * This deliberately excludes:
 * - observation-only fields;
 * - transport/test substitution fields;
 * - forcedFirstStepKey / forcedPortalExitKey / primeAttempt, which belong to per-level effective
 *   input identity rather than one run-wide request hash;
 * - raced-backend pool/wall semantics, which belong to execution/reproducibility identity.
 *
 * It normalizes defaults that are genuinely request-wide. Level-dependent eligibility, config-count
 * clamping, stage ceilings, and history-derived forcing are NOT resolved here.
 */
export function buildCanonicalSolverRequestProjection(opts: SolveOpts = {}) {
    const timeBudgetMs = Number(opts.timeBudgetMs) > 0 ? Number(opts.timeBudgetMs) : 30000;
    const nodeBudget = Number(opts.nodeBudget) > 0 ? Number(opts.nodeBudget) : null;
    const explicitBaseWorkBudget = Number(opts.baseWorkBudget) > 0 ? Number(opts.baseWorkBudget) : null;
    const baseWorkBudget = explicitBaseWorkBudget ?? legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK);
    const schedulerMode = opts.schedulerMode ?? 'production';
    if (!['production', 'legacy-latency-portfolio-experiment', 'static-portfolio'].includes(schedulerMode)) {
        throw new Error(`unsupported schedulerMode in canonical solver request: ${JSON.stringify(schedulerMode)}`);
    }
    if (schedulerMode === 'static-portfolio' && !opts.staticPortfolio) {
        throw new Error("schedulerMode 'static-portfolio' requires staticPortfolio in canonical solver request");
    }

    const ablation = canonicalAblation(opts.ablation);
    const disabled = opts.disableExtraBudgetPasses === true;
    const widenedReserveDefault = ablation.flags.STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE
        ? MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT + 1
        : MAIN_SEARCH_LATE_RESERVE_CONFIG_COUNT;
    const reserveCountRaw = Number(opts.mainSearchLateReserveConfigCountOverride);
    const mainSearchLateReserveConfigCount = Number.isFinite(reserveCountRaw) && reserveCountRaw >= 0
        ? Math.floor(reserveCountRaw)
        : widenedReserveDefault;
    const seedCountRaw = Number(opts.repairLateProbeMultiSeedRetrySeedCountOverride);
    const repairLateProbeMultiSeedRetrySeedCount = Number.isInteger(seedCountRaw)
        && seedCountRaw >= 0
        && seedCountRaw <= REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length
        ? seedCountRaw
        : REPAIR_LATE_PROBE_MULTI_SEED_RETRY_SEED_SALTS.length;

    return {
        schemaVersion: SOLVER_REQUEST_PROJECTION_SCHEMA_VERSION,
        kind: 'pathfinder-solver-request-projection',
        resourceEnvelope: {
            timeBudgetMs,
            nodeBudget,
            baseWorkBudget,
            strictTotalWorkBudget: opts.strictTotalWorkBudget === true,
        },
        scheduler: {
            mode: schedulerMode,
            staticPortfolio: schedulerMode === 'static-portfolio'
                ? canonicalStaticPortfolio(opts.staticPortfolio!)
                : null,
            legacyLatencyPortfolioExperiment: schedulerMode === 'legacy-latency-portfolio-experiment'
                ? canonicalLegacyLatencyExperiment(opts.legacyLatencyPortfolioExperiment ?? LEGACY_LATENCY_PORTFOLIO_EXPERIMENT)
                : null,
        },
        ablation,
        stagePolicy: {
            repairAdditiveBudgetMultiplier: additiveOr(
                opts.repairAdditiveBudgetMultiplierOverride, disabled, REPAIR_ADDITIVE_BUDGET_MULTIPLIER,
            ),
            goalAttractionDisabledRetryBudgetFraction: additiveOr(
                opts.goalAttractionDisabledRetryBudgetFractionOverride, disabled, GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION,
            ),
            coarseStateNearTieRetentionRetryBudgetFraction: additiveOr(
                opts.coarseStateNearTieRetentionRetryBudgetFractionOverride, disabled, COARSE_STATE_NEAR_TIE_RETENTION_RETRY_BUDGET_FRACTION,
            ),
            coarseStateNearTieRetentionRetryNodeReserveFraction: unitFractionOr(
                opts.coarseStateNearTieRetentionRetryNodeReserveFractionOverride, COARSE_STATE_NEAR_TIE_RETENTION_RETRY_NODE_RESERVE_FRACTION,
            ),
            admissibleOrderNonDefaultRetryBudgetFraction: additiveOr(
                opts.admissibleOrderNonDefaultRetryBudgetFractionOverride, disabled, ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION,
            ),
            admissibleOrderNonDefaultRetryNodeReserveFraction: unitFractionOr(
                opts.admissibleOrderNonDefaultRetryNodeReserveFractionOverride, ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_NODE_RESERVE_FRACTION,
            ),
            connectivityAxisExhaustedRetryBudgetFraction: additiveOr(
                opts.connectivityAxisExhaustedRetryBudgetFractionOverride, disabled, CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION,
            ),
            connectivityAxisExhaustedRetryNodeReserveFraction: unitFractionOr(
                opts.connectivityAxisExhaustedRetryNodeReserveFractionOverride, CONNECTIVITY_AXIS_EXHAUSTED_RETRY_NODE_RESERVE_FRACTION,
            ),
            repairElitePrefixDfsRetryBudgetFraction: additiveOr(
                opts.repairElitePrefixDfsRetryBudgetFractionOverride, disabled, REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION,
            ),
            repairElitePrefixDfsRetryNodeReserveFraction: unitFractionOr(
                opts.repairElitePrefixDfsRetryNodeReserveFractionOverride, REPAIR_ELITE_PREFIX_DFS_RETRY_NODE_RESERVE_FRACTION,
            ),
            mcNeighborBudgetRetryBudgetFraction: additiveOr(
                opts.mcNeighborBudgetRetryBudgetFractionOverride, disabled, MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION,
            ),
            mcNeighborBudgetRetryNodeReserveFraction: unitFractionOr(
                opts.mcNeighborBudgetRetryNodeReserveFractionOverride, MC_NEIGHBOR_BUDGET_RETRY_NODE_RESERVE_FRACTION,
            ),
            repairLateProbeNodeBudget: additiveOr(
                opts.repairLateProbeNodeBudgetOverride, disabled, REPAIR_LATE_PROBE_NODE_BUDGET,
            ),
            repairLateProbeMultiSeedRetrySeedCount,
            admissibleOrderBudgetFraction: additiveOr(
                opts.admissibleOrderBudgetFractionOverride, disabled, ADMISSIBLE_ORDER_BUDGET_FRACTION,
            ),
            admissibleOrderNodeReserveFraction: nonNegativeOr(
                opts.admissibleOrderNodeReserveFractionOverride, ADMISSIBLE_ORDER_NODE_RESERVE_FRACTION,
            ),
            admissibleOrderProfileNodeReserveFraction: unitFractionOr(
                opts.admissibleOrderProfileNodeReserveFractionOverride, ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE_FRACTION,
            ),
            repairFallbackNodeReserveFraction: unitFractionOr(
                opts.repairFallbackNodeReserveFractionOverride, REPAIR_FALLBACK_NODE_RESERVE_FRACTION,
            ),
            repairShrinkRecoveryNodeReserveFraction: unitFractionOr(
                opts.repairShrinkRecoveryNodeReserveFractionOverride, REPAIR_SHRINK_RECOVERY_NODE_RESERVE_FRACTION,
            ),
            goalAttractionDisabledRetryNodeReserveFraction: unitFractionOr(
                opts.goalAttractionDisabledRetryNodeReserveFractionOverride, GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE_FRACTION,
            ),
            mainSearchLateReserveFraction: unitFractionOr(
                opts.mainSearchLateReserveFractionOverride, MAIN_SEARCH_LATE_RESERVE_FRACTION,
            ),
            mainSearchLateReserveConfigCount,
            earlyRepairSearchAdaptiveBiasedBadnessGate:
                opts.earlyRepairSearchAdaptiveBiasedBadnessGateOverride ?? EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_BADNESS_GATE,
            earlyRepairSearchAdaptiveBiasedMinScale:
                opts.earlyRepairSearchAdaptiveBiasedMinScaleOverride ?? EARLY_REPAIR_SEARCH_ADAPTIVE_BIASED_MIN_SCALE,
            earlyRepairSearchOrdinaryNodeBudget:
                opts.earlyRepairSearchOrdinaryNodeBudgetOverride ?? EARLY_REPAIR_SEARCH_ORDINARY_NODE_BUDGET,
            earlyRepairSearchBiasedNodeBudget:
                opts.earlyRepairSearchBiasedNodeBudgetOverride ?? EARLY_REPAIR_SEARCH_BIASED_NODE_BUDGET,
            disableExtraBudgetPasses: disabled,
        },
    };
}

export function canonicalSolverRequestString(opts: SolveOpts = {}): string {
    return stableStringify(buildCanonicalSolverRequestProjection(opts))!;
}
