// Shared executor for retry tiers that rerun `mainConfigs` under forced ablation overrides.
// Repair-only, non-default admissible-order, and late-repair tiers have different execution shapes
// and remain outside this adapter.
import { withSolverStage } from './stage-policy.js';
import type { SolverStageId } from './stage-policy.js';
import { OPT_IN_FEATURES } from './ablation-config.js';
import type { AblationConfig, AttemptConfig, PrepLevel } from './types.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { Attempt } from './orchestration.js';

type YieldFn = (() => Promise<void>) | null;

/** Structural contract of orchestration's selected serial/interleaved ladder runner. */
type LadderRunner = (
    activeGates: number[], baseConfigs: AttemptConfig[], level: NormalizedLevel, prep: PrepLevel,
    timeBudgetMs: number, levelStartTime: number, yieldFn: YieldFn,
    nodeBudget: number, workBudget: number, workStart: number,
    earlyConfigNodeBudget?: number, lateConfigStart?: number,
) => Promise<{ solution: number[] | null; attempts: Attempt[]; earlyNodeBudgetReached?: boolean }>;

/** Forced flags win; other explicit settings pass through; unset opt-ins default false and all
 * other unset flags true, matching solver sparse-config semantics. */
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
    /** Canonical stage identity applied to every resulting Attempt. */
    stageId: SolverStageId;
    /** Flags this tier forces; all others pass through. */
    proxyOverrides: Readonly<Record<string, boolean>>;
    activeGates: number[];
    mainConfigs: AttemptConfig[];
    level: NormalizedLevel;
    prep: PrepLevel;
    yieldFn: YieldFn;
    /** Serial/interleaved runner already selected by orchestration. */
    runLadder: LadderRunner;
    /** Stage wall-time allocation. */
    totalBudgetMs: number;
    /** Absolute cumulative node ceiling. */
    nodeCeiling: number;
    /** Stage policy chooses shared or fresh work pool; this adapter does not infer it. */
    workBudget: number;
    workStart: number;
    /** Subdivide node ceiling into cumulative per-config staircase steps. */
    staircase: boolean;
}
export interface WholeLadderRetryTierResult {
    attempts: Attempt[];
    solution: number[] | null;
}

/** Run one forced-ablation whole-ladder retry and always restore `prep._cfg`. */
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
        // Staircase reuses lateConfigStart=0, which makes runners set this unrelated main-search tag.
        if (staircase) for (const attempt of attempts) delete attempt.mainLoopLateReserve;
        return { attempts, solution: raw.solution };
    } finally {
        prep._cfg = originalCfg;
    }
}
