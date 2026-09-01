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
    'retired dataset-root alias resurrected in permanent vocabulary',
    'docs/naming-and-vocabulary.md',
    source => `${source}\nThe shared parser accepts \`${['--tr', 'ove-root'].join('')}\` as a transition alias.\n`,
    /retired --trove-root as accepted compatibility/iu,
  );

  expectFailure(
    'retired explicit-prefix input alias resurrected in resumption bridge',
    'docs/solver-research-post-naming-resumption.md',
    source => `${source}\n\`${['atlas', 'abstain'].join('-')}\` remains the accepted input alias.\n`,
    /retired atlas-abstain as accepted/iu,
  );

  expectFailure(
    'terminal route invents Phase 16',
    'AGENTS.md',
    source => source.replace(
      'do not reopen them as a new phase sequence or invent Phase 16',
      'follow the next phase returned by that status and begin Phase 16',
    ),
    /must explicitly forbid reopening|must not advertise a next naming phase/iu,
  );

  expectFailure(
    'completed execution evidence relabeled current',
    'docs/README.md',
    source => source.replace('Completed/frozen Phase-15 execution evidence', 'Current Phase-15 execution/closeout authority'),
    /completed\/frozen evidence|must not classify Phase 15 as current execution authority/iu,
  );

  expectFailure(
    'terminal ledger reopens execution',
    'docs/naming-cleanup-ledger.json',
    source => {
      const ledger = JSON.parse(source);
      ledger.activeExecution = {
        status: 'active',
        phase: 15,
        batch: '15J',
        branch: 'test/reopened-phase15',
        pr: 9999,
        baseMainSha: '504330dc4e474b1ebc7755e8c34f72f63fd37901',
        recordPath: 'docs/naming-cleanup-phase-records/phase-15.md',
        notes: 'invalid terminal fixture',
      };
      return `${JSON.stringify(ledger, null, 2)}\n`;
    },
    /completed naming program must leave activeExecution idle/iu,
  );

  console.log('Naming current-authority negative fixtures passed.');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
