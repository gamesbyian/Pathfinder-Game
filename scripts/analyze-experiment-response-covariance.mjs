#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { analyzeExperimentResponseCovariance } from './experiment-response-covariance-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('='); return [key, value.join('=')];
}));
const input = args.get('--input'), out = args.get('--out');
if (!input || !out) throw new Error('--input=<json> and --out=<json> are required');
const document = JSON.parse(readFileSync(input, 'utf8'));
const experiments = Array.isArray(document) ? document : document.experiments;
const minShared = Number(args.get('--min-shared') ?? 2);
const result = analyzeExperimentResponseCovariance(experiments, { minShared });
writeFileSync(out, `${JSON.stringify({ ...result, provenance: { input, minShared } }, null, 2)}\n`);
console.log(`Wrote ${out}: ${result.nominations.length} ancestry-independent nomination(s)`);
