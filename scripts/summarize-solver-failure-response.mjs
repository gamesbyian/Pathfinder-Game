#!/usr/bin/env node
/**
 * The standard compact-failure-response producer command
 * (docs/solver-search-loss-evidence-implementation-plan.md Phase 3, "Technique census first" /
 * "Production refresh and benchmark adapters"). A solver-running workflow makes this the automatic,
 * infrastructure-owned layer by invoking this script once its rows are already combined, then
 * passing its output to `publish-solver-sweep-result.mjs --failure-response-file=`. Agents running
 * an ordinary sweep/census never need to remember a flag beyond that -- this script and the
 * publisher's flag are the whole seam.
 *
 * Reads one or more already-combined result files (a technique-census `combined-cells.json` or a
 * `combine-solver-sweep-reports.mjs`-shaped report), concatenates their rows, and writes the shared
 * scripts/solver-failure-response-lib.mjs summary.
 *
 * Usage:
 *   node scripts/summarize-solver-failure-response.mjs \
 *     --in=<file1>[,<file2>,...] --out=<path> [--rows-key=levels|results]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createFailureResponseDocument } from './solver-failure-response-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const eq = a.indexOf('=');
    return [a.slice(2, eq), a.slice(eq + 1)];
}));

const inList = args.get('in');
const outFile = args.get('out');
const rowsKey = args.get('rows-key') || 'auto';
if (!inList || !outFile) {
    console.error('Usage: node scripts/summarize-solver-failure-response.mjs --in=<file1>[,<file2>,...] --out=<path> [--rows-key=levels|results]');
    process.exit(2);
}

const inputPaths = inList.split(',').map(s => s.trim()).filter(Boolean);
const documents = inputPaths.filter(p => existsSync(p)).map(p => ({ path: p, document: JSON.parse(readFileSync(p, 'utf8')) }));

function rowsOf(document) {
    if (rowsKey === 'levels') return Array.isArray(document.levels) ? document.levels : null;
    if (rowsKey === 'results') return Array.isArray(document.results) ? document.results : null;
    return Array.isArray(document.levels) ? document.levels : (Array.isArray(document.results) ? document.results : null);
}

const rowDocuments = documents.map(item => ({ ...item, rows: rowsOf(item.document) }));
const invalidSourceFiles = rowDocuments.filter(item => item.rows === null).map(item => item.path);
const rows = rowDocuments.flatMap(item => item.rows ?? []);
// A caller-verified populationIntegrity is only reusable as-is from exactly one source document --
// merging two independently computed coverage claims correctly is out of scope here, and silently
// picking one would misrepresent the other's coverage.
const populationIntegrity = documents.length === 1 ? (documents[0].document.populationIntegrity ?? null) : null;

const summary = createFailureResponseDocument(rows, {
    populationIntegrity,
    sourceFiles: inputPaths,
    missingSourceFiles: inputPaths.filter(p => !existsSync(p)),
    invalidSourceFiles,
});

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(summary, null, 2) + '\n');
console.log(`summarize-solver-failure-response: ${summary.records.length} row(s) from ${documents.length}/${inputPaths.length} source file(s) -> ${outFile}`);
