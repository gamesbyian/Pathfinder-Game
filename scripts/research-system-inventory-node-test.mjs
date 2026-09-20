import assert from 'node:assert/strict';

import { buildResearchSystemInventory, researchSystemInventoryView } from './research-system-inventory-lib.mjs';

const inventory = buildResearchSystemInventory(process.cwd());

assert.equal(inventory.schemaVersion, 1);
assert.equal(inventory.authority.kind, 'derived-read-only');
assert.equal(inventory.authority.priorityAuthority, 'docs/solver-optimization-workstreams.md');
assert.ok(inventory.currentState.queueEntries > 0, 'inventory must expose current workstream state');
assert.ok(inventory.currentState.questions > 0, 'inventory must expose research-question state');
assert.ok(inventory.frontDoorInputs.liveQueue.some(row => row.workstreamId === 2));
assert.ok(inventory.frontDoorInputs.deferredReopenQuestions.length > 0);
assert.ok(inventory.frontDoorInputs.unfinishedLifecycle.some(row => row.path === 'docs/solver-research-system-consolidation-and-epistemic-coverage-plan.md'));
assert.equal(inventory.integrationHealth.errorCount, 0, 'inventory should surface existing integration-audit errors');
assert.equal(inventory.diagnostics.authorityFindingCount, inventory.findings.authority.length);
assert.equal(inventory.diagnostics.lifecycleFindingCount, inventory.findings.lifecycle.length);
assert.equal(inventory.diagnostics.fragileProseFindingCount, inventory.findings.fragileProse.length);
assert.ok(inventory.findings.sharedFailureModes.every(row => row.consumerCount >= 2));
assert.equal(inventory.diagnostics.integrationErrorCount, inventory.integrationHealth.errorCount);
assert.ok(inventory.relations.some(row =>
    row.relation === 'questions' && row.source === 'docs/solver-research-question-relations.json'));
assert.ok(inventory.relations.some(row =>
    row.relation === 'durableEvidence' && row.authorityKind === 'derived/composed'));
assert.ok(inventory.workflows.some(row =>
    row.workflow === 'cpsat-explicit-prefix-reference.yml' &&
    row.role === 'evidence-producing' &&
    row.status === 'maintained' &&
    row.scriptEntrypoints.includes('scripts/stress/cpsat-explicit-prefix-reference.mjs')));
assert.equal(inventory.diagnostics.maintainedWorkflowCount,
    inventory.workflows.filter(row => row.status === 'maintained').length);
assert.equal(inventory.diagnostics.evidenceProducingWorkflowCount,
    inventory.workflows.filter(row => row.role === 'evidence-producing').length);
assert.equal(inventory.diagnostics.retiredWorkflowCount, inventory.retiredWorkflows.length);
assert.equal(inventory.diagnostics.retiredWorkflowReappearanceCount,
    inventory.retiredWorkflows.filter(row => row.presentOnDisk).length);
assert.equal(inventory.diagnostics.retiredWorkflowReappearanceCount, 0,
    'retired workflow ledger entries must not silently reappear on disk');
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
assert.ok(inventory.documentation.currentMarkdownReferenceCount > 0);
assert.ok(inventory.documentation.currentMarkdownBytes > 0);
assert.ok(inventory.documentation.roleCounts['canonical-current'] > 0);
assert.ok(inventory.documentation.roleCounts['dated-evidence'] > 0);
assert.ok(inventory.documentation.roleCounts['historical/archive'] > 0);
assert.equal(inventory.documentation.statusClaimCounts.currentAuthority,
    inventory.documentation.roles.filter(row => row.claimsCurrentAuthority).length);
assert.equal(inventory.documentation.statusClaimCounts.active,
    inventory.documentation.roles.filter(row => row.claimsActive).length);
assert.equal(inventory.documentation.currentAuthorityClaimOutsideIndexCount,
    inventory.documentation.currentAuthorityClaimOutsideIndexPaths.length);
assert.ok(inventory.documentation.roles.some(row => row.path === 'docs/solver-optimization-workstreams.md' && row.role === 'canonical-current'));
assert.ok(inventory.documentation.roles.some(row =>
    row.path === 'docs/solver-research-system-consolidation-and-epistemic-coverage-plan.md' &&
    row.role === 'active-execution-reference'));
assert.equal(inventory.documentation.lifecycleCandidateCount, inventory.planLifecycle.length);
assert.equal(
    inventory.documentation.currentLifecycleCandidateCount,
    inventory.planLifecycle.filter(row => row.currentReference).length,
);
assert.equal(inventory.documentation.currentReferences.some(row =>
    row.path === 'docs/solver-workflow-evidence-remediation-plan.md'), false,
    'completed remediation plan should remain navigable as history without being a current reference');
const completedHistoricalPlan = inventory.planLifecycle.find(row =>
    row.path === 'docs/solver-workflow-evidence-remediation-plan.md');
assert.equal(completedHistoricalPlan?.kind, 'plan');
assert.equal(completedHistoricalPlan?.currentReference, false);
assert.equal(completedHistoricalPlan?.appearsConcluded, true);
assert.equal(completedHistoricalPlan?.currentReferenceMismatch, false);
assert.ok(inventory.planLifecycle.some(row => row.kind === 'preflight'),
    'lifecycle inventory must cover preflights, not only *-plan.md files');
assert.ok(inventory.planLifecycle.some(row => row.kind === 'handoff'),
    'lifecycle inventory must cover handoffs, not only *-plan.md files');
assert.ok(Array.isArray(inventory.sharedImplementationDependencies));
assert.equal(inventory.diagnostics.sharedContractOwnerCount, inventory.contractOwnership.length);
assert.ok(inventory.contractOwnership.every(row => row.contractFunctions.length > 0));
assert.ok(inventory.sharedImplementationDependencies.some(row =>
    row.contractFunctions.some(name => /^(?:build|validate|assert|write|format|parse|canonicalize)/u.test(name))),
    'shared research dependencies should expose constructor/validator ownership when exported');
assert.equal(
    inventory.diagnostics.fragilePlanLifecycleCount,
    inventory.planLifecycle.filter(row => row.fragileProse).length,
);
assert.equal(
    inventory.diagnostics.unknownLifecycleDispositionCount,
    inventory.planLifecycle.filter(row => row.lifecycleDisposition === 'unknown').length,
);
assert.ok(inventory.planLifecycle.some(row =>
    row.path === 'docs/solver-research-system-consolidation-and-epistemic-coverage-plan.md' &&
    row.lifecycleDisposition === 'active-execution'));

const architectureView = researchSystemInventoryView(inventory, 'architecture');
assert.ok(Array.isArray(architectureView.relations));
assert.deepEqual(architectureView.workflows, inventory.workflows);
assert.deepEqual(architectureView.retiredWorkflows, inventory.retiredWorkflows);
assert.deepEqual(architectureView.contractOwnership, inventory.contractOwnership);
assert.equal(architectureView.integrationHealth, inventory.integrationHealth);
assert.equal('planLifecycle' in architectureView, false);
const lifecycleView = researchSystemInventoryView(inventory, 'lifecycle');
assert.ok(Array.isArray(lifecycleView.planLifecycle));
assert.equal('relations' in lifecycleView, false);
const findingsView = researchSystemInventoryView(inventory, 'findings');
assert.deepEqual(findingsView.findings, inventory.findings);
const briefInputsView = researchSystemInventoryView(inventory, 'brief-inputs');
assert.deepEqual(briefInputsView.frontDoorInputs, inventory.frontDoorInputs);
assert.equal('relations' in briefInputsView, false);
const diagnosticsView = researchSystemInventoryView(inventory, 'diagnostics');
assert.deepEqual(diagnosticsView.diagnostics, inventory.diagnostics);
assert.throws(() => researchSystemInventoryView(inventory, 'parallel-authority'), /unknown research-system inventory view/);

console.log('research-system inventory tests passed');
