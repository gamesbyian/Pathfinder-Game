#!/usr/bin/env node
/**
 * Inventory executable-looking local tooling and report how discoverable it is.
 *
 * This is intentionally observational and non-blocking. A tool can be healthy and useful while
 * absent from package.json, CI, or current docs; the point is to make that shadow population
 * visible for periodic lifecycle review rather than silently treating "not indexed" as "dead".
 * Known completed/specialist exceptions live in tooling-lifecycle.json so they remain discoverable
 * without repeatedly appearing as unexplained orphan candidates.
 *
 * Usage:
 *   node scripts/tooling-census.mjs
 *   node scripts/tooling-census.mjs --orphans
 *   node scripts/tooling-census.mjs --json
 *   node scripts/tooling-census.mjs --json --out=tmp/tooling-census.json
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = new Set(process.argv.slice(2));
const valueArg = prefix => process.argv.slice(2).find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
const JSON_MODE = argv.has('--json');
const ORPHANS_ONLY = argv.has('--orphans');
const OUT = valueArg('--out=');

const git = (...args) => execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
}).trim();

const tracked = git('ls-files').split('\n').filter(Boolean);
const scriptFiles = tracked.filter(file => file.startsWith('scripts/') && /\.(?:mjs|cjs|js|ts)$/u.test(file));
const workflowFiles = tracked.filter(file => /^\.github\/workflows\/.*\.ya?ml$/u.test(file));
const docFiles = tracked.filter(file => /(?:^|\/)(?:README|AGENTS|CLAUDE|DEVELOPER_REFERENCE)\.md$/u.test(file)
    || file.startsWith('docs/') && file.endsWith('.md'));
const searchableFiles = [...new Set([
    ...scriptFiles,
    ...workflowFiles,
    ...docFiles,
    ...tracked.filter(file => /^(?:package\.json|vite\.config\.[^/]+|vitest\.config\.[^/]+|playwright\.config\.[^/]+)$/u.test(file)),
])];

const textByFile = new Map();
for (const file of searchableFiles) {
    try {
        textByFile.set(file, readFileSync(path.join(ROOT, file), 'utf8'));
    } catch {
        // A tracked path can disappear in a dirty worktree. The census reports current working-tree
        // observability, so an unreadable file simply contributes no references.
    }
}

const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const packageScripts = Object.entries(packageJson.scripts ?? {});
const packageText = JSON.stringify(packageJson.scripts ?? {});
const workflowText = workflowFiles.map(file => textByFile.get(file) ?? '').join('\n');
const lifecyclePath = path.join(ROOT, 'scripts', 'tooling-lifecycle.json');
const lifecycle = JSON.parse(readFileSync(lifecyclePath, 'utf8')).entries ?? {};

function newestCommitDates() {
    const raw = git('log', '--format=@@%cI', '--name-only', '--', 'scripts', '.github/workflows');
    const result = new Map();
    let date = null;
    for (const line of raw.split('\n')) {
        if (line.startsWith('@@')) {
            date = line.slice(2);
            continue;
        }
        const file = line.trim();
        if (date && file && !result.has(file)) result.set(file, date);
    }
    return result;
}
const lastChanged = newestCommitDates();

function directPackageAliases(file) {
    return packageScripts
        .filter(([, command]) => command.includes(file))
        .map(([name]) => name)
        .sort();
}

function referenceFiles(file) {
    const base = path.basename(file);
    const references = [];
    for (const [candidate, text] of textByFile) {
        if (candidate === file) continue;
        if (text.includes(file) || text.includes(base)) references.push(candidate);
    }
    return references.sort();
}

function classifyKind(file, source) {
    const base = path.basename(file);
    if (/\b(?:node-test|unit-tests?|test)\b/iu.test(base)) return 'test';
    if (/\b(?:lib|shared|types?|config|key|io)\b/iu.test(base) && !source.startsWith('#!')) return 'helper';
    if (source.startsWith('#!')) return 'entrypoint';
    if (packageText.includes(file) || workflowText.includes(file)) return 'entrypoint';
    return 'helper';
}

function ageDays(iso) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

const rows = scriptFiles.map(file => {
    const source = textByFile.get(file) ?? '';
    const aliases = directPackageAliases(file);
    const refs = referenceFiles(file);
    const workflowRefs = refs.filter(ref => workflowFiles.includes(ref));
    const docRefs = refs.filter(ref => docFiles.includes(ref));
    const codeRefs = refs.filter(ref => scriptFiles.includes(ref));
    const changedAt = lastChanged.get(file) ?? null;
    const kind = classifyKind(file, source);
    const surfaced = aliases.length > 0 || workflowRefs.length > 0 || docRefs.length > 0;
    const lifecycleInfo = lifecycle[file] ?? { lifecycle: 'unclassified', note: null };
    const hiddenEntrypoint = kind === 'entrypoint' && !surfaced && codeRefs.length === 0;
    const orphanCandidate = hiddenEntrypoint && lifecycleInfo.lifecycle === 'unclassified';
    return {
        file,
        kind,
        lifecycle: lifecycleInfo.lifecycle,
        lifecycleNote: lifecycleInfo.note ?? null,
        packageAliases: aliases,
        workflowRefs,
        docRefs,
        codeRefs,
        lastChanged: changedAt,
        ageDays: ageDays(changedAt),
        surfaced,
        hiddenEntrypoint,
        orphanCandidate,
    };
}).sort((a, b) => a.file.localeCompare(b.file));

const selected = ORPHANS_ONLY ? rows.filter(row => row.orphanCandidate) : rows;
const summary = {
    trackedScripts: rows.length,
    entrypoints: rows.filter(row => row.kind === 'entrypoint').length,
    surfacedEntrypoints: rows.filter(row => row.kind === 'entrypoint' && row.surfaced).length,
    classifiedHiddenEntrypoints: rows.filter(row => row.hiddenEntrypoint && row.lifecycle !== 'unclassified').length,
    orphanCandidates: rows.filter(row => row.orphanCandidate).length,
};
const result = { schemaVersion: 2, generatedAt: new Date().toISOString(), summary, rows: selected };

if (JSON_MODE) {
    const rendered = `${JSON.stringify(result, null, 2)}\n`;
    if (OUT) writeFileSync(path.resolve(ROOT, OUT), rendered);
    else process.stdout.write(rendered);
    process.exit(0);
}

console.log(`Tooling census: ${summary.trackedScripts} tracked script files; ${summary.entrypoints} executable-looking entrypoints; ${summary.surfacedEntrypoints} surfaced; ${summary.classifiedHiddenEntrypoints} classified hidden; ${summary.orphanCandidates} orphan candidates.`);
console.log('');
console.log('Legend: P=package alias, W=workflow reference, D=current-doc reference, C=script/code reference.');
for (const row of selected) {
    const signals = `${row.packageAliases.length ? 'P' : '-'}${row.workflowRefs.length ? 'W' : '-'}${row.docRefs.length ? 'D' : '-'}${row.codeRefs.length ? 'C' : '-'}`;
    const age = row.ageDays == null ? '?' : `${row.ageDays}d`;
    const lifecycleLabel = row.lifecycle === 'unclassified' ? '' : ` [${row.lifecycle}]`;
    const marker = row.orphanCandidate ? ' ORPHAN?' : '';
    console.log(`${signals} ${row.kind.padEnd(10)} ${age.padStart(5)}  ${row.file}${lifecycleLabel}${marker}`);
}

if (!ORPHANS_ONLY && summary.orphanCandidates) {
    console.log(`\nReview candidates only: node scripts/tooling-census.mjs --orphans`);
}
if (OUT && !JSON_MODE) {
    console.error('--out is only supported with --json');
    process.exitCode = 2;
}
