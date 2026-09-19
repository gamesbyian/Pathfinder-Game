import assert from 'node:assert/strict';

import { buildResearchSystemInventory } from './research-system-inventory-lib.mjs';

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
assert.ok(Array.isArray(inventory.sharedImplementationDependencies));
assert.equal(
    inventory.diagnostics.fragilePlanLifecycleCount,
    inventory.planLifecycle.filter(row => row.fragileProse).length,
);

console.log('research-system inventory tests passed');
