#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/hint-diversification.mjs, which since Component 4 of the
 * hint-workbench plan calls the shared modules/solver/hint-ablation-generator.ts engine
 * instead of maintaining its own copy of the phase logic. modules/solver/hint-ablation-generator.test.ts
 * covers the engine itself in depth; this file only proves the CLI wrapper around it — arg
 * parsing, fixture read/write, report shape, --combined-only — still works end to end.
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import process from 'node:process';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { readLevelsWithHints } = await import('./level-data-io.mjs');

// scripts/hint-diversification.mjs resolves --levels-json as `path.join(ROOT, levelsJsonPath)`
// unconditionally (unlike hint-workbench.mjs, which checks path.isAbsolute first) — so the
// fixture must live under ROOT and be referenced by a ROOT-relative path. tmp/ is gitignored,
// so a fixture under ROOT/tmp never risks landing in git status.
//
// A trivial single-gate, portal-less corridor rather than the real level 1 (2 gates + a portal):
// every assertion below checks report SHAPE (field types, level number, errors === []) or is
// explicitly conditional on a hint actually being found, never a non-zero combo count for any
// specific phase — a portal-less level still runs (and reports, as a valid 0) every phase. Real
// level 1's gate x direction x portal-dest combo count used to dominate this file's wall time
// regardless of --attempt-budget-ms/--max-wall-ms (each combo pays a real, largely
// budget-insensitive minimum solve cost — see scripts/hint-workbench-node-test.mjs's identical
// fixture swap and docs/testing.md's "Timing instrumentation" for the same finding there).
function trivialFixtureLevel() {
    return {
        grid: { w: 5, h: 1 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 }, falseGoals: [],
        reqLen: 4, reqInt: 0, blocks: [], mustPass: [], mustCross: [], filters: [],
        flippingFilters: [], portals: [], geese: [], designerName: '', description: '', difficulty: null,
    };
}

async function writeFixtureLevel(fixtureDirAbs) {
    await mkdir(fixtureDirAbs, { recursive: true });
    const fixtureLevelsPathAbs = path.join(fixtureDirAbs, 'levels.json');
    await writeFile(fixtureLevelsPathAbs, `${JSON.stringify([trivialFixtureLevel()], null, 2)}\n`);
    return path.relative(ROOT, fixtureLevelsPathAbs);
}

async function runDiversification(args) {
    return execFile(process.execPath, ['--import', 'tsx', 'scripts/hint-diversification.mjs', ...args], {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
    });
}

async function main() {
    await mkdir(path.join(ROOT, 'tmp'), { recursive: true });
    const tempDir = await mkdtemp(path.join(ROOT, 'tmp', 'hint-diversification-test-'));
    try {
        const fixtureDir = path.join(tempDir, 'fixture');
        const fixtureLevelsPathRelative = await writeFixtureLevel(fixtureDir);
        const fixtureLevelsPathAbs = path.join(ROOT, fixtureLevelsPathRelative);
        const beforeHints = readLevelsWithHints(fixtureLevelsPathAbs)[0].hints.length;

        const outputPath = path.join(tempDir, 'report.json');
        const result = await runDiversification([
            `--levels-json=${fixtureLevelsPathRelative}`,
            '--levels=pos:1',
            '--attempt-budget-ms=300',
            '--baseline-budget-ms=500',
            '--max-wall-ms=5000',
            `--output=${outputPath}`,
        ]);
        assert.match(result.stdout, /Hint diversification sweep: 1 level\(s\)/);
        assert.match(result.stdout, /Results/);
        assert.match(result.stdout, /Updated/);

        const report = JSON.parse(await readFile(outputPath, 'utf8'));
        assert.equal(typeof report.commitSha, 'string');
        assert.equal(report.levels.length, 1);
        const levelReport = report.levels[0];
        assert.equal(levelReport.level, 1);
        assert.equal(levelReport.status, 'done');
        assert.ok(Array.isArray(levelReport.hintProvenance));
        assert.equal(levelReport.hintProvenance.length, levelReport.hintsAfter);
        // Every combo-count field the legacy report shape exposes is present and numeric.
        for (const field of ['combosTried', 'swapCombosTried', 'portalCombosTried', 'swapPortalCombosTried', 'combinedCombosTried', 'swapCombinedCombosTried']) {
            assert.equal(typeof levelReport[field], 'number', `${field} is a number`);
        }
        assert.deepEqual(levelReport.errors, []);

        // Novel hints (if any were found within budget) were actually appended to the fixture.
        const afterHints = readLevelsWithHints(fixtureLevelsPathAbs)[0].hints.length;
        assert.equal(afterHints, levelReport.hintsAfter);
        assert.ok(afterHints >= beforeHints);
        if (levelReport.novelFound > 0) assert.ok(afterHints > beforeHints, 'novel hints were persisted to the fixture');

        // --combined-only skips phases 0/A/B/D/C and relies on evidence already in the fixture's hints.
        const combinedOnlyOutput = path.join(tempDir, 'combined-only-report.json');
        const combinedOnlyResult = await runDiversification([
            `--levels-json=${fixtureLevelsPathRelative}`,
            '--levels=pos:1',
            '--combined-only',
            '--attempt-budget-ms=300',
            '--baseline-budget-ms=500',
            '--max-wall-ms=5000',
            `--output=${combinedOnlyOutput}`,
        ]);
        assert.match(combinedOnlyResult.stdout, /Hint diversification sweep: 1 level\(s\)/);
        const combinedOnlyReport = JSON.parse(await readFile(combinedOnlyOutput, 'utf8'));
        const combinedOnlyLevelReport = combinedOnlyReport.levels[0];
        assert.equal(combinedOnlyLevelReport.combosTried, 0, '--combined-only skips the forward gate-direction phase');
        assert.equal(combinedOnlyLevelReport.swapCombosTried, 0, '--combined-only skips the reverse phase');
        assert.equal(combinedOnlyLevelReport.portalCombosTried, 0, '--combined-only skips the forward portal-exit phase');
        assert.deepEqual(combinedOnlyLevelReport.errors, []);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
