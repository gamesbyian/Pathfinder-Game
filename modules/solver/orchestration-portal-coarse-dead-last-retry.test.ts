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

test('Class-4 retry is portal-only, default-off, true-final, and enables merge only inside its fresh dispatch', async () => {
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
    const off = await solveLevel(portalLevel(), options);
    assert.equal(off.attempts.some(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry'), false);
    const control = await solveLevel(portalLevel(), { ...options, ablation: { STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: true } });
    assert.ok(control.attempts.some(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry'), 'control arm executes the funded shell');
    assert.equal(seen.at(-1)?.merge, false, 'control retry keeps portal coarse-state merge disabled');
    const beforeTreatment = seen.length;
    const on = await solveLevel(portalLevel(), { ...options, ablation: {
        STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: true,
        STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT: true,
    } });
    const retry = on.attempts.filter(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry');
    assert.ok(retry.length > 0, JSON.stringify({ status: on.status, attempts: on.attempts.map(a => a.stageId), seen }));
    assert.equal(on.attempts.at(-1)?.stageId, 'portal-coarse-state-merge-dead-last-retry');
    assert.equal(seen.slice(beforeTreatment, -1).some(call => call.merge === true), false, 'earlier dispatches retain control configuration');
    const treatmentCall = seen.at(-1)!;
    assert.equal(treatmentCall.merge, true);
    assert.ok((treatmentCall.workCap ?? 0) > treatmentCall.work, 'retry enters with fresh work');
    assert.equal((on.stageLifecycle?.['portal-coarse-state-merge-dead-last-retry'] as { reached?: boolean } | undefined)?.reached, true);

    const nonPortal = await solveLevel(makeLineLevel(), { ...options, ablation: { STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: true } });
    assert.equal(nonPortal.attempts.some(a => a.stageId === 'portal-coarse-state-merge-dead-last-retry'), false);
});
