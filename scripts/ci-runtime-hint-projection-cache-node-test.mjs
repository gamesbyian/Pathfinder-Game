#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('./ci-runtime-hint-projection-cache.mjs', import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pathfinder-runtime-hint-cache-'));

function write(rel, text) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, text);
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function run(command) {
  const outputFile = path.join(root, 'gha-output.txt');
  fs.rmSync(outputFile, { force: true });
  const stdout = execFileSync(process.execPath, [script, command], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_OUTPUT: outputFile },
  }).trim();
  const outputs = new Map();
  if (fs.existsSync(outputFile)) {
    for (const line of fs.readFileSync(outputFile, 'utf8').trim().split('\n')) {
      if (!line) continue;
      const eq = line.indexOf('=');
      outputs.set(line.slice(0, eq), line.slice(eq + 1));
    }
  }
  return { stdout, outputs };
}

try {
  git('init', '-q');
  git('config', 'user.email', 'ci@example.invalid');
  git('config', 'user.name', 'CI Fixture');

  write('scripts/runtime-hint-projection-lib.mjs', 'authority-a\n');
  write('modules/domain/hint-runtime.mjs', 'authority-b\n');
  write('modules/canonical-json.mjs', 'authority-c\n');
  write('vite.config.ts', 'authority-d\n');
  write('data/hints/P00001.json', '{"hints":[1]}\n');
  write('data/stress/hints/S00001.json', '{"hints":[2]}\n');
  write('data/stress/hints-random/R00001.json', '{"hints":[3]}\n');
  git('add', '.');
  git('commit', '-qm', 'baseline');

  const first = run('key');
  run('plan');
  const firstPlan = JSON.parse(fs.readFileSync(path.join(root, '.cache/runtime-hint-projection/_reconcile-plan.json'), 'utf8'));
  assert.equal(firstPlan.changed.length, 3);
  assert.equal(firstPlan.deleted.length, 0);

  write('data/stress/hints-random/R00001.json', '{"hints":[4]}\n');
  git('add', 'data/stress/hints-random/R00001.json');
  git('commit', '-qm', 'change one source hint');
  const sourceChange = run('key');
  assert.equal(sourceChange.outputs.get('authority_key'), first.outputs.get('authority_key'),
    'source-only churn must preserve projection authority key');
  assert.notEqual(sourceChange.outputs.get('source_key'), first.outputs.get('source_key'),
    'source-only churn must change exact source key');
  run('plan');
  const secondPlan = JSON.parse(fs.readFileSync(path.join(root, '.cache/runtime-hint-projection/_reconcile-plan.json'), 'utf8'));
  assert.deepEqual(secondPlan.changed, ['data/stress/hints-random/R00001.json']);
  assert.deepEqual(secondPlan.deleted, []);

  write('scripts/runtime-hint-projection-lib.mjs', 'authority-a-v2\n');
  git('add', 'scripts/runtime-hint-projection-lib.mjs');
  git('commit', '-qm', 'change projection authority');
  const authorityChange = run('key');
  assert.notEqual(authorityChange.outputs.get('authority_key'), sourceChange.outputs.get('authority_key'),
    'projection-code churn must change fallback authority key');

  console.log('runtime-hint projection rolling cache: all tests passed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
