import { hintProvenanceClasses, summarizeProvenanceClasses } from './stress/provenance-classes.mjs';
import { classifyProvenanceSource, sourcesForHint } from './stress/solution-profile-lib.mjs';

const sortedCounts = values => Object.fromEntries([...values.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))));

function addCount(map, value) {
    if (value === null || value === undefined || value === '') return;
    map.set(String(value), (map.get(String(value)) ?? 0) + 1);
}

function numericSummary(values) {
    const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!xs.length) return null;
    const mid = Math.floor(xs.length / 2);
    const median = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
    return { count: xs.length, min: xs[0], median, max: xs[xs.length - 1] };
}

export function summarizeHintRecords(hints, { standard = 'strict' } = {}) {
    const classes = summarizeProvenanceClasses(hints, { standard });
    const hintSources = new Map();
    const entrySources = new Map();
    const solverIds = new Map();
    const techniques = new Map();
    const retryTiers = new Map();
    const workSpent = [];
    const nodesExpanded = [];
    const elapsedMs = [];

    for (const hint of hints) {
        for (const source of sourcesForHint(hint)) addCount(hintSources, source);
        for (const entry of hint?.provenance ?? []) {
            addCount(entrySources, classifyProvenanceSource(entry));
            addCount(solverIds, entry?.solver?.id);
            addCount(techniques, entry?.solver?.technique);
            addCount(retryTiers, entry?.solver?.forcing?.retryTier);
            workSpent.push(entry?.search?.workSpent);
            nodesExpanded.push(entry?.search?.nodesExpanded);
            elapsedMs.push(entry?.search?.elapsedMs);
        }
    }

    return {
        coldEvidenceStandard: standard,
        ...classes,
        hintSources: sortedCounts(hintSources),
        entrySources: sortedCounts(entrySources),
        solverIds: sortedCounts(solverIds),
        techniques: sortedCounts(techniques),
        retryTiers: sortedCounts(retryTiers),
        cost: {
            workSpent: numericSummary(workSpent),
            nodesExpanded: numericSummary(nodesExpanded),
            elapsedMs: numericSummary(elapsedMs),
        },
    };
}

export function compactHintRecord(hint, index, { standard = 'strict' } = {}) {
    const entries = hint?.provenance ?? [];
    const solverIds = new Set();
    const techniques = new Set();
    const retryTiers = new Set();
    const workSpent = [];
    for (const entry of entries) {
        if (entry?.solver?.id) solverIds.add(entry.solver.id);
        if (entry?.solver?.technique) techniques.add(entry.solver.technique);
        if (entry?.solver?.forcing?.retryTier) retryTiers.add(entry.solver.forcing.retryTier);
        if (Number.isFinite(entry?.search?.workSpent)) workSpent.push(entry.search.workSpent);
    }
    return {
        hintIndex: index + 1,
        moves: Math.max(0, (hint?.path?.length ?? 0) - 1),
        provenanceEntries: entries.length,
        classes: [...hintProvenanceClasses(hint, { standard })].sort(),
        sources: [...sourcesForHint(hint)].sort(),
        solverIds: [...solverIds].sort(),
        techniques: [...techniques].sort(),
        retryTiers: [...retryTiers].sort(),
        workSpent: numericSummary(workSpent),
    };
}

export function queryHintRecords(hints, options = {}) {
    const { standard = 'strict', className, source, solverId, technique, retryTier, query } = options;
    const needle = query?.toLowerCase();
    const out = [];
    hints.forEach((hint, index) => {
        const compact = compactHintRecord(hint, index, { standard });
        if (className && !compact.classes.includes(className)) return;
        if (source && !compact.sources.includes(source)) return;
        if (solverId && !compact.solverIds.includes(solverId)) return;
        if (technique && !compact.techniques.some(value => value === technique || value.includes(technique))) return;
        if (retryTier && !compact.retryTiers.includes(retryTier)) return;
        if (needle && !JSON.stringify(compact).toLowerCase().includes(needle)) return;
        out.push({ compact, hint });
    });
    return out;
}
