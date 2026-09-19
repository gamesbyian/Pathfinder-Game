/**
 * Compact selection provenance for research-oriented hint harvesting.
 *
 * This records the funnel by which already-solved candidate rows become persisted hint/provenance
 * evidence. It is NOT an attempted-population denominator and therefore cannot establish solve rate
 * or technique performance by itself.
 */

export const HINT_HARVEST_SELECTION_MANIFEST_KIND = 'pathfinder-hint-harvest-selection-manifest';
export const HINT_HARVEST_SELECTION_MANIFEST_SCHEMA_VERSION = 1;

function pendingWeight(item) {
    return Array.isArray(item?.solvedRows) ? item.solvedRows.length : 1;
}

function countReasons(items) {
    const counts = new Map();
    for (const item of items ?? []) {
        const reason = String(item?.reason ?? 'unknown');
        counts.set(reason, (counts.get(reason) ?? 0) + pendingWeight(item));
    }
    return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function pendingRowCount(items) {
    return (items ?? []).reduce((sum, item) => sum + pendingWeight(item), 0);
}

export function buildHintHarvestSelectionManifest({
    sourceRunId,
    sourceWorkflow,
    sourceReportsSeen,
    sourceRowsSeen,
    solvedCandidateRowsSeen,
    refereeAcceptedRows,
    persistedRecordChanges,
    pending = [],
    reportsHarvested,
    selectionPolicy,
    corpusScope,
} = {}) {
    for (const [name, value] of Object.entries({
        sourceReportsSeen,
        sourceRowsSeen,
        solvedCandidateRowsSeen,
        refereeAcceptedRows,
        persistedRecordChanges,
        reportsHarvested,
    })) {
        if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
    }
    if (refereeAcceptedRows > solvedCandidateRowsSeen) throw new Error('refereeAcceptedRows cannot exceed solvedCandidateRowsSeen');
    if (persistedRecordChanges > refereeAcceptedRows) throw new Error('persistedRecordChanges cannot exceed refereeAcceptedRows');

    return {
        schemaVersion: HINT_HARVEST_SELECTION_MANIFEST_SCHEMA_VERSION,
        kind: HINT_HARVEST_SELECTION_MANIFEST_KIND,
        source: {
            harvester: 'harvest-level-blind-report-hints',
            runId: sourceRunId ?? null,
            workflow: sourceWorkflow ?? null,
            reportsSeen: sourceReportsSeen,
            reportsHarvested,
            sourceRowsSeen,
        },
        selection: {
            policy: selectionPolicy ?? null,
            corpusScope: corpusScope ?? null,
            solvedCandidateRowsSeen,
            refereeAcceptedRows,
            persistedRecordChanges,
            acceptedButAlreadyRepresented: refereeAcceptedRows - persistedRecordChanges,
            quarantinedRows: pendingRowCount(pending),
            quarantineReasons: countReasons(pending),
        },
        semantics: {
            scope: 'level-blind report harvester only; sibling hint importers in the same source run have separate selection semantics',
            denominator: 'success-selected candidate rows observed by the level-blind report harvester',
            notAttemptedPopulation: true,
            selectionInterpretation: 'describes hint-harvest retention/acceptance only; cannot estimate solve rate or technique performance',
            persistedChange: 'new path or new semantic provenance event appended to an existing path',
            acceptedButAlreadyRepresented: 'referee-valid exact solved row produced no persistence change, typically because equivalent evidence was already present',
        },
    };
}

export function validateHintHarvestSelectionManifest(document) {
    const issues = [];
    if (document?.schemaVersion !== HINT_HARVEST_SELECTION_MANIFEST_SCHEMA_VERSION) issues.push('schemaVersion');
    if (document?.kind !== HINT_HARVEST_SELECTION_MANIFEST_KIND) issues.push('kind');
    if (document?.source?.harvester !== 'harvest-level-blind-report-hints') issues.push('source.harvester');
    for (const field of ['reportsSeen', 'reportsHarvested', 'sourceRowsSeen']) {
        if (!Number.isSafeInteger(document?.source?.[field]) || document.source[field] < 0) issues.push(`source.${field}`);
    }
    for (const field of ['solvedCandidateRowsSeen', 'refereeAcceptedRows', 'persistedRecordChanges', 'acceptedButAlreadyRepresented', 'quarantinedRows']) {
        if (!Number.isSafeInteger(document?.selection?.[field]) || document.selection[field] < 0) issues.push(`selection.${field}`);
    }
    if (document?.selection?.refereeAcceptedRows > document?.selection?.solvedCandidateRowsSeen) issues.push('selection.accepted<=solved');
    if (document?.selection?.persistedRecordChanges > document?.selection?.refereeAcceptedRows) issues.push('selection.persisted<=accepted');
    if (document?.semantics?.notAttemptedPopulation !== true) issues.push('semantics.notAttemptedPopulation');
    if (issues.length) throw new Error(`invalid hint harvest selection manifest: ${issues.join(', ')}`);
    return document;
}
