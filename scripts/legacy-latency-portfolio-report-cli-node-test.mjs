#!/usr/bin/env node
/**
 * Regression coverage for scripts/legacy-latency-portfolio-report.mjs's portfolio-winner projection:
 * it correctly recognizes the canonical schedulerPhase 'legacy-latency-portfolio' when computing
 * pass numbers (passForPortfolioWin) and runtime breakdowns (summarizeRuntime), but the separate
 * `portfolioWinner` lookup used for winningConfig/gateKey only checked the legacy 'portfolio' and
 * 'fallback' phase values -- so a normal (pre-fallback) portfolio-scheduler win, which carries the
 * canonical schedulerPhase, was reported with winningConfig: null even though the solve succeeded.
 * A trivially solvable level always wins within the primary passes (schedulerPhase
 * 'legacy-latency-portfolio'), so this regresses on essentially every solved level, not an edge case.
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

const dir = await mkdtemp(path.join(os.tmpdir(), 'legacy-latency-portfolio-report-cli-'));
const corpusPath = path.join(dir, 'corpus.json');
const outFile = path.join(dir, 'report.json');
const summaryOutFile = path.join(dir, 'report-summary.md');
await writeFile(corpusPath, JSON.stringify([{
    id: 'FIXTURE-1',
    grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 }, reqLen: 8, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], landmarks: [],
    filters: [], flippingFilters: [], portals: [], designerName: '', description: '', difficulty: null, hints: [],
}]));

await execFile(process.execPath, [
    'scripts/run-bundled.mjs', 'scripts/legacy-latency-portfolio-report.mjs',
    `--corpus=${corpusPath}`, '--budget-ms=5000', `--out=${outFile}`, `--summary-out=${summaryOutFile}`,
], { cwd: ROOT });

const report = JSON.parse(await readFile(outFile, 'utf8'));
assert.equal(report.levels.length, 1);
const { portfolio } = report.levels[0];
assert.equal(portfolio.ok, true, 'fixture level must be solvable for this to be a meaningful check');
assert.notEqual(portfolio.winningConfig, null,
    'a canonical (pre-fallback) portfolio-scheduler win must report a real winningConfig, not null');

console.log('legacy-latency-portfolio-report CLI: all tests passed');
