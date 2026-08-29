// Canonical persisted hint: a path plus every independent discovery of that path.
// Provenance has three axes: solver/config, search cost/result, and run context.
// Unknown tracked fields are explicit null/false, not omitted. Pure geometry code still uses
// bare number[] paths; Hint is the persistence/transport boundary shape.
//
// Runtime normalization lives in plain JS so native-Node tooling can share the exact same logic
// without importing TypeScript directly.
import {
    SOLVER_ID as RUNTIME_SOLVER_ID,
    WITNESS_GENERATOR_ID as RUNTIME_WITNESS_GENERATOR_ID,
    HUMAN_PLAYER_ID as RUNTIME_HUMAN_PLAYER_ID,
    INHERITED_WITNESS_ID as RUNTIME_INHERITED_WITNESS_ID,
    TRANSFORMED_WITNESS_ID as RUNTIME_TRANSFORMED_WITNESS_ID,
    EXTERNAL_SOLVER_ID as RUNTIME_EXTERNAL_SOLVER_ID,
    makeProvenanceEntry as makeProvenanceEntryRuntime,
    hintPathSignature as hintPathSignatureRuntime,
    toHint as toHintRuntime,
    hintPaths as hintPathsRuntime,
    dedupeProvenanceEntries as dedupeProvenanceEntriesRuntime,
    mergeHints as mergeHintsRuntime,
    upgradeProvenanceEntry as upgradeProvenanceEntryRuntime,
    upgradeLegacyHints as upgradeLegacyHintsRuntime,
    reconcileHints as reconcileHintsRuntime,
} from './hint-runtime.mjs';

/** Production solver provenance id. */
export const SOLVER_ID = RUNTIME_SOLVER_ID;
/** Historical stress-generator witness id; spelling must match stored data. */
export const WITNESS_GENERATOR_ID = RUNTIME_WITNESS_GENERATOR_ID;
/** Human Play/submission solve, distinct from algorithmic provenance. */
export const HUMAN_PLAYER_ID = RUNTIME_HUMAN_PLAYER_ID;
/** Parent witness reused byte-for-byte in a generated variant. */
export const INHERITED_WITNESS_ID = RUNTIME_INHERITED_WITNESS_ID;
/** Parent witness deterministically transformed into variant coordinates. */
export const TRANSFORMED_WITNESS_ID = RUNTIME_TRANSFORMED_WITNESS_ID;
/** Independent external constraint-solver find; backend is recorded in technique. */
export const EXTERNAL_SOLVER_ID = RUNTIME_EXTERNAL_SOLVER_ID;

/** Deliberate search overrides. A non-null object means forcing is meaningful for this technique;
 * individual null fields mean that choice was not forced. */
export interface HintSolverForcing {
    /** Deliberately pinned gate cell key. */
    gateKey: number | null;
    /** Deliberately forced first-step neighbor cell key. */
    direction: number | null;
    /** Forced portal destination terminal. */
    portalDest: number | null;
    /** Forced neighbor after the portal destination. */
    portalExitDirection: number | null;
    /** Gate/goal-swapped search; false is meaningful, null means reversal is inapplicable. */
    reversed: boolean | null;
    /** Whether reversed search inverted flipping-filter starting parity. */
    flippedFilters: boolean | null;
    /** Solver feature ids deliberately disabled for this search. */
    disabledFeatures: string[] | null;
    /** Stable seed-hint id for prefix-anchored completion. */
    anchorSeed: string | null;
    /** Number of seed-prefix moves fixed before completion search. */
    anchorDepth: number | null;
    /** Repair exit-guidance-biased winner; false vs null distinguishes repair from non-repair. */
    repairMustTurnBiased: boolean | null;
    /** Turn-aware repair-biased winner; same false-vs-null convention. */
    repairTurnBiased: boolean | null;
    /** Force-enabled solveLevel retry tier; null for ordinary ladder/non-ladder finds. */
    retryTier: string | null;
}

export interface HintSolverProvenance {
    /** System that found the path. */
    id: string;
    /** Solver build id when available. */
    version: string | null;
    /** Search family. Pair with scoringProfileId/orderingBiasId/forcing for exact configuration. */
    technique: string;
    /** Scoring profile / admissible-order tie-break profile when applicable. */
    scoringProfileId: string | null;
    /** Structural ordering-bias id when applicable. */
    orderingBiasId: string | null;
    /** Beam width; null for non-beam searches. */
    beamWidth: number | null;
    /** Mechanic-bucket beam retention; false for plain beam, null for non-beam. */
    mechanicBucketRetention: boolean | null;
    /** Freely selected winning gate on multi-gate levels; distinct from forcing.gateKey. */
    gateKey: number | null;
    /** Deliberate search overrides, or null when the technique has no forcing concept. */
    forcing: HintSolverForcing | null;
    /** Winning orchestration attempt index when tracked. */
    attemptIndex: number | null;
}

export interface HintSearchProvenance {
    nodesExpanded: number | null;
    elapsedMs: number | null;
    /** Allotted wall-clock budget when known. */
    budgetMs: number | null;
    /** Comparable solver work units: applyMove + 12*isConnected. Prefer to wall time/nodes for cost comparison. */
    workSpent: number | null;
    workBudget: number | null;
    /** Full solve totals, distinct from the winning attempt's own cost. */
    cumulativeNodesExpanded: number | null;
    cumulativeElapsedMs: number | null;
    cumulativeBudgetMs: number | null;
    /** Search termination category. */
    termination: string;
    /** Search RNG seed when randomized. */
    randomSeed: number | null;
    /** Repair input salt needed for exact replay. 0 means default-salt repair; null means non-repair. */
    seedSalt: number | null;
}

export interface HintContextProvenance {
    /** Other hints were available to the run, even if this candidate did not use one. */
    usedExistingHints: boolean;
    /** This candidate was seeded/steered from an existing hint. */
    hintGuided: boolean;
    /** Canonical level fingerprint when found. */
    levelRevision: string | null;
    /** One technique ran outside the competitively-budgeted solveLevel ladder. Such finds are not
     * production-solver capability evidence even when solver.id === SOLVER_ID. */
    isolatedTechnique: boolean;
}

export interface HintProvenanceEntry {
    solver: HintSolverProvenance;
    search: HintSearchProvenance;
    context: HintContextProvenance;
    /** ISO 8601 recording time. */
    foundAt: string;
}

export interface Hint {
    path: number[];
    /** One entry per independent find; empty for legacy/unattributed hints. */
    provenance: HintProvenanceEntry[];
}

export interface MakeProvenanceEntryOptions {
    solverId?: string;
    solverVersion?: string | null;
    scoringProfileId?: string | null;
    orderingBiasId?: string | null;
    beamWidth?: number | null;
    mechanicBucketRetention?: boolean | null;
    gateKey?: number | null;
    /** Any forcing* option creates a non-null forcing object; unspecified forcing fields become null. */
    forcingGateKey?: number | null;
    forcingDirection?: number | null;
    forcingPortalDest?: number | null;
    forcingPortalExitDirection?: number | null;
    forcingReversed?: boolean | null;
    forcingFlippedFilters?: boolean | null;
    forcingDisabledFeatures?: string[] | null;
    forcingAnchorSeed?: string | null;
    forcingAnchorDepth?: number | null;
    forcingRepairMustTurnBiased?: boolean | null;
    forcingRepairTurnBiased?: boolean | null;
    forcingRetryTier?: string | null;
    attemptIndex?: number | null;
    nodesExpanded?: number | null;
    elapsedMs?: number | null;
    budgetMs?: number | null;
    workSpent?: number | null;
    workBudget?: number | null;
    cumulativeNodesExpanded?: number | null;
    cumulativeElapsedMs?: number | null;
    cumulativeBudgetMs?: number | null;
    termination?: string;
    randomSeed?: number | null;
    seedSalt?: number | null;
    usedExistingHints?: boolean;
    hintGuided?: boolean;
    levelRevision?: string | null;
    isolatedTechnique?: boolean;
    foundAt?: string;
}

export function makeProvenanceEntry(
    technique: string,
    opts: MakeProvenanceEntryOptions = {},
): HintProvenanceEntry {
    return makeProvenanceEntryRuntime(technique, opts) as HintProvenanceEntry;
}

export function hintPathSignature(path: number[]): string {
    return hintPathSignatureRuntime(path);
}

/** Wrap a bare path as a canonical Hint. */
export function toHint(path: number[], provenance: HintProvenanceEntry[] = []): Hint {
    return toHintRuntime(path, provenance) as Hint;
}

/** Return bare paths for geometry-only consumers. */
export function hintPaths(hints: Hint[]): number[][] {
    return hintPathsRuntime(hints);
}

/** Remove byte-identical provenance events while preserving order. */
export function dedupeProvenanceEntries(entries: HintProvenanceEntry[]): HintProvenanceEntry[] {
    return dedupeProvenanceEntriesRuntime(entries) as HintProvenanceEntry[];
}

/** Merge by path signature, appending/deduping provenance for rediscovered paths. */
export function mergeHints(existing: Hint[], incoming: Hint[]): Hint[] {
    return mergeHintsRuntime(existing, incoming) as Hint[];
}

/** Upgrade legacy flat/transitional provenance to the canonical nested shape. */
export function upgradeProvenanceEntry(raw: any): HintProvenanceEntry {
    return upgradeProvenanceEntryRuntime(raw) as HintProvenanceEntry;
}

/** Upgrade bare paths or older Hint/provenance shapes to canonical Hint[]. Malformed entries drop. */
export function upgradeLegacyHints(raw: unknown): Hint[] {
    return upgradeLegacyHintsRuntime(raw) as Hint[];
}

/** Reconcile authoritative path membership with provenance keyed by path signature. */
export function reconcileHints(paths: number[][], records: Hint[]): Hint[] {
    return reconcileHintsRuntime(paths, records) as Hint[];
}
