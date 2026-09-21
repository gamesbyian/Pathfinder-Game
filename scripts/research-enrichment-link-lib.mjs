import { assertResearchBlock } from './solver-research-block-lineage.mjs';
import { assertCanonicalResearchArtifactEnvelope } from './research-artifact-envelope-lib.mjs';

export const RESEARCH_ENRICHMENT_KINDS = Object.freeze([
    'observation',
    'exact',
    'treatment',
    'artifact',
]);

const nonEmptyOrNull = (value, field) => {
    if (value == null) return null;
    if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be null or a non-empty string`);
    return value.trim();
};

export function buildResearchEnrichmentLink({
    sourceBlockArtifact,
    sourceArtifact,
    researchEnrichmentKind,
    populationIdentity,
    researchBlock,
    stateRef = null,
    runRef = null,
    createdAt = new Date().toISOString(),
} = {}) {
    if (typeof sourceBlockArtifact !== 'string' || !sourceBlockArtifact.trim()) {
        throw new Error('sourceBlockArtifact must be a non-empty string');
    }
    if (typeof sourceArtifact !== 'string' || !sourceArtifact.trim()) {
        throw new Error('sourceArtifact must be a non-empty string');
    }
    if (!RESEARCH_ENRICHMENT_KINDS.includes(researchEnrichmentKind)) {
        throw new Error(`researchEnrichmentKind must be one of ${RESEARCH_ENRICHMENT_KINDS.join(', ')}`);
    }
    if (typeof createdAt !== 'string' || Number.isNaN(Date.parse(createdAt))) {
        throw new Error('createdAt must be an ISO timestamp');
    }
    assertResearchBlock(researchBlock, { populationIdentity });
    const link = {
        schemaVersion: 1,
        kind: 'pathfinder-research-enrichment-link',
        researchEnrichmentKind,
        createdAt,
        sourceBlockArtifact: sourceBlockArtifact.trim(),
        sourceArtifact: sourceArtifact.trim(),
        stateRef: nonEmptyOrNull(stateRef, 'stateRef'),
        runRef: nonEmptyOrNull(runRef, 'runRef'),
        populationIdentity,
        researchBlock,
    };
    assertCanonicalResearchArtifactEnvelope(link);
    return link;
}
