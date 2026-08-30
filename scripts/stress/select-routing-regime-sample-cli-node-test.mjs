#!/usr/bin/env node
/**
 * Regression coverage for select-routing-regime-sample.mjs's --routing-regimes/--archetypes
 * conflict check: it used to compare the two RAW strings before normalization, so an equivalent
 * pair such as canonical `intersection-heavy` and legacy `high-intersection-burden` was rejected
 * as "conflicting" despite representing the same normalized routing regime. Fixed to normalize
 * both sides (each a comma-separated list) before comparing as sets.
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

const dir = await mkdtemp(path.join(os.tmpdir(), 'select-routing-regime-sample-cli-'));
const corpusPath = path.join(dir, 'corpus.json');
// reqInt=10 unconditionally classifies as 'intersection-heavy' regardless of coverage.
await writeFile(corpusPath, JSON.stringify([{
    id: 'R00001', grid: { w: 10, h: 10 }, gates: [{ x: 1, y: 1 }], goal: { x: 10, y: 10 },
    reqLen: 50, reqInt: 10, blocks: [], mustPass: [], mustCross: [], falseGoals: [], geese: [],
    filters: [], flippingFilters: [], portals: [], landmarks: [],
}]));

const runSelect = (...extraArgs) => execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/stress/select-routing-regime-sample.mjs',
    `--corpus=${corpusPath}`, '--eligible-sample=10', '--control-sample=0', '--seed=fixture',
    `--out=${path.join(dir, 'sample.txt')}`,
    ...extraArgs,
], { cwd: ROOT });

await runSelect('--routing-regimes=intersection-heavy,high-intersection-burden');
await assert.rejects(runSelect('--routing-regimes=general', '--archetypes=must-cross-heavy'),
    /Conflicting/, 'genuinely different normalized routing regimes must still be rejected as conflicting');

// The core regression: an equivalent canonical/legacy pair must NOT be rejected as conflicting.
const { stdout } = await runSelect('--routing-regimes=intersection-heavy', '--archetypes=high-intersection-burden');
assert.match(stdout, /Eligible sample drawn: 1/,
    'canonical intersection-heavy and legacy high-intersection-burden normalize to the same regime and must not conflict');

console.log('select-routing-regime-sample CLI: all tests passed');
