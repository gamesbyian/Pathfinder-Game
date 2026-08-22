#!/usr/bin/env node
// Idempotent migration from position-keyed hint filenames (00011.json) to permanent level IDs.
// Dry-run by default; --write uses a two-phase temp rename to prevent clobbering, rejects duplicate
// targets, and verifies the moved files' total hint count. Levels without IDs are unchanged.
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

// Count file contents independently of either filename join scheme.
function sumHintsAt(filePaths) {
    return filePaths.reduce((sum, p) => {
        if (!existsSync(p)) return sum;
        return sum + JSON.parse(readFileSync(p, 'utf8')).hints.length;
    }, 0);
}

for (const { file, label } of CORPORA) {
    // Read raw levels so old position paths and new ID paths can be computed independently.
    const parsed = JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;

    const moves = [];
    levels.forEach((level, i) => {
        const position = i + 1;
        const oldPath = hintFilePathFor(path.resolve(ROOT, file), position);
        const newKey = hintKeyForLevel(level, position);
        if (newKey === position) return;
        const newPath = hintFilePathFor(path.resolve(ROOT, file), newKey);
        if (oldPath === newPath) return;
        if (!existsSync(oldPath)) return;
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

    // Stage every source first so a target matching another source cannot be clobbered mid-run.
    const stagingDir = mkdtempSync(path.join(tmpdir(), 'hint-migration-'));
    for (const m of moves) {
        renameSync(m.oldPath, path.join(stagingDir, path.basename(m.newPath)));
    }
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
