// The static-portfolio scheduler mode: an ordered technique list sharing one cumulative work
// budget (each technique's own share additionally boundable by a flat or per-key cap), with an
// opt-in resumable-tranche residual pass for beam continuations capped mid-search. See
// SolveOpts.staticPortfolio's own doc comment (orchestration-contracts.ts) and orchestration.ts's
// header for the split this file is part of.
import { prepLevel } from './prep.js';
import { withSolverStage } from './stage-policy.js';
import { runAttempt, testAttemptDispatches } from './orchestration-run-attempt.js';
import type { BeamContinuation } from './search.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { AttemptConfig } from './types.js';
import { attemptConfigKey, normalizeAblationConfig, getActiveGates, hasAttemptError } from './orchestration-contracts.js';
import type { Attempt, SolveOpts, SolveResult } from './orchestration-contracts.js';

// Per-attempt wall-safety deadline for the static-portfolio scheduler mode: non-binding relative
// to the real allocation currency (cell.perTechniqueWorkCap/workBudget below), same role and same
// value as build-static-portfolio-plan.mjs's own ATTEMPT_BUDGET_MS constant (kept as a literal
// here, not a shared import, because modules/solver/ is browser-free core logic and must not
// depend on a scripts/ tooling file — see AGENTS.md's architecture-boundary rule).
const STATIC_PORTFOLIO_ATTEMPT_BUDGET_MS = 600_000;

/** Fixed ordered-menu/per-technique-work-cap scheduler (`docs/solver-optimization-workstreams.md`
 *  Workstream 2 item (d); design: `reports/2026-09-03-fixed-cap-portfolio-scheduler-implementation-
 *  design.md`). Promotes `technique-census-cell.mjs`'s already-tested execution semantics — an
 *  ordered technique list sharing one cumulative work budget, each technique's own share
 *  additionally bounded by an optional flat or per-key cap, early-exit on first solve — into a
 *  real `solveLevel()` entrypoint, so a static-portfolio candidate can be measured and (eventually)
 *  A/B'd through the same code path every other caller uses instead of only through a standalone
 *  research script.
 *
 *  DELIBERATELY NO AUTOMATIC FALLBACK to the production ladder, unlike
 *  `runLegacyLatencyPortfolioExperiment`: this mode exists to evaluate the static-portfolio policy
 *  on its own terms — the same thing `technique-census-cell.mjs`/`static-portfolio-confirmation.yml`
 *  already measure — not to blend it into production behavior. A caller wanting graceful
 *  degradation composes it explicitly (call this mode, then `solveLevel` with the default
 *  `schedulerMode` on failure), matching how the legacy portfolio mode's own fallback is written.
 *
 *  Work-only (no node-budget variant): this whole research line's canonical cross-technique
 *  currency is `workSpent`, not raw nodes (`docs/solver-budget-determinism.md`), so mixing in a
 *  node-budget mode here would just reintroduce the currency ambiguity that line already closed. */

export async function runStaticPortfolio(level: NormalizedLevel, opts: SolveOpts): Promise<SolveResult> {
    const staticPortfolio = opts.staticPortfolio!;
    const portfolioStart = Date.now();
    const prep = prepLevel(level);
    const workStart = prep._workMeter.units;
    if (opts.attemptSearchForTesting) testAttemptDispatches.set(prep, opts.attemptSearchForTesting);
    if (opts.connectivityRejectionObserver) prep._connectivityRejectionObserver = opts.connectivityRejectionObserver;
    if (opts.jointObligationObserver) prep._jointObligationObserver = opts.jointObligationObserver;
    prep._attemptBudgetTelemetry = true;
    const cfg = normalizeAblationConfig(opts.ablation);
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = (opts.forcedFirstStepKey != null) ? opts.forcedFirstStepKey : null;
    prep._forcedPortalExitKey = (opts.forcedPortalExitKey != null) ? opts.forcedPortalExitKey : null;

    const activeGates = getActiveGates(level, Array.isArray(level.gateKeys) ? level.gateKeys : [], cfg, prep);
    const configs = staticPortfolio.techniqueConfigs.map(config => ({ key: attemptConfigKey(config), config }));
    const attemptBudgetMs = staticPortfolio.attemptBudgetMs ?? STATIC_PORTFOLIO_ATTEMPT_BUDGET_MS;
    const workBudget = staticPortfolio.workBudget;
    // Default false/undefined: every existing caller (technique-census-cell.mjs, portfolio-solve-
    // sweep.mjs's ordinary static-portfolio mode, the closed one-shot production A/B) is
    // byte-for-byte unaffected — see this flag's own SolveOpts doc comment.
    const resumableResidualPass = !!staticPortfolio.resumableResidualPass;

    const attempts: Attempt[] = [];
    let solution: number[] | null = null;
    let winningKey: string | null = null;
    let deadlineTruncated = false;
    const spentUnits = () => prep._workMeter.units - workStart;

    // First-pass beam attempts that ended CAPPED (out.pausedContinuation set) rather than naturally
    // exhausted, in original portfolio-menu order — see this file's SolveOpts.staticPortfolio.
    // resumableResidualPass doc comment for the exact eligibility/ordering contract.
    interface EligibleContinuation { gateKey: number; key: string; config: AttemptConfig; continuation: BeamContinuation; originalCap: number; }
    const eligibleContinuations: EligibleContinuation[] = [];
    // Bounded-overshoot capture (search.ts, 2026-09-10) can spend slightly more than a first-pass
    // attempt's own nominal attemptRemaining slice before the top-of-loop check catches it (see
    // reports/2026-09-05-static-portfolio-resumable-tranche-salvage-preflight.md's measured 4.9%-
    // 9.1% overshoot at production widths). This is real work, already reflected in workSpent/
    // spentUnits() and therefore already correctly deducted from every later gate/technique's own
    // remaining-budget arithmetic below — tracked here ONLY so the caller can report it honestly
    // rather than silently describing the first pass as unchanged from the non-resumable control.
    let firstPassCaptureOvershoot = 0;

    outer:
    for (let gi = 0; gi < activeGates.length; gi++) {
        const gateKey = activeGates[gi];
        const remainingTotal = Math.max(0, workBudget - spentUnits());
        if (remainingTotal <= 0) break outer;
        const gatesLeft = activeGates.length - gi;
        const gateCeiling = spentUnits() + Math.floor(remainingTotal / gatesLeft);
        for (const { key, config } of configs) {
            if (spentUnits() >= gateCeiling) break;
            const remaining = Math.max(0, gateCeiling - spentUnits());
            const effectiveCap = staticPortfolio.perTechniqueWorkCapByKey?.[key] ?? staticPortfolio.perTechniqueWorkCap;
            const attemptRemaining = Number.isFinite(effectiveCap) ? Math.min(remaining, effectiveCap as number) : remaining;
            const attemptWorkCap = prep._workMeter.units + attemptRemaining;
            // Both caps set to the same value for the same reason technique-census-cell.mjs's own
            // header comment documents: admissible-order/IDA's hot loop only consults
            // prep._strictWorkCap, not the historical soft prep._workCap, outside this kind of
            // explicit equal-work-shaped opt-in.
            prep._workCap = attemptWorkCap;
            prep._strictWorkCap = attemptWorkCap;
            const spentBeforeAttempt = spentUnits();
            // Only beamWidth-bearing configs can ever produce a continuation (search.ts); requesting
            // capture for a non-beam config would simply be ignored by attempt-dispatch.ts, but
            // gating it here keeps intent explicit and avoids the (currently harmless) mislabeling
            // capture causes in Attempt.outcome (a captured exit reports 'budget-starved', not
            // 'timed-out' — see attempt-dispatch.ts's own out.timedOut semantics — so this file's own
            // captureOut.pausedContinuation is the only reliable eligibility signal, not r.attempt).
            const captureEligible = resumableResidualPass && !!config.beamWidth;
            const captureOut: { nodesExpanded?: number; timedOut?: boolean; pausedContinuation?: BeamContinuation } = {};
            const r = await runAttempt(gateKey, level, prep, config, attemptBudgetMs, Date.now(), opts.yieldFn ?? null, Infinity, captureEligible ? captureOut : null, 0, false, undefined, captureEligible);
            attempts.push(withSolverStage({ configKey: key, ...r.attempt }, 'static-portfolio'));
            if (r.path) { solution = r.path; winningKey = key; break outer; }
            const spentThisAttempt = spentUnits() - spentBeforeAttempt;
            if (captureOut.pausedContinuation) {
                eligibleContinuations.push({ gateKey, key, config, continuation: captureOut.pausedContinuation, originalCap: attemptRemaining });
                if (spentThisAttempt > attemptRemaining) firstPassCaptureOvershoot += spentThisAttempt - attemptRemaining;
            } else if (r.attempt.outcome === 'timed-out' && spentThisAttempt < attemptRemaining) {
                deadlineTruncated = true;
                break outer;
            }
        }
    }

    // Resumable-tranche residual pass: only if the frozen first pass ended fully unsolved (matching
    // the preflight's own "stop at the first solve as usual" rule — a mid-first-pass solve never
    // reaches here) and there is shared work left. Processes eligible continuations in the exact
    // order their first-pass attempts ran (not re-sorted by any outcome-derived priority), giving
    // each at most one additional tranche equal to its own original per-technique cap, bounded by
    // whatever of the same 67M-shaped workBudget remains — see the SolveOpts doc comment.
    let residualDispatchCount = 0;
    let residualIncrementalWork = 0;
    if (!solution && resumableResidualPass) {
        for (const elig of eligibleContinuations) {
            const remainingShared = Math.max(0, workBudget - spentUnits());
            if (remainingShared <= 0) break;
            const residualBudget = Math.min(elig.originalCap, remainingShared);
            if (residualBudget <= 0) continue;
            const resumeWorkCap = prep._workMeter.units + residualBudget;
            prep._workCap = resumeWorkCap;
            prep._strictWorkCap = resumeWorkCap;
            const spentBeforeResume = spentUnits();
            // No further captureContinuationOnBudgetExit here: "at most one additional tranche" per
            // the preflight's own design — a continuation that caps again in this residual pass is
            // simply retired, not chained into a second resume.
            const r = await runAttempt(elig.gateKey, level, prep, elig.config, attemptBudgetMs, Date.now(), opts.yieldFn ?? null, Infinity, null, 0, false, elig.continuation, false);
            residualDispatchCount++;
            residualIncrementalWork += spentUnits() - spentBeforeResume;
            attempts.push(withSolverStage({ configKey: elig.key, ...r.attempt, resumableResidualTranche: true }, 'static-portfolio'));
            if (r.path) { solution = r.path; winningKey = elig.key; break; }
        }
    }

    const workSpent = spentUnits();
    const totalMs = Date.now() - portfolioStart;
    // No referee re-validation step here, matching every other solveLevel() scheduler mode in
    // this file (the main ladder and runLegacyLatencyPortfolioExperiment both trust `!!path`
    // directly) — the search primitives' own correctness is proven in-code, not re-checked
    // defensively per solve. technique-census-cell.mjs's own referee step is a research-harness-
    // only safety net for that offline tool's own wider surface of ad hoc/adversarial configs, not
    // a normal production behavior this entrypoint should reproduce.
    const ok = !!solution;
    return {
        ok,
        status: ok ? 'success'
            : deadlineTruncated ? 'deadline-truncated'
            : hasAttemptError(attempts) ? 'attempt-error'
            : workSpent >= workBudget ? 'work-budget-reached'
            : 'exhausted',
        solution: ok ? solution : null,
        solutions: ok && solution ? [solution] : [],
        attempts,
        totalMs,
        nodesExpanded: prep._metrics.nodesExpanded,
        workSpent,
        workBudget,
        deadlineTruncated,
        schedulerMode: 'static-portfolio',
        ...(winningKey ? { staticPortfolioWinningConfigKey: winningKey } : {}),
        ...(resumableResidualPass ? { resumableResidualPass: {
            eligibleContinuationCount: eligibleContinuations.length,
            residualDispatchCount,
            residualIncrementalWork,
            firstPassCaptureOvershoot,
        } } : {}),
    };
}
