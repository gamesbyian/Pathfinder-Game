// The solver's single per-(gate, attemptConfig) dispatch point: runs one search attempt via
// attempt-dispatch.ts's runAttemptSearch and assembles its Attempt telemetry record. Every
// orchestration-* scheduling module (main-search, early-repair, legacy-portfolio,
// static-portfolio) and orchestration.ts's own solveLevel route every attempt through this one
// function — see orchestration.ts's header for the split this file is part of.
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig } from './types.js';
import { SCORING_PROFILES } from './policy.js';
import { runAttemptSearch } from './attempt-dispatch.js';
import type { BeamContinuation } from './search.js';
import { repairPrimarySeed } from './repair-search.js';
import { withSolverStage } from './stage-policy.js';
import { attemptConfigKey } from './orchestration-contracts.js';
import type { Attempt, AttemptResult, YieldFn, AttemptSearchDispatch } from './orchestration-contracts.js';

// Fault injection is associated with one prepared solve, never global process state. This keeps
// concurrent solves isolated while allowing orchestration tests to deterministically fail dispatch.
export const testAttemptDispatches = new WeakMap<PrepLevel, AttemptSearchDispatch>();
function isSolverCancellation(value: unknown): boolean {
    try { return (value as { message?: unknown } | null)?.message === 'Solver:cancelled'; }
    catch { return false; }
}

// nodeBudget/nodesOut: optional, repair-only (see runEarlyRepairSearch) — a deterministic,
// machine-speed-independent cap used ONLY by the early repair probe so its win/loss decision
// depends on work done, not wall-clock luck under contention (see docs/solver-architecture.md's
// "Wall-clock-gated search probes" section). Infinity/null preserve prior ms-only behavior
// exactly for every other caller (the main ladder, the full-budget repair fallback).
//
// Exported (also added to SOLVER_TESTING_API) so offline tooling can run ONE attempt config
// against ONE gate directly, bypassing getAttemptConfigs/the probe/the fallback loop entirely —
// see scripts/method-probe.mjs. Every production caller (this file's own main loop, repair probe,
// fallback loop) is unaffected by the export; it's the same function, called the same way.
export async function runAttempt(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel,
    attemptConfig: AttemptConfig, attBudget: number, attStart: number, yieldFn: YieldFn,
    nodeBudget = Infinity, nodesOut: { nodesExpanded?: number; timedOut?: boolean; bestBadness?: number; finalBadness?: number; pausedContinuation?: BeamContinuation } | null = null,
    // Repair-only (see runEarlyRepairSearch's multi-seed retry) — additively XORed into
    // repairSearchFromGate's own gate-derived PRNG seed (repair-search.ts), so a retry round
    // samples a genuinely different randomized search trajectory over the exact same level/gate
    // instead of repeating byte-for-byte the same (possibly unlucky) run. 0 (default, every
    // caller but the retry round) is a no-op — behavior is byte-for-byte unchanged from before
    // this parameter existed. No effect on beam/DFS (they don't take a seedSalt at all).
    seedSalt = 0,
    // STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_WORK_CAP_ENFORCEMENT passthrough (see
    // attempt-dispatch.ts's runAttemptSearch, which this ultimately reaches). Default false; only
    // this file's own admissible-order-non-default-retry call site (inside its withWorkCapScope)
    // passes true, and only for that one tier — see that call site's own comment for why the
    // sibling admissible-order-fallback tier (a different call site, same shared runAttempt/
    // runAttemptSearch dispatcher) must never receive this.
    enforceAdmissibleOrderWorkCap = false,
    // Resumable-portfolio residual pass passthrough (see attempt-dispatch.ts's runAttemptSearch,
    // which this ultimately reaches). Both default undefined/false; only runStaticPortfolio's own
    // resumable-residual-pass path may pass these, for beamWidth-bearing configs only.
    beamResumeFrom?: BeamContinuation,
    captureBeamContinuationOnBudgetExit = false,
): Promise<AttemptResult> {
    const { scoringProfileId, orderingBias, beamWidth, mechanicBucketRetention, repair, repairMustTurnBiased, repairTurnBiased, admissibleOrder, admissibleOrderNoTieBreak, admissibleOrderLds } = attemptConfig;
    const profile = SCORING_PROFILES[scoringProfileId] ?? SCORING_PROFILES.default;
    // Always non-null internally so every branch below can report through the same object,
    // whether or not the caller supplied one (runEarlyRepairSearch passes its own, to also read
    // nodesExpanded back for its cross-gate node-budget accounting; ordinary callers don't).
    const searchOut = nodesOut ?? {};
    const nodesBefore = prep._metrics ? prep._metrics.nodesExpanded : 0;
    const workBefore = prep._workMeter.units;
    const allocatedWorkCeiling = prep._workCap == null
        ? null
        : Math.max(0, prep._workCap - prep._workMeter.units);
    let path: number[] | null = null;
    let attemptError: Attempt['error'] | undefined;
    try {
        const dispatch = testAttemptDispatches.get(prep) ?? runAttemptSearch;
        path = await dispatch(attemptConfig, gateKey, level, prep, profile, attBudget, attStart, yieldFn, nodeBudget, searchOut, seedSalt, enforceAdmissibleOrderWorkCap, beamResumeFrom, captureBeamContinuationOnBudgetExit);
    } catch (err) {
        if (isSolverCancellation(err)) throw err;
        const thrown = err as { name?: unknown; message?: unknown } | null;
        const bounded = (value: unknown, fallback: string, max: number) => {
            let text: string;
            try { text = typeof value === 'string' ? value : value == null ? fallback : String(value); }
            catch { text = fallback; }
            return text.slice(0, max);
        };
        const safeField = (key: 'name' | 'message') => {
            try { return thrown?.[key]; } catch { return undefined; }
        };
        attemptError = {
            name: bounded(safeField('name'), 'Error', 120),
            message: bounded(safeField('message') ?? err, 'Unknown attempt error', 500),
            gateKey,
            configKey: bounded(attemptConfigKey(attemptConfig), 'unknown', 240),
            scoringProfileId: bounded(scoringProfileId, 'unknown', 120),
            orderingBiasId: orderingBias?.id == null ? null : bounded(orderingBias.id, 'unknown', 120),
        };
    }
    const attMs = Date.now() - attStart;
    const nodesAfter = prep._metrics ? prep._metrics.nodesExpanded : 0;
    const workAfter = prep._workMeter.units;
    // A 'budget-starved' outcome below is computed purely from this pre-dispatch snapshot, not from
    // what the search actually did. For a dispatch whose search primitive doesn't consult
    // prep._workCap in its hot loop (admissibleOrderSearch is the current example -- see its own
    // comment: it checks only prep._strictWorkCap, deliberately ignoring the soft cap outside the
    // opt-in equal-work research harness), allocatedWorkCeiling can read 0 here while the search
    // still runs its full node/ms allowance regardless -- 'budget-starved' then describes the soft
    // accounting, not "no real search happened." See reports/2026-08-28-admissible-order-work-cap-
    // gap-discovery.md's 2026-09-02 resolution for the empirical trace that found this.
    const budgetStarvedAtDispatch = prep._attemptBudgetTelemetry
        && (allocatedWorkCeiling === 0 || (Number.isFinite(nodeBudget) && nodeBudget === 0));
    return {
        path,
        attempt: withSolverStage({
            gateKey,
            scoringProfileId,
            orderingBiasId: orderingBias?.id ?? null,
            beamWidth: beamWidth ?? null,
            ok: !!path,
            outcome: path ? 'success' : attemptError ? 'error' : budgetStarvedAtDispatch ? 'budget-starved'
                : searchOut.timedOut === true ? 'timed-out' : searchOut.timedOut === false ? 'exhausted' : 'budget-starved',
            ...(attemptError ? { error: attemptError } : {}),
            elapsedMs: attMs,
            allocatedBudgetMs: attBudget,
            ...(prep._attemptBudgetTelemetry ? {
                allocatedWorkCeiling,
                allocatedNodeCeiling: Number.isFinite(nodeBudget) ? nodeBudget : null,
                workSpent: workAfter - workBefore,
            } : {}),
            nodesExpanded: nodesAfter - nodesBefore,
            ...(repair && seedSalt ? { seedSalt } : {}),
            ...(repair ? { randomSeed: repairPrimarySeed(gateKey, seedSalt) } : {}),
            ...(!path && !attemptError && searchOut.timedOut !== undefined ? { timedOut: searchOut.timedOut } : {}),
            ...(!path && !attemptError && Number.isFinite(searchOut.bestBadness) ? { bestBadness: searchOut.bestBadness } : {}),
            ...(!path && !attemptError && Number.isFinite(searchOut.finalBadness) ? { finalBadness: searchOut.finalBadness } : {}),
            ...(mechanicBucketRetention ? { mechanicBucketRetention: true } : {}),
            ...(repair ? { repair: true } : {}),
            ...(repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
            ...(repairTurnBiased ? { repairTurnBiased: true } : {}),
            ...(admissibleOrder ? { admissibleOrder: true } : {}),
            ...(admissibleOrderNoTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
            ...(admissibleOrderLds ? { admissibleOrderLds: true } : {}),
        }, 'main-search'),
    };
}
