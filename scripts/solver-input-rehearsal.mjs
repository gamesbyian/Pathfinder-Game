#!/usr/bin/env node
/**
 * Exercise the live targeted-sweep planner/canary input boundary and emit a deterministic
 * fingerprint. Used by full-tree vs sparse-tree rehearsal; a missing hidden dependency should fail
 * the sparse arm rather than silently alter planning semantics.
 */
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const args = process.argv.slice(2);
const outFile = args.find(arg => arg.startsWith('--out='))?.slice('--out='.length)
  ?? 'tmp/solver-input-rehearsal.json';
const corpusPath = 'data/stress/stress-levels-random.json';
const telemetryPath = 'logs/solver-stress-refresh/corpus2-runtime-telemetry.json';
const dir = await mkdtemp(path.join(os.tmpdir(), 'solver-input-rehearsal-'));

const corpusDoc = JSON.parse(await readFile(corpusPath, 'utf8'));
const levels = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
if (!Array.isArray(levels) || levels.length < 4) throw new Error('rehearsal corpus requires at least four levels');
const ids = levels.slice(0, 4).map(level => level.id);
if (ids.some(id => !id)) throw new Error('rehearsal levels require stable ids');

const idsPath = path.join(dir, 'ids.txt');
const planPath = path.join(dir, 'plan.json');
await writeFile(idsPath, `${ids.join('\n')}\n`);

await execFile(process.execPath, [
  'scripts/plan-highbudget-shards.mjs',
  `--ids-file=${idsPath}`,
  `--corpus2=${corpusPath}`,
  `--telemetry=${telemetryPath}`,
  '--node-budget=250000',
  '--workers=4',
  '--target-wall-minutes=20',
  '--solo-threshold-multiplier=2.5',
  '--min-timeout-minutes=30',
  '--seed=20260925',
  '--max-shards=10',
  `--out=${planPath}`,
], { cwd: process.cwd(), maxBuffer: 16 * 1024 * 1024 });

const canaryPath = path.join(dir, 'canary.json');
const canarySummaryPath = path.join(dir, 'canary.md');
await execFile(process.execPath, [
  'scripts/run-bundled.mjs', 'scripts/level-blind-capability-sweep.mjs',
  `--corpus=${corpusPath}`,
  '--levels=pos:1',
  '--budget-ms=5000',
  '--node-budget=250000',
  '--work-budget=100000',
  '--strict-total-work-budget',
  '--workers=1',
  `--out=${canaryPath}`,
  `--summary-out=${canarySummaryPath}`,
], { cwd: process.cwd(), maxBuffer: 16 * 1024 * 1024 });

await execFile(process.execPath, [
  'scripts/verify-canary-cell.mjs',
  `--result=${canaryPath}`,
  '--expect-no-deadline-truncation=true',
], { cwd: process.cwd(), maxBuffer: 16 * 1024 * 1024 });

const plan = JSON.parse(await readFile(planPath, 'utf8'));
const canary = JSON.parse(await readFile(canaryPath, 'utf8'));
const row = canary.levels[0];

const output = {
  schemaVersion: 1,
  inputs: {
    corpus: corpusPath,
    telemetry: telemetryPath,
    ids,
  },
  plan: {
    planning: plan.planning,
    shard: plan.shard,
  },
  canary: {
    solverRequestIdentity: canary.summary.solverRequestIdentity,
    effectiveConfigDigest: canary.summary.effectiveConfigDigest,
    backend: canary.summary.backend,
    reproducibilityMode: canary.summary.reproducibilityMode,
    id: row.id,
    ok: row.ok,
    solution: row.solution ?? null,
    winningConfig: row.winningConfig ?? null,
    workSpent: row.workSpent ?? row.totalWorkSpent ?? null,
    nodes: row.nodes ?? row.totalNodes ?? null,
  },
};

await mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
await writeFile(outFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
