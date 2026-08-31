#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checker = path.join(root, 'scripts/naming-cleanup-phase9-closeout.mjs');
const temp = mkdtempSync(path.join(tmpdir(), 'phase9-closeout-'));
function run(scanRoot) {
  return spawnSync(process.execPath, [checker, `--scan-root=${scanRoot}`], { encoding: 'utf8' });
}
try {
  for (const dir of ['modules', 'scripts', 'docs', '.github', 'data', 'reports/stress']) {
    mkdirSync(path.join(temp, dir), { recursive: true });
  }
  cpSync(path.join(root, 'package.json'), path.join(temp, 'package.json'));
  for (const file of [
    'scripts/run-solver-direct.mjs', 'scripts/combine-solver-sweep-reports.mjs',
  ]) cpSync(path.join(root, file), path.join(temp, file));
  // The closeout contract only requires these canonical report paths to exist. Keep the negative
  // fixture tiny so Node-test CI does not depend on reports/ being materialized by sparse checkout.
  for (const file of [
    'reports/stress/solver-corpus1-latest.json', 'reports/stress/solver-corpus2-latest.json',
  ]) writeFileSync(path.join(temp, file), '{}\n');

  let result = run(temp);
  assert.equal(result.status, 0, result.stderr);

  writeFileSync(path.join(temp, 'docs/regression.md'), 'Use npm run solver:bench.\n');
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /solver:bench/);

  writeFileSync(path.join(temp, 'docs/regression.md'), 'canonical only\n');
  const pkg = JSON.parse(readFileSync(path.join(temp, 'package.json'), 'utf8'));
  pkg.scripts['solver:regression'] = 'node scripts/wrong.mjs';
  writeFileSync(path.join(temp, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing\/drifted solver:regression target/);

  console.log('Phase-9 closeout negative fixtures passed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
