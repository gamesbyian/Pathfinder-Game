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
import { auditHintOccurrenceSemantics } from './hint-occurrence-acceptance-lib.mjs';
export { auditHintOccurrenceSemantics } from './hint-occurrence-acceptance-lib.mjs';

const CORPORA = [
    { name: 'published', levels: 'data/levels.json' },
    { name: 'corpus1', levels: 'data/stress/stress-levels.json' },
    { name: 'corpus2', levels: 'data/stress/stress-levels-random.json' },
];
const EXPECTED_SYNTHETIC_FOUND_AT_EVENTS = 662;

const value = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const noFail = process.argv.includes('--no-fail');

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
