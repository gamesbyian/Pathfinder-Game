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

function workflowRunText(workflow) {
    const lines = workflowText(workflow).split(/\r?\n/u);
    const out = [];
    for (let i = 0; i < lines.length; i += 1) {
        const match = lines[i].match(/^(\s*)run:\s*(.*)$/u);
        if (!match) continue;
        const indent = match[1].length;
        const inline = match[2].trim();
        if (inline && inline !== '|' && inline !== '>-') out.push(inline);
        if (inline !== '|' && inline !== '>-') continue;
        for (i += 1; i < lines.length; i += 1) {
            const line = lines[i];
            if (!line.trim()) { out.push(line); continue; }
            const childIndent = line.match(/^\s*/u)?.[0].length ?? 0;
            if (childIndent <= indent) { i -= 1; break; }
            out.push(line.trim());
        }
    }
    return out.join('\n');
}

function isHintIngestionReviewCandidate(row) {
    if (row.role === 'evidence-producing') return true;
    // Some routine operational workflows still produce solver evidence rather than being classified
    // as research campaigns. Only executable run blocks count: trigger path filters mentioning a
    // publisher script are invalidation metadata, not evidence that the workflow publishes anything.
    return /\b(?:publish-solver-sweep-result\.mjs|sweep-publish\.mjs)\b/u.test(workflowRunText(row.workflow));
}

const candidateRows = maintainedRows.filter(isHintIngestionReviewCandidate);
const candidateNames = new Set(candidateRows.map(row => row.workflow));
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
    if (!maintained.has(row.workflow)) {
        issues.push(`${row.workflow}: inventory row is not maintained in solver-workflow-lifecycle.json`);
    } else if (!candidateNames.has(row.workflow)) {
        issues.push(`${row.workflow}: workflow-ingestion disposition is stale; workflow no longer meets the mechanically derived review-candidate contract`);
    }
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
