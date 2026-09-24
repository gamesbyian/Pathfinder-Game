#!/usr/bin/env node
import {
    isMigrationSyntheticFoundAt,
    provenanceEventIdentity,
} from '../../modules/domain/hint-runtime.mjs';

function occurrenceKey(occurrence) {
    return `${occurrence?.runId ?? ''}::${occurrence?.runAttempt ?? ''}`;
}

export function auditHintOccurrenceSemantics(levels) {
    const summary = {
        levels: 0,
        hints: 0,
        provenanceEvents: 0,
        eventsWithExecution: 0,
        eventsWithOccurrences: 0,
        eventsWithMultipleOccurrences: 0,
        occurrenceRecords: 0,
        syntheticFoundAtEvents: 0,
        duplicateSemanticEventsWithinPath: 0,
        duplicateOccurrenceKeysWithinEvent: 0,
        occurrenceMissingRunId: 0,
        occurrenceInvalidSourceRuns: 0,
        executionWithoutSolverRequestIdentity: 0,
        examples: {
            duplicateSemanticEventsWithinPath: [],
            duplicateOccurrenceKeysWithinEvent: [],
            occurrenceMissingRunId: [],
        },
    };

    for (const level of levels ?? []) {
        summary.levels += 1;
        for (const hint of level?.hintRecords ?? []) {
            summary.hints += 1;
            const seenSemantic = new Set();
            for (const entry of hint?.provenance ?? []) {
                summary.provenanceEvents += 1;
                if (isMigrationSyntheticFoundAt(entry)) summary.syntheticFoundAtEvents += 1;

                const semanticIdentity = provenanceEventIdentity(entry);
                if (seenSemantic.has(semanticIdentity)) {
                    summary.duplicateSemanticEventsWithinPath += 1;
                    if (summary.examples.duplicateSemanticEventsWithinPath.length < 20) {
                        summary.examples.duplicateSemanticEventsWithinPath.push({
                            levelId: level.id ?? null,
                            path: hint.path,
                            semanticIdentity,
                        });
                    }
                } else {
                    seenSemantic.add(semanticIdentity);
                }

                if (entry?.execution && typeof entry.execution === 'object') {
                    summary.eventsWithExecution += 1;
                    if (entry.execution.solverRequestIdentity == null) {
                        summary.executionWithoutSolverRequestIdentity += 1;
                    }
                }

                const occurrences = Array.isArray(entry?.occurrences) ? entry.occurrences : [];
                if (occurrences.length > 0) {
                    summary.eventsWithOccurrences += 1;
                    if (occurrences.length > 1) summary.eventsWithMultipleOccurrences += 1;
                }
                const seenOccurrences = new Set();
                for (const occurrence of occurrences) {
                    summary.occurrenceRecords += 1;
                    if (typeof occurrence?.runId !== 'string' || occurrence.runId.length === 0) {
                        summary.occurrenceMissingRunId += 1;
                        if (summary.examples.occurrenceMissingRunId.length < 20) {
                            summary.examples.occurrenceMissingRunId.push({
                                levelId: level.id ?? null,
                                path: hint.path,
                                occurrence,
                            });
                        }
                    }
                    if (occurrence?.sourceRuns != null && !Array.isArray(occurrence.sourceRuns)) {
                        summary.occurrenceInvalidSourceRuns += 1;
                    }
                    const key = occurrenceKey(occurrence);
                    if (seenOccurrences.has(key)) {
                        summary.duplicateOccurrenceKeysWithinEvent += 1;
                        if (summary.examples.duplicateOccurrenceKeysWithinEvent.length < 20) {
                            summary.examples.duplicateOccurrenceKeysWithinEvent.push({
                                levelId: level.id ?? null,
                                path: hint.path,
                                occurrenceKey: key,
                            });
                        }
                    } else {
                        seenOccurrences.add(key);
                    }
                }
            }
        }
    }
    return summary;
}
