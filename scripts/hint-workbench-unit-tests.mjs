#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;
const { readLevelsWithHints } = await import('./level-data-io.mjs');

async function writeFixtureLevel(fixtureDir) {
    const sourceLevels = readLevelsWithHints(path.join(ROOT, 'data/levels.json'));
    const fixtureLevelsPath = path.join(fixtureDir, 'levels.json');
    await writeFile(fixtureLevelsPath, `${JSON.stringify([sourceLevels[0]], null, 2)}\n`);
    return fixtureLevelsPath;
}

async function runWorkbench(args) {
    return execFile(NODE, ['scripts/run-bundled.mjs', 'scripts/hint-workbench.mjs', ...args], {
        cwd: ROOT,
        maxBuffer: 10 * 1024 * 1024,
    });
}

async function expectWorkbenchFailure(args, pattern) {
    try {
        await runWorkbench(args);
        assert.fail('Expected workbench command to fail');
    } catch (error) {
        assert.match(`${error.stdout || ''}${error.stderr || ''}`, pattern);
    }
}

async function main() {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'hint-workbench-test-'));
    try {
        const help = await runWorkbench(['--help']);
        assert.match(help.stdout, /ui-plus: Targeted enumeration/);
        assert.match(help.stdout, /all-practical: Deprecated alias/);
        assert.match(help.stdout, /--audit-policy=save-all\|novelty-gated/);

        await expectWorkbenchFailure([
            '--levels=1',
            '--preset=enumerate-targeted',
            '--policy=audit-only',
            '--output=data/hints/workbench-report.json',
        ], /Refusing to write report inside source-controlled artifact path data/);


        await expectWorkbenchFailure(['--preset=does-not-exist'], /Unknown --preset=does-not-exist/);
        await expectWorkbenchFailure(['--policy=does-not-exist'], /Unknown --policy=does-not-exist/);
        await expectWorkbenchFailure([
            '--policy=audit-only',
            '--audit-policy=does-not-exist',
        ], /Unknown --audit-policy=does-not-exist/);
        await expectWorkbenchFailure(['--policy-report=verbose'], /Unknown --policy-report=verbose/);
        await expectWorkbenchFailure(['--include=portal'], /Unsupported --include=portal/);
        await expectWorkbenchFailure(['--directions=forward,reverse'], /Unsupported --directions=forward,reverse/);
        await expectWorkbenchFailure(['--combined=full'], /Unsupported --combined=full/);
        await expectWorkbenchFailure(['--write-levels'], /Refusing --write-levels without --yes=true/);
        await expectWorkbenchFailure([
            '--levels=1',
            '--policy=save-all',
            '--write-patch=data/hints/workbench.patch.json',
        ], /Refusing to write report inside source-controlled artifact path data/);


        const levelSpecOutput = path.join(tempDir, 'level-spec-report.json');
        await runWorkbench([
            '--levels=1,2-3,2',
            '--preset=enumerate-targeted',
            '--policy=audit-only',
            '--max-accepted=0',
            `--output=${levelSpecOutput}`,
        ]);
        const levelSpecReport = JSON.parse(await readFile(levelSpecOutput, 'utf8'));
        assert.deepEqual(levelSpecReport.levels.map(level => level.level), [1, 2, 3]);
        assert.ok(levelSpecReport.levels.every(level => level.runs.length === 0));

        const levelsPath = path.join(ROOT, 'data/levels.json');
        const before = await stat(levelsPath);
        const output = path.join(tempDir, 'compact-report.json');
        const audit = await runWorkbench([
            '--levels=1',
            '--preset=all-practical',
            '--policy=audit-only',
            '--audit-policy=save-all',
            '--restarts=1',
            '--node-budget=100',
            '--wall-ms=1000',
            '--max-accepted=1',
            '--include-paths=false',
            '--policy-report=full',
            `--output=${output}`,
        ]);
        assert.match(audit.stderr, /--preset=all-practical is deprecated/);
        assert.match(audit.stdout, /would-accept/);

        const after = await stat(levelsPath);
        assert.equal(after.mtimeMs, before.mtimeMs, 'audit-only run must not modify data/levels.json');
        assert.equal(after.size, before.size, 'audit-only run must not resize data/levels.json');

        const report = JSON.parse(await readFile(output, 'utf8'));
        assert.equal(report.schemaVersion, 1);
        assert.equal(report.preset.requested, 'all-practical');
        assert.equal(report.preset.resolved, 'ui-plus');
        assert.equal(report.options.auditMode, true);
        assert.equal(report.options.evaluationPolicy, 'save-all');
        assert.equal(report.axisPlan.source, 'preset');
        assert.deepEqual(report.axisPlan.steps, ['enumerate-targeted', 'ablation-ui', 'enumerate-targeted']);
        assert.equal(report.writes.requested, false);
        assert.deepEqual(report.writes.changedFiles, []);
        assert.equal(Object.hasOwn(report.levels[0], 'wouldAcceptPaths'), false);
        assert.ok(report.levels[0].policyReports.some(entry => entry.wouldAccept));
        assert.ok(report.levels[0].policyReports.every(entry => Object.hasOwn(entry, 'pathSignature')));
        assert.ok(Array.isArray(report.levels[0].wouldAcceptPathSignatures));
        assert.ok(report.levels[0].runs.every(run => typeof run.status === 'string'));
        assert.ok(report.levels[0].runs.every(run => run.exhaustion && typeof run.exhaustion.status === 'string'));
        assert.deepEqual(report.levels[0].axisCoverage.include, ['enumeration', 'ablation']);
        assert.ok(Object.hasOwn(report.levels[0].axisCoverage.producedByStep, 'enumerate-targeted'));

        const rejectionOutput = path.join(tempDir, 'rejections-report.json');
        await runWorkbench([
            '--levels=1',
            '--include=enumeration',
            '--policy=audit-only',
            '--audit-policy=save-all',
            '--policy-report=rejections-only',
            '--restarts=1',
            '--node-budget=100',
            '--wall-ms=1000',
            '--max-accepted=1',
            `--output=${rejectionOutput}`,
        ]);
        const rejectionReport = JSON.parse(await readFile(rejectionOutput, 'utf8'));
        assert.ok(rejectionReport.levels[0].policyReports.every(entry => !entry.wouldAccept));

        const includeOutput = path.join(tempDir, 'include-report.json');
        await runWorkbench([
            '--levels=1',
            '--include=enumeration',
            '--policy=audit-only',
            '--audit-policy=save-all',
            '--restarts=1',
            '--node-budget=100',
            '--wall-ms=1000',
            '--max-accepted=1',
            `--output=${includeOutput}`,
        ]);
        const includeReport = JSON.parse(await readFile(includeOutput, 'utf8'));
        assert.equal(includeReport.axisPlan.source, 'include');
        assert.deepEqual(includeReport.axisPlan.steps, ['enumerate-targeted']);

        const fixtureDir = path.join(tempDir, 'fixture-write');
        await mkdir(fixtureDir, { recursive: true });
        const sourceHintCount = readLevelsWithHints(path.join(ROOT, 'data/levels.json'))[0].hints.length;
        const fixtureLevelsPath = await writeFixtureLevel(fixtureDir);
        const writeOutput = path.join(tempDir, 'write-report.json');
        await runWorkbench([
            `--levels-json=${fixtureLevelsPath}`,
            '--levels=1',
            '--include=enumeration',
            '--policy=save-all',
            '--restarts=1',
            '--node-budget=100',
            '--wall-ms=1000',
            '--max-accepted=1',
            '--write-levels',
            '--yes=true',
            `--output=${writeOutput}`,
        ]);
        const writeReport = JSON.parse(await readFile(writeOutput, 'utf8'));
        assert.equal(writeReport.writes.requested, true);
        assert.equal(writeReport.writes.skippedForAudit, false);
        assert.ok(writeReport.writes.changedFiles.some(filePath => filePath.endsWith('hints/001.json')));
        assert.ok(writeReport.writes.postWriteReminders.includes('npm run check:hint-validity'));
        const fixtureHints = JSON.parse(await readFile(path.join(fixtureDir, 'hints/001.json'), 'utf8'));
        assert.ok(fixtureHints.length > sourceHintCount);

        const patchDir = path.join(tempDir, 'fixture-patch');
        await mkdir(patchDir, { recursive: true });
        const patchLevelsPath = await writeFixtureLevel(patchDir);
        const patchOutput = path.join(tempDir, 'accepted-hints.patch.json');
        const patchReportOutput = path.join(tempDir, 'patch-report.json');
        await runWorkbench([
            `--levels-json=${patchLevelsPath}`,
            '--levels=1',
            '--include=enumeration',
            '--policy=save-all',
            '--restarts=1',
            '--node-budget=100',
            '--wall-ms=1000',
            '--max-accepted=1',
            `--write-patch=${patchOutput}`,
            `--output=${patchReportOutput}`,
        ]);
        const patchReport = JSON.parse(await readFile(patchReportOutput, 'utf8'));
        assert.equal(patchReport.writes.mode, 'patch');
        assert.deepEqual(patchReport.writes.changedFiles, [path.relative(ROOT, patchOutput)]);
        const patch = JSON.parse(await readFile(patchOutput, 'utf8'));
        assert.equal(patch.schemaVersion, 1);
        assert.equal(patch.totalAccepted, 1);
        assert.equal(patch.levels[0].level, 1);
        assert.equal(await stat(path.join(patchDir, 'hints')).then(() => true, () => false), false);


    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
