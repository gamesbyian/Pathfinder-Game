// Bridges solver output (orchestration.ts's SolveResult, variety-search.ts's VarietyResult) to the
// canonical Hint/HintProvenanceEntry shape (domain/hint-types.ts). Both solve paths already compute
// real nodesExpanded/elapsedMs internally (orchestration's per-attempt Attempt records; variety-
// search's newlySavedMeta) — this module is only the one place that turns that existing data into
// provenance entries, so every caller (UI solver-controller, hint-workbench.mjs, future scripts)
// attaches it the same way instead of re-deriving it ad hoc per call site.
import { makeProvenanceEntry, toHint } from '../domain/hint-types.js';
import { ATTRACTION_DIVERSITY_CANDIDATE_FLAGS } from './attempts.js';
import type { Hint, HintProvenanceEntry } from '../domain/hint-types.js';
import type { Attempt } from './orchestration.js';

// Tests and older callers intentionally construct partial attempts, but every supported field and
// its type comes from orchestration's exported Attempt contract rather than a second hand-written
// telemetry schema here.
type AttemptLike = Pick<Attempt, 'profile' | 'ok'> & Partial<Omit<Attempt, 'profile' | 'ok'>>;

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
    beamWidth: number | null;
    diverseBeam: boolean | null;
    gateKey: number | null;
    attemptIndex: number | null;
    elapsedMs: number | null;
    nodesExpanded: number | null;
    allocatedBudgetMs: number | null;
    randomSeed: number | null;
    seedSalt: number | null;
    /** Which repair variant won, when the winner was a repair attempt at all — see
     *  HintSolverForcing.repairMustTurnBiased's own comment for why this exists (a real gap:
     *  `technique` alone collapses every repair winner to the same 'repair' string, discarding
     *  exactly the distinction needed to ask "how often does the biased variant actually win").
     *  null (not false) when the winner wasn't a repair attempt — dfs/beam have no such concept. */
    repairMustTurnBiased: boolean | null;
    repairTurnBiased: boolean | null;
    /** Whether the winner came from the last-resort attraction-diversity rerun — orthogonal to the
     *  repair fields above (a dfs/beam/repair winner can equally have this true). Maps onto
     *  HintSolverForcing.disabledFeatures (ATTRACTION_DIVERSITY_CANDIDATE_FLAGS) rather than its own
     *  new field, since "which solver feature flags were deliberately disabled for this search" is
     *  exactly what that field already means and the AD pass IS precisely that. */
    attractionDiversity: boolean;
}

/** Identifies the winning attempt from a single-hint solve (orchestration.ts's solveLevel): its
 *  search family (dfs/beam/repair/admissible-order) plus policy profile/structural template, kept
 *  as separate fields rather than one flattened string so "which family" and "which configuration"
 *  can be queried independently. Falls back to 'solve-unknown' if no attempt succeeded (shouldn't
 *  happen for a caller that only asks for provenance on ok:true results, but never throws). */
export function deriveSolveAttemptInfo(attempts: AttemptLike[] | undefined): SolveAttemptInfo {
    const list = attempts || [];
    const winner = list.find(a => a.outcome === 'success' || (a.outcome === undefined && a.ok));
    if (!winner) {
        return {
            technique: 'solve-unknown', profile: null, template: null, beamWidth: null, diverseBeam: null,
            gateKey: null, attemptIndex: null, elapsedMs: null, nodesExpanded: null, allocatedBudgetMs: null,
            randomSeed: null, seedSalt: null, repairMustTurnBiased: null, repairTurnBiased: null, attractionDiversity: false,
        };
    }
    const technique = winner.repair ? 'repair' : (winner.beamWidth ? 'beam' : (winner.admissibleOrder ? 'admissible-order' : 'dfs'));
    const attemptIndex = list.indexOf(winner);
    return {
        technique,
        profile: winner.profile ?? null,
        template: winner.template ?? null,
        beamWidth: winner.beamWidth ?? null,
        diverseBeam: winner.beamWidth ? !!winner.diverseBeam : null,
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
    };
}

/** Builds the provenance entry for the single solution returned by solveLevel()/Solver.solve(). */
export function provenanceFromSolveResult(result: SolveResultLike, ctx: ProvenanceContext = {}): HintProvenanceEntry {
    const info = deriveSolveAttemptInfo(result.attempts);
    return makeProvenanceEntry(info.technique, {
        solverVersion: ctx.solverVersion ?? null,
        profile: info.profile,
        template: info.template,
        beamWidth: info.beamWidth,
        diverseBeam: info.diverseBeam,
        gateKey: info.gateKey,
        attemptIndex: info.attemptIndex,
        nodesExpanded: info.nodesExpanded,
        elapsedMs: info.elapsedMs,
        budgetMs: info.allocatedBudgetMs,
        cumulativeNodesExpanded: result.nodesExpanded ?? null,
        cumulativeElapsedMs: result.totalMs ?? null,
        cumulativeBudgetMs: ctx.budgetMs ?? null,
        // The machine-independent, cross-technique-comparable cost pair — see hint-types.ts's
        // HintSearchProvenance.workSpent. Taken from the whole solve, the same scope as
        // cumulativeNodesExpanded.
        workSpent: result.workSpent ?? null,
        workBudget: result.workBudget ?? null,
        // Map the orchestration SolveResult.status onto the documented HintSearchProvenance
        // termination vocabulary (hint-types.ts): a solve reports status 'success', but the schema's
        // success value is 'solved' (what every enumeration technique writes) — normalize so the two
        // solver paths don't record the same outcome under two different strings.
        termination: result.status === 'success' ? 'solved' : (result.status ?? 'unknown'),
        // Prefer the winning attempt's own recorded seed (repair attempts) over the caller's ctx —
        // the sweep passes ctx.randomSeed: null, so without this a repair solve's seed was lost.
        randomSeed: info.randomSeed ?? ctx.randomSeed ?? null,
        seedSalt: info.seedSalt,
        usedExistingHints: ctx.usedExistingHints ?? false,
        hintGuided: false,
        levelRevision: ctx.levelRevision ?? null,
        // Only set (non-null forcing) when the winner was actually a repair attempt or came from
        // the attraction-diversity pass — see SolveAttemptInfo's own comments. The two are
        // orthogonal (a repair winner CAN also be an AD-pass winner), so disabledFeatures and the
        // repair-bias fields are independently gated, not mutually exclusive.
        ...(info.repairMustTurnBiased !== null ? {
            forcingRepairMustTurnBiased: info.repairMustTurnBiased,
            forcingRepairTurnBiased: info.repairTurnBiased,
        } : {}),
        ...(info.attractionDiversity ? {
            forcingDisabledFeatures: [...ATTRACTION_DIVERSITY_CANDIDATE_FLAGS],
        } : {}),
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
            // Which seed hint this prefix-anchored completion was anchored on — the real
            // differentiator between otherwise-identical prefix-anchored finds. Only set (non-null)
            // for prefix-anchored candidates, so forcing stays null for cold enumeration finds.
            ...(meta.anchorSeed != null ? { forcingAnchorSeed: meta.anchorSeed, forcingAnchorDepth: meta.anchorDepth ?? null } : {}),
        })]);
    });
}
