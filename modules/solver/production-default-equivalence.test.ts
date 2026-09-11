import assert from 'node:assert/strict';
import { test } from 'vitest';
import { solveLevel } from './orchestration.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import { PACK } from './encoding.js';
import type { NormalizedLevel } from '../domain/types.js';

function level(overrides: Partial<NormalizedLevel> = {}): NormalizedLevel {
    return {
        grid: { w: 7, h: 7 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(6, 6),
        requiredLength: 30,
        requiredIntersections: 2,
        blockSet: new Set(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        requiredItems: [],
        allowedExitDirs: null,
        ...overrides,
    } as unknown as NormalizedLevel;
}

/**
 * Fast deterministic stand-in for search: every dispatched technique naturally exhausts after a
 * tiny fixed amount of node/work activity. This lets the real scheduler walk every eligible stage
 * without spending corpus-scale compute, while still making shared-vs-fresh work-pool differences
 * observable in subsequent allocation telemetry.
 */
const exhaustingDispatch = async (...args: Parameters<typeof runAttemptSearch>): Promise<number[] | null> => {
    const prep = args[3];
    const out = args[9];
    prep._workMeter.units += 17;
    if (prep._metrics) prep._metrics.nodesExpanded += 3;
    if (out) {
        out.nodesExpanded = 3;
        out.timedOut = false;
    }
    return null;
};

function trace(result: Awaited<ReturnType<typeof solveLevel>>) {
    return {
        status: result.status,
        attempts: result.attempts.map(a => ({
            stageId: a.stageId,
            scoringProfileId: a.scoringProfileId,
            orderingBiasId: a.orderingBiasId,
            beamWidth: a.beamWidth,
            mechanicBucketRetention: a.mechanicBucketRetention ?? false,
            repair: a.repair ?? false,
            repairMustTurnBiased: a.repairMustTurnBiased ?? false,
            repairTurnBiased: a.repairTurnBiased ?? false,
            admissibleOrder: a.admissibleOrder ?? false,
            admissibleOrderNoTieBreak: a.admissibleOrderNoTieBreak ?? false,
            allocatedWorkCeiling: a.allocatedWorkCeiling ?? null,
            allocatedNodeCeiling: a.allocatedNodeCeiling ?? null,
            outcome: a.outcome,
        })),
        stageLifecycle: result.stageLifecycle,
    };
}

async function run(candidate: NormalizedLevel, ablation: null | Record<string, never>) {
    return solveLevel(candidate, {
        timeBudgetMs: 600_000,
        nodeBudget: 1_000_000,
        baseWorkBudget: 1_000_000,
        lifecycleTelemetry: true,
        ablation,
        attemptSearchForTesting: exhaustingDispatch,
    });
}

for (const [name, candidate] of [
    ['non-repair routing', level()],
    ['repair-gated routing', level({
        mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
        mustCrossKeys: [PACK(4, 2), PACK(4, 4)],
    } as Partial<NormalizedLevel>)],
] as const) {
    test(`production defaults do not depend on ablation object presence: ${name}`, async () => {
        const nullCfg = await run(candidate, null);
        const emptyCfg = await run(candidate, {});
        assert.deepEqual(trace(emptyCfg), trace(nullCfg),
            'ablation: null and ablation: {} must mean the same production defaults throughout routing, scheduling, and allocation');
    });
}
