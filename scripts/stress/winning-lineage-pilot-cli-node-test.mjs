#!/usr/bin/env node
/**
 * Regression coverage for winning-lineage-pilot.mjs's fresh-output field naming: it wrote the
 * scoring-profile dimension under the legacy `profile` key (both per-row and document-level) even
 * though Phase 5's field migration renamed this solver dimension to `scoringProfileId` everywhere
 * else. Runs the real tool against one small real hint-bearing Corpus-1 level (S00133, reqLen=10,
 * a single stored hint) so this exercises the actual solve/observer path, not an empty-corpus
 * smoke pass.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'winning-lineage-pilot-cli-'));
const outFile = path.join(dir, 'lineage-pilot.json');

await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/stress/winning-lineage-pilot.mjs',
    '--levels=data/stress/stress-levels.json', '--level-ids=S00133',
    '--beam-width=50', '--node-budget=50000', `--out=${outFile}`,
], { cwd: ROOT, timeout: 60000 });

const result = JSON.parse(await readFile(outFile, 'utf8'));
assert.equal(result.levels.length, 1);
assert.equal(result.scoringProfileId, 'default',
    'document-level scoring-profile field must be scoringProfileId, not the legacy profile key');
assert.equal('profile' in result, false, 'the legacy profile key must not appear in fresh document-level output');
assert.equal(result.levels[0].scoringProfileId, 'default',
    'per-row scoring-profile field must be scoringProfileId, not the legacy profile key');
assert.equal('profile' in result.levels[0], false, 'the legacy profile key must not appear in fresh per-row output');

console.log('winning-lineage-pilot CLI: all tests passed');
