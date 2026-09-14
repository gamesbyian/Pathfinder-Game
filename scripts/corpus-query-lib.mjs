import { readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizeRoutingRegime } from '../modules/solver/routing-regime-normalization.mjs';
import { classifyCorpusSelectionLineage } from './corpus-selection-lineage.mjs';

// Corpora on disk carry a mix of legacy stressMeta.archetype/navDensity (older generated levels)
// and canonical stressMeta.routingRegime/requiredPathCoverageRatio (scripts/stress/generate.mjs's
// current output) -- dual-read both directions so this query tool works over either vintage.
// normalizeRoutingRegime() throws on a value it doesn't recognize; fall back to the raw string
// rather than crashing the query, since this is read-only display tooling over arbitrary corpora.
function safeNormalizeRoutingRegime(value) {
    if (value == null) return null;
    try { return normalizeRoutingRegime(value); } catch { return value; }
}

export const CORPUS_ALIASES = Object.freeze({
    published: 'data/levels.json',
    stress1: 'data/stress/stress-levels.json',
    corpus1: 'data/stress/stress-levels.json',
    stress2: 'data/stress/stress-levels-random.json',
    corpus2: 'data/stress/stress-levels-random.json',
    envelope: 'data/stress/stress-levels-envelope.json',
});

export function loadCorpus(root, source = 'stress2') {
    const relativePath = CORPUS_ALIASES[source] ?? source;
    const raw = JSON.parse(readFileSync(path.resolve(root, relativePath), 'utf8'));
    const levels = Array.isArray(raw) ? raw : raw.levels;
    if (!Array.isArray(levels)) throw new Error(`No levels array in ${relativePath}`);
    return { source, path: relativePath, levels, metadata: Array.isArray(raw) ? null : raw };
}

const count = (level, key) => Array.isArray(level[key]) ? level[key].length : 0;

function provenanceDescriptor(level) {
    const provenance = level.provenance ?? {};
    const history = Array.isArray(provenance.history) ? provenance.history : [];
    const values = key => [...new Set(history.map(event => event?.detail?.[key]).filter(value => value != null && value !== ''))];
    const methods = [...new Set(history.map(event => event?.method).filter(Boolean))];
    const actions = [...new Set(history.map(event => event?.action).filter(Boolean))];
    return {
        origin: provenance.origin ?? null,
        methods,
        actions,
        generatorVersions: values('generatorVersion'),
        corpusNames: values('corpusName'),
        historyEvents: history.length,
    };
}

export function describeLevel(level, context = {}) {
    const counts = {
        gates: count(level, 'gates'), falseGoals: count(level, 'falseGoals'), blocks: count(level, 'blocks'),
        mustPass: count(level, 'mustPass'), mustCross: count(level, 'mustCross'), filters: count(level, 'filters'),
        flippers: count(level, 'flippingFilters'), portals: count(level, 'portals'), geese: count(level, 'geese'),
        landmarks: count(level, 'landmarks'),
    };
    const area = (level.grid?.w ?? 0) * (level.grid?.h ?? 0);
    const objects = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const meta = level.stressMeta ?? {};
    const selectionLineage = classifyCorpusSelectionLineage(
        context.source,
        level,
        context.metadata ?? null,
        { position: context.position, totalLevels: context.totalLevels },
    );
    return {
        id: level.id,
        grid: [level.grid?.w ?? null, level.grid?.h ?? null],
        req: [level.reqLen ?? null, level.reqInt ?? null],
        counts,
        objectDensity: area ? Number((objects / area).toFixed(4)) : null,
        tags: meta.featureTags ?? [],
        batch: meta.generationBatch ?? null,
        routingRegime: safeNormalizeRoutingRegime(meta.routingRegime ?? meta.archetype ?? null),
        requiredPathCoverageRatio: meta.requiredPathCoverageRatio ?? meta.navDensity ?? null,
        predictedChallenge: meta.predictedSolverChallenge ?? null,
        provenance: provenanceDescriptor(level),
        selectionLineage,
    };
}

function hasMechanic(item, mechanic) {
    const key = mechanic.toLowerCase();
    if (item.tags.some(tag => tag.toLowerCase().includes(key))) return true;
    if (item.routingRegime?.toLowerCase().includes(key)) return true;
    return Object.entries(item.counts).some(([name, value]) => value > 0 && name.toLowerCase().includes(key));
}

function containsInsensitive(values, wanted) {
    if (!wanted) return true;
    const needle = wanted.toLowerCase();
    return values.some(value => String(value).toLowerCase().includes(needle));
}

export function filterLevelDescriptors(items, filters = {}) {
    const ids = filters.ids?.length ? new Set(filters.ids) : null;
    const tag = filters.tag?.toLowerCase();
    return items.filter(item =>
        (!ids || ids.has(item.id)) &&
        (filters.minReqLen == null || item.req[0] >= filters.minReqLen) &&
        (filters.maxReqLen == null || item.req[0] <= filters.maxReqLen) &&
        (filters.minReqInt == null || item.req[1] >= filters.minReqInt) &&
        (filters.maxReqInt == null || item.req[1] <= filters.maxReqInt) &&
        (!tag || item.tags.some(value => value.toLowerCase().includes(tag))) &&
        (!filters.mechanic || hasMechanic(item, filters.mechanic)) &&
        (!filters.batch || String(item.batch ?? '').toLowerCase() === String(filters.batch).toLowerCase()) &&
        (!filters.origin || String(item.provenance.origin ?? '').toLowerCase() === String(filters.origin).toLowerCase()) &&
        (!filters.selectionStratum || String(item.selectionLineage?.stratum ?? '').toLowerCase() === String(filters.selectionStratum).toLowerCase()) &&
        containsInsensitive(item.provenance.methods, filters.method) &&
        containsInsensitive(item.provenance.actions, filters.action) &&
        containsInsensitive(item.provenance.generatorVersions, filters.generatorVersion) &&
        containsInsensitive(item.provenance.corpusNames, filters.corpusName));
}

function hash(text) {
    let value = 2166136261;
    for (const char of text) { value ^= char.charCodeAt(0); value = Math.imul(value, 16777619); }
    return value >>> 0;
}

export function deterministicSample(items, size, seed = 'pathfinder') {
    if (!Number.isFinite(size) || size <= 0 || size >= items.length) return [...items];
    return [...items].sort((a, b) => hash(`${seed}:${a.id}`) - hash(`${seed}:${b.id}`)).slice(0, size);
}

export function summarizeDescriptors(items) {
    const numeric = values => {
        const clean = values.filter(Number.isFinite);
        if (!clean.length) return null;
        const sum = clean.reduce((a, b) => a + b, 0);
        return { min: Math.min(...clean), max: Math.max(...clean), mean: Number((sum / clean.length).toFixed(3)) };
    };
    const categorical = values => {
        const out = {};
        for (const value of values) {
            const key = value == null || value === '' ? '(missing)' : String(value);
            out[key] = (out[key] ?? 0) + 1;
        }
        return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
    };
    const flatten = arrays => arrays.flatMap(values => values.length ? values : ['(missing)']);
    const mechanics = {};
    for (const item of items) for (const [name, value] of Object.entries(item.counts)) if (value > 0) mechanics[name] = (mechanics[name] ?? 0) + 1;
    return {
        levels: items.length,
        reqLen: numeric(items.map(item => item.req[0])),
        reqInt: numeric(items.map(item => item.req[1])),
        area: numeric(items.map(item => item.grid[0] * item.grid[1])),
        objectDensity: numeric(items.map(item => item.objectDensity)),
        mechanics,
        evidenceAncestry: {
            origins: categorical(items.map(item => item.provenance.origin)),
            methods: categorical(flatten(items.map(item => item.provenance.methods))),
            generatorVersions: categorical(flatten(items.map(item => item.provenance.generatorVersions))),
            corpusNames: categorical(flatten(items.map(item => item.provenance.corpusNames))),
            generationBatches: categorical(items.map(item => item.batch)),
            selectionStrata: categorical(items.map(item => item.selectionLineage?.stratum)),
            historicalOutcomeConditioning: categorical(items.map(item => item.selectionLineage?.historicalOutcomeConditioning)),
        },
    };
}
