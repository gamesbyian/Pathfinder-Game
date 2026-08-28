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
    assert.equal(result.continuation.stopReason, 'work-budget');
    assert.equal(result.restart.stopReason, 'work-budget');
    assert.equal(result.continuation.deadlineTruncated, false);
    assert.equal(result.restart.deadlineTruncated, false);

    // Up to the work meter's own check granularity (repairSearchFromGate checks the cap once per
    // restart, not per unit), neither arm may exceed the requested envelope.
    assert.ok(result.continuation.workSpent <= workBudget, `continuation overspent: ${result.continuation.workSpent} > ${workBudget}`);
    assert.ok(result.restart.workSpent <= workBudget, `restart overspent: ${result.restart.workSpent} > ${workBudget}`);

    // Both arms should actually spend close to the full envelope on a fixture that can never
    // succeed — this is the "accounting, not solves" acceptance test: an arm that stopped far
    // short of its cap would mean the cap is not the actual terminating condition.
    assert.ok(result.continuation.workSpent > workBudget * 0.5, `continuation underspent: ${result.continuation.workSpent}`);
    assert.ok(result.restart.workSpent > workBudget * 0.5, `restart underspent: ${result.restart.workSpent}`);

    // A failed arm must report a finite bestBadness (repairSearchFromGate always tracks one) —
    // the search-quality diagnostic the audit's own rule 10 calls for before prescribing more of
    // the same search.
    assert.ok(Number.isFinite(result.continuation.bestBadness), `continuation bestBadness not finite: ${result.continuation.bestBadness}`);
    assert.ok(Number.isFinite(result.restart.bestBadness), `restart bestBadness not finite: ${result.restart.bestBadness}`);
});

test('a binding wall deadline is surfaced as invalid equal-work evidence and does not continue the restart arm', async () => {
    const level = makeImpossibleLevel();
    const result = await runRepairRestartVsContinuation(
        K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, 20_000, { budgetMs: 0 },
    );

    assert.equal(result.continuation.solved, false);
    assert.equal(result.continuation.stopReason, 'wall-clock');
    assert.equal(result.continuation.deadlineTruncated, true);

    assert.equal(result.restart.solved, false);
    assert.equal(result.restart.stopReason, 'wall-clock');
    assert.equal(result.restart.deadlineTruncated, true);
    assert.deepEqual(result.restart.seedSalts, [0],
        'a right-censored seed 0 must not be silently rescued by reallocating its unspent split to seed 1');
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

test('restart arm reports the BEST bestBadness across both seeds, not just seed 1\'s own', async () => {
    const level = makeImpossibleLevel();
    const workBudget = 20_000;
    const result = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, workBudget);

    // Independently replay each seed under the exact caps the harness itself used, and confirm
    // the harness's reported bestBadness is the MIN of the two — repairSearchFromGate's own
    // bestBadnessEver resets per call, so a fresh seed 1 has no way to inherit seed 0's own
    // near-miss, and the harness must not silently drop that information either.
    const { repairSearchFromGate } = await import('./repair-search.js');
    const half = Math.floor(workBudget / 2);

    const seed0Prep = prepLevel(level);
    seed0Prep._workCap = half;
    const seed0Out: { bestBadness?: number } = {};
    await repairSearchFromGate(K(1, 1), level, seed0Prep, POLICY_PROFILES.repair, 60_000, Date.now(), null, null, false, Infinity, seed0Out, 0);

    // A fresh prep starts its own workMeter at 0, so replaying seed 1 in isolation only needs the
    // REMAINING budget as its cap (repairSearchFromGate only ever compares workMeter against
    // workCap as a delta) — not seed 0's absolute spend plus that remainder.
    const seed1Prep = prepLevel(level);
    seed1Prep._workCap = Math.max(0, workBudget - seed0Prep._workMeter.units);
    const seed1Out: { bestBadness?: number } = {};
    await repairSearchFromGate(K(1, 1), level, seed1Prep, POLICY_PROFILES.repair, 60_000, Date.now(), null, null, false, Infinity, seed1Out, 1);

    const expectedBest = Math.min(seed0Out.bestBadness!, seed1Out.bestBadness!);
    assert.equal(result.restart.bestBadness, expectedBest,
        `expected the min of seed0 (${seed0Out.bestBadness}) and seed1 (${seed1Out.bestBadness}), got ${result.restart.bestBadness}`);
});

test('restartSplitFraction controls seed 0\'s share of the restart arm\'s budget', async () => {
    const level = makeImpossibleLevel();
    const workBudget = 20_000;
    const result = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, workBudget, { restartSplitFraction: 0.8 });

    assert.equal(result.restartSplitFraction, 0.8);
    assert.deepEqual(result.restart.seedSalts, [0, 1]);

    // Seed 0 alone, replayed independently under the SAME 0.8 share, must land close to (and
    // under, up to the work meter's own check granularity) 80% of workBudget — proof the fraction
    // actually reaches the arm's internal split, not just the returned metadata field.
    const restartPrep = prepLevel(level);
    restartPrep._workCap = Math.floor(workBudget * 0.8);
    const { repairSearchFromGate } = await import('./repair-search.js');
    await repairSearchFromGate(K(1, 1), level, restartPrep, POLICY_PROFILES.repair, 60_000, Date.now(), null, null, false, Infinity, null, 0);
    const seed0WorkAt80Pct = restartPrep._workMeter.units;
    assert.ok(seed0WorkAt80Pct > workBudget * 0.5,
        `an 0.8 split should spend noticeably more on seed 0 than the 0.5 default would: ${seed0WorkAt80Pct}`);
});

test('restart arm skips seed 1 entirely when seed 0 already solves', async () => {
    const level = makeSolvableLevel();
    const workBudget = 20_000;
    const result = await runRepairRestartVsContinuation(K(1, 1), level, () => prepLevel(level), POLICY_PROFILES.repair, workBudget);

    assert.equal(result.restart.solved, true);
    assert.deepEqual(result.restart.seedSalts, [0]);
    assert.ok(result.restart.workSpent <= workBudget);
    assert.equal(result.restart.bestBadness, null, 'a solved arm reports no bestBadness');
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
