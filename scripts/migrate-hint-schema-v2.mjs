#!/usr/bin/env node
// Idempotent one-time migration of published/Corpus-1 per-level hint files to canonical
// `{schemaVersion:2, hints: Hint[]}`. It touches only hints/<NNN>.json; Corpus 2 has no hints dir.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hintsDirFor, listHintFiles, parseHintFileContents, stringifyHints } from './level-data-io.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function migrateHintsDir(relativeLevelsJsonPath) {
    const levelsJsonPath = path.join(ROOT, relativeLevelsJsonPath);
    const dir = hintsDirFor(levelsJsonPath);
    if (!existsSync(dir)) { console.log(`${relativeLevelsJsonPath}: no hints/ directory, skipped.`); return; }
    let changed = 0;
    const files = listHintFiles(levelsJsonPath);
    for (const fileName of files) {
        const filePath = path.join(dir, fileName);
        const prev = readFileSync(filePath, 'utf8');
        const records = parseHintFileContents(JSON.parse(prev), filePath);
        const next = stringifyHints(records);
        if (next !== prev) { writeFileSync(filePath, next); changed++; }
    }
    console.log(`${relativeLevelsJsonPath}: ${files.length} hint file(s), ${changed} changed.`);
}

migrateHintsDir('data/levels.json');
migrateHintsDir('data/stress/stress-levels.json');
