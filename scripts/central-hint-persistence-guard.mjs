#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const inventory = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/hint-evidence-consolidation-inventory.json'), 'utf8'));
const lifecycle = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/solver-workflow-lifecycle.json'), 'utf8'));
const maintained = new Set((lifecycle.workflows ?? []).filter(row => row.status === 'maintained').map(row => row.workflow));

function executableLines(text) {
    return text.split(/\r?\n/u)
        .map(line => line.replace(/\s+#.*$/u, ''))
        .filter(line => line.trim() && !line.trimStart().startsWith('#'))
        .join('\n');
}

const issues = [];
const checked = [];
for (const workflow of maintained) {
    if (workflow === 'harvest-solver-evidence.yml') continue;
    const file = path.join(ROOT, '.github', 'workflows', workflow);
    const text = executableLines(fs.readFileSync(file, 'utf8'));
    checked.push(workflow);
    const forbidden = [
        ['--save-hints', /--save-hints\b/u],
        ['direct Hint git add', /git\s+add[^\n]*(?:data\/hints|data\/stress\/hints)/u],
        ['direct Hint changed-file staging', /git\s+status[^\n]*(?:data\/hints|data\/stress\/hints)/u],
    ];
    for (const [label, re] of forbidden) {
        if (re.test(text)) issues.push(`${workflow}: ${label} bypasses canonical harvest ownership`);
    }
}
if (issues.length) {
    console.error('Central Hint persistence ownership violations:');
    for (const issue of issues) console.error('  - ' + issue);
    process.exit(1);
}
console.log(`central-hint-persistence-guard: ${checked.length} maintained non-harvester workflow(s) have no direct Hint persistence`);
