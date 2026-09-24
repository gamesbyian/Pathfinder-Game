#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { CANONICAL_TRACKED_HINT_STORE_DIRS } from './hint-store-roots.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const lifecycle = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/solver-workflow-lifecycle.json'), 'utf8'));
const exceptionLedger = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/hint-workflow-persistence-audit.json'), 'utf8'));
const maintained = new Set((lifecycle.workflows ?? []).filter(row => row.status === 'maintained').map(row => row.workflow));
const exceptions = new Map((exceptionLedger.entries ?? []).map(entry => [entry.workflow, entry]));

function executableLines(text) {
    return text.split(/\r?\n/u)
        .map(line => line.replace(/\s+#.*$/u, ''))
        .filter(line => line.trim() && !line.trimStart().startsWith('#'))
        .join('\n');
}

function normalizeScopeToken(token) {
    return token.trim()
        .replace(/^['"]|['"]$/gu, '')
        .replace(/^\.\//u, '')
        .replaceAll('\\', '/');
}

function commandStageScopes(line) {
    const match = line.match(/\bgit\s+(?:add|status)\b([^\n]*)/u);
    if (!match) return [];
    return match[1].trim().split(/\s+/u)
        .map(normalizeScopeToken)
        .filter(token => token && !token.startsWith('-') && !token.includes('$'));
}

function scopeTouchesCanonicalHintStore(scope) {
    const clean = scope.replace(/\*.*$/u, '');
    if (!clean) return false;
    const normalized = clean.endsWith('/') ? clean : clean + (clean.includes('.') ? '' : '/');
    return CANONICAL_TRACKED_HINT_STORE_DIRS.some(dir =>
        dir === clean
        || dir.startsWith(normalized)
        || clean.startsWith(dir + '/'));
}

function scopeAllowedByException(scope, entry) {
    const allowed = Array.isArray(entry?.allowedStagePrefixes) ? entry.allowedStagePrefixes : [];
    return allowed.some(prefix => scope.startsWith(prefix) || prefix.startsWith(scope.endsWith('/') ? scope : scope + '/'));
}

function persistenceIssues(workflow, rawText) {
    const text = executableLines(rawText);
    const issues = [];
    const exception = exceptions.get(workflow) ?? null;
    if (/--save-hints\b/u.test(text)) {
        issues.push(`${workflow}: --save-hints bypasses canonical harvest ownership`);
    }
    for (const line of text.split('\n')) {
        if (!/\bgit\s+(?:add|status)\b/u.test(line)) continue;
        for (const scope of commandStageScopes(line)) {
            if (!scopeTouchesCanonicalHintStore(scope)) continue;
            if (scopeAllowedByException(scope, exception)) continue;
            issues.push(`${workflow}: direct Hint staging scope ${scope} bypasses canonical harvest ownership`);
        }
    }
    return issues;
}

for (const [workflow, entry] of exceptions) {
    if (!maintained.has(workflow)) {
        throw new Error(`${workflow}: Hint persistence exception does not name a maintained workflow`);
    }
    if (!Array.isArray(entry.allowedStagePrefixes) || entry.allowedStagePrefixes.length === 0) {
        throw new Error(`${workflow}: Hint persistence exception has no allowed staging scope`);
    }
    for (const scope of entry.allowedStagePrefixes) {
        if (!scopeTouchesCanonicalHintStore(scope)) {
            throw new Error(`${workflow}: exception scope ${scope} does not cover a canonical Hint store`);
        }
    }
}

// Adversarial fixtures exercise every canonical store, an ancestor-directory stage, and the one
// reviewed family-workflow exception. This prevents the guard from regressing to literal-store-only
// matching if canonical layout changes again.
for (const dir of CANONICAL_TRACKED_HINT_STORE_DIRS) {
    const fixture = `steps:\n  - run: git add ${dir}/fixture.json\n  - run: git status --short ${dir}/\n`;
    const found = persistenceIssues('fixture.yml', fixture);
    if (found.length !== 2) {
        throw new Error(`central Hint persistence guard self-test missed ${dir}: ${JSON.stringify(found)}`);
    }
}
if (persistenceIssues('fixture.yml', '- run: git add data/families/').length !== 1) {
    throw new Error('central Hint persistence guard self-test missed ancestor staging of family Hint stores');
}
if (persistenceIssues('collect-variant-family-dataset.yml', '- run: git add data/families/').length !== 0) {
    throw new Error('reviewed family workflow persistence exception is not honored');
}
if (persistenceIssues('collect-variant-family-dataset.yml', '- run: git add data/stress/').length !== 1) {
    throw new Error('family workflow persistence exception escaped its allowed family scope');
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
console.log(`central-hint-persistence-guard: ${checked.length} maintained non-harvester workflow(s) respect canonical Hint persistence ownership`);
