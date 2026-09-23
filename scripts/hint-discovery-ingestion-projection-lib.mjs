import {
    hintPathSignature,
    toHint,
} from '../modules/domain/hint-runtime.mjs';

export const HINT_DISCOVERY_INGESTION_KIND = 'pathfinder-hint-discovery-ingestion-observation';
export const HINT_DISCOVERY_INGESTION_SCHEMA_VERSION = 1;

function nonEmptyString(name, value) {
    if (typeof value !== 'string' || value.length === 0) throw new Error(`${name} is required`);
    return value;
}

/**
 * Small canonical successful-discovery projection used at the final semantic-ingestion boundary.
 *
 * Specialist producer artifacts remain specialist schemas. Their adapters normalize only the facts
 * needed to attach one accepted path observation to the canonical Hint store. Rich process/failure
 * evidence stays in its sibling resources.
 */
export function buildHintDiscoveryIngestionObservation({
    producer,
    sourceArtifact = null,
    sourceRunId = null,
    sourceRunAttempt = null,
    corpus,
    levelId,
    levelRevision,
    path,
    provenance,
} = {}) {
    nonEmptyString('producer', producer);
    nonEmptyString('corpus', corpus);
    nonEmptyString('levelId', String(levelId ?? ''));
    nonEmptyString('levelRevision', levelRevision);
    if (!Array.isArray(path) || path.length === 0 || !path.every(Number.isInteger)) {
        throw new Error('path must be a non-empty integer array');
    }
    if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) {
        throw new Error('provenance is required');
    }
    if (provenance?.context?.levelRevision !== levelRevision) {
        throw new Error('provenance levelRevision must match ingestion target levelRevision');
    }

    const runId = sourceRunId == null ? null : String(sourceRunId);
    const runAttempt = sourceRunAttempt == null ? null : String(sourceRunAttempt);
    if (runId != null) {
        const occurrences = Array.isArray(provenance.occurrences) ? provenance.occurrences : [];
        const matched = occurrences.some(occurrence =>
            occurrence?.runId === runId
            && String(occurrence?.runAttempt ?? '') === String(runAttempt ?? ''));
        if (!matched) {
            throw new Error('provenance occurrence lineage must contain the declared source run/attempt');
        }
    }

    return {
        schemaVersion: HINT_DISCOVERY_INGESTION_SCHEMA_VERSION,
        kind: HINT_DISCOVERY_INGESTION_KIND,
        source: {
            producer,
            artifact: sourceArtifact ?? null,
            runId,
            runAttempt,
        },
        target: {
            corpus,
            levelId: String(levelId),
            levelRevision,
        },
        path: [...path],
        pathSignature: hintPathSignature(path),
        provenance,
    };
}

export function validateHintDiscoveryIngestionObservation(observation) {
    return buildHintDiscoveryIngestionObservation({
        producer: observation?.source?.producer,
        sourceArtifact: observation?.source?.artifact,
        sourceRunId: observation?.source?.runId,
        sourceRunAttempt: observation?.source?.runAttempt,
        corpus: observation?.target?.corpus,
        levelId: observation?.target?.levelId,
        levelRevision: observation?.target?.levelRevision,
        path: observation?.path,
        provenance: observation?.provenance,
    });
}

export function hintFromDiscoveryIngestionObservation(observation) {
    const validated = validateHintDiscoveryIngestionObservation(observation);
    return toHint(validated.path, [validated.provenance]);
}
