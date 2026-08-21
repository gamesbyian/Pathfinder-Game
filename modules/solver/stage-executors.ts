/**
 * Canonical stage EXECUTION adapter for the "whole-ladder rerun" retry tiers — attraction-
 * diversity, dedup-near-tie-retry, connectivity-axis-exhausted-retry, and mc-neighbor-budget-retry
 * all rerun `mainConfigs` through the same runInterleavedAttempts/runGateSerialAttempts entry
 * point with one ablation flag (or flag group) forced off/on via a Proxy override, differing only
 * in which flag(s), which budget/ceiling numbers, and whether the per-config node "staircase" is
 * used. `runWholeLadderRetryTier` is that one shape, parameterized; orchestration.ts's solveLevel()
 * calls it once per tier instead of maintaining four near-identical ~25-line blocks (each of which
 * historically shipped the same Proxy-fallthrough bug independently — see
 * buildRetryTierAblationOverride's own comment).
 *
 * repair-elite-prefix-dfs-retry, admissible-order-non-default-retry, and repair-late-probe are
 * NOT this shape — they rerun `repairConfigs`/`admissibleOrderNonDefaultConfigs` via a manual
 * per-config/per-gate `runAttempt` loop, a genuinely different execution shape (no shared node
 * ceiling division across configs, explicit `prep._workCap` management) that a blind merge into
 * this adapter would obscure rather than clarify. They stay inline in orchestration.ts.
 */
import { withSolverStage } from './stage-policy.js';
import type { SolverStageId } from './stage-policy.js';
import { OPT_IN_FEATURES } from './ablation-config.js';
import type { AblationConfig, AttemptConfig, PrepLevel } from './types.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { Attempt } from './orchestration.js';

type YieldFn = (() => Promise<void>) | null;

/** Structurally matches runInterleavedAttempts/runGateSerialAttempts (orchestration.ts, both
 *  private) exactly — passed in by the caller (already selected via its own `useInterleaving`
 *  check) rather than imported directly, so this module never needs those two functions exported
 *  and orchestration.ts never needs to import this module's runtime values at its own top level
 *  (both directions would otherwise form a real circular runtime dependency). */
type LadderRunner = (
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel, prep: PrepLevel,
    timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget: number, workBudget: number, workStart: number,
    earlyConfigNodeBudget?: number, lateConfigStart?: number,
) => Promise<{ solution: number[] | null; attempts: Attempt[]; earlyNodeBudgetReached?: boolean }>;

/** Builds a retry tier's own ablation-config override: `overrides`' flags win outright (the tier's
 *  whole reason to exist — e.g. "rerun the ladder with this ONE flag forced off/on"), every other
 *  flag falls through to `originalCfg`'s own setting, and anything unset there defaults exactly
 *  like `!cfg || cfg.FLAG` reads elsewhere in this file (opt-in features default false, everything
 *  else true) — never a blind `true` fallthrough. A Proxy, not a plain spread: see
 *  ATTRACTION_DIVERSITY_BUDGET_FRACTION's own comment (orchestration.ts) for why a sparse
 *  `{ ...cfg, FLAG: false }` object silently disables every OTHER unset strategy flag under the
 *  `(!cfg || cfg.FLAG)` convention. The one canonical implementation for every retry tier that
 *  reruns the ladder under a forced flag — each previously built its own copy of this exact Proxy,
 *  and each shipped the same "falls through to a blind `true`" bug independently before being
 *  fixed together on 2026-08-20. */
export function buildRetryTierAblationOverride(originalCfg: AblationConfig | null | undefined, overrides: Readonly<Record<string, boolean>>): AblationConfig {
    return new Proxy({} as AblationConfig, {
        get(_target, prop: string | symbol) {
            if (typeof prop !== 'string') return undefined;
            if (Object.prototype.hasOwnProperty.call(overrides, prop)) return overrides[prop];
            if (originalCfg && Object.prototype.hasOwnProperty.call(originalCfg, prop)) return originalCfg[prop];
            if (OPT_IN_FEATURES.has(prop)) return false;
            return true;
        },
    });
}

export interface WholeLadderRetryTierInput {
    /** Canonical policy-stage identity every resulting Attempt is tagged with. */
    stageId: SolverStageId;
    /** Ablation flags this tier forces, overriding whatever `prep._cfg` already said — see
     *  buildRetryTierAblationOverride. Every other flag passes through unchanged. */
    proxyOverrides: Readonly<Record<string, boolean>>;
    activeGates: number[];
    mainConfigs: AttemptConfig[];
    level: NormalizedLevel;
    prep: PrepLevel;
    yieldFn: YieldFn;
    /** The runner solveLevel() already selected via its own `useInterleaving && activeGates.length
     *  > 1` check — runInterleavedAttempts or runGateSerialAttempts, structurally identical from
     *  this adapter's point of view. */
    runLadder: LadderRunner;
    /** This tier's own ms allocation (`Math.floor(timeBudgetMs * plan.xBudgetFraction)`) —
     *  resolved by the caller from stage-budget.ts's canonical fraction, not recomputed here. */
    totalBudgetMs: number;
    /** Absolute, cumulative node ceiling (stage-budget.ts's plan.xNodeCeiling) — checked directly
     *  against prep._metrics.nodesExpanded by runLadder, exactly as the main loop's own call does. */
    nodeCeiling: number;
    /** Either the OUTER (shared, already-depleting) work pool or a FRESH one sized off
     *  `totalBudgetMs` — which one is this tier's own documented policy (attraction-diversity
     *  shares the outer pool; every promoted retry tier gets a fresh one) and stays the caller's
     *  decision, not something this adapter infers. */
    workBudget: number;
    workStart: number;
    /** STRATEGY_RETRY_TIER_NODE_STAIRCASE: subdivide the node ceiling into cumulative per-config
     *  steps (entry-nodes-at-call-time, lateConfigStart=0) instead of one shared ceiling every
     *  config in the rerun competes for. mc-neighbor-budget-retry always passes true (its own
     *  fix for a measured division defect — see that tier's own call site); the other three pass
     *  the shared opt-in `retryTierStaircase` flag. */
    staircase: boolean;
}
export interface WholeLadderRetryTierResult {
    attempts: Attempt[];
    solution: number[] | null;
}

/** Runs one "rerun mainConfigs under a forced ablation override" retry tier and returns its
 *  tagged attempts/solution — orchestration.ts pushes `attempts` onto its own running list and
 *  adopts `solution` if non-null, the same two-line contract every one of these tiers already
 *  followed inline. Restores `prep._cfg` to its original value on every exit path (mirrors the
 *  four inline `try/finally` blocks this replaces). */
export async function runWholeLadderRetryTier(input: WholeLadderRetryTierInput): Promise<WholeLadderRetryTierResult> {
    const { stageId, proxyOverrides, activeGates, mainConfigs, level, prep, yieldFn, runLadder,
        totalBudgetMs, nodeCeiling, workBudget, workStart, staircase } = input;
    const originalCfg = prep._cfg;
    prep._cfg = buildRetryTierAblationOverride(originalCfg, proxyOverrides);
    try {
        const start = Date.now();
        const staircaseEntry = staircase ? (prep._metrics ? prep._metrics.nodesExpanded : 0) : undefined;
        const staircaseStart = staircase ? 0 : undefined;
        const raw = await runLadder(activeGates, mainConfigs, level, prep, totalBudgetMs, start, yieldFn,
            nodeCeiling, workBudget, workStart, staircaseEntry, staircaseStart);
        const attempts = raw.attempts.map(attempt => withSolverStage(attempt, stageId));
        // `lateConfigStart = 0` (staircase mode) makes both runners tag every attempt
        // `mainLoopLateReserve`, which here means "took a staircase step", not "belongs to the main
        // loop's own late-reserve experiment" — stripped so telemetry consumers of that field are
        // not polluted, exactly as every inline call site already did.
        if (staircase) for (const attempt of attempts) delete attempt.mainLoopLateReserve;
        return { attempts, solution: raw.solution };
    } finally {
        prep._cfg = originalCfg;
    }
}
