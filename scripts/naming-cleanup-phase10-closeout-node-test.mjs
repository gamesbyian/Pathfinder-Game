#!/usr/bin/env node
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { readRepositoryText } from './repository-file-view.mjs';

const root = process.cwd();
const fixture = mkdtempSync(path.join(tmpdir(), 'phase10-closeout-'));
const ledgerPath = path.join(fixture, 'ledger.json');
const run = () => spawnSync(process.execPath, [path.join(root, 'scripts/naming-cleanup-phase10-closeout.mjs'), `--scan-root=${fixture}`, `--ledger=${ledgerPath}`], { encoding: 'utf8' });
try {
  const ledger = JSON.parse(readFileSync(path.join(root, 'docs/naming-cleanup-ledger.json'), 'utf8'));
  writeFileSync(ledgerPath, JSON.stringify(ledger));
  for (const artifact of ledger.phaseCurrentArtifacts['10']) {
    const target = path.join(fixture, artifact);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, readRepositoryText(root, artifact));
  }
  for (const file of ['modules/solver/hard-prune-pipeline.ts','modules/solver/repair-search.ts','modules/solver/stage-budget.ts','modules/solver/orchestration.ts','scripts/portfolio-solve-sweep-worker.mjs','scripts/solver-parallel/race.mjs']) {
    cpSync(path.join(root, file), path.join(fixture, file), { recursive: true });
  }
  assert.equal(run().status, 0, 'canonical fixture passes');
  const worker = path.join(fixture, 'scripts/portfolio-solve-sweep-worker.mjs');
  const canonical = readFileSync(worker, 'utf8');
  writeFileSync(worker, canonical.replaceAll('repairAdditiveBudgetMultiplierOverride', 'repairBudgetFractionOverride'));
  const stale = run();
  assert.notEqual(stale.status, 0, 'stale worker transport fails');
  assert.match(stale.stderr, /repairBudgetFractionOverride/);
  writeFileSync(worker, canonical.replaceAll('repairAdditiveBudgetMultiplierOverride', 'goalAttractionDisabledRetryBudgetFractionOverride'));
  assert.notEqual(run().status, 0, 'sibling substitution fails');
  writeFileSync(worker, canonical.replace(/repairAdditiveBudgetMultiplierOverride:[^,]+,/, ''));
  assert.notEqual(run().status, 0, 'missing propagation fails');
  writeFileSync(worker, canonical);
  const orchestration = path.join(fixture, 'modules/solver/orchestration.ts');
  const orchestrationCanonical = readFileSync(orchestration, 'utf8');
  writeFileSync(orchestration, `${orchestrationCanonical}\nconst repairBudgetFraction = 6;\n`);
  const staleLocal = run();
  assert.notEqual(staleLocal.status, 0, 'unowned resolved-local spelling fails');
  assert.match(staleLocal.stderr, /repairBudgetFraction/);
  writeFileSync(orchestration, orchestrationCanonical);
  const stageBudget = path.join(fixture, 'modules/solver/stage-budget.ts');
  const stageBudgetCanonical = readFileSync(stageBudget, 'utf8');
  writeFileSync(stageBudget, `${stageBudgetCanonical}\nconst stalePolicy = 'additive-fraction';\n`);
  const stalePolicy = run();
  assert.notEqual(stalePolicy.status, 0, 'unowned legacy stage-policy spelling fails');
  assert.match(stalePolicy.stderr, /additive-fraction/);
  writeFileSync(stageBudget, stageBudgetCanonical);
  const artifact = path.join(fixture, ledger.phaseCurrentArtifacts['10'][0]);
  const artifactCanonical = readFileSync(artifact, 'utf8');
  writeFileSync(artifact, artifactCanonical.replace('REPAIR_ADDITIVE_BUDGET_MULTIPLIER', 'REPAIR_EXTRA_BUDGET_FRACTION'));
  assert.notEqual(run().status, 0, 'registered current-artifact legacy spelling fails');
  console.log('Phase-10 closeout negative fixtures passed.');
} finally { rmSync(fixture, { recursive: true, force: true }); }
