// Coverage for technique-census-cell.mjs's runCell/runCellSafe: the pre-existing node-budget mode
// (previously untested by any node-test/vitest file) and the 2026-08-28 equal-work `cell.workBudget`
// addition (see that file's own header comment and docs/solver-budget-determinism.md's "module-global
// discovery work meter"/"equal-work technique census execution" items).
//
// Stubbed tests (runAttemptForTesting) exercise the accounting logic deterministically, without a
// real wall-clock race, per docs/testing.md's "mocked deadline-path unit test" convention (mirrors
// orchestration.test.ts's attemptSearchForTesting stubs). Real-solver tests prove the wiring actually
// works against the genuine search primitives (prep._workCap), not just this file's own understanding
// of the contract.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCellRunner } from './technique-census-cell.mjs';

// A minimal stub matching runAttempt's (gateKey, level, prep, attemptConfig, attBudget, attStart,
// yieldFn, nodeBudget, nodesOut, seedSalt) signature and { path, attempt } return shape. `onCall`
// decides what each call does/returns and may mutate prep._workMeter.units / prep._metrics
// .nodesExpanded itself, exactly like the real search primitives would.
function stubRunner(onCall) {
    const calls = [];
    const runAttemptForTesting = async (gateKey, level, prep, attemptConfig, attBudget, attStart, yieldFn, nodeBudget) => {
        const call = { gateKey, attBudget, nodeBudget, workCapBefore: prep._workCap, strictWorkCapBefore: prep._strictWorkCap, workSpentBefore: prep._workMeter.units };
        calls.push(call);
        const outcome = onCall(call, prep) ?? {};
        return {
            path: outcome.path ?? null,
            attempt: { ok: !!outcome.path, outcome: outcome.outcome ?? (outcome.path ? 'success' : 'exhausted'), gateKey },
        };
    };
    return { calls, runAttemptForTesting };
}

const baseCell = {
    cellId: 'T1-0000001', tier: 'T1', corpus: 'published', levelPos: 1,
    techniqueKeys: ['dfs|score=nearClosureRescue|bias=none'], ablation: null, budgetMs: 8000,
};

test('node-budget cell (no workBudget) is unaffected by the equal-work addition', async () => {
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        // Overshoots its allocated share, same style as the work-mode overshoot test below --
        // the real published level 1 has exactly 2 gates and this cell has exactly 1 technique
        // key, so there are at most 2 calls total regardless of nodeBudget size; an overshooting
        // stub is what makes the SECOND gate's `remainingTotal <= 0` early-exit reachable here.
        prep._metrics.nodesExpanded += 10;
        return { path: null, outcome: 'exhausted' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({ ...baseCell, nodeBudget: 5 });

    // Gate 0 alone overshoots past nodeBudget=5, so gate 1 is never attempted at all (same
    // pre-existing early-exit math as before this file's work-budget addition).
    assert.equal(calls.length, 1);
    assert.equal(result.ok, false);
    assert.equal(result.status, 'node-budget-reached');
    assert.equal(result.nodesExpanded, 10);
    assert.equal(result.nodeBudget, 5);
    // No work-mode fields leak into a node-budget-only result.
    assert.equal(Object.hasOwn(result, 'workBudget'), false);
    assert.equal(Object.hasOwn(result, 'workSpent'), false);
    assert.equal(Object.hasOwn(result, 'deadlineTruncated'), false);
    // Node mode still bounds via runAttempt's own nodeBudget param, never prep._workCap.
    assert.ok(calls.every(c => c.workCapBefore === undefined));
    assert.ok(calls.every(c => c.strictWorkCapBefore === undefined));
});

test('work-budget cell caps by canonical work, not raw nodes', async () => {
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        // Simulates an attempt that costs far more WORK than NODES per call — exactly the
        // cross-technique variance workSpent exists to normalize (docs/solver-budget-
        // determinism.md's work unit: applyMove + 12*isConnected).
        prep._workMeter.units += 100;
        prep._metrics.nodesExpanded += 1;
        return { path: null, outcome: 'exhausted' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    // 150 work, 2 gates: gate0 gets floor(150/2)=75 (overshoot to 100 spent), gate1 gets the
    // remaining 50 (overshoot to 200 spent total) -- exactly 2 calls, one per gate (this cell has
    // only one technique key, so the inner config loop never gets a second shot within one gate).
    const result = await runCell({ ...baseCell, workBudget: 150 });

    assert.equal(calls.length, 2);
    assert.equal(result.ok, false);
    assert.equal(result.status, 'work-budget-reached');
    assert.equal(result.workBudget, 150);
    assert.equal(result.workSpent, 200);
    // Node count stays a diagnostic remainder in work mode -- far below what a node-budget cell of
    // the same size would have allowed, proving work (not nodes) is the bounding currency.
    assert.equal(result.nodesExpanded, 2);
    // Work mode bounds via prep._workCap and leaves runAttempt's own nodeBudget uncapped.
    assert.ok(calls.every(c => c.nodeBudget === Infinity));
    assert.equal(calls[0].workCapBefore, 75);
    assert.equal(calls[1].workCapBefore, 150);
    assert.equal(calls[0].strictWorkCapBefore, calls[0].workCapBefore,
        'equal-work cells expose the same hard cap to admissible-order/IDA as to DFS/beam/repair');
    assert.equal(calls[1].strictWorkCapBefore, calls[1].workCapBefore);
});

test('work-budget cell right-censors on a wall-safety timeout before its own share is exhausted', async () => {
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        // Barely spends anything before "timing out" -- the wall-safety net binding well short of
        // this attempt's own allocated work share, exactly like method-probe.mjs's --work-budget
        // deadlineTruncated case.
        prep._workMeter.units += 1;
        prep._metrics.nodesExpanded += 1;
        return { path: null, outcome: 'timed-out' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({ ...baseCell, workBudget: 1_000_000 });

    // The whole cell stops at the FIRST timed-out attempt (break outer) -- the second gate never
    // gets tried, unlike an ordinary exhausted/unsolved attempt which would move on.
    assert.equal(calls.length, 1);
    assert.equal(result.ok, false);
    assert.equal(result.status, 'deadline-truncated');
    assert.equal(result.deadlineTruncated, true);
    assert.equal(result.workSpent, 1);
});

test('work-budget cell reports success exactly like the node-budget mode when a solution is found', async () => {
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        prep._workMeter.units += 42;
        prep._metrics.nodesExpanded += 3;
        return { path: [1, 2, 3], outcome: 'success' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({ ...baseCell, workBudget: 1_000_000 });

    assert.equal(calls.length, 1);
    assert.equal(result.ok, false, 'refereeValid is null for a stubbed non-real path -- see the real-solver test below for a genuine referee-valid success');
    assert.equal(result.status, 'referee-invalid');
    assert.equal(result.workSpent, 42);
    assert.equal(result.winningConfigKey, 'dfs|score=nearClosureRescue|bias=none');
});

test('multi-technique cell: the first config gets the whole gate share, the second gets only the leftover', async () => {
    let step = 0;
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        step++;
        // First call (config A) spends only PART of its allocated share; the second call (config
        // B, same gate) must then be capped by the LEFTOVER of that same gate's ceiling, not a
        // fresh full share -- this is the pre-existing "whole gate to config 1, remainder to config
        // 2" behavior (unchanged by the work-budget addition), just now exercised under work.
        prep._workMeter.units += step === 1 ? 20 : 200;
        prep._metrics.nodesExpanded += 1;
        return { path: null, outcome: 'exhausted' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({
        ...baseCell, techniqueKeys: ['dfs|score=nearClosureRescue|bias=none', 'dfs|score=default|bias=none'], workBudget: 100_000_000,
    });

    // 2 gates x 2 configs = 4 calls total (nothing here ever reaches its ceiling, so both configs
    // run in both gates).
    assert.equal(calls.length, 4);
    assert.equal(calls[0].gateKey, calls[1].gateKey, 'config A then config B share gate 0');
    // Gate 0's ceiling is the whole 50,000,000-unit half-share; config A (call 1) is allocated all
    // of it, spends 20, leaving config B (call 2) capped at ceiling - 20.
    assert.equal(calls[1].workCapBefore, calls[0].workCapBefore, 'config B is capped by the SAME gate ceiling config A was, not a fresh share');
    // Never solved (every stubbed call returns path: null), so `attempts` is undefined, same as
    // any other unsolved cell -- see runCell's own `attempts: ok ? attempts : undefined`.
    assert.equal(result.ok, false);
    assert.equal(result.attempts, undefined);
});

test('cell.perTechniqueWorkCap narrows each technique\'s own share without widening the gate ceiling', async () => {
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        prep._workMeter.units += 20;
        prep._metrics.nodesExpanded += 1;
        return { path: null, outcome: 'exhausted' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({
        ...baseCell, techniqueKeys: ['dfs|score=nearClosureRescue|bias=none', 'dfs|score=default|bias=none'],
        workBudget: 100_000_000, perTechniqueWorkCap: 10_000_000,
    });

    // Same 2-gates x 2-configs shape as the sibling "multi-technique cell" test above -- nothing
    // here ever reaches either cap, so every config still gets a turn in every gate.
    assert.equal(calls.length, 4);
    // Gate 0's own ceiling would ordinarily be 50,000,000 (half the total budget across 2 gates);
    // the per-technique cap narrows config A's own share down to 10,000,000 instead of the full
    // gate ceiling -- this only ever narrows, it must never make an attempt's cap LARGER than the
    // plain gate-ceiling math the sibling test above already pins.
    assert.equal(calls[0].workCapBefore, 10_000_000);
    // Config B is capped by its OWN 10,000,000 share on top of what config A already spent (20),
    // not the full gate-ceiling leftover (which would be 49,999,980) -- proving the cap applies
    // per technique, not once per gate.
    assert.equal(calls[1].workCapBefore, 10_000_020);
    assert.equal(calls[0].strictWorkCapBefore, calls[0].workCapBefore);
    assert.equal(result.perTechniqueWorkCap, 10_000_000);
});

test('cell.perTechniqueWorkCap wider than the gate leftover never widens anything (narrower of the two always binds)', async () => {
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        prep._workMeter.units += 20;
        prep._metrics.nodesExpanded += 1;
        return { path: null, outcome: 'exhausted' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    // A per-technique cap far larger than the whole budget must reproduce the exact pre-existing
    // (no perTechniqueWorkCap) gate-ceiling math -- byte-identical to the sibling test above.
    const result = await runCell({
        ...baseCell, techniqueKeys: ['dfs|score=nearClosureRescue|bias=none', 'dfs|score=default|bias=none'],
        workBudget: 100_000_000, perTechniqueWorkCap: 1_000_000_000,
    });

    assert.equal(calls.length, 4);
    assert.equal(calls[0].workCapBefore, 50_000_000, 'gate 0 ceiling, unwidened by an oversized per-technique cap');
    assert.equal(calls[1].workCapBefore, 50_000_000, 'config B still shares the SAME gate ceiling as config A, not a fresh cap');
    assert.equal(result.perTechniqueWorkCap, 1_000_000_000);
});

test('cell.perTechniqueWorkCap: a technique right-censored at its OWN small cap hands off to the next technique, not deadlineTruncated', async () => {
    // Regression test for a real bug found empirically (reports/2026-09-02-static-portfolio-
    // construction-pilot.md): config A "times out" (right-censors) at its own small
    // perTechniqueWorkCap share while the gate ceiling still has plenty left for config B. The
    // original deadlineTruncated check compared spent-vs-gateCeiling, which was only a valid
    // wall-clock inference when a single technique could claim the WHOLE remaining share --
    // exactly the invariant perTechniqueWorkCap breaks. This must be treated as an ordinary
    // hand-off to config B, not a cell-aborting deadline problem.
    let step = 0;
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        step++;
        if (step === 1) {
            // Config A spends exactly its own 1,000 perTechniqueWorkCap share and reports
            // 'timed-out' (right-censored at its own cap), same shape a real non-terminating
            // search reports when cut off by prep._workCap without a natural exhaustion state.
            prep._workMeter.units += 1_000;
            prep._metrics.nodesExpanded += 1;
            return { path: null, outcome: 'timed-out' };
        }
        // Config B then solves with plenty of the gate's own budget still available.
        prep._workMeter.units += 50;
        prep._metrics.nodesExpanded += 1;
        return { path: [1, 2, 3], outcome: 'success' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({
        ...baseCell, techniqueKeys: ['dfs|score=nearClosureRescue|bias=none', 'dfs|score=default|bias=none'],
        workBudget: 100_000_000, perTechniqueWorkCap: 1_000,
    });

    // Config B must have been reached at all (2 calls, not 1) -- the bug made this cell abort
    // after config A's very first attempt.
    assert.equal(calls.length, 2);
    assert.equal(result.deadlineTruncated, false);
    assert.equal(result.status, 'referee-invalid', 'a stubbed non-real path is never referee-valid; the point here is deadlineTruncated staying false, not a real solve');
    assert.equal(result.winningConfigKey, 'dfs|score=default|bias=none');
});

test('a genuine wall-clock timeout well short of even a small perTechniqueWorkCap still deadlineTruncates', async () => {
    // The other half of the same discriminator: a real wall-clock problem (stops far short of ITS
    // OWN small cap, not just short of the whole gate ceiling) must still be caught.
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        prep._workMeter.units += 5; // far below the 1,000 perTechniqueWorkCap share
        prep._metrics.nodesExpanded += 1;
        return { path: null, outcome: 'timed-out' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({
        ...baseCell, techniqueKeys: ['dfs|score=nearClosureRescue|bias=none', 'dfs|score=default|bias=none'],
        workBudget: 100_000_000, perTechniqueWorkCap: 1_000,
    });

    assert.equal(calls.length, 1, 'the whole cell stops at the first genuine wall-clock timeout, same as the no-cap case');
    assert.equal(result.deadlineTruncated, true);
    assert.equal(result.status, 'deadline-truncated');
});

test('node-budget cell ignores perTechniqueWorkCap entirely (work-only field)', async () => {
    const { calls, runAttemptForTesting } = stubRunner((call, prep) => {
        prep._metrics.nodesExpanded += 10;
        return { path: null, outcome: 'exhausted' };
    });
    const { runCell } = await createCellRunner({ runAttemptForTesting });
    const result = await runCell({ ...baseCell, nodeBudget: 5, perTechniqueWorkCap: 1 });

    assert.equal(result.status, 'node-budget-reached');
    assert.equal(Object.hasOwn(result, 'perTechniqueWorkCap'), false);
    assert.ok(calls.every(c => c.workCapBefore === undefined));
});

test('real solver, generous work budget: workSpent matches the unconstrained solve exactly (no distortion)', async () => {
    const { runCell } = await createCellRunner();
    const result = await runCell({ ...baseCell, workBudget: 5_000_000 });

    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.equal(result.refereeValid, true);
    assert.equal(result.workBudget, 5_000_000);
    // A generous ceiling must not change what the real solver finds or how much it costs --
    // matches the same technique/level/gate's own unconstrained (node-budget-only) cost exactly.
    assert.equal(result.workSpent, 1884);
    assert.ok(result.workSpent < result.workBudget);
    assert.equal(result.deadlineTruncated, false);
});

test('real solver, node-budget mode (no workBudget) is completely unaffected', async () => {
    const { runCell } = await createCellRunner();
    const result = await runCell({ ...baseCell, nodeBudget: 2_000_000 });

    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.equal(result.nodesExpanded, 1049);
    assert.equal(Object.hasOwn(result, 'workBudget'), false);
    assert.equal(Object.hasOwn(result, 'workSpent'), false);
});

test('real solver, work budget too small for a losing technique: work-budget-reached, not a silent unsolved node-budget result', async () => {
    const { runCell } = await createCellRunner();
    const result = await runCell({
        cellId: 'T1-0000002', tier: 'T1', corpus: 'published', levelPos: 1,
        techniqueKeys: ['beam|score=objectiveFirst|bias=none|width=2000|retention=plain'], ablation: null, budgetMs: 8000,
        workBudget: 50_000,
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 'work-budget-reached');
    assert.equal(result.deadlineTruncated, false);
    assert.ok(result.workSpent >= 50_000, `workSpent (${result.workSpent}) should have reached the 50,000 ceiling`);
});

test('real admissible-order/IDA cell obeys the equal-work cap instead of overshooting by orders of magnitude', async () => {
    const { runCell } = await createCellRunner();
    // Use the always-present published fixture so this contract stays covered by CI's deliberately
    // sparse node-test checkout. The original EW1 failure was observed on Corpus 2, but the bug was
    // family-wide: admissible-order ignored _workCap and only consulted _strictWorkCap.
    const budget = 50_000;
    const result = await runCell({
        cellId: 'EW1-IDA-CAP', tier: 'EW1', corpus: 'published', levelPos: 1,
        techniqueKeys: ['admissible-order|tieBreak=none|lds=off'], ablation: null, budgetMs: 600_000,
        workBudget: budget,
    });

    assert.equal(result.deadlineTruncated, false);
    // Whether this tiny published fixture happens to solve before the ceiling is not the contract
    // under test. What matters is that the genuine IDA hot loop can no longer escape far beyond the
    // equal-work cap. A small discrete overshoot is expected because the loop checks in batches.
    assert.ok(result.workSpent < budget * 2,
        `IDA workSpent (${result.workSpent}) escaped far beyond the ${budget} equal-work cap`);
});

test('runCellSafe echoes workBudget on a thrown error, same as the success/failure paths', async () => {
    const { runAttemptForTesting } = stubRunner(() => { throw new Error('boom'); });
    const { runCellSafe } = await createCellRunner({ runAttemptForTesting });
    const result = await runCellSafe({ ...baseCell, workBudget: 999 });

    assert.equal(result.ok, false);
    assert.equal(result.status, 'error');
    assert.equal(result.workBudget, 999);
    assert.match(result.error, /boom/);
});
