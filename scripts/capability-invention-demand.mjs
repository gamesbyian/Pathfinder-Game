#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { researchResolutionEnvelopeIssues } from './research-resolution-envelope-lib.mjs';

const DEFAULT_FILE = 'data/stress/capability-invention-demand.json';
const WORK_CLASSES = new Set(['HARVEST', 'EXTENSION', 'INVENTION', 'UNKNOWN']);
const DIAGNOSIS_STATUSES = new Set(['resolved', 'partial', 'unresolved']);
const FIRST_LOSS_CLASSES = new Set([
    ...Array.from({ length: 15 }, (_, index) => `F${index}`),
    'UNRESOLVED_EARLIER_CLASS',
]);
const RECURRENCE_SCOPES = new Set([
    'single-observation',
    'single-parent',
    'multiple-independent-parents',
    'population-level',
]);

function parseArgs(argv) {
    const out = { file: DEFAULT_FILE, json: false };
    for (const arg of argv) {
        if (arg === '--json') out.json = true;
        else if (arg.startsWith('--file=')) out.file = arg.slice('--file='.length);
        else if (arg === '--help' || arg === '-h') out.help = true;
        else throw new Error(`Unknown argument: ${arg}`);
    }
    return out;
}

function requireNonEmptyString(value, label, errors) {
    if (typeof value !== 'string' || value.trim() === '') {
        errors.push(`${label} must be a non-empty string`);
    }
}

export function validateCapabilityInventionDemand(doc) {
    const errors = [];
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
        return ['register must be a JSON object'];
    }
    if (doc.schemaVersion !== 1) errors.push('schemaVersion must equal 1');
    requireNonEmptyString(doc.purpose, 'purpose', errors);
    requireNonEmptyString(doc.researchQuestion, 'researchQuestion', errors);
    if (!Array.isArray(doc.rows)) {
        errors.push('rows must be an array');
        return errors;
    }

    const ids = new Set();
    for (const [index, row] of doc.rows.entries()) {
        const prefix = `rows[${index}]`;
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            errors.push(`${prefix} must be an object`);
            continue;
        }

        requireNonEmptyString(row.id, `${prefix}.id`, errors);
        if (typeof row.id === 'string' && !/^CID-[0-9]{4}$/u.test(row.id)) {
            errors.push(`${prefix}.id must match CID-0000`);
        }
        if (ids.has(row.id)) errors.push(`${prefix}.id duplicates ${row.id}`);
        ids.add(row.id);

        if (!row.subject || typeof row.subject !== 'object') {
            errors.push(`${prefix}.subject must be an object`);
        } else {
            requireNonEmptyString(row.subject.levelId, `${prefix}.subject.levelId`, errors);
            requireNonEmptyString(row.subject.population, `${prefix}.subject.population`, errors);
        }

        if (!DIAGNOSIS_STATUSES.has(row.diagnosisStatus)) {
            errors.push(`${prefix}.diagnosisStatus is invalid`);
        }
        if (!FIRST_LOSS_CLASSES.has(row.firstLossClass)) {
            errors.push(`${prefix}.firstLossClass is invalid`);
        }
        if (!WORK_CLASSES.has(row.workClass)) {
            errors.push(`${prefix}.workClass is invalid`);
        }
        if (!RECURRENCE_SCOPES.has(row.recurrenceScope)) {
            errors.push(`${prefix}.recurrenceScope is invalid`);
        }

        if (!Array.isArray(row.evidenceRefs) || row.evidenceRefs.length === 0) {
            errors.push(`${prefix}.evidenceRefs must contain at least one reference`);
        } else {
            for (const [refIndex, ref] of row.evidenceRefs.entries()) {
                requireNonEmptyString(ref, `${prefix}.evidenceRefs[${refIndex}]`, errors);
            }
        }

        requireNonEmptyString(row.demand, `${prefix}.demand`, errors);
        if (!Array.isArray(row.atlasDimensions)) {
            errors.push(`${prefix}.atlasDimensions must be an array`);
        }
        if (!row.smallestProbe || typeof row.smallestProbe !== 'object') {
            errors.push(`${prefix}.smallestProbe must be an object`);
        } else {
            requireNonEmptyString(row.smallestProbe.question, `${prefix}.smallestProbe.question`, errors);
            requireNonEmptyString(row.smallestProbe.decisionSeam, `${prefix}.smallestProbe.decisionSeam`, errors);
            requireNonEmptyString(row.smallestProbe.advanceIf, `${prefix}.smallestProbe.advanceIf`, errors);
        }

        if (row.diagnosisStatus === 'unresolved' && row.firstLossClass !== 'UNRESOLVED_EARLIER_CLASS') {
            errors.push(`${prefix}: unresolved diagnosis must use UNRESOLVED_EARLIER_CLASS`);
        }
        if (row.workClass === 'UNKNOWN' && row.diagnosisStatus === 'resolved') {
            errors.push(`${prefix}: resolved diagnosis should not retain UNKNOWN workClass`);
        }

        if (row.resolution != null) {
            errors.push(...researchResolutionEnvelopeIssues(row.resolution, { path: `${prefix}.resolution` }));
            if (row.diagnosisStatus === 'resolved' && row.resolution?.resolutionStatus !== 'resolution-ready') {
                errors.push(`${prefix}: resolved diagnosis requires resolution-ready shared resolution envelope`);
            }
        }
        if (row.resolutionRef != null) {
            requireNonEmptyString(row.resolutionRef, `${prefix}.resolutionRef`, errors);
        }
        const recurrentAcquisition = (row.workClass === 'EXTENSION' || row.workClass === 'INVENTION')
            && (row.recurrenceScope === 'multiple-independent-parents' || row.recurrenceScope === 'population-level');
        if (recurrentAcquisition && row.resolution == null
            && (typeof row.resolutionRef !== 'string' || !row.resolutionRef.trim())) {
            errors.push(`${prefix}: recurrent EXTENSION/INVENTION demand requires resolution or resolutionRef`);
        }
    }
    return errors;
}

function increment(map, key) {
    map[key] = (map[key] ?? 0) + 1;
}

export function summarizeCapabilityInventionDemand(doc) {
    const byWorkClass = {};
    const byFirstLossClass = {};
    const byDiagnosisStatus = {};
    const recurrentAcquisition = [];

    for (const row of doc.rows ?? []) {
        increment(byWorkClass, row.workClass);
        increment(byFirstLossClass, row.firstLossClass);
        increment(byDiagnosisStatus, row.diagnosisStatus);
        if (
            (row.workClass === 'EXTENSION' || row.workClass === 'INVENTION')
            && (row.recurrenceScope === 'multiple-independent-parents' || row.recurrenceScope === 'population-level')
        ) {
            recurrentAcquisition.push(row.id);
        }
    }

    return {
        rows: doc.rows?.length ?? 0,
        byWorkClass,
        byFirstLossClass,
        byDiagnosisStatus,
        recurrentAcquisition,
    };
}

function formatSummary(summary) {
    const line = (label, counts) => {
        const body = Object.entries(counts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join(' ');
        return `${label}: ${body || 'none'}`;
    };
    return [
        `Capability-invention demand rows: ${summary.rows}`,
        line('Work class', summary.byWorkClass),
        line('First loss', summary.byFirstLossClass),
        line('Diagnosis', summary.byDiagnosisStatus),
        `Recurrent acquisition nominations: ${summary.recurrentAcquisition.join(', ') || 'none'}`,
    ].join('\n');
}

function usage() {
    return [
        'Usage: node scripts/capability-invention-demand.mjs [--file=<path>] [--json]',
        '',
        `Default file: ${DEFAULT_FILE}`,
        'Validates the demand register and prints a compact portfolio summary.',
    ].join('\n');
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(usage());
        return;
    }
    const filename = path.resolve(process.cwd(), args.file);
    const doc = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const errors = validateCapabilityInventionDemand(doc);
    if (errors.length > 0) {
        for (const error of errors) console.error(`ERROR: ${error}`);
        process.exitCode = 1;
        return;
    }
    const summary = summarizeCapabilityInventionDemand(doc);
    console.log(args.json ? JSON.stringify(summary, null, 2) : formatSummary(summary));
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(error?.stack ?? String(error));
        process.exitCode = 1;
    });
}
