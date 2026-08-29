// Canonical persisted hint: a path plus every independent discovery of that path.
// Provenance has three axes: solver/config, search cost/result, and run context.
// Unknown tracked fields are explicit null/false, not omitted. Pure geometry code still uses
// bare number[] paths; Hint is the persistence/transport boundary shape.

/** Production solver provenance id. */
export const SOLVER_ID = 'pathfinder-solver';
/** Historical stress-generator witness id; spelling must match stored data. */
export const WITNESS_GENERATOR_ID = 'stress-generator-witness';
/** Human Play/submission solve, distinct from algorithmic provenance. */
export const HUMAN_PLAYER_ID = 'human-player';
/** Parent witness reused byte-for-byte in a generated variant. */
export const INHERITED_WITNESS_ID = 'sibling-inherited-witness';
/** Parent witness deterministically transformed into variant coordinates. */
export const TRANSFORMED_WITNESS_ID = 'sibling-transformed-witness';
/** Independent external constraint-solver find; backend is recorded in technique. */
export const EXTERNAL_SOLVER_ID = 'external-constraint-solver';

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
            scoringProfileId: opts.scoringProfileId ?? null,
            orderingBiasId: opts.orderingBiasId ?? null,
            beamWidth: opts.beamWidth ?? null,
            mechanicBucketRetention: opts.mechanicBucketRetention ?? null,
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

/** Wrap a bare path as a canonical Hint. */
export function toHint(path: number[], provenance: HintProvenanceEntry[] = []): Hint {
    return { path, provenance };
}

/** Return bare paths for geometry-only consumers. */
export function hintPaths(hints: Hint[]): number[][] {
    return hints.map(h => h.path);
}

/** Remove byte-identical provenance events while preserving order. */
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

/** Merge by path signature, appending/deduping provenance for rediscovered paths. */
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

function isNestedProvenanceEntry(raw: any): boolean {
    return !!raw && typeof raw === 'object' && raw.solver && typeof raw.solver === 'object';
}

/** Upgrade legacy flat/transitional provenance. Nested entries are normalized too:
 * historical profile/template/diverseBeam fields are accepted on read, but canonical callers
 * receive scoringProfileId/orderingBiasId/mechanicBucketRetention only. */
export function upgradeProvenanceEntry(raw: any): HintProvenanceEntry {
    if (isNestedProvenanceEntry(raw)) {
        const legacySolver = raw.solver || {};
        const solver: HintSolverProvenance = {
            ...legacySolver,
            id: legacySolver.technique === WITNESS_GENERATOR_ID && legacySolver.id !== WITNESS_GENERATOR_ID
                ? WITNESS_GENERATOR_ID : legacySolver.id,
            scoringProfileId: legacySolver.scoringProfileId ?? legacySolver.profile ?? null,
            orderingBiasId: legacySolver.orderingBiasId ?? legacySolver.template ?? null,
            mechanicBucketRetention: legacySolver.mechanicBucketRetention ?? legacySolver.diverseBeam ?? null,
        };
        delete (solver as any).profile;
        delete (solver as any).template;
        delete (solver as any).diverseBeam;
        return {
            ...raw,
            solver,
            search: legacySolver.technique === WITNESS_GENERATOR_ID && legacySolver.id !== WITNESS_GENERATOR_ID
                ? { ...raw.search, termination: 'witness' } : raw.search,
        } as HintProvenanceEntry;
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

/** Upgrade bare paths or older Hint/provenance shapes to canonical Hint[]. Malformed entries drop. */
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

/** Reconcile authoritative path membership with provenance keyed by path signature. Paths lacking
 * a matching record are preserved with empty provenance; duplicate paths collapse. */
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
