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
    assert.equal(report.metadata.inputs.canonical[0].commit, 'abc');
    assert.match(await readFile(markdown, 'utf8'), /Status:.*diagnostic artifact/);

    await execFile('node', [...baseArgs, '--mechanic=mustCross:2', '--req-int-min=3', '--nav-density-max=.8'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 1, 'matching structural filters retain the family');
    await execFile('node', [...baseArgs, '--req-int-min=4'], { cwd: ROOT });
    assert.equal(JSON.parse(await readFile(out, 'utf8')).families.length, 0, 'non-matching structural filters exclude the family');
} finally {
    await rm(dir, { recursive: true, force: true });
}
console.log('family-boundary CLI: all tests passed');
