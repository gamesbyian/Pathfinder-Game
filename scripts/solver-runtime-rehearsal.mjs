#!/usr/bin/env node
/**
 * Produce a small deterministic semantic fingerprint under the current Node runtime.
 *
 * This is rehearsal infrastructure for exact research-runtime migration. It executes both primary
 * solver report producers against the same trivial real-search fixture, then records only fields
 * that should remain invariant across a runtime patch/major when solver semantics are unchanged.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const args = process.argv.slice(2);
const outArg = args.find(arg => arg.startsWith('--out='));
const outFile = outArg ? outArg.slice('--out='.length) : 'tmp/solver-runtime-rehearsal.json';
const root = process.cwd();
const dir = await mkdtemp(path.join(os.tmpdir(), 'solver-runtime-rehearsal-'));
const corpus = [{
  id: 'RUNTIME-REHEARSAL-1',
  grid: { w: 5, h: 5 },
  gates: [{ x: 1, y: 1 }],
  goal: { x: 5, y: 5 },
  reqLen: 8,
  reqInt: 0,
  blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], landmarks: [],
  filters: [], flippingFilters: [], portals: [],
}];
const corpusPath = path.join(dir, 'corpus.json');
await writeFile(corpusPath, JSON.stringify(corpus));

async function run(entry, argv, name) {
  const reportPath = path.join(dir, `${name}.json`);
  const summaryPath = path.join(dir, `${name}.md`);
  await execFile(process.execPath, [
    'scripts/run-bundled.mjs', entry,
    `--corpus=${corpusPath}`,
    ...argv,
    `--out=${reportPath}`,
    `--summary-out=${summaryPath}`,
  ], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(await readFile(reportPath, 'utf8'));
}

const levelBlind = await run('scripts/level-blind-capability-sweep.mjs', [
  '--budget-ms=5000',
  '--work-budget=100000',
  '--strict-total-work-budget',
  '--levels=pos:1',
], 'level-blind');

const portfolio = await run('scripts/portfolio-solve-sweep.mjs', [
  '--scheduler-mode=production',
  '--budget-ms=5000',
  '--node-budget=250000',
  '--levels=1',
  `--checkpoint=${path.join(dir, 'portfolio.checkpoint.jsonl')}`,
], 'portfolio');

function rowFingerprint(row) {
  return {
    id: row.id,
    ok: row.ok,
    solution: row.solution ?? null,
    winningConfig: row.winningConfig ?? null,
    workSpent: row.workSpent ?? row.totalWorkSpent ?? null,
    nodes: row.nodes ?? row.totalNodes ?? null,
    attempts: Array.isArray(row.attempts)
      ? row.attempts.map(attempt => ({
          config: attempt.config ?? attempt.key ?? attempt.name ?? null,
          ok: attempt.ok ?? null,
          workSpent: attempt.workSpent ?? null,
          nodes: attempt.nodes ?? null,
        }))
      : null,
  };
}

function reportFingerprint(report) {
  return {
    solverRequestIdentity: report.summary.solverRequestIdentity,
    effectiveConfigDigest: report.summary.effectiveConfigDigest,
    backend: report.summary.backend,
    reproducibilityMode: report.summary.reproducibilityMode,
    solvedCount: report.summary.solvedCount,
    levels: report.levels.map(rowFingerprint),
  };
}

const output = {
  schemaVersion: 1,
  runtime: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  levelBlind: reportFingerprint(levelBlind),
  portfolio: reportFingerprint(portfolio),
};

await mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
await writeFile(outFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
