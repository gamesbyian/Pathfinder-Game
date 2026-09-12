#!/usr/bin/env node
/**
 * Editability-size ratchet: giant files erode reviewability and make targeted reads/edits
 * expensive (see the 2026-09 orchestration.ts/orchestration.test.ts split). This keeps three
 * categories under a rough byte target — TypeScript implementation (100 KB), TypeScript test
 * files (60 KB), and GitHub Actions workflows (40 KB) — without requiring every existing large
 * file to be split immediately.
 *
 * Unrelated files already over target when this check was added are grandfathered at their
 * CURRENT size in GRANDFATHERED below: they may shrink freely but must never grow past their
 * recorded ceiling. A file not in that list is held to the plain target. When a grandfathered
 * file is finally split/trimmed under its category target, remove its entry here rather than
 * lowering the ceiling to match — the entry only exists to freeze pre-existing debt in place.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const KB = 1024;
const TARGETS = {
    implementation: 100 * KB,
    test: 60 * KB,
    workflow: 40 * KB,
};

// path (repo-relative, forward slashes) -> allowed byte ceiling, frozen at the size the file
// already had when this ratchet was introduced. Never raise a ceiling to accommodate new growth;
// only remove an entry once the file is actually brought under its category target.
const GRANDFATHERED = {
    'modules/solver/stage-budget-core.ts': 142_883,
    'modules/domain/domain.test.ts': 79_372,
    '.github/workflows/solver-level-blind-targeted-sweep.yml': 49_827,
    '.github/workflows/solver-typical-budget-baseline.yml': 44_134,
};

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'tmp']);

function walk(dir, acc = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.') && entry.name !== '.github') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walk(full, acc);
        } else if (entry.isFile()) {
            acc.push(full);
        }
    }
    return acc;
}

function repoRelative(absolute) {
    return path.relative(process.cwd(), absolute).split(path.sep).join('/');
}

function categoryFor(relativePath) {
    if (relativePath.startsWith('.github/workflows/') && /\.ya?ml$/u.test(relativePath)) return 'workflow';
    if (relativePath.endsWith('.d.ts')) return null;
    if (relativePath.endsWith('.test.ts')) return 'test';
    if (relativePath.endsWith('.ts')) return 'implementation';
    return null;
}

const failures = [];
const staleGrandfathers = [];
const seenGrandfathered = new Set();

for (const absolute of walk(process.cwd())) {
    const relativePath = repoRelative(absolute);
    const category = categoryFor(relativePath);
    if (!category) continue;

    const size = fs.statSync(absolute).size;
    const target = TARGETS[category];
    const grandfatheredCeiling = GRANDFATHERED[relativePath];

    if (grandfatheredCeiling != null) {
        seenGrandfathered.add(relativePath);
        if (size > grandfatheredCeiling) {
            failures.push(
                `${relativePath}: ${size}B exceeds its grandfathered no-growth ceiling of ${grandfatheredCeiling}B `
                + `(category: ${category}, target: ${target}B). Shrinking is fine; growing past the frozen size is not.`,
            );
        } else if (size <= target) {
            staleGrandfathers.push(`${relativePath}: now ${size}B, at/under the ${target}B ${category} target -- remove its GRANDFATHERED entry`);
        }
        continue;
    }

    if (size > target) {
        failures.push(`${relativePath}: ${size}B exceeds the ${target}B ${category} target (not grandfathered -- new/ungrandfathered growth).`);
    }
}

for (const relativePath of Object.keys(GRANDFATHERED)) {
    if (!seenGrandfathered.has(relativePath)) {
        failures.push(`GRANDFATHERED entry for ${relativePath} no longer resolves to a tracked file -- remove the stale entry.`);
    }
}

if (staleGrandfathers.length) {
    console.log('File-size ratchet: grandfathered entries now under target (safe to delete from GRANDFATHERED):');
    for (const line of staleGrandfathers) console.log(`  - ${line}`);
}

if (failures.length) {
    console.error('File-size ratchet failed:');
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
        '\nSplit the offending file along its existing seams (see modules/solver/orchestration.ts\'s '
        + '2026-09 split for a worked example), or -- for genuinely pre-existing, unrelated debt -- add a '
        + 'GRANDFATHERED entry pinned at its current size, never higher.',
    );
    process.exit(1);
}

console.log(`File-size ratchet valid: implementation <= ${TARGETS.implementation}B, test <= ${TARGETS.test}B, workflow <= ${TARGETS.workflow}B (${Object.keys(GRANDFATHERED).length} grandfathered exception(s)).`);
