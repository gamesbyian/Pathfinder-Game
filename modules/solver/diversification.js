// Browser-safe hint diversification: a scoped port of scripts/hint-diversification.mjs
// for use directly inside the running game (Editor mode "Solve Options" diverse search).
//
// Runs Phase 0 (baseline) + Phase A/B (gate x first-step-direction cascade+strategy) +
// Phase C (portal-exit-direction cascade+strategy). Phase D/E (gate/goal-swap reversal)
// and Phase F/G (combined forced-first-step + forced-portal-exit) are intentionally
// excluded here — they were measured at up to several minutes per combo on heavy
// multi-portal levels in the CLI script's 150-minute default budget, which isn't a
// reasonable trade against the UI's 5/10/20/custom-minute budgets.
//
// Phases A/B and C each explore their combo space (gate x direction, or portal-dest x
// exit-direction) breadth-first round-robin: every still-active combo gets one solver
// call per lap before any combo gets a second, so a search that's cut short still
// samples the full width of structural variety rather than exhausting one combo's
// cascade+strategy ablations before trying the next. Phase C only scans portal
// destinations proven reachable by `existingHints` plus this session's OWN discoveries
// so far — never assuming saved hints exist, since the diverse search is meant to work
// from nothing on a freshly authored level.
import { getAttemptConfigs } from './attempts.js';
import { TEMPLATE_CONFIG_KEYS } from './policy.js';
import { prepLevel } from './prep.js';
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

function enumerateDirections(gateLevel, gateKey) {
    const prep = prepLevel(gateLevel);
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
function enumeratePortalExitDirections(level, destKey) {
    const prep = prepLevel(level);
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

// Reads ctx.attemptBudgetMs/yieldFn/report live (not destructured once at generator
// start) so a generator paused mid-cascade across multiple runUntil() calls picks up
// that call's fresh yieldFn/isCancelled binding instead of a stale one from whenever
// this generator was first created.
async function* cascadeSteps(solverV2, target, solveOptsBase, label, ctx) {
    const disabled = new Set();
    while (true) {
        if (disabled.size > 0 && !anyConfigSurvives(target, disabled)) return;
        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            result = await solverV2.solve(target, { ...solveOptsBase, timeBudgetMs: ctx.attemptBudgetMs, ablation: cfg, yieldFn: ctx.yieldFn });
        } catch (e) {
            if (e?.message !== 'SolverV2:cancelled') ctx.report.errors.push(`${label}: ${e?.message}`);
            return;
        }
        if (!result?.ok || !result.solution) return;
        const winner = result.attempts?.find(a => a.ok);
        yield { kind: 'cascade', path: result.solution, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [...disabled] };
        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) return; // safety: can't make further progress
        disabled.add(disableKey);
    }
}

async function* strategySteps(solverV2, target, solveOptsBase, label, ctx) {
    for (const flag of STRATEGY_FLAGS) {
        let result;
        try {
            result = await solverV2.solve(target, { ...solveOptsBase, timeBudgetMs: ctx.attemptBudgetMs, ablation: withFeatureDisabled(flag), yieldFn: ctx.yieldFn });
        } catch (e) {
            if (e?.message !== 'SolverV2:cancelled') ctx.report.errors.push(`strategy=${flag} ${label}: ${e?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find(a => a.ok);
            yield { kind: 'strategy', path: result.solution, profile: winner?.profile ?? null, template: winner?.template ?? null, disabledFeatures: [flag] };
        }
    }
}

// One combo's full step sequence (cascade, then strategy iff the cascade found at
// least one solution) — consumed one `.next()` at a time by roundRobinCombos so a
// combo never monopolizes the search budget ahead of its breadth-first peers.
async function* comboSteps(solverV2, target, solveOptsBase, label, ctx) {
    let foundAny = false;
    for await (const entry of cascadeSteps(solverV2, target, solveOptsBase, label, ctx)) {
        foundAny = true;
        yield entry;
    }
    if (foundAny) yield* strategySteps(solverV2, target, solveOptsBase, label, ctx);
}

// Drives a list of combo generators breadth-first: one step per still-active combo
// per lap. Mutates `combos` in place (splicing out exhausted entries) rather than
// copying it, so a caller holding the same array reference across multiple calls
// (i.e. a resumable session) naturally continues exactly where the previous call
// left off — no separate checkpoint/resume bookkeeping needed.
// Returns true if every combo ran to exhaustion, false if it stopped early.
async function roundRobinCombos(combos, { shouldStop, onFound, onComboDone }) {
    while (combos.length > 0) {
        for (let i = 0; i < combos.length; i++) {
            if (shouldStop()) return false;
            const combo = combos[i];
            const { value, done } = await combo.gen.next();
            if (done) {
                combos.splice(i, 1);
                i--;
                onComboDone(combo.meta);
                continue;
            }
            onFound(combo.meta, value);
        }
    }
    return true;
}

/**
 * Creates a resumable diverse-hint-search session for one level. Call `runUntil()`
 * repeatedly (e.g. for an initial budget, then again later for "+5 more minutes") —
 * each call picks up exactly where the previous one stopped: in-progress combos keep
 * their cascade/strategy state, completed combos are never revisited, and phases
 * (baseline -> gate-direction -> portal-direction -> done) only advance forward.
 *
 * @param {object} level - solver-internal level (e.g. levelUtils.deepCloneLevel(workingLevel))
 * @param {number[][]} existingHints - paths already known for this level (not re-reported as novel)
 * @param {object} opts
 * @param {object} opts.solverV2 - SolverV2 facade instance
 * @param {number} [opts.attemptBudgetMs]
 * @param {number} [opts.baselineBudgetMs]
 */
export function createDiversificationSession(level, existingHints, opts) {
    const { solverV2, attemptBudgetMs = 4000, baselineBudgetMs = 8000 } = opts;

    const loggedSigs = new Set((existingHints || []).map(pathSignature));
    const novel = [];
    const report = {
        combosTried: 0, portalCombosTried: 0,
        baselineWinner: null, novelFound: 0, errors: [],
        haltedByWallClock: false, haltedByMaxHints: false, haltedByCancel: false,
    };

    let phase = 'baseline'; // 'baseline' -> 'gate-direction' -> 'portal-direction' -> 'done'
    let gateCombos = null;
    let portalCombos = null;
    const ctx = { attemptBudgetMs, yieldFn: null, report };

    function buildResult(getDeadline, isCancelled, maxHints) {
        report.novelFound = novel.length;
        report.haltedByWallClock = Date.now() >= getDeadline();
        report.haltedByMaxHints = novel.length >= maxHints;
        report.haltedByCancel = isCancelled();
        return { novel: novel.slice(), report: { ...report, errors: [...report.errors] }, isComplete: phase === 'done' };
    }

    /**
     * @param {() => number} getDeadline - read live so an in-progress run can be
     *   extended (e.g. a "+1 minute" button) by mutating the closure value it reads.
     * @param {object} [runOpts]
     * @param {number} [runOpts.maxHints]
     * @param {(event: object) => void} [runOpts.onProgress]
     * @param {() => boolean} [runOpts.isCancelled]
     */
    async function runUntil(getDeadline, runOpts = {}) {
        const { maxHints = Infinity, onProgress = () => {}, isCancelled = () => false } = runOpts;
        ctx.yieldFn = makeYieldFn(isCancelled);
        const shouldStop = () => Date.now() >= getDeadline() || isCancelled() || novel.length >= maxHints;
        const timeLeft = () => getDeadline() - Date.now();

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
        if (phase === 'baseline') {
            if (!shouldStop()) {
                try {
                    const base = await solverV2.solve(level, { timeBudgetMs: baselineBudgetMs, yieldFn: ctx.yieldFn });
                    if (base?.ok && base.solution) {
                        const winner = base.attempts?.find(a => a.ok);
                        report.baselineWinner = winner?.profile ?? null;
                        consider(base.solution, { phase: 'baseline', profile: winner?.profile ?? null, template: winner?.template ?? null });
                    }
                } catch (e) {
                    if (e?.message !== 'SolverV2:cancelled') report.errors.push(`baseline: ${e?.message}`);
                }
            }
            phase = 'gate-direction';
        }

        // Phase A/B: per-gate x per-first-step-direction cascade + strategy, breadth-first.
        if (phase === 'gate-direction') {
            if (shouldStop()) return buildResult(getDeadline, isCancelled, maxHints);
            if (gateCombos === null) {
                gateCombos = [];
                for (const gateKey of level.gateKeys) {
                    const gateLevel = { ...level, gateKeys: [gateKey] };
                    const directions = enumerateDirections(gateLevel, gateKey);
                    for (const direction of directions) {
                        report.combosTried++;
                        gateCombos.push({
                            meta: { gateKey, direction },
                            gen: comboSteps(solverV2, gateLevel, { forcedFirstStepKey: direction }, `gate=${gateKey} dir=${direction}`, ctx),
                        });
                    }
                }
            }
            const completed = await roundRobinCombos(gateCombos, {
                shouldStop,
                onFound: (meta, entry) => consider(entry.path, {
                    phase: entry.kind, gateKey: meta.gateKey, direction: meta.direction,
                    profile: entry.profile, template: entry.template, disabledFeatures: entry.disabledFeatures,
                }),
                onComboDone: () => onProgress({ type: 'combo-done', phase: 'gate-direction', combosTried: report.combosTried, novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) }),
            });
            if (!completed) return buildResult(getDeadline, isCancelled, maxHints);
            onProgress({ type: 'phase-done', phase: 'gate-direction', novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) });
            phase = 'portal-direction';
        }

        // Phase C: portal-exit-direction cascade + strategy, scoped to destinations
        // proven reachable by existingHints + this session's OWN discoveries so far
        // (gate-direction phase above always runs to completion or budget-exhaustion
        // before this phase starts, so a freshly authored level with no existingHints
        // still seeds this phase from its own Phase 0/A/B finds).
        if (phase === 'portal-direction') {
            if (shouldStop()) return buildResult(getDeadline, isCancelled, maxHints);
            if (portalCombos === null) {
                portalCombos = [];
                if (level.portalMap.size > 0) {
                    const portalDests = findPortalExitPoints(level, [...(existingHints || []), ...novel]);
                    for (const destKey of portalDests) {
                        const directions = enumeratePortalExitDirections(level, destKey);
                        for (const direction of directions) {
                            report.portalCombosTried++;
                            portalCombos.push({
                                meta: { destKey, direction },
                                gen: comboSteps(solverV2, level, { forcedPortalExitKey: { from: destKey, to: direction } }, `portalDest=${destKey} dir=${direction}`, ctx),
                            });
                        }
                    }
                }
            }
            const completed = await roundRobinCombos(portalCombos, {
                shouldStop,
                onFound: (meta, entry) => consider(entry.path, {
                    phase: entry.kind === 'cascade' ? 'portal-cascade' : 'portal-strategy',
                    portalDest: meta.destKey, portalExitDirection: meta.direction,
                    profile: entry.profile, template: entry.template, disabledFeatures: entry.disabledFeatures,
                }),
                onComboDone: () => onProgress({ type: 'combo-done', phase: 'portal-direction', combosTried: report.portalCombosTried, novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) }),
            });
            if (!completed) return buildResult(getDeadline, isCancelled, maxHints);
            onProgress({ type: 'phase-done', phase: 'portal-direction', novelCount: novel.length, timeRemainingMs: Math.max(0, timeLeft()) });
            phase = 'done';
        }

        return buildResult(getDeadline, isCancelled, maxHints);
    }

    return {
        runUntil,
        get isComplete() { return phase === 'done'; },
    };
}
