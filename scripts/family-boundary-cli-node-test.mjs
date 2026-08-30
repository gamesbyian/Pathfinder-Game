import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'boundary-cli-'));

try {
    const manifest = path.join(dir, 'manifest.json');
    const canonical = path.join(dir, 'canonical.json');
    const variants = path.join(dir, 'variants.json');
    const levels = path.join(dir, 'levels.json');
    const out = path.join(dir, 'out.json');
    const markdown = path.join(dir, 'out.md');
    await writeFile(manifest, JSON.stringify({
        familyId: 'F', parentLevelId: 'P', parentCorpus: 'tiny', familyMode: 'symmetry',
        variants: [{ variantId: 'V', relation: 'symmetry', mutationManifest: { operation: 'transform', variant: 1 } }],
    }));
    await writeFile(canonical, JSON.stringify({ commitSha: 'abc', workBudget: 99, levels: [{ id: 'P', ok: false }] }));
    await writeFile(variants, JSON.stringify({ levels: [
        { id: 'V', ok: true, workSpent: 7, winningConfig: 'dfs:x' },
        { id: 'V', ok: true, workSpent: 5, winningConfig: 'dfs:x' },
    ] }));
    await writeFile(levels, JSON.stringify([{
        id: 'P', reqInt: 3, portals: [{}],
        stressMeta: { navDensity: .8, archetype: 'turns', mechanicCounts: { mustCross: 2 } },
    }]));

    const baseArgs = [
        'scripts/family-boundary-report.mjs', `--manifests=${manifest}`, `--canonical=${canonical}`,
        `--variants=${variants}`, `--parent-levels=${levels}`, `--out=${out}`, `--markdown=${markdown}`,
    ];
    await execFile('node', baseArgs, { cwd: ROOT });
    const report = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(report.families.length, 1, 'standalone manifest is accepted');
    assert.equal(report.families[0].canonicalFailureSymmetrySuccess, true);
    assert.equal(report.families[0].minSolvedOrientationWork, 5, 'last redispatch wins');
    assert.equal(report.families[0].features.reqInt, 3);
    assert.equal(report.families[0].features.routingRegime, 'turns',
        'parentFeatures must be written under the canonical routingRegime key, not the legacy archetype key');
    assert.equal('archetype' in report.families[0].features, false, 'the legacy archetype key must not appear in fresh output');
    assert.equal(report.families[0].features.requiredPathCoverageRatio, 0.8,
        'parentFeatures must be written under the canonical requiredPathCoverageRatio key, not the legacy navDensity key');
    assert.equal('navDensity' in report.families[0].features, false, 'the legacy navDensity key must not appear in fresh output');
    assert.equal(report.metadata.inputs.canonical[0].commit, 'abc');
    assert.match(await readFile(markdown, 'utf8'), /Status:.*diagnostic artifact/);

    await execFile('node', [...baseArgs, '--mechanic=mustCross:2', '--req-int-min=3', '--nav-density-max=.8'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 1, '--nav-density-max remains accepted as a legacy alias filtering the canonical requiredPathCoverageRatio field');
    await execFile('node', [...baseArgs, '--req-int-min=4'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 0, 'non-matching structural filters exclude the family');

    await execFile('node', [...baseArgs, '--required-path-coverage-ratio-max=.8'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 1, '--required-path-coverage-ratio-max filters on the canonical field');
    await execFile('node', [...baseArgs, '--required-path-coverage-ratio-max=.5'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 0, '--required-path-coverage-ratio-max excludes a non-matching family');

    await execFile('node', [...baseArgs, '--routing-regime=turns'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 1, '--routing-regime filters on the canonical parentFeatures.routingRegime field');
    await execFile('node', [...baseArgs, '--archetype=turns'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 1, '--archetype remains accepted as a legacy input alias for --routing-regime');
    await execFile('node', [...baseArgs, '--routing-regime=general'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 0, '--routing-regime excludes a non-matching family');
    await assert.rejects(execFile('node', [...baseArgs, '--routing-regime=general', '--archetype=turns'], { cwd: ROOT }),
        /--routing-regime and --archetype disagree/, 'conflicting --routing-regime/--archetype values must fail loudly, not silently pick one');

    // The core regression: an equivalent canonical/legacy pair with genuinely different raw
    // spellings must NOT be rejected as conflicting (must-not-throw is the assertion here).
    await execFile('node', [...baseArgs, '--routing-regime=intersection-heavy', '--archetype=high-intersection-burden'], { cwd: ROOT });

    // Producer/consumer coverage contract: a manifest carrying the canonical
    // parentRequiredPathCoverageRatio (as family-generate.mjs's schemaVersion-2 manifests do) must
    // survive into parentFeatures.requiredPathCoverageRatio even when the matched parent level's
    // own stressMeta has neither the canonical nor legacy coverage field.
    const covManifest = path.join(dir, 'cov-manifest.json');
    const covLevels = path.join(dir, 'cov-levels.json');
    const covOut = path.join(dir, 'cov-out.json');
    await writeFile(covManifest, JSON.stringify({
        familyId: 'FCOV', parentLevelId: 'PCOV', parentCorpus: 'tiny', familyMode: 'symmetry',
        parentRequiredPathCoverageRatio: 0.55,
        variants: [{ variantId: 'VCOV', relation: 'symmetry', mutationManifest: { operation: 'transform', variant: 1 } }],
    }));
    await writeFile(covLevels, JSON.stringify([{ id: 'PCOV', reqInt: 1, portals: [] }]));
    await execFile('node', [
        'scripts/family-boundary-report.mjs', `--manifests=${covManifest}`, `--canonical=${canonical}`,
        `--variants=${variants}`, `--parent-levels=${covLevels}`, `--out=${covOut}`,
    ], { cwd: ROOT });
    const covReport = JSON.parse(await readFile(covOut, 'utf8'));
    assert.equal(covReport.families[0].features.requiredPathCoverageRatio, 0.55,
        'manifest.parentRequiredPathCoverageRatio must be read before falling back to the legacy parentNavDensity when the parent level itself has no coverage field');
} finally {
    await rm(dir, { recursive: true, force: true });
}
console.log('family-boundary CLI: all tests passed');
