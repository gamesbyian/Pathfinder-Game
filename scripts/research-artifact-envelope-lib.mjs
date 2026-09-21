import { researchSemanticHash } from './research-semantic-identity-lib.mjs';

function nonNullEntries(entries) {
    return entries.filter(([, value]) => value !== null && value !== undefined);
}

function oneSemanticValue(entries, label, { hashObjects = false } = {}) {
    const present = nonNullEntries(entries);
    if (present.length === 0) return { value: null, source: null, sources: [] };

    const encode = value => hashObjects && value && typeof value === 'object'
        ? researchSemanticHash(value)
        : String(value);
    const encoded = new Set(present.map(([, value]) => encode(value)));
    if (encoded.size > 1) {
        throw new Error(`conflicting ${label} locations: ${present.map(([source]) => source).join(', ')}`);
    }
    return {
        value: present[0][1],
        source: present[0][0],
        sources: present.map(([source]) => source),
    };
}

/**
 * Normalize the shared research-artifact envelope exactly once.
 *
 * Canonical current layout is top-level:
 *   { populationIdentity, researchBlock, ...specialistPayload }
 *
 * Historical/current transitional readers may still encounter the nested alternatives below.
 * Consumers should call this helper rather than repeating fallback chains. Conflicting duplicate
 * locations fail loudly instead of silently preferring whichever spelling appears first.
 */
export function extractResearchArtifactEnvelope(document) {
    const researchBlock = oneSemanticValue([
        ['researchBlock', document?.researchBlock],
        ['population.researchBlock', document?.population?.researchBlock],
    ], 'researchBlock', { hashObjects: true });

    const populationIdentity = oneSemanticValue([
        ['populationIdentity', document?.populationIdentity],
        ['population.corpusIdentity', document?.population?.corpusIdentity],
        ['population.populationIdentity', document?.population?.populationIdentity],
    ], 'population identity');

    return {
        researchBlock: researchBlock.value,
        populationIdentity: populationIdentity.value,
        sources: {
            researchBlock: researchBlock.sources,
            populationIdentity: populationIdentity.sources,
        },
        canonicalCurrent: researchBlock.source === 'researchBlock'
            && populationIdentity.source === 'populationIdentity',
    };
}

export function assertCanonicalResearchArtifactLocations(document) {
    const envelope = extractResearchArtifactEnvelope(document);
    const nonCanonicalResearchBlock = envelope.sources.researchBlock.some(source => source !== 'researchBlock');
    const nonCanonicalPopulationIdentity = envelope.sources.populationIdentity.some(source => source !== 'populationIdentity');
    if (nonCanonicalResearchBlock || nonCanonicalPopulationIdentity) {
        throw new Error(
            'current research artifact shared fields must use top-level researchBlock and populationIdentity',
        );
    }
    return envelope;
}

export function assertCanonicalResearchArtifactEnvelope(document) {
    const envelope = assertCanonicalResearchArtifactLocations(document);
    if (!envelope.researchBlock) throw new Error('research artifact missing researchBlock');
    if (!envelope.populationIdentity) throw new Error('research artifact missing populationIdentity');
    return envelope;
}
