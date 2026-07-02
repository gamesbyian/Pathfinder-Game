#!/usr/bin/env node
/**
 * Validates every stored hint in data/levels.json against the game's PLAY-context
 * referee (modules/domain/path-validator.js :: validateCandidatePath) — the same
 * check the player's own drawn path must pass. A hint that fails here is an
 * unplayable suggestion: following it would fail in play (e.g. it walks onto a
 * goose/false-goal cell, breaks the length/intersection budget, or reuses an edge).
 *
 * This guards against re-introducing unplayable hints as the corpus is expanded by
 * hint-discovery tooling. The solver itself excludes geese/false-goals from its
 * search graph, so it cannot generate such paths — but legacy/imported data can,
 * and discovery generators that fabricate cells outside getNeighbors could too.
 *
 * Fails with exit code 1 if any hint is PLAY-invalid.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const { parseRawLevel } = await import('../modules/domain/level-codec.js');
const { validateCandidatePath } = await import('../modules/domain/path-validator.js');

const root = new URL('..', import.meta.url).pathname;
const levels = JSON.parse(readFileSync(path.join(root, 'data', 'levels.json'), 'utf8'));
if (!Array.isArray(levels) || levels.length === 0) {
    console.error('data/levels.json is empty or not an array');
    process.exit(1);
}

let total = 0;
const failures = [];

for (let i = 0; i < levels.length; i++) {
    const levelNumber = i + 1;
    const level = parseRawLevel(levels[i], i);
    if (!level) continue; // structural validity is covered by validate-bundled-levels
    const hints = Array.isArray(levels[i].hints) ? levels[i].hints : [];
    for (let h = 0; h < hints.length; h++) {
        total++;
        const v = validateCandidatePath(level, hints[h]);
        if (!v.ok) failures.push(`Level ${levelNumber} hint #${h}: ${v.reason}`);
    }
}

if (failures.length > 0) {
    console.error(`${failures.length} of ${total} stored hints are PLAY-invalid:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
}

console.log(`All ${total} stored hints are valid under the PLAY referee.`);
