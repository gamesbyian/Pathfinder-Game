#!/usr/bin/env node
/**
 * Project existing known-solution-prefix survival output into compact parent-level extinction rows
 * that can be joined with failure/search-loss evidence.
 *
 * Usage:
 *   node scripts/known-support-extinction.mjs --in=<survival.json> [--out=<json>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { projectKnownSupportExtinctionDocument } from './known-support-extinction-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const eq = arg.indexOf('=');
    return [arg.slice(2, eq), arg.slice(eq + 1)];
}));
const inputFile = args.get('in');
const outFile = args.get('out') ?? null;
if (!inputFile) {
    console.error('Usage: node scripts/known-support-extinction.mjs --in=<survival.json> [--out=<json>]');
    process.exit(2);
}

const source = JSON.parse(readFileSync(inputFile, 'utf8'));
const result = {
    ...projectKnownSupportExtinctionDocument(source),
    sourceFile: inputFile,
};

const json = JSON.stringify(result, null, 2) + '\n';
if (outFile) {
    writeFileSync(path.resolve(outFile), json);
    console.error(`known-support-extinction: projected ${result.rows.length} parent(s) -> ${outFile}`);
} else {
    process.stdout.write(json);
}
