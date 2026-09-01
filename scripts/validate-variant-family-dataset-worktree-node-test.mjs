#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const script = path.join(root, 'scripts', 'validate-variant-family-dataset-worktree.mjs');

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

const newEnvRoot = fakeDatasetRoot('dataset-new-env');
const fromNewEnv = run([], { PATHFINDER_VARIANT_FAMILY_DATASET_ROOT: newEnvRoot });
assert.equal(fromNewEnv.status, 1, 'synthetic non-git dataset should fail safely');
assert.equal(path.resolve(fromNewEnv.report.dataset.root), path.resolve(newEnvRoot));
assert.ok(fromNewEnv.report.problems.some(problem => problem.includes('not a Git worktree')));

// Phase 15 retired the legacy dataset-root environment spelling. Supplying it alone must
// no longer redirect the tool away from its ordinary default root.
const retiredEnvRoot = fakeDatasetRoot('dataset-retired-env');
const fromRetiredEnv = run([], { PATHFINDER_VARIANT_TROVE: retiredEnvRoot });
assert.equal(fromRetiredEnv.status, 1);
assert.notEqual(
  path.resolve(fromRetiredEnv.report.dataset.root),
  path.resolve(retiredEnvRoot),
  'retired PATHFINDER_VARIANT_TROVE must not remain an accepted dataset-root input',
);
assert.equal(
  path.resolve(fromRetiredEnv.report.dataset.root),
  path.resolve(root, '../pathfinder-variant-research'),
  'retired env input must fall through to the ordinary default root',
);


const explicitRoot = fakeDatasetRoot('dataset-explicit');
const explicit = run([`--root=${explicitRoot}`], { PATHFINDER_VARIANT_FAMILY_DATASET_ROOT: newEnvRoot });
assert.equal(explicit.status, 1);
assert.equal(
  path.resolve(explicit.report.dataset.root),
  path.resolve(explicitRoot),
  '--root must take precedence over the canonical environment variable',
);

console.log('validate-variant-family-dataset-worktree plain-Node CLI/root contract smoke passed.');
