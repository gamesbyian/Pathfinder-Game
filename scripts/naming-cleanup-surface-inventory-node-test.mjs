#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const raw = execFileSync(process.execPath, [
  path.join(root, 'scripts', 'naming-cleanup-surface-inventory.mjs'),
  '--json',
  '--phase=8',
], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

const inventory = JSON.parse(raw);

assert.equal(inventory.schemaVersion, 1);
assert.equal(inventory.phase, 8);
assert.ok(inventory.summary.ciRoots.includes('test:node'));
assert.ok(inventory.summary.ciRoots.includes('test:coverage'));
assert.ok(inventory.summary.ciRoots.includes('check:nonlint'));
assert.equal(inventory.summary.workflowPathStructuralCheckInCi, true);

const hintValidator = inventory.scripts.find(row => row.file === 'scripts/hint-path-oracle.mjs');
assert.ok(hintValidator, 'Phase-8 inventory should map hint-path-oracle.mjs');
assert.ok(hintValidator.packageAliases.includes('test:hint-path-oracle'));
assert.equal(
  hintValidator.coverageStatus,
  'uncovered-by-known-ci',
  'test:hint-path-oracle is surfaced but is not currently reachable from the PR CI command graph',
);

const restartComparison = inventory.scripts.find(
  row => row.file === 'scripts/stress/restart-continuation-population-pilot.mjs',
);
assert.ok(restartComparison, 'Phase-8 inventory should map restart-continuation population tool');
assert.equal(
  restartComparison.coverageStatus,
  'ci-test-reference',
  'restart/continuation tool should remain distinguished from direct CI execution',
);
assert.ok(
  restartComparison.ciTestReferences.includes(
    'scripts/stress/restart-continuation-population-pilot-cli-node-test.mjs',
  ),
);

const atlasWorkflow = inventory.workflows.find(row => row.file === '.github/workflows/atlas-sweep.yml');
assert.ok(atlasWorkflow, 'Phase-8 inventory should map atlas-sweep workflow');

const hintAlias = inventory.packageCommands.find(row => row.name === 'test:hint-path-oracle');
assert.ok(hintAlias);
assert.equal(hintAlias.ciCommandReachable, false);

console.log('Naming-cleanup surface inventory classification is stable for representative Phase-8 surfaces.');
