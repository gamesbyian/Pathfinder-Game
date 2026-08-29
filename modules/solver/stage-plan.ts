// Canonical per-solve stage eligibility view: stage-policy identities plus the same budget-plan
// booleans orchestration dispatches on. Prime/portfolio stages use separate call paths.
import { SOLVER_STAGE_IDS, solverStageSpec } from './stage-policy.js';
import type { SolverStageId, SolverStageSpec } from './stage-policy.js';
import type { StageBudgetPlan } from './stage-budget.js';

export interface SolverStagePlanEntry {
    spec: SolverStageSpec;
    /** Undefined when this plan does not cover the stage's call path. */
    eligible: boolean | undefined;
}
export type SolverStagePlan = SolverStagePlanEntry[];

export interface SolverStagePlanInput {
    budgetPlan: StageBudgetPlan;
    /** Main loop has at least one configured attempt. */
    mainSearchEligible: boolean;
    /** Known only after repair probe; omission leaves shrink-recovery eligibility undefined. */
    earlyRepairSearchShrunkTierCount?: number;
}

/** Eligibility fields owned by StageBudgetPlan. */
function budgetPlanEligibility(id: SolverStageId, plan: StageBudgetPlan): boolean | undefined {
    switch (id) {
        case 'early-repair-search': return !!plan.earlyRepairSearchTierWillRun;
        case 'repair-fallback': return !!plan.repairFallbackTierWillRun;
        case 'goal-attraction-disabled-retry': return !!plan.diversityTierWillRun;
        case 'admissible-order-fallback': return !!plan.admissibleOrderTierWillRun;
        case 'coarse-state-near-tie-retention-disabled-retry': return !!plan.coarseStateNearTieRetentionRetryTierWillRun;
        case 'admissible-order-alternate-tiebreak-retry': return !!plan.nonDefaultRetryTierWillRun;
        case 'connectivity-axis-prune-disabled-retry': return !!plan.connectivityRetryTierWillRun;
        case 'repair-elite-prefix-dfs-retry': return !!plan.repairElitePrefixDfsRetryTierWillRun;
        case 'must-cross-neighbor-prune-disabled-retry': return !!plan.mcNeighborBudgetRetryTierWillRun;
        case 'late-repair-search': return !!plan.repairLateProbeTierWillRun;
        case 'guidance-goal-distance-retry': return !!plan.goalAttractionGuidanceDistanceRetryTierWillRun;
        case 'late-repair-multiseed-retry': return !!plan.repairLateProbeMultiSeedRetryTierWillRun;
        default: return undefined;
    }
}

export function buildSolverStagePlan(input: SolverStagePlanInput): SolverStagePlan {
    const { budgetPlan, mainSearchEligible, earlyRepairSearchShrunkTierCount } = input;
    return SOLVER_STAGE_IDS.map((id): SolverStagePlanEntry => {
        if (id === 'main-search') return { spec: solverStageSpec(id), eligible: mainSearchEligible };
        if (id === 'repair-shrink-recovery') {
            const eligible = earlyRepairSearchShrunkTierCount === undefined
                ? undefined
                : !!budgetPlan.shrinkRecoveryEnabled && earlyRepairSearchShrunkTierCount > 0;
            return { spec: solverStageSpec(id), eligible };
        }
        return { spec: solverStageSpec(id), eligible: budgetPlanEligibility(id, budgetPlan) };
    });
}
