#!/usr/bin/env node
/**
 * Corpus-scale Phase-3 acceptance audit for Hint provenance execution/occurrence semantics.
 *
 * This is read-only. It verifies persisted canonical stores without enriching or rewriting them.
 * Usage:
 *   node scripts/stress/hint-occurrence-acceptance-audit.mjs [--json=<path>] [--no-fail]
 */
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';
import {
    isMigrationSyntheticFoundAt,
    provenanceEventIdentity,
} from '../../modules/domain/hint-runtime.mjs';

const CORPORA = [
    { name: 'published', levels: 'data/levels.json' },
    { name: 'corpus1', levels: 'data/stress/stress-levels.json' },
    { name: 'corpus2', levels: 'data/stress/stress-levels-random.json' },
];
const EXPECTED_SYNTHETIC_FOUND_AT_EVENTS = 662;

const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const noFail = process.argv.includes('--no-fail');

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

export function buildHintOccurrenceAcceptanceReport() {
    const corpora = CORPORA.map(({ name, levels }) => {
        const document = readLevelCorpusDocumentWithHints(levels);
        return { corpus: name, levelsPath: levels, ...auditHintOccurrenceSemantics(document.levels) };
    });
    const totals = {
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
    };
    for (const row of corpora) {
        for (const key of Object.keys(totals)) totals[key] += row[key];
    }
    const violations = [];
    if (totals.syntheticFoundAtEvents !== EXPECTED_SYNTHETIC_FOUND_AT_EVENTS) {
        violations.push(`synthetic-foundAt cohort expected ${EXPECTED_SYNTHETIC_FOUND_AT_EVENTS}, observed ${totals.syntheticFoundAtEvents}`);
    }
    if (totals.duplicateSemanticEventsWithinPath > 0) violations.push('duplicate semantic provenance events remain within a stored path');
    if (totals.duplicateOccurrenceKeysWithinEvent > 0) violations.push('duplicate occurrence runId+runAttempt keys remain within a semantic event');
    if (totals.occurrenceMissingRunId > 0) violations.push('occurrence records without a physical runId exist');
    if (totals.occurrenceInvalidSourceRuns > 0) violations.push('occurrence sourceRuns values exist with a non-array shape');

    return {
        schemaVersion: 1,
        kind: 'pathfinder-hint-occurrence-acceptance-audit',
        expectedSyntheticFoundAtEvents: EXPECTED_SYNTHETIC_FOUND_AT_EVENTS,
        corpora,
        totals,
        violations,
        acceptance: violations.length === 0 ? 'pass' : 'fail',
        semantics: {
            syntheticFoundAt: 'the known July-11 migration cohort remains explicitly recognizable as semantically undated chronology',
            semanticEventDedup: 'one semantic discovery event may have many physical occurrences, but must not be duplicated within one stored path',
            occurrenceIdempotency: 'one runId+runAttempt occurrence key appears at most once within a semantic discovery event',
            historicalSparseExecution: 'executionWithoutSolverRequestIdentity is reported but not a violation because historical/partial execution capsules remain legitimate missingness',
        },
    };
}

const report = buildHintOccurrenceAcceptanceReport();
const out = value('json');
if (out) writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report, null, 2));
if (!noFail && report.violations.length > 0) process.exitCode = 1;
