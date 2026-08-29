// Maps solver/variety-search results into the canonical Hint provenance schema.
import { makeProvenanceEntry, toHint } from '../domain/hint-types.js';
import { ATTRACTION_DIVERSITY_CANDIDATE_FLAGS } from './attempts.js';
import { classifyAttemptTier } from './orchestration.js';
import type { Hint, HintProvenanceEntry } from '../domain/hint-types.js';
import type { Attempt } from './orchestration.js';

/** Partial attempts remain typed from orchestration's canonical Attempt contract. */
type AttemptLike = Omit<Partial<Attempt>, 'stageId'> & {
    stageId?: Attempt['stageId'] | string;
    ok?: boolean;
    /** Historical persisted attempt fields accepted on read only. */
    profile?: string;
    template?: string | null;
    diverseBeam?: boolean;
};

interface SolveResultLike {
    attempts?: AttemptLike[];
    nodesExpanded?: number;
    totalMs?: number;
    status?: string;
    workSpent?: number;
    workBudget?: number;
}

interface VarietySavedMetaLike { nodesExpanded: number | null; elapsedMs: number | null; technique: string; anchorSeed?: string | null; anchorDepth?: number | null; }

interface VarietyResultLike {
    newlySaved: number[][];
    newlySavedMeta: VarietySavedMetaLike[];
}

/** Context unavailable from a solve result itself. Omitted tracked values remain explicit null/false. */
export interface ProvenanceContext {
    levelRevision?: string | null;
    usedExistingHints?: boolean;
    randomSeed?: number | null;
    budgetMs?: number | null;
    /** Solver build id/git SHA when known. */
    solverVersion?: string | null;
    /** True for one-technique isolated runs, not the competitively-budgeted production ladder. */
    isolatedTechnique?: boolean;
}

interface SolveAttemptInfo {
    technique: string;
    scoringProfileId: string | null;
    orderingBiasId: string | null;
    beamWidth: number | null;
    mechanicBucketRetention: boolean | null;
    gateKey: number | null;
    attemptIndex: number | null;
    elapsedMs: number | null;
    nodesExpanded: number | null;
    allocatedBudgetMs: number | null;
    randomSeed: number | null;
    seedSalt: number | null;
    /** Repair variant, or null for non-repair winners. */
    repairMustTurnBiased: boolean | null;
    repairTurnBiased: boolean | null;
    /** Winner came from the goal-attraction-disabled-retry forced-flag rerun. */
    attractionDiversity: boolean;
    /** Force-enabled last-resort retry tier, else null. */
    retryTier: string | null;
}

/** Retry categories that change normal ladder rules; ordinary tiers and goal-attraction-disabled-retry are excluded. */
const RETRY_TIER_LABELS = new Set([
    'late-repair-search', 'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry',
    'connectivity-axis-prune-disabled-retry', 'coarse-state-near-tie-retention-disabled-retry', 'admissible-order-alternate-tiebreak-retry',
]);

/** Extract canonical winning-attempt metadata; returns solve-unknown if no winner is recorded. */
export function deriveSolveAttemptInfo(attempts: AttemptLike[] | undefined): SolveAttemptInfo {
    const list = attempts || [];
    const winner = list.find(a => a.outcome === 'success' || (a.outcome === undefined && a.ok));
    if (!winner) {
        return {
            technique: 'solve-unknown', scoringProfileId: null, orderingBiasId: null, beamWidth: null, mechanicBucketRetention: null,
            gateKey: null, attemptIndex: null, elapsedMs: null, nodesExpanded: null, allocatedBudgetMs: null,
            randomSeed: null, seedSalt: null, repairMustTurnBiased: null, repairTurnBiased: null, attractionDiversity: false,
            retryTier: null,
        };
    }
    const technique = winner.repair ? 'repair' : (winner.beamWidth ? 'beam' : (winner.admissibleOrder ? 'admissible-order-fallback' : 'dfs'));
    const attemptTierLabel = classifyAttemptTier(winner);
    const attemptIndex = list.indexOf(winner);
    return {
        technique,
        scoringProfileId: winner.scoringProfileId ?? winner.profile ?? null,
        orderingBiasId: winner.orderingBiasId ?? winner.template ?? null,
        beamWidth: winner.beamWidth ?? null,
        mechanicBucketRetention: winner.beamWidth ? !!(winner.mechanicBucketRetention ?? winner.diverseBeam) : null,
        gateKey: winner.gateKey ?? null,
        attemptIndex: attemptIndex >= 0 ? attemptIndex : null,
        elapsedMs: winner.elapsedMs ?? null,
        nodesExpanded: winner.nodesExpanded ?? null,
        allocatedBudgetMs: winner.allocatedBudgetMs ?? null,
        randomSeed: winner.randomSeed ?? null,
        seedSalt: winner.repair ? (winner.seedSalt ?? 0) : null,
        repairMustTurnBiased: winner.repair ? !!winner.repairMustTurnBiased : null,
        repairTurnBiased: winner.repair ? !!winner.repairTurnBiased : null,
        attractionDiversity: !!winner.attractionDiversity,
        retryTier: RETRY_TIER_LABELS.has(attemptTierLabel) ? attemptTierLabel : null,
    };
}

/** Provenance for the single solution returned by solveLevel()/Solver.solve(). */
export function provenanceFromSolveResult(result: SolveResultLike, ctx: ProvenanceContext = {}): HintProvenanceEntry {
    const info = deriveSolveAttemptInfo(result.attempts);
    return makeProvenanceEntry(info.technique, {
        solverVersion: ctx.solverVersion ?? null,
        scoringProfileId: info.scoringProfileId,
        orderingBiasId: info.orderingBiasId,
        beamWidth: info.beamWidth,
        mechanicBucketRetention: info.mechanicBucketRetention,
        gateKey: info.gateKey,
        attemptIndex: info.attemptIndex,
        nodesExpanded: info.nodesExpanded,
        elapsedMs: info.elapsedMs,
        budgetMs: info.allocatedBudgetMs,
        cumulativeNodesExpanded: result.nodesExpanded ?? null,
        cumulativeElapsedMs: result.totalMs ?? null,
        cumulativeBudgetMs: ctx.budgetMs ?? null,
        workSpent: result.workSpent ?? null,
        workBudget: result.workBudget ?? null,
        termination: result.status === 'success' ? 'solved' : (result.status ?? 'unknown'),
        // Winning repair seed is more specific than caller context.
        randomSeed: info.randomSeed ?? ctx.randomSeed ?? null,
        seedSalt: info.seedSalt,
        usedExistingHints: ctx.usedExistingHints ?? false,
        hintGuided: false,
        levelRevision: ctx.levelRevision ?? null,
        isolatedTechnique: ctx.isolatedTechnique ?? false,
        ...(info.repairMustTurnBiased !== null ? {
            forcingRepairMustTurnBiased: info.repairMustTurnBiased,
            forcingRepairTurnBiased: info.repairTurnBiased,
        } : {}),
        ...(info.attractionDiversity ? {
            forcingDisabledFeatures: [...ATTRACTION_DIVERSITY_CANDIDATE_FLAGS],
        } : {}),
        ...(info.retryTier !== null ? { forcingRetryTier: info.retryTier } : {}),
    });
}

/** Canonical Hints for every newly saved variety-search path. Prefix-anchored finds are hint-guided. */
export function hintsFromVarietyResult(result: VarietyResultLike, ctx: ProvenanceContext = {}): Hint[] {
    return result.newlySaved.map((path, i) => {
        const meta = result.newlySavedMeta[i];
        return toHint(path, [makeProvenanceEntry(meta.technique, {
            solverVersion: ctx.solverVersion ?? null,
            nodesExpanded: meta.nodesExpanded,
            elapsedMs: meta.elapsedMs,
            budgetMs: ctx.budgetMs ?? null,
            termination: 'solved',
            randomSeed: ctx.randomSeed ?? null,
            usedExistingHints: ctx.usedExistingHints ?? false,
            hintGuided: meta.technique === 'prefix-anchored',
            levelRevision: ctx.levelRevision ?? null,
            ...(meta.anchorSeed != null ? { forcingAnchorSeed: meta.anchorSeed, forcingAnchorDepth: meta.anchorDepth ?? null } : {}),
        })]);
    });
}
