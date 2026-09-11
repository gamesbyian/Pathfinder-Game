import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    retryTierEffectiveWorkStart,
    retryTierOverridesChangeBehavior,
    runWholeLadderRetryTier,
} from './stage-executors.js';
import type { AblationConfig, PrepLevel } from './types.js';
import type { NormalizedLevel } from '../domain/types.js';

test('goal-attraction-disabled retry fresh work is default-on independent of cfg object presence', () => {
    assert.equal(retryTierEffectiveWorkStart('goal-attraction-disabled-retry', null, 10, 80), 80,
        'production null cfg must get the promoted fresh pool');
    assert.equal(retryTierEffectiveWorkStart('goal-attraction-disabled-retry', {} as AblationConfig, 10, 80), 80,
        'a sparse/non-null cfg must not change the production default');
    assert.equal(retryTierEffectiveWorkStart('goal-attraction-disabled-retry', {
        STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: true,
    }, 10, 80), 80);
    assert.equal(retryTierEffectiveWorkStart('goal-attraction-disabled-retry', {
        STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: false,
    }, 10, 80), 10,
    'only explicit false restores the historical shared pool');
    assert.equal(retryTierEffectiveWorkStart('connectivity-axis-prune-disabled-retry', null, 10, 80), 10,
        'the safety rule is scoped to the promoted goal-attraction retry mechanism');
});

test('retry treatment must actually differ from the caller configuration', () => {
    assert.equal(retryTierOverridesChangeBehavior(null, { SCORE_GOAL_ATTRACTION: false }), true);
    assert.equal(retryTierOverridesChangeBehavior({ SCORE_GOAL_ATTRACTION: false }, { SCORE_GOAL_ATTRACTION: false }), false);
    assert.equal(retryTierOverridesChangeBehavior({} as AblationConfig, { SCORE_GOAL_ATTRACTION: false }), true,
        'sparse raw config uses the production default for an unspecified default-on feature');

    assert.equal(retryTierOverridesChangeBehavior(null, { SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE: true }), true,
        'an opt-in feature defaults false under null config');
    assert.equal(retryTierOverridesChangeBehavior({ SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE: true },
        { SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE: true }), false);

    assert.equal(retryTierOverridesChangeBehavior({ SCORE_GOAL_ATTRACTION: false, PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: true },
        { SCORE_GOAL_ATTRACTION: false, PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false }), true,
        'one changed override is enough to make a multi-flag retry distinct');
});

async function capturedExecutorWorkStart(
    cfg: AblationConfig | null,
    stageId: 'goal-attraction-disabled-retry' | 'connectivity-axis-prune-disabled-retry',
): Promise<number> {
    const prep = {
        _cfg: cfg,
        _workMeter: { units: 80 },
        _metrics: { nodesExpanded: 0 },
    } as unknown as PrepLevel;
    let captured = NaN;
    const proxyOverrides: Readonly<Record<string, boolean>> = stageId === 'goal-attraction-disabled-retry'
        ? { SCORE_GOAL_ATTRACTION: false }
        : { PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false };
    await runWholeLadderRetryTier({
        stageId,
        proxyOverrides,
        activeGates: [],
        mainConfigs: [],
        level: {} as NormalizedLevel,
        prep,
        yieldFn: null,
        runLadder: async (_gates, _configs, _level, _prep, _ms, _start, _yield, _nodes, _work, workStart) => {
            captured = workStart;
            return { solution: null, attempts: [] };
        },
        totalBudgetMs: 1,
        nodeCeiling: Infinity,
        workBudget: 100,
        workStart: 10,
        staircase: false,
    });
    return captured;
}

test('whole-ladder retry executor applies the promoted default before dispatch', async () => {
    assert.equal(await capturedExecutorWorkStart(null, 'goal-attraction-disabled-retry'), 80);
    assert.equal(await capturedExecutorWorkStart({} as AblationConfig, 'goal-attraction-disabled-retry'), 80);
    assert.equal(await capturedExecutorWorkStart({
        STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: false,
    }, 'goal-attraction-disabled-retry'), 10);
    assert.equal(await capturedExecutorWorkStart(null, 'connectivity-axis-prune-disabled-retry'), 10);
});

test('whole-ladder retry executor does not dispatch a behavior-identical second pass', async () => {
    let calls = 0;
    const prep = {
        _cfg: { SCORE_GOAL_ATTRACTION: false },
        _workMeter: { units: 80 },
        _metrics: { nodesExpanded: 0 },
    } as unknown as PrepLevel;
    const result = await runWholeLadderRetryTier({
        stageId: 'goal-attraction-disabled-retry',
        proxyOverrides: { SCORE_GOAL_ATTRACTION: false },
        activeGates: [], mainConfigs: [], level: {} as NormalizedLevel, prep, yieldFn: null,
        runLadder: async () => { calls++; return { solution: null, attempts: [] }; },
        totalBudgetMs: 1, nodeCeiling: Infinity, workBudget: 100, workStart: 10, staircase: false,
    });
    assert.equal(calls, 0);
    assert.deepEqual(result, { attempts: [], solution: null });
    assert.equal(prep._cfg?.SCORE_GOAL_ATTRACTION, false, 'skipping must not mutate caller config');
});
