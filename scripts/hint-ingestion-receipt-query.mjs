#!/usr/bin/env node
/**
 * Query canonical hint-ingestion receipts.
 *
 * Usage:
 *   node scripts/hint-ingestion-receipt-query.mjs [--root=reports/stress/hint-ingestion-receipts] [--json]
 *
 * This is success-ingestion accounting only. It must never be interpreted as an attempted solver
 * population or solve-rate denominator.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { validateHintIngestionReceipt } from './hint-ingestion-receipt-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [key, ...rest] = a.split('=');
    return [key, rest.join('=') || true];
}));
const root = path.resolve(String(args.get('--root') || 'reports/stress/hint-ingestion-receipts'));
const json = args.has('--json');

function add(target, field, value) {
    if (Number.isSafeInteger(value)) target[field] = (target[field] ?? 0) + value;
}
function addNullable(target, field, value) {
    if (value == null) {
        target[`${field}UnknownReceipts`] = (target[`${field}UnknownReceipts`] ?? 0) + 1;
        return;
    }
    add(target, field, value);
}
function rows() {
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(entry => {
            const file = path.join(root, entry.name);
            const doc = JSON.parse(readFileSync(file, 'utf8'));
            validateHintIngestionReceipt(doc);
            return { file: entry.name, doc };
        })
        .sort((a, b) => a.file.localeCompare(b.file));
}

export function summarizeHintIngestionReceipts(receipts) {
    const producers = {};
    const totals = {
        receipts: 0,
        candidateObservations: 0,
        eligibleObservations: 0,
        refereeAcceptedObservations: 0,
        acceptedAlreadyRepresented: 0,
        quarantinedObservations: 0,
        semanticRecordChanges: 0,
        paths: 0,
        pathsUnknownReceipts: 0,
        provenanceEvents: 0,
        provenanceEventsUnknownReceipts: 0,
        occurrences: 0,
        occurrencesUnknownReceipts: 0,
    };
    const quarantineReasons = {};

    for (const { doc } of receipts) {
        const producer = doc.source.producer;
        const bucket = producers[producer] ??= {
            receipts: 0,
            sourceRuns: new Set(),
            candidateObservations: 0,
            eligibleObservations: 0,
            refereeAcceptedObservations: 0,
            acceptedAlreadyRepresented: 0,
            quarantinedObservations: 0,
            semanticRecordChanges: 0,
            paths: 0,
            pathsUnknownReceipts: 0,
            provenanceEvents: 0,
            provenanceEventsUnknownReceipts: 0,
            occurrences: 0,
            occurrencesUnknownReceipts: 0,
        };

        totals.receipts += 1;
        bucket.receipts += 1;
        if (doc.source.runId) bucket.sourceRuns.add(doc.source.runId);
        for (const [field, value] of Object.entries({
            candidateObservations: doc.funnel.candidateObservations,
            eligibleObservations: doc.funnel.eligibleObservations,
            refereeAcceptedObservations: doc.funnel.refereeAcceptedObservations,
            acceptedAlreadyRepresented: doc.funnel.acceptedAlreadyRepresented,
            quarantinedObservations: doc.funnel.quarantinedObservations,
            semanticRecordChanges: doc.additions.semanticRecordChanges,
        })) {
            add(totals, field, value);
            add(bucket, field, value);
        }
        for (const [field, value] of Object.entries({
            paths: doc.additions.paths,
            provenanceEvents: doc.additions.provenanceEvents,
            occurrences: doc.additions.occurrences,
        })) {
            addNullable(totals, field, value);
            addNullable(bucket, field, value);
        }
        for (const [reason, count] of Object.entries(doc.funnel.quarantineReasons ?? {})) {
            quarantineReasons[reason] = (quarantineReasons[reason] ?? 0) + count;
        }
    }

    const normalizedProducers = Object.fromEntries(Object.entries(producers)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([producer, bucket]) => [producer, {
            ...bucket,
            sourceRuns: [...bucket.sourceRuns].sort(),
        }]));

    return {
        root,
        semantics: {
            successSelected: true,
            notAttemptedPopulation: true,
        },
        totals,
        quarantineReasons: Object.fromEntries(Object.entries(quarantineReasons)
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
        producers: normalizedProducers,
    };
}

const report = summarizeHintIngestionReceipts(rows());
if (json) {
    console.log(JSON.stringify(report, null, 2));
} else {
    console.log(`Hint ingestion receipts: ${report.totals.receipts}`);
    console.log(`  candidates: ${report.totals.candidateObservations}`);
    console.log(`  eligible: ${report.totals.eligibleObservations}`);
    console.log(`  referee accepted: ${report.totals.refereeAcceptedObservations}`);
    console.log(`  already represented: ${report.totals.acceptedAlreadyRepresented}`);
    console.log(`  coarse semantic changes: ${report.totals.semanticRecordChanges}`);
    console.log(`  quarantined: ${report.totals.quarantinedObservations}`);
    console.log(`  exact path additions: ${report.totals.paths} (${report.totals.pathsUnknownReceipts} receipt(s) unknown)`);
    console.log(`  exact provenance-event additions: ${report.totals.provenanceEvents} (${report.totals.provenanceEventsUnknownReceipts} receipt(s) unknown)`);
    console.log(`  exact occurrence additions: ${report.totals.occurrences} (${report.totals.occurrencesUnknownReceipts} receipt(s) unknown)`);
    console.log('These are success-ingestion counts, not an attempted-population denominator.');
}
