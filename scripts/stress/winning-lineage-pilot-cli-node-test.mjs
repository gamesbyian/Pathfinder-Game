#!/usr/bin/env node
/**
 * Regression coverage for winning-lineage-pilot.mjs's fresh-output field naming: it wrote the
 * scoring-profile dimension under the legacy `profile` key (both per-row and document-level) even
 * though Phase 5's field migration renamed this solver dimension to `scoringProfileId` everywhere
 * else. Runs the real tool against a synthetic hint-bearing fixture level (a 1x5 corridor with its
 * one possible gate-to-goal path stored as the hint) so this exercises the actual solve/observer
 * path, not an empty-corpus smoke pass. Uses a synthetic fixture rather than the real Corpus-1
 * stress data on disk because the node-tests CI job's checkout deliberately excludes
 * data/stress/ (see .github/workflows/ci.yml) -- that corpus is frozen research/stress data, not
 * a test fixture.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Packed-integer coordinate encoding, matching modules/domain/cell-key.ts's PACK() (this file
// runs under plain node, so it inlines the one-line formula instead of importing that .ts module).
const PACK = (x, y) => (y << 16) | x;

const dir = await mkdtemp(path.join(os.tmpdir(), 'winning-lineage-pilot-cli-'));
const outFile = path.join(dir, 'lineage-pilot.json');
const levelsFile = path.join(dir, 'levels.json');

// A 1x5 corridor has exactly one possible gate-to-goal path (see hint-workbench-node-test.mjs's
// identical fixture), so the stored hint below is the level's only solution.
const fixtureLevel = {
    id: 'FIX1', grid: { w: 5, h: 1 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 }, falseGoals: [],
    reqLen: 4, reqInt: 0, blocks: [], mustPass: [], mustCross: [], filters: [],
    flippingFilters: [], portals: [], geese: [], landmarks: [], designerName: '', description: '', difficulty: null,
    hints: [[PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(3, 0), PACK(4, 0)]],
};
await writeFile(levelsFile, `${JSON.stringify([fixtureLevel], null, 2)}\n`);

await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/stress/winning-lineage-pilot.mjs',
    `--levels=${levelsFile}`, '--level-ids=FIX1',
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
