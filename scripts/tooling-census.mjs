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
 * `--health` checks literal local import/export targets reachable from surfaced script entrypoints.
 * It deliberately does NOT scan every historical script/comment/fixture. This is the narrow support
 * boundary that the old broad source-reference checker lacked. The mode is observational for now;
 * it reports failures but does not make ordinary CI depend on them.
 *
 * Usage:
 *   node scripts/tooling-census.mjs
 *   node scripts/tooling-census.mjs --orphans
 *   node scripts/tooling-census.mjs --health
 *   node scripts/tooling-census.mjs --json
 *   node scripts/tooling-census.mjs --json --health --out=tmp/tooling-census.json
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = new Set(process.argv.slice(2));
const valueArg = prefix => process.argv.slice(2).find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
const JSON_MODE = argv.has('--json');
const ORPHANS_ONLY = argv.has('--orphans');
const HEALTH_MODE = argv.has('--health');
const OUT = valueArg('--out=');

const git = (...args) => execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
}).trim();

const tracked = git('ls-files').split('\n').filter(Boolean);
const trackedSet = new Set(tracked);
const scriptFiles = tracked.filter(file => file.startsWith('scripts/') && /\.(?:mjs|cjs|js|ts)$/u.test(file));
const workflowFiles = tracked.filter(file => /^\.github\/workflows\/.*\.ya?ml$/u.test(file));
const docFiles = tracked.filter(file => /(?:^|\/)(?:README|AGENTS|CLAUDE|DEVELOPER_REFERENCE)\.md$/u.test(file)
    || file.startsWith('docs/') && file.endsWith('.md'));
const historicalDoc = file => file.startsWith('docs/history/') || file.startsWith('docs/archive/');
const currentDocFiles = docFiles.filter(file => !historicalDoc(file));
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
    const currentDocRefs = docRefs.filter(ref => currentDocFiles.includes(ref));
    const historicalDocRefs = docRefs.filter(ref => historicalDoc(ref));
    const codeRefs = refs.filter(ref => scriptFiles.includes(ref));
    const changedAt = lastChanged.get(file) ?? null;
    const kind = classifyKind(file, source);
    const surfaced = aliases.length > 0 || workflowRefs.length > 0 || currentDocRefs.length > 0;
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
        currentDocRefs,
        historicalDocRefs,
        codeRefs,
        lastChanged: changedAt,
        ageDays: ageDays(changedAt),
        surfaced,
        hiddenEntrypoint,
        orphanCandidate,
    };
}).sort((a, b) => a.file.localeCompare(b.file));

const IMPORT_PATTERNS = [
    /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gu,
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/gu,
];
const CODE_EXTENSIONS = ['.mjs', '.cjs', '.js', '.ts', '.mts', '.cts'];

function literalLocalSpecifiers(source) {
    const found = new Set();
    for (const pattern of IMPORT_PATTERNS) {
        pattern.lastIndex = 0;
        for (const match of source.matchAll(pattern)) {
            const specifier = match[1];
            if (specifier.startsWith('.') || specifier.startsWith('/')) found.add(specifier);
        }
    }
    return [...found].sort();
}

function repoRelative(absolute) {
    return path.relative(ROOT, absolute).split(path.sep).join('/');
}

function resolveLocalSpecifier(importer, specifier) {
    const importerDir = path.dirname(path.join(ROOT, importer));
    const base = specifier.startsWith('/') ? path.join(ROOT, specifier.slice(1)) : path.resolve(importerDir, specifier);
    const candidates = [base];

    // TypeScript source intentionally uses .js import specifiers that resolve to .ts at build/type
    // time. Preserve that convention rather than flagging every valid TS edge as stale.
    if (base.endsWith('.js')) candidates.push(base.slice(0, -3) + '.ts');
    if (base.endsWith('.mjs')) candidates.push(base.slice(0, -4) + '.mts');
    if (!path.extname(base)) {
        for (const ext of CODE_EXTENSIONS) candidates.push(base + ext);
        for (const ext of CODE_EXTENSIONS) candidates.push(path.join(base, `index${ext}`));
        candidates.push(`${base}.json`, path.join(base, 'index.json'));
    }

    const existing = candidates.find(candidate => existsSync(candidate));
    return existing ? repoRelative(existing) : null;
}

function supportedImportHealth() {
    const supportedRoots = rows
        .filter(row => row.kind === 'entrypoint' && row.surfaced && row.lifecycle !== 'cold-research' && row.lifecycle !== 'completed-migration')
        .map(row => row.file);
    const queue = [...supportedRoots];
    const visited = new Set();
    const checkedEdges = [];
    const failures = [];

    while (queue.length) {
        const importer = queue.shift();
        if (visited.has(importer)) continue;
        visited.add(importer);
        const source = textByFile.get(importer) ?? (existsSync(path.join(ROOT, importer)) ? readFileSync(path.join(ROOT, importer), 'utf8') : '');
        for (const specifier of literalLocalSpecifiers(source)) {
            const resolved = resolveLocalSpecifier(importer, specifier);
            checkedEdges.push({ importer, specifier, resolved });
            if (!resolved) {
                failures.push({ importer, specifier });
                continue;
            }
            // Recurse through local script helpers only. Module source has its own TypeScript graph
            // checks; the support-boundary value here is proving that the script reaches that graph.
            if (resolved.startsWith('scripts/') && trackedSet.has(resolved) && /\.(?:mjs|cjs|js|ts)$/u.test(resolved)) {
                queue.push(resolved);
            }
        }
    }

    return {
        supportedRoots: supportedRoots.length,
        visitedScriptFiles: visited.size,
        checkedEdges: checkedEdges.length,
        failures,
        edges: checkedEdges,
    };
}

const health = HEALTH_MODE ? supportedImportHealth() : null;
const selected = ORPHANS_ONLY ? rows.filter(row => row.orphanCandidate) : rows;
const summary = {
    trackedScripts: rows.length,
    entrypoints: rows.filter(row => row.kind === 'entrypoint').length,
    surfacedEntrypoints: rows.filter(row => row.kind === 'entrypoint' && row.surfaced).length,
    classifiedHiddenEntrypoints: rows.filter(row => row.hiddenEntrypoint && row.lifecycle !== 'unclassified').length,
    orphanCandidates: rows.filter(row => row.orphanCandidate).length,
    ...(health ? { supportedImportFailures: health.failures.length } : {}),
};
const result = { schemaVersion: 4, generatedAt: new Date().toISOString(), summary, rows: selected, ...(health ? { health } : {}) };

if (JSON_MODE) {
    const rendered = `${JSON.stringify(result, null, 2)}\n`;
    if (OUT) writeFileSync(path.resolve(ROOT, OUT), rendered);
    else process.stdout.write(rendered);
    process.exit(0);
}

console.log(`Tooling census: ${summary.trackedScripts} tracked script files; ${summary.entrypoints} executable-looking entrypoints; ${summary.surfacedEntrypoints} surfaced; ${summary.classifiedHiddenEntrypoints} classified hidden; ${summary.orphanCandidates} orphan candidates.`);
if (health) {
    console.log(`Supported import health: ${health.supportedRoots} surfaced roots; ${health.visitedScriptFiles} script files visited; ${health.checkedEdges} literal local edges checked; ${health.failures.length} unresolved.`);
    for (const failure of health.failures) console.log(`  BROKEN ${failure.importer} -> ${failure.specifier}`);
    console.log('');
}
console.log('Legend: P=package alias, W=workflow reference, D=current-doc reference, C=script/code reference. Historical doc references are retained in JSON but do not count as D/support.');
for (const row of selected) {
    const signals = `${row.packageAliases.length ? 'P' : '-'}${row.workflowRefs.length ? 'W' : '-'}${row.currentDocRefs.length ? 'D' : '-'}${row.codeRefs.length ? 'C' : '-'}`;
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
