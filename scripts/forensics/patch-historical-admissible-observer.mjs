#!/usr/bin/env node
/** Temporary forensic helper: add an observation-only callback to the historical admissible sort. */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(arg => arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
const root = path.resolve(args.get('--root') || '.');
const file = path.join(root, 'modules/solver/admissible-order-search.ts');
const source = readFileSync(file, 'utf8');
const needle = '    return ranked.map(r => r.key);';
if (!source.includes(needle)) throw new Error(`Historical observer patch anchor not found in ${file}`);
const replacement = `    const forensicObserver = (globalThis as any).__PF_ADMISSIBLE_FORENSIC_OBSERVER;\n    if (typeof forensicObserver === 'function') {\n        forensicObserver({\n            depth: state.path.length,\n            fromKey,\n            candidates: [...candidates],\n            ranked: ranked.map(r => ({ key: r.key, slack: Number.isFinite(r.slack) ? r.slack : String(r.slack), score: Number.isFinite(r.score) ? r.score : String(r.score) })),\n        });\n    }\n${needle}`;
const patched = source.replace(needle, replacement);
if (patched === source || patched.indexOf(replacement) !== patched.lastIndexOf(replacement)) {
    throw new Error('Historical observer patch did not apply exactly once');
}
writeFileSync(file, patched);
console.log(`Patched observation-only admissible callback into ${file}`);
