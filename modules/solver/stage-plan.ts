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
    mainLoopEligible: boolean;
    /** Known only after repair probe; omission leaves shrink-recovery eligibility undefined. */
    repairProbeShrunkTierCount?: number;
}

/** Eligibility fields owned by StageBudgetPlan. */
function budgetPlanEligibility(id: SolverStageId, plan: StageBudgetPlan): boolean | undefined {
    switch (id) {
        case 'repair-probe': return !!plan.repairProbeTierWillRun;
        case 'repair-fallback': return !!plan.repairFallbackTierWillRun;
        case 'attraction-diversity': return !!plan.diversityTierWillRun;
        case 'admissible-order': return !!plan.admissibleOrderTierWillRun;
        case 'dedup-near-tie-retry': return !!plan.dedupRetryTierWillRun;
        case 'admissible-order-non-default-retry': return !!plan.nonDefaultRetryTierWillRun;
        case 'connectivity-axis-exhausted-retry': return !!plan.connectivityRetryTierWillRun;
        case 'repair-elite-prefix-dfs-retry': return !!plan.repairElitePrefixDfsRetryTierWillRun;
        case 'mc-neighbor-budget-retry': return !!plan.mcNeighborBudgetRetryTierWillRun;
        case 'repair-late-probe': return !!plan.repairLateProbeTierWillRun;
        default: return undefined;
    }
}

export function buildSolverStagePlan(input: SolverStagePlanInput): SolverStagePlan {
    const { budgetPlan, mainLoopEligible, repairProbeShrunkTierCount } = input;
    return SOLVER_STAGE_IDS.map((id): SolverStagePlanEntry => {
        if (id === 'main-loop') return { spec: solverStageSpec(id), eligible: mainLoopEligible };
        if (id === 'repair-probe-shrink-recovery') {
            const eligible = repairProbeShrunkTierCount === undefined
                ? undefined
                : !!budgetPlan.shrinkRecoveryEnabled && repairProbeShrunkTierCount > 0;
            return { spec: solverStageSpec(id), eligible };
        }
        return { spec: solverStageSpec(id), eligible: budgetPlanEligibility(id, budgetPlan) };
    });
}
