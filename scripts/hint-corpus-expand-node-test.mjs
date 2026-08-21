#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/hint-corpus-expand.mjs, which since Component 12 of the
 * hint-workbench plan calls the shared modules/domain/hint-acceptance-pipeline.ts sequence
 * instead of re-implementing dedupe/validate/canonicalize/policy-decide inline. This file
 * proves the CLI wrapper — arg parsing, fixture read/write, --dry-run, report shape including
 * the new provenance.sourceCommit field — still works end to end after that migration.
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { readLevelsWithHints } = await import('./level-data-io.mjs');

// scripts/hint-corpus-expand.mjs resolves --levels-json as `path.join(ROOT, cfg.levelsJsonPath)`
// unconditionally, so the fixture must live under ROOT and be referenced by a ROOT-relative
// path. tmp/ is gitignored, so a fixture under ROOT/tmp never risks landing in git status.
async function writeFixtureLevel(fixtureDirAbs) {
    const sourceLevels = readLevelsWithHints(path.join(ROOT, 'data/levels.json'));
    await mkdir(fixtureDirAbs, { recursive: true });
    const fixtureLevelsPathAbs = path.join(fixtureDirAbs, 'levels.json');
    await writeFile(fixtureLevelsPathAbs, `${JSON.stringify([sourceLevels[0]], null, 2)}\n`);
    return path.relative(ROOT, fixtureLevelsPathAbs);
}

async function runCorpusExpand(args) {
    return execFile('node', ['scripts/run-bundled.mjs', 'scripts/hint-corpus-expand.mjs', ...args], {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
    });
}

async function main() {
    await mkdir(path.join(ROOT, 'tmp'), { recursive: true });
    const tempDir = await mkdtemp(path.join(ROOT, 'tmp', 'hint-corpus-expand-test-'));
    try {
        const fixtureDir = path.join(tempDir, 'fixture');
        const fixtureLevelsPathRelative = await writeFixtureLevel(fixtureDir);
        const fixtureLevelsPathAbs = path.join(ROOT, fixtureLevelsPathRelative);
        const beforeHints = readLevelsWithHints(fixtureLevelsPathAbs)[0].hints.length;

        // --dry-run must never mutate the fixture.
        const dryRunOutput = path.join(tempDir, 'dry-run-report.json');
        const dryRunResult = await runCorpusExpand([
            `--levels-json=${fixtureLevelsPathRelative}`,
            '--levels=pos:1',
            '--restarts=1',
            '--node-budget=500',
            '--seed=20260703',
            `--output=${dryRunOutput}`,
            '--dry-run',
        ]);
        assert.match(dryRunResult.stdout, /Total accepted:/);
        const dryRunReport = JSON.parse(await readFile(dryRunOutput, 'utf8'));
        assert.equal(typeof dryRunReport.provenance.sourceCommit, 'string');
        assert.ok(dryRunReport.provenance.sourceCommit.length > 0);
        assert.equal(dryRunReport.levels.length, 1);
        const dryRunLevelReport = dryRunReport.levels[0];
        assert.equal(dryRunLevelReport.level, 1);
        assert.equal(dryRunLevelReport.hintCountBefore, beforeHints);
        assert.ok(Array.isArray(dryRunLevelReport.acceptedPaths));
        assert.equal(dryRunLevelReport.acceptedPaths.length, dryRunLevelReport.acceptedCount);
        // Rejection reasons use the shared pipeline's vocabulary (exact-duplicate/canonical-duplicate/
        // invalid:.../policy reasons), not a flattened 'duplicate' bucket.
        for (const reason of Object.keys(dryRunLevelReport.rejected)) {
            assert.ok(
                reason === 'exact-duplicate' || reason === 'canonical-duplicate' || reason.startsWith('invalid:')
                || ['at-cap', 'duplicate', 'coverage-novel', 'low-heatmap-novelty', 'distinct-heatmap-novel', 'heatmap-novel', 'too-similar'].includes(reason),
                `unexpected rejection reason bucket: ${reason}`,
            );
        }

        const afterDryRunHints = readLevelsWithHints(fixtureLevelsPathAbs)[0].hints.length;
        assert.equal(afterDryRunHints, beforeHints, '--dry-run must not mutate the fixture');

        // --write-levels persists accepted candidates and is deterministic given the same seed.
        const writeOutput = path.join(tempDir, 'write-report.json');
        await runCorpusExpand([
            `--levels-json=${fixtureLevelsPathRelative}`,
            '--levels=pos:1',
            '--restarts=1',
            '--node-budget=500',
            '--seed=20260703',
            `--output=${writeOutput}`,
            '--write-levels',
        ]);
        const writeReport = JSON.parse(await readFile(writeOutput, 'utf8'));
        const writeLevelReport = writeReport.levels[0];
        assert.deepEqual(writeLevelReport.acceptedPaths, dryRunLevelReport.acceptedPaths, 'same seed produces the same accepted paths (design principle 6: deterministic runs)');

        const afterWriteHints = readLevelsWithHints(fixtureLevelsPathAbs)[0].hints.length;
        assert.equal(afterWriteHints, beforeHints + writeLevelReport.acceptedCount);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
