// Plain-JS runtime implementation for canonical hint/provenance normalization.
//
// Keep persistence logic here because scripts/level-data-io.mjs is a native-Node boundary used by
// many maintained tools. modules/domain/hint-types.ts owns the TypeScript interfaces and typed
// wrappers/re-exports; do not fork normalization behavior between the two files.

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

/** @param {string} technique @param {MakeProvenanceEntryOptions} [opts] @returns {HintProvenanceEntry} */
export function makeProvenanceEntry(technique, opts = {}) {
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

/** @param {HintProvenanceEntry[]} entries @returns {HintProvenanceEntry[]} */
export function dedupeProvenanceEntries(entries) {
    const seen = new Set();
    const out = [];
    for (const entry of entries) {
        const key = JSON.stringify(entry);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(entry);
    }
    return out;
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
