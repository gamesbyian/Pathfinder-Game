#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { analyzeWorkLadder } from './work-ladder-response-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('='); return [key, value.join('=')];
}));
const inputs = (args.get('--inputs') ?? '').split(',').filter(Boolean);
const budgets = (args.get('--work-budgets') ?? '').split(',').filter(Boolean).map(Number);
const out = args.get('--out');
if (inputs.length < 2 || inputs.length !== budgets.length || !out) {
    throw new Error('--inputs=<a,b,...>, --work-budgets=<n,n,...>, and --out=<file> are required with matching lengths');
}
const cells = inputs.map((file, index) => ({ ...JSON.parse(readFileSync(file, 'utf8')), workBudget: budgets[index] }));
const result = { ...analyzeWorkLadder(cells), provenance: { inputs, workBudgets: budgets } };
writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${out}: ${result.perLevel.length} levels across ${result.budgets.length} work budgets`);
