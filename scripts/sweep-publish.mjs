#!/usr/bin/env node
/** Shared compact-response + standard sweep publisher wrapper. Failure sources are explicit. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { createFailureResponseDocument, validateFailureResponseDocument } from './solver-failure-response-lib.mjs';

const rawArgs = process.argv.slice(2);
const values = new Map();
const failureSources = [];
for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    const key = eq < 0 ? arg.slice(2) : arg.slice(2, eq);
    const value = eq < 0 ? 'true' : arg.slice(eq + 1);
    if (key === 'failure-source') failureSources.push(value);
    else values.set(key, value);
}
const failureIn = values.get('failure-in')?.split(',').map(value => value.trim()).filter(Boolean) ?? [];
if (failureIn.includes('primary') || failureIn.includes('p')) failureSources.push(values.get('primary'));
if (failureIn.includes('include') || failureIn.includes('i')) {
    for (const arg of rawArgs.filter(arg => arg.startsWith('--include='))) failureSources.push(arg.slice('--include='.length));
}
if (!values.get('primary') || failureSources.length === 0) {
    console.error('Usage: node scripts/sweep-publish.mjs --primary=<path> --failure-in=primary[,include] [...]');
    process.exit(2);
}
if (values.has('failure-response-file')) throw new Error('sweep-publish owns --failure-response-file; use --failure-source');

function filesUnder(source) {
    if (!fs.existsSync(source)) return [];
    if (!fs.statSync(source).isDirectory()) return [source];
    return fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
        .flatMap(entry => filesUnder(path.join(source, entry.name)));
}

function rowsFromFile(file, rowsKey) {
    if (file.endsWith('.jsonl')) {
        return fs.readFileSync(file, 'utf8').split(/\r?\n/u).filter(Boolean).flatMap(line => {
            const value = JSON.parse(line);
            return Array.isArray(value?.levels) ? value.levels : Array.isArray(value?.results) ? value.results : [value];
        });
    }
    if (!file.endsWith('.json')) return null;
    const value = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (rowsKey) return Array.isArray(value?.[rowsKey]) ? value[rowsKey] : null;
    return Array.isArray(value?.levels) ? value.levels : Array.isArray(value?.results) ? value.results : null;
}

const rowsKey = values.get('failure-rows-key') || null;
const requestedSources = failureSources.flatMap(source => source.split(',')).map(source => source.trim()).filter(Boolean);
const sourceFiles = requestedSources.flatMap(filesUnder).filter(file => /\.jsonl?$/u.test(file));
const missingSourceFiles = requestedSources.filter(source => !fs.existsSync(source));
const parsed = sourceFiles.map(file => ({ file, rows: rowsFromFile(file, rowsKey) }));
const emptySourceRoots = requestedSources.filter(source => fs.existsSync(source)
    && filesUnder(source).filter(file => /\.jsonl?$/u.test(file)).length === 0);
const invalidSourceFiles = [
    ...(requestedSources.length === 0 ? ['<no-failure-sources>'] : []),
    ...emptySourceRoots,
    ...parsed.filter(item => item.rows === null).map(item => item.file),
];
const rows = parsed.flatMap(item => item.rows ?? []);
let populationIntegrity = null;
const integrityFile = values.get('integrity-file');
if (integrityFile && fs.existsSync(integrityFile)) populationIntegrity = JSON.parse(fs.readFileSync(integrityFile, 'utf8'));

const failureOut = values.get('failure-response-out')
    || path.join(path.dirname(values.get('primary')), 'compact-failure-response.json');
const document = createFailureResponseDocument(rows, {
    populationIntegrity, sourceFiles, missingSourceFiles, invalidSourceFiles,
});
validateFailureResponseDocument(document);
fs.mkdirSync(path.dirname(failureOut), { recursive: true });
fs.writeFileSync(failureOut, `${JSON.stringify(document, null, 2)}\n`);

const wrapperKeys = new Set(['failure-source', 'failure-in', 'failure-rows-key', 'failure-response-out']);
const publisherArgs = rawArgs.filter(arg => !wrapperKeys.has(arg.slice(2, arg.indexOf('=') < 0 ? undefined : arg.indexOf('='))));
publisherArgs.push(`--failure-response-file=${failureOut}`);
execFileSync(process.execPath, ['scripts/publish-solver-sweep-result.mjs', ...publisherArgs], { stdio: 'inherit' });
