#!/usr/bin/env node
/**
 * Validates all bundled levels in data/levels.json against the raw-level schema
 * and confirms that parseRawLevel produces a non-null result for each.
 *
 * Fails with exit code 1 if any level fails validation or fails to parse.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const { parseRawLevelDetailed } = await import('../modules/domain/level-codec.js');

const root = new URL('..', import.meta.url).pathname;
const levels = JSON.parse(readFileSync(path.join(root, 'data', 'levels.json'), 'utf8'));
if (!Array.isArray(levels) || levels.length === 0) {
    console.error('data/levels.json is empty or not an array');
    process.exit(1);
}

let failures = 0;

for (let i = 0; i < levels.length; i++) {
    const levelNumber = i + 1;
    const { ok, errors } = parseRawLevelDetailed(levels[i], i);
    if (!ok) {
        console.error(`Level ${levelNumber}: validation/parse failed`);
        for (const err of errors) console.error(`  - ${err}`);
        failures++;
    }
}

if (failures > 0) {
    console.error(`\n${failures} of ${levels.length} levels failed validation.`);
    process.exit(1);
}

console.log(`All ${levels.length} bundled levels validated successfully.`);
