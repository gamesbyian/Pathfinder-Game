// Stable stage-budget facade. The allocation cascade remains in stage-budget-core.ts; this
// boundary adds one cross-cutting invariant that must agree with runWholeLadderRetryTier:
// a retry whose forced treatment is already the caller's effective configuration does not exist
// for scheduling or budget purposes. Keeping that decision here prevents a skipped executor from
// withholding main-search nodes or donating phantom additive headroom to later stages.
export * from './stage-budget-core.js';

import { GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS } from './attempts.js';
import { retryTierOverridesChangeBehavior } from './stage-executors.js';
import {
    computeStageBudgetPlan as computeStageBudgetPlanCore,
    type StageBudgetPlanInput,
} from './stage-budget-core.js';

type RetryDistinctnessRule = Readonly<{
    stageFlag: string;
    overrides: Readonly<Record<string, boolean>>;
}>;

const RETRY_DISTINCTNESS_RULES: readonly RetryDistinctnessRule[] = [
    {
        stageFlag: 'STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY',
        overrides: Object.fromEntries(
            (GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS as readonly string[]).map(flag => [flag, false]),
        ),
    },
    {
        stageFlag: 'STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION_RETRY',
        overrides: { STRATEGY_COARSE_STATE_NEAR_TIE_RETENTION: false },
    },
    {
        stageFlag: 'STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY',
        overrides: { PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false },
    },
    {
        stageFlag: 'STRATEGY_MC_NEIGHBOR_BUDGET_RETRY',
        overrides: { PRUNE_MC_NEIGHBOR_BUDGET: false },
    },
    {
        stageFlag: 'STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY',
        overrides: { SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE: true },
    },
];

/**
 * Present behavior-identical whole-ladder retries to the allocation core as disabled.
 *
 * This is intentionally a read-only Proxy rather than a copied config. Normalized ablation configs
 * may themselves be Proxies whose property reads supply default polarity; copying enumerable keys
 * would lose that behavior and reintroduce the null/sparse/default split Audit 11 already guarded.
 */
function plannerConfigWithInertRetriesDisabled(
    cfg: StageBudgetPlanInput['cfg'],
): StageBudgetPlanInput['cfg'] {
    if (!cfg) return cfg;
    const inertStageFlags = new Set<string>();
    for (const rule of RETRY_DISTINCTNESS_RULES) {
        if (!retryTierOverridesChangeBehavior(cfg, rule.overrides)) inertStageFlags.add(rule.stageFlag);
    }
    if (inertStageFlags.size === 0) return cfg;

    return new Proxy(cfg, {
        get(target, prop, receiver) {
            if (typeof prop === 'string' && inertStageFlags.has(prop)) return false;
            return Reflect.get(target, prop, receiver);
        },
    });
}

/**
 * Canonical budget-plan entry point. Executor and planner now share the exact same effective-feature
 * semantics for deciding whether a forced whole-ladder retry is a real treatment.
 */
export function computeStageBudgetPlan(input: StageBudgetPlanInput) {
    const cfg = plannerConfigWithInertRetriesDisabled(input.cfg);
    return computeStageBudgetPlanCore(cfg === input.cfg ? input : { ...input, cfg });
}
