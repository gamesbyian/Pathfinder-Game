import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { NormalizedLevel } from '../domain/types.js';
import { PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { buildRetryTierAblationOverride, runWholeLadderRetryTier } from './stage-executors.js';
import type { Attempt } from './orchestration.js';
import { OPT_IN_FEATURES } from './ablation-config.js';

function makeLineLevel(): NormalizedLevel {
    return {
        grid: { w: 3, h: 1 },
        gateKeys: [PACK(0, 0)],
        goalKey: PACK(2, 0),
        reqLen: 2,
        reqInt: 0,
        blockSet: new Set(),
        portalMap: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        requiredItems: [],
        allowedExitDirs: null,
    } as unknown as NormalizedLevel;
}

test('buildRetryTierAblationOverride: override flags win, originalCfg falls through, opt-in defaults false, everything else defaults true', () => {
    const cfg = buildRetryTierAblationOverride({ STRATEGY_GATE_INTERLEAVING: false, SOME_OTHER_FLAG: true }, { TARGET_FLAG: false });
    assert.equal(cfg.TARGET_FLAG, false, 'override wins even if originalCfg set it differently');
    assert.equal(cfg.STRATEGY_GATE_INTERLEAVING, false, 'originalCfg setting passes through untouched');
    assert.equal(cfg.SOME_OTHER_FLAG, true, 'originalCfg setting passes through untouched');
    const [anOptInFeature] = OPT_IN_FEATURES;
    assert.equal(cfg[anOptInFeature], false, 'an opt-in feature not named by override/originalCfg defaults false, never a blind true');
    assert.equal(cfg.STRATEGY_MIN_BUDGET_FLOOR, true, 'a standard (non-opt-in) flag not named by override/originalCfg defaults true');
});

test('buildRetryTierAblationOverride: null/undefined originalCfg is a no-op fallback, not a crash', () => {
    assert.equal(buildRetryTierAblationOverride(null, { A: true }).A, true);
    assert.equal(buildRetryTierAblationOverride(undefined, { A: true }).A, true);
    assert.equal(buildRetryTierAblationOverride(null, { A: true }).STRATEGY_MIN_BUDGET_FLOOR, true);
});

function fakeAttempt(extra: Partial<Attempt> = {}): Attempt {
    return {
        stageId: 'main-loop', gateKey: 1, profile: 'default', template: null, beamWidth: null,
        ok: false, elapsedMs: 1, allocatedBudgetMs: 1, outcome: 'exhausted', ...extra,
    } as Attempt;
}

test('runWholeLadderRetryTier: installs the Proxy override as prep._cfg during the call and restores the original on success', async () => {
    const prep = prepLevel(makeLineLevel());
    const originalCfg = { EXISTING_FLAG: true };
    prep._cfg = originalCfg;
    let cfgDuringCall: unknown;
    const result = await runWholeLadderRetryTier({
        stageId: 'dedup-near-tie-retry', proxyOverrides: { STRATEGY_DEDUP_NEAR_TIE_RETENTION: false },
        activeGates: [1], mainConfigs: [], level: makeLineLevel(), prep, yieldFn: null,
        runLadder: async () => {
            cfgDuringCall = prep._cfg;
            return { solution: null, attempts: [fakeAttempt()] };
        },
        totalBudgetMs: 1000, nodeCeiling: 100, workBudget: 100, workStart: 0, staircase: false,
    });
    assert.notEqual(cfgDuringCall, originalCfg, 'prep._cfg must be swapped to the override during the call');
    assert.equal((cfgDuringCall as Record<string, unknown>).STRATEGY_DEDUP_NEAR_TIE_RETENTION, false);
    assert.equal((cfgDuringCall as Record<string, unknown>).EXISTING_FLAG, true, 'originalCfg still falls through while overridden');
    assert.equal(prep._cfg, originalCfg, 'prep._cfg must be restored to the ORIGINAL object after the call');
    assert.equal(result.attempts[0].stageId, 'dedup-near-tie-retry');
});

test('runWholeLadderRetryTier: restores prep._cfg even when runLadder throws', async () => {
    const prep = prepLevel(makeLineLevel());
    const originalCfg = null;
    prep._cfg = originalCfg;
    await assert.rejects(runWholeLadderRetryTier({
        stageId: 'attraction-diversity', proxyOverrides: {},
        activeGates: [1], mainConfigs: [], level: makeLineLevel(), prep, yieldFn: null,
        runLadder: async () => { throw new Error('boom'); },
        totalBudgetMs: 1000, nodeCeiling: 100, workBudget: 100, workStart: 0, staircase: false,
    }), /boom/);
    assert.equal(prep._cfg, originalCfg, 'prep._cfg must still be restored after a thrown error');
});

test('runWholeLadderRetryTier: every returned attempt is tagged with the canonical stageId', async () => {
    const prep = prepLevel(makeLineLevel());
    const result = await runWholeLadderRetryTier({
        stageId: 'connectivity-axis-exhausted-retry', proxyOverrides: { PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false },
        activeGates: [1], mainConfigs: [], level: makeLineLevel(), prep, yieldFn: null,
        runLadder: async () => ({ solution: [1, 2, 3], attempts: [fakeAttempt(), fakeAttempt({ ok: true, outcome: 'success' })] }),
        totalBudgetMs: 1000, nodeCeiling: 100, workBudget: 100, workStart: 0, staircase: false,
    });
    assert.equal(result.attempts.length, 2);
    assert.ok(result.attempts.every(attempt => attempt.stageId === 'connectivity-axis-exhausted-retry'));
    assert.deepEqual(result.solution, [1, 2, 3]);
});

test('runWholeLadderRetryTier: staircase=true passes cumulative entry/0 to runLadder and strips mainLoopLateReserve; staircase=false passes undefined/undefined and keeps it', async () => {
    const prep = prepLevel(makeLineLevel());
    prep._metrics = { nodesExpanded: 4242 };
    let seenArgs: unknown[] = [];
    const staircaseOn = await runWholeLadderRetryTier({
        stageId: 'mc-neighbor-budget-retry', proxyOverrides: { PRUNE_MC_NEIGHBOR_BUDGET: false },
        activeGates: [1], mainConfigs: [], level: makeLineLevel(), prep, yieldFn: null,
        runLadder: async (...args) => { seenArgs = args; return { solution: null, attempts: [fakeAttempt({ mainLoopLateReserve: true })] }; },
        totalBudgetMs: 1000, nodeCeiling: 100, workBudget: 100, workStart: 0, staircase: true,
    });
    // Positional args: (activeGates, baseConfigs, level, prep, timeBudgetMs, levelStartTime, yieldFn,
    // nodeBudget, workBudget, workStart, earlyConfigNodeBudget, lateConfigStart) — indices 10/11.
    assert.equal(seenArgs[10], 4242, 'earlyConfigNodeBudget must be the cumulative node count AT CALL TIME');
    assert.equal(seenArgs[11], 0, 'lateConfigStart must be 0 (every config becomes a staircase step)');
    assert.equal(staircaseOn.attempts[0].mainLoopLateReserve, undefined, 'staircase mode strips the borrowed mainLoopLateReserve tag');

    const staircaseOff = await runWholeLadderRetryTier({
        stageId: 'dedup-near-tie-retry', proxyOverrides: { STRATEGY_DEDUP_NEAR_TIE_RETENTION: false },
        activeGates: [1], mainConfigs: [], level: makeLineLevel(), prep, yieldFn: null,
        runLadder: async (...args) => { seenArgs = args; return { solution: null, attempts: [fakeAttempt({ mainLoopLateReserve: true })] }; },
        totalBudgetMs: 1000, nodeCeiling: 100, workBudget: 100, workStart: 0, staircase: false,
    });
    assert.equal(seenArgs[10], undefined, 'staircase off: earlyConfigNodeBudget must stay undefined (runner defaults to plain nodeBudget)');
    assert.equal(seenArgs[11], undefined, 'staircase off: lateConfigStart must stay undefined (runner defaults to baseConfigs.length)');
    assert.equal(staircaseOff.attempts[0].mainLoopLateReserve, true, 'staircase off: an incidental mainLoopLateReserve tag from the runner is left alone');
});
