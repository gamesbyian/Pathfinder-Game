import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('..', import.meta.url);

function runCase({ levels, workBudget = null, missing = false, missingExitCode = null }) {
  const temp = mkdtempSync(path.join(os.tmpdir(), 'method-probe-outcome-'));
  const staging = path.join(temp, 'staging');
  const shard = path.join(staging, 'method-probe-shard-001');
  const out = path.join(temp, 'out');
  const outcome = path.join(temp, 'outcome.json');
  mkdirSync(shard, { recursive: true });
  writeFileSync(path.join(shard, 'shard-001-w0.console.log'), 'worker started\n');
  if (missingExitCode != null) {
    writeFileSync(path.join(shard, 'shard-001-w0.exit-status'), `${missingExitCode}\n`);
  }
  if (!missing) {
    writeFileSync(path.join(shard, 'shard-001-w0.json'), JSON.stringify({
      corpus: 'stress2', only: 'dfs', budgetMs: 100, workBudget, nodeBudget: 1000, levels,
    }));
  }
  const result = spawnSync(process.execPath, [
    'scripts/combine-method-probe-shards.mjs',
    `--staging-dir=${staging}`,
    `--out-dir=${out}`,
    `--outcome-out=${outcome}`,
    `--deterministic-work-mode=${workBudget != null}`,
  ], { cwd: root, encoding: 'utf8' });
  return { result, outcome: JSON.parse(readFileSync(outcome, 'utf8')) };
}

let run = runCase({ levels: [{ id: 'L1', ok: true }] });
assert.equal(run.result.status, 0, run.result.stderr);
assert.equal(run.outcome.outcome, 'completed-positive');

run = runCase({ levels: [{ id: 'L1', ok: false }] });
assert.equal(run.result.status, 0, run.result.stderr);
assert.equal(run.outcome.outcome, 'completed-negative');

run = runCase({ levels: [{ id: 'L1', ok: false, deadlineTruncated: true }] });
assert.equal(run.result.status, 0, run.result.stderr);
assert.equal(run.outcome.outcome, 'timeout');

run = runCase({ levels: [{ id: 'L1', ok: false, deadlineTruncated: true }], workBudget: 5000 });
assert.equal(run.result.status, 2, run.result.stderr);
assert.equal(run.outcome.outcome, 'timeout');

run = runCase({ levels: [], missing: true });
assert.equal(run.result.status, 2, run.result.stderr);
assert.equal(run.outcome.outcome, 'harness-error');

run = runCase({ levels: [], missing: true, missingExitCode: 124 });
assert.equal(run.result.status, 0, run.result.stderr);
assert.equal(run.outcome.outcome, 'timeout');

run = runCase({ levels: [], missing: true, missingExitCode: 143, workBudget: 5000 });
assert.equal(run.result.status, 2, run.result.stderr);
assert.equal(run.outcome.outcome, 'timeout');

console.log('combine method-probe shard outcome tests passed');
