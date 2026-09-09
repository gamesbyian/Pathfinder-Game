import {
    buildPathFeatures,
    featureDistance,
    pathSignature,
    structuralSolutionFamilySignature,
} from '../../modules/domain/path-features.ts';
import {
    originsForHint,
    facetsForHint,
    provenanceTechniqueKey,
} from './provenance-source-taxonomy.mjs';
import { classifyProvenanceClass } from './provenance-classes.mjs';

function setDifferenceSize(a, b) {
    let n = 0;
    for (const value of a) if (!b.has(value)) n++;
    return n;
}

function compareTupleDesc(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const av = a[i] ?? 0;
        const bv = b[i] ?? 0;
        if (av !== bv) return bv - av;
    }
    return 0;
}

export function describeHintEvidence(hint, { mcKeys = [], useCrossings = false } = {}) {
    const provenance = hint?.provenance || [];
    const origins = originsForHint(hint);
    const facets = facetsForHint(hint);
    const techniques = new Set(provenance.map(provenanceTechniqueKey));
    const versions = new Set(provenance.map(entry => entry?.solver?.version).filter(Boolean));
    const strictClasses = new Set(provenance.map(entry => classifyProvenanceClass(entry, { standard: 'strict' })));
    const narrowClasses = new Set(provenance.map(entry => classifyProvenanceClass(entry, { standard: 'narrow' })));
    const path = hint?.path || [];
    return {
        hint,
        path,
        signature: pathSignature(path),
        structuralFamily: structuralSolutionFamilySignature(path, mcKeys),
        features: buildPathFeatures(path, mcKeys),
        origins,
        facets,
        techniques,
        versions,
        strictClasses,
        narrowClasses,
        provenanceEntries: provenance.length,
        useCrossings,
    };
}

/**
 * Select a deterministic, structurally diverse subset of hints while preferring paths whose
 * provenance supplies broader independent evidence. This is an OFFLINE analysis helper only.
 *
 * Selection is greedy max-min over existing path-feature distance. The first representative is the
 * path with the broadest evidence footprint; later representatives prefer a new structural family,
 * then greater minimum path distance, then new origins/techniques/versions, then evidence volume.
 * Exact duplicate paths are collapsed before selection.
 */
export function selectRepresentativeHints(hints, {
    limit = 4,
    mcKeys = [],
    useCrossings = false,
} = {}) {
    if (!Number.isFinite(limit) || limit <= 0) return [];

    const unique = new Map();
    for (const hint of hints || []) {
        if (!Array.isArray(hint?.path) || hint.path.length === 0) continue;
        const descriptor = describeHintEvidence(hint, { mcKeys, useCrossings });
        const existing = unique.get(descriptor.signature);
        if (!existing || descriptor.provenanceEntries > existing.provenanceEntries) {
            unique.set(descriptor.signature, descriptor);
        }
    }
    const candidates = [...unique.values()];
    if (candidates.length <= limit) return candidates.map(d => d.hint);

    const firstScore = d => [
        d.origins.size,
        d.techniques.size,
        d.versions.size,
        d.strictClasses.has('cold-capability') ? 1 : 0,
        d.provenanceEntries,
    ];
    candidates.sort((a, b) => compareTupleDesc(firstScore(a), firstScore(b)) || a.signature.localeCompare(b.signature));

    const selected = [candidates.shift()];
    while (selected.length < limit && candidates.length) {
        const selectedFamilies = new Set(selected.map(d => d.structuralFamily));
        const selectedOrigins = new Set(selected.flatMap(d => [...d.origins]));
        const selectedTechniques = new Set(selected.flatMap(d => [...d.techniques]));
        const selectedVersions = new Set(selected.flatMap(d => [...d.versions]));

        let bestIndex = 0;
        let bestScore = null;
        for (let i = 0; i < candidates.length; i++) {
            const d = candidates[i];
            const minDistance = Math.min(...selected.map(s => featureDistance(d.features, s.features, useCrossings)));
            const score = [
                selectedFamilies.has(d.structuralFamily) ? 0 : 1,
                minDistance,
                setDifferenceSize(d.origins, selectedOrigins),
                setDifferenceSize(d.techniques, selectedTechniques),
                setDifferenceSize(d.versions, selectedVersions),
                d.strictClasses.has('cold-capability') ? 1 : 0,
                d.provenanceEntries,
            ];
            if (bestScore === null || compareTupleDesc(score, bestScore) < 0 ||
                (compareTupleDesc(score, bestScore) === 0 && d.signature.localeCompare(candidates[bestIndex].signature) < 0)) {
                bestScore = score;
                bestIndex = i;
            }
        }
        selected.push(candidates.splice(bestIndex, 1)[0]);
    }

    return selected.map(d => d.hint);
}
