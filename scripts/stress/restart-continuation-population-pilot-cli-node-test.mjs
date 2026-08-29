#!/usr/bin/env node
/**
 * Regression coverage for restart-continuation-population-pilot.mjs's population filter: it used
 * to require strict `a.stageId === 'early-repair-search'`, so a historical census row carrying the
 * literal legacy stageId string `'repair-probe'` was silently excluded from the selectable
 * population instead of being recognized as the canonical early-repair-search stage. Uses
 * `--count-only` (no solver work run) against a tiny fixture census/corpus so this stays fast.
 */
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFile = promisify(execFileCallback);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const dir = await mkdtemp(path.join(os.tmpdir(), 'restart-continuation-population-pilot-cli-'));
const censusPath = path.join(dir, 'census.json');
const corpusPath = path.join(dir, 'corpus.json');
await writeFile(censusPath, JSON.stringify({
    solved: 0, total: 1, commitSha: 'fixture',
    levels: [{
        id: 'R00001', status: 'work-budget-reached',
        // Legacy stageId string -- must still be recognized as the ordinary early-repair-search tier.
        attempts: [{ stageId: 'repair-probe', repair: true, seedSalt: null, bestBadness: 4 }],
    }],
}));
await writeFile(corpusPath, JSON.stringify([{ id: 'R00001', grid: { w: 1, h: 1 }, gates: [], goal: { x: 1, y: 1 }, reqLen: 1, reqInt: 0 }]));

const { stdout } = await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/stress/restart-continuation-population-pilot.mjs',
    `--census=${censusPath}`, `--corpus=${corpusPath}`, '--count-only',
], { cwd: ROOT });

const lines = stdout.trim().split('\n');
const count = Number(lines[lines.length - 1]);
assert.equal(count, 1,
    'the legacy repair-probe stageId row must count toward the selectable population, not be silently dropped');

console.log('restart-continuation-population-pilot CLI: all tests passed');
