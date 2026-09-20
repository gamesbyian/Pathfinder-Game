import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { PACK } from './encoding.js';
import { solveLevel } from './orchestration.js';
import { makeLineLevel } from './orchestration-test-support.js';

function portalLevel() {
    const level = makeLineLevel();
    level.grid.h = 2;
    level.portalMap = new Map([[PACK(0, 1), { dest: PACK(2, 1) }], [PACK(2, 1), { dest: PACK(0, 1) }]]);
    return level;
}

// Promoted to production default-ON 2026-09-16 (docs/solver-opt-in-experiment-ledger.md): the
// frozen 113-row class-4 allocation population reproduced 86 referee-valid gains / 0 losses with
// every non-target stage's reach/attempts/nodesExpanded byte-identical between arms (structural
// proof the dead-last placement cannot regress earlier stages) and net LOWER aggregate workSpent
// despite the extra solves. Both flags default-ON together: the shell alone (treatment off) is
// pure wasted work with zero benefit, exactly what this test's own "control" case below spends
// real budget demonstrating, so there is no meaningful standalone default between fully off and
// fully on. Explicit ablation overrides (rather than an implicit "no override" baseline) now
// exercise the off/control/treatment states so the assertions read the same regardless of the
// current production default polarity.
test('Class-4 promotion conversion-fidelity contract matches ordinary production callers', () => {
    assert.equal(OPT_IN_FEATURES.has('STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY'), false,
        'promoted retry shell must remain production default-on');
    assert.equal(OPT_IN_FEATURES.has('STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT'), false,
        'promoted treatment selector must remain production default-on');

    const solverController = readFileSync(new URL('../input/solver-controller.ts', import.meta.url), 'utf8');
    const reviewController = readFileSync(new URL('../input/review-controller.ts', import.meta.url), 'utf8');
    assert.ok(solverController.includes(
        'solverApi.solveLevel(level, { timeBudgetMs: budgetMs, yieldFn, disableExtraBudgetPasses: true })'),
    'ordinary solver-controller solveLevel call must continue to exercise production defaults');
    assert.ok(reviewController.includes(
        'solverApi.solveLevel(solveLevel, { timeBudgetMs: budgetMs, yieldFn, disableExtraBudgetPasses: true })'),
    'ordinary review-controller solveLevel call must continue to exercise production defaults');
});

test('Class-4 retry is portal-only, default-on, true-final, and enables merge only inside its fresh dispatch', async () => {
    const seen = [] as Array<{ merge: unknown; nodes: number; workCap: number | undefined; work: number }>;
    const dispatch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const prep = args[3];
        seen.push({ merge: prep._cfg?.STRATEGY_PORTAL_COARSE_STATE_MERGE, nodes: prep._metrics?.nodesExpanded ?? 0, workCap: prep._workCap, work: prep._workMeter.units });
        if (prep._cfg?.STRATEGY_PORTAL_COARSE_STATE_MERGE === true) return [PACK(0, 0), PACK(1, 0)];
        return null;
    }) as typeof runAttemptSearch;
    const options = {
        timeBudgetMs: 1_000, nodeBudget: Infinity, baseWorkBudget: 67_000_000,
        disableExtraBudgetPasses: true, attemptBudgetTelemetry: true, lifecycleTelemetry: true,
        attemptSearchForTesting: dispatch,
    } as const;
    const off = await solveLevel(portalLevel(), { ...options, ablation: {
        STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: false,
        STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT: false,
    } });
    assert.equal(off.attempts.some(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry'), false);
    const control = await solveLevel(portalLevel(), { ...options, ablation: {
        STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: true,
        STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT: false,
    } });
    assert.ok(control.attempts.some(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry'), 'control arm executes the funded shell');
    assert.equal(seen.at(-1)?.merge, false, 'control retry keeps portal coarse-state merge disabled');
    const beforeTreatment = seen.length;
    // No ablation override at all (the shape every real production caller uses --
    // modules/input/solver-controller.ts/review-controller.ts never pass `ablation`): this is now
    // the production default and must reach the retry with the merge treatment active, exactly
    // like the explicit-true case below. This exercises both read sites' `!cfg ||` fallback
    // (orchestration.ts's stage-plan eligibility and orchestration-additive-retry-tiers.ts's gate
    // + proxy override), not just OPT_IN_FEATURES membership -- normalizeAblationConfig(undefined)
    // returns `cfg = null` rather than a Proxy, so a bare `cfg?.FLAG === true` read would have
    // silently stayed off for this exact case despite the promotion.
    const on = await solveLevel(portalLevel(), options);
    const retry = on.attempts.filter(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry');
    assert.ok(retry.length > 0, JSON.stringify({ status: on.status, attempts: on.attempts.map(a => a.stageId), seen }));
    assert.equal(on.attempts.at(-1)?.stageId, 'portal-coarse-state-merge-dead-last-retry');
    assert.equal(seen.slice(beforeTreatment, -1).some(call => call.merge === true), false, 'earlier dispatches retain control configuration');
    const treatmentCall = seen.at(-1)!;
    assert.equal(treatmentCall.merge, true);
    assert.ok((treatmentCall.workCap ?? 0) > treatmentCall.work, 'retry enters with fresh work');
    assert.equal((on.stageLifecycle?.['portal-coarse-state-merge-dead-last-retry'] as { reached?: boolean } | undefined)?.reached, true);

    const nonPortal = await solveLevel(makeLineLevel(), options);
    assert.equal(nonPortal.attempts.some(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry'), false);
});
