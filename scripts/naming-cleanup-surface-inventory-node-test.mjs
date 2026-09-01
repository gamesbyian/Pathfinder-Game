#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

const hintValidator = inventory.scripts.find(row => row.file === 'scripts/validate-hint-paths.mjs');
assert.ok(hintValidator, 'Phase-8 inventory should map validate-hint-paths.mjs');
assert.ok(hintValidator.packageAliases.includes('test:hint-path-validation'));
assert.equal(
  hintValidator.coverageStatus,
  'ci-test-reference',
  'validate-hint-paths should be distinguished from direct package-command execution',
);
assert.equal(hintValidator.ciDirectAliases.length, 0);
assert.ok(hintValidator.ciTestReferences.length > 0);

const restartComparison = inventory.scripts.find(
  row => row.file === 'scripts/stress/compare-repair-restart-continuation-population.mjs',
);
assert.ok(restartComparison, 'Phase-8 inventory should map restart-continuation population tool');
assert.equal(
  restartComparison.coverageStatus,
  'ci-test-reference',
  'restart/continuation tool should remain distinguished from direct CI execution',
);
assert.ok(
  restartComparison.ciTestReferences.includes(
    'scripts/stress/compare-repair-restart-continuation-population-cli-node-test.mjs',
  ),
);

const survivalModule = inventory.modules.find(row => row.file === 'modules/solver/known-solution-prefix-survival.ts');
assert.ok(survivalModule, 'Phase-8 inventory should map the known-solution-prefix-survival module');
assert.ok(survivalModule.exports.includes('KnownSolutionPrefixIndex'));
assert.ok(survivalModule.exports.includes('KnownSolutionPrefixSurvivalObserver'));
assert.ok(survivalModule.importOrTextRefs.some(file => file.startsWith('scripts/')));

const survivalSymbol = inventory.ledgerEntries.find(row => row.old === 'WinningLineageObserver');
assert.ok(survivalSymbol);
assert.equal(survivalSymbol.id, 'NC-P08-005');
assert.equal(survivalSymbol.batch, '8B');
assert.ok(survivalSymbol.surfaces.symbolOwners.includes('modules/solver/known-solution-prefix-survival.ts'));

const atlasWorkflow = inventory.workflows.find(row => row.file === '.github/workflows/collect-prune-gap-labels.yml');
assert.ok(atlasWorkflow, 'Phase-8 inventory should map the collect-prune-gap-labels workflow');

const hintAlias = inventory.packageCommands.find(row => row.name === 'test:hint-path-validation');
assert.ok(hintAlias);
assert.equal(hintAlias.ciCommandReachable, false);

for (const row of inventory.scripts) {
  console.log(`PHASE8_SURFACE status=${row.coverageStatus} file=${row.file} aliases=${row.packageAliases.join(',') || '-'}`);
}
console.log('Naming-cleanup surface inventory classification is stable for representative Phase-8 surfaces.');


const rangeRaw = execFileSync(process.execPath, [
  path.join(root, 'scripts', 'naming-cleanup-surface-inventory.mjs'),
  '--json',
  '--phase=8-15',
], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
const rangeInventory = JSON.parse(rangeRaw);
const ledger = JSON.parse(readFileSync(path.join(root, 'docs', 'naming-cleanup-ledger.json'), 'utf8'));
const expectedRangeRows = ledger.entries.filter(row => row.phase >= 8 && row.phase <= 15).length;
assert.deepEqual(rangeInventory.phaseRange, [8, 15]);
assert.equal(rangeInventory.ledgerEntries.length, expectedRangeRows);
assert.ok(rangeInventory.ledgerEntries.every(row => typeof row.reconciliationState === 'string'));
assert.ok(rangeInventory.ledgerEntries.every(row => typeof row.id === 'string' && /^NC-P\d{2}-\d{3}$/u.test(row.id)));
assert.ok(rangeInventory.ledgerEntries.filter(row => row.persistence === 'dual-read').every(row => row.compatibility && row.compatibility.owner));
assert.ok(rangeInventory.ledgerEntries.every(row => Array.isArray(row.oldReferenceCategories)));
assert.ok(rangeInventory.ledgerEntries.some(row => row.reconciliationState === 'old-live'));
const phase15Rows = rangeInventory.ledgerEntries.filter(row => row.phase === 15);
const expectedPhase15Ids = ledger.entries.filter(row => row.phase === 15).map(row => row.id).sort();
assert.deepEqual(phase15Rows.map(row => row.id).sort(), expectedPhase15Ids);
assert.equal(phase15Rows.length, 14,
  'Phase 15 contains the thirteen 15A rows plus the implementation-time NC-P15-014 split');
const pendingPhase15Rows = phase15Rows.filter(row => row.status === 'pending');
assert.deepEqual(pendingPhase15Rows.map(row => row.id).sort(), [],
  'once final implementation batch 15H starts, no Phase-15 implementation row remains pending');
const phase15HRows = phase15Rows.filter(row => ['NC-P15-007', 'NC-P15-013'].includes(row.id));
assert.ok(
  phase15HRows.every(row => ['in-progress', 'done'].includes(row.status)),
  '15H rows must be active or done while the final implementation batch owns them',
);
assert.ok(
  phase15HRows.every(row =>
    row.newReferenceFiles.length > 0 &&
    ['canonical-live', 'mixed-old-and-canonical'].includes(row.reconciliationState)),
  '15H must expose canonical prune-gap references; naming guards/ledger may keep retired spellings visible to reconciliation',
);

assert.ok(
  phase15Rows.every(row => [
    'old-live',
    'mixed-old-and-canonical',
    'canonical-live',
    'no-current-live-reference-review',
    'no-current-live-reference-frozen-history',
  ].includes(row.reconciliationState)),
  'Phase-15 reconciliation must classify every lifecycle state explicitly',
);
assert.ok(phase15Rows.find(row => row.id === 'NC-P15-003').oldReferenceCategories.includes('workflow'));
assert.ok(phase15Rows.find(row => row.id === 'NC-P15-004').oldReferenceCategories.includes('application'));
const reconciliationCounts = Object.fromEntries(
  [...new Set(rangeInventory.ledgerEntries.map(row => row.reconciliationState))]
    .sort()
    .map(state => [state, rangeInventory.ledgerEntries.filter(row => row.reconciliationState === state).length]),
);
console.log(`Naming-cleanup Phase 8-15 reconciliation states: ${JSON.stringify(reconciliationCounts)}`);
for (const row of rangeInventory.ledgerEntries.filter(row =>
  row.reconciliationState === 'no-current-live-reference-review' ||
  row.reconciliationState === 'mixed-old-and-canonical' ||
  row.reconciliationState === 'canonical-live')) {
  console.log(`RECONCILE phase=${row.phase} state=${row.reconciliationState} kind=${row.kind} old=${row.old} new=${row.new}`);
}
console.log('Naming-cleanup Phase 8-15 range reconciliation inventory is available.');
