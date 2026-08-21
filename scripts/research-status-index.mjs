#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildResearchStatusIndex, writeResearchStatusIndex } from './research-status-index-lib.mjs';

const outputArg = process.argv.slice(2).find(arg => arg.startsWith('--out='))?.slice(6);
const index = buildResearchStatusIndex(process.cwd());
if (outputArg) {
    const output = path.resolve(outputArg);
    mkdirSync(path.dirname(output), { recursive: true });
    writeResearchStatusIndex(index, output);
    console.log(JSON.stringify({ output, topics: index.topics.length }, null, 2));
} else {
    console.log(JSON.stringify(index, null, 2));
}
