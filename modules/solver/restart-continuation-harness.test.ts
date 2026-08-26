/** Unit tests for the equal-work restart-vs-continuation execution harness (see
 *  docs/reports/2026-08-24-restart-continuation-value-audit.md's execution-readiness gate). These
 *  are accounting tests, not solve-quality evidence: they confirm the harness actually delivers
 *  equal canonical `workSpent` envelopes and sums failed-seed work, which is the prerequisite the
 *  audit says must exist before any restart-vs-continuation A/B can be run at all. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { POLICY_PROFILES } from './policy.js';
import { prepLevel } from './prep.js';
import { runRepairRestartVsContinuation } from './restart-continuation-harness.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1); // 1-based wire coords

function makeLevel(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 3 };
    return normalizeRawLevel({
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: overrides.reqLen ?? (grid.w - 1 + grid.h - 1), reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
}

// Same construction as repair-search.test.ts's "parity-impossible" fixture: a portal-free 1x3
// corridor whose only route is 2 steps, with reqLen=1 (wrong parity) — repair can never solve it,
// so every unit of budget given to either arm is genuinely spent searching, never short-circuited
// by an early success. That is exactly the "deliberately failing fixture" the audit's acceptance
// test calls for.
function makeImpossibleLevel() {
    return makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 1 });
}

function makeSolvableLevel() {
    return makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 2 });
}

test('continuation and restart arms spend the same canonical work envelope on a failing fixture', async () => {
    const level = makeImpossibleLevel();
    const workBudget = 20_000;
    const result = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, workBudget);

    assert.equal(result.continuation.solved, false);
    assert.equal(result.restart.solved, false);

    // Up to the work meter's own check granularity (repairSearchFromGate checks the cap once per
    // restart, not per unit), neither arm may exceed the requested envelope.
    assert.ok(result.continuation.workSpent <= workBudget, `continuation overspent: ${result.continuation.workSpent} > ${workBudget}`);
    assert.ok(result.restart.workSpent <= workBudget, `restart overspent: ${result.restart.workSpent} > ${workBudget}`);

    // Both arms should actually spend close to the full envelope on a fixture that can never
    // succeed — this is the "accounting, not solves" acceptance test: an arm that stopped far
    // short of its cap would mean the cap is not the actual terminating condition.
    assert.ok(result.continuation.workSpent > workBudget * 0.5, `continuation underspent: ${result.continuation.workSpent}`);
    assert.ok(result.restart.workSpent > workBudget * 0.5, `restart underspent: ${result.restart.workSpent}`);
});

test('restart arm runs a genuinely fresh seed 1 and SUMS both seeds\' work, not just the last seed', async () => {
    const level = makeImpossibleLevel();
    const workBudget = 20_000;
    const result = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, workBudget);

    // Both seeds must actually have run (the fixture can never solve, so seed 0 cannot have
    // short-circuited the restart arm before seed 1 started).
    assert.deepEqual(result.restart.seedSalts, [0, 1]);

    // Recompute the two seeds' work independently and confirm the harness's reported total is
    // their SUM — the exact failure mode the audit warns against ("reporting only the final
    // seed") would instead report roughly half this value.
    const restartPrep = prepLevel(level);
    const half = Math.floor(workBudget / 2);
    restartPrep._workCap = half;
    const { repairSearchFromGate } = await import('./repair-search.js');
    await repairSearchFromGate(K(1, 1), level, restartPrep, POLICY_PROFILES.repair, 60_000, Date.now(), null, null, false, Infinity, null, 0);
    const seed0Work = restartPrep._workMeter.units;
    assert.ok(seed0Work > 0, 'seed 0 must have spent real work on an impossible fixture');
    restartPrep._workCap = seed0Work + Math.max(0, workBudget - seed0Work);
    await repairSearchFromGate(K(1, 1), level, restartPrep, POLICY_PROFILES.repair, 60_000, Date.now(), null, null, false, Infinity, null, 1);
    const totalWork = restartPrep._workMeter.units;

    assert.equal(result.restart.workSpent, totalWork,
        'harness-reported restart workSpent must equal the independently replayed seed0+seed1 total');
    assert.ok(result.restart.workSpent > seed0Work,
        'restart workSpent must exceed seed 0 alone — proof the second seed\'s work was actually summed in, not dropped');
});

test('restart arm skips seed 1 entirely when seed 0 already solves', async () => {
    const level = makeSolvableLevel();
    const workBudget = 20_000;
    const result = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, workBudget);

    assert.equal(result.restart.solved, true);
    assert.deepEqual(result.restart.seedSalts, [0]);
    assert.ok(result.restart.workSpent <= workBudget);
});

test('a larger work budget lets the continuation arm spend proportionally more before stopping', async () => {
    const level = makeImpossibleLevel();
    const small = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, 2_000);
    const large = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, 20_000);

    assert.ok(small.continuation.workSpent <= 2_000);
    assert.ok(large.continuation.workSpent <= 20_000);
    assert.ok(large.continuation.workSpent > small.continuation.workSpent,
        'a 10x larger canonical work envelope must actually buy more spent work on a fixture that never solves');
});
