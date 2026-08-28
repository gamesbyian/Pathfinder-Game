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
import { workMeter } from './work-meter.js';
import { TEMPLATE_CONFIG_KEYS } from './policy.js';
import { prepLevel } from './prep.js';
import { createState, getNeighbors } from './search-state.js';
import { deriveSolveAttemptInfo } from './hint-provenance.js';
import {
    TEMPLATE_CONFIG_KEY, PROFILE_CONFIG_KEY, FEATURE_GROUPS,
    withFeaturesDisabled, withFeatureDisabled,
} from './ablation-config.js';

const STRATEGY_FLAGS = FEATURE_GROUPS.strategy;

export function pathSignature(path: number[]): string { return path.join(','); }

export function mergeUniqueHints(baseHints: any[], extraHints: any[]): any[] {
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

/** Count of distinct known solutions for a level = deduped union of its saved hints and any found
 *  this session. Drives the Edit/Review "Hints (N)" button count. */
export function knownHintCount(baseHints: any[], extraHints: any[]): number {
    return mergeUniqueHints(baseHints, extraHints).length;
}

/** Label for the Edit/Review Hints button: "Hints (N)" when solutions are known, else "Hints". */
export function hintButtonLabel(count: number): string {
    return count > 0 ? `Hints (${count})` : 'Hints';
}

// Mirrors applyAttemptConfigOptions' filter predicate. Needed separately because
// applyAttemptConfigOptions falls back to the unfiltered base list when every config
// is filtered out (a safety net for production solving), which would otherwise make
// the cascade loop below never terminate.
function anyConfigSurvives(level: any, disabledKeys: Set<string>): boolean {
    const baseConfigs = getAttemptConfigs(level);
    return baseConfigs.some(c => {
        if (c.template && c.template.id) {
            const tKey = TEMPLATE_CONFIG_KEYS[c.template.id];
            if (tKey && disabledKeys.has(tKey)) return false;
        }
        const pKey = `PROFILE_${c.profileName}`;
        if (disabledKeys.has(pKey)) return false;
        return true;
    });
}

function enumerateDirections(gateLevel: any, gateKey: number): number[] {
    const prep = prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep);
}

// Scans hints for portal jumps, returning the distinct set of portal destination keys
// actually proven reachable — forcing a direction at a destination no hint ever reaches
// would just waste budget on infeasible (gate->portal) combinations.
function findPortalExitPoints(level: any, hints: number[][]): number[] {
    if (level.portalMap.size === 0) return [];
    const dests = new Set<number>();
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
function enumeratePortalExitDirections(level: any, destKey: number): number[] {
    const prep = prepLevel(level);
    const state = createState(destKey, level, prep);
    state.lastWasPortalJump = true;
    return getNeighbors(destKey, state, level, prep);
}

function makeYieldFn(isCancelled: () => boolean): () => Promise<void> {
    return async () => {
        await new Promise(r => setTimeout(r, 0));
        if (isCancelled()) throw new Error('Solver:cancelled');
    };
}

// Reads ctx.attemptBudgetMs/yieldFn/report live (not destructured once at generator
// start) so a generator paused mid-cascade across multiple runUntil() calls picks up
// that call's fresh yieldFn/isCancelled binding instead of a stale one from whenever
// this generator was first created.
async function* cascadeSteps(solverApi: any, target: any, solveOptsBase: any, label: string, ctx: any) {
    const disabled = new Set<string>();
    while (true) {
        if (disabled.size > 0 && !anyConfigSurvives(target, disabled)) return;
        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            // disableExtraBudgetPasses: this cascade repeatedly re-solves under a tight
            // ctx.attemptBudgetMs specifically to isolate the effect of disabling ONE MORE narrow
            // STRATEGY_/PROFILE_ flag per round -- an unrelated last-resort search tier (repair
            // fallback / attraction-diversity / admissible-order-search) adding its own extra
            // budget on top would both blow the round's timing and muddy which flag actually
            // caused a given round's win/loss. Mirrors hint-ablation-generator.ts's runCascade
            // (this is a browser-safe port of the same CLI tool); the unconstrained baseline solve
            // (createDiversificationSession's own phase 0) deliberately does NOT set this.
            result = await solverApi.solve(target, { ...solveOptsBase, timeBudgetMs: ctx.attemptBudgetMs, ablation: cfg, disableExtraBudgetPasses: true, yieldFn: ctx.yieldFn });
        } catch (e) {
            if ((e as any)?.message !== 'Solver:cancelled') ctx.report.errors.push(`${label}: ${(e as any)?.message}`);
            return;
        }
        if (!result?.ok || !result.solution) return;
        const winner = result.attempts?.find((a: any) => a.ok);
        const attemptInfo = deriveSolveAttemptInfo(result.attempts);
        yield {
            kind: 'cascade',
            path: result.solution,
            profile: winner?.profile ?? null,
            template: winner?.template ?? null,
            disabledFeatures: [...disabled],
            beamWidth: attemptInfo.beamWidth,
            diverseBeam: attemptInfo.diverseBeam,
            attemptIndex: attemptInfo.attemptIndex,
            nodesExpanded: attemptInfo.nodesExpanded,
            elapsedMs: attemptInfo.elapsedMs,
            randomSeed: attemptInfo.randomSeed,
            seedSalt: attemptInfo.seedSalt,
        };
        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) return; // safety: can't make further progress
        disabled.add(disableKey);
    }
}

async function* strategySteps(solverApi: any, target: any, solveOptsBase: any, label: string, ctx: any) {
    for (const flag of STRATEGY_FLAGS) {
        let result;
        try {
            // disableExtraBudgetPasses: same reasoning as cascadeSteps's identical option -- one
            // flag's isolated effect per call, not muddied by an unrelated last-resort tier's own
            // extra budget.
            result = await solverApi.solve(target, { ...solveOptsBase, timeBudgetMs: ctx.attemptBudgetMs, ablation: withFeatureDisabled(flag), disableExtraBudgetPasses: true, yieldFn: ctx.yieldFn });
        } catch (e) {
            if ((e as any)?.message !== 'Solver:cancelled') ctx.report.errors.push(`strategy=${flag} ${label}: ${(e as any)?.message}`);
            continue;
        }
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find((a: any) => a.ok);
            const attemptInfo = deriveSolveAttemptInfo(result.attempts);
            yield {
                kind: 'strategy',
                path: result.solution,
                profile: winner?.profile ?? null,
                template: winner?.template ?? null,
                disabledFeatures: [flag],
                beamWidth: attemptInfo.beamWidth,
                diverseBeam: attemptInfo.diverseBeam,
                attemptIndex: attemptInfo.attemptIndex,
                nodesExpanded: attemptInfo.nodesExpanded,
                elapsedMs: attemptInfo.elapsedMs,
                randomSeed: attemptInfo.randomSeed,
                seedSalt: attemptInfo.seedSalt,
            };
        }
    }
}

// One combo's full step sequence (cascade, then strategy iff the cascade found at
// least one solution) — consumed one `.next()` at a time by roundRobinCombos so a
// combo never monopolizes the search budget ahead of its breadth-first peers.
async function* comboSteps(solverApi: any, target: any, solveOptsBase: any, label: string, ctx: any) {
    let foundAny = false;
    for await (const entry of cascadeSteps(solverApi, target, solveOptsBase, label, ctx)) {
        foundAny = true;
        yield entry;
    }
    if (foundAny) yield* strategySteps(solverApi, target, solveOptsBase, label, ctx);
}

// Drives a list of combo generators breadth-first: one step per still-active combo
// per lap. Mutates `combos` in place (splicing out exhausted entries) rather than
// copying it, so a caller holding the same array reference across multiple calls
// (i.e. a resumable session) naturally continues exactly where the previous call
// left off — no separate checkpoint/resume bookkeeping needed.
// Returns true if every combo ran to exhaustion, false if it stopped early.
async function roundRobinCombos(
    combos: any[],
    { shouldStop, onFound, onComboDone }: { shouldStop: () => boolean, onFound: (meta: any, value: any) => void, onComboDone: (meta: any) => void },
): Promise<boolean> {
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
 * @param level - solver-internal level (e.g. levelUtils.deepCloneLevel(workingLevel))
 * @param existingHints - paths already known for this level (not re-reported as novel)
 * @param opts - { solverApi, attemptBudgetMs?, baselineBudgetMs? }
 */
export function createDiversificationSession(level: any, existingHints: number[][], opts: any) {
    const { solverApi, attemptBudgetMs = 4000, baselineBudgetMs = 8000 } = opts;

    const loggedSigs = new Set((existingHints || []).map(pathSignature));
    const novel: number[][] = [];
    // Independent (re)discoveries of a path that was ALREADY in `existingHints` — see
    // VarietyResult.rediscovered (variety-search.ts) for the same pattern/rationale.
    const rediscovered: { path: number[]; provenance: any }[] = [];
    const report: any = {
        combosTried: 0, portalCombosTried: 0,
        baselineWinner: null, novelFound: 0, errors: [],
        haltedByWorkBudget: false,
        // Persisted compatibility alias; the stop condition is work, not Date.now().
        haltedByWallClock: false,
        haltedByMaxHints: false, haltedByCancel: false,
    };

    let phase = 'baseline'; // 'baseline' -> 'gate-direction' -> 'portal-direction' -> 'done'
    let gateCombos: any[] | null = null;
    let portalCombos: any[] | null = null;
    const ctx: any = { attemptBudgetMs, yieldFn: null, report };

    function buildResult(getWorkCeiling: () => number, isCancelled: () => boolean, maxHints: number) {
        report.novelFound = novel.length;
        report.haltedByWorkBudget = workMeter.units >= getWorkCeiling();
        // Compatibility alias for older UI/report consumers.
        report.haltedByWallClock = report.haltedByWorkBudget;
        report.haltedByMaxHints = novel.length >= maxHints;
        report.haltedByCancel = isCancelled();
        return {
            novel: novel.slice(),
            rediscovered: rediscovered.slice(),
            report: { ...report, errors: [...report.errors] },
            isComplete: phase === 'done',
        };
    }

    /**
     * @param getWorkCeiling - an absolute `workMeter.units` ceiling, read live so an in-progress
     *   run can still be extended (e.g. a "+1 minute" button) by mutating the closure value it
     *   reads. WORK rather than a Date.now() deadline because this bound decides how far the
     *   cascade gets and therefore WHICH HINTS ARE FOUND — gating that on wall clock made the
     *   discovered set, and the provenance corpus built from it, a function of host speed.
     *   See work-meter.ts and docs/solver-budget-determinism.md.
     */
    async function runUntil(
        getWorkCeiling: () => number,
        runOpts: { maxHints?: number, onProgress?: (event: object) => void, isCancelled?: () => boolean } = {},
    ) {
        const { maxHints = Infinity, onProgress = () => {}, isCancelled = () => false } = runOpts;
        ctx.yieldFn = makeYieldFn(isCancelled);
        const shouldStop = () => workMeter.units >= getWorkCeiling() || isCancelled() || novel.length >= maxHints;
        const workLeft = () => getWorkCeiling() - workMeter.units;

        function consider(path: number[], provenance: any) {
            const sig = pathSignature(path);
            if (loggedSigs.has(sig)) { rediscovered.push({ path, provenance }); return; }
            const v = solverApi.validateCandidatePath(level, path);
            if (!v.ok) return;
            loggedSigs.add(sig);
            novel.push(path);
            onProgress({ type: 'hint-found', path, provenance, novelCount: novel.length, workRemaining: Math.max(0, workLeft()) });
        }

        // Phase 0: unconstrained baseline (establishes "what wins by default").
        if (phase === 'baseline') {
            if (!shouldStop()) {
                try {
                    const base = await solverApi.solve(level, { timeBudgetMs: baselineBudgetMs, yieldFn: ctx.yieldFn });
                    if (base?.ok && base.solution) {
                        const winner = base.attempts?.find((a: any) => a.ok);
                        report.baselineWinner = winner?.profile ?? null;
                        // The phase suffix (not a separate admissibleOrder field -- see
                        // hint-ablation-generator.ts's matching baseline-phase fix for why an earlier
                        // version of this using such a field was silently dropped before persisting)
                        // is what makes an admissible-order-search win distinguishable from an
                        // ordinary default-profile DFS/beam win: both would otherwise report the
                        // identical profile: 'default' with no way to tell them apart downstream.
                        const phase = winner?.admissibleOrder ? 'baseline-admissible-order' : 'baseline';
                        const attemptInfo = deriveSolveAttemptInfo(base.attempts);
                        consider(base.solution, {
                            phase,
                            profile: winner?.profile ?? null,
                            template: winner?.template ?? null,
                            beamWidth: attemptInfo.beamWidth,
                            diverseBeam: attemptInfo.diverseBeam,
                            attemptIndex: attemptInfo.attemptIndex,
                            nodesExpanded: attemptInfo.nodesExpanded,
                            elapsedMs: attemptInfo.elapsedMs,
                            randomSeed: attemptInfo.randomSeed,
                            seedSalt: attemptInfo.seedSalt,
                        });
                    }
                } catch (e) {
                    if ((e as any)?.message !== 'Solver:cancelled') report.errors.push(`baseline: ${(e as any)?.message}`);
                }
            }
            phase = 'gate-direction';
        }

        // Phase A/B: per-gate x per-first-step-direction cascade + strategy, breadth-first.
        if (phase === 'gate-direction') {
            if (shouldStop()) return buildResult(getWorkCeiling, isCancelled, maxHints);
            if (gateCombos === null) {
                gateCombos = [];
                for (const gateKey of level.gateKeys) {
                    const gateLevel = { ...level, gateKeys: [gateKey] };
                    const directions = enumerateDirections(gateLevel, gateKey);
                    for (const direction of directions) {
                        report.combosTried++;
                        gateCombos.push({
                            meta: { gateKey, direction },
                            gen: comboSteps(solverApi, gateLevel, { forcedFirstStepKey: direction }, `gate=${gateKey} dir=${direction}`, ctx),
                        });
                    }
                }
            }
            const completed = await roundRobinCombos(gateCombos, {
                shouldStop,
                onFound: (meta: any, entry: any) => consider(entry.path, {
                    phase: entry.kind,
                    gateKey: meta.gateKey,
                    direction: meta.direction,
                    profile: entry.profile,
                    template: entry.template,
                    disabledFeatures: entry.disabledFeatures,
                    beamWidth: entry.beamWidth,
                    diverseBeam: entry.diverseBeam,
                    attemptIndex: entry.attemptIndex,
                    nodesExpanded: entry.nodesExpanded,
                    elapsedMs: entry.elapsedMs,
                    randomSeed: entry.randomSeed,
                    seedSalt: entry.seedSalt,
                }),
                onComboDone: () => onProgress({ type: 'combo-done', phase: 'gate-direction', combosTried: report.combosTried, novelCount: novel.length, workRemaining: Math.max(0, workLeft()) }),
            });
            if (!completed) return buildResult(getWorkCeiling, isCancelled, maxHints);
            onProgress({ type: 'phase-done', phase: 'gate-direction', novelCount: novel.length, workRemaining: Math.max(0, workLeft()) });
            phase = 'portal-direction';
        }

        // Phase C: portal-exit-direction cascade + strategy, scoped to destinations
        // proven reachable by existingHints + this session's OWN discoveries so far
        // (gate-direction phase above always runs to completion or budget-exhaustion
        // before this phase starts, so a freshly authored level with no existingHints
        // still seeds this phase from its own Phase 0/A/B finds).
        if (phase === 'portal-direction') {
            if (shouldStop()) return buildResult(getWorkCeiling, isCancelled, maxHints);
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
                                gen: comboSteps(solverApi, level, { forcedPortalExitKey: { from: destKey, to: direction } }, `portalDest=${destKey} dir=${direction}`, ctx),
                            });
                        }
                    }
                }
            }
            const completed = await roundRobinCombos(portalCombos, {
                shouldStop,
                onFound: (meta: any, entry: any) => consider(entry.path, {
                    phase: entry.kind === 'cascade' ? 'portal-cascade' : 'portal-strategy',
                    portalDest: meta.destKey,
                    portalExitDirection: meta.direction,
                    profile: entry.profile,
                    template: entry.template,
                    disabledFeatures: entry.disabledFeatures,
                    beamWidth: entry.beamWidth,
                    diverseBeam: entry.diverseBeam,
                    attemptIndex: entry.attemptIndex,
                    nodesExpanded: entry.nodesExpanded,
                    elapsedMs: entry.elapsedMs,
                    randomSeed: entry.randomSeed,
                    seedSalt: entry.seedSalt,
                }),
                onComboDone: () => onProgress({ type: 'combo-done', phase: 'portal-direction', combosTried: report.portalCombosTried, novelCount: novel.length, workRemaining: Math.max(0, workLeft()) }),
            });
            if (!completed) return buildResult(getWorkCeiling, isCancelled, maxHints);
            onProgress({ type: 'phase-done', phase: 'portal-direction', novelCount: novel.length, workRemaining: Math.max(0, workLeft()) });
            phase = 'done';
        }

        return buildResult(getWorkCeiling, isCancelled, maxHints);
    }

    return {
        runUntil,
        get isComplete() { return phase === 'done'; },
    };
}
