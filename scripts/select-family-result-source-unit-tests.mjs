import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = await mkdtemp(path.join(os.tmpdir(), 'family-source-selection-'));
const sourceA = 'reports/families/source-a.json';
const sourceB = 'reports/families/source-b.json';
const row = (variantId, sourceFile, ok) => ({
    parentCorpus:'corpus.json', parentId:'P1', variantId, sourceFile, sourceCommit:'abc',
    sourceGeneratedAt:null, sourceBudgetMs:20_000, ok, status:ok ? 'success' : 'timeout',
    nodes:1, work:2, elapsedMs:3, winningConfig:ok ? 'dfs:x' : null,
});

try {
    const migration = path.join(dir, 'migration.json');
    const policy = path.join(dir, 'policy.json');
    const output = path.join(dir, 'output.json');
    await writeFile(migration, JSON.stringify({ rows:[
        row('F1', sourceA, true), row('F1', sourceB, false), row('F2', sourceA, true),
    ] }));

    // Regression: source artifact paths end in .json too; they must not be parsed as policy files.
    await execFile('node', ['scripts/select-family-result-source.mjs', migration, sourceA, output], { cwd:ROOT });
    let selected = JSON.parse(await readFile(output, 'utf8'));
    assert.equal(selected.sourceFile, sourceA);
    assert.deepEqual(selected.levels.map(value => value.variantId), ['F1', 'F2']);

    await writeFile(policy, JSON.stringify({ viewId:'test', overrides:[{
        parentId:'P1', preferredSource:sourceB, reason:'declared test source',
    }] }));
    await execFile('node', ['scripts/select-family-result-source.mjs', migration, policy, output], { cwd:ROOT });
    selected = JSON.parse(await readFile(output, 'utf8'));
    assert.deepEqual(selected.summary, {
        inputObservations:3, selectedEdges:2, excludedObservations:1, parentFamilies:1,
    });
    assert.equal(selected.levels.find(value => value.variantId === 'F1').sourceFile, sourceB);
    assert.equal(selected.excluded[0].sourceFile, sourceA);
    assert.equal(selected.excluded[0].reason, 'declared test source');

    const incompletePolicy = path.join(dir, 'incomplete-policy.json');
    await writeFile(incompletePolicy, JSON.stringify({ overrides:[] }));
    await assert.rejects(
        execFile('node', ['scripts/select-family-result-source.mjs', migration, incompletePolicy, output], { cwd:ROOT }),
        /expected one selection override, found 0/,
    );
} finally {
    await rm(dir, { recursive:true, force:true });
}
console.log('family result source selection: all tests passed');
