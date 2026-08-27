#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/hint-complete-enumeration-sharded.mjs (Component 8 of the
 * hint-workbench plan): sharded, worker_threads-parallel, checkpoint-resumable complete
 * enumeration. modules/solver/hint-enumeration.test.ts covers the pure sharding-plan primitives
 * (rootChildrenForGate/planGateShards) and their soundness against completeFromState in depth;
 * this file proves the CLI orchestrator — job dispatch, parallel determinism, checkpoint/resume,
 * --write-levels — works end to end.
 */
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import process from 'node:process';
import { buildBundle } from './run-bundled.mjs';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPLETE_SHARDED_BUNDLE = buildBundle('scripts/hint-complete-enumeration-sharded.mjs');
const { readLevelsWithHints } = await import('./level-data-io.mjs');

// A 3x3 grid, gate (1,1) -> goal (3,3), reqLen 4, reqInt 0: Manhattan distance 4, so every
// solution is a monotone lattice path (2 rights + 2 ups) — exactly C(4,2) = 6 solutions, none
// revisiting a cell. The same hand-countable oracle modules/solver/hint-enumeration.test.ts uses.
function tinyLevelFixture() {
    return [{
        grid: { w: 3, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 3, y: 3 },
        reqLen: 4, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], landmarks: [], portals: [],
        hints: [],
    }];
}

// scripts/hint-complete-enumeration-sharded.mjs resolves --levels-json/--output/--checkpoint via
// resolveFromRoot (path.isAbsolute-aware), so absolute paths under a gitignored ROOT/tmp work fine.
async function writeFixture(dirAbs, levels) {
    await mkdir(dirAbs, { recursive: true });
    const fixturePath = path.join(dirAbs, 'levels.json');
    await writeFile(fixturePath, `${JSON.stringify(levels, null, 2)}\n`);
    return fixturePath;
}

async function runSharded(args) {
    return execFile(process.execPath, [COMPLETE_SHARDED_BUNDLE, ...args], {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
    });
}

async function main() {
    await mkdir(path.join(ROOT, 'tmp'), { recursive: true });
    const tempDir = await mkdtemp(path.join(ROOT, 'tmp', 'complete-sharded-test-'));
    try {
        const fixturePath = await writeFixture(path.join(tempDir, 'fixture'), tinyLevelFixture());

        // Sequential (--parallel=1, the default): full exhaustion, exactly the 6-solution oracle.
        const seqOutput = path.join(tempDir, 'seq-report.json');
        const seqResult = await runSharded([
            `--levels-json=${fixturePath}`, '--levels=pos:1', '--shards-per-gate=3', `--output=${seqOutput}`,
        ]);
        assert.match(seqResult.stdout, /EXHAUSTIVE/);
        const seqReport = JSON.parse(await readFile(seqOutput, 'utf8'));
        assert.equal(seqReport.schemaVersion, 1);
        assert.equal(typeof seqReport.provenance.sourceCommit, 'string');
        assert.equal(seqReport.levels.length, 1);
        assert.equal(seqReport.levels[0].totalSolutionsFound, 6);
        assert.equal(seqReport.levels[0].novelFound, 6);
        assert.equal(seqReport.levels[0].exhausted, true);
        assert.equal(seqReport.levels[0].jobs, 2, 'the gate has exactly 2 real root children (right, up), so planGateShards caps at 2 shards even though 3 were requested');

        // Parallel (--parallel=3): same level, same shard count -> byte-identical `levels` report
        // (aside from timing), proving determinism is independent of completion order.
        const parOutput = path.join(tempDir, 'par-report.json');
        await runSharded([
            `--levels-json=${fixturePath}`, '--levels=pos:1', '--shards-per-gate=3', '--parallel=3', `--output=${parOutput}`,
        ]);
        const parReport = JSON.parse(await readFile(parOutput, 'utf8'));
        assert.deepEqual(parReport.levels, seqReport.levels, 'parallel and sequential runs produce identical merged results');

        // Checkpoint/resume: an artificially tiny --max-wall-ms halts after the first job; a
        // second invocation with the same --checkpoint picks up the rest without duplicating.
        // "After the FIRST job" (not zero) is the CLI's forward-progress guarantee — the deadline
        // is only honored once a job has run — so this holds even when startup jitter alone
        // exceeds the 1ms cap (pre-guarantee, that case halted with no checkpoint written at all,
        // which is exactly the ENOENT flake this test used to have under CPU contention).
        const checkpointPath = path.join(tempDir, 'checkpoint.json');
        const haltOutput = path.join(tempDir, 'halt-report.json');
        const haltResult = await runSharded([
            `--levels-json=${fixturePath}`, '--levels=pos:1', '--shards-per-gate=3',
            `--checkpoint=${checkpointPath}`, '--max-wall-ms=1', `--output=${haltOutput}`,
        ]);
        assert.match(haltResult.stdout, /Halted early/);
        const haltReport = JSON.parse(await readFile(haltOutput, 'utf8'));
        assert.equal(haltReport.haltedByWallClock, true);
        assert.ok(haltReport.levels[0].totalSolutionsFound < 6, 'halted before finding every solution');
        assert.equal(haltReport.levels[0].exhausted, false);

        const checkpointBefore = JSON.parse(await readFile(checkpointPath, 'utf8'));
        const completedJobsBefore = Object.keys(checkpointBefore.jobs).length;
        assert.equal(completedJobsBefore, 1, 'this gate has 2 total jobs; a 1ms wall-clock cap halts after exactly the first');

        await assert.rejects(
            runSharded([
                `--levels-json=${fixturePath}`, '--levels=pos:1', '--shards-per-gate=1',
                `--checkpoint=${checkpointPath}`, `--output=${path.join(tempDir, 'incompatible-report.json')}`,
            ]),
            /different commit or enumeration configuration/,
            'a checkpoint from a different shard plan must not be mixed into this enumeration',
        );

        const changedFixture = tinyLevelFixture();
        changedFixture[0].description = 'same path, changed level input';
        await writeFile(fixturePath, `${JSON.stringify(changedFixture, null, 2)}\n`);
        await assert.rejects(
            runSharded([
                `--levels-json=${fixturePath}`, '--levels=pos:1', '--shards-per-gate=3',
                `--checkpoint=${checkpointPath}`, `--output=${path.join(tempDir, 'changed-input-report.json')}`,
            ]),
            /different commit or enumeration configuration/,
            'a checkpoint must not survive changes to a custom levels file at the same path',
        );
        await writeFile(fixturePath, `${JSON.stringify(tinyLevelFixture(), null, 2)}\n`);

        const resumeOutput = path.join(tempDir, 'resume-report.json');
        const resumeResult = await runSharded([
            `--levels-json=${fixturePath}`, '--levels=pos:1', '--shards-per-gate=3',
            `--checkpoint=${checkpointPath}`, `--output=${resumeOutput}`,
        ]);
        assert.match(resumeResult.stdout, new RegExp(`${completedJobsBefore} already done from checkpoint`));
        const resumeReport = JSON.parse(await readFile(resumeOutput, 'utf8'));
        assert.equal(resumeReport.jobsSkippedFromCheckpoint, completedJobsBefore);
        assert.equal(resumeReport.levels[0].totalSolutionsFound, 6, 'resuming completes the exhaustive search without duplication');
        assert.equal(resumeReport.levels[0].exhausted, true);

        // --write-levels persists the novel paths.
        const writeFixturePath = await writeFixture(path.join(tempDir, 'write-fixture'), tinyLevelFixture());
        const writeOutput = path.join(tempDir, 'write-report.json');
        await runSharded([
            `--levels-json=${writeFixturePath}`, '--levels=pos:1', '--shards-per-gate=2', '--write-levels', `--output=${writeOutput}`,
        ]);
        const writtenLevels = readLevelsWithHints(writeFixturePath);
        assert.equal(writtenLevels[0].hints.length, 6);
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
