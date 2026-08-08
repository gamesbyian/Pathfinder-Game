#!/usr/bin/env node
/**
 * Enforces the level-provenance invariant documented in CLAUDE.md's "Provenance"
 * section: every level in each of the 3 real corpora (published, stress-corpus-1,
 * stress-corpus-2) must carry a non-null `provenance` field with at least one
 * history entry. New levels get this stamped at creation time (editor
 * createNewLevel, the two stress generators, submission/review approval) — this
 * check guards against a future code path silently dropping it, or a new level
 * being added to a corpus file by hand without it.
 *
 * The same pass also enforces globally unique, non-empty persistent level ids. Hint artifacts,
 * reports, and several cross-corpus tools join on this id; the historical R02000 collision proved
 * that per-corpus uniqueness is insufficient and silently selects/overwrites the wrong puzzle.
 *
 * Fails with exit code 1 if any level is missing provenance/id or any id is reused.
 */
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';

const root = new URL('..', import.meta.url).pathname;

const CORPORA = [
    { file: path.join(root, 'data', 'levels.json'), label: 'published' },
    { file: path.join(root, 'data', 'stress', 'stress-levels.json'), label: 'stress-corpus-1' },
    { file: path.join(root, 'data', 'stress', 'stress-levels-random.json'), label: 'stress-corpus-2' },
];

let totalChecked = 0;
const failures = [];
const idOwners = new Map();

for (const { file, label } of CORPORA) {
    if (!fs.existsSync(file)) {
        console.error(`${label}: expected corpus file not found at ${file}`);
        process.exit(1);
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(levels) || levels.length === 0) {
        console.error(`${label}: ${file} is empty or not an array`);
        process.exit(1);
    }
    for (let i = 0; i < levels.length; i++) {
        totalChecked++;
        const level = levels[i];
        if (typeof level.id !== 'string' || level.id.length === 0) {
            failures.push(`${label} level index ${i}: missing or empty persistent id`);
        } else {
            // Selectors are case-insensitive and common development filesystems are too, so ids
            // differing only by case are still a collision for both lookup and hint filenames.
            const idKey = level.id.toUpperCase();
            const previous = idOwners.get(idKey);
            if (previous) {
                failures.push(`duplicate level id ${level.id}: ${previous} and ${label} level index ${i}`);
            } else {
                idOwners.set(idKey, `${label} level index ${i} (id ${level.id})`);
            }
        }
        const provenance = level.provenance;
        if (!provenance || !Array.isArray(provenance.history) || provenance.history.length === 0) {
            failures.push(`${label} level index ${i} (id ${level.id ?? i + 1}): missing or empty provenance.history`);
        }
    }
}

if (failures.length > 0) {
    console.error(`${failures.length} level provenance/identity invariant violation(s) across ${totalChecked} levels:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}

console.log(`All ${totalChecked} levels across ${CORPORA.length} corpora carry provenance and globally unique persistent ids.`);
