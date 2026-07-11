#!/usr/bin/env node
/**
 * One-time backfill: normalizes every per-level hint file (published + Corpus-1 stress) onto the
 * canonical `{schemaVersion:2, hints: Hint[]}` schema (domain/hint-types.ts), upgrading legacy
 * bare-array files and the transitional stress-corpus `hintMetadata` wrapper.
 *
 * Deliberately touches ONLY the hints/<NNN>.json files, never the accompanying levels.json /
 * stress-levels.json — those files are unrelated to this migration and, for the stress corpus,
 * are hand-formatted (minified single-line JSON); round-tripping them through
 * writeLevelsWithHints would reformat the whole 15MB+ file via stringifyLevelsJson's pretty-
 * printer for zero semantic gain. Corpus 2 (stress-levels-random.json) has no hints/ directory
 * (it's solver-blind by design) and is intentionally not touched here.
 *
 * Safe to re-run: a file already in canonical schema round-trips byte-identical, so unchanged
 * files aren't rewritten.
 *
 * Usage: tsx scripts/migrate-hint-schema-v2.mjs
 */
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
