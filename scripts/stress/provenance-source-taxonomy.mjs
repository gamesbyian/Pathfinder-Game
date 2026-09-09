import {
    SOLVER_ID,
    WITNESS_GENERATOR_ID,
    HUMAN_PLAYER_ID,
    INHERITED_WITNESS_ID,
    TRANSFORMED_WITNESS_ID,
    EXTERNAL_SOLVER_ID,
} from '../../modules/domain/hint-types.ts';

export const VARIANT_REPLAY_SOLVER_ID = 'variant-corpus-diagnostic';

export const PROVENANCE_SOURCES = [
    'witness',
    'inherited-witness',
    'transformed-witness',
    'human-solved',
    'external-constraint-solver',
    'variant-parent-replay',
    'complete-enumeration',
    'prefix-anchored-completion',
    'randomized-enumeration',
    'isolated-technique',
    'production-retry-tier',
    'production-solver',
    'other',
];

/**
 * One provenance entry -> one mutually-exclusive source category.
 *
 * This is intentionally more granular than the original solution-profile classifier. The raw
 * provenance store now contains enough independent evidence classes that collapsing external exact
 * solves, variant-parent replay, inherited/transformed witnesses, and retry-tier wins into `other`
 * or generic production would destroy information needed by current solver research.
 */
export function classifyProvenanceSource(entry) {
    if (!entry) return 'other';
    const solverId = entry.solver?.id;
    const technique = entry.solver?.technique || '';

    if (solverId === WITNESS_GENERATOR_ID) return 'witness';
    if (solverId === INHERITED_WITNESS_ID) return 'inherited-witness';
    if (solverId === TRANSFORMED_WITNESS_ID) return 'transformed-witness';
    if (solverId === HUMAN_PLAYER_ID) return 'human-solved';
    if (solverId === EXTERNAL_SOLVER_ID) return 'external-constraint-solver';
    if (solverId === VARIANT_REPLAY_SOLVER_ID || technique.startsWith('variant-parent-replay:')) return 'variant-parent-replay';
    if (entry.search?.termination === 'exhaustive') return 'complete-enumeration';
    if (entry.context?.hintGuided === true) return 'prefix-anchored-completion';
    if (entry.search?.randomSeed !== null && entry.search?.randomSeed !== undefined) return 'randomized-enumeration';
    if (entry.context?.isolatedTechnique === true) return 'isolated-technique';
    if (solverId === SOLVER_ID && entry.solver?.forcing?.retryTier) return 'production-retry-tier';
    if (solverId === SOLVER_ID) return 'production-solver';
    return 'other';
}

export function sourcesForHint(hint) {
    const sources = new Set();
    for (const entry of hint?.provenance || []) sources.add(classifyProvenanceSource(entry));
    if (sources.size === 0) sources.add('other');
    return sources;
}

export function bucketHintsBySource(hints) {
    const buckets = new Map(PROVENANCE_SOURCES.map(source => [source, []]));
    for (const hint of hints || []) {
        for (const source of sourcesForHint(hint)) buckets.get(source).push(hint);
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

function increment(map, key, amount = 1) {
    map.set(key, (map.get(key) || 0) + amount);
}

/** Compact telemetry over a hint set without changing the persisted schema. */
export function summarizeProvenanceEvidence(hints) {
    const sourceEvents = new Map(PROVENANCE_SOURCES.map(source => [source, 0]));
    const sourceHints = new Map(PROVENANCE_SOURCES.map(source => [source, 0]));
    const techniqueEvents = new Map();
    const overlapPairs = new Map();
    let provenanceEntries = 0;
    let unattributedHints = 0;
    let multiSourceHints = 0;

    for (const hint of hints || []) {
        const provenance = hint.provenance || [];
        provenanceEntries += provenance.length;
        if (provenance.length === 0) unattributedHints++;
        const sources = [...sourcesForHint(hint)].sort();
        if (sources.length > 1) multiSourceHints++;
        for (const source of sources) increment(sourceHints, source);
        for (let i = 0; i < sources.length; i++) {
            for (let j = i + 1; j < sources.length; j++) increment(overlapPairs, `${sources[i]} x ${sources[j]}`);
        }
        for (const entry of provenance) {
            increment(sourceEvents, classifyProvenanceSource(entry));
            increment(techniqueEvents, provenanceTechniqueKey(entry));
        }
    }

    const descEntries = (map) => Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
    return {
        hints: (hints || []).length,
        provenanceEntries,
        unattributedHints,
        multiSourceHints,
        sourceEvents: descEntries(sourceEvents),
        sourceHints: descEntries(sourceHints),
        sourceOverlapPairs: descEntries(overlapPairs),
        techniqueEvents: descEntries(techniqueEvents),
    };
}
