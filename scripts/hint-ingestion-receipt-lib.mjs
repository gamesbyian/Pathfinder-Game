/**
 * Canonical success-ingestion accounting for hint evidence.
 *
 * This receipt describes what a hint harvester/ingestor observed and retained. It is deliberately
 * NOT an attempted-population denominator and cannot establish solver success rate or technique
 * performance. Historical/current producers may be unable to distinguish path additions from
 * provenance-event/occurrence additions; those units must remain explicit null rather than being
 * fabricated from one coarser "record changed" counter.
 */

export const HINT_INGESTION_RECEIPT_KIND = 'pathfinder-hint-ingestion-receipt';
export const HINT_INGESTION_RECEIPT_SCHEMA_VERSION = 1;

function nonNegativeIntegerOrNull(name, value) {
    if (value == null) return null;
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be null or a non-negative integer`);
    return value;
}

function requiredNonNegativeInteger(name, value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
    return value;
}

function countQuarantineReasons(items) {
    const counts = new Map();
    for (const item of items ?? []) {
        const reason = String(item?.reason ?? 'unknown');
        const weight = Array.isArray(item?.solvedRows) ? item.solvedRows.length : 1;
        counts.set(reason, (counts.get(reason) ?? 0) + weight);
    }
    return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function quarantineObservationCount(items) {
    return (items ?? []).reduce((sum, item) => sum + (Array.isArray(item?.solvedRows) ? item.solvedRows.length : 1), 0);
}

export function buildHintIngestionReceipt({
    producer,
    sourceRunId = null,
    sourceRunAttempt = null,
    sourceWorkflow = null,
    sourceArtifact = null,
    candidateObservations,
    eligibleObservations,
    refereeAcceptedObservations,
    acceptedAlreadyRepresented,
    semanticRecordChanges,
    pathAdditions = null,
    provenanceEventAdditions = null,
    occurrenceAdditions = null,
    filesChanged = null,
    pending = [],
    corpusScope = null,
    notes = null,
} = {}) {
    if (typeof producer !== 'string' || producer.length === 0) throw new Error('producer is required');

    const candidate = requiredNonNegativeInteger('candidateObservations', candidateObservations);
    const eligible = requiredNonNegativeInteger('eligibleObservations', eligibleObservations);
    const accepted = requiredNonNegativeInteger('refereeAcceptedObservations', refereeAcceptedObservations);
    const already = requiredNonNegativeInteger('acceptedAlreadyRepresented', acceptedAlreadyRepresented);
    const changed = requiredNonNegativeInteger('semanticRecordChanges', semanticRecordChanges);

    if (eligible > candidate) throw new Error('eligibleObservations cannot exceed candidateObservations');
    if (accepted > eligible) throw new Error('refereeAcceptedObservations cannot exceed eligibleObservations');
    if (already > accepted) throw new Error('acceptedAlreadyRepresented cannot exceed refereeAcceptedObservations');
    if (changed > accepted) throw new Error('semanticRecordChanges cannot exceed refereeAcceptedObservations');
    if (already + changed > accepted) {
        throw new Error('acceptedAlreadyRepresented + semanticRecordChanges cannot exceed refereeAcceptedObservations');
    }

    const additions = {
        semanticRecordChanges: changed,
        paths: nonNegativeIntegerOrNull('pathAdditions', pathAdditions),
        provenanceEvents: nonNegativeIntegerOrNull('provenanceEventAdditions', provenanceEventAdditions),
        occurrences: nonNegativeIntegerOrNull('occurrenceAdditions', occurrenceAdditions),
    };
    const physicalFilesChanged = nonNegativeIntegerOrNull('filesChanged', filesChanged);

    return {
        schemaVersion: HINT_INGESTION_RECEIPT_SCHEMA_VERSION,
        kind: HINT_INGESTION_RECEIPT_KIND,
        source: {
            producer,
            runId: sourceRunId == null ? null : String(sourceRunId),
            runAttempt: sourceRunAttempt == null ? null : String(sourceRunAttempt),
            workflow: sourceWorkflow ?? null,
            artifact: sourceArtifact ?? null,
        },
        scope: {
            corpus: Array.isArray(corpusScope) ? [...corpusScope] : corpusScope,
        },
        funnel: {
            candidateObservations: candidate,
            eligibleObservations: eligible,
            refereeAcceptedObservations: accepted,
            acceptedAlreadyRepresented: already,
            quarantinedObservations: quarantineObservationCount(pending),
            quarantineReasons: countQuarantineReasons(pending),
        },
        additions,
        physical: {
            filesChanged: physicalFilesChanged,
        },
        semantics: {
            successSelected: true,
            notAttemptedPopulation: true,
            candidateObservation: 'a success-bearing row/artifact presented to this ingestion boundary',
            eligibleObservation: 'a candidate with enough identity/path information to undergo canonical referee/merge handling',
            refereeAcceptedObservation: 'an eligible observation whose exact path is valid against the target level revision',
            acceptedAlreadyRepresented: 'referee-valid observation that produced no semantic store change',
            semanticRecordChange: 'coarse producer-observed change when the current mutation API cannot distinguish path/event/occurrence units',
            nullAdditionUnit: 'this producer cannot measure that addition unit exactly; null is unknown/not-observed, never zero',
            notes: notes ?? null,
        },
    };
}

export function validateHintIngestionReceipt(document) {
    const issues = [];
    if (document?.schemaVersion !== HINT_INGESTION_RECEIPT_SCHEMA_VERSION) issues.push('schemaVersion');
    if (document?.kind !== HINT_INGESTION_RECEIPT_KIND) issues.push('kind');
    if (typeof document?.source?.producer !== 'string' || document.source.producer.length === 0) issues.push('source.producer');

    for (const field of ['candidateObservations', 'eligibleObservations', 'refereeAcceptedObservations',
        'acceptedAlreadyRepresented', 'quarantinedObservations']) {
        if (!Number.isSafeInteger(document?.funnel?.[field]) || document.funnel[field] < 0) issues.push(`funnel.${field}`);
    }
    if ((document?.funnel?.eligibleObservations ?? Infinity) > (document?.funnel?.candidateObservations ?? -1)) {
        issues.push('funnel.eligible<=candidate');
    }
    if ((document?.funnel?.refereeAcceptedObservations ?? Infinity) > (document?.funnel?.eligibleObservations ?? -1)) {
        issues.push('funnel.accepted<=eligible');
    }
    if ((document?.funnel?.acceptedAlreadyRepresented ?? Infinity) > (document?.funnel?.refereeAcceptedObservations ?? -1)) {
        issues.push('funnel.already<=accepted');
    }

    if (!Number.isSafeInteger(document?.additions?.semanticRecordChanges) || document.additions.semanticRecordChanges < 0) {
        issues.push('additions.semanticRecordChanges');
    }
    for (const field of ['paths', 'provenanceEvents', 'occurrences']) {
        const value = document?.additions?.[field];
        if (value != null && (!Number.isSafeInteger(value) || value < 0)) issues.push(`additions.${field}`);
    }
    const filesChanged = document?.physical?.filesChanged;
    if (filesChanged != null && (!Number.isSafeInteger(filesChanged) || filesChanged < 0)) issues.push('physical.filesChanged');
    if (document?.semantics?.notAttemptedPopulation !== true) issues.push('semantics.notAttemptedPopulation');
    if (document?.semantics?.successSelected !== true) issues.push('semantics.successSelected');

    if (issues.length) throw new Error(`invalid hint ingestion receipt: ${issues.join(', ')}`);
    return document;
}

/**
 * Compatibility projection for the existing level-blind harvest-selection manifest.
 * It preserves that manifest's measured units and explicitly leaves detailed semantic-addition units
 * unknown until the mutation boundary exposes them separately.
 */
export function hintIngestionReceiptFromSelectionManifest(manifest) {
    if (!manifest || manifest.kind !== 'pathfinder-hint-harvest-selection-manifest') {
        throw new Error('expected pathfinder-hint-harvest-selection-manifest');
    }
    return buildHintIngestionReceipt({
        producer: manifest.source?.harvester ?? 'harvest-level-blind-report-hints',
        sourceRunId: manifest.source?.runId ?? null,
        sourceWorkflow: manifest.source?.workflow ?? null,
        candidateObservations: manifest.source?.sourceRowsSeen ?? 0,
        eligibleObservations: manifest.selection?.solvedCandidateRowsSeen ?? 0,
        refereeAcceptedObservations: manifest.selection?.refereeAcceptedRows ?? 0,
        acceptedAlreadyRepresented: manifest.selection?.acceptedButAlreadyRepresented ?? 0,
        semanticRecordChanges: manifest.selection?.persistedRecordChanges ?? 0,
        pending: Object.entries(manifest.selection?.quarantineReasons ?? {}).flatMap(([reason, count]) =>
            Array.from({ length: Number(count) || 0 }, () => ({ reason }))),
        corpusScope: manifest.selection?.corpusScope ?? null,
        notes: 'compatibility projection from pathfinder-hint-harvest-selection-manifest; detailed path/event/occurrence addition units were not measured by that producer',
    });
}
