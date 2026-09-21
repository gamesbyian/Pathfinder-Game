#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';

import { createFailureResponseDocument } from './solver-failure-response-lib.mjs';

function parseArgs(argv) {
    return new Map(argv.filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
        const i = arg.indexOf('=');
        return [arg.slice(2, i), arg.slice(i + 1)];
    }));
}

function rowsOf(report) {
    if (Array.isArray(report?.levels)) return report.levels;
    if (Array.isArray(report?.rows)) return report.rows;
    if (Array.isArray(report?.results)) return report.results;
    throw new Error('report has no levels/rows/results array');
}

function bytes(value) {
    return Buffer.byteLength(value);
}

function count(rows, predicate) {
    let n = 0;
    for (const row of rows) if (predicate(row)) n += 1;
    return n;
}

function readRepositoryFile(file) {
    if (fs.existsSync(file)) return fs.readFileSync(file);
    try {
        return execFileSync('git', ['show', `HEAD:${file.replaceAll('\\\\', '/')}`], {
            encoding: null,
            maxBuffer: 256 * 1024 * 1024,
        });
    } catch {
        throw new Error(`missing repository input: ${file}`);
    }
}

function measure(file) {
    const raw = readRepositoryFile(file);
    const report = JSON.parse(raw);
    const rows = rowsOf(report);
    const document = createFailureResponseDocument(rows, {
        populationIntegrity: report.populationIntegrity ?? report.summary?.populationIntegrity ?? null,
        sourceFiles: [file],
        protocolHash: report.protocolHash ?? report.summary?.protocolHash ?? null,
        solverRef: report.commitSha ?? report.commit ?? report.summary?.commit ?? null,
    });
    const compactPretty = JSON.stringify(document, null, 2) + '\n';
    const compactMin = JSON.stringify(document);
    const fullGzip = gzipSync(raw);
    const compactGzip = gzipSync(compactPretty);

    const compactRows = document.records;
    const fullBytes = raw.length;
    const compactBytes = bytes(compactPretty);
    const compactMinBytes = bytes(compactMin);

    return {
        file,
        rows: rows.length,
        full: {
            bytes: fullBytes,
            gzipBytes: fullGzip.length,
        },
        compact: {
            bytes: compactBytes,
            minifiedBytes: compactMinBytes,
            gzipBytes: compactGzip.length,
            fractionOfFull: fullBytes ? compactBytes / fullBytes : null,
            gzipFractionOfFullGzip: fullGzip.length ? compactGzip.length / fullGzip.length : null,
        },
        sourceCoverage: {
            rowsWithAttempts: count(rows, row => Array.isArray(row?.attempts)),
            attempts: rows.reduce((sum, row) => sum + (Array.isArray(row?.attempts) ? row.attempts.length : 0), 0),
            rowsWithWinningConfig: count(rows, row => row?.winningConfig != null || row?.winningConfigKey != null),
            rowsWithWinningActionKey: count(rows, row => row?.winningActionKey != null),
            rowsWithStageLifecycle: count(rows, row => Array.isArray(row?.stageLifecycle) || (row?.stageLifecycle && typeof row.stageLifecycle === 'object')),
            rowsWithFailureInformation: count(rows, row => row?.failureInformation != null),
            rowsWithBestBadness: count(rows, row => Number.isFinite(row?.bestBadness)),
            rowsWithFinalBadness: count(rows, row => Number.isFinite(row?.finalBadness)),
        },
        compactCoverage: {
            rowsWithConfigurationKey: count(compactRows, row => row?.configurationKey != null),
            rowsWithActionKey: count(compactRows, row => row?.actionKey != null),
            rowsWithStageId: count(compactRows, row => row?.stageId != null),
            rowsWithAttempts: count(compactRows, row => Array.isArray(row?.attempts)),
            attempts: compactRows.reduce((sum, row) => sum + (Array.isArray(row?.attempts) ? row.attempts.length : 0), 0),
            rowsWithBestBadness: count(compactRows, row => Number.isFinite(row?.bestBadness)),
            rowsWithFinalBadness: count(compactRows, row => Number.isFinite(row?.finalBadness)),
        },
        intentionallyNotRetained: {
            stageLifecycleRows: count(rows, row => Array.isArray(row?.stageLifecycle) || (row?.stageLifecycle && typeof row.stageLifecycle === 'object')),
            failureInformationRows: count(rows, row => row?.failureInformation != null),
            solutionRows: count(rows, row => Array.isArray(row?.solution) && row.solution.length > 0),
        },
    };
}

const args = parseArgs(process.argv.slice(2));
const files = (args.get('in') ?? 'reports/stress/solver-corpus1-latest.json,reports/stress/solver-corpus2-latest.json')
    .split(',').map(value => value.trim()).filter(Boolean);

const measurements = files.map(file => measure(path.normalize(file)));
const totals = measurements.reduce((acc, item) => {
    acc.rows += item.rows;
    acc.fullBytes += item.full.bytes;
    acc.fullGzipBytes += item.full.gzipBytes;
    acc.compactBytes += item.compact.bytes;
    acc.compactMinifiedBytes += item.compact.minifiedBytes;
    acc.compactGzipBytes += item.compact.gzipBytes;
    acc.attempts += item.compactCoverage.attempts;
    return acc;
}, { rows: 0, fullBytes: 0, fullGzipBytes: 0, compactBytes: 0, compactMinifiedBytes: 0, compactGzipBytes: 0, attempts: 0 });

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-deterministic-retention-payload-measurement',
    inputs: files,
    measurements,
    totals: {
        ...totals,
        compactFractionOfFull: totals.fullBytes ? totals.compactBytes / totals.fullBytes : null,
        compactGzipFractionOfFullGzip: totals.fullGzipBytes ? totals.compactGzipBytes / totals.fullGzipBytes : null,
    },
    annualProjection: Object.fromEntries([12, 26, 52].map(runs => [`${runs}Runs`, {
        compactGzipBytes: totals.compactGzipBytes * runs,
        compactPrettyBytes: totals.compactBytes * runs,
    }])),
    interpretation: {
        scope: 'payload economics only; this does not authorize persistence',
        compactExcludes: ['solution paths', 'full stageLifecycle', 'failureInformation/rich diagnostics', 'mutable search state'],
        nextGate: 'decide whether corrected compact identity + attempts + dose/censoring coverage serves recurring consumers at acceptable retained size',
    },
};
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
