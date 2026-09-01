#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const replaySource = readFileSync('scripts/stress/offline-replay-harness.mjs', 'utf8');
const crossingSource = readFileSync('scripts/stress/mc-crossing-slack-analysis.mjs', 'utf8');

for (const source of [replaySource, crossingSource]) {
  assert.ok(source.includes("arg('prune-gap-dir', 'reports/stress')"),
    '15H must preserve reports/stress as the default prune-gap directory');
  assert.ok(source.includes("/^prune-gap-.*\\.json$/.test(f)"),
    '15H must preserve prune-gap file selection');
  assert.ok(!source.includes("arg('atlas-dir'"),
    '15H must not retain the retired CLI as an executable alias');
}

const temp = mkdtempSync(path.join(tmpdir(), 'phase15h-prune-gap-'));
try {
  const result = spawnSync(
    process.execPath,
    ['scripts/run-bundled.mjs', 'scripts/stress/offline-replay-harness.mjs', '--', `--prune-gap-dir=${temp}`],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  assert.equal(result.status, 1, 'empty canonical prune-gap directory should keep the existing no-input exit');
  assert.ok(
    result.stderr.includes(`No prune-gap-*.json files found under ${temp}.`),
    `canonical --prune-gap-dir must control the real CLI directory; stderr=${JSON.stringify(result.stderr)}`,
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}

// Execute the second real 15H producer too. An empty prune-gap directory is sufficient for this
// naming-boundary smoke: it exercises the canonical CLI, report writer, and metadata fields while
// avoiding an expensive research replay. The producer deliberately skips Corpus-2 loading when
// there are no branch artifacts, so this remains valid in the ordinary sparse Node-test checkout.
const crossingTemp = mkdtempSync(path.join(tmpdir(), 'phase15h-crossing-producer-'));
try {
  const out = path.join(crossingTemp, 'crossing.json');
  const result = spawnSync(
    process.execPath,
    [
      'scripts/run-bundled.mjs',
      'scripts/stress/mc-crossing-slack-analysis.mjs',
      '--',
      `--prune-gap-dir=${crossingTemp}`,
      '--corpora=published',
      '--limit-levels=0',
      `--out=${out}`,
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  assert.equal(result.status, 0, `crossing producer smoke failed: ${result.stdout}\n${result.stderr}`);
  assert.equal(existsSync(out), true, 'crossing producer must write the requested report');
  const report = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(report.atlas.pruneGapDir, crossingTemp);
  assert.equal(report.atlas.pruneGapFiles, 0);
  assert.equal('atlasDir' in report.atlas, false);
  assert.equal('atlasFiles' in report.atlas, false);
} finally {
  rmSync(crossingTemp, { recursive: true, force: true });
}

assert.ok(replaySource.includes('pruneGapDir: PRUNE_GAP_DIR'));
assert.ok(crossingSource.includes('pruneGapDir: PRUNE_GAP_DIR'));
assert.ok(crossingSource.includes('pruneGapFiles: pruneGapFiles.length'));

console.log('Phase-15H prune-gap CLI/report vocabulary smoke passed.');
