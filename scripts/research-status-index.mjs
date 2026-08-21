#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildResearchStatusIndex, compactResearchStatusIndex, writeResearchStatusIndex } from './research-status-index-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const outputArg = value('out');
const query = value('query');
const status = value('status');
const kind = value('kind');
const compact = args.includes('--compact') || query || status || kind;
const index = buildResearchStatusIndex(process.cwd());

if (outputArg) {
    const output = path.resolve(outputArg);
    mkdirSync(path.dirname(output), { recursive: true });
    writeResearchStatusIndex(index, output);
    console.log(JSON.stringify({ output, topics: index.evidence.length }, null, 2));
} else {
    console.log(JSON.stringify(compact ? compactResearchStatusIndex(index, { query, status, kind }) : index, null, 2));
}
