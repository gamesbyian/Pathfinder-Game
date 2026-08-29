export interface HintCandidateProvenance {
    generator: string;
    levelNumber?: number;
    mode?: string;
    seed?: number;
    target?: number;
    maxHints?: number;
    restarts?: number;
    nodeBudget?: number;
    seeds?: number;
    attemptBudgetMs?: number;
    baselineBudgetMs?: number;
    wallMs?: number;
    [key: string]: unknown;
}

export interface HintCandidateEvent {
    path: number[];
    generator: string;
    sequence: number;
    provenance: HintCandidateProvenance;
    exhausted?: boolean;
    diagnostics?: Record<string, unknown>;
    // The following mirror domain/hint-types.ts's HintSolverProvenance/HintSolverForcing fields —
    // hint-workbench.mjs's hintProvenanceEntryForEvent reads them straight off the event to build
    // the persisted HintProvenanceEntry. Optional/loosely-typed here (rather than importing the
    // domain types) since not every producer sets every field.
    technique?: string;
    scoringProfileId?: string | null;
    orderingBiasId?: string | null;
    beamWidth?: number | null;
    mechanicBucketRetention?: boolean | null;
    attemptIndex?: number | null;
    nodesExpanded?: number | null;
    elapsedMs?: number | null;
    budgetMs?: number | null;
    randomSeed?: number | null;
    seedSalt?: number | null;
    usedExistingHints?: boolean;
    hintGuided?: boolean;
    forcingGateKey?: number | null;
    forcingDirection?: number | null;
    forcingPortalDest?: number | null;
    forcingPortalExitDirection?: number | null;
    forcingReversed?: boolean | null;
    forcingFlippedFilters?: boolean | null;
    forcingDisabledFeatures?: string[] | null;
}

export function makeCandidateEvents(
    paths: number[][],
    { generator, levelNumber, provenance = {}, diagnostics = {} }: {
        generator: string;
        levelNumber?: number;
        provenance?: Record<string, unknown>;
        diagnostics?: Record<string, unknown>;
    },
): HintCandidateEvent[] {
    return paths.map((candidatePath, index) => ({
        path: candidatePath,
        generator,
        sequence: index + 1,
        provenance: {
            generator,
            levelNumber,
            ...provenance,
        },
        diagnostics,
    }));
}
