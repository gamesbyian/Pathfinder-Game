// Maps solver/variety-search results into the canonical Hint provenance schema.
import { makeProvenanceEntry, toHint } from '../domain/hint-types.js';
import { GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS } from './attempts.js';
import { classifyAttemptTier, classifyHistoricalAttemptTier } from './orchestration.js';
import { normalizeHistoricalPersistedAttempt } from './historical-attempt-normalization.mjs';
import type { Hint, HintProvenanceEntry, HintTechniqueCensusCellContext } from '../domain/hint-types.js';
import type { Attempt } from './orchestration.js';

/** Current provenance construction consumes the canonical Attempt vocabulary only. */
type AttemptLike = Partial<Attempt> & {
    ok?: boolean;
    /** In-memory carrier attached by technique-census result normalization. Non-enumerable there so
     * combined-cells.json is not bloated; persisted only on the resulting Hint provenance. */
    techniqueCensusCell?: HintTechniqueCensusCellContext | null;
};

/** Persisted evidence may predate canonical Attempt field/stage names. Historical entrypoints only. */
type HistoricalAttemptLike = Omit<AttemptLike, 'stageId'> & {
    stageId?: Attempt['stageId'] | string;
    profile?: string;
    template?: string | null;
    diverseBeam?: boolean;
    dedupNearTieRetry?: boolean;
    attractionDiversity?: boolean;
    mainLoopLateReserve?: boolean;
    repairProbe?: boolean;
    repairProbeShrinkRecovery?: boolean;
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
    /** Exact source-observed discovery time for historical/replayed evidence. Current in-memory
     * producers normally omit this and makeProvenanceEntry() stamps construction time. */
    foundAt?: string;
    /** True for one-technique isolated runs, not the competitively-budgeted production ladder. */
    isolatedTechnique?: boolean;
    /** Explicit source cell for census-derived solves. Normally supplied by the winning attempt's
     * in-memory carrier so callers outside the census do not need to know about census structure. */
    techniqueCensusCell?: HintTechniqueCensusCellContext | null;
    /** Bounded execution/run binding (docs/hint-evidence-execution-identity-storage-consolidation-
     * plan.md section 4/W). Mirrors MakeProvenanceEntryOptions exactly: `undefined` only, never
     * `null` -- makeProvenanceEntry()'s executionFromOpts()/occurrenceFromOpts() key their presence
     * check on `undefined`, so an explicit `null` here would wrongly claim "known absent" for a fact
     * this context genuinely has no way to know. */
    solverRequestIdentity?: string;
    protocolHash?: string;
    reproducibilityMode?: string;
    executionArm?: string;
    /** Physical acquisition/run lineage. `occurrenceRunId` must only be set when a real run id is
     * known (never `null`) -- see the same undefined-vs-null caution above. */
    occurrenceRunId?: string;
    occurrenceRunAttempt?: string | number | null;
    occurrenceContractRef?: string | null;
    occurrenceSourceRuns?: string[] | null;
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
    goalAttractionDisabledRetry: boolean;
    /** Force-enabled last-resort retry tier, else null. */
    retryTier: string | null;
    /** Exact source cell for an isolated technique-census winner, when attached in memory. */
    techniqueCensusCell: HintTechniqueCensusCellContext | null;
}

/** Retry categories that change normal ladder rules; ordinary tiers and goal-attraction-disabled-retry are excluded. */
const RETRY_TIER_LABELS = new Set([
    'late-repair-search', 'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry',
    'connectivity-axis-prune-disabled-retry', 'coarse-state-near-tie-retention-disabled-retry', 'admissible-order-alternate-tiebreak-retry',
]);

/** Convert one already-canonical winner plus an explicit tier label into provenance metadata. */
function solveAttemptInfoFromWinner(winner: AttemptLike, attemptIndex: number, attemptTierLabel: string): SolveAttemptInfo {
    const technique = winner.repair ? 'repair' : (winner.beamWidth ? 'beam' : (winner.admissibleOrder ? 'admissible-order-fallback' : 'dfs'));
    return {
        technique,
        scoringProfileId: winner.scoringProfileId ?? null,
        orderingBiasId: winner.orderingBiasId ?? null,
        beamWidth: winner.beamWidth ?? null,
        mechanicBucketRetention: winner.beamWidth ? !!winner.mechanicBucketRetention : null,
        gateKey: winner.gateKey ?? null,
        attemptIndex: attemptIndex >= 0 ? attemptIndex : null,
        elapsedMs: winner.elapsedMs ?? null,
        nodesExpanded: winner.nodesExpanded ?? null,
        allocatedBudgetMs: winner.allocatedBudgetMs ?? null,
        randomSeed: winner.randomSeed ?? null,
        seedSalt: winner.repair ? (winner.seedSalt ?? 0) : null,
        repairMustTurnBiased: winner.repair ? !!winner.repairMustTurnBiased : null,
        repairTurnBiased: winner.repair ? !!winner.repairTurnBiased : null,
        goalAttractionDisabledRetry: attemptTierLabel === 'goal-attraction-disabled-retry' || winner.goalAttractionDisabledRetry === true,
        retryTier: RETRY_TIER_LABELS.has(attemptTierLabel) ? attemptTierLabel : null,
        techniqueCensusCell: winner.techniqueCensusCell ?? null,
    };
}

function unknownSolveAttemptInfo(): SolveAttemptInfo {
    return {
        technique: 'solve-unknown', scoringProfileId: null, orderingBiasId: null, beamWidth: null, mechanicBucketRetention: null,
        gateKey: null, attemptIndex: null, elapsedMs: null, nodesExpanded: null, allocatedBudgetMs: null,
        randomSeed: null, seedSalt: null, repairMustTurnBiased: null, repairTurnBiased: null, goalAttractionDisabledRetry: false,
        retryTier: null, techniqueCensusCell: null,
    };
}

/** Extract metadata from a CURRENT canonical solve result. */
export function deriveSolveAttemptInfo(attempts: AttemptLike[] | undefined): SolveAttemptInfo {
    const list = attempts || [];
    const winner = list.find(a => a.outcome === 'success' || (a.outcome === undefined && a.ok));
    if (!winner) return unknownSolveAttemptInfo();
    return solveAttemptInfoFromWinner(winner, list.indexOf(winner), classifyAttemptTier(winner as Pick<Attempt, 'stageId'>));
}

/** Explicit historical boundary for persisted solve results. Retired Attempt names do not flow past here. */
export function deriveHistoricalSolveAttemptInfo(attempts: HistoricalAttemptLike[] | undefined): SolveAttemptInfo {
    const list = attempts || [];
    const winner = list.find(a => a.outcome === 'success' || (a.outcome === undefined && a.ok));
    if (!winner) return unknownSolveAttemptInfo();
    const normalized = normalizeHistoricalPersistedAttempt(winner) as AttemptLike;
    const tier = classifyHistoricalAttemptTier(winner);
    return solveAttemptInfoFromWinner(normalized, list.indexOf(winner), tier);
}

function provenanceFromSolveAttemptInfo(result: Omit<SolveResultLike, 'attempts'>, info: SolveAttemptInfo, ctx: ProvenanceContext): HintProvenanceEntry {
    return makeProvenanceEntry(info.technique, {
        solverVersion: ctx.solverVersion ?? null,
        foundAt: ctx.foundAt,
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
        techniqueCensusCell: info.techniqueCensusCell ?? ctx.techniqueCensusCell ?? null,
        // Passed through directly (no `?? null`): an omitted ctx field must stay `undefined` here too,
        // since makeProvenanceEntry()'s presence checks distinguish "never supplied" from "known null".
        solverRequestIdentity: ctx.solverRequestIdentity,
        protocolHash: ctx.protocolHash,
        reproducibilityMode: ctx.reproducibilityMode,
        executionArm: ctx.executionArm,
        occurrenceRunId: ctx.occurrenceRunId,
        occurrenceRunAttempt: ctx.occurrenceRunAttempt,
        occurrenceContractRef: ctx.occurrenceContractRef,
        occurrenceSourceRuns: ctx.occurrenceSourceRuns,
        ...(info.repairMustTurnBiased !== null ? {
            forcingRepairMustTurnBiased: info.repairMustTurnBiased,
            forcingRepairTurnBiased: info.repairTurnBiased,
        } : {}),
        ...(info.goalAttractionDisabledRetry ? {
            forcingDisabledFeatures: [...GOAL_ATTRACTION_DISABLED_RETRY_CANDIDATE_FLAGS],
        } : {}),
        ...(info.retryTier !== null ? { forcingRetryTier: info.retryTier } : {}),
    });
}

/** Provenance for a CURRENT solveLevel() result. Historical Attempt fields are rejected by type/contract. */
export function provenanceFromSolveResult(result: SolveResultLike, ctx: ProvenanceContext = {}): HintProvenanceEntry {
    return provenanceFromSolveAttemptInfo(result, deriveSolveAttemptInfo(result.attempts), ctx);
}

/** Named historical ingress for persisted solve results that may carry retired Attempt fields. */
export function provenanceFromHistoricalSolveResult(
    result: Omit<SolveResultLike, 'attempts'> & { attempts?: HistoricalAttemptLike[] },
    ctx: ProvenanceContext = {},
): HintProvenanceEntry {
    return provenanceFromSolveAttemptInfo(result, deriveHistoricalSolveAttemptInfo(result.attempts), ctx);
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
