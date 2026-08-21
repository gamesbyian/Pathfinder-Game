/**
 * Assembles one canonical SolverStagePlan for a solve: every policy-level SOLVER_STAGE_IDS entry
 * (stage-policy.ts) paired with whether it is eligible to run, read from computeStageBudgetPlan's
 * output (stage-budget.ts) — the same booleans orchestration.ts's real dispatch gates on and its
 * `finish()` lifecycle telemetry reports. This is the "what stages exist, in what order, why is
 * each eligible, what budget policy/executor does each use" answer the module doc points to,
 * without reading orchestration.ts's own dispatch code.
 *
 * `main-loop` has no budget-fraction gate of its own (it is THE primary ladder, not an extra
 * pass), so its eligibility is passed in directly rather than read off the plan. `prime` and the
 * `portfolio-*` stages are driven by a different call path (opts.primeAttempt / runPortfolioExperiment)
 * and are reported not-applicable here rather than guessed at.
 */
import { SOLVER_STAGE_IDS, solverStageSpec } from './stage-policy.js';
import type { SolverStageId, SolverStageSpec } from './stage-policy.js';
import type { StageBudgetPlan } from './stage-budget.js';

export interface SolverStagePlanEntry {
    spec: SolverStageSpec;
    /** Whether this stage is eligible to run for the current solve — `undefined` for a stage this
     *  plan does not cover (driven by a different call path; see this module's own doc). */
    eligible: boolean | undefined;
}
export type SolverStagePlan = SolverStagePlanEntry[];

export interface SolverStagePlanInput {
    budgetPlan: StageBudgetPlan;
    /** Whether the main loop has at least one configured attempt to run — see
     *  orchestration.ts's `hasMainConfig`. */
    mainLoopEligible: boolean;
    /** Only known once the repair probe has run and reported which biased tiers it shrank — see
     *  orchestration.ts's `shrunkBiasedTiers`. Omitted (before the probe runs, or for a caller
     *  that only wants the pre-probe plan) reports this stage's eligibility as `undefined`. */
    repairProbeShrunkTierCount?: number;
}

/** Stages driven by computeStageBudgetPlan's node-reserve cascade, in the plan field that reports
 *  each one's eligibility — the SAME field orchestration.ts's dispatch/telemetry read. */
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
