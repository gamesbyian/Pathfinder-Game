// Bridges solver output (orchestration.ts's SolveResult, variety-search.ts's VarietyResult) to the
// canonical Hint/HintProvenanceEntry shape (domain/hint-types.ts). Both solve paths already compute
// real nodesExpanded/elapsedMs internally (orchestration's per-attempt Attempt records; variety-
// search's newlySavedMeta) — this module is only the one place that turns that existing data into
// provenance entries, so every caller (UI solver-controller, hint-workbench.mjs, future scripts)
// attaches it the same way instead of re-deriving it ad hoc per call site.
import { makeProvenanceEntry, toHint } from '../domain/hint-types.js';
import { ATTRACTION_DIVERSITY_CANDIDATE_FLAGS } from './attempts.js';
import { classifyAttemptTier } from './orchestration.js';
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
    /** True iff this `result` came from running ONE technique in isolation rather than the real,
     *  full, competitively-budgeted solveLevel() production ladder — see
     *  HintContextProvenance.isolatedTechnique's own comment for why this matters and defaults to
     *  false. Set true from tooling like scripts/combine-technique-census-shards.mjs; every real
     *  solveLevel() caller (solver-controller.ts/review-controller.ts, hint-workbench.mjs,
     *  portfolio-solve-sweep.mjs) leaves this unset. */
    isolatedTechnique?: boolean;
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
    /** Which force-enabled last-resort retry tier won, if any — see
     *  HintSolverForcing.retryTier's own comment. null for an ordinary main-ladder/repair-fallback/
     *  admissible-order/attraction-diversity/repair-probe win (orchestration.ts's
     *  classifyAttemptTier returned one of those, or its 'main-ladder' default). */
    retryTier: string | null;
}

// The subset of classifyAttemptTier's categories that are genuine force-enabled last-resort
// retries — mechanisms that change the ladder's own rules (extra/extended budget, a disabled
// prune or retention feature, a rerun of profiles the main pass already tried) for one bounded
// rerun after everything else has failed. Deliberately EXCLUDES 'admissible-order'/'repair-probe'/
// 'repair-fallback'/'main-ladder' (ordinary tiers every solve can reach in its normal course) and
// 'attraction-diversity' (already captured via its own dedicated forcingDisabledFeatures field —
// see attractionDiversity's own comment above). See HintSolverForcing.retryTier's own comment for
// why this distinction (and the whole field) exists.
const RETRY_TIER_LABELS = new Set([
    'repair-late-probe', 'repair-elite-prefix-dfs-retry', 'mc-neighbor-budget-retry',
    'connectivity-axis-exhausted-retry', 'dedup-near-tie-retry', 'admissible-order-non-default-retry',
]);

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
            retryTier: null,
        };
    }
    const technique = winner.repair ? 'repair' : (winner.beamWidth ? 'beam' : (winner.admissibleOrder ? 'admissible-order' : 'dfs'));
    const attemptTierLabel = classifyAttemptTier(winner);
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
        retryTier: RETRY_TIER_LABELS.has(attemptTierLabel) ? attemptTierLabel : null,
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
        isolatedTechnique: ctx.isolatedTechnique ?? false,
        // Only set (non-null forcing) when the winner was actually a repair attempt, came from the
        // attraction-diversity pass, or won via a force-enabled last-resort retry tier — see
        // SolveAttemptInfo's own comments. All three are orthogonal (a repair winner CAN also be an
        // AD-pass or retry-tier winner), so these are independently gated, not mutually exclusive.
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
