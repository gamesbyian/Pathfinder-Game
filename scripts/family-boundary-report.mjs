#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { buildBoundaryReport, coalesceAttemptRecords, renderBoundaryMarkdown } from './family-boundary-lib.mjs';
import { normalizeRoutingRegime } from '../modules/solver/routing-regime-normalization.mjs';

// Corpora on disk carry a mix of legacy stressMeta.archetype/navDensity and canonical
// stressMeta.routingRegime/requiredPathCoverageRatio -- dual-read both directions.
// normalizeRoutingRegime() throws on an unrecognized value; fall back to the raw string rather
// than crashing this read-only report over arbitrary/historical corpora.
function safeNormalizeRoutingRegime(value) {
    if (value == null) return null;
    try { return normalizeRoutingRegime(value); } catch { return value; }
}

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
const required = ['--manifests', '--canonical', '--variants'];
if (required.some(key => !args.get(key))) {
    console.error('Usage: family-boundary-report.mjs --manifests=<json[,json]> --canonical=<baseline.json> ' +
        '--variants=<json[,json]> [--parent-levels=<json[,json]>] [--profile-joins=<json>] ' +
        '[--relation=<mode>] [--parent=<id>] [--routing-regime=<regime>] ' +
        '[--required-path-coverage-ratio-min=N] [--required-path-coverage-ratio-max=N] ' +
        '[--out=<json>] [--markdown=<md>] [--severe-work-ratio=10]\n' +
        '  --routing-regime=<regime> filters on the canonical routing-regime classification (--archetype ' +
        'accepted as a legacy alias for one migration window).\n' +
        '  --required-path-coverage-ratio-min/max filters on the canonical coverage-ratio field ' +
        '(--nav-density-min/max accepted as a legacy alias for one migration window).');
    process.exit(2);
}

const load = async file => ({ file, document: JSON.parse(await readFile(file, 'utf8')) });
const loadAll = spec => Promise.all(spec.split(',').map(value => value.trim()).filter(Boolean).map(load));
const extract = (documents, keys, { standalone = false } = {}) => documents.flatMap(({ document }) => {
    if (Array.isArray(document)) return document;
    if (standalone && document?.familyId && Array.isArray(document.variants)) return [document];
    const key = keys.find(candidate => Array.isArray(document?.[candidate]));
    return key ? document[key] : [];
});

const manifestDocuments = await loadAll(args.get('--manifests'));
const canonicalDocuments = await loadAll(args.get('--canonical'));
const variantDocuments = await loadAll(args.get('--variants'));
let manifests = extract(manifestDocuments, ['manifests', 'families'], { standalone: true });

const parentLevelDocuments = args.get('--parent-levels') ? await loadAll(args.get('--parent-levels')) : [];
const parentLevels = extract(parentLevelDocuments, ['levels']);
const parentById = new Map(parentLevels.map(level => [String(level.id), level]));
manifests = manifests.map(manifest => {
    const level = parentById.get(String(manifest.parentLevelId ?? manifest.parentId));
    if (!level) return manifest;
    return {
        ...manifest,
        parentFeatures: {
            reqInt: level.reqInt ?? manifest.selectedWitnessIntersectionCount ?? null,
            requiredPathCoverageRatio: level.stressMeta?.requiredPathCoverageRatio ?? level.stressMeta?.navDensity ?? manifest.parentNavDensity ?? null,
            turnLoad: level.stressMeta?.turnLoad ?? null,
            routingRegime: safeNormalizeRoutingRegime(level.stressMeta?.routingRegime ?? level.stressMeta?.archetype ?? null),
            portalCount: Array.isArray(level.portals) ? level.portals.length : 0,
            mechanicCounts: level.stressMeta?.mechanicCounts ?? null,
        },
    };
});

if (args.get('--relation')) manifests = manifests.filter(manifest => (manifest.familyMode ?? manifest.relation) === args.get('--relation'));
if (args.get('--parent')) manifests = manifests.filter(manifest => String(manifest.parentLevelId ?? manifest.parentId) === args.get('--parent'));

const numericFilters = [
    ['--req-int-min', 'reqInt', (value, threshold) => value >= threshold],
    ['--req-int-max', 'reqInt', (value, threshold) => value <= threshold],
    // --required-path-coverage-ratio-min/max is canonical; --nav-density-min/max is accepted as a
    // legacy alias for one migration window and filters the same field.
    ['--required-path-coverage-ratio-min', 'requiredPathCoverageRatio', (value, threshold) => value >= threshold],
    ['--required-path-coverage-ratio-max', 'requiredPathCoverageRatio', (value, threshold) => value <= threshold],
    ['--nav-density-min', 'requiredPathCoverageRatio', (value, threshold) => value >= threshold],
    ['--nav-density-max', 'requiredPathCoverageRatio', (value, threshold) => value <= threshold],
    ['--portal-count-min', 'portalCount', (value, threshold) => value >= threshold],
    ['--portal-count-max', 'portalCount', (value, threshold) => value <= threshold],
    ['--turn-load-min', 'turnLoad', (value, threshold) => value >= threshold],
    ['--turn-load-max', 'turnLoad', (value, threshold) => value <= threshold],
];
for (const [flag, field, accept] of numericFilters) {
    if (!args.has(flag)) continue;
    const threshold = Number(args.get(flag));
    if (!Number.isFinite(threshold)) throw new Error(`${flag} must be numeric`);
    manifests = manifests.filter(manifest => {
        const value = manifest.parentFeatures?.[field];
        return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && accept(Number(value), threshold);
    });
}
// --archetype remains a documented legacy input alias for one migration window; both write to the
// canonical parentFeatures.routingRegime filter. Fail loudly rather than silently pick one if a
// caller somehow supplies both with different values.
if (args.has('--routing-regime') && args.has('--archetype') && args.get('--routing-regime') !== args.get('--archetype')) {
    throw new Error(`--routing-regime and --archetype disagree ("${args.get('--routing-regime')}" vs "${args.get('--archetype')}"); pass only one`);
}
const routingRegimeArg = args.get('--routing-regime') ?? args.get('--archetype');
if (routingRegimeArg) {
    const wanted = safeNormalizeRoutingRegime(routingRegimeArg);
    manifests = manifests.filter(manifest => manifest.parentFeatures?.routingRegime === wanted);
}
if (args.get('--mechanic')) {
    const [name, minimumRaw] = args.get('--mechanic').split(':');
    const minimum = minimumRaw === undefined ? 1 : Number(minimumRaw);
    if (!name || !Number.isFinite(minimum)) throw new Error('--mechanic must be name or name:minCount');
    manifests = manifests.filter(manifest => Number(manifest.parentFeatures?.mechanicCounts?.[name] ?? 0) >= minimum);
}

const canonicalResults = extract(canonicalDocuments, ['levels', 'results']);
const variantResults = variantDocuments.flatMap(({ document }) => {
    if (Array.isArray(document)) return document;
    if (Array.isArray(document?.levels)) return document.levels;
    if (Array.isArray(document?.results)) return document.results;
    if (!Array.isArray(document?.attempts)) return [];
    const alreadyAggregated = document.attempts.some(row => Array.isArray(row?.attempts) || row?.winningConfig !== undefined);
    return alreadyAggregated ? document.attempts : coalesceAttemptRecords(document.attempts);
});
const sourceMetadata = documents => documents.map(({ file, document }) => ({
    file,
    commit: document.commit ?? document.commitSha ?? null,
    generatedAt: document.generatedAt ?? document.compiledAt ?? null,
    budgetMs: document.budgetMs ?? document.summary?.budgetMs ?? null,
    workBudget: document.workBudget ?? document.summary?.workBudget ?? null,
    sources: document.sources ?? null,
}));
const profileDocuments = args.get('--profile-joins') ? await loadAll(args.get('--profile-joins')) : [];
const solutionProfileJoins = extract(profileDocuments, ['joins', 'comparisons']);
const filterMetadata = Object.fromEntries([...args].filter(([key]) => key === '--relation' || key === '--parent' ||
    numericFilters.some(([flag]) => flag === key) || key === '--routing-regime' || key === '--archetype' || key === '--mechanic'));

const report = buildBoundaryReport({
    manifests,
    canonicalResults,
    variantResults,
    solutionProfileJoins,
    metadata: {
        filters: filterMetadata,
        inputs: {
            manifests: sourceMetadata(manifestDocuments),
            canonical: sourceMetadata(canonicalDocuments),
            variants: sourceMetadata(variantDocuments),
            parentLevels: sourceMetadata(parentLevelDocuments),
            profileJoins: sourceMetadata(profileDocuments),
        },
    },
    thresholds: {
        severeWorkRatio: args.get('--severe-work-ratio'),
        configConcentration: args.get('--config-concentration'),
        minFragileSolveRate: args.get('--min-fragile-solve-rate'),
    },
});
const outputFile = args.get('--out') || 'reports/families/family-boundary-latest.json';
const markdownFile = args.get('--markdown') || outputFile.replace(/\.json$/, '.md');
await mkdir(path.dirname(outputFile), { recursive: true });
await mkdir(path.dirname(markdownFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`);
await writeFile(markdownFile, renderBoundaryMarkdown(report));
console.log(`Joined ${report.families.length} families without solving levels.\nJSON -> ${outputFile}\nMarkdown -> ${markdownFile}`);
