#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_TRACKED_HINT_STORE_DIRS } from './hint-store-roots.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const lifecycle = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/solver-workflow-lifecycle.json'), 'utf8'));
const maintained = new Set((lifecycle.workflows ?? []).filter(row => row.status === 'maintained').map(row => row.workflow));

function executableLines(text) {
    return text.split(/\r?\n/u)
        .map(line => line.replace(/\s+#.*$/u, ''))
        .filter(line => line.trim() && !line.trimStart().startsWith('#'))
        .join('\n');
}

function hasCanonicalHintStorePath(text) {
    return CANONICAL_TRACKED_HINT_STORE_DIRS.some(dir => text.includes(dir));
}

function persistenceIssues(workflow, rawText) {
    const text = executableLines(rawText);
    const issues = [];
    if (/--save-hints\b/u.test(text)) {
        issues.push(`${workflow}: --save-hints bypasses canonical harvest ownership`);
    }
    for (const line of text.split('\n')) {
        if (/git\s+add\b/u.test(line) && hasCanonicalHintStorePath(line)) {
            issues.push(`${workflow}: direct Hint git add bypasses canonical harvest ownership`);
        }
        if (/git\s+status\b/u.test(line) && hasCanonicalHintStorePath(line)) {
            issues.push(`${workflow}: direct Hint changed-file staging bypasses canonical harvest ownership`);
        }
    }
    return issues;
}

// Adversarial detector fixtures run on every invocation. The canonical store authority has already
// expanded once during this program; every store in that authority must remain protected without
// adding another hand-maintained regex here.
for (const dir of CANONICAL_TRACKED_HINT_STORE_DIRS) {
    const fixture = `steps:\n  - run: git add ${dir}/fixture.json\n  - run: git status --short ${dir}/\n`;
    const found = persistenceIssues('fixture.yml', fixture);
    if (found.length !== 2) {
        throw new Error(`central Hint persistence guard self-test missed ${dir}: ${JSON.stringify(found)}`);
    }
}
if (persistenceIssues('fixture.yml', '# git add data/hints/P00001.json\n- run: echo ok').length !== 0) {
    throw new Error('central Hint persistence guard self-test treated a comment as executable');
}

const issues = [];
const checked = [];
for (const workflow of maintained) {
    if (workflow === 'harvest-solver-evidence.yml') continue;
    const file = path.join(ROOT, '.github', 'workflows', workflow);
    issues.push(...persistenceIssues(workflow, fs.readFileSync(file, 'utf8')));
    checked.push(workflow);
}
if (issues.length) {
    console.error('Central Hint persistence ownership violations:');
    for (const issue of issues) console.error('  - ' + issue);
    process.exit(1);
}
console.log(`central-hint-persistence-guard: ${checked.length} maintained non-harvester workflow(s) have no direct Hint persistence`);
