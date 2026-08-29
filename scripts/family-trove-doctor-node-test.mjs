#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const script = path.join(root, 'scripts', 'family-trove-doctor.mjs');

function fakeDatasetRoot(label) {
  const dir = mkdtempSync(path.join(tmpdir(), `pathfinder-${label}-`));
  for (const relative of ['data/families', 'logs/family-census', 'reports/families']) {
    mkdirSync(path.join(dir, relative), { recursive: true });
  }
  writeFileSync(path.join(dir, 'AGENTS.md'), 'historical data branch\n', 'utf8');
  return dir;
}

function run(args, env = {}) {
  const result = spawnSync(process.execPath, [script, '--json', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  assert.notEqual(result.status, null, result.error?.message);
  assert.ok(result.stdout.trim(), `expected JSON output; stderr=${result.stderr}`);
  return { status: result.status, report: JSON.parse(result.stdout) };
}

const envRoot = fakeDatasetRoot('trove-env');
const fromEnv = run([], { PATHFINDER_VARIANT_TROVE: envRoot });
assert.equal(fromEnv.status, 1, 'synthetic non-git dataset should fail safely');
assert.equal(path.resolve(fromEnv.report.trove.root), path.resolve(envRoot));
assert.ok(fromEnv.report.problems.some(problem => problem.includes('not a Git worktree')));

const explicitRoot = fakeDatasetRoot('trove-explicit');
const explicit = run([`--root=${explicitRoot}`], { PATHFINDER_VARIANT_TROVE: envRoot });
assert.equal(explicit.status, 1);
assert.equal(
  path.resolve(explicit.report.trove.root),
  path.resolve(explicitRoot),
  '--root must take precedence over PATHFINDER_VARIANT_TROVE',
);

console.log('family-trove-doctor plain-Node CLI/root contract smoke passed.');
