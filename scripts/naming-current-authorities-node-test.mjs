#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const fixture = mkdtempSync(path.join(tmpdir(), 'naming-authorities-'));
const files = [
  'docs/naming-cleanup-ledger.json',
  'docs/naming-cleanup-phase-records/phase-15.md',
  'AGENTS.md',
  'docs/README.md',
  'docs/naming-and-vocabulary.md',
  'docs/solver-research-post-naming-resumption.md',
  'scripts/README.md',
  'docs/tooling-catalog.md',
];

function target(file) { return path.join(fixture, file); }
function reset() {
  rmSync(fixture, { recursive: true, force: true });
  mkdirSync(fixture, { recursive: true });
  for (const file of files) {
    mkdirSync(path.dirname(target(file)), { recursive: true });
    cpSync(file, target(file));
  }
}
function run() {
  return spawnSync(process.execPath, ['scripts/check-naming-current-authorities.mjs', `--root=${fixture}`], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}
function mutate(file, fn) {
  const before = readFileSync(target(file), 'utf8');
  writeFileSync(target(file), fn(before));
}
function expectFailure(label, file, fn, pattern) {
  reset();
  mutate(file, fn);
  const result = run();
  assert.notEqual(result.status, 0, `${label}: mutated authority unexpectedly passed`);
  assert.match(result.stderr, pattern, `${label}: wrong failure output`);
}

try {
  reset();
  const baseline = run();
  assert.equal(baseline.status, 0, `clean authority fixture failed: ${baseline.stderr}`);

  expectFailure(
    'physical docs-index row structure',
    'docs/README.md',
    source => source.replace(
      '| [`naming-cleanup-phase-records/phase-15-preparation.md`]',
      '\\n| [`naming-cleanup-phase-records/phase-15-preparation.md`]',
    ),
    /literal escaped newline|physical Phase-15 preparation row/iu,
  );

  expectFailure(
    'generic batch selector',
    'scripts/README.md',
    source => source.replace('--batch=<id>', '--batch=8A'),
    /hard-codes completed batch 8A|generic naming-status batch selector/iu,
  );

  expectFailure(
    'permanent vocabulary semantic drift',
    'docs/naming-and-vocabulary.md',
    source => `${source}\nLegacy dataset names remain live compatibility contracts.\n`,
    /pre-Phase-15 family contracts/iu,
  );

  expectFailure(
    'resumption false historical adapter',
    'docs/solver-research-post-naming-resumption.md',
    source => `${source}\nhistorical result values/fields are normalized before analysis/combination\n`,
    /invents an NC-P15-005 historical result normalizer/iu,
  );

  expectFailure(
    'active authority routing drift',
    'AGENTS.md',
    source => source.replaceAll('docs/naming-cleanup-phase-records/phase-15.md', 'docs/naming-cleanup-phase-records/phase-08.md'),
    /AGENTS\.md must route active Phase 15|active naming authority/iu,
  );

  expectFailure(
    'active execution-record header drift',
    'docs/naming-cleanup-phase-records/phase-15.md',
    source => source.replace(
      'Status: **15I hostile merged-tree closeout active; implementation batches 15B-15H are merged and done**',
      'Status: **15A contract-decomposition gate active**',
    ),
    /execution-record header must name the active batch/iu,
  );

  console.log('Naming current-authority negative fixtures passed.');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
