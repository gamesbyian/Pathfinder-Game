#!/usr/bin/env node
/**
 * One-time migration: renames a corpus's hint files from array-position-keyed names
 * (e.g. "00011.json") to id-keyed names (e.g. "S00028.json"), matching level-data-io.mjs's
 * hintKeyForLevel() now that it's the actual join key — see docs/level-id-unification-plan.md.
 *
 * Originally covered only the two stress corpora (2026-07-12, whose ids already existed at the
 * time); the published corpus was added once it got its own P-prefixed ids (2026-07-15, see
 * scripts/backfill-level-ids.mjs). A corpus whose levels have no `id` field is a no-op (every
 * level's hintKeyForLevel() falls back to position, so oldPath === newPath for all of them).
 *
 * Two-phase rename (old name -> temp name -> new name) so no rename can ever clobber a file that
 * hasn't been processed yet, even though a direct check found no id collisions in any corpus
 * today — this is cheap insurance, not a response to a known problem.
 *
 * Read-only dry run by default; pass --write to actually rename. Verifies afterward (--write only)
 * that readLevelsWithHints() finds the exact same total hint count as before the migration.
 *
 * Usage:
 *   node scripts/migrate-hint-files-to-id-keys.mjs           # dry run, prints the plan
 *   node scripts/migrate-hint-files-to-id-keys.mjs --write   # actually renames
 */
import { existsSync, readFileSync, renameSync, mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { hintFilePathFor, hintKeyForLevel } from './level-data-io.mjs';

const WRITE = process.argv.includes('--write');
const ROOT = process.cwd();

const CORPORA = [
    { file: 'data/levels.json', label: 'published' },
    { file: 'data/stress/stress-levels.json', label: 'corpus-1' },
    { file: 'data/stress/stress-levels-random.json', label: 'corpus-2' },
];

// Sums hint counts directly from each file's own content, independent of the position/id
// join-key scheme — safe to call both before and after the rename, and actually verifies the
// rename didn't lose/duplicate content (unlike going through readLevelsWithHints(), which by
// definition can't see files under a naming scheme it isn't currently looking for).
function sumHintsAt(filePaths) {
    return filePaths.reduce((sum, p) => {
        if (!existsSync(p)) return sum;
        return sum + JSON.parse(readFileSync(p, 'utf8')).hints.length;
    }, 0);
}

for (const { file, label } of CORPORA) {
    // Read the levels array RAW (not through readLevelsWithHints, which now computes the NEW
    // id-based key) so this migration can independently compute both the OLD (position) and NEW
    // (id) path for every level, regardless of which one the current code happens to resolve.
    // The published corpus is a bare array on disk; both stress corpora wrap it as {levels: [...]}.
    const parsed = JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;

    const moves = [];
    levels.forEach((level, i) => {
        const position = i + 1;
        const oldPath = hintFilePathFor(path.resolve(ROOT, file), position);
        const newKey = hintKeyForLevel(level, position);
        if (newKey === position) return; // no id on this level (shouldn't happen post-backfill)
        const newPath = hintFilePathFor(path.resolve(ROOT, file), newKey);
        if (oldPath === newPath) return; // e.g. a level whose id numeric part happens to equal its position
        if (!existsSync(oldPath)) return; // sparse hints dir — nothing to move for this level
        moves.push({ id: level.id, position, oldPath, newPath });
    });

    console.log(`${label}: ${moves.length} hint file(s) to rename (of ${levels.length} levels).`);
    if (!WRITE) {
        for (const m of moves.slice(0, 5)) {
            console.log(`  ${path.relative(ROOT, m.oldPath)} -> ${path.relative(ROOT, m.newPath)}`);
        }
        if (moves.length > 5) console.log(`  ... and ${moves.length - 5} more`);
        continue;
    }

    const dupNewPaths = new Map();
    for (const m of moves) dupNewPaths.set(m.newPath, (dupNewPaths.get(m.newPath) || 0) + 1);
    const collisions = [...dupNewPaths.entries()].filter(([, n]) => n > 1);
    if (collisions.length > 0) {
        console.error(`${label}: ABORTING — ${collisions.length} target path collision(s), would clobber:`, collisions);
        process.exit(1);
    }

    const beforeCount = sumHintsAt(moves.map((m) => m.oldPath));

    // Phase 1: stage every source file into a scratch dir under its final basename, so a target
    // name that happens to equal a DIFFERENT level's OLD name can never be clobbered mid-sequence.
    const stagingDir = mkdtempSync(path.join(tmpdir(), 'hint-migration-'));
    for (const m of moves) {
        renameSync(m.oldPath, path.join(stagingDir, path.basename(m.newPath)));
    }
    // Phase 2: move from staging to the real target paths.
    for (const m of moves) {
        renameSync(path.join(stagingDir, path.basename(m.newPath)), m.newPath);
    }
    rmdirSync(stagingDir);

    const afterCount = sumHintsAt(moves.map((m) => m.newPath));
    console.log(`${label}: renamed ${moves.length} file(s). Hint count before=${beforeCount} after=${afterCount}.`);
    if (beforeCount !== afterCount) {
        console.error(`${label}: MISMATCH — migration may have lost or duplicated hints. Investigate before committing.`);
        process.exit(1);
    }
}

if (!WRITE) console.log('\nDry run only — re-run with --write to apply.');
