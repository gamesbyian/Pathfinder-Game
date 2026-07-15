#!/usr/bin/env node
/**
 * One-time backfill: assigns a permanent `id` (e.g. "P00042") to every published level in
 * data/levels.json that doesn't already have one — see docs/level-id-unification-plan.md.
 *
 * Preserves *current* array order as initial id order (level 1 -> id "P00001", ..., level 156 ->
 * "P00156"), so the backfill itself never reshuffles anything or changes any level's fingerprint
 * (id is excluded from domain/level-fingerprint.ts's comparison payload by construction — it's
 * simply never read there, the same way hints/provenance are excluded).
 *
 * Idempotent: skips any level that already has an `id`, and mints new ids continuing after the
 * highest existing numeric suffix (never reused), matching the idCounter pattern
 * scripts/stress/generate*.mjs already use for S-/R-prefixed ids.
 *
 * Usage:
 *   node scripts/backfill-level-ids.mjs
 */
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
    // `id` first, matching both stress corpora's established field order (see e.g.
    // data/stress/stress-levels.json) -- rebuilt rather than assigned, since `level.id = ...`
    // would append it as the LAST key instead.
    return { id: `P${String(nextIdNum++).padStart(5, '0')}`, ...level };
});

if (changed === 0) {
    console.log('published: every level already has an id, nothing to do.');
} else {
    fs.writeFileSync(file, stringifyCorpusJson(nextLevels));
    console.log(`published: backfilled ${changed} of ${levels.length} levels (P00001..P${String(nextIdNum - 1).padStart(5, '0')}).`);
}
