/**
 * Full solver-ablation hint generator — all phases.
 *
 * Extracted from scripts/hint-diversification.mjs (the legacy standalone CLI) so the
 * workbench can run the same phases through the shared candidate-event pipeline
 * (Component 3). Behavior is intended to match the legacy script exactly for the same
 * level, seed, budgets, and phase selection — see docs/hint-workbench-implementation-plan.md
 * Component 4's invariants.
 *
 * Phases (each independently toggleable via options.phases):
 * - Phase 0 (baseline): unconstrained solve — establishes what wins by default.
 * - Phase A/B (cascade): per-gate x per-first-step-direction cascade (disable the
 *   winning template/profile each round until nothing new survives) + strategy
 *   (independently disable each STRATEGY_ flag).
 * - Phase D (swap): gate/goal-swap reversal of Phase A/B — solves the REVERSED
 *   problem (goal->gate) and reverses the resulting path back before validating.
 * - Phase C (portalCascade): portal-exit-direction cascade/strategy, scoped to portal
 *   destinations an existing/novel hint already proves reachable.
 * - Phase E (swapPortal): gate/goal-swap mirror of Phase C.
 * - Phase F (combined): evidence-bounded combined gate+direction x portal-exit-direction
 *   forcing — only tries (gate, direction, portalDest) triples an existing/novel hint
 *   already proves are jointly reachable, then varies the exit direction exhaustively.
 * - Phase G (swapCombined): gate/goal-swap mirror of Phase F.
 *
 * All candidates are deduped and validated against the forward level via
 * solverApi.validateCandidatePath before being considered novel.
 */

import type { HintCandidateEvent } from './hint-candidate-events.js';
import { legacyMsToWork } from './budget-units.js';
import { createState, getNeighbors } from './search-state.js';
import { AXIS_H, AXIS_V } from './encoding.js';
import { getAttemptConfigs } from './attempts.js';
import { TEMPLATE_CONFIG_KEYS } from './policy.js';
import { prepLevel } from './prep.js';
import { deriveSolveAttemptInfo } from './hint-provenance.js';
import {
    TEMPLATE_CONFIG_KEY, PROFILE_CONFIG_KEY, FEATURE_GROUPS,
    withFeaturesDisabled, withFeatureDisabled,
} from './ablation-config.js';

const STRATEGY_FLAGS: string[] = FEATURE_GROUPS.strategy;

export interface AblationGeneratorOptions {
    // Solver instance (injected from Solver.createSolver()).
    solverApi: any;

    // Budget and timing.
    attemptBudgetMs?: number;
    baselineBudgetMs?: number;
    /** Preferred whole-generator deterministic ceiling in canonical work units. */
    workBudget?: number;
    /** @deprecated Compatibility shim for older --wall-ms callers. This is converted ONCE to
     * canonical work; it is not an elapsed-time deadline and never reads Date.now(). */
    wallClockDeadlineMs?: number;

    // Phase selection (all default to true if omitted).
    phases?: {
        baseline?: boolean;
        cascade?: boolean; // forward cascade/strategy (A/B)
        swap?: boolean; // reverse cascade/strategy (D)
        portalCascade?: boolean; // portal-exit forcing (C)
        swapPortal?: boolean; // swap portal-exit (E)
        combined?: boolean; // combined gate+direction × portal-exit (F)
        swapCombined?: boolean; // swap combined (G)
    };

    // Extra hints (e.g. this run's accumulated novel finds from a prior step) used as
    // evidence for portal-dest/gate-portal-triple scanning, in addition to rawLevel.hints.
    extraEvidenceHints?: number[][];
}

export interface AblationGeneratorResult {
    candidates: HintCandidateEvent[];
    /** Novel paths as plain number[][] (same paths as `candidates[i].path`), for callers
     *  that want raw paths without unpacking candidate events (e.g. the legacy CLI). */
    novel: number[][];
    /** pathSignature -> {path, provenance} for every path `consider()`-ed this run, novel or not
     *  (a pre-existing hint can be re-discovered by a phase without becoming "novel"). Entries
     *  whose signature isn't in `novel`'s own signatures are rediscoveries of an already-known
     *  path — lets callers merge that provenance onto the existing hint instead of the discovery
     *  event being silently lost, and reconstruct full corpus provenance the way the legacy CLI does. */
    discoveries: Map<string, { path: number[]; provenance: any }>;
    /** Rediscoveries of an already-known path, as full candidate events (same per-discovery
     *  forcing detail as `candidates`) rather than bare paths — so a caller merging this
     *  provenance onto an existing hint doesn't lose which phase/gate/direction/portal-exit
     *  independently re-found it. */
    rediscovered: HintCandidateEvent[];
    report: {
        levelNumber: number;
        baselineWinner: string | null;
        phasesRun: string[];
        combosTried: Record<string, number>;
        errors: string[];
        haltedByWorkBudget: boolean;
        /** @deprecated Persisted compatibility alias. Same value as haltedByWorkBudget. */
        haltedByWallClock: boolean;
    };
}

// ─── Helpers (ported from scripts/hint-diversification.mjs) ───────────────────

function pathSignature(p: number[]): string {
    return p.join(',');
}

// A 'swap*' phase solved the gate/goal-reversed problem and reversed the path back (Phases
// D/E/G) -- every other phase (including 'baseline', which has no forward/reverse axis at all)
// solved forward from the real gate.
function isReversedPhase(phase: string): boolean {
    return phase.startsWith('swap');
}

// Builds one candidate event carrying THIS SPECIFIC discovery's own forcing configuration
// (gate/direction/portal-exit/reversal/disabled-feature), not a batch-level provenance shared
// across every candidate -- see the return statement's comment for why that distinction matters.
// `disc` can be undefined in principle (a novel path whose discoveries entry was somehow never
// recorded); falls back to an unattributed baseline-shaped event rather than throwing.
function candidateEventFromDiscovery(
    path: number[], index: number, disc: { path: number[]; provenance: any } | undefined,
    levelNumber: number, batchMeta: { attemptBudgetMs?: number; baselineBudgetMs?: number; workBudget?: number; wallClockDeadlineMs?: number; phasesRun: string[] },
): HintCandidateEvent {
    const prov = disc?.provenance ?? {};
    const phase: string | undefined = prov.phase;
    const technique = ['ablation-full', phase].filter(Boolean).join(':');
    return {
        path,
        generator: 'ablation-full',
        sequence: index + 1,
        provenance: { generator: 'ablation-full', levelNumber, ...batchMeta, ...prov },
        diagnostics: {},
        technique,
        profile: prov.profile ?? null,
        template: prov.template ?? null,
        forcingGateKey: prov.gateKey ?? null,
        forcingDirection: prov.direction ?? null,
        forcingPortalDest: prov.portalDest ?? null,
        forcingPortalExitDirection: prov.portalExitDirection ?? null,
        forcingReversed: phase === undefined || phase === 'baseline' ? null : isReversedPhase(phase),
        forcingFlippedFilters: prov.flipFlippers ?? null,
        forcingDisabledFeatures: prov.disabledFeatures ?? null,
    };
}

function flipTurnDir(dir: string | undefined): string | undefined {
    if (dir === 'left') return 'right';
    if (dir === 'right') return 'left';
    return dir; // 'either' unchanged
}

function flipAxis(ax: number): number {
    return ax === AXIS_H ? AXIS_V : (ax === AXIS_V ? AXIS_H : ax);
}

// Mirrors applyAttemptConfigOptions' filter predicate. Needed separately because
// applyAttemptConfigOptions falls back to the unfiltered base list when every config is
// filtered out (a safety net for production solving), which would otherwise make the
// cascade loop below never terminate.
function anyConfigSurvives(level: any, disabledKeys: Set<string>): boolean {
    const baseConfigs = getAttemptConfigs(level);
    return baseConfigs.some(c => {
        if (c.template) {
            const tKey = (TEMPLATE_CONFIG_KEYS as Record<string, string>)[(c.template as any).id];
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

// Mirrors enumerateDirections, but for a portal destination instead of a gate: a fresh
// state has lastWasPortalJump=false, which would make getNeighbors think it must force
// another jump back out (since destKey is itself registered in portalMap). Force the flag
// so getNeighbors falls through to the normal static-neighbor enumeration instead.
function enumeratePortalExitDirections(level: any, destKey: number): number[] {
    const prep = prepLevel(level);
    const state = createState(destKey, level, prep);
    state.lastWasPortalJump = true;
    return getNeighbors(destKey, state, level, prep);
}

// Builds a gate/goal-swapped clone of `level` for reverse-direction solving: starts from
// the original goal, ends at original gate `gateKey`. Turn-direction landmark requirements
// are pre-flipped (a fixed, deterministic transform). Flipper axis requirements are NOT a
// fixed transform — callers try both `flipFlippers` variants for levels with >=2 flippers
// and rely on validateCandidatePath against the real level to discard the wrong guess.
function buildSwapLevel(level: any, gateKey: number, flipFlippers: boolean): any {
    const mustPassTurnDirs = new Map();
    for (const [k, dir] of level.mustPassTurnDirs) mustPassTurnDirs.set(k, flipTurnDir(dir));
    const adjacentTurnDirs = level.adjacentTurnDirs.map(flipTurnDir);
    const flippingFilterMap = flipFlippers
        ? new Map([...level.flippingFilterMap].map(([k, ax]: [number, number]) => [k, flipAxis(ax)]))
        : level.flippingFilterMap;
    return { ...level, gateKeys: [level.goalKey], goalKey: gateKey, mustPassTurnDirs, adjacentTurnDirs, flippingFilterMap };
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

interface GatePortalTriple {
    startKey: number;
    direction: number;
    destKey: number;
    endKey: number;
}

// Scans hints for (start, first-step-direction, portal-destination, end) quadruples that
// some real solution proves are jointly reachable. Bounds Phase F/G to combinations with
// existing evidence of joint feasibility instead of the full (gate x direction) x portalDest
// cross product.
function findGatePortalTriples(level: any, hints: number[][]): GatePortalTriple[] {
    if (level.portalMap.size === 0) return [];
    const seen = new Set<string>();
    const triples: GatePortalTriple[] = [];
    for (const hint of hints) {
        if (hint.length < 2) continue;
        const startKey = hint[0];
        const direction = hint[1];
        const endKey = hint[hint.length - 1];
        for (let i = 1; i < hint.length - 1; i++) {
            const portal = level.portalMap.get(hint[i]);
            if (!portal || portal.dest !== hint[i + 1]) continue;
            const destKey = hint[i + 1];
            const sig = `${startKey},${direction},${destKey},${endKey}`;
            if (seen.has(sig)) continue;
            seen.add(sig);
            triples.push({ startKey, direction, destKey, endKey });
        }
    }
    return triples;
}

interface FoundEntry {
    path: number[];
    profile: string | null;
    template: string | null;
    disabledFeatures: string[];
    beamWidth: number | null;
    diverseBeam: boolean | null;
    attemptIndex: number | null;
    nodesExpanded: number | null;
    elapsedMs: number | null;
    randomSeed: number | null;
    seedSalt: number | null;
}

/** Deprecated ms-shaped inputs normalize through budget-units.ts's one committed conversion. */

interface RunCtx {
    solverApi: any;
    attemptBudgetMs: number;
    errors: string[];
    /** This whole generator run's work budget, measured from this run's own zero baseline (NOT an
     *  absolute `workMeter.units` checkpoint — see `workSpent` below). Deliberately WORK, not a
     *  Date.now() deadline: this bound decides how far the phase ladder gets, and therefore WHICH
     *  HINTS DISCOVERY FINDS. Gating that on wall clock made the discovered set — and so the
     *  provenance corpus built from it — a function of how fast and how loaded the host was.
     *  See docs/solver-budget-determinism.md and work-meter.ts. */
    workCeiling: number;
    /** Session-owned work counter (2026-08-28 caller-owned-work-scope fix, matching
     *  diversification.ts's identical `ctx.sessionWork` — see queue item #2 debt #4 "module-global
     *  discovery work meter"). Every solve this generator run performs adds its own
     *  `SolveResult.workSpent` here; the run never reads the realm-global `workMeter` shared by
     *  every other concurrent solve in the process, so an unrelated solve elsewhere in the same
     *  realm can no longer pad or steal this run's own work-ceiling accounting. One accepted edge
     *  case: a solve that THROWS (rare — a genuine error, not ordinary exhaustion) can't report the
     *  work it spent before throwing, unlike the old realm-global read; conservative in the safe
     *  direction only (this run may go marginally over its nominal budget on that path, never under). */
    workSpent: number;
}

// Generic cascade: repeatedly solves with `solveOptsBase` plus a growing disabled-feature
// set (seeded from the winning template/profile of the previous round) until either the
// deadline hits, no config survives the disable set, or the solver stops returning a
// solution. Shared by gate-direction (A/B), portal-exit (C), and combined (F) phases —
// they differ only in which forcing options they pass and how they log errors.
async function runCascade(target: any, solveOptsBase: any, label: string, ctx: RunCtx): Promise<{ found: FoundEntry[], haltedByWorkBudget: boolean }> {
    const disabled = new Set<string>();
    const found: FoundEntry[] = [];
    let round = 0;
    let haltedByWorkBudget = false;
    while (true) {
        if (ctx.workSpent >= ctx.workCeiling) { haltedByWorkBudget = true; break; }
        if (disabled.size > 0 && !anyConfigSurvives(target, disabled)) break;

        const cfg = disabled.size > 0 ? withFeaturesDisabled([...disabled]) : null;
        let result;
        try {
            // disableExtraBudgetPasses: this cascade repeatedly re-solves under a tight
            // ctx.attemptBudgetMs specifically to isolate the effect of disabling ONE MORE narrow
            // STRATEGY_/PROFILE_ flag per round -- an unrelated last-resort search tier (repair
            // fallback / attraction-diversity / admissible-order-search) adding its own extra
            // budget on top would both blow the round's timing and muddy which flag actually
            // caused a given round's win/loss. The unconstrained baseline solve above (phase 0)
            // deliberately does NOT set this, since its whole point is the honest full-default
            // winner including every last-resort tier.
            result = await ctx.solverApi.solveLevel(target, { ...solveOptsBase, timeBudgetMs: ctx.attemptBudgetMs, ablation: cfg, disableExtraBudgetPasses: true });
        } catch (e) {
            ctx.errors.push(`${label} round=${round}: ${(e as Error)?.message}`);
            break;
        }
        // Counts even a losing final round's cost — see ctx.workSpent's doc comment above.
        ctx.workSpent += result?.workSpent ?? 0;
        round++;
        if (!result?.ok || !result.solution) break;

        const winner = result.attempts?.find((a: any) => a.ok);
        const attemptInfo = deriveSolveAttemptInfo(result.attempts);
        found.push({
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
        });

        const disableKey = winner?.template ? TEMPLATE_CONFIG_KEY[winner.template] : PROFILE_CONFIG_KEY[winner?.profile];
        if (!disableKey || disabled.has(disableKey)) break; // safety: can't make further progress
        disabled.add(disableKey);
    }
    return { found, haltedByWorkBudget };
}

// Generic strategy phase: independently disables each STRATEGY_ flag (one at a time,
// starting from the full-feature baseline) and keeps any solution found. Shared by the
// same three axis types as runCascade, and only run when the paired cascade found at
// least one solution (mirrors the legacy script's gating).
async function runStrategyPhase(target: any, solveOptsBase: any, label: string, ctx: RunCtx): Promise<{ found: FoundEntry[], haltedByWorkBudget: boolean }> {
    const found: FoundEntry[] = [];
    let haltedByWorkBudget = false;
    for (const flag of STRATEGY_FLAGS) {
        if (ctx.workSpent >= ctx.workCeiling) { haltedByWorkBudget = true; break; }
        let result;
        try {
            // disableExtraBudgetPasses: same reasoning as runCascade's identical option -- one
            // narrow STRATEGY_ flag isolated per iteration under a tight per-attempt budget.
            result = await ctx.solverApi.solveLevel(target, { ...solveOptsBase, timeBudgetMs: ctx.attemptBudgetMs, ablation: withFeatureDisabled(flag), disableExtraBudgetPasses: true });
        } catch (e) {
            ctx.errors.push(`strategy=${flag} ${label}: ${(e as Error)?.message}`);
            continue;
        }
        ctx.workSpent += result?.workSpent ?? 0;
        if (result?.ok && result.solution) {
            const winner = result.attempts?.find((a: any) => a.ok);
            const attemptInfo = deriveSolveAttemptInfo(result.attempts);
            found.push({
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
            });
        }
    }
    return { found, haltedByWorkBudget };
}

/**
 * Create a hint ablation generator for full diversification phases. Runs each enabled
 * phase to completion or until the deterministic whole-generator work ceiling, considering
 * (deduping and validating) every candidate path found along the way, and returns the novel
 * ones as shared HintCandidateEvent objects (Component 3).
 */
export async function createHintAblationGenerator(
    rawLevel: any,
    levelNumber: number,
    options: AblationGeneratorOptions,
): Promise<AblationGeneratorResult> {
    const solverApi = options.solverApi;
    const attemptBudgetMs = options.attemptBudgetMs ?? 4000;
    const baselineBudgetMs = options.baselineBudgetMs ?? 8000;
    const legacyWallClockDeadlineMs = options.wallClockDeadlineMs ?? 150 * 60 * 1000;
    // Preferred callers specify work directly. The old ms-shaped option remains only as a
    // compatibility shim and is converted once at this boundary; live host speed never enters.
    const workBudget = options.workBudget == null
        ? legacyMsToWork(legacyWallClockDeadlineMs, 1)
        : Math.max(0, Math.floor(options.workBudget));
    // Session-local budget (see RunCtx.workSpent's doc comment): measured from this run's own zero
    // baseline, not an absolute realm-global workMeter.units checkpoint.
    const workCeiling = workBudget;

    const level = solverApi.prepareLevelForSolver(rawLevel, { source: 'raw', levelNumber });
    const existingSigs = new Set((rawLevel.hints || []).map(pathSignature));
    const loggedSigs = new Set<string>();
    const discoveries = new Map<string, { path: number[]; provenance: any }>(); // pathSignature -> {path, provenance}
    const novel: number[][] = [];
    const errors: string[] = [];
    const combosTried: Record<string, number> = {
        baseline: 0, cascade: 0, swap: 0, portalCascade: 0, swapPortal: 0, combined: 0, swapCombined: 0,
    };
    const phasesRun: string[] = [];
    // No solve has run yet, so this run's own work-spent is still exactly 0 (ctx isn't constructed
    // until just below) — equivalent to the old `workMeter.units >= workCeiling` at this same point.
    let haltedByWorkBudget = workBudget <= 0;
    let baselineWinner: string | null = null;

    const ctx: RunCtx = { solverApi, attemptBudgetMs, errors, workCeiling, workSpent: 0 };

    function consider(path: number[], provenance: any): void {
        const sig = pathSignature(path);
        if (loggedSigs.has(sig)) return;
        const v = solverApi.validateCandidatePath(level, path);
        if (!v.ok) return;
        loggedSigs.add(sig);
        discoveries.set(sig, { path, provenance });
        if (!existingSigs.has(sig)) novel.push(path);
    }

    const phases = {
        baseline: options.phases?.baseline ?? true,
        cascade: options.phases?.cascade ?? true,
        swap: options.phases?.swap ?? true,
        portalCascade: options.phases?.portalCascade ?? true,
        swapPortal: options.phases?.swapPortal ?? true,
        combined: options.phases?.combined ?? true,
        swapCombined: options.phases?.swapCombined ?? true,
    };

    const flipperVariants: boolean[] = level.flippingFilterMap.size >= 2 ? [false, true] : [false];

    function evidenceHints(): number[][] {
        return [...(rawLevel.hints || []), ...(options.extraEvidenceHints || []), ...novel];
    }

    // Phase 0: unconstrained baseline (establishes "what wins by default").
    if (phases.baseline && ctx.workSpent < workCeiling) {
        phasesRun.push('baseline');
        try {
            const base = await solverApi.solveLevel(level, { timeBudgetMs: baselineBudgetMs });
            ctx.workSpent += base?.workSpent ?? 0;
            if (base?.ok && base.solution) {
                const winner = base.attempts?.find((a: any) => a.ok);
                baselineWinner = winner?.profile ?? null;
                // profile mirrors what the cascade/strategy FoundEntry already carries (see
                // runCascade/runStrategyPhase). The phase suffix below is what actually makes an
                // admissible-order-search baseline win distinguishable from an ordinary
                // default-profile DFS/beam win in this file's own PERSISTED provenance: both would
                // otherwise report the identical profile: 'default' with no way to tell them apart.
                // (An earlier version of this fix added an `admissibleOrder` field to this object,
                // but nothing downstream -- candidateEventFromDiscovery below -- ever read it back
                // out, so it was silently dropped before ever reaching makeProvenanceEntry; found
                // and corrected 2026-07-25. The technique-string-suffix approach here instead
                // matches this codebase's established convention for "which internal config won" --
                // see HintSolverProvenance.technique's own doc comment in hint-types.ts, and
                // variety-search.ts's identical fix for hint-enumeration.ts's own admissible-slack
                // mode from the same investigation.)
                const phase = winner?.admissibleOrder ? 'baseline-admissible-order' : 'baseline';
                const attemptInfo = deriveSolveAttemptInfo(base.attempts);
                consider(base.solution, {
                    generator: 'ablation-full',
                    levelNumber,
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
                combosTried.baseline = 1;
            }
        } catch (e) {
            errors.push(`baseline: ${(e as Error)?.message}`);
        }
    }

    // Phase A/B: gate x first-step-direction cascade + strategy (forward).
    if (phases.cascade && !haltedByWorkBudget) {
        phasesRun.push('cascade');
        for (const gateKey of level.gateKeys) {
            if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
            const gateLevel = { ...level, gateKeys: [gateKey] };
            const directions = enumerateDirections(gateLevel, gateKey);

            for (const direction of directions) {
                if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                combosTried.cascade++;

                const cascadeOutcome = await runCascade(gateLevel, { forcedFirstStepKey: direction }, `gate=${gateKey} dir=${direction}`, ctx);
                if (cascadeOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                for (const r of cascadeOutcome.found) {
                    consider(r.path, {
                        phase: 'cascade',
                        gateKey,
                        direction,
                        profile: r.profile,
                        template: r.template,
                        disabledFeatures: r.disabledFeatures,
                        beamWidth: r.beamWidth,
                        diverseBeam: r.diverseBeam,
                        attemptIndex: r.attemptIndex,
                        nodesExpanded: r.nodesExpanded,
                        elapsedMs: r.elapsedMs,
                        randomSeed: r.randomSeed,
                        seedSalt: r.seedSalt,
                    });
                }

                if (cascadeOutcome.found.length > 0 && ctx.workSpent < workCeiling) {
                    const strategyOutcome = await runStrategyPhase(gateLevel, { forcedFirstStepKey: direction }, `gate=${gateKey} dir=${direction}`, ctx);
                    if (strategyOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                    for (const r of strategyOutcome.found) {
                        consider(r.path, {
                            phase: 'strategy',
                            gateKey,
                            direction,
                            profile: r.profile,
                            template: r.template,
                            disabledFeatures: r.disabledFeatures,
                            beamWidth: r.beamWidth,
                            diverseBeam: r.diverseBeam,
                            attemptIndex: r.attemptIndex,
                            nodesExpanded: r.nodesExpanded,
                            elapsedMs: r.elapsedMs,
                            randomSeed: r.randomSeed,
                            seedSalt: r.seedSalt,
                        });
                    }
                }
            }
        }
    }

    // Phase D: gate/goal-swap. For each original gate, solve the REVERSED problem (start
    // at the original goal, end at the original gate) and reverse the resulting path back
    // before validating. Surfaces paths the forward search's direction-sensitive heuristics
    // would never produce.
    if (phases.swap && !haltedByWorkBudget) {
        phasesRun.push('swap');
        for (const gateKey of level.gateKeys) {
            if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
            for (const flipFlippers of flipperVariants) {
                if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                const swapLevel = buildSwapLevel(level, gateKey, flipFlippers);
                const swapGateKey = swapLevel.gateKeys[0];
                const directions = enumerateDirections(swapLevel, swapGateKey);

                for (const direction of directions) {
                    if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                    combosTried.swap++;

                    const cascadeOutcome = await runCascade(swapLevel, { forcedFirstStepKey: direction }, `swap gate=${gateKey} dir=${direction} flip=${flipFlippers}`, ctx);
                    if (cascadeOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                    for (const r of cascadeOutcome.found) {
                        consider(r.path.slice().reverse(), {
                            phase: 'swap-cascade',
                            gateKey,
                            direction,
                            flipFlippers,
                            profile: r.profile,
                            template: r.template,
                            disabledFeatures: r.disabledFeatures,
                            beamWidth: r.beamWidth,
                            diverseBeam: r.diverseBeam,
                            attemptIndex: r.attemptIndex,
                            nodesExpanded: r.nodesExpanded,
                            elapsedMs: r.elapsedMs,
                            randomSeed: r.randomSeed,
                            seedSalt: r.seedSalt,
                        });
                    }

                    if (cascadeOutcome.found.length > 0 && ctx.workSpent < workCeiling) {
                        const strategyOutcome = await runStrategyPhase(swapLevel, { forcedFirstStepKey: direction }, `swap gate=${gateKey} dir=${direction} flip=${flipFlippers}`, ctx);
                        if (strategyOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                        for (const r of strategyOutcome.found) {
                            consider(r.path.slice().reverse(), {
                                phase: 'swap-strategy',
                                gateKey,
                                direction,
                                flipFlippers,
                                profile: r.profile,
                                template: r.template,
                                disabledFeatures: r.disabledFeatures,
                                beamWidth: r.beamWidth,
                                diverseBeam: r.diverseBeam,
                                attemptIndex: r.attemptIndex,
                                nodesExpanded: r.nodesExpanded,
                                elapsedMs: r.elapsedMs,
                                randomSeed: r.randomSeed,
                                seedSalt: r.seedSalt,
                            });
                        }
                    }
                }
            }
        }
    }

    // Phase C: portal-exit-direction cascade/strategy, scoped to portal destinations an
    // existing/novel hint already proves reachable.
    if (phases.portalCascade && !haltedByWorkBudget) {
        phasesRun.push('portalCascade');
        const portalDests = findPortalExitPoints(level, evidenceHints());
        for (const destKey of portalDests) {
            if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
            const directions = enumeratePortalExitDirections(level, destKey);

            for (const direction of directions) {
                if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                combosTried.portalCascade++;

                const cascadeOutcome = await runCascade(level, { forcedPortalExitKey: { from: destKey, to: direction } }, `portalDest=${destKey} dir=${direction}`, ctx);
                if (cascadeOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                for (const r of cascadeOutcome.found) {
                    consider(r.path, {
                        phase: 'portal-cascade',
                        portalDest: destKey,
                        portalExitDirection: direction,
                        profile: r.profile,
                        template: r.template,
                        disabledFeatures: r.disabledFeatures,
                        beamWidth: r.beamWidth,
                        diverseBeam: r.diverseBeam,
                        attemptIndex: r.attemptIndex,
                        nodesExpanded: r.nodesExpanded,
                        elapsedMs: r.elapsedMs,
                        randomSeed: r.randomSeed,
                        seedSalt: r.seedSalt,
                    });
                }

                if (cascadeOutcome.found.length > 0 && ctx.workSpent < workCeiling) {
                    const strategyOutcome = await runStrategyPhase(level, { forcedPortalExitKey: { from: destKey, to: direction } }, `portalDest=${destKey} dir=${direction}`, ctx);
                    if (strategyOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                    for (const r of strategyOutcome.found) {
                        consider(r.path, {
                            phase: 'portal-strategy',
                            portalDest: destKey,
                            portalExitDirection: direction,
                            profile: r.profile,
                            template: r.template,
                            disabledFeatures: r.disabledFeatures,
                            beamWidth: r.beamWidth,
                            diverseBeam: r.diverseBeam,
                            attemptIndex: r.attemptIndex,
                            nodesExpanded: r.nodesExpanded,
                            elapsedMs: r.elapsedMs,
                            randomSeed: r.randomSeed,
                            seedSalt: r.seedSalt,
                        });
                    }
                }
            }
        }
    }

    // Phase E: gate/goal-swap x portal-exit-direction. Mirrors Phase D's reversal trick,
    // but targets the post-jump move Phase C forces. For every forward portal jump X->Y
    // found in evidence hints (reversed), the REVERSE-direction search hits the same jump
    // as Y->X, so X is the destination key to force a direction at in the reverse search.
    if (phases.swapPortal && !haltedByWorkBudget) {
        phasesRun.push('swapPortal');
        const reversedHintsForPortalScan = evidenceHints().map(h => h.slice().reverse());
        const swapPortalDests = findPortalExitPoints(level, reversedHintsForPortalScan);
        for (const gateKey of level.gateKeys) {
            if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
            for (const flipFlippers of flipperVariants) {
                if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                const swapLevel = buildSwapLevel(level, gateKey, flipFlippers);

                for (const destKey of swapPortalDests) {
                    if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                    const directions = enumeratePortalExitDirections(swapLevel, destKey);

                    for (const direction of directions) {
                        if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                        combosTried.swapPortal++;

                        const cascadeOutcome = await runCascade(swapLevel, { forcedPortalExitKey: { from: destKey, to: direction } }, `swap portalDest=${destKey} dir=${direction} flip=${flipFlippers}`, ctx);
                        if (cascadeOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                        for (const r of cascadeOutcome.found) {
                            consider(r.path.slice().reverse(), {
                                phase: 'swap-portal-cascade',
                                gateKey,
                                portalDest: destKey,
                                portalExitDirection: direction,
                                flipFlippers,
                                profile: r.profile,
                                template: r.template,
                                disabledFeatures: r.disabledFeatures,
                                beamWidth: r.beamWidth,
                                diverseBeam: r.diverseBeam,
                                attemptIndex: r.attemptIndex,
                                nodesExpanded: r.nodesExpanded,
                                elapsedMs: r.elapsedMs,
                                randomSeed: r.randomSeed,
                                seedSalt: r.seedSalt,
                            });
                        }

                        if (cascadeOutcome.found.length > 0 && ctx.workSpent < workCeiling) {
                            const strategyOutcome = await runStrategyPhase(swapLevel, { forcedPortalExitKey: { from: destKey, to: direction } }, `swap portalDest=${destKey} dir=${direction} flip=${flipFlippers}`, ctx);
                            if (strategyOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                            for (const r of strategyOutcome.found) {
                                consider(r.path.slice().reverse(), {
                                    phase: 'swap-portal-strategy',
                                    gateKey,
                                    portalDest: destKey,
                                    portalExitDirection: direction,
                                    flipFlippers,
                                    profile: r.profile,
                                    template: r.template,
                                    disabledFeatures: r.disabledFeatures,
                                    beamWidth: r.beamWidth,
                                    diverseBeam: r.diverseBeam,
                                    attemptIndex: r.attemptIndex,
                                    nodesExpanded: r.nodesExpanded,
                                    elapsedMs: r.elapsedMs,
                                    randomSeed: r.randomSeed,
                                    seedSalt: r.seedSalt,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Phase F: evidence-bounded combined gate+direction x portal-exit-direction forcing.
    // Only tries (gate, direction, portalDest) triples an existing/novel hint already
    // proves are jointly reachable; the exit DIRECTION at that destination is still varied
    // exhaustively, since that's the one crossing genuinely untested by Phase A/B/C/D.
    if (phases.combined && !haltedByWorkBudget) {
        phasesRun.push('combined');
        const gatePortalTriples = findGatePortalTriples(level, evidenceHints());
        for (const { startKey: triGateKey, direction: triDirection, destKey: triDestKey } of gatePortalTriples) {
            if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
            const gateLevel = { ...level, gateKeys: [triGateKey] };
            const exitDirections = enumeratePortalExitDirections(gateLevel, triDestKey);

            for (const exitDir of exitDirections) {
                if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                combosTried.combined++;

                const solveOptsBase = { forcedFirstStepKey: triDirection, forcedPortalExitKey: { from: triDestKey, to: exitDir } };
                const cascadeOutcome = await runCascade(gateLevel, solveOptsBase, `combined firstStep=${triDirection} portalDest=${triDestKey} dir=${exitDir}`, ctx);
                if (cascadeOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                for (const r of cascadeOutcome.found) {
                    consider(r.path, {
                        phase: 'combined-cascade',
                        gateKey: triGateKey,
                        direction: triDirection,
                        portalDest: triDestKey,
                        portalExitDirection: exitDir,
                        profile: r.profile,
                        template: r.template,
                        disabledFeatures: r.disabledFeatures,
                        beamWidth: r.beamWidth,
                        diverseBeam: r.diverseBeam,
                        attemptIndex: r.attemptIndex,
                        nodesExpanded: r.nodesExpanded,
                        elapsedMs: r.elapsedMs,
                        randomSeed: r.randomSeed,
                        seedSalt: r.seedSalt,
                    });
                }

                if (cascadeOutcome.found.length > 0 && ctx.workSpent < workCeiling) {
                    const strategyOutcome = await runStrategyPhase(gateLevel, solveOptsBase, `combined firstStep=${triDirection} portalDest=${triDestKey} dir=${exitDir}`, ctx);
                    if (strategyOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                    for (const r of strategyOutcome.found) {
                        consider(r.path, {
                            phase: 'combined-strategy',
                            gateKey: triGateKey,
                            direction: triDirection,
                            portalDest: triDestKey,
                            portalExitDirection: exitDir,
                            profile: r.profile,
                            template: r.template,
                            disabledFeatures: r.disabledFeatures,
                            beamWidth: r.beamWidth,
                            diverseBeam: r.diverseBeam,
                            attemptIndex: r.attemptIndex,
                            nodesExpanded: r.nodesExpanded,
                            elapsedMs: r.elapsedMs,
                            randomSeed: r.randomSeed,
                            seedSalt: r.seedSalt,
                        });
                    }
                }
            }
        }
    }

    // Phase G: gate/goal-swap x combined gate+direction x portal-exit-direction. Mirrors
    // Phase F for the reversed problem, the way Phase E mirrors Phase C for Phase D.
    if (phases.swapCombined && !haltedByWorkBudget) {
        phasesRun.push('swapCombined');
        const reversedForCombined = evidenceHints().map(h => h.slice().reverse());
        const swapGatePortalTriples = findGatePortalTriples(level, reversedForCombined);
        for (const { direction: triDirection, destKey: triDestKey, endKey: triGateKey } of swapGatePortalTriples) {
            if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
            for (const flipFlippers of flipperVariants) {
                if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                const swapLevel = buildSwapLevel(level, triGateKey, flipFlippers);
                const exitDirections = enumeratePortalExitDirections(swapLevel, triDestKey);

                for (const exitDir of exitDirections) {
                    if (ctx.workSpent >= workCeiling) { haltedByWorkBudget = true; break; }
                    combosTried.swapCombined++;

                    const solveOptsBase = { forcedFirstStepKey: triDirection, forcedPortalExitKey: { from: triDestKey, to: exitDir } };
                    const cascadeOutcome = await runCascade(swapLevel, solveOptsBase, `swap combined firstStep=${triDirection} portalDest=${triDestKey} dir=${exitDir} flip=${flipFlippers}`, ctx);
                    if (cascadeOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                    for (const r of cascadeOutcome.found) {
                        consider(r.path.slice().reverse(), {
                            phase: 'swap-combined-cascade',
                            gateKey: triGateKey,
                            direction: triDirection,
                            portalDest: triDestKey,
                            portalExitDirection: exitDir,
                            flipFlippers,
                            profile: r.profile,
                            template: r.template,
                            disabledFeatures: r.disabledFeatures,
                            beamWidth: r.beamWidth,
                            diverseBeam: r.diverseBeam,
                            attemptIndex: r.attemptIndex,
                            nodesExpanded: r.nodesExpanded,
                            elapsedMs: r.elapsedMs,
                            randomSeed: r.randomSeed,
                            seedSalt: r.seedSalt,
                        });
                    }

                    if (cascadeOutcome.found.length > 0 && ctx.workSpent < workCeiling) {
                        const strategyOutcome = await runStrategyPhase(swapLevel, solveOptsBase, `swap combined firstStep=${triDirection} portalDest=${triDestKey} dir=${exitDir} flip=${flipFlippers}`, ctx);
                        if (strategyOutcome.haltedByWorkBudget) haltedByWorkBudget = true;
                        for (const r of strategyOutcome.found) {
                            consider(r.path.slice().reverse(), {
                                phase: 'swap-combined-strategy',
                                gateKey: triGateKey,
                                direction: triDirection,
                                portalDest: triDestKey,
                                portalExitDirection: exitDir,
                                flipFlippers,
                                profile: r.profile,
                                template: r.template,
                                disabledFeatures: r.disabledFeatures,
                                beamWidth: r.beamWidth,
                                diverseBeam: r.diverseBeam,
                                attemptIndex: r.attemptIndex,
                                nodesExpanded: r.nodesExpanded,
                                elapsedMs: r.elapsedMs,
                                randomSeed: r.randomSeed,
                                seedSalt: r.seedSalt,
                            });
                        }
                    }
                }
            }
        }
    }

    const batchMeta = {
        attemptBudgetMs,
        baselineBudgetMs,
        workBudget,
        ...(options.workBudget == null ? { wallClockDeadlineMs: legacyWallClockDeadlineMs } : {}),
        phasesRun,
    };
    const novelSigs = new Set(novel.map(pathSignature));
    return {
        // Each novel path gets ITS OWN discovery's provenance (phase/gateKey/direction/portalDest/
        // portalExitDirection/flipFlippers/profile/template/disabledFeatures) via
        // candidateEventFromDiscovery -- NOT one batch-level provenance object shared across every
        // candidate (makeCandidateEvents's usual shape). Every phase in this generator forces a
        // different structural choice per candidate, so collapsing them all to the same shared
        // provenance would erase exactly the distinction this generator exists to produce; see
        // HintSolverForcing's doc comment in modules/domain/hint-types.ts for the full rationale.
        candidates: novel.map((path, index) => candidateEventFromDiscovery(
            path, index, discoveries.get(pathSignature(path)), levelNumber, batchMeta,
        )),
        novel,
        discoveries,
        rediscovered: [...discoveries.values()]
            .filter(({ path }) => !novelSigs.has(pathSignature(path)))
            .map(({ path }, index) => candidateEventFromDiscovery(
                path, index, discoveries.get(pathSignature(path)), levelNumber, batchMeta,
            )),
        report: {
            levelNumber,
            baselineWinner,
            phasesRun,
            combosTried,
            errors,
            haltedByWorkBudget,
            // Persisted compatibility alias for older report consumers. This field no longer
            // means a real wall-clock observation; it is identical to haltedByWorkBudget.
            haltedByWallClock: haltedByWorkBudget,
        },
    };
}
