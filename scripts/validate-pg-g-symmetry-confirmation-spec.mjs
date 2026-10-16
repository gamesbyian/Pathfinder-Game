#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { validateConfirmationSpec } from './pg-g-symmetry-confirmation-lib.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const i = a.indexOf('=');
    return [a.slice(0, i), a.slice(i + 1)];
}));
const required = name => {
    const value = args.get(name);
    if (!value) throw new Error(`${name}=... is required`);
    return value;
};
const specFile = path.resolve(required('--spec'));
const datasetRoot = path.resolve(required('--variant-family-dataset-root'));
const spec = JSON.parse(readFileSync(specFile, 'utf8'));
let mountedRef;
try {
    mountedRef = execFileSync('git', ['-C', datasetRoot, 'rev-parse', 'HEAD'], { encoding:'utf8' }).trim();
} catch (error) {
    throw new Error(`cannot verify historical dataset git identity: ${error?.message ?? error}`);
}
if (mountedRef !== spec.historicalDatasetRef) {
    throw new Error(`historical dataset mismatch: expected ${spec.historicalDatasetRef}, got ${mountedRef}`);
}
const result = validateConfirmationSpec(spec, datasetRoot);
console.log(JSON.stringify({ historicalDatasetRef:mountedRef, ...result }));
