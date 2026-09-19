#!/usr/bin/env node
/**
 * Join run-linked hint discovery-process evidence to comparable compact failure-response documents.
 *
 * Usage:
 *   node scripts/hint-failure-process-join.mjs --discovery=a.json[,b.json] --failure=x.json[,y.json]
 *     [--out=<json>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { validateHintDiscoveryProcessEvidence } from './hint-discovery-process-evidence-lib.mjs';
import { joinHintDiscoveryAndFailureProcesses } from './hint-failure-process-join-lib.mjs';
import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const eq = arg.indexOf('=');
    return [arg.slice(2, eq), arg.slice(eq + 1)];
}));
const discoveryFiles = (args.get('discovery') ?? '').split(',').map(value => value.trim()).filter(Boolean);
const failureFiles = (args.get('failure') ?? '').split(',').map(value => value.trim()).filter(Boolean);
const outFile = args.get('out') ?? null;
if (!discoveryFiles.length || !failureFiles.length) {
    console.error('Usage: node scripts/hint-failure-process-join.mjs --discovery=a.json[,b.json] --failure=x.json[,y.json] [--out=<json>]');
    process.exit(2);
}
const missing = [...discoveryFiles, ...failureFiles].filter(file => !existsSync(file));
if (missing.length) throw new Error(`missing input(s): ${missing.join(', ')}`);

const discoveryDocuments = discoveryFiles.map(file =>
    validateHintDiscoveryProcessEvidence(JSON.parse(readFileSync(file, 'utf8'))));
const failureDocuments = failureFiles.map(file =>
    validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8'))));

const result = {
    ...joinHintDiscoveryAndFailureProcesses(discoveryDocuments, failureDocuments),
    inputs: { discoveryFiles, failureFiles },
};

const json = JSON.stringify(result, null, 2) + '\n';
if (outFile) {
    writeFileSync(path.resolve(outFile), json);
    console.error(`hint-failure-process-join: ${result.summary.joinedDiscoveryRecords} joined discovery record(s) -> ${outFile}`);
} else {
    process.stdout.write(json);
}
