#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const inventory = JSON.parse(readFileSync(path.join(root, 'docs/hint-evidence-consolidation-inventory.json'), 'utf8'));
const lifecycle = JSON.parse(readFileSync(path.join(root, 'docs/solver-workflow-lifecycle.json'), 'utf8'));

const maintainedRows = (lifecycle.workflows ?? []).filter(row => row.status === 'maintained');
const maintained = new Set(maintainedRows.map(row => row.workflow));
const inventoryRows = Array.isArray(inventory.workflowIngestion) ? inventory.workflowIngestion : [];
const rowsByWorkflow = new Map();
for (const row of inventoryRows) {
    const list = rowsByWorkflow.get(row.workflow) ?? [];
    list.push(row);
    rowsByWorkflow.set(row.workflow, list);
}

function workflowText(workflow) {
    return readFileSync(path.join(root, '.github', 'workflows', workflow), 'utf8');
}

function isHintIngestionReviewCandidate(row) {
    if (row.role === 'evidence-producing') return true;
    // Some routine operational workflows still produce solver evidence rather than being classified
    // as research campaigns. Standard solver-sweep publication is a mechanical signal that their
    // ingestion disposition must also be reviewed rather than disappearing from the hand inventory.
    return /\b(?:publish-solver-sweep-result\.mjs|sweep-publish\.mjs)\b/u.test(workflowText(row.workflow));
}

const candidateRows = maintainedRows.filter(isHintIngestionReviewCandidate);
const dispositions = new Set([
    'central-ingestion',
    'experiment-only-no-hint-ingestion',
    'reconciliation-only-no-fresh-hint-ingestion',
    'non-hint-evidence',
    'family-direct-canonical-persistence',
]);
const issues = [];

for (const lifecycleRow of candidateRows) {
    const matches = rowsByWorkflow.get(lifecycleRow.workflow) ?? [];
    if (matches.length !== 1) {
        issues.push(`${lifecycleRow.workflow}: expected exactly one workflow-ingestion disposition, found ${matches.length}`);
        continue;
    }
    const row = matches[0];
    if (!dispositions.has(row.hintIngestionDisposition)) {
        issues.push(`${row.workflow}: unrecognized/missing hintIngestionDisposition ${JSON.stringify(row.hintIngestionDisposition)}`);
        continue;
    }

    if (row.hintIngestionDisposition === 'central-ingestion') {
        if (row.centralHarvester !== true) issues.push(`${row.workflow}: centralHarvester must be true`);
        if (!/^yes\b/u.test(String(row.artifactSufficientForFutureSemanticHint ?? ''))) {
            issues.push(`${row.workflow}: successful-discovery artifact is not marked sufficient (${JSON.stringify(row.artifactSufficientForFutureSemanticHint)})`);
        }
        if (row.partialFailureUpload !== true) {
            issues.push(`${row.workflow}: central-ingestion workflow lacks partial-failure artifact upload`);
        }
    }

    if (row.hintIngestionDisposition === 'family-direct-canonical-persistence') {
        if (row.centralHarvester === true) {
            issues.push(`${row.workflow}: family direct-persistence exception cannot also claim centralHarvester ownership`);
        }
    }
}

for (const row of inventoryRows) {
    if (!maintained.has(row.workflow)) issues.push(`${row.workflow}: inventory row is not maintained in solver-workflow-lifecycle.json`);
}

const nonCentral = inventoryRows.filter(row => row.hintIngestionDisposition !== 'central-ingestion');
assert.ok(nonCentral.length > 0, 'inventory must retain explicit reviewed exclusions rather than forcing every evidence workflow into Hint ingestion');

if (issues.length) {
    console.error('Hint-ingestion workflow completeness issues:');
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
}

console.log(
    `hint-ingestion-workflow-completeness: ${candidateRows.length} mechanically derived maintained evidence workflow(s) each have exactly one reviewed Hint-ingestion disposition`,
);
