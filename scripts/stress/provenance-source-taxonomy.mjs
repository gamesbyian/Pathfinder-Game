import {
    SOLVER_ID,
    WITNESS_GENERATOR_ID,
    HUMAN_PLAYER_ID,
    INHERITED_WITNESS_ID,
    TRANSFORMED_WITNESS_ID,
    EXTERNAL_SOLVER_ID,
} from '../../modules/domain/hint-types.ts';
import { classifyProvenanceClass } from './provenance-classes.mjs';

export const VARIANT_REPLAY_SOLVER_ID = 'variant-corpus-diagnostic';

/**
 * Discovery origin answers WHO/WHAT produced the stored path. It is deliberately independent of
 * search modality and capability admissibility. For example a Pathfinder-solver event can be both
 * randomized and isolated; a variant replay can also be hint-guided. Those facts must not erase
 * one another by competing for one mutually-exclusive bucket.
 */
export const PROVENANCE_ORIGINS = [
    'witness',
    'inherited-witness',
    'transformed-witness',
    'human-solved',
    'external-constraint-solver',
    'variant-parent-replay',
    'pathfinder-solver',
    'other',
];

/** Static event facets. retryTier identity is additionally preserved in retryTierEvents telemetry. */
export const PROVENANCE_FACETS = [
    'complete-enumeration',
    'hint-guided',
    'used-existing-hints',
    'randomized',
    'isolated-technique',
    'production-retry-tier',
];

/** Questions for which persisted discovery events are commonly consumed as evidence. */
export const EVIDENCE_PURPOSES = [
    'positive-oracle',
    'solution-atlas',
    'current-production-capability',
    'technique-performance',
    'longitudinal-process',
];

export const EVIDENCE_APPLICABILITY = ['admissible', 'context-bound', 'inadmissible'];

// Compatibility aliases for callers written while this module still called every bucket a source.
// Source now means origin only; modality belongs in PROVENANCE_FACETS.
export const PROVENANCE_SOURCES = PROVENANCE_ORIGINS;

export function classifyProvenanceOrigin(entry) {
    if (!entry) return 'other';
    const solverId = entry.solver?.id;
    const technique = entry.solver?.technique || '';

    if (solverId === WITNESS_GENERATOR_ID) return 'witness';
    if (solverId === INHERITED_WITNESS_ID) return 'inherited-witness';
    if (solverId === TRANSFORMED_WITNESS_ID) return 'transformed-witness';
    if (solverId === HUMAN_PLAYER_ID) return 'human-solved';
    if (solverId === EXTERNAL_SOLVER_ID) return 'external-constraint-solver';
    if (solverId === VARIANT_REPLAY_SOLVER_ID || technique.startsWith('variant-parent-replay:')) return 'variant-parent-replay';
    if (solverId === SOLVER_ID) return 'pathfinder-solver';
    return 'other';
}

/** @deprecated Prefer classifyProvenanceOrigin; kept so existing profile callers do not break. */
export const classifyProvenanceSource = classifyProvenanceOrigin;

export function provenanceFacets(entry) {
    const facets = new Set();
    if (!entry) return facets;
    if (entry.search?.termination === 'exhaustive') facets.add('complete-enumeration');
    if (entry.context?.hintGuided === true) facets.add('hint-guided');
    if (entry.context?.usedExistingHints === true) facets.add('used-existing-hints');
    if (entry.search?.randomSeed !== null && entry.search?.randomSeed !== undefined) facets.add('randomized');
    if (entry.context?.isolatedTechnique === true) facets.add('isolated-technique');
    if (entry.solver?.id === SOLVER_ID && entry.solver?.forcing?.retryTier) facets.add('production-retry-tier');
    return facets;
}

export function hasExplicitCapabilityContext(entry) {
    const context = entry?.context;
    return Boolean(context && ['usedExistingHints', 'hintGuided', 'isolatedTechnique']
        .every(field => Object.hasOwn(context, field)));
}

/** Historical existential production-context candidate; randomization is an orthogonal facet. */
export function isProductionContextEvidence(entry) {
    if (classifyProvenanceClass(entry, { standard: 'strict' }) !== 'cold-capability') return false;
    if (!hasExplicitCapabilityContext(entry)) return false;
    if (!entry?.solver?.version) return false;
    const facets = provenanceFacets(entry);
    return !facets.has('complete-enumeration');
}

export function originsForHint(hint) {
    const origins = new Set();
    for (const entry of hint?.provenance || []) origins.add(classifyProvenanceOrigin(entry));
    if (origins.size === 0) origins.add('other');
    return origins;
}

/** @deprecated Prefer originsForHint. */
export const sourcesForHint = originsForHint;

export function facetsForHint(hint) {
    const facets = new Set();
    for (const entry of hint?.provenance || []) for (const facet of provenanceFacets(entry)) facets.add(facet);
    return facets;
}

export function bucketHintsByOrigin(hints) {
    const buckets = new Map(PROVENANCE_ORIGINS.map(origin => [origin, []]));
    for (const hint of hints || []) {
        for (const origin of originsForHint(hint)) buckets.get(origin).push(hint);
    }
    return buckets;
}

/** @deprecated Prefer bucketHintsByOrigin. */
export const bucketHintsBySource = bucketHintsByOrigin;

export function bucketHintsByFacet(hints) {
    const buckets = new Map(PROVENANCE_FACETS.map(facet => [facet, []]));
    for (const hint of hints || []) {
        for (const facet of facetsForHint(hint)) buckets.get(facet).push(hint);
    }
    return buckets;
}

export function provenanceTechniqueKey(entry) {
    const solver = entry?.solver || {};
    const retryTier = solver.forcing?.retryTier || null;
    const parts = [
        solver.technique || 'unknown',
        solver.scoringProfileId || null,
        solver.orderingBiasId || null,
        solver.beamWidth ?? null,
        solver.mechanicBucketRetention ?? null,
        solver.gateKey ?? null,
        retryTier,
    ];
    return JSON.stringify(parts);
}

/**
 * A conservative dependency stratum. Event count is never an independence count: repeated runs
 * of one solver/config regime and all children replayed to one variant parent remain one stratum.
 * This key is for aggregation, not persisted identity or a claim of statistical independence.
 */
export function provenanceDependencyStratum(entry) {
    const origin = classifyProvenanceOrigin(entry);
    if (origin === 'variant-parent-replay') {
        const technique = entry?.solver?.technique || '';
        const match = /^variant-parent-replay:([^:]+):([^:]+)/.exec(technique);
        return match ? `variant-family:${match[1]}:parent:${match[2]}` : 'variant-family:unknown';
    }
    if (origin !== 'pathfinder-solver') return origin;
    return [
        origin,
        entry?.solver?.version || 'unknown-version',
        provenanceTechniqueKey(entry),
        entry?.context?.isolatedTechnique === true ? 'isolated' : 'ladder',
        entry?.context?.hintGuided === true || entry?.context?.usedExistingHints === true ? 'hint-context' : 'cold-context',
    ].join('|');
}

/**
 * Classify one valid historical event for a stated research question. Path validity belongs to
 * the referee/Hint record, so oracle and atlas use do not depend on how the path was discovered.
 * `current-production-capability` deliberately requires the caller to name the compared solver
 * version; without that query context a historical cold solve is context-bound, not current proof.
 */
export function classifyEvidenceApplicability(entry, purpose, {
    currentSolverVersion = null,
    comparableSolverVersions = currentSolverVersion ? [currentSolverVersion] : [],
} = {}) {
    if (!EVIDENCE_PURPOSES.includes(purpose)) throw new Error(`unknown evidence purpose: ${purpose}`);
    if (!entry) {
        return purpose === 'positive-oracle' || purpose === 'solution-atlas'
            ? { applicability: 'admissible', reason: 'referee-valid-path-with-unattributed-history' }
            : { applicability: 'inadmissible', reason: 'unattributed-history' };
    }
    const origin = classifyProvenanceOrigin(entry);
    if (purpose === 'positive-oracle') return { applicability: 'admissible', reason: 'referee-valid-path' };
    if (purpose === 'solution-atlas') return {
        applicability: 'admissible',
        reason: origin === 'variant-parent-replay' ? 'valid-context-bound-path' : 'valid-path',
    };
    if (purpose === 'longitudinal-process') {
        const fullyDated = Boolean(entry.foundAt && entry?.solver?.id && entry?.solver?.version);
        return fullyDated
            ? { applicability: 'admissible', reason: 'dated-versioned-discovery-event' }
            : { applicability: 'context-bound', reason: 'legacy-or-incomplete-event-metadata' };
    }
    if (purpose === 'technique-performance') {
        if (origin !== 'pathfinder-solver' || entry?.context?.isolatedTechnique !== true) {
            return { applicability: 'inadmissible', reason: 'not-isolated-pathfinder-technique-run' };
        }
        if (!entry?.solver?.version || !entry?.solver?.technique || !Number.isFinite(entry?.search?.workSpent)) {
            return { applicability: 'context-bound', reason: 'missing-version-config-or-work-envelope' };
        }
        if (!comparableSolverVersions.length) {
            return { applicability: 'context-bound', reason: 'comparison-regime-not-specified' };
        }
        return comparableSolverVersions.includes(entry.solver.version)
            ? { applicability: 'context-bound', reason: 'positive-only-success-needs-run-denominator' }
            : { applicability: 'context-bound', reason: 'different-solver-regime' };
    }

    if (entry?.search?.termination === 'exhaustive') {
        return { applicability: 'inadmissible', reason: 'enumeration-context' };
    }
    if (classifyProvenanceClass(entry, { standard: 'strict' }) === 'cold-capability' &&
        !hasExplicitCapabilityContext(entry)) {
        return { applicability: 'context-bound', reason: 'legacy-context-ambiguity' };
    }
    if (classifyProvenanceClass(entry, { standard: 'strict' }) === 'cold-capability' &&
        !entry?.solver?.version) {
        return { applicability: 'context-bound', reason: 'unknown-solver-regime' };
    }
    if (!isProductionContextEvidence(entry)) {
        return { applicability: 'inadmissible', reason: 'not-strict-cold-production-pathfinder' };
    }
    if (!comparableSolverVersions.length) {
        return { applicability: 'context-bound', reason: 'current-regime-not-specified' };
    }
    if (!comparableSolverVersions.includes(entry?.solver?.version)) {
        return { applicability: 'context-bound', reason: 'different-or-unknown-solver-regime' };
    }
    return { applicability: 'admissible', reason: 'matching-comparable-cold-production-regime' };
}

/** Hint-level predicate for consumers whose unit is a stored path rather than one discovery event. */
export function hasApplicableEvidence(hint, purpose, options = {}) {
    const entries = hint?.provenance?.length ? hint.provenance : [null];
    return entries.some(entry => classifyEvidenceApplicability(entry, purpose, options).applicability === 'admissible');
}

function increment(map, key, amount = 1) {
    map.set(key, (map.get(key) || 0) + amount);
}

function addHintClasses(map, classes) {
    for (const value of classes) increment(map, value);
}

function overlapPairs(values, map) {
    const sorted = [...values].sort();
    for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) increment(map, `${sorted[i]} x ${sorted[j]}`);
    }
}

function descEntries(map) {
    return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

/**
 * Compact multi-axis telemetry over a hint set without changing the persisted schema.
 *
 * - origin: mutually-exclusive producer identity per event;
 * - facets: overlapping search/run properties;
 * - admissibility: the existing canonical strict/narrow capability classes;
 * - technique/config and retry tier: concrete solver configuration identity.
 */
export function summarizeProvenanceEvidence(hints) {
    const originEvents = new Map(PROVENANCE_ORIGINS.map(origin => [origin, 0]));
    const originHints = new Map(PROVENANCE_ORIGINS.map(origin => [origin, 0]));
    const facetEvents = new Map(PROVENANCE_FACETS.map(facet => [facet, 0]));
    const facetHints = new Map(PROVENANCE_FACETS.map(facet => [facet, 0]));
    const strictClassEvents = new Map();
    const strictClassHints = new Map();
    const narrowClassEvents = new Map();
    const narrowClassHints = new Map();
    const originOverlapPairs = new Map();
    const facetOverlapPairs = new Map();
    const techniqueEvents = new Map();
    const retryTierEvents = new Map();
    let provenanceEntries = 0;
    let unattributedHints = 0;
    let multiOriginHints = 0;

    for (const hint of hints || []) {
        const provenance = hint.provenance || [];
        provenanceEntries += provenance.length;
        if (provenance.length === 0) unattributedHints++;

        const origins = originsForHint(hint);
        const facets = facetsForHint(hint);
        if (origins.size > 1) multiOriginHints++;
        for (const origin of origins) increment(originHints, origin);
        for (const facet of facets) increment(facetHints, facet);
        overlapPairs(origins, originOverlapPairs);
        overlapPairs(facets, facetOverlapPairs);

        const strictClasses = new Set();
        const narrowClasses = new Set();
        for (const entry of provenance) {
            increment(originEvents, classifyProvenanceOrigin(entry));
            for (const facet of provenanceFacets(entry)) increment(facetEvents, facet);
            const strictClass = classifyProvenanceClass(entry, { standard: 'strict' });
            const narrowClass = classifyProvenanceClass(entry, { standard: 'narrow' });
            increment(strictClassEvents, strictClass);
            increment(narrowClassEvents, narrowClass);
            strictClasses.add(strictClass);
            narrowClasses.add(narrowClass);
            increment(techniqueEvents, provenanceTechniqueKey(entry));
            const retryTier = entry?.solver?.forcing?.retryTier;
            if (retryTier) increment(retryTierEvents, retryTier);
        }
        addHintClasses(strictClassHints, strictClasses);
        addHintClasses(narrowClassHints, narrowClasses);
    }

    const originEventsObj = descEntries(originEvents);
    const originHintsObj = descEntries(originHints);
    const originOverlapObj = descEntries(originOverlapPairs);
    return {
        hints: (hints || []).length,
        provenanceEntries,
        unattributedHints,
        multiOriginHints,
        // Compatibility field for the first version of this report.
        multiSourceHints: multiOriginHints,
        originEvents: originEventsObj,
        originHints: originHintsObj,
        originOverlapPairs: originOverlapObj,
        facetEvents: descEntries(facetEvents),
        facetHints: descEntries(facetHints),
        facetOverlapPairs: descEntries(facetOverlapPairs),
        strictAdmissibilityEvents: descEntries(strictClassEvents),
        strictAdmissibilityHints: descEntries(strictClassHints),
        narrowAdmissibilityEvents: descEntries(narrowClassEvents),
        narrowAdmissibilityHints: descEntries(narrowClassHints),
        techniqueEvents: descEntries(techniqueEvents),
        retryTierEvents: descEntries(retryTierEvents),
        // Compatibility aliases. New consumers should use origin* names.
        sourceEvents: originEventsObj,
        sourceHints: originHintsObj,
        sourceOverlapPairs: originOverlapObj,
    };
}
