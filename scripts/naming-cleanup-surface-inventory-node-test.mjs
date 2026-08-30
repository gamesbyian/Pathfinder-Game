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
assert.ok(inventory.summary.moduleFiles > 0);
assert.ok(inventory.summary.reportSurfaces > 0);
assert.ok(inventory.reportSurfaces.some(row => row.producers.length > 0));
assert.ok(inventory.reportSurfaces.some(row => row.consumers.length > 0));

const hintValidator = inventory.scripts.find(row => row.file === 'scripts/hint-path-oracle.mjs');
assert.ok(hintValidator, 'Phase-8 inventory should map hint-path-oracle.mjs');
assert.ok(hintValidator.packageAliases.includes('test:hint-path-oracle'));
assert.equal(
  hintValidator.coverageStatus,
  'ci-test-reference',
  'hint-path-oracle should be distinguished from direct package-command execution',
);
assert.equal(hintValidator.ciDirectAliases.length, 0);
assert.ok(hintValidator.ciTestReferences.length > 0);

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

const lineageModule = inventory.modules.find(row => row.file === 'modules/solver/research-lineage.ts');
assert.ok(lineageModule, 'Phase-8 inventory should map the research-lineage module');
assert.ok(lineageModule.exports.includes('WinningPrefixIndex'));
assert.ok(lineageModule.exports.includes('WinningLineageObserver'));
assert.ok(lineageModule.importOrTextRefs.some(file => file.startsWith('scripts/')));

const lineageSymbol = inventory.ledgerEntries.find(row => row.old === 'WinningLineageObserver');
assert.ok(lineageSymbol);
assert.equal(lineageSymbol.id, 'NC-P08-005');
assert.equal(lineageSymbol.batch, '8B');
assert.ok(lineageSymbol.surfaces.symbolOwners.includes('modules/solver/research-lineage.ts'));

const atlasWorkflow = inventory.workflows.find(row => row.file === '.github/workflows/atlas-sweep.yml');
assert.ok(atlasWorkflow, 'Phase-8 inventory should map atlas-sweep workflow');

const hintAlias = inventory.packageCommands.find(row => row.name === 'test:hint-path-oracle');
assert.ok(hintAlias);
assert.equal(hintAlias.ciCommandReachable, false);

for (const row of inventory.scripts) {
  console.log(`PHASE8_SURFACE status=${row.coverageStatus} file=${row.file} aliases=${row.packageAliases.join(',') || '-'}`);
}
console.log('Naming-cleanup surface inventory classification is stable for representative Phase-8 surfaces.');


const rangeRaw = execFileSync(process.execPath, [
  path.join(root, 'scripts', 'naming-cleanup-surface-inventory.mjs'),
  '--json',
  '--phase=8-14',
], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const rangeInventory = JSON.parse(rangeRaw);
assert.deepEqual(rangeInventory.phaseRange, [8, 14]);
assert.equal(rangeInventory.ledgerEntries.length, 107);
assert.ok(rangeInventory.ledgerEntries.every(row => typeof row.reconciliationState === 'string'));
assert.ok(rangeInventory.ledgerEntries.every(row => typeof row.id === 'string' && /^NC-P\d{2}-\d{3}$/u.test(row.id)));
assert.ok(rangeInventory.ledgerEntries.filter(row => row.persistence === 'dual-read').every(row => row.compatibility && row.compatibility.owner));
assert.ok(rangeInventory.ledgerEntries.every(row => Array.isArray(row.oldReferenceCategories)));
assert.ok(rangeInventory.ledgerEntries.some(row => row.reconciliationState === 'old-live'));
const reconciliationCounts = Object.fromEntries(
  [...new Set(rangeInventory.ledgerEntries.map(row => row.reconciliationState))]
    .sort()
    .map(state => [state, rangeInventory.ledgerEntries.filter(row => row.reconciliationState === state).length]),
);
console.log(`Naming-cleanup Phase 8-14 reconciliation states: ${JSON.stringify(reconciliationCounts)}`);
for (const row of rangeInventory.ledgerEntries.filter(row =>
  row.reconciliationState === 'no-current-live-reference-review' ||
  row.reconciliationState === 'mixed-old-and-canonical' ||
  row.reconciliationState === 'canonical-live')) {
  console.log(`RECONCILE phase=${row.phase} state=${row.reconciliationState} kind=${row.kind} old=${row.old} new=${row.new}`);
}
console.log('Naming-cleanup Phase 8-14 range reconciliation inventory is available.');
