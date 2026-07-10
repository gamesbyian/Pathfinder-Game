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
