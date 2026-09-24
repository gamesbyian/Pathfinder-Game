#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const workflowsDir = path.join(root, '.github', 'workflows');
const harvestPath = path.join(workflowsDir, 'harvest-solver-evidence.yml');

function unquote(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith("'") && trimmed.endsWith("'"))
        || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function workflowDisplayName(file) {
    const text = readFileSync(path.join(workflowsDir, file), 'utf8');
    for (const line of text.split(/\r?\n/u)) {
        const match = line.match(/^name:\s*(.+?)\s*$/u);
        if (match) return unquote(match[1]);
    }
    return null;
}

function harvestSourceNames() {
    const text = readFileSync(harvestPath, 'utf8');
    const block = text.match(/workflow_run:\s*\n\s+workflows:\s*\n((?:\s+-\s+.+\n)+)/u);
    if (!block) throw new Error('could not locate workflow_run.workflows in harvest-solver-evidence.yml');
    return block[1].split(/\r?\n/u)
        .map(line => line.match(/^\s+-\s+(.+?)\s*$/u)?.[1])
        .filter(Boolean)
        .map(unquote);
}

const actualNames = new Map();
for (const file of readdirSync(workflowsDir).filter(name => /\.ya?ml$/u.test(name))) {
    const name = workflowDisplayName(file);
    if (name) actualNames.set(name, file);
}

const sources = harvestSourceNames();
assert.ok(sources.length > 0, 'central harvester must declare at least one source workflow');
assert.equal(new Set(sources).size, sources.length, 'central harvester source workflow names must be unique');

const missing = sources.filter(name => !actualNames.has(name));
assert.deepEqual(
    missing,
    [],
    'every central-harvest workflow_run source name must match a live workflow top-level name',
);

console.log(`harvest-source-workflow-guard: ${sources.length} live source workflow name(s) verified`);
