#!/usr/bin/env node
/**
 * Validates all bundled levels in levels.js against the raw-level schema
 * and confirms that parseRawLevel produces a non-null result for each.
 *
 * Fails with exit code 1 if any level fails validation or fails to parse.
 */
import process from 'node:process';

globalThis.window = globalThis;
await import('../levels.js');
const { parseRawLevel } = await import('../modules/domain/level-codec.js');
const { validateRawLevel } = await import('../modules/domain/level-schema.js');

const levels = globalThis.RAW_LEVELS;
if (!Array.isArray(levels) || levels.length === 0) {
    console.error('RAW_LEVELS not found or empty after loading levels.js');
    process.exit(1);
}

let failures = 0;

for (let i = 0; i < levels.length; i++) {
    const levelNumber = i + 1;
    const raw = levels[i];

    const { ok, errors } = validateRawLevel(raw);
    if (!ok) {
        console.error(`Level ${levelNumber}: schema validation failed`);
        for (const err of errors) console.error(`  - ${err}`);
        failures++;
        continue;
    }

    const normalized = parseRawLevel(raw, i);
    if (!normalized) {
        console.error(`Level ${levelNumber}: parseRawLevel returned null`);
        failures++;
    }
}

if (failures > 0) {
    console.error(`\n${failures} of ${levels.length} levels failed validation.`);
    process.exit(1);
}

console.log(`All ${levels.length} bundled levels validated successfully.`);
