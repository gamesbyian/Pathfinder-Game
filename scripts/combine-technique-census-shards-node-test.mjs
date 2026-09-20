#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function writeShard(staging, index, commit) {
  const dir = path.join(staging, `technique-census-shard-${String(index).padStart(3, '0')}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `shard-${String(index).padStart(3, '0')}.json`), JSON.stringify({
    commit,
    shard: index,
    shards: 2,
    partial: false,
    results: [],
  }));
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'technique-census-combine-cli-'));
try {
  const staging = path.join(temp, 'staging');
  const out = path.join(temp, 'out');
  const commit = 'a'.repeat(40);
  writeShard(staging, 1, commit);
  writeShard(staging, 2, commit);

  const ok = spawnSync(process.execPath, [
    'scripts/combine-technique-census-shards.mjs',
    `--staging-dir=${staging}`,
    `--out-dir=${out}`,
    `--solver-version=${commit}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  const combined = JSON.parse(fs.readFileSync(path.join(out, 'combined-cells.json'), 'utf8'));
  assert.equal(combined.commit, commit);

  writeShard(staging, 2, 'b'.repeat(40));
  const mismatch = spawnSync(process.execPath, [
    'scripts/combine-technique-census-shards.mjs',
    `--staging-dir=${staging}`,
    `--out-dir=${path.join(temp, 'mismatch-out')}`,
    `--solver-version=${commit}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /execution revisions disagree/u);

  fs.rmSync(path.join(staging, 'technique-census-shard-002'), { recursive: true, force: true });
  writeShard(staging, 2, null);
  const mixed = spawnSync(process.execPath, [
    'scripts/combine-technique-census-shards.mjs',
    `--staging-dir=${staging}`,
    `--out-dir=${path.join(temp, 'mixed-out')}`,
  ], { cwd: process.cwd(), encoding: 'utf8' });
  assert.notEqual(mixed.status, 0);
  assert.match(mixed.stderr, /mixed fresh\/legacy shard revision metadata/u);

  console.log('combine technique-census shard CLI tests passed');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
