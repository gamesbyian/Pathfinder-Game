#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchSystemInventory, researchSystemInventoryView } from './research-system-inventory-lib.mjs';

const args = process.argv.slice(2);
const outArg = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length) ?? null;
const viewArg = args.find(arg => arg.startsWith('--view='))?.slice('--view='.length) ?? 'all';
const inventory = buildResearchSystemInventory(process.cwd());
const rendered = researchSystemInventoryView(inventory, viewArg);

if (outArg) {
    const output = path.resolve(outArg);
    writeFileSync(output, JSON.stringify(rendered, null, 2) + '\n');
    console.log(JSON.stringify({ output, ...inventory.currentState, diagnostics: inventory.diagnostics }, null, 2));
} else {
    console.log(JSON.stringify(rendered, null, 2));
}
