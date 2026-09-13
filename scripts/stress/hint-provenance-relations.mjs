import { hintPathSignature, provenanceEventIdentity } from '../../modules/domain/hint-runtime.mjs';
import { classifyProvenanceOrigin, provenanceFacets } from './provenance-source-taxonomy.mjs';

/**
 * Find canonical provenance event identities that are attached to more than one distinct hint path
 * on the same level. This is intentionally different from semantic duplicate detection within one
 * hint: one event identity spanning several paths may be legitimate producer multiplicity, copied
 * attribution, hidden nondeterminism, or an identity that is too coarse for its claimed semantics.
 * The audit reports the relation and leaves interpretation to the producer contract.
 */
export function auditCrossHintEventCollisions(levels) {
    let levelsWithCollisions = 0;
    let collisionIdentities = 0;
    let pathMemberships = 0;
    const origins = new Map();
    const facets = new Map();
    const techniques = new Map();
    const producerKeys = new Map();
    const examples = [];
    const examplesByTechnique = new Map();

    for (const level of levels || []) {
        const byIdentity = new Map();
        for (const hint of level?.hintRecords || []) {
            const pathSignature = hintPathSignature(hint.path || []);
            for (const event of hint.provenance || []) {
                const identity = provenanceEventIdentity(event);
                let row = byIdentity.get(identity);
                if (!row) {
                    row = { event, paths: new Map() };
                    byIdentity.set(identity, row);
                }
                if (!row.paths.has(pathSignature)) row.paths.set(pathSignature, hint.path || []);
            }
        }

        const levelCollisions = [...byIdentity.values()].filter(row => row.paths.size > 1);
        if (!levelCollisions.length) continue;
        levelsWithCollisions++;

        for (const row of levelCollisions) {
            collisionIdentities++;
            pathMemberships += row.paths.size;
            const origin = classifyProvenanceOrigin(row.event);
            origins.set(origin, (origins.get(origin) || 0) + 1);
            const eventFacets = [...provenanceFacets(row.event)].sort();
            for (const facet of eventFacets) facets.set(facet, (facets.get(facet) || 0) + 1);
            const technique = row.event?.solver?.technique ?? 'unknown';
            techniques.set(technique, (techniques.get(technique) || 0) + 1);
            const producerKey = [origin, row.event?.solver?.version ?? 'unknown', technique].join('|');
            producerKeys.set(producerKey, (producerKeys.get(producerKey) || 0) + 1);
            const example = {
                levelId: level.id ?? level.levelId ?? null,
                origin,
                facets: eventFacets,
                solverVersion: row.event?.solver?.version ?? null,
                technique: row.event?.solver?.technique ?? null,
                pathCount: row.paths.size,
                paths: [...row.paths.values()],
            };
            if (examples.length < 50) examples.push(example);
            const techniqueExamples = examplesByTechnique.get(technique) ?? [];
            if (techniqueExamples.length < 5) {
                techniqueExamples.push(example);
                examplesByTechnique.set(technique, techniqueExamples);
            }
        }
    }

    return {
        levelsWithCollisions,
        collisionIdentities,
        pathMemberships,
        identitiesByOrigin: Object.fromEntries([...origins].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        identitiesByFacet: Object.fromEntries([...facets].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        identitiesByTechnique: Object.fromEntries([...techniques].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        identitiesByProducerKey: Object.fromEntries([...producerKeys].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        examplesByTechnique: Object.fromEntries([...examplesByTechnique].sort((a, b) => a[0].localeCompare(b[0]))),
        examples,
    };
}
