#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./ci-runtime-data-cache.mjs', import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pathfinder-runtime-data-cache-'));

function write(rel, text) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function run(...args) {
  return execFileSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' }).trim();
}

try {
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'CI Fixture');

  const files = {
    'data/levels.json': 'levels-v1\n',
    'data/level-heatmaps.json': 'heatmaps-v1\n',
    'data/themes.json': 'themes-v1\n',
    'data/hints/H00001.json': 'published-v1\n',
    'data/stress/stress-levels.json': 'stress-v1\n',
    'data/stress/stress-levels-random.json': 'random-levels-v1\n',
    'data/stress/stress-levels-envelope.json': 'envelope-levels-v1\n',
    'data/stress/hints/S00001.json': 'stress-hint-v1\n',
    'data/stress/hints-random/R00001.json': 'random-hint-v1\n',
    'data/stress/hints-envelope/E00001.json': 'envelope-hint-v1\n',
  };
  for (const [rel, text] of Object.entries(files)) write(rel, text);
  git('add', 'data');
  git('commit', '-qm', 'baseline runtime data');

  const key1 = run('key');
  run('seed-manifest');
  const cachedManifest = fs.readFileSync(path.join(root, '.ci-cache/runtime-data-manifest.tsv'), 'utf8');

  write('data/stress/hints-random/R00001.json', 'random-hint-v2\n');
  git('add', 'data/stress/hints-random/R00001.json');
  git('commit', '-qm', 'change one random hint');

  const key2 = run('key');
  assert.notEqual(key2, key1, 'one runtime-data blob change must change the exact cache key');

  // Simulate restoring the previous cache archive beneath the new HEAD.
  write('data/stress/hints-random/R00001.json', 'random-hint-v1\n');
  fs.mkdirSync(path.join(root, '.ci-cache'), { recursive: true });
  fs.writeFileSync(path.join(root, '.ci-cache/runtime-data-manifest.tsv'), cachedManifest);

  const overlay = run('reconcile');
  assert.match(overlay, /1 changed\/added, 0 deleted/u);
  assert.equal(fs.readFileSync(path.join(root, 'data/stress/hints-random/R00001.json'), 'utf8'), 'random-hint-v2\n');
  assert.equal(fs.readFileSync(path.join(root, 'data/hints/H00001.json'), 'utf8'), 'published-v1\n');
  assert.equal(fs.readFileSync(path.join(root, 'data/stress/hints/S00001.json'), 'utf8'), 'stress-hint-v1\n');

  console.log('runtime-data rolling cache: all tests passed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
