#!/usr/bin/env node
/**
 * Join solved solver-result rows to stored hints by exact complete solution path and expose the
 * pre-success attempt process. Read-only: no hint sidecars are rewritten.
 *
 * Accepted input shapes: a raw row array, {levels:[...]}, {data:{levels:[...]}} or {results:[...]}.
 *
 * Usage:
 *   node scripts/hint-discovery-process.mjs --in=<solver-report.json> [--levels=data/levels.json]
 *     [--parent=P00001] [--out=tmp/hint-discovery-process.json]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { readLevelHints } from './level-data-io.mjs';
import { joinSolvedRowsToHintDiscoveryProcesses } from './hint-discovery-process-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const eq = arg.indexOf('=');
    return [arg.slice(2, eq), arg.slice(eq + 1)];
}));
const inputFile = args.get('in');
const levelsFile = args.get('levels') ?? 'data/levels.json';
const parentFilter = args.get('parent') ?? null;
const outFile = args.get('out') ?? null;
if (!inputFile) {
    console.error('Usage: node scripts/hint-discovery-process.mjs --in=<solver-report.json> [--levels=<levels.json>] [--parent=<id>] [--out=<json>]');
    process.exit(2);
}

const parsed = JSON.parse(readFileSync(inputFile, 'utf8'));
const rows = Array.isArray(parsed) ? parsed
    : Array.isArray(parsed?.levels) ? parsed.levels
        : Array.isArray(parsed?.data?.levels) ? parsed.data.levels
            : Array.isArray(parsed?.results) ? parsed.results
                : null;
if (!rows) throw new Error('input must be a row array or contain levels[], data.levels[], or results[]');

const selectedRows = parentFilter
    ? rows.filter(row => String(row?.parentId ?? row?.levelId ?? row?.id ?? row?.level ?? '') === parentFilter)
    : rows;

const hintCache = new Map();
function resolveHints(parentId) {
    if (parentId == null) return [];
    const key = String(parentId);
    if (!hintCache.has(key)) hintCache.set(key, readLevelHints(levelsFile, key));
    return hintCache.get(key);
}

const joined = joinSolvedRowsToHintDiscoveryProcesses(selectedRows, { resolveHints });
const result = {
    schemaVersion: 1,
    kind: 'pathfinder-hint-discovery-process-join',
    sourceReport: inputFile,
    levels: levelsFile,
    semantics: {
        binding: 'exact complete solution path equality',
        persistence: 'derived read-only join; stored hint provenance is unchanged',
        process: 'attempt sequence through the first successful attempt; later attempts excluded',
        unmatched: 'no exact stored hint match; no heuristic join attempted',
    },
    ...joined,
};

const json = JSON.stringify(result, null, 2) + '\n';
if (outFile) {
    writeFileSync(path.resolve(outFile), json);
    console.error(`hint-discovery-process: ${result.summary.exactHintMatchedRows} exact match(es) -> ${outFile}`);
} else {
    process.stdout.write(json);
}
