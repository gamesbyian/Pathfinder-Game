// Canonical shape for a stored/transported hint: a solution path plus the record of every time
// it was independently found. Multiple search techniques can land on the identical path — when
// that happens the finds are appended to `provenance`, never dropped, so cost/technique data for
// every discovery survives even after novelty-dedup picks one path to keep.
//
// Provenance is deliberately structured into three axes (see docs discussion on solver lineage)
// rather than one flat "technique" string, because they vary independently and each answers a
// different question:
//   - solver:  WHICH system found it, and under what configuration (family/profile/template) —
//              "a beam search using the perimeterSweep profile", not just "the solver".
//   - search:  WHAT the search actually cost and how it ended — nodes/time are far more portable
//              across machines than wall-clock alone, so both are kept, plus the termination
//              reason and budget (900ms under a 1s cap means something different from 900ms under
//              a 30s cap) and the random seed when the technique is randomized.
//   - context: whether this run was seeded/guided by an already-known hint (a hint-guided find is
//              not independent evidence the same way a cold find is) and which exact level shape
//              (levelRevision, the canonical level fingerprint) it was found against, so a hint
//              can't silently keep pointing at a level that has since been edited.
//
// Unknown fields are always explicit `null`/`false`, never omitted — an omitted field would read
// as "not applicable" when it may just mean "not tracked by this technique yet".
//
// Pure-geometry consumers (hint-novelty.ts, hint-selection.ts, path-features.ts, heatmap.ts, and
// the existing Node hint-discovery scripts) still operate on bare `number[]` paths — that stays
// their parameter type unchanged. `Hint` is the boundary shape used wherever a hint is read from
// or written to persistent storage (hint files, Firestore submissions/review, editor session
// state) — see hintPaths()/mergeHints() below for crossing that boundary in either direction.

/** The production solver's identifier for HintSolverProvenance.id. Distinguished from
 *  WITNESS_GENERATOR_ID because a witness path is authored by level generation, not found by
 *  search — collapsing them into one "solver" label would erase that distinction. */
export const SOLVER_ID = 'pathfinder-solver';
/** Matches the technique label the stress-corpus witness paths have always been stored under
 *  (scripts/stress/witness.mjs) — kept identical to that historical string, not just similar, so
 *  upgradeProvenanceEntry's isWitness check actually matches every existing witness entry. */
export const WITNESS_GENERATOR_ID = 'stress-generator-witness';
/** A path found by an actual human, not any solver technique: an ordinary Play-mode win
 *  (win-controller.ts's saveWinAsHintIfNovel) or a level submission's own solve path
 *  (submission-controller.ts). Distinguished from SOLVER_ID/WITNESS_GENERATOR_ID because it's the
 *  strongest possible cross-validation signal for solution-profile-lib.mjs's provenance-source
 *  bucketing — a human solving a level with zero connection to any solver heuristic is stronger
 *  evidence a pattern is level-forced (not a search-technique artifact) than two algorithmic
 *  techniques agreeing. */
export const HUMAN_PLAYER_ID = 'human-player';
/** A witness path carried over UNCHANGED from a parent level into a generated sibling/cousin
 *  variant (scripts/family-generate.mjs) — see docs/sibling-cousin-system.md section 11a.
 *  Distinguished from both WITNESS_GENERATOR_ID (a witness invented by the stress-corpus random
 *  walker) and SOLVER_ID (a witness found by search): neither claim is true here. The path is
 *  proven valid purely by construction — the parent's own already-validated witness is
 *  re-checked against the domain referee after every object-placement mutation — not searched
 *  for and not freshly generated. */
export const INHERITED_WITNESS_ID = 'sibling-inherited-witness';
/** A witness path carried over from a parent level into a generated variant via a KNOWN,
 *  deterministic coordinate transform (rotation/reflection for a symmetry sibling; translation
 *  for a re-embedded-witness cousin) — the coordinates differ from the parent's, but nothing was
 *  searched for or invented, only mechanically re-derived. Distinguished from
 *  INHERITED_WITNESS_ID (coordinates literally unchanged) because a reader comparing two
 *  provenance entries for "the same witness" should be able to tell, from the id alone, whether
 *  the path is byte-identical to some ancestor's or merely structurally equivalent to it. */
export const TRANSFORMED_WITNESS_ID = 'sibling-transformed-witness';

export interface HintSolverProvenance {
    /** Which system found this path — SOLVER_ID, WITNESS_GENERATOR_ID, or a future alternative. */
    id: string;
    /** Solver build identifier (git SHA / package version), when available. null until a build-time
     *  version-stamping step exists — see CLAUDE.md's hint-provenance follow-up note. */
    version: string | null;
    /** Search family: e.g. 'enumerate-targeted', 'enumerate-complete', 'prefix-anchored', 'dfs',
     *  'beam', 'repair', 'ablation-ui:<phase>'. Not stable enough alone to identify a search's
     *  exact configuration — pair with profile/template. */
    technique: string;
    /** Policy profile name (solver/policy.ts's POLICY_PROFILES), when the technique used one. */
    profile: string | null;
    /** Structural template id, when the technique used one. */
    template: string | null;
    /** Index into the orchestration attempt ladder that won, when applicable (single-hint solve only). */
    attemptIndex: number | null;
}

export interface HintSearchProvenance {
    /** null when the technique didn't track a node count (e.g. a witness path). */
    nodesExpanded: number | null;
    /** null when the technique didn't track wall-clock time. */
    elapsedMs: number | null;
    /** The wall-clock or node budget the search was allotted, when known — makes elapsedMs/
     *  nodesExpanded interpretable (a near-budget finish means something different from a fast one). */
    budgetMs: number | null;
    /** Full solve invocation totals, distinct from the winning attempt's own cost above. */
    cumulativeNodesExpanded: number | null;
    cumulativeElapsedMs: number | null;
    cumulativeBudgetMs: number | null;
    /** Why the search producing this candidate stopped: 'solved' | 'exhaustive' | 'budget' |
     *  'cancelled' | 'capped' | 'target' | 'saturated' | 'witness' | 'unknown'. */
    termination: string;
    /** The RNG seed driving this search, when the technique is randomized; null otherwise. */
    randomSeed: number | null;
}

export interface HintContextProvenance {
    /** True iff other hints were already known to this run (available for seeding/comparison),
     *  regardless of whether THIS specific candidate was seeded from one — see hintGuided. */
    usedExistingHints: boolean;
    /** True iff this specific candidate's search was seeded/steered from an existing hint (e.g.
     *  prefix-anchored replay) — such a find is not independent evidence the way a cold find is. */
    hintGuided: boolean;
    /** Canonical level fingerprint (domain/level-fingerprint.ts) at the time this hint was found,
     *  so a stored hint can't silently keep pointing at a level shape that has since been edited. */
    levelRevision: string | null;
}

export interface HintProvenanceEntry {
    solver: HintSolverProvenance;
    search: HintSearchProvenance;
    context: HintContextProvenance;
    /** ISO 8601 timestamp of when this find was recorded. */
    foundAt: string;
}

export interface Hint {
    path: number[];
    /** One entry per independent find of this exact path. May be empty for legacy/unattributed hints. */
    provenance: HintProvenanceEntry[];
}

export interface MakeProvenanceEntryOptions {
    solverId?: string;
    solverVersion?: string | null;
    profile?: string | null;
    template?: string | null;
    attemptIndex?: number | null;
    nodesExpanded?: number | null;
    elapsedMs?: number | null;
    budgetMs?: number | null;
    cumulativeNodesExpanded?: number | null;
    cumulativeElapsedMs?: number | null;
    cumulativeBudgetMs?: number | null;
    termination?: string;
    randomSeed?: number | null;
    usedExistingHints?: boolean;
    hintGuided?: boolean;
    levelRevision?: string | null;
    foundAt?: string;
}

export function makeProvenanceEntry(technique: string, opts: MakeProvenanceEntryOptions = {}): HintProvenanceEntry {
    return {
        solver: {
            id: opts.solverId ?? SOLVER_ID,
            version: opts.solverVersion ?? null,
            technique,
            profile: opts.profile ?? null,
            template: opts.template ?? null,
            attemptIndex: opts.attemptIndex ?? null,
        },
        search: {
            nodesExpanded: opts.nodesExpanded ?? null,
            elapsedMs: opts.elapsedMs ?? null,
            budgetMs: opts.budgetMs ?? null,
            cumulativeNodesExpanded: opts.cumulativeNodesExpanded ?? null,
            cumulativeElapsedMs: opts.cumulativeElapsedMs ?? null,
            cumulativeBudgetMs: opts.cumulativeBudgetMs ?? null,
            termination: opts.termination ?? 'unknown',
            randomSeed: opts.randomSeed ?? null,
        },
        context: {
            usedExistingHints: opts.usedExistingHints ?? false,
            hintGuided: opts.hintGuided ?? false,
            levelRevision: opts.levelRevision ?? null,
        },
        foundAt: opts.foundAt ?? new Date().toISOString(),
    };
}

export function hintPathSignature(path: number[]): string {
    return path.join(',');
}

/** Wraps a bare path into a canonical Hint. `provenance` defaults to empty (unattributed). */
export function toHint(path: number[], provenance: HintProvenanceEntry[] = []): Hint {
    return { path, provenance };
}

/** Unwraps Hint[] down to bare paths for pure path-geometry consumers. */
export function hintPaths(hints: Hint[]): number[][] {
    return hints.map(h => h.path);
}

/**
 * Merges `incoming` into `existing` by path signature: a brand-new path is appended as a new
 * Hint; a path that already exists has the incoming provenance entries appended to its list
 * (so a second technique finding the same solution is recorded, not discarded). Order-preserving:
 * existing hints keep their position, new ones are appended in `incoming` order.
 */
export function mergeHints(existing: Hint[], incoming: Hint[]): Hint[] {
    const bySig = new Map<string, Hint>();
    const order: string[] = [];
    for (const hint of existing) {
        const sig = hintPathSignature(hint.path);
        if (!bySig.has(sig)) { bySig.set(sig, { path: hint.path, provenance: [...hint.provenance] }); order.push(sig); }
    }
    for (const hint of incoming) {
        const sig = hintPathSignature(hint.path);
        const current = bySig.get(sig);
        if (current) current.provenance.push(...hint.provenance);
        else { bySig.set(sig, { path: hint.path, provenance: [...hint.provenance] }); order.push(sig); }
    }
    return order.map(sig => bySig.get(sig)!);
}

/** True iff `raw` already has the nested {solver,search,context,foundAt} provenance-entry shape. */
function isNestedProvenanceEntry(raw: any): boolean {
    return !!raw && typeof raw === 'object' && raw.solver && typeof raw.solver === 'object';
}

/**
 * Upgrades one legacy provenance entry to the current nested shape. Handles the flat
 * {technique, nodesExpanded, solveTimeMs, foundAt} shape (this schema's first cut) and the
 * transitional stress-corpus {solverTechnique, nodesExpanded, solveTimeMs, metadataStatus} shape
 * (pre-dates any Hint object at all). Already-nested entries pass through unchanged.
 */
export function upgradeProvenanceEntry(raw: any): HintProvenanceEntry {
    if (isNestedProvenanceEntry(raw)) {
        // A short-lived migration bug tagged witness entries with solver.id: SOLVER_ID and
        // search.termination: 'unknown' before WITNESS_GENERATOR_ID's spelling was corrected to
        // match the historical technique string — repair it here rather than leaving stray
        // already-nested files with an inconsistent id/technique pairing.
        if (raw.solver?.technique === WITNESS_GENERATOR_ID && raw.solver.id !== WITNESS_GENERATOR_ID) {
            return { ...raw, solver: { ...raw.solver, id: WITNESS_GENERATOR_ID }, search: { ...raw.search, termination: 'witness' } };
        }
        return raw as HintProvenanceEntry;
    }
    const technique = raw?.technique || raw?.solverTechnique || 'unknown';
    const isWitness = technique === WITNESS_GENERATOR_ID || raw?.metadataStatus === 'witness';
    return makeProvenanceEntry(technique, {
        solverId: isWitness ? WITNESS_GENERATOR_ID : SOLVER_ID,
        nodesExpanded: raw?.nodesExpanded ?? null,
        elapsedMs: raw?.elapsedMs ?? raw?.solveTimeMs ?? null,
        termination: isWitness ? 'witness' : 'unknown',
        foundAt: typeof raw?.foundAt === 'string' ? raw.foundAt : undefined,
    });
}

/**
 * Upgrades legacy hint data — a bare path (`number[]`), a bare path list, or an already-canonical
 * Hint (whose provenance entries may themselves be an older shape) — into canonical Hint[].
 * Unknown/malformed entries are dropped. Used wherever a hint file, Firestore document, or wire
 * payload might still carry a pre-provenance or pre-schema-v3 shape.
 */
export function upgradeLegacyHints(raw: unknown): Hint[] {
    if (!Array.isArray(raw)) return [];
    const out: Hint[] = [];
    for (const entry of raw) {
        if (Array.isArray(entry)) { if (entry.length > 0) out.push(toHint(entry, [])); continue; }
        if (entry && typeof entry === 'object' && Array.isArray((entry as any).path)) {
            const path = (entry as any).path;
            const provenance = Array.isArray((entry as any).provenance)
                ? (entry as any).provenance.map(upgradeProvenanceEntry)
                : [];
            if (path.length > 0) out.push(toHint(path, provenance));
        }
    }
    return out;
}

/**
 * Reconciles a plain path list (the source of truth for WHICH paths exist — many callers only
 * ever touch plain `number[][]`) against a canonical Hint[] (the source of truth for provenance,
 * keyed by path signature) into the final Hint[] to persist. A path with no matching record (a
 * caller added a bare path without attaching provenance) is kept with an empty provenance list
 * rather than losing the path or throwing — this is the one shared reconciliation step every
 * write boundary (hint files, Firestore submission/review) uses, so provenance can't be silently
 * dropped by a caller that only knows about plain paths.
 */
export function reconcileHints(paths: number[][], records: Hint[]): Hint[] {
    const provenanceBySig = new Map<string, HintProvenanceEntry[]>();
    for (const rec of records || []) {
        const sig = hintPathSignature(rec.path);
        const list = provenanceBySig.get(sig);
        if (list) list.push(...(rec.provenance || []));
        else provenanceBySig.set(sig, [...(rec.provenance || [])]);
    }
    const seen = new Set<string>();
    const out: Hint[] = [];
    for (const path of paths || []) {
        const sig = hintPathSignature(path);
        if (seen.has(sig)) continue;
        seen.add(sig);
        out.push(toHint(path, provenanceBySig.get(sig) || []));
    }
    return out;
}
