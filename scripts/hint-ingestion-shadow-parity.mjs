#!/usr/bin/env node
/**
 * Phase-6 shadow/reharvest parity gate for specialist central-ingestion receipts.
 *
 * This deliberately does not compare candidate denominators with merge-hint-artifacts: captured
 * canonical files may contain a wider historical path/event set than the specialist report. The
 * meaningful parity invariant is that, after the captured-Hint compatibility lane runs first, the
 * specialist reconstruction must not introduce a new path or semantic provenance event.
 *
 * Usage:
 *   node scripts/hint-ingestion-shadow-parity.mjs --receipt=<file> --family=<cpsat|diagnostics> --phase=<shadow|reharvest>
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { validateHintIngestionReceipt } from './hint-ingestion-receipt-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(arg => {
    const [key, ...rest] = arg.split('=');
    return [key, rest.join('=')];
}));
const receiptPath = args.get('--receipt');
const family = args.get('--family');
const phase = args.get('--phase') ?? 'shadow';
const allowEmpty = args.has('--allow-empty');

if (!receiptPath) throw new Error('--receipt is required');
if (!['cpsat', 'diagnostics'].includes(family)) throw new Error('--family must be cpsat or diagnostics');
if (!['shadow', 'reharvest'].includes(phase)) throw new Error('--phase must be shadow or reharvest');

const expectedProducer = family === 'cpsat'
    ? 'harvest-cpsat-discovery-reports'
    : 'harvest-solver-diagnostics-reports';

const receipt = validateHintIngestionReceipt(JSON.parse(readFileSync(receiptPath, 'utf8')));
const failures = [];

if (receipt.source.producer !== expectedProducer) {
    failures.push(`expected producer ${expectedProducer}, got ${receipt.source.producer}`);
}
if (!allowEmpty && receipt.funnel.refereeAcceptedObservations <= 0) {
    failures.push('parity canary observed zero referee-accepted specialist discoveries');
}
if (receipt.funnel.quarantinedObservations !== 0) {
    failures.push(`specialist lane quarantined ${receipt.funnel.quarantinedObservations} observation(s)`);
}
if (receipt.additions.paths !== 0) {
    failures.push(`specialist lane added ${receipt.additions.paths} new path(s) after captured-Hint lane`);
}
if (receipt.additions.provenanceEvents !== 0) {
    failures.push(`specialist lane added ${receipt.additions.provenanceEvents} new semantic provenance event(s) after captured-Hint lane`);
}

if (phase === 'reharvest' && receipt.additions.occurrences !== 0) {
    failures.push(`reharvest added ${receipt.additions.occurrences} occurrence(s); source-run replay is not idempotent`);
}
if (phase === 'shadow' && family === 'diagnostics' && receipt.additions.occurrences !== 0) {
    failures.push(`diagnostics shadow added ${receipt.additions.occurrences} occurrence(s); direct diagnostics output should already carry the same source run occurrence`);
}

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-hint-ingestion-shadow-parity',
    family,
    phase,
    source: receipt.source,
    refereeAcceptedObservations: receipt.funnel.refereeAcceptedObservations,
    additions: receipt.additions,
    quarantinedObservations: receipt.funnel.quarantinedObservations,
    failures,
    verdict: failures.length === 0 ? 'pass' : 'fail',
    interpretation: family === 'cpsat' && phase === 'shadow'
        ? 'CP-SAT shadow may add occurrence lineage if the legacy direct artifact lacked source-run occurrence; it must not add a path or semantic provenance event.'
        : 'The specialist lane must be semantically already represented by the earlier direct/captured lane at this gate.',
};

console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
