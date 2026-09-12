import assert from 'node:assert/strict';
import type { NormalizedLevel } from '../domain/types.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { solveLevel, attemptConfigKey } from './orchestration.js';
import type { runAttemptSearch } from './attempt-dispatch.js';
import { makeLineLevel, makeRepairGatedInfeasibleLevel } from './orchestration-test-support.js';

// schedulerMode: 'static-portfolio' (2026-09-03, docs/solver-optimization-workstreams.md
// Workstream 2 item (d) — see reports/2026-09-03-fixed-cap-portfolio-scheduler-implementation-
// design.md). These tests cover the ORCHESTRATION-level wiring (prep, runAttempt, cap fields, the
// gate loop, no-fallback behavior) through the real solveLevel() entrypoint; the underlying
// gate-share/per-technique-cap arithmetic itself is already exhaustively covered by
// scripts/technique-census-cell-node-test.mjs against the research harness this mode promotes to
// production, and is not re-derived case-by-case here.
const DEFAULT_CONFIG = { scoringProfileId: 'default', orderingBias: null };

test('static-portfolio: solves a simple level and reports the winning technique', async () => {
    const level = makeLineLevel();
    const result = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: { techniqueConfigs: [DEFAULT_CONFIG], workBudget: 1_000_000 },
    });
    assert.equal(result.ok, true);
    assert.equal(result.status, 'success');
    assert.deepEqual(result.solution, [PACK(0, 0), PACK(1, 0), PACK(2, 0)]);
    assert.equal(result.schedulerMode, 'static-portfolio');
    assert.equal(result.staticPortfolioWinningConfigKey, attemptConfigKey(DEFAULT_CONFIG));
    assert.equal(result.attempts.every(a => a.stageId === 'static-portfolio'), true);
    assert.equal(result.attempts.every(a => a.configKey === attemptConfigKey(DEFAULT_CONFIG)), true);
    assert.equal(typeof result.workSpent, 'number');
    assert.equal(result.workBudget, 1_000_000);
});

test('static-portfolio: no automatic fallback — an unsolved result carries only the listed techniques\' own attempts', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const result = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: { techniqueConfigs: [DEFAULT_CONFIG], workBudget: 50_000 },
    });
    assert.equal(result.ok, false);
    // Exactly one attempt per gate (one technique in the list, one gate on this fixture) -- proof
    // this mode never reaches for the ordinary ladder's repair/admissible-order/retry tiers the
    // way runLegacyLatencyPortfolioExperiment's own fallback deliberately does.
    assert.equal(result.attempts.length, level.gateKeys.length);
    assert.equal(result.attempts.every(a => !a.repair && !a.admissibleOrder), true);
});

test('static-portfolio: solveLevel requires opts.staticPortfolio for this schedulerMode', async () => {
    await assert.rejects(
        () => solveLevel(makeLineLevel(), { schedulerMode: 'static-portfolio' }),
        /staticPortfolio/,
    );
});

test('static-portfolio: perTechniqueWorkCap narrows each technique\'s own share without widening the gate ceiling', async () => {
    let calls = 0;
    const dispatch: typeof runAttemptSearch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        calls++;
        const prep = args[3];
        prep._workMeter.units += 20;
        return null;
    }) as typeof runAttemptSearch;
    const configB = { scoringProfileId: 'objectiveFirst', orderingBias: null };
    const result = await solveLevel(makeLineLevel(), {
        schedulerMode: 'static-portfolio',
        staticPortfolio: {
            techniqueConfigs: [DEFAULT_CONFIG, configB],
            workBudget: 100_000_000,
            perTechniqueWorkCap: 10_000_000,
        },
        attemptSearchForTesting: dispatch,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 'exhausted');
    // makeLineLevel() has exactly one gate, so this is exactly the two techniques' own attempts.
    // allocatedWorkCeiling is runAttempt's own RELATIVE remaining-share reading (prep._workCap
    // minus prep._workMeter.units at that attempt's own start) — both configs get the same
    // 10,000,000 perTechniqueWorkCap share of the gate ceiling regardless of what the earlier
    // config already spent, proving the cap narrows per technique, not once per gate.
    assert.equal(calls, 2);
    assert.equal(result.attempts[0].allocatedWorkCeiling, 10_000_000);
    assert.equal(result.attempts[1].allocatedWorkCeiling, 10_000_000);
});

test('static-portfolio: perTechniqueWorkCapByKey overrides the flat cap for one technique only', async () => {
    const calls: number[] = [];
    const dispatch: typeof runAttemptSearch = (async (...args: Parameters<typeof runAttemptSearch>) => {
        const prep = args[3];
        calls.push(prep._workCap ?? -1);
        prep._workMeter.units += 20;
        return null;
    }) as typeof runAttemptSearch;
    const configB = { scoringProfileId: 'objectiveFirst', orderingBias: null };
    await solveLevel(makeLineLevel(), {
        schedulerMode: 'static-portfolio',
        staticPortfolio: {
            techniqueConfigs: [DEFAULT_CONFIG, configB],
            workBudget: 100_000_000,
            perTechniqueWorkCap: 10_000_000,
            perTechniqueWorkCapByKey: { [attemptConfigKey(DEFAULT_CONFIG)]: 3_000_000 },
        },
        attemptSearchForTesting: dispatch,
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0], 3_000_000, 'config A has its own per-key override, not the flat cap');
    assert.equal(calls[1], 10_000_020, 'config B falls back to the flat cap, unaffected by A\'s narrower per-key cap');
});

// staticPortfolio.resumableResidualPass (2026-09-10, reports/2026-09-05-static-portfolio-resumable-
// tranche-salvage-preflight.md): a richer fixture than makeLineLevel is needed so a beam attempt can
// genuinely get CAPPED (not solve, not naturally exhaust) at a modest work budget — same shape as
// beam-resumability-pilot.test.ts's own SOLVED_LEVEL (24 steps of slack over a Manhattan distance of
// 16 forces real multi-phase beam work before it finds a solution).
function makeMultiPhaseBeamLevel() {
    return {
        grid: { w: 9, h: 9 }, requiredLength: 40, requiredIntersections: 0,
        goalKey: PACK(8, 8), gateKeys: [PACK(0, 0)], blockSet: new Set(), gooseSet: new Set(),
        falseGoalKeys: new Set(), mustPassKeys: [], mustCrossKeys: [], filterMap: new Map(),
        flippingFilterMap: new Map(), portalMap: new Map(),
    } as unknown as NormalizedLevel;
}
const BEAM_CONFIG = { scoringProfileId: 'default', orderingBias: null, beamWidth: 16 };

test('static-portfolio: resumableResidualPass left false/undefined (default) leaves existing behavior byte-for-byte unaffected', async () => {
    const level = makeMultiPhaseBeamLevel();
    const withoutFlag = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: { techniqueConfigs: [BEAM_CONFIG], workBudget: 3000 },
    });
    const explicitFalse = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: { techniqueConfigs: [BEAM_CONFIG], workBudget: 3000, resumableResidualPass: false },
    });
    assert.equal(withoutFlag.ok, false);
    assert.equal(withoutFlag.attempts.length, 1, 'no residual pass without opting in');
    assert.equal(withoutFlag.resumableResidualPass, undefined, 'no telemetry block without opting in');
    assert.deepEqual(explicitFalse.workSpent, withoutFlag.workSpent);
    assert.equal(explicitFalse.attempts.length, 1);
    assert.equal(explicitFalse.resumableResidualPass, undefined);
});

test('static-portfolio: resumableResidualPass solves via the residual tranche and reproduces an uninterrupted single-shot run\'s cumulative work exactly (no repayment)', async () => {
    const level = makeMultiPhaseBeamLevel();
    // Reference: an uninterrupted single-shot static-portfolio run with the full combined budget,
    // no cap narrower than the whole budget -- this is what "no work was repaid" must match exactly.
    const reference = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: { techniqueConfigs: [BEAM_CONFIG], workBudget: 12_000 },
    });
    assert.equal(reference.ok, true, 'sanity: the reference run must solve within the combined budget');

    const staged = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: {
            techniqueConfigs: [BEAM_CONFIG], workBudget: 12_000, perTechniqueWorkCap: 6000,
            resumableResidualPass: true,
        },
    });
    assert.equal(staged.ok, true, 'the residual tranche must reach the same solve the reference run finds');
    assert.equal(staged.workSpent, reference.workSpent, 'cumulative work must match the uninterrupted reference exactly -- no repaid work');
    assert.equal(staged.attempts.length, 2, 'first-pass capped attempt + one residual-pass resume');
    assert.equal(staged.attempts[0].outcome, 'budget-starved', 'a captured exit reports budget-starved, not timed-out -- see runStaticPortfolio\'s own captureEligible comment');
    assert.equal(staged.attempts[1].resumableResidualTranche, true);
    assert.ok(staged.resumableResidualPass);
    assert.equal(staged.resumableResidualPass!.eligibleContinuationCount, 1);
    assert.equal(staged.resumableResidualPass!.residualDispatchCount, 1);
    assert.ok(staged.resumableResidualPass!.residualIncrementalWork > 0, 'the residual pass must have done real, nonzero work');
    // Bounded-overshoot capture (search.ts) can spend a little more than perTechniqueWorkCap during
    // the first pass before the top-of-loop check catches it -- assert it's genuinely bounded
    // (a small fraction of the per-technique cap), not unbounded runaway.
    assert.ok(staged.resumableResidualPass!.firstPassCaptureOvershoot >= 0);
    assert.ok(staged.resumableResidualPass!.firstPassCaptureOvershoot < 6000 * 0.5, 'overshoot must stay a small fraction of the per-technique cap');
});

test('static-portfolio: resumableResidualPass with still-insufficient combined budget stays unsolved but dispatches the residual tranche with real incremental work', async () => {
    const level = makeMultiPhaseBeamLevel();
    const staged = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: {
            techniqueConfigs: [BEAM_CONFIG], workBudget: 6000, perTechniqueWorkCap: 3000,
            resumableResidualPass: true,
        },
    });
    assert.equal(staged.ok, false, 'sanity: this combined budget must still be short of what solving requires');
    assert.equal(staged.resumableResidualPass!.eligibleContinuationCount, 1);
    assert.equal(staged.resumableResidualPass!.residualDispatchCount, 1, 'the mechanism must still engage even though it does not end up solving');
    assert.ok(staged.resumableResidualPass!.residualIncrementalWork > 0, 'must not be a silent no-op');
    assert.ok(staged.workSpent! <= 6000 + 6000 * 0.5, 'total spend must stay close to the declared workBudget, not run away');
});

test('static-portfolio: resumableResidualPass never captures a non-beam (DFS/repair) config -- no eligible continuation, no residual dispatch', async () => {
    const level = makeRepairGatedInfeasibleLevel();
    const dfsConfig = { scoringProfileId: 'default', orderingBias: null };
    const staged = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: { techniqueConfigs: [dfsConfig], workBudget: 5000, resumableResidualPass: true },
    });
    assert.equal(staged.attempts.length, level.gateKeys.length, 'no residual attempts appended for a non-beam config');
    assert.equal(staged.resumableResidualPass!.eligibleContinuationCount, 0);
    assert.equal(staged.resumableResidualPass!.residualDispatchCount, 0);
    assert.equal(staged.resumableResidualPass!.firstPassCaptureOvershoot, 0);
});

test('static-portfolio: resumableResidualPass does not capture a beam attempt that naturally exhausts (width-1 greedy dead end)', async () => {
    // width=1 greedy beam on this same multi-phase fixture hits real dead ends and collapses to an
    // empty frontier well within budget -- natural exhaustion (timedOut: false), not a capped exit --
    // see beam-resumability-pilot.test.ts's own identical width-1 fixture note.
    const level = makeMultiPhaseBeamLevel();
    const greedyConfig = { scoringProfileId: 'default', orderingBias: null, beamWidth: 1 };
    const staged = await solveLevel(level, {
        schedulerMode: 'static-portfolio',
        staticPortfolio: { techniqueConfigs: [greedyConfig], workBudget: 10_000_000, resumableResidualPass: true },
    });
    assert.equal(staged.ok, false, 'sanity: width-1 greedy must not solve this fixture');
    assert.equal(staged.attempts.length, 1, 'natural exhaustion produces no residual attempt');
    assert.equal(staged.resumableResidualPass!.eligibleContinuationCount, 0, 'a naturally-exhausted attempt is not an eligible continuation');
    assert.equal(staged.resumableResidualPass!.residualDispatchCount, 0);
});
