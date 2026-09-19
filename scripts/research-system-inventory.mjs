#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchSystemInventory } from './research-system-inventory-lib.mjs';

const args = process.argv.slice(2);
const outArg = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length) ?? null;
const inventory = buildResearchSystemInventory(process.cwd());

if (outArg) {
    const output = path.resolve(outArg);
    writeFileSync(output, JSON.stringify(inventory, null, 2) + '\n');
    console.log(JSON.stringify({ output, ...inventory.currentState, diagnostics: inventory.diagnostics }, null, 2));
} else {
    console.log(JSON.stringify(inventory, null, 2));
}
