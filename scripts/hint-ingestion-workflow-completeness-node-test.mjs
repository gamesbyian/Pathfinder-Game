#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const inventory = JSON.parse(readFileSync(path.join(root, 'docs/hint-evidence-consolidation-inventory.json'), 'utf8'));
const lifecycle = JSON.parse(readFileSync(path.join(root, 'docs/solver-workflow-lifecycle.json'), 'utf8'));

const maintained = new Set((lifecycle.workflows ?? [])
    .filter(row => row.status === 'maintained')
    .map(row => row.workflow));

const rows = Array.isArray(inventory.workflowIngestion) ? inventory.workflowIngestion : [];
const centralTargets = rows.filter(row => {
    const target = String(row.migrationTarget ?? row.target ?? '').toLowerCase();
    return target.includes('central ingestion') || target.includes('dual-path parity');
});

const issues = [];
for (const row of centralTargets) {
    if (!maintained.has(row.workflow)) issues.push(`${row.workflow}: not maintained in solver-workflow-lifecycle.json`);
    if (row.centralHarvester !== true) issues.push(`${row.workflow}: centralHarvester must be true`);
    if (!/^yes\b/u.test(String(row.artifactSufficientForFutureSemanticHint ?? ''))) {
        issues.push(`${row.workflow}: successful-discovery artifact is not marked sufficient (${JSON.stringify(row.artifactSufficientForFutureSemanticHint)})`);
    }
    if (row.partialFailureUpload !== true && row.workflow !== 'solver-diagnostics.yml') {
        issues.push(`${row.workflow}: central-ingestion workflow lacks partial-failure artifact upload`);
    }
}

const experimentOnly = rows.filter(row => /experiment-only|reconciliation-only/u.test(String(row.migrationTarget ?? row.target ?? '')));
assert.ok(experimentOnly.length > 0, 'inventory should retain explicit non-hint experiment/reconciliation workflows instead of forcing them through hint ingestion');

if (issues.length) {
    console.error('Hint-ingestion workflow completeness issues:');
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
}

console.log(`hint-ingestion-workflow-completeness: ${centralTargets.length} central-ingestion workflow(s) have maintained ownership and sufficient discovery artifacts`);
