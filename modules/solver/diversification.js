// Browser-safe hint diversification: a scoped port of scripts/hint-diversification.mjs
// for use directly inside the running game (Editor mode "Solve Options" diverse search).
//
// Runs Phase 0 (baseline) + Phase A/B (gate x first-step-direction cascade+strategy) +
// Phase C (portal-exit-direction cascade+strategy). Phase D/E (gate/goal-swap reversal)
// and Phase F/G (combined forced-first-step + forced-portal-exit) are intentionally
// excluded here — they were measured at up to several minutes per combo on heavy
// multi-portal levels in the CLI script's 150-minute default budget, which isn't a
// reasonable trade against the UI's 5/10/20/custom-minute budgets.
import { getAttemptConfigs } from './attempts.js';
import { TEMPLATE_CONFIG_KEYS } from './policy.js';
import { createState, getNeighbors } from './search-state.js';
import {
    TEMPLATE_CONFIG_KEY, PROFILE_CONFIG_KEY, FEATURE_GROUPS,
    withFeaturesDisabled, withFeatureDisabled,
} from '../../scripts/ablation-config.mjs';

const STRATEGY_FLAGS = FEATURE_GROUPS.strategy;

export function pathSignature(path) { return path.join(','); }

export function mergeUniqueHints(baseHints, extraHints) {
    const seen = new Set((baseHints || []).map(pathSignature));
    const merged = [...(baseHints || [])];
    for (const h of (extraHints || [])) {
        const sig = pathSignature(h);
        if (seen.has(sig)) continue;
        seen.add(sig);
        merged.push(h);
    }
    return merged;
}

// Mirrors applyAttemptConfigOptions' filter predicate. Needed separately because
// applyAttemptConfigOptions falls back to the unfiltered base list when every config
// is filtered out (a safety net for production solving), which would otherwise make
// the cascade loop below never terminate.
function anyConfigSurvives(level, disabledKeys) {
    const baseConfigs = getAttemptConfigs(level);
    return baseConfigs.some(c => {
        if (c.template) {
            const tKey = TEMPLATE_CONFIG_KEYS[c.template.id];
            if (tKey && disabledKeys.has(tKey)) return false;
        }
        const pKey = `PROFILE_${c.profileName}`;
        if (disabledKeys.has(pKey)) return false;
        return true;
    });
}

function enumerateDirections(solverV2, gateLevel, gateKey) {
    const prep = solverV2._prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep);
}

// Scans hints for portal jumps, returning the distinct set of portal destination keys
// actually proven reachable — forcing a direction at a destination no hint ever reaches
// would just waste budget on infeasible (gate->portal) combinations.
function findPortalExitPoints(level, hints) {
    if (level.portalMap.size === 0) return [];
    const dests = new Set();
    for (const hint of hints) {
        for (let i = 0; i < hint.length - 1; i++) {
            const portal = level.portalMap.get(hint[i]);
            if (portal && portal.dest === hint[i + 1]) dests.add(hint[i + 1]);
        }
    }
    return [...dests];
}

// Mirrors enumerateDirections, but for a portal destination instead of a gate: a fresh
// state has lastWasPortalJump=false, which would make getNeighbors think it must force
// another jump back out (since destKey is itself registered in portalMap). Force the
// flag so getNeighbors falls through to normal static-neighbor enumeration instead.
function enumeratePortalExitDirections(solverV2, level, destKey) {
    const prep = solverV2._prepLevel(level);
    const state = createState(destKey, level, prep);
    state.lastWasPortalJump = true;
    return getNeighbors(destKey, state, level, prep);
}

function makeYieldFn(isCancelled) {
    return async () => {
        await new Promise(r => setTimeout(r, 0));
        if (isCancelled()) throw new Error('SolverV2:cancelled');
    };
}

async function runCascade(solverV2, gateLevel, gateKey, direction, ctx) {
    const { attemptBudgetMs, deadlineAt, isCancelled, yieldFn, report } = ctx;
    const disabled = new Set();
    const found = [];
    while (true) {
        if (Date.now() >= deadlineAt || isCancelled()) break;
        if (disabled.size > 0 && !anyConfigSurvives(gateLevel, disabled)) break;

        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            result = await solverV2.solve(gateLevel, { timeBudgetMs: attemptBudgetMs, forcedFirstStepKey: direction, ablation: cfg, yieldFn });
        } catch (e) {
            if (e?.message !== 'SolverV2:cancelled') report.errors.push(`gate=${gateKey} dir=${direction}: ${e?.message}`);
            break;
        }
        if (!result?.ok || !result.solution) break;

        const winner = result.attempts?.find(a => a.ok);
        found.push({ path: result.solution, gateKey, direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [...disabled] });

        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) break; // safety: can't make further progress
        disabled.add(disableKey);
    }
    return found;
}

async function runStrategyPhase(solverV2, gateLevel, gateKey, direction, ctx) {
    const { attemptBudgetMs, deadlineAt, isCancelled, yieldFn, report } = ctx;
    const found = [];
    for (const flag of STRATEGY_FLAGS) {
        if (Date.now() >= deadlineAt || isCancelled()) break;
        let result;
        try {
            result = await solverV2.solve(gateLevel, { timeBudgetMs: attemptBudgetMs, forcedFirstStepKey: direction, ablation: withFeatureDisabled(flag), yieldFn });
        } catch (e) {
            if (e?.message !== 'SolverV2:cancelled') report.errors.push(`strategy=${flag} gate=${gateKey} dir=${direction}: ${e?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find(a => a.ok);
            found.push({ path: result.solution, gateKey, direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [flag] });
        }
    }
    return found;
}

// Portal-exit-direction cascade/strategy phase. Mirrors runCascade/runStrategyPhase, but
// runs on the FULL (non-gate-restricted) level — the route TO the portal stays free; only
// the move immediately after the forced portal jump is constrained via forcedPortalExitKey.
async function runPortalCascade(solverV2, level, destKey, direction, ctx) {
    const { attemptBudgetMs, deadlineAt, isCancelled, yieldFn, report } = ctx;
    const disabled = new Set();
    const found = [];
    while (true) {
        if (Date.now() >= deadlineAt || isCancelled()) break;
        if (disabled.size > 0 && !anyConfigSurvives(level, disabled)) break;

        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            result = await solverV2.solve(level, { timeBudgetMs: attemptBudgetMs, forcedPortalExitKey: { from: destKey, to: direction }, ablation: cfg, yieldFn });
        } catch (e) {
            if (e?.message !== 'SolverV2:cancelled') report.errors.push(`portalDest=${destKey} dir=${direction}: ${e?.message}`);
            break;
        }
        if (!result?.ok || !result.solution) break;

        const winner = result.attempts?.find(a => a.ok);
        found.push({ path: result.solution, portalDest: destKey, portalExitDirection: direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [...disabled] });

        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) break; // safety: can't make further progress
        disabled.add(disableKey);
    }
    return found;
}

async function runPortalStrategyPhase(solverV2, level, destKey, direction, ctx) {
    const { attemptBudgetMs, deadlineAt, isCancelled, yieldFn, report } = ctx;
    const found = [];
    for (const flag of STRATEGY_FLAGS) {
        if (Date.now() >= deadlineAt || isCancelled()) break;
        let result;
        try {
            result = await solverV2.solve(level, { timeBudgetMs: attemptBudgetMs, forcedPortalExitKey: { from: destKey, to: direction }, ablation: withFeatureDisabled(flag), yieldFn });
        } catch (e) {
            if (e?.message !== 'SolverV2:cancelled') report.errors.push(`strategy=${flag} portalDest=${destKey} dir=${direction}: ${e?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find(a => a.ok);
            found.push({ path: result.solution, portalDest: destKey, portalExitDirection: direction, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [flag] });
        }
    }
    return found;
}

/**
 * Scoped browser port of the CLI hint-diversification sweep. Runs baseline + per-gate
 * x per-first-step-direction cascade/strategy + portal-exit-direction cascade/strategy,
 * returning any solution paths not already present in `existingHints`.
 *
 * @param {object} level - solver-internal level (e.g. levelUtils.deepCloneLevel(workingLevel))
 * @param {number[][]} existingHints - paths already known for this level (not re-reported as novel)
 * @param {object} opts
 * @param {object} opts.solverV2 - SolverV2 facade instance
 * @param {number} opts.deadlineAt - Date.now()-based wall-clock deadline
 * @param {number} [opts.maxHints] - stop once this many novel hints are found
 * @param {number} [opts.attemptBudgetMs]
 * @param {number} [opts.baselineBudgetMs]
 * @param {(event: object) => void} [opts.onProgress]
 * @param {() => boolean} [opts.isCancelled]
 */
export async function runHintDiversification(level, existingHints, opts) {
    const {
        solverV2,
        deadlineAt,
        maxHints = Infinity,
        attemptBudgetMs = 4000,
        baselineBudgetMs = 8000,
        onProgress = () => {},
        isCancelled = () => false,
    } = opts;

    const loggedSigs = new Set((existingHints || []).map(pathSignature));
    const novel = [];
    const report = {
        combosTried: 0, portalCombosTried: 0,
        baselineWinner: null, novelFound: 0, errors: [],
        haltedByWallClock: false, haltedByMaxHints: false, haltedByCancel: false,
    };

    const timeLeft = () => deadlineAt - Date.now();
    const shouldStop = () => Date.now() >= deadlineAt || isCancelled() || novel.length >= maxHints;

    const yieldFn = makeYieldFn(isCancelled);
    const ctx = { attemptBudgetMs, deadlineAt, isCancelled, yieldFn, report };

    function consider(path, provenance) {
        const sig = pathSignature(path);
        if (loggedSigs.has(sig)) return;
        const v = solverV2.validateCandidatePath(level, path);
        if (!v.ok) return;
        loggedSigs.add(sig);
        novel.push(path);
        onProgress({ type: 'hint-found', path, provenance, novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) });
    }

    // Phase 0: unconstrained baseline (establishes "what wins by default").
    try {
        const base = await solverV2.solve(level, { timeBudgetMs: baselineBudgetMs, yieldFn });
        if (base?.ok && base.solution) {
            const winner = base.attempts?.find(a => a.ok);
            report.baselineWinner = winner?.profile ?? null;
            consider(base.solution, { phase: 'baseline', profile: winner?.profile ?? null, template: winner?.template ?? null });
        }
    } catch (e) {
        if (e?.message !== 'SolverV2:cancelled') report.errors.push(`baseline: ${e?.message}`);
    }

    // Phase A/B: per-gate x per-first-step-direction cascade + strategy.
    gateLoop:
    for (const gateKey of level.gateKeys) {
        if (shouldStop()) break gateLoop;
        const gateLevel = { ...level, gateKeys: [gateKey] };
        const directions = enumerateDirections(solverV2, gateLevel, gateKey);

        for (const direction of directions) {
            if (shouldStop()) break gateLoop;
            report.combosTried++;

            const cascadeResults = await runCascade(solverV2, gateLevel, gateKey, direction, ctx);
            for (const r of cascadeResults) {
                consider(r.path, { phase: 'cascade', gateKey: r.gateKey, direction: r.direction, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
            }

            if (!shouldStop() && cascadeResults.length > 0) {
                const strategyResults = await runStrategyPhase(solverV2, gateLevel, gateKey, direction, ctx);
                for (const r of strategyResults) {
                    consider(r.path, { phase: 'strategy', gateKey: r.gateKey, direction: r.direction, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }
            }

            onProgress({ type: 'combo-done', phase: 'gate-direction', combosTried: report.combosTried, novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) });
        }
    }

    onProgress({ type: 'phase-done', phase: 'gate-direction', novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) });

    // Phase C: portal-exit-direction cascade + strategy, scoped to destinations an
    // existing or newly-discovered hint already proves reachable.
    if (!shouldStop() && level.portalMap.size > 0) {
        const portalDests = findPortalExitPoints(level, [...(existingHints || []), ...novel]);

        portalLoop:
        for (const destKey of portalDests) {
            if (shouldStop()) break portalLoop;
            const directions = enumeratePortalExitDirections(solverV2, level, destKey);

            for (const direction of directions) {
                if (shouldStop()) break portalLoop;
                report.portalCombosTried++;

                const cascadeResults = await runPortalCascade(solverV2, level, destKey, direction, ctx);
                for (const r of cascadeResults) {
                    consider(r.path, { phase: 'portal-cascade', portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                }

                if (!shouldStop() && cascadeResults.length > 0) {
                    const strategyResults = await runPortalStrategyPhase(solverV2, level, destKey, direction, ctx);
                    for (const r of strategyResults) {
                        consider(r.path, { phase: 'portal-strategy', portalDest: r.portalDest, portalExitDirection: r.portalExitDirection, profile: r.profile, template: r.template, disabledFeatures: r.disabledFeatures });
                    }
                }

                onProgress({ type: 'combo-done', phase: 'portal-direction', combosTried: report.portalCombosTried, novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) });
            }
        }

        onProgress({ type: 'phase-done', phase: 'portal-direction', novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) });
    }

    report.novelFound = novel.length;
    report.haltedByWallClock = Date.now() >= deadlineAt;
    report.haltedByMaxHints = novel.length >= maxHints;
    report.haltedByCancel = isCancelled();
    return { novel, report };
}
