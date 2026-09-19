import assert from 'node:assert/strict';

import { buildResearchSystemInventory, researchSystemInventoryView } from './research-system-inventory-lib.mjs';

const inventory = buildResearchSystemInventory(process.cwd());

assert.equal(inventory.schemaVersion, 1);
assert.equal(inventory.authority.kind, 'derived-read-only');
assert.equal(inventory.authority.priorityAuthority, 'docs/solver-optimization-workstreams.md');
assert.ok(inventory.currentState.queueEntries > 0, 'inventory must expose current workstream state');
assert.ok(inventory.currentState.questions > 0, 'inventory must expose research-question state');
assert.ok(inventory.relations.some(row =>
    row.relation === 'questions' && row.source === 'docs/solver-research-question-relations.json'));
assert.ok(inventory.relations.some(row =>
    row.relation === 'durableEvidence' && row.authorityKind === 'derived/composed'));
assert.ok(inventory.commands.some(row => row.name === 'research:integration-audit'));
assert.equal(
    inventory.commands.find(row => row.name === 'research:canary-search-loss')?.entrypoint,
    'scripts/search-loss-real-canary.mjs',
    'inventory should map run-bundled aliases to the real producer rather than the wrapper',
);
assert.ok(inventory.planLifecycle.some(row =>
    row.path === 'docs/solver-research-system-consolidation-and-epistemic-coverage-plan.md' &&
    row.archived === false &&
    row.status?.includes('proposed implementation plan')));
assert.ok(inventory.documentation.currentReferenceCount > 0, 'inventory must derive the docs current-reference index');
assert.ok(inventory.documentation.currentReferences.some(row =>
    row.path === 'docs/solver-workflow-evidence-remediation-plan.md'));
const completedCurrentRef = inventory.planLifecycle.find(row =>
    row.path === 'docs/solver-workflow-evidence-remediation-plan.md');
assert.equal(completedCurrentRef?.kind, 'plan');
assert.equal(completedCurrentRef?.currentReference, true);
assert.equal(completedCurrentRef?.appearsConcluded, true);
assert.equal(completedCurrentRef?.currentReferenceMismatch, true,
    'completed historical plans still routed as current references should be visible as retrieval-entropy findings');
assert.ok(inventory.planLifecycle.some(row => row.kind === 'preflight'),
    'lifecycle inventory must cover preflights, not only *-plan.md files');
assert.ok(inventory.planLifecycle.some(row => row.kind === 'handoff'),
    'lifecycle inventory must cover handoffs, not only *-plan.md files');
assert.ok(Array.isArray(inventory.sharedImplementationDependencies));
assert.equal(
    inventory.diagnostics.fragilePlanLifecycleCount,
    inventory.planLifecycle.filter(row => row.fragileProse).length,
);

const architectureView = researchSystemInventoryView(inventory, 'architecture');
assert.ok(Array.isArray(architectureView.relations));
assert.equal('planLifecycle' in architectureView, false);
const lifecycleView = researchSystemInventoryView(inventory, 'lifecycle');
assert.ok(Array.isArray(lifecycleView.planLifecycle));
assert.equal('relations' in lifecycleView, false);
const diagnosticsView = researchSystemInventoryView(inventory, 'diagnostics');
assert.deepEqual(diagnosticsView.diagnostics, inventory.diagnostics);
assert.throws(() => researchSystemInventoryView(inventory, 'parallel-authority'), /unknown research-system inventory view/);

console.log('research-system inventory tests passed');
