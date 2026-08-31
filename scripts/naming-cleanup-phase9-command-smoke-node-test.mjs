#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const expected = {
  'solver:regression': 'node scripts/run-bundled.mjs scripts/solver-bench.mjs',
  'solver:measure-speed': 'node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs',
  'stress:measure-solver': 'node scripts/run-bundled.mjs scripts/stress/benchmark.mjs',
  'stress:measure-solver:raced': 'node scripts/run-bundled.mjs scripts/solver-parallel/benchmark.mjs',
  'solver:direct': 'node scripts/run-bundled.mjs scripts/run-solver-direct.mjs',
  'solver:combine-sweep-reports': 'node scripts/combine-solver-sweep-reports.mjs',
};
for (const [name, target] of Object.entries(expected)) assert.equal(pkg.scripts[name], target);
for (const removed of ['solver:bench', 'solver:speed-probe', 'stress:benchmark', 'stress:benchmark:raced', 'solver:combine-corpus2-batches']) {
  assert.equal(pkg.scripts[removed], undefined, `deprecated package alias ${removed} is retired`);
}

function npmRun(name, args) {
  return execFileSync('npm', ['run', name, '--', ...args], {
    cwd: process.cwd(), stdio: 'pipe', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024,
  });
}
function json(file) { return JSON.parse(readFileSync(file, 'utf8')); }

const dir = mkdtempSync(path.join(tmpdir(), 'phase9-command-smoke-'));
try {
  const directOut = path.join(dir, 'direct.json');
  npmRun('solver:direct', ['--levels=pos:0', '--budget-ms=1', '--work-budget=1', `--output=${directOut}`]);
  assert.equal(json(directOut).total, 0);
  assert.deepEqual(json(directOut).levels, []);

  const regressionBaseline = path.join(dir, 'regression-baseline.json');
  const regressionOut = path.join(dir, 'regression.json');
  writeFileSync(regressionBaseline, JSON.stringify({
    generatedAt: new Date().toISOString(), solved: [], failed: [], totalMs: 0, nodesExpanded: 0,
  }));
  npmRun('solver:regression', [
    '--levels=pos:0', '--budget-ms=1', '--work-budget=1',
    `--baseline=${regressionBaseline}`, `--out=${regressionOut}`,
  ]);
  assert.deepEqual(json(regressionOut).solved, []);
  assert.deepEqual(json(regressionOut).failed, []);

  const speedOut = path.join(dir, 'speed-probe.json');
  npmRun('solver:measure-speed', ['--count=0', `--out=${speedOut}`]);
  const speed = json(speedOut);
  assert.equal(speed.corpus, 'published');
  assert.equal(speed.count, 0);
  assert.deepEqual(speed.rows, []);

  const emptyCorpus = path.join(dir, 'empty-stress-corpus.json');
  writeFileSync(emptyCorpus, JSON.stringify({
    generatedAt: 'phase9-smoke', generatorVersion: 'phase9-smoke', levels: [],
  }));

  const stressOut = path.join(dir, 'stress.json');
  npmRun('stress:measure-solver', [
    `--corpus=${emptyCorpus}`, '--engine=sequential', '--budget-ms=1', '--work-budget=1', `--out=${stressOut}`,
  ]);
  const stress = json(stressOut);
  assert.equal(stress.engine, 'sequential');
  assert.equal(stress.total, 0);
  assert.deepEqual(stress.levels, []);

  const racedOut = path.join(dir, 'stress-raced.json');
  npmRun('stress:measure-solver:raced', [
    `--corpus=${emptyCorpus}`, '--budget-ms=1', '--pool-size=1', `--out=${racedOut}`,
  ]);
  const raced = json(racedOut);
  assert.equal(raced.engine, 'raced');
  assert.equal(raced.total, 0);
  assert.deepEqual(raced.levels, []);

  const shard = path.join(dir, 'sweep-shard.json');
  const combinedOut = path.join(dir, 'combined.json');
  writeFileSync(shard, JSON.stringify({
    summary: { budgetMs: 1, corpus: 'phase9-smoke', schedulerMode: 'phase9-smoke', commit: 'phase9-smoke' },
    levels: [],
  }));
  npmRun('solver:combine-sweep-reports', [`--in=${shard}`, `--out=${combinedOut}`]);
  const combined = json(combinedOut);
  assert.equal(combined.corpus, 'phase9-smoke');
  assert.equal(combined.total, 0);
  assert.deepEqual(combined.levels, []);

  console.log('Phase-9 package identities and all surfaced npm entrypoints execute with zero-work fixtures.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
