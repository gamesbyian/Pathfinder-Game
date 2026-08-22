#!/usr/bin/env node
// Idempotent one-time backfill for permanent published-level IDs. Existing IDs are preserved; new
// IDs continue after the highest P-number. Current array order determines initial assignment, and
// `id` is excluded from structural fingerprints.
import path from 'node:path';
import fs from 'node:fs';
import { stringifyCorpusJson } from './level-json-format.mjs';

const root = new URL('..', import.meta.url).pathname;
const file = path.join(root, 'data', 'levels.json');

const levels = JSON.parse(fs.readFileSync(file, 'utf8'));

const existingIdNums = levels
    .map((l) => (typeof l.id === 'string' ? parseInt(l.id.replace(/\D/g, ''), 10) : NaN))
    .filter(Number.isFinite);
let nextIdNum = (existingIdNums.length ? Math.max(...existingIdNums) : 0) + 1;

let changed = 0;
const nextLevels = levels.map((level) => {
    if (typeof level.id === 'string' && level.id) return level;
    changed++;
    // Keep `id` first, matching stress-corpus field order.
    return { id: `P${String(nextIdNum++).padStart(5, '0')}`, ...level };
});

if (changed === 0) {
    console.log('published: every level already has an id, nothing to do.');
} else {
    fs.writeFileSync(file, stringifyCorpusJson(nextLevels));
    console.log(`published: backfilled ${changed} of ${levels.length} levels (P00001..P${String(nextIdNum - 1).padStart(5, '0')}).`);
}
