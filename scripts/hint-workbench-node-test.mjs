#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { buildBundle } from './run-bundled.mjs';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NODE = process.execPath;
const WORKBENCH_BUNDLE = buildBundle('scripts/hint-workbench.mjs');
const { readLevelHints, readLevelsWithHints } = await import('./level-data-io.mjs');

function syntheticWorkbenchLevel({ id = 'P00001' } = {}) {
    return {
        ...(id ? { id } : {}),
        grid: { w: 5, h: 1 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 }, falseGoals: [],
        reqLen: 4, reqInt: 0, blocks: [], mustPass: [], mustCross: [], filters: [],
        flippingFilters: [], portals: [], geese: [], landmarks: [], hints: [],
        designerName: '', description: '', difficulty: null,
    };
}

async function writeFixtureLevel(fixtureDir) {
    const fixtureLevelsPath = path.join(fixtureDir, 'levels.json');
    await writeFile(fixtureLevelsPath, `${JSON.stringify([syntheticWorkbenchLevel()], null, 2)}\n`);
    return fixtureLevelsPath;
}

// A 1x5 corridor has exactly one possible gate-to-goal path — deterministic and cheap to
// re-derive on a second run, so it's a reliable fixture for proving a rediscovery of an
// already-saved hint gets its provenance merged in, rather than being silently dropped.
async function writeTrivialFixtureLevel(fixtureDir) {
    const level = {
        grid: { w: 5, h: 1 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 }, falseGoals: [],
        reqLen: 4, reqInt: 0, blocks: [], mustPass: [], mustCross: [], filters: [],
        flippingFilters: [], portals: [], geese: [], designerName: '', description: '', difficulty: null,
    };
    const fixtureLevelsPath = path.join(fixtureDir, 'levels.json');
    await writeFile(fixtureLevelsPath, `${JSON.stringify([level], null, 2)}\n`);
    return fixtureLevelsPath;
}

async function runWorkbench(args) {
    return execFile(NODE, [WORKBENCH_BUNDLE, ...args], {
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
            '--levels=pos:1',
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
        await expectWorkbenchFailure(['--directions=sideways'], /Unsupported --directions=sideways/);
        await expectWorkbenchFailure(['--combined=does-not-exist'], /Unsupported --combined=does-not-exist/);
        await expectWorkbenchFailure(['--combined=full'], /Unsupported --combined=full/);
        await expectWorkbenchFailure(['--write-levels'], /Refusing --write-levels without --yes=true/);
        await expectWorkbenchFailure([
            '--levels=pos:1',
            '--policy=save-all',
            '--write-patch=data/hints/workbench.patch.json',
        ], /Refusing to write report inside source-controlled artifact path data/);


        const levelSpecOutput = path.join(tempDir, 'level-spec-report.json');
        await runWorkbench([
            '--levels=pos:1,pos:2-3,pos:2',
            '--preset=enumerate-targeted',
            '--policy=audit-only',
            '--max-accepted=0',
            `--output=${levelSpecOutput}`,
        ]);
        const levelSpecReport = JSON.parse(await readFile(levelSpecOutput, 'utf8'));
        assert.deepEqual(levelSpecReport.levels.map(level => level.level), [1, 2, 3]);
        assert.ok(levelSpecReport.levels.every(level => level.runs.length === 0));

        const auditFixtureDir = path.join(tempDir, 'audit-fixture');
        await mkdir(auditFixtureDir, { recursive: true });
        const levelsPath = await writeFixtureLevel(auditFixtureDir);
        const before = await stat(levelsPath);
        const output = path.join(tempDir, 'compact-report.json');
        const audit = await runWorkbench([
            `--levels-json=${levelsPath}`,
            '--levels=pos:1',
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
        assert.equal(after.mtimeMs, before.mtimeMs, 'audit-only run must not modify its levels input');
        assert.equal(after.size, before.size, 'audit-only run must not resize its levels input');

        const report = JSON.parse(await readFile(output, 'utf8'));
        assert.equal(report.schemaVersion, 1);
        assert.equal(typeof report.provenance.sourceCommit, 'string');
        assert.ok(report.provenance.sourceCommit.length > 0, 'sourceCommit is non-empty (a real SHA or the "local" fallback)');
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
            '--levels=pos:1',
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
            '--levels=pos:1',
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

        // The four ablation-heavy calls below only assert on REPORT SHAPE (phasesRun order,
        // axisCoverage field presence/types, axisPlan echo) — never on any actual hint being
        // found or on a specific non-zero combo count (see the field-type-only loop below). None
        // of that depends on the target level's own geometry, only on running the phases at all.
        // Real level 1 (2 gates, a portal, 9x9 grid) makes each phase's gate x direction x
        // portal-dest combo count large enough that these four calls alone used to account for
        // ~90% of this file's wall time REGARDLESS of --attempt-budget-ms/--wall-ms (each combo's
        // solve pays a real, largely budget-insensitive minimum cost — see docs/testing.md's
        // "Timing instrumentation"). Pointing them at the same trivial single-gate, portal-less
        // corridor fixture already used below cuts combo count to nearly nothing while proving the
        // exact same plumbing (a portal-less level still runs — and records — portalCascade/
        // swapPortal/combined/swapCombined with zero combos, which is still a valid `number`).
        const ablationFixtureDir = path.join(tempDir, 'ablation-fixture');
        await mkdir(ablationFixtureDir, { recursive: true });
        const ablationFixtureLevelsPath = await writeTrivialFixtureLevel(ablationFixtureDir);

        // --directions=forward,reverse and --combined=evidence are real (Component 5): the
        // ablation-full step's phase toggles follow them instead of the earlier fail-fast stubs.
        const ablationFullOutput = path.join(tempDir, 'ablation-full-report.json');
        await runWorkbench([
            `--levels-json=${ablationFixtureLevelsPath}`,
            '--levels=pos:1',
            '--include=ablation-full',
            '--directions=forward,reverse',
            '--combined=evidence',
            '--policy=audit-only',
            '--audit-policy=save-all',
            // wall-ms bumped 3000 -> 9000 (2026-07-24): orchestration.ts's new admissible-order-
            // search last-resort tier adds its own additional per-solve budget fraction on top of
            // the existing repair/attraction-diversity extensions, and this script sets none of the
            // three budget-fraction overrides -- 7 phases each now individually costing up to
            // attempt-budget-ms more in the worst case could otherwise blow the old tighter ceiling
            // before every phase completes.
            '--wall-ms=9000',
            '--attempt-budget-ms=300',
            '--baseline-budget-ms=500',
            '--max-accepted=1',
            `--output=${ablationFullOutput}`,
        ]);
        const ablationFullReport = JSON.parse(await readFile(ablationFullOutput, 'utf8'));
        assert.equal(ablationFullReport.axisPlan.source, 'include');
        assert.deepEqual(ablationFullReport.axisPlan.steps, ['ablation-full']);
        assert.deepEqual(ablationFullReport.axisPlan.include, ['ablation-full']);
        assert.deepEqual(ablationFullReport.axisPlan.directions, ['forward', 'reverse']);
        assert.equal(ablationFullReport.axisPlan.combined, 'evidence');
        const ablationFullRun = ablationFullReport.levels[0].runs.find(run => run.step === 'ablation-full');
        assert.ok(ablationFullRun, 'ablation-full step ran');
        assert.deepEqual(ablationFullRun.meta.phasesRun, ['baseline', 'cascade', 'swap', 'portalCascade', 'swapPortal', 'combined', 'swapCombined']);

        // The 'ablation-full' step defaults to full coverage even with no explicit
        // --directions/--combined (its name promises full coverage; Component 2's invariant).
        const ablationFullDefaultOutput = path.join(tempDir, 'ablation-full-default-report.json');
        await runWorkbench([
            `--levels-json=${ablationFixtureLevelsPath}`,
            '--levels=pos:1',
            '--preset=ablation-full',
            '--policy=audit-only',
            '--audit-policy=save-all',
            '--wall-ms=9000', // see the identical bump's comment above
            '--attempt-budget-ms=300',
            '--baseline-budget-ms=500',
            `--output=${ablationFullDefaultOutput}`,
        ]);
        const ablationFullDefaultReport = JSON.parse(await readFile(ablationFullDefaultOutput, 'utf8'));
        assert.deepEqual(ablationFullDefaultReport.axisPlan.directions, ['forward', 'reverse']);
        assert.equal(ablationFullDefaultReport.axisPlan.combined, 'evidence');
        const ablationFullDefaultRun = ablationFullDefaultReport.levels[0].runs.find(run => run.step === 'ablation-full');
        assert.deepEqual(ablationFullDefaultRun.meta.phasesRun, ['baseline', 'cascade', 'swap', 'portalCascade', 'swapPortal', 'combined', 'swapCombined']);

        // Component 7: per-axis coverage counts (gates/directions/portal-dests/combined
        // triples tried) are aggregated into axisCoverage.ablation for ablation-full-family steps.
        const ablationCoverage = ablationFullDefaultReport.levels[0].axisCoverage.ablation;
        assert.ok(ablationCoverage, 'axisCoverage.ablation present when an ablation-full-family step ran');
        for (const field of ['baselineTried', 'gateDirectionsTried', 'swapGateDirectionsTried', 'portalDestDirectionsTried', 'swapPortalDestDirectionsTried', 'combinedTriplesTried', 'swapCombinedTriplesTried']) {
            assert.equal(typeof ablationCoverage[field], 'number', `${field} is a number`);
        }
        assert.deepEqual(ablationCoverage.phasesRun, ['baseline', 'cascade', 'swap', 'portalCascade', 'swapPortal', 'combined', 'swapCombined']);
        // Enumeration-only steps never touch the ablation generator, so the field is absent
        // (null) rather than a misleadingly-zeroed object.
        assert.equal(includeReport.levels[0].axisCoverage.ablation, null);

        // A step that does NOT touch ablation-full still gets the plain forward-only/combined-off
        // default (no accidental "full coverage" leakage to unrelated steps).
        assert.deepEqual(includeReport.axisPlan.directions, ['forward']);
        assert.equal(includeReport.axisPlan.combined, 'off');

        // The fixed-name convenience presets keep running their own documented phase subset
        // regardless of --directions/--combined (they are not tunable by those flags).
        const combinedOnlyOutput = path.join(tempDir, 'ablation-combined-only-report.json');
        await runWorkbench([
            `--levels-json=${ablationFixtureLevelsPath}`,
            '--levels=pos:1',
            '--preset=ablation-combined-only',
            '--policy=audit-only',
            '--audit-policy=save-all',
            '--wall-ms=4000', // see the ablation-full wall-ms bump comment above
            '--attempt-budget-ms=300',
            `--output=${combinedOnlyOutput}`,
        ]);
        const combinedOnlyReport = JSON.parse(await readFile(combinedOnlyOutput, 'utf8'));
        const combinedOnlyRun = combinedOnlyReport.levels[0].runs.find(run => run.step === 'ablation-combined-only');
        assert.deepEqual(combinedOnlyRun.meta.phasesRun, ['combined', 'swapCombined']);

        const reverseOnlyOutput = path.join(tempDir, 'ablation-reverse-only-report.json');
        await runWorkbench([
            `--levels-json=${ablationFixtureLevelsPath}`,
            '--levels=pos:1',
            '--preset=ablation-reverse-only',
            '--policy=audit-only',
            '--audit-policy=save-all',
            '--wall-ms=4000', // see the ablation-full wall-ms bump comment above
            '--attempt-budget-ms=300',
            `--output=${reverseOnlyOutput}`,
        ]);
        const reverseOnlyReport = JSON.parse(await readFile(reverseOnlyOutput, 'utf8'));
        const reverseOnlyRun = reverseOnlyReport.levels[0].runs.find(run => run.step === 'ablation-reverse-only');
        assert.deepEqual(reverseOnlyRun.meta.phasesRun, ['swap', 'swapPortal', 'swapCombined']);

        const fixtureDir = path.join(tempDir, 'fixture-write');
        await mkdir(fixtureDir, { recursive: true });
        const sourceHintCount = 0;
        const fixtureLevelsPath = await writeFixtureLevel(fixtureDir);
        const writeOutput = path.join(tempDir, 'write-report.json');
        await runWorkbench([
            `--levels-json=${fixtureLevelsPath}`,
            '--levels=pos:1',
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
        // The synthetic fixture deliberately carries a persistent id, so this exercises the
        // id-keyed hint artifact path without coupling CLI correctness to any published level.
        assert.ok(writeReport.writes.changedFiles.some(filePath => filePath.endsWith('hints/P00001.json')));
        assert.ok(writeReport.writes.postWriteReminders.includes('npm run check:hint-validity'));
        const fixtureHints = JSON.parse(await readFile(path.join(fixtureDir, 'hints/P00001.json'), 'utf8'));
        assert.equal(fixtureHints.schemaVersion, 3);
        assert.ok(fixtureHints.hints.length > sourceHintCount);
        assert.ok(fixtureHints.hints.every(hint => Array.isArray(hint.path) && Array.isArray(hint.provenance)));
        const newlyAcceptedHint = fixtureHints.hints[fixtureHints.hints.length - 1];
        assert.ok(newlyAcceptedHint.provenance.length > 0, 'newly accepted hint should carry provenance');
        assert.equal(typeof newlyAcceptedHint.provenance[0].solver.technique, 'string');

        // This sub-test exercises the position-keyed fallback using the same synthetic level
        // shape but no persistent id, so readLevelsWithHints must use hints/00001.json.
        const wrappedHintsDir = path.join(tempDir, 'wrapped-hints');
        const wrappedSourceLevel = syntheticWorkbenchLevel({ id: '' });
        await mkdir(path.join(wrappedHintsDir, 'hints'), { recursive: true });
        await writeFile(path.join(wrappedHintsDir, 'levels.json'), `${JSON.stringify([{ ...wrappedSourceLevel, hints: [[1, 2, 3]] }])}\n`);
        await writeFile(path.join(wrappedHintsDir, 'hints/00001.json'), `${JSON.stringify({
            schemaVersion: 1,
            hints: [[4, 5, 6]],
            hintMetadata: [{ solverTechnique: 'enumerate-targeted', nodesExpanded: 42, solveTimeMs: 7 }],
        })}\n`);
        const upgradedHints = readLevelHints(path.join(wrappedHintsDir, 'levels.json'), 1);
        assert.equal(upgradedHints.length, 1);
        assert.deepEqual(upgradedHints[0].path, [4, 5, 6]);
        assert.equal(upgradedHints[0].provenance.length, 1);
        assert.equal(upgradedHints[0].provenance[0].solver.technique, 'enumerate-targeted');
        assert.equal(upgradedHints[0].provenance[0].search.nodesExpanded, 42);
        assert.equal(upgradedHints[0].provenance[0].search.elapsedMs, 7);
        assert.equal(typeof upgradedHints[0].provenance[0].foundAt, 'string');
        assert.deepEqual(readLevelsWithHints(path.join(wrappedHintsDir, 'levels.json'))[0].hints, [[4, 5, 6]]);

        const patchDir = path.join(tempDir, 'fixture-patch');
        await mkdir(patchDir, { recursive: true });
        const patchLevelsPath = await writeFixtureLevel(patchDir);
        const patchOutput = path.join(tempDir, 'accepted-hints.patch.json');
        const patchReportOutput = path.join(tempDir, 'patch-report.json');
        await runWorkbench([
            `--levels-json=${patchLevelsPath}`,
            '--levels=pos:1',
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

        // A path the search independently rediscovers (already saved from a prior run) must have
        // its fresh provenance merged onto the existing hint, not be silently dropped as a
        // duplicate — see hint-acceptance-pipeline.ts's exact/canonical-duplicate stages and
        // processLevel's duplicateProvenance handling in hint-workbench.mjs.
        const rediscoveryDir = path.join(tempDir, 'rediscovery');
        await mkdir(rediscoveryDir, { recursive: true });
        const rediscoveryLevelsPath = await writeTrivialFixtureLevel(rediscoveryDir);
        const runArgs = [
            `--levels-json=${rediscoveryLevelsPath}`,
            '--levels=pos:1',
            '--include=enumeration',
            '--policy=save-all',
            '--restarts=1',
            '--node-budget=100',
            '--wall-ms=1000',
            '--max-accepted=1',
            '--write-levels',
            '--yes=true',
        ];
        await runWorkbench([...runArgs, `--output=${path.join(tempDir, 'rediscovery-report1.json')}`]);
        const afterFirstRun = readLevelHints(rediscoveryLevelsPath, 1);
        assert.equal(afterFirstRun.length, 1, 'first run saves the corridor\'s one solution');
        assert.equal(afterFirstRun[0].provenance.length, 1);

        const secondReportPath = path.join(tempDir, 'rediscovery-report2.json');
        await runWorkbench([...runArgs, `--output=${secondReportPath}`]);
        const afterSecondRun = readLevelHints(rediscoveryLevelsPath, 1);
        assert.equal(afterSecondRun.length, 1, 'the second run must NOT add a second, duplicate hint for the same path');
        assert.deepEqual(afterSecondRun[0].path, afterFirstRun[0].path);
        assert.ok(afterSecondRun[0].provenance.length > afterFirstRun[0].provenance.length,
            'the second run\'s rediscovery of the same path must append fresh provenance rather than being dropped');
        const secondReport = JSON.parse(await readFile(secondReportPath, 'utf8'));
        assert.equal(secondReport.totalAccepted, 0, 'no NEW path was accepted the second time');
        assert.ok(secondReport.totalDuplicateProvenance > 0, 'the rediscovery must be counted separately from acceptance');

    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
