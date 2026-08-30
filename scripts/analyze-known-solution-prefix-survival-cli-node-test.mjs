#!/usr/bin/env node
/**
 * Regression coverage for analyze-known-solution-prefix-survival.mjs's feature projection: it
 * correctly dual-reads level.stressMeta.requiredPathCoverageRatio/.navDensity, but wrote the result
 * under the legacy `navDensity` key in its freshly-generated `features` output -- an actively-run
 * analysis tool, not a frozen artifact, so this manufactured new evidence under a retired schema
 * field name.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'analyze-known-solution-prefix-survival-cli-'));
const survivalPath = path.join(dir, 'known-solution-prefix-survival.json');
const levelsPath = path.join(dir, 'levels.json');
const outPath = path.join(dir, 'out.json');

await writeFile(survivalPath, JSON.stringify({
    scoreWidthForensics: [{
        levelId: 'R00001', classification: 'A-1', solved: true,
        scoreMarginToCutoff: 1, candidatePoolSize: 2, normalizedDepth: 0.5,
    }],
}));
await writeFile(levelsPath, JSON.stringify([{
    id: 'R00001', reqLen: 8, reqInt: 0,
    stressMeta: { requiredPathCoverageRatio: 0.4 },
}]));

await execFile(process.execPath, [
    'scripts/analyze-known-solution-prefix-survival.mjs',
    `--survival=${survivalPath}`, `--levels=${levelsPath}`, `--out=${outPath}`,
], { cwd: ROOT });

const result = JSON.parse(await readFile(outPath, 'utf8'));
const features = result.rows[0].features;
assert.equal(features.requiredPathCoverageRatio, 0.4,
    'features must be written under the canonical requiredPathCoverageRatio key, not the legacy navDensity key');
assert.equal('navDensity' in features, false, 'the legacy navDensity key must not appear in fresh output');
assert.ok('requiredPathCoverageRatio' in result.groups['clearly-mis-ranked'].featureMedians,
    'group feature medians must be keyed by the canonical field name');

console.log('analyze-known-solution-prefix-survival CLI: all tests passed');
