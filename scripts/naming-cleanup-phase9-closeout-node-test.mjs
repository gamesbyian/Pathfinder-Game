#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const checker = path.join(root, 'scripts/naming-cleanup-phase9-closeout.mjs');
const ledger = JSON.parse(readFileSync(path.join(root, 'docs/naming-cleanup-ledger.json'), 'utf8'));
const temp = mkdtempSync(path.join(tmpdir(), 'phase9-closeout-'));

function run(scanRoot) {
  return spawnSync(process.execPath, [checker, `--scan-root=${scanRoot}`], { encoding: 'utf8' });
}

try {
  for (const dir of ['modules', 'scripts', 'docs', '.github', 'data', 'tests', 'logs', 'reports/stress']) {
    mkdirSync(path.join(temp, dir), { recursive: true });
  }
  cpSync(path.join(root, 'package.json'), path.join(temp, 'package.json'));
  for (const file of ['scripts/run-solver-direct.mjs', 'scripts/combine-solver-sweep-reports.mjs']) {
    cpSync(path.join(root, file), path.join(temp, file));
  }
  for (const file of ledger.phaseCurrentArtifacts['9']) {
    const destination = path.join(temp, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, '{"phase9":"canonical-only"}\n');
  }

  let result = run(temp);
  assert.equal(result.status, 0, result.stderr);

  const docPath = path.join(temp, 'docs/regression.md');
  writeFileSync(docPath, 'Use npm run solver:bench.\n');
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /solver:bench/);
  unlinkSync(docPath);

  const packagePath = path.join(temp, 'package.json');
  const originalPackage = readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(originalPackage);
  pkg.scripts['solver:regression'] = 'node scripts/wrong.mjs';
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing\/drifted solver:regression target/);
  writeFileSync(packagePath, originalPackage);

  const testPath = path.join(temp, 'tests/phase9-regression.spec.mjs');
  writeFileSync(testPath, 'const retired = "run-solverv2-direct.mjs";\n');
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /run-solverv2-direct\.mjs/);
  unlinkSync(testPath);

  const claudePath = path.join(temp, 'CLAUDE.md');
  writeFileSync(claudePath, 'Run npm run solver:speed-probe.\n');
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /solver:speed-probe/);
  unlinkSync(claudePath);

  const liveBaseline = path.join(temp, 'logs/stress-corpus1-baseline.json');
  writeFileSync(liveBaseline, '{"file":"reports/stress/benchmark-parallel.json"}\n');
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /logs\/stress-corpus1-baseline\.json/);
  assert.match(result.stderr, /reports\/stress\/benchmark-parallel\.json/);
  writeFileSync(liveBaseline, '{"phase9":"canonical-only"}\n');

  // Logs/reports are not globally treated as live. Unregistered history remains historical while
  // the four maintained reader inputs above are scanned through the explicit ledger registry.
  writeFileSync(path.join(temp, 'logs/frozen-history.json'), '{"file":"reports/stress/benchmark-parallel.json"}\n');
  result = run(temp);
  assert.equal(result.status, 0, result.stderr);

  const missingCurrent = path.join(temp, 'logs/stress-corpus2-baseline.json');
  unlinkSync(missingCurrent);
  result = run(temp);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /registered\/current Phase-9 surface missing/);

  console.log('Phase-9 closeout current-vs-frozen negative fixtures passed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
