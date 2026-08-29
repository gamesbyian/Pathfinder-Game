#!/usr/bin/env node
/**
 * Regression coverage for scripts/level-blind-capability-sweep.mjs's reported scheduler mode:
 * the tool has no --scheduler-mode flag and never set SolveOpts.schedulerMode, so it always
 * actually ran in what orchestration.ts calls 'production' mode — yet hardcoded the removed
 * 'legacy' vocabulary into both the written report's summary.schedulerMode and every row's
 * buildRow() label. Runs the real CLI (matching scripts/family-boundary-cli-node-test.mjs's own
 * execFile pattern) against a tiny, trivially solvable fixture corpus and asserts the produced
 * report actually says 'production'.
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

const dir = await mkdtemp(path.join(os.tmpdir(), 'level-blind-capability-sweep-cli-'));
const corpusPath = path.join(dir, 'corpus.json');
const outFile = path.join(dir, 'report.json');
const summaryOutFile = path.join(dir, 'report-summary.md');
await writeFile(corpusPath, JSON.stringify([{
    id: 'FIXTURE-1',
    grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 }, reqLen: 8, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], landmarks: [],
    filters: [], flippingFilters: [], portals: [],
}]));

// This tool is bundler-only by established convention (every workflow invokes it via
// `node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs -- ...`, never plain
// node directly), so the test matches that real contract rather than inventing a new one.
await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/level-blind-capability-sweep.mjs',
    `--corpus=${corpusPath}`, '--budget-ms=5000', `--out=${outFile}`, `--summary-out=${summaryOutFile}`,
], { cwd: ROOT });

const report = JSON.parse(await readFile(outFile, 'utf8'));
assert.equal(report.summary.schedulerMode, 'production',
    'level-blind-capability-sweep.mjs has no --scheduler-mode flag and always resolves to production mode; the reported label must say so, not the removed "legacy" vocabulary');
assert.equal(report.levels.length, 1);
assert.equal(report.levels[0].ok, true, 'fixture level must be solvable for this to be a meaningful check');

console.log('level-blind-capability-sweep CLI: all tests passed');
