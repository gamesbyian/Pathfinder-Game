// The legacy-latency-portfolio-experiment scheduler mode: a fixed pass1/pass2/pass3 (+ optional
// feature-gated conditional passes) portfolio over a shared attempt-config list, falling back to
// the ordinary production solveLevel() ladder when no pass solves. Falling back through
// solveLevel (orchestration.ts) makes this module and orchestration.ts mutually referential — safe
// under ESM because solveLevel is only ever called from inside this async function's body, well
// after both modules finish loading. See orchestration.ts's header for the split this file is
// part of.
import { LEGACY_LATENCY_PORTFOLIO_EXPERIMENT } from './legacy-latency-portfolio-experiment.js';
import { getConfiguredAttemptConfigs } from './attempts.js';
import { prepLevel } from './prep.js';
import { withSolverStage } from './stage-policy.js';
import { runAttempt, testAttemptDispatches } from './orchestration-run-attempt.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { PrepLevel, AttemptConfig } from './types.js';
import { attemptConfigKey, normalizeAblationConfig, getActiveGates, hasAttemptError } from './orchestration-contracts.js';
import type { Attempt, AttemptResult, SolveOpts, SolveResult, YieldFn, LegacyLatencyPortfolioExperimentDefinition } from './orchestration-contracts.js';
import { solveLevel } from './orchestration.js';

function legacyLatencyPortfolioFeatureSummary(level: NormalizedLevel): Record<string, number> {
    return {
        requiredIntersections: level.requiredIntersections ?? 0,
        mustPass: level.mustPassKeys?.length ?? 0,
        mustCross: level.mustCrossKeys?.length ?? 0,
        mustTurn: level.mustPassTurnDirs?.size ?? 0,
        portals: level.portalMap?.size ?? 0,
        flippingFilters: level.flippingFilterMap?.size ?? 0,
    };
}

function legacyLatencyPortfolioFeatureGateMatches(level: NormalizedLevel, gate: NonNullable<LegacyLatencyPortfolioExperimentDefinition['conditionalPasses']>[number]['when']): boolean {
    const f = legacyLatencyPortfolioFeatureSummary(level);
    return (gate.minReqInt == null || f.requiredIntersections >= gate.minReqInt)
        && (gate.minMustPass == null || f.mustPass >= gate.minMustPass)
        && (gate.minMustCross == null || f.mustCross >= gate.minMustCross)
        && (gate.minMustTurn == null || f.mustTurn >= gate.minMustTurn)
        && (gate.minPortals == null || f.portals >= gate.minPortals)
        && (gate.minFlippingFilters == null || f.flippingFilters >= gate.minFlippingFilters);
}

async function runAttemptSlice(
    gateKey: number, level: NormalizedLevel, prep: PrepLevel, attemptConfig: AttemptConfig,
    capMs: number, yieldFn: YieldFn, metadata: Pick<Attempt, 'passNumber' | 'restart' | 'schedulerPhase'> = {},
): Promise<AttemptResult> {
    const result = await runAttempt(gateKey, level, prep, attemptConfig, capMs, Date.now(), yieldFn);
    result.attempt.configKey = attemptConfigKey(attemptConfig);
    Object.assign(result.attempt, metadata);
    if (metadata.schedulerPhase === 'legacy-latency-portfolio') Object.assign(result.attempt, withSolverStage(result.attempt, 'legacy-latency-portfolio-pass'));
    return result;
}

export async function runLegacyLatencyPortfolioExperiment(
    level: NormalizedLevel, opts: SolveOpts, timeBudgetMs: number, yieldFn: YieldFn,
): Promise<SolveResult> {
    const experiment = opts.legacyLatencyPortfolioExperiment ?? opts.portfolioExperiment ?? LEGACY_LATENCY_PORTFOLIO_EXPERIMENT;
    const portfolioStart = Date.now();
    const prepStart = Date.now();
    const prep = prepLevel(level);
    if (opts.attemptSearchForTesting) testAttemptDispatches.set(prep, opts.attemptSearchForTesting);
    if (opts.connectivityRejectionObserver) prep._connectivityRejectionObserver = opts.connectivityRejectionObserver;
    if (opts.jointObligationObserver) prep._jointObligationObserver = opts.jointObligationObserver;
    const prepMs = Date.now() - prepStart;
    const cfg = normalizeAblationConfig(opts.ablation);
    prep._cfg = cfg;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = (opts.forcedFirstStepKey != null) ? opts.forcedFirstStepKey : null;
    prep._forcedPortalExitKey = (opts.forcedPortalExitKey != null) ? opts.forcedPortalExitKey : null;

    const baseConfigs = getConfiguredAttemptConfigs(level, cfg);
    const activeGates = getActiveGates(level, Array.isArray(level.gateKeys) ? level.gateKeys : [], cfg, prep);
    const attempts: Attempt[] = [];
    const seen = new Map<string, Attempt>();
    let repeatedAttemptElapsedMs = 0;
    let repeatedPrefixNodeUpperBound = 0;

    const runPass = async (passNumber: number, capMs: number, allow: ((key: string) => boolean)): Promise<number[] | null> => {
        for (const attemptConfig of baseConfigs) {
            const configKey = attemptConfigKey(attemptConfig);
            if (!allow(configKey)) continue;
            for (const gateKey of activeGates) {
                const sliceKey = `${configKey}#${gateKey}`;
                const previous = seen.get(sliceKey);
                const result = await runAttemptSlice(gateKey, level, prep, attemptConfig, capMs, yieldFn, {
                    passNumber,
                    restart: !!previous,
                    schedulerPhase: 'legacy-latency-portfolio',
                });
                if (previous) {
                    repeatedAttemptElapsedMs += previous.elapsedMs;
                    repeatedPrefixNodeUpperBound += previous.nodesExpanded ?? 0;
                }
                seen.set(sliceKey, result.attempt);
                attempts.push(result.attempt);
                if (result.path) return result.path;
            }
        }
        return null;
    };

    let solution = await runPass(1, experiment.pass1Ms, () => true);
    if (!solution) solution = await runPass(2, experiment.pass2Ms, key => experiment.pass2Configs.has(key));
    if (!solution) solution = await runPass(3, experiment.pass3Ms, key => experiment.pass3Configs.has(key));
    if (!solution && experiment.conditionalPasses) {
        for (const conditionalPass of experiment.conditionalPasses) {
            if (!legacyLatencyPortfolioFeatureGateMatches(level, conditionalPass.when)) continue;
            solution = await runPass(conditionalPass.passNumber, conditionalPass.capMs, key => conditionalPass.configs.has(key));
            if (solution) break;
        }
    }

    const portfolioAttemptSearchMs = () => attempts.reduce((sum, attempt) => sum + attempt.elapsedMs, 0);
    const portfolioRuntimeBreakdown = (totalMs: number, fallbackSearchMs = 0) => ({
        prepMs,
        portfolioAttemptSearchMs: portfolioAttemptSearchMs(),
        schedulerOverheadMs: Math.max(0, totalMs - prepMs - portfolioAttemptSearchMs() - fallbackSearchMs),
        fallbackSearchMs,
        totalMs,
    });

    if (solution) {
        const totalMs = Date.now() - portfolioStart;
        return {
            ok: true,
            status: 'success',
            solution,
            solutions: [solution],
            attempts,
            totalMs,
            nodesExpanded: prep._metrics.nodesExpanded,
            schedulerMode: 'legacy-latency-portfolio-experiment',
            legacyLatencyPortfolioExperiment: { solvedBeforeFallback: true, fallbackAttemptCount: 0, repeatedAttemptElapsedMs, repeatedPrefixNodeUpperBound, runtimeBreakdown: portfolioRuntimeBreakdown(totalMs) },
        };
    }

    const fallback = await solveLevel(level, { ...opts, schedulerMode: 'production', timeBudgetMs });
    const fallbackAttempts = fallback.attempts.map(attempt => ({ ...attempt, schedulerPhase: 'fallback' as const }));
    const combinedAttempts = [...attempts, ...fallbackAttempts];
    const totalMs = Date.now() - portfolioStart;
    return {
        ...fallback,
        // The fallback owns the usual budget/deadline status, except that an error in an earlier
        // portfolio pass still makes an unsuccessful combined solve indeterminate.
        status: !fallback.ok && hasAttemptError(combinedAttempts) ? 'attempt-error' : fallback.status,
        attempts: combinedAttempts,
        totalMs,
        nodesExpanded: prep._metrics.nodesExpanded + fallback.nodesExpanded,
        schedulerMode: 'legacy-latency-portfolio-experiment',
        legacyLatencyPortfolioExperiment: {
            solvedBeforeFallback: false,
            fallbackAttemptCount: fallback.attempts.length,
            repeatedAttemptElapsedMs,
            repeatedPrefixNodeUpperBound,
            runtimeBreakdown: portfolioRuntimeBreakdown(totalMs, fallback.totalMs),
        },
    };
}
