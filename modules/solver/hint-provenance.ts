// Bridges solver output (orchestration.ts's SolveResult, variety-search.ts's VarietyResult) to the
// canonical Hint/HintProvenanceEntry shape (domain/hint-types.ts). Both solve paths already compute
// real nodesExpanded/elapsedMs internally (orchestration's per-attempt Attempt records; variety-
// search's newlySavedMeta) — this module is only the one place that turns that existing data into
// provenance entries, so every caller (UI solver-controller, hint-workbench.mjs, future scripts)
// attaches it the same way instead of re-deriving it ad hoc per call site.
import { makeProvenanceEntry, toHint } from '../domain/hint-types.js';
import type { Hint, HintProvenanceEntry } from '../domain/hint-types.js';

interface AttemptLike {
    profile: string;
    template?: string | null;
    beamWidth?: number | null;
    repair?: boolean;
    ok: boolean;
    elapsedMs?: number | null;
    nodesExpanded?: number | null;
    allocatedBudgetMs?: number | null;
}

interface SolveResultLike {
    // Duck-typed against orchestration.ts's (unexported) Attempt[] — callers pass the real
    // SolveResult, whose `attempts` TypeScript only knows as `unknown[]` at the ports.ts boundary.
    attempts?: any[];
    nodesExpanded?: number;
    totalMs?: number;
    status?: string;
}

interface VarietySavedMetaLike { nodesExpanded: number | null; elapsedMs: number | null; technique: string; }

interface VarietyResultLike {
    newlySaved: number[][];
    newlySavedMeta: VarietySavedMetaLike[];
}

/** Caller-supplied context a solve/search result can't derive on its own: what level shape this
 *  ran against, whether other hints were already known, the budget it was given, and (for
 *  randomized techniques) the seed driving it. All optional — omitted fields stay explicit `null`
 *  in the resulting provenance rather than silently reading as "not applicable". */
export interface ProvenanceContext {
    levelRevision?: string | null;
    usedExistingHints?: boolean;
    randomSeed?: number | null;
    budgetMs?: number | null;
    /** Solver build identifier (git SHA) — callers pass modules/build-info.ts's SOLVER_VERSION
     *  (browser) or their own git-SHA lookup (Node scripts); null when unknown. */
    solverVersion?: string | null;
}

interface SolveAttemptInfo {
    technique: string;
    profile: string | null;
    template: string | null;
    attemptIndex: number | null;
    elapsedMs: number | null;
    nodesExpanded: number | null;
    allocatedBudgetMs: number | null;
}

/** Identifies the winning attempt from a single-hint solve (orchestration.ts's solveLevel): its
 *  search family (dfs/beam/repair) plus policy profile/structural template, kept as separate
 *  fields rather than one flattened string so "which family" and "which configuration" can be
 *  queried independently. Falls back to 'solve-unknown' if no attempt succeeded (shouldn't happen
 *  for a caller that only asks for provenance on ok:true results, but never throws). */
export function deriveSolveAttemptInfo(attempts: AttemptLike[] | undefined): SolveAttemptInfo {
    const list = attempts || [];
    const winner = list.find(a => a.ok);
    if (!winner) return { technique: 'solve-unknown', profile: null, template: null, attemptIndex: null, elapsedMs: null, nodesExpanded: null, allocatedBudgetMs: null };
    const technique = winner.repair ? 'repair' : (winner.beamWidth ? 'beam' : 'dfs');
    const attemptIndex = list.indexOf(winner);
    return {
        technique,
        profile: winner.profile ?? null,
        template: winner.template ?? null,
        attemptIndex: attemptIndex >= 0 ? attemptIndex : null,
        elapsedMs: winner.elapsedMs ?? null,
        nodesExpanded: winner.nodesExpanded ?? null,
        allocatedBudgetMs: winner.allocatedBudgetMs ?? null,
    };
}

/** Builds the provenance entry for the single solution returned by solveLevel()/Solver.solve(). */
export function provenanceFromSolveResult(result: SolveResultLike, ctx: ProvenanceContext = {}): HintProvenanceEntry {
    const info = deriveSolveAttemptInfo(result.attempts);
    return makeProvenanceEntry(info.technique, {
        solverVersion: ctx.solverVersion ?? null,
        profile: info.profile,
        template: info.template,
        attemptIndex: info.attemptIndex,
        nodesExpanded: info.nodesExpanded,
        elapsedMs: info.elapsedMs,
        budgetMs: info.allocatedBudgetMs,
        cumulativeNodesExpanded: result.nodesExpanded ?? null,
        cumulativeElapsedMs: result.totalMs ?? null,
        cumulativeBudgetMs: ctx.budgetMs ?? null,
        termination: result.status ?? 'unknown',
        randomSeed: ctx.randomSeed ?? null,
        usedExistingHints: ctx.usedExistingHints ?? false,
        hintGuided: false,
        levelRevision: ctx.levelRevision ?? null,
    });
}

/** Builds canonical Hints (path + one provenance entry) for every newly-saved path in a
 *  variety-search result, using its already-tracked per-candidate nodesExpanded/elapsedMs/technique.
 *  `prefix-anchored` candidates are marked hintGuided: true — they were seeded from an existing
 *  hint's prefix, so they're not independent evidence the way a cold enumeration find is. */
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
        })]);
    });
}
