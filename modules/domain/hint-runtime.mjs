// Plain-JS runtime implementation for canonical hint/provenance normalization.
//
// Keep persistence logic here because scripts/level-data-io.mjs is a native-Node boundary used by
// many maintained tools. modules/domain/hint-types.ts owns the TypeScript interfaces and typed
// wrappers/re-exports; do not fork normalization behavior between the two files.

import { stableStringify } from '../canonical-json.mjs';

/** @typedef {import('./hint-types.js').MakeProvenanceEntryOptions} MakeProvenanceEntryOptions */
/** @typedef {import('./hint-types.js').HintProvenanceEntry} HintProvenanceEntry */
/** @typedef {import('./hint-types.js').Hint} Hint */

export const SOLVER_ID = 'pathfinder-solver';
export const WITNESS_GENERATOR_ID = 'stress-generator-witness';
export const HUMAN_PLAYER_ID = 'human-player';
export const INHERITED_WITNESS_ID = 'sibling-inherited-witness';
export const TRANSFORMED_WITNESS_ID = 'sibling-transformed-witness';
export const EXTERNAL_SOLVER_ID = 'external-constraint-solver';

/** @param {MakeProvenanceEntryOptions} opts */
function forcingFromOpts(opts) {
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

// Bounded execution/run binding (docs/hint-evidence-execution-identity-storage-consolidation-plan.md
// section 4/W). Genuinely absent (no `execution` key at all, not `execution: null`) unless the caller
// actually supplies one of these -- historical entries and non-solver producers (human path, witness
// generators, external solvers) legitimately have no Pathfinder solver-request/execution-protocol
// identity to report, per that section's own text. Reuses the exact field names already established by
// the Phase 2 identity owners (solverRequestIdentityFromProjection(), hashExecutionProtocol()'s own
// `protocolHash`, sourceRunBindingFromContract()'s own `arm`) rather than inventing parallel spellings.
/** @param {MakeProvenanceEntryOptions} opts */
function executionFromOpts(opts) {
    const has = opts.solverRequestIdentity !== undefined || opts.protocolHash !== undefined
        || opts.reproducibilityMode !== undefined || opts.executionArm !== undefined;
    if (!has) return undefined;
    return {
        schemaVersion: 1,
        solverRequestIdentity: opts.solverRequestIdentity ?? null,
        protocolHash: opts.protocolHash ?? null,
        reproducibilityMode: opts.reproducibilityMode ?? null,
        arm: opts.executionArm ?? null,
    };
}

// One physical acquisition of this semantic discovery event (section W's "occurrence lineage"),
// carrying the source-run locator and lineage that must NOT become part of semantic-event identity
// (provenanceEventIdentity() below excludes `occurrences` for exactly this reason -- a rediscovery
// from a different run merges into this list rather than duplicating the whole provenance entry, and
// re-harvesting the SAME run is idempotent because dedupeProvenanceEntries()/mergeOccurrenceLineage()
// key on runId+runAttempt). `observedAt` defaults to `foundAt` (the entry's own discovery time) only
// for a single fresh construction; a later independently-merged occurrence keeps its own real
// observedAt, distinct from the original entry's `foundAt`, which never changes after first recording.
/** @param {MakeProvenanceEntryOptions} opts */
function occurrenceFromOpts(opts) {
    if (opts.occurrenceRunId === undefined) return undefined;
    return {
        schemaVersion: 1,
        runId: String(opts.occurrenceRunId),
        runAttempt: opts.occurrenceRunAttempt == null ? null : String(opts.occurrenceRunAttempt),
        contractRef: opts.occurrenceContractRef ?? null,
        observedAt: opts.occurrenceObservedAt ?? opts.foundAt ?? null,
        sourceRuns: Array.isArray(opts.occurrenceSourceRuns) ? [...opts.occurrenceSourceRuns] : null,
    };
}

/** @param {string} technique @param {MakeProvenanceEntryOptions} [opts] @returns {HintProvenanceEntry} */
export function makeProvenanceEntry(technique, opts = {}) {
    const foundAt = opts.foundAt ?? new Date().toISOString();
    const execution = executionFromOpts(opts);
    const occurrence = occurrenceFromOpts({ ...opts, foundAt });
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
            techniqueCensusCell: opts.techniqueCensusCell ?? null,
        },
        ...(execution !== undefined ? { execution } : {}),
        ...(occurrence !== undefined ? { occurrences: [occurrence] } : {}),
        foundAt,
    };
}

// Deterministic, property-insertion-order-independent serialization: JSON.stringify preserves
// each object's own key insertion order, so two entries that are semantically identical but built
// by different producers (a freshly constructed makeProvenanceEntry() vs. a legacy persisted
// record round-tripped through upgradeProvenanceEntry()'s `{ ...raw, solver, search }` spread, or
// simply re-serialized after a JSON round-trip through a different engine/library) can carry the
// SAME fields in a DIFFERENT order and hash to two different identity strings here -- silently
// defeating the duplicate guard both call sites rely on. stableStringify() (modules/canonical-json.mjs)
// sorts every object's own keys recursively, at every nesting level -- `solver.forcing` is itself a
// nested object -- which removes that dependency entirely while keeping array element ORDER
// significant, which matters because arrays in this shape represent meaningful sequences
// (`forcingDisabledFeatures`, `forcingFlippedFilters`) where reordering elements changes what
// actually happened.

/**
 * Canonical identity of one persisted discovery event.
 *
 * Host/time measurements are deliberately excluded. A retried workflow at the same solver commit,
 * config, seed, forcing, termination and deterministic search result is one discovery event even if
 * it was recorded at a different wall-clock instant or with slightly different timing/allocation
 * counters. solver.version and deterministic work/search fields remain included because cross-commit
 * rediscoveries and changed search trajectories are distinct evidence. `execution` (solver-request/
 * protocol identity, section 3.2/3.3) is likewise included: two runs whose ONLY difference is
 * execution/request semantics (e.g. a different ablation arm) are meant to be distinct events -- that
 * was this whole plan's original motivating gap (2026-09-22 determinism audit).
 *
 * `occurrences` (section W's occurrence lineage: source-run locators for each independent physical
 * acquisition of this SAME semantic event) is deliberately excluded, for the same reason `foundAt` is:
 * a physical run ID/observation time must never make an otherwise-identical rediscovery look like a
 * new semantic event. dedupeProvenanceEntries() below merges occurrence lineage across entries that
 * collapse to the same identity here, rather than losing it the way a naive dedupe would.
 *
 * This lives at the persistence boundary so every merge/reconcile path gets the same semantics.
 *
 * Serialized via stableStringify(), not raw JSON.stringify(), so two semantically identical
 * entries built by different producers (see that function's own comment) cannot hash to different
 * identities purely because of object key insertion order.
 *
 * @param {HintProvenanceEntry} entry
 * @returns {string}
 */
export function provenanceEventIdentity(entry) {
    // stableStringify() only returns undefined for a literal `undefined` root value; both call
    // sites here always pass a concrete object (or `null`, which stringifies to the string "null"),
    // so a string is guaranteed -- the cast documents that guarantee rather than widening this
    // function's own contract to match stableStringify's more permissive one.
    if (!entry || typeof entry !== 'object') return /** @type {string} */ (stableStringify(entry ?? null));
    const { foundAt: _foundAt, occurrences: _occurrences, ...rest } = entry;
    const {
        elapsedMs: _elapsedMs,
        cumulativeElapsedMs: _cumulativeElapsedMs,
        cumulativeNodesExpanded: _cumulativeNodesExpanded,
        cumulativeBudgetMs: _cumulativeBudgetMs,
        budgetMs: _budgetMs,
        ...search
    } = rest.search || {};
    return /** @type {string} */ (stableStringify({ ...rest, search }));
}

/** Canonical physical-acquisition identity within one semantic provenance event.
 *  @param {{runId: string, runAttempt: string | null}} occurrence
 *  @returns {string} */
export function hintOccurrenceKey(occurrence) {
    return `${occurrence.runId}::${occurrence.runAttempt ?? ''}`;
}

/**
 * Merge two entries' occurrence lineage, keyed by runId+runAttempt so re-harvesting the exact same
 * acquisition is idempotent (the first-seen record for a given key wins; this never overwrites).
 * Returns `undefined` when neither side has any occurrence, matching makeProvenanceEntry()'s own
 * "genuinely absent, not an empty array" convention.
 * @param {any[] | undefined} a
 * @param {any[] | undefined} b
 * @returns {any[] | undefined}
 */
function mergeOccurrenceLineage(a, b) {
    if (!a && !b) return undefined;
    const seen = new Map();
    for (const occurrence of a ?? []) seen.set(hintOccurrenceKey(occurrence), occurrence);
    for (const occurrence of b ?? []) {
        const key = hintOccurrenceKey(occurrence);
        if (!seen.has(key)) seen.set(key, occurrence);
    }
    return [...seen.values()];
}

/** @param {number[]} path */
export function hintPathSignature(path) {
    return path.join(',');
}

/** @param {number[]} path @param {HintProvenanceEntry[]} [provenance] @returns {Hint} */
export function toHint(path, provenance = []) {
    return { path, provenance };
}

/** @param {Hint[]} hints @returns {number[][]} */
export function hintPaths(hints) {
    return hints.map(h => h.path);
}

/**
 * Canonical mutation boundary for level-like objects carrying persisted hints.
 * Hint records are authoritative; the bare-path field is a derived compatibility/view projection.
 *
 * @param {Record<string, any>} level
 * @param {Hint[]} records
 * @returns {Hint[]}
 */
export function setLevelHintRecords(level, records) {
    if (!level || typeof level !== 'object' || Array.isArray(level)) throw new Error('level must be an object');
    if (!Array.isArray(records)) throw new Error('hint records must be an array');
    level.hintRecords = records;
    level.hints = hintPaths(records);
    return records;
}

/**
 * Remove duplicate recordings of the same discovery event while preserving evidence from genuinely
 * distinct finds. When two entries share the same semantic identity but carry different occurrence
 * lineage (section W: independent reacquisition of the same semantic event from another source run),
 * their `occurrences` merge into the kept entry rather than the later entry's lineage being silently
 * dropped -- the first-recorded entry's own fields (including `foundAt`) are otherwise unchanged.
 * @param {HintProvenanceEntry[]} entries @returns {HintProvenanceEntry[]}
 */
export function dedupeProvenanceEntries(entries) {
    const order = [];
    const byKey = new Map();
    for (const entry of entries) {
        const key = provenanceEventIdentity(entry);
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, entry);
            order.push(key);
            continue;
        }
        const merged = mergeOccurrenceLineage(existing.occurrences, entry.occurrences);
        if (merged !== undefined && merged.length !== (existing.occurrences ?? []).length) {
            byKey.set(key, { ...existing, occurrences: merged });
        }
    }
    return order.map(key => byKey.get(key));
}

/** @param {Hint[]} existing @param {Hint[]} incoming @returns {Hint[]} */
export function mergeHints(existing, incoming) {
    const bySig = new Map();
    const order = [];
    for (const hint of existing) {
        const sig = hintPathSignature(hint.path);
        if (!bySig.has(sig)) {
            bySig.set(sig, { path: hint.path, provenance: [...hint.provenance] });
            order.push(sig);
        }
    }
    for (const hint of incoming) {
        const sig = hintPathSignature(hint.path);
        const current = bySig.get(sig);
        if (current) current.provenance.push(...hint.provenance);
        else {
            bySig.set(sig, { path: hint.path, provenance: [...hint.provenance] });
            order.push(sig);
        }
    }
    return order.map(sig => {
        const hint = bySig.get(sig);
        return { path: hint.path, provenance: dedupeProvenanceEntries(hint.provenance) };
    });
}

/** @param {any} raw */
function isNestedProvenanceEntry(raw) {
    return !!raw && typeof raw === 'object' && raw.solver && typeof raw.solver === 'object';
}

/** @param {any} raw @returns {HintProvenanceEntry} */
export function upgradeProvenanceEntry(raw) {
    if (isNestedProvenanceEntry(raw)) {
        const legacySolver = raw.solver || {};
        const solver = {
            ...legacySolver,
            id: legacySolver.technique === WITNESS_GENERATOR_ID && legacySolver.id !== WITNESS_GENERATOR_ID
                ? WITNESS_GENERATOR_ID : legacySolver.id,
            scoringProfileId: legacySolver.scoringProfileId ?? legacySolver.profile ?? null,
            orderingBiasId: legacySolver.orderingBiasId ?? legacySolver.template ?? null,
            mechanicBucketRetention: legacySolver.mechanicBucketRetention ?? legacySolver.diverseBeam ?? null,
        };
        delete solver.profile;
        delete solver.template;
        delete solver.diverseBeam;
        return {
            ...raw,
            solver,
            search: legacySolver.technique === WITNESS_GENERATOR_ID && legacySolver.id !== WITNESS_GENERATOR_ID
                ? { ...raw.search, termination: 'witness' } : raw.search,
            // usedExistingHints/hintGuided/isolatedTechnique are deliberately NOT defaulted here.
            // Historical absence of these capability booleans means the legacy producer never
            // tracked the dimension at all -- it is unknown, not observed-false. Filling them with
            // `?? false` on every read (as this used to do) is exactly the "read-time convenience
            // becomes a mutable historical authority" defect described in
            // docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 13.1.B /
            // "Investigation closure: Provenance missingness and historical truth": a touched-file
            // write could then persist the laundered `false` as if it had been genuinely recorded,
            // which is measurably why the current corpus has ~507k explicit `isolatedTechnique:false`
            // against only ~32k still-absent, versus 505,993 absent at the September 11 audit.
            // `hasOwnBoolean`/`hasExplicitCapabilityContext` (scripts/hint-discovery-replayability-lib.mjs,
            // scripts/stress/provenance-source-taxonomy.mjs) already exist specifically to detect
            // "was this field ever actually recorded" via `Object.hasOwn` + typeof checks; defaulting
            // here silently defeated their entire purpose. `levelRevision`/`techniqueCensusCell` keep
            // `?? null` because null is their genuine canonical "no value" sentinel, not a laundered
            // boolean -- makeProvenanceEntry()'s own fresh-construction default already agrees.
            context: {
                ...(raw.context || {}),
                levelRevision: raw.context?.levelRevision ?? null,
                techniqueCensusCell: raw.context?.techniqueCensusCell ?? null,
            },
        };
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

// The 2026-07-11 flat-hintMetadata-to-schema-v3 migration (commit 7a651d391b49986626ceffbc4612352ddefb9bd4)
// upgraded then-existing schema-v1 hintMetadata lacking a discovery timestamp through this same
// upgradeProvenanceEntry() flat-shape branch, which supplies `new Date()` when foundAt is absent
// (see makeProvenanceEntry()'s own `?? new Date().toISOString()` default). That one-time migration
// run stamped a narrow window of migration/normalization time onto 662 provenance events across 102
// stress-corpus-1 files, not their real (unknown) discovery time. Those events are now stored in the
// current nested schema-v3 shape with that baked-in timestamp, so upgradeProvenanceEntry() no longer
// touches them on read -- consumers that treat any parseable foundAt as dated chronology must
// exclude this cohort explicitly instead. The exact 662/102 count was proven by reconstructing the
// pre-migration commit and is stable across a second reconstruction at the September 11 audit
// commit; see reports/2026-09-22-hint-evidence-consolidation-preimplementation-audit-001.md.
export const MIGRATION_SYNTHETIC_FOUND_AT_WINDOW = {
    min: Date.parse('2026-07-11T01:44:17.863Z'),
    max: Date.parse('2026-07-11T01:44:18.004Z'),
};

/**
 * True iff this provenance entry's `foundAt` is a known migration-synthetic timestamp from the
 * 2026-07-11 migration rather than a genuine discovery time. Consumers that build chronology/
 * longitudinal claims (earliest-discovery ordering, "fully dated" completeness, frontier claims)
 * must treat a matching entry as undated, not filter it out entirely -- the underlying solver/
 * technique metadata remains real evidence, only its timestamp is unknown.
 * @param {HintProvenanceEntry | null | undefined} entry
 */
export function isMigrationSyntheticFoundAt(entry) {
    const foundAt = entry?.foundAt;
    if (typeof foundAt !== 'string') return false;
    const ms = Date.parse(foundAt);
    return Number.isFinite(ms) && ms >= MIGRATION_SYNTHETIC_FOUND_AT_WINDOW.min && ms <= MIGRATION_SYNTHETIC_FOUND_AT_WINDOW.max;
}

/** @param {unknown} raw @returns {Hint[]} */
export function upgradeLegacyHints(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const entry of raw) {
        if (Array.isArray(entry)) {
            if (entry.length > 0) out.push(toHint(entry, []));
            continue;
        }
        if (entry && typeof entry === 'object' && Array.isArray(entry.path)) {
            const path = entry.path;
            const provenance = Array.isArray(entry.provenance)
                ? entry.provenance.map(upgradeProvenanceEntry)
                : [];
            if (path.length > 0) out.push(toHint(path, provenance));
        }
    }
    return out;
}


export const HINT_ARTIFACT_SCHEMA_VERSION = 4;

/** @param {unknown} value */
function jsonUtf8Bytes(value) {
    const json = JSON.stringify(value);
    return typeof TextEncoder === 'function' ? new TextEncoder().encode(json).length : json.length;
}

/** @param {Hint[]} records */
function encodeSparseInlineV4(records) {
    return {
        schemaVersion: HINT_ARTIFACT_SCHEMA_VERSION,
        representation: 'sparse-inline',
        hints: records.map(hint => ({
            path: hint.path,
            ...(Array.isArray(hint.provenance) && hint.provenance.length > 0
                ? { provenance: hint.provenance }
                : {}),
        })),
    };
}

/** @param {Hint[]} records */
function encodeInternedV4(records) {
    /** @type {{solver: any[], context: any[], execution: any[]}} */
    const tables = { solver: [], context: [], execution: [] };
    const indexes = {
        solver: new Map(),
        context: new Map(),
        execution: new Map(),
    };
    /** @param {'solver' | 'context' | 'execution'} kind @param {any} value */
    const intern = (kind, value) => {
        const key = stableStringify(value);
        const known = indexes[kind].get(key);
        if (known !== undefined) return known;
        const index = tables[kind].length;
        tables[kind].push(value);
        indexes[kind].set(key, index);
        return index;
    };

    const hints = records.map(hint => ({
        path: hint.path,
        ...(Array.isArray(hint.provenance) && hint.provenance.length > 0 ? {
            provenance: hint.provenance.map(entry => {
                const {
                    solver, search, context, execution, occurrences, foundAt,
                    ...extra
                } = entry;
                return {
                    solverRef: intern('solver', solver),
                    contextRef: intern('context', context),
                    ...(execution !== undefined ? { executionRef: intern('execution', execution) } : {}),
                    search,
                    ...(occurrences !== undefined ? { occurrences } : {}),
                    foundAt,
                    ...(Object.keys(extra).length > 0 ? { extra } : {}),
                };
            }),
        } : {}),
    }));

    return {
        schemaVersion: HINT_ARTIFACT_SCHEMA_VERSION,
        representation: 'interned',
        tables,
        hints,
    };
}

/**
 * Encode canonical semantic Hint[] as physical schema v4.
 *
 * Two lossless forms are supported. sparse-inline is deliberately conservative: it only omits
 * an empty provenance array, because historical own-property missingness inside provenance remains
 * epistemically meaningful. interned deduplicates exact solver/context/execution objects while
 * leaving high-cardinality search/occurrence data inline. The smaller deterministic JSON candidate
 * wins; ties prefer sparse-inline for easier review.
 *
 * @param {Hint[]} records
 */
export function encodeHintArtifact(records) {
    if (!Array.isArray(records)) throw new Error('hint records must be an array');
    const sparse = encodeSparseInlineV4(records);
    const interned = encodeInternedV4(records);
    return jsonUtf8Bytes(interned) < jsonUtf8Bytes(sparse) ? interned : sparse;
}

/** @param {any} obj */
function decodeV4HintArtifact(obj) {
    if (obj.representation === 'sparse-inline') {
        if (!Array.isArray(obj.hints)) throw new Error('schema v4 sparse-inline artifact must contain hints');
        return obj.hints.map((/** @type {any} */ hint) => {
            if (!hint || typeof hint !== 'object' || !Array.isArray(hint.path) || hint.path.length === 0) {
                throw new Error('schema v4 sparse-inline hint must contain a non-empty path');
            }
            return toHint(
                hint.path,
                Array.isArray(hint.provenance) ? hint.provenance.map(upgradeProvenanceEntry) : [],
            );
        });
    }
    if (obj.representation === 'interned') {
        const tables = obj.tables;
        if (!tables || !Array.isArray(tables.solver) || !Array.isArray(tables.context)
            || !Array.isArray(tables.execution) || !Array.isArray(obj.hints)) {
            throw new Error('schema v4 interned artifact has malformed tables/hints');
        }
        /** @param {'solver' | 'context' | 'execution'} kind @param {any} index */
        const getRef = (kind, index) => {
            if (!Number.isInteger(index) || index < 0 || index >= tables[kind].length) {
                throw new Error('schema v4 ' + kind + ' reference out of range');
            }
            return tables[kind][index];
        };
        return obj.hints.map((/** @type {any} */ hint) => {
            if (!hint || typeof hint !== 'object' || !Array.isArray(hint.path) || hint.path.length === 0) {
                throw new Error('schema v4 interned hint must contain a non-empty path');
            }
            const provenance = Array.isArray(hint.provenance) ? hint.provenance.map((/** @type {any} */ encoded) => {
                if (!encoded || typeof encoded !== 'object') throw new Error('schema v4 provenance entry must be an object');
                const entry = {
                    ...(encoded.extra && typeof encoded.extra === 'object' && !Array.isArray(encoded.extra)
                        ? encoded.extra : {}),
                    solver: getRef('solver', encoded.solverRef),
                    search: encoded.search,
                    context: getRef('context', encoded.contextRef),
                    ...(encoded.executionRef !== undefined
                        ? { execution: getRef('execution', encoded.executionRef) } : {}),
                    ...(encoded.occurrences !== undefined ? { occurrences: encoded.occurrences } : {}),
                    foundAt: encoded.foundAt,
                };
                return upgradeProvenanceEntry(entry);
            }) : [];
            return toHint(hint.path, provenance);
        });
    }
    throw new Error('unsupported schema v4 representation ' + JSON.stringify(obj.representation));
}

/**
 * Shared browser/Node decode boundary for a hint artifact's already-JSON.parse()d content, into
 * canonical Hint[]. Handles every historically-committed physical shape:
 *   - a bare path array (oldest legacy shape);
 *   - `{ hints: path[] }` (bare paths, no provenance);
 *   - `{ hints: path[], hintMetadata: [...] }` (transitional sibling-array shape: nested provenance
 *     reconstructed from the parallel hintMetadata entry at the same index);
 *   - `{ schemaVersion, hints: Hint[] }` (canonical v2/v3, upgraded via upgradeLegacyHints).
 *
 * This exists because scripts/level-data-io.mjs (Node) and modules/data-asset-loaders.ts (browser)
 * used to implement this independently, and had actually drifted: the browser side never handled
 * the hintMetadata sibling-array shape at all, so a hint file in that transitional shape would
 * silently lose all provenance if ever loaded by the browser (no currently-committed file exercises
 * this today -- data/hints, data/stress/hints, and data/stress/hints-random contain zero files with
 * a hintMetadata key -- but a future historical-enrichment or import path could reintroduce one, and
 * the divergence itself is exactly what
 * docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 2.5 warns about).
 * Physical schema v4 dispatch belongs here too once it exists (Phase 8); this is deliberately v1-v3
 * only for now, per that plan's Phase 1 scope.
 *
 * Throws a generic message on an unrecognized shape; callers that want a source-specific message
 * (e.g. a file path) should catch and rethrow with their own context.
 * @param {unknown} parsed
 * @returns {Hint[]}
 */
export function decodeHintArtifact(parsed) {
    if (Array.isArray(parsed)) return upgradeLegacyHints(parsed);
    if (parsed && typeof parsed === 'object' && /** @type {any} */ (parsed).schemaVersion === HINT_ARTIFACT_SCHEMA_VERSION) {
        return decodeV4HintArtifact(/** @type {any} */ (parsed));
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(/** @type {any} */ (parsed).hints)) {
        const obj = /** @type {any} */ (parsed);
        if (Array.isArray(obj.hintMetadata)) {
            return obj.hints.map((/** @type {number[]} */ hintPath, /** @type {number} */ i) => {
                const meta = obj.hintMetadata[i];
                return toHint(hintPath, meta ? [upgradeProvenanceEntry(meta)] : []);
            });
        }
        return upgradeLegacyHints(obj.hints);
    }
    throw new Error('hint artifact must contain a JSON array of hint paths or an object with a hints array');
}

/** @param {number[][]} paths @param {Hint[]} records @returns {Hint[]} */
export function reconcileHints(paths, records) {
    const provenanceBySig = new Map();
    for (const rec of records || []) {
        const sig = hintPathSignature(rec.path);
        const list = provenanceBySig.get(sig);
        if (list) list.push(...(rec.provenance || []));
        else provenanceBySig.set(sig, [...(rec.provenance || [])]);
    }
    const seen = new Set();
    const out = [];
    for (const path of paths || []) {
        const sig = hintPathSignature(path);
        if (seen.has(sig)) continue;
        seen.add(sig);
        out.push(toHint(path, dedupeProvenanceEntries(provenanceBySig.get(sig) || [])));
    }
    return out;
}
