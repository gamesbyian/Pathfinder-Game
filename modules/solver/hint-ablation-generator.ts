/**
 * Full solver-ablation hint generator — all phases.
 *
 * Extracts paths that emerge under constrained solving by forcing specific solver parameters:
 * - Phase 0: Baseline (no forcing)
 * - Phases A/B: Gate × direction cascade/strategy (forward-only)
 * - Phase D: Gate/goal-swap (reverse-only)
 * - Phase C: Portal-exit-direction cascade/strategy
 * - Phase E: Swap portal-exit-direction cascade/strategy
 * - Phase F: Combined gate × direction × portal-exit-direction
 * - Phase G: Swap combined forcing
 *
 * Each phase is independently controllable via options, and all candidates are validated
 * against the forward level before being returned. Used by the workbench and the legacy
 * hint-diversification.mjs script via a shared implementation.
 *
 * Implementation note: This module extracts the core diversification logic from
 * scripts/hint-diversification.mjs into a reusable TypeScript module. The phases
 * are implemented incrementally; see the remaining-phases comment in processLevel().
 */

import type { HintCandidateEvent, HintCandidateProvenance } from './hint-candidate-events.js';
import { makeCandidateEvents } from './hint-candidate-events.js';
import { createState, getNeighbors } from './search-state.js';
import { AXIS_H, AXIS_V } from './encoding.js';

export interface AblationGeneratorOptions {
    // Solver instance (injected from Solver.createSolver()).
    solverApi: any;

    // Budget and timing.
    attemptBudgetMs?: number;
    baselineBudgetMs?: number;
    wallClockDeadlineMs?: number; // elapsed ms from now; generator stops if exceeded.

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

    // Portal and flipper behavior.
    evidenceBounded?: boolean; // if true, only try (gate, direction, portalDest) triples proven reachable by hints.
    flipperVariants?: boolean; // if true, try both flipper-flip variants for reverse phases.
}

export interface AblationGeneratorResult {
    candidates: HintCandidateEvent[];
    report: {
        levelNumber: number;
        baselineWinner?: string | null;
        phasesRun: string[];
        combosTried: Record<string, number>;
        errors: string[];
        haltedByWallClock: boolean;
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pathSignature(p: number[]): string {
    return p.join(',');
}

function flipTurnDir(dir: string | undefined): string | undefined {
    if (dir === 'left') return 'right';
    if (dir === 'right') return 'left';
    return dir; // 'either' unchanged
}

function flipAxis(ax: number): number {
    return ax === AXIS_H ? AXIS_V : (ax === AXIS_V ? AXIS_H : ax);
}

function enumerateDirections(gateLevel: any, gateKey: number, solverApi: any): number[] {
    const prep = solverApi.SOLVER_TESTING_API.prepLevel(gateLevel);
    const state = createState(gateKey, gateLevel, prep);
    return getNeighbors(gateKey, state, gateLevel, prep);
}

function enumeratePortalExitDirections(level: any, destKey: number, solverApi: any): number[] {
    const prep = solverApi.SOLVER_TESTING_API.prepLevel(level);
    const state = createState(destKey, level, prep);
    state.lastWasPortalJump = true; // Force normal neighbors, not re-entry forced jump.
    return getNeighbors(destKey, state, level, prep);
}

function buildSwapLevel(level: any, gateKey: number, flipFlippers: boolean): any {
    const mustPassTurnDirs = new Map();
    for (const [k, dir] of level.mustPassTurnDirs) mustPassTurnDirs.set(k, flipTurnDir(dir));
    const adjacentTurnDirs = level.adjacentTurnDirs.map(flipTurnDir);
    const flippingFilterMap = flipFlippers
        ? new Map([...level.flippingFilterMap].map(([k, ax]: [number, number]) => [k, flipAxis(ax)]))
        : level.flippingFilterMap;
    return { ...level, gateKeys: [level.goalKey], goalKey: gateKey, mustPassTurnDirs, adjacentTurnDirs, flippingFilterMap };
}

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

/**
 * Create a hint ablation generator for full diversification phases.
 * Yields candidates through one validation pipeline.
 *
 * REMAINING PHASES: This function currently implements Phase 0 (baseline) only.
 * The following are defined but return empty results:
 *   - Phases A/B: Gate × direction cascade/strategy (forward)
 *   - Phase D: Gate/goal-swap (reverse)
 *   - Phase C: Portal-exit-direction cascade/strategy
 *   - Phase E: Swap portal-exit-direction cascade/strategy
 *   - Phase F: Combined gate+direction × portal-exit-direction
 *   - Phase G: Swap combined forcing
 *
 * Each phase depends on cascade/strategy infrastructure that needs cascade/strategy
 * helper functions to be extracted from scripts/hint-diversification.mjs. This is
 * planned for a follow-up that extracts the full phase logic incrementally.
 */
export async function createHintAblationGenerator(
    rawLevel: any,
    levelNumber: number,
    options: AblationGeneratorOptions,
): Promise<AblationGeneratorResult> {
    const solverApi = options.solverApi;
    const attemptBudgetMs = options.attemptBudgetMs ?? 4000;
    const baselineBudgetMs = options.baselineBudgetMs ?? 8000;
    const wallClockDeadlineMs = options.wallClockDeadlineMs ?? 150 * 60 * 1000;
    const deadlineAt = Date.now() + wallClockDeadlineMs;
    const evidenceBounded = options.evidenceBounded ?? true;
    const flipperVariants = options.flipperVariants ?? true;

    const level = solverApi.prepareLevelForSolver(rawLevel, { source: 'raw', levelNumber });
    const existingSigs = new Set((rawLevel.hints || []).map(pathSignature));
    const loggedSigs = new Set<string>();
    const discoveries = new Map<string, any>(); // pathSignature -> provenance
    const novel: number[][] = [];
    const errors: string[] = [];
    const combosTried: Record<string, number> = {
        baseline: 0,
        cascade: 0,
        swap: 0,
        portalCascade: 0,
        swapPortal: 0,
        combined: 0,
        swapCombined: 0,
    };
    const phasesRun: string[] = [];

    let baselineWinner: string | null = null;

    function consider(path: number[], provenance: any): void {
        const sig = pathSignature(path);
        if (loggedSigs.has(sig)) return;
        const v = solverApi.validateCandidatePath(level, path);
        if (!v.ok) return;
        loggedSigs.add(sig);
        discoveries.set(sig, provenance);
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

    // Phase 0: Baseline (unconstrained).
    if (phases.baseline) {
        phasesRun.push('baseline');
        try {
            const base = await solverApi.solve(level, { timeBudgetMs: baselineBudgetMs });
            if (base?.ok && base.solution) {
                baselineWinner = base.attempts?.find((a: any) => a.ok)?.profile ?? null;
                consider(base.solution, {
                    generator: 'ablation-full',
                    levelNumber,
                    phase: 'baseline',
                });
                combosTried.baseline = 1;
            }
        } catch (e) {
            errors.push(`baseline: ${(e as Error)?.message}`);
        }
    }

    if (Date.now() >= deadlineAt) {
        return {
            candidates: makeCandidateEvents(novel, {
                generator: 'ablation-full',
                levelNumber,
                provenance: {
                    attemptBudgetMs,
                    baselineBudgetMs,
                    wallClockDeadlineMs,
                    phasesRun,
                },
            }),
            report: {
                levelNumber,
                baselineWinner,
                phasesRun,
                combosTried,
                errors,
                haltedByWallClock: true,
            },
        };
    }

    return {
        candidates: makeCandidateEvents(novel, {
            generator: 'ablation-full',
            levelNumber,
            provenance: {
                attemptBudgetMs,
                baselineBudgetMs,
                wallClockDeadlineMs,
                phasesRun,
            },
        }),
        report: {
            levelNumber,
            baselineWinner,
            phasesRun,
            combosTried,
            errors,
            haltedByWallClock: false,
        },
    };
}
