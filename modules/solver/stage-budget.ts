// Stable stage-budget facade. The allocation cascade remains in stage-budget-core.ts; this
// boundary owns two cross-cutting invariants before that calibrated cascade runs:
// 1. null and sparse ablation configs mean the same production defaults; and
// 2. a retry whose forced treatment is already the caller's effective configuration does not exist
//    for scheduling or budget purposes.
// Keeping both decisions here prevents read-polarity drift inside the large allocation cascade and
// prevents skipped executors from withholding main-search nodes or donating phantom additive
// headroom to later stages.
export * from './stage-budget-core.js';

import { GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS } from './attempts.js';
import { defaultConfig } from './ablation-config.js';
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
 * Canonical config representation for budget planning.
 *
 * `solveLevel` deliberately retains null as the production fast-path representation while any
 * caller-supplied sparse ablation object is normalized to a Proxy whose missing feature reads yield
 * registry defaults. The old budget cascade contained a mixture of `!cfg || cfg.FLAG` and
 * `cfg && cfg.FLAG === true` reads, so a newly-promoted default-on flag could make those two
 * equivalent caller representations allocate different ceilings. Present the planner with explicit
 * registry defaults when cfg is null; sparse normalized Proxies already expose the same semantics.
 */
function canonicalBudgetConfig(cfg: StageBudgetPlanInput['cfg']): NonNullable<StageBudgetPlanInput['cfg']> {
    return cfg ?? defaultConfig();
}

/**
 * Present behavior-identical whole-ladder retries to the allocation core as disabled.
 *
 * This is intentionally a read-only Proxy rather than a copied config. Normalized ablation configs
 * may themselves be Proxies whose property reads supply default polarity; copying enumerable keys
 * would lose that behavior and reintroduce the null/sparse/default split this boundary guards.
 */
function plannerConfigWithInertRetriesDisabled(
    cfg: NonNullable<StageBudgetPlanInput['cfg']>,
): NonNullable<StageBudgetPlanInput['cfg']> {
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
 * Canonical budget-plan entry point. Executor and planner share effective-feature semantics for
 * retry distinctness, and the allocation core always sees one explicit production-default polarity.
 */
export function computeStageBudgetPlan(input: StageBudgetPlanInput) {
    const cfg = plannerConfigWithInertRetriesDisabled(canonicalBudgetConfig(input.cfg));
    return computeStageBudgetPlanCore({ ...input, cfg });
}
