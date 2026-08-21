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
/** A path found by an OFF-THE-SHELF external constraint solver run against an independent,
 *  hand-written model of the rules (scripts/stress/minizinc/pathfinder.mzn, driven by
 *  scripts/stress/minizinc-probe.mjs) — currently MiniZinc over CP-SAT / Chuffed / Gecode.
 *
 *  Deliberately NOT SOLVER_ID: nothing in `modules/solver/` participated in the find, so counting
 *  it as a production-solver result would corrupt every "what can our solver find cold?" question
 *  the corpus is used to answer (CLAUDE.md's provenance section makes that exclusion mandatory, and
 *  it already lists `witness`/`human-solved` as the same kind of exclusion). Also not
 *  WITNESS_GENERATOR_ID: this path was *searched for* against the real constraints, not authored by
 *  the generator that built the level.
 *
 *  The specific backend lives in `technique` as `minizinc:<backend>` (e.g. `minizinc:chuffed`), so
 *  one id covers the family while the entry still records which engine actually solved it. A hint
 *  carrying this id is a legitimate hint — it is referee-validated by `validateCandidatePath` like
 *  any other before being stored — but it is NOT evidence our solver can reach it. */
export const EXTERNAL_SOLVER_ID = 'external-constraint-solver';

/**
 * Deliberate search-configuration overrides for techniques that explore by forcing specific
 * structural choices rather than letting the solver pick freely — the ablation-family
 * cascade/strategy/swap/portal/combined phases (modules/solver/hint-ablation-generator.ts,
 * modules/solver/diversification.ts). Every field is independently nullable: a given phase
 * only forces some of these (e.g. a portal-exit phase sets portalDest/portalExitDirection but
 * not gateKey/direction), so "this field is null" means "not forced by this technique," distinct
 * from the whole `forcing` object being null ("this technique has no forcing concept at all" —
 * enumerate-*, prefix-anchored, witness, human-player). Without this, every hint found by any
 * ablation phase collapsed to one indistinguishable flat provenance record — see CLAUDE.md's
 * hint-provenance section history for why that made technique-vs-result analysis unreliable.
 */
export interface HintSolverForcing {
    /** Cell key of the gate this search was pinned to (multi-gate levels only), when the
     *  technique deliberately fixed a specific gate rather than letting the solver choose. */
    gateKey: number | null;
    /** Cell key of the neighbor the first step was forced to move to from the gate (or the
     *  swapped level's start, when reversed is true), when the technique forced a specific
     *  first move rather than letting the solver choose among all of the gate's neighbors. */
    direction: number | null;
    /** Cell key of the portal destination terminal whose exit this search forced, when the
     *  technique deliberately fixed a specific portal jump's exit rather than letting the
     *  solver choose freely among all of that portal's onward neighbors. */
    portalDest: number | null;
    /** Cell key of the neighbor the portal exit at portalDest was forced to move to. */
    portalExitDirection: number | null;
    /** True iff this search solved the gate/goal-swapped (reversed) problem and reversed the
     *  resulting path back before validating, rather than solving forward from the real gate.
     *  false (not null) whenever the technique has a reversed/forward distinction at all and
     *  this particular find was the forward case — null only when reversal isn't a concept the
     *  technique tracks. */
    reversed: boolean | null;
    /** True iff flipping filters' starting parity was inverted for this reversed search (only
     *  meaningful when reversed is true — forward searches never flip). */
    flippedFilters: boolean | null;
    /** Solver feature flag id(s) (scripts/ablation-config.mjs FEATURE_GROUPS) deliberately
     *  disabled for this search, when the technique ablates solver features one at a time or
     *  cumulatively to find alternate solutions a fully-enabled solver wouldn't produce. */
    disabledFeatures: string[] | null;
    /** Prefix-anchored search only (variety-search System B): a stable compact id of the SEED HINT
     *  whose prefix this completion was anchored on. This is the true differentiator between
     *  otherwise-identical prefix-anchored finds of the same solution — without it, entries from
     *  different anchors look identical apart from an uninterpretable node-counter value. null for
     *  techniques that don't prefix-anchor. */
    anchorSeed: string | null;
    /** Prefix-anchored search only: how many moves of the seed's prefix were fixed before enumerating
     *  completions (the anchor depth k). Same (anchorSeed, anchorDepth) = the same anchor. null when
     *  the technique doesn't prefix-anchor. */
    anchorDepth: number | null;
    /** Repair-search only: true iff the winning attempt was repairMustTurnBiasedAttempt (the
     *  exit-guidance-biased variant, modules/solver/attempts.ts) rather than the plain repair
     *  attempt. false (not null) whenever the winning technique WAS a repair attempt and this
     *  wasn't the biased one; null only when the technique has no such distinction at all (dfs,
     *  beam, enumerate-family techniques, witness, prefix-anchored, human-player). Added to close
     *  a real analysis gap:
     *  before this, every repair winner's `technique` string collapsed to the same flat 'repair'
     *  (modules/solver/hint-provenance.ts's deriveSolveAttemptInfo), with no way to tell from the
     *  hint corpus whether the plain or a biased variant actually won — the exact question that
     *  blocked investigating whether repairMustTurnBiasedAttempt's risk-gated last-in-ladder
     *  placement is overly conservative (see CLAUDE.md's provenance section / this session's
     *  history for the investigation). */
    repairMustTurnBiased: boolean | null;
    /** Repair-search only: true iff the winning attempt was repairTurnBiasedAttempt (the
     *  STRATEGY_REPAIR_TURN_BIAS turn-aware selective-bias variant) rather than the plain repair
     *  attempt. Same false-vs-null convention as repairMustTurnBiased above. */
    repairTurnBiased: boolean | null;
    /** Which force-enabled last-resort retry tier of a solveLevel() ladder actually produced this
     *  find, when that ladder has such a concept — orthogonal to `technique` on
     *  HintSolverProvenance (dfs/beam/repair/admissible-order describes the search FAMILY; this
     *  describes WHICH PASS of the ladder won). One of orchestration.ts's `classifyAttemptTier`
     *  category strings (e.g. 'dedup-near-tie-retry', 'admissible-order-non-default-retry',
     *  'connectivity-axis-exhausted-retry', 'mc-neighbor-budget-retry', 'repair-late-probe',
     *  'repair-elite-prefix-dfs-retry') — each of these disables or reruns part of the ladder
     *  outside its normal rules for that one pass, so a hint found only there is not evidence an
     *  ordinary cold solve reaches it. null for an ordinary main-ladder/repair-fallback/admissible-
     *  order/attraction-diversity/repair-probe win (`classifyAttemptTier` returned one of those,
     *  or 'main-ladder') and for any technique that isn't a solveLevel() ladder attempt at all
     *  (enumerate-*, prefix-anchored, witness, human-player). See
     *  docs/solver-optimization-current-queue.md's Priority 0 for why this exists: before this
     *  field, every retry-tier find collapsed into the same provenance shape as an ordinary
     *  production solve, with no way to tell them apart from the stored hint alone. */
    retryTier: string | null;
}

export interface HintSolverProvenance {
    /** Which system found this path — SOLVER_ID, WITNESS_GENERATOR_ID, or a future alternative. */
    id: string;
    /** Solver build identifier (git SHA / package version), when available. null until a build-time
     *  version-stamping step exists — see CLAUDE.md's hint-provenance follow-up note. */
    version: string | null;
    /** Search family: e.g. 'enumerate-targeted', 'enumerate-complete', 'prefix-anchored', 'dfs',
     *  'beam', 'repair', 'admissible-order', 'ablation-ui:<phase>', 'ablation-full:<phase>'. Not
     *  stable enough alone to identify a search's exact configuration — pair with
     *  profile/template/forcing ('admissible-order' pairs with `profile`, which for this technique
     *  means the tie-break profile — see admissible-order-search.ts — not the primary ordering,
     *  which is always admissible slack). */
    technique: string;
    /** Policy profile name (solver/policy.ts's POLICY_PROFILES), when the technique used one. */
    profile: string | null;
    /** Structural template id, when the technique used one. */
    template: string | null;
    /** Beam search width, when the winning attempt was a beam config (dfs configs have no beam
     *  width at all — null there, not 0, since 0 isn't a real width any config uses). */
    beamWidth: number | null;
    /** True iff the winning beam attempt used diverse-beam candidate selection (bucketed by
     *  flipperUsedMask/mustCrossMask — search.ts's _diverseSelect) rather than plain top-k. false
     *  (not null) for a non-diverse beam winner; null for a non-beam winner (dfs/repair have no
     *  such concept). Same false-vs-null convention as HintSolverForcing's repair-bias fields. */
    diverseBeam: boolean | null;
    /** Which gate the winning attempt actually used, on a multi-gate level — the solver's own
     *  free choice among the level's gates, NOT a deliberately forced one (see HintSolverForcing.
     *  gateKey for that distinct concept: a technique that pins a SPECIFIC gate on purpose, e.g. an
     *  ablation/diversification phase). null for a single-gate level or when the winning gate isn't
     *  tracked (enumerate-family techniques, witness, prefix-anchored — none attribute a find to
     *  one gate). */
    gateKey: number | null;
    /** Deliberate gate/direction/portal-exit/feature-ablation overrides this search used, when
     *  the technique has such a concept — see HintSolverForcing. null for techniques that don't
     *  (enumerate-*, prefix-anchored, witness, human-player). */
    forcing: HintSolverForcing | null;
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
    /** Work units spent / allotted (solver/work-meter.ts: applyMove + 12*isConnected). THE
     *  comparable cost fields: unlike `elapsedMs` these do not depend on host speed or load, and
     *  unlike `nodesExpanded` they mean the same thing across dfs/beam/repair — which counted
     *  11-17x different amounts of real work per "node". Prefer these for any cost analysis;
     *  `scripts/stress/hint-cost-drift.mjs`'s signal is mostly machine noise without them. */
    workSpent: number | null;
    workBudget: number | null;
    /** Full solve invocation totals, distinct from the winning attempt's own cost above. */
    cumulativeNodesExpanded: number | null;
    cumulativeElapsedMs: number | null;
    cumulativeBudgetMs: number | null;
    /** Why the search producing this candidate stopped: 'solved' | 'exhaustive' | 'budget' |
     *  'cancelled' | 'capped' | 'target' | 'saturated' | 'witness' | 'unknown'. */
    termination: string;
    /** The RNG seed driving this search, when the technique is randomized; null otherwise. */
    randomSeed: number | null;
    /** Repair-search only: the seedSalt input to repairPrimarySeed(gateKey, seedSalt) — the direct,
     *  practical value needed to replay this exact search (e.g. SolveOpts.primeAttempt.seedSalt),
     *  vs. randomSeed above which is the derived PRNG seed. Storing both avoids requiring a reader
     *  to invert repairPrimarySeed's arithmetic (technically possible — the multiplier is odd, so
     *  it has a modular inverse mod 2^32 — but that's an obscure derivation nobody should need to
     *  do by hand just to replay a stored hint). Explicit 0 (not null) when the winner was a
     *  repair attempt that ran at the default salt — the raw Attempt object only sets its OWN
     *  seedSalt field when nonzero (orchestration.ts), but collapsing that into the same null used
     *  for "wasn't a repair attempt at all" would make this field ambiguous in a permanent record;
     *  deriveSolveAttemptInfo resolves the distinction explicitly. null only when the winner wasn't
     *  a repair attempt. */
    seedSalt: number | null;
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
    /** True iff this find came from running ONE technique in isolation (e.g. the technique-census
     *  tooling's per-cell sweep, scripts/combine-technique-census-shards.mjs), rather than the
     *  real, full, competitively-budgeted `solveLevel()` production ladder every attempt shares a
     *  cumulative node/work budget against. An isolated technique can solve a level the real
     *  ladder cannot (it never has to compete for budget with every other tier), so a `true` here
     *  means this entry is NOT evidence the production solver can find the level cold, even though
     *  `solver.id` is still SOLVER_ID (the same underlying search code ran) — see
     *  docs/solver-optimization-current-queue.md's Priority 0, which traces exactly this
     *  contamination (a technique-census win persisted and later misread as ordinary
     *  production-solver capability evidence, e.g. R02900). false for every real solveLevel()
     *  caller (the two interactive solve UIs, hint-workbench, portfolio-solve-sweep). */
    isolatedTechnique: boolean;
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
    beamWidth?: number | null;
    diverseBeam?: boolean | null;
    gateKey?: number | null;
    /** See HintSolverForcing — pass any subset; forcing is built (and set non-null) iff at least
     *  one forcing* option is present, undefined ones default to null within it. */
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

function forcingFromOpts(opts: MakeProvenanceEntryOptions): HintSolverForcing | null {
    const hasForcing = opts.forcingGateKey !== undefined || opts.forcingDirection !== undefined
        || opts.forcingPortalDest !== undefined || opts.forcingPortalExitDirection !== undefined
        || opts.forcingReversed !== undefined || opts.forcingFlippedFilters !== undefined
        || opts.forcingDisabledFeatures !== undefined
        || opts.forcingAnchorSeed !== undefined || opts.forcingAnchorDepth !== undefined
        || opts.forcingRepairMustTurnBiased !== undefined || opts.forcingRepairTurnBiased !== undefined
        || opts.forcingRetryTier !== undefined;
    if (!hasForcing) return null;
    return {
        gateKey: opts.forcingGateKey ?? null,
        direction: opts.forcingDirection ?? null,
        portalDest: opts.forcingPortalDest ?? null,
        portalExitDirection: opts.forcingPortalExitDirection ?? null,
        reversed: opts.forcingReversed ?? null,
        flippedFilters: opts.forcingFlippedFilters ?? null,
        disabledFeatures: opts.forcingDisabledFeatures ?? null,
        anchorSeed: opts.forcingAnchorSeed ?? null,
        anchorDepth: opts.forcingAnchorDepth ?? null,
        repairMustTurnBiased: opts.forcingRepairMustTurnBiased ?? null,
        repairTurnBiased: opts.forcingRepairTurnBiased ?? null,
        retryTier: opts.forcingRetryTier ?? null,
    };
}

export function makeProvenanceEntry(technique: string, opts: MakeProvenanceEntryOptions = {}): HintProvenanceEntry {
    return {
        solver: {
            id: opts.solverId ?? SOLVER_ID,
            version: opts.solverVersion ?? null,
            technique,
            profile: opts.profile ?? null,
            template: opts.template ?? null,
            beamWidth: opts.beamWidth ?? null,
            diverseBeam: opts.diverseBeam ?? null,
            gateKey: opts.gateKey ?? null,
            forcing: forcingFromOpts(opts),
            attemptIndex: opts.attemptIndex ?? null,
        },
        search: {
            nodesExpanded: opts.nodesExpanded ?? null,
            elapsedMs: opts.elapsedMs ?? null,
            budgetMs: opts.budgetMs ?? null,
            workSpent: opts.workSpent ?? null,
            workBudget: opts.workBudget ?? null,
            cumulativeNodesExpanded: opts.cumulativeNodesExpanded ?? null,
            cumulativeElapsedMs: opts.cumulativeElapsedMs ?? null,
            cumulativeBudgetMs: opts.cumulativeBudgetMs ?? null,
            termination: opts.termination ?? 'unknown',
            randomSeed: opts.randomSeed ?? null,
            seedSalt: opts.seedSalt ?? null,
        },
        context: {
            usedExistingHints: opts.usedExistingHints ?? false,
            hintGuided: opts.hintGuided ?? false,
            levelRevision: opts.levelRevision ?? null,
            isolatedTechnique: opts.isolatedTechnique ?? false,
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

/** Drops byte-identical provenance entries (the SAME discovery event recorded twice), keeping the
 *  first and preserving order. Two genuinely independent rediscoveries differ in at least foundAt,
 *  seed, or a search metric, so only true duplicates collapse — a re-append of an identical entry
 *  (observed accumulating in the prefix-anchored path, same foundAt to the millisecond) does not
 *  bloat the list. Entries here are all produced by makeProvenanceEntry, so key order is stable and
 *  JSON.stringify is an exact identity test. */
export function dedupeProvenanceEntries(entries: HintProvenanceEntry[]): HintProvenanceEntry[] {
    const seen = new Set<string>();
    const out: HintProvenanceEntry[] = [];
    for (const e of entries) {
        const key = JSON.stringify(e);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(e);
    }
    return out;
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
    return order.map(sig => { const h = bySig.get(sig)!; return { path: h.path, provenance: dedupeProvenanceEntries(h.provenance) }; });
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
        out.push(toHint(path, dedupeProvenanceEntries(provenanceBySig.get(sig) || [])));
    }
    return out;
}
