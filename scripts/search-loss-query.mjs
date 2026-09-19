#!/usr/bin/env node
import fs from 'node:fs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const i = arg.indexOf('='); return [arg.slice(2, i), arg.slice(i + 1)];
}));
if (!args.get('in')) throw new Error('--in= is required');
const docs = args.get('in').split(',').map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const annotations = new Map(docs.flatMap(doc => doc.annotations ?? []).map(row => [row.capsuleId, row]));
let rows = docs.flatMap(doc => (doc.records ?? doc.capsules ?? []).map(row => {
    const selectorId = row.selection?.selectorId ?? null;
    const selectorSummary = selectorId ? doc.capture?.selectorSummaries?.[selectorId] ?? null : null;
    return {
        ...row,
        runId: row.runId ?? doc.run?.runId ?? null,
        protocolHash: row.protocolHash ?? doc.run?.protocolHash ?? null,
        questionId: doc.population?.researchBlock?.questionId ?? doc.researchBlock?.questionId ?? null,
        exactAnnotation: annotations.get(row.capsuleId) ?? null,
        selectorId,
        selectorObserved: row.selection?.observedAtSelection ?? selectorSummary?.observed ?? null,
        selectorRetained: row.selection?.retainedAtSelection ?? selectorSummary?.retained ?? null,
        selectorTruncated: row.selection?.truncated ?? selectorSummary?.truncated ?? null,
    };
}));
const filters = {
    parent: row => String(row.parentId ?? row.identity) === args.get('parent'),
    outcome: row => row.outcome === args.get('outcome'),
    stage: row => row.stageId === args.get('stage'),
    action: row => row.actionKey === args.get('action'),
    config: row => row.configurationKey === args.get('config') || row.configKey === args.get('config'),
    event: row => row.eventKind === args.get('event'),
    reason: row => row.captureReason === args.get('reason'),
    disposition: row => row.disposition === args.get('disposition'),
    replay: row => row.replayBasis === args.get('replay'),
    exact: row => row.exactAnnotation?.value === args.get('exact'),
    run: row => row.runId === args.get('run'),
    protocol: row => row.protocolHash === args.get('protocol'),
    question: row => row.questionId === args.get('question'),
    solved: row => String(row.outcome === 'solved' || row.context?.parentSolved === true) === args.get('solved'),
    truncated: row => String(row.selectorTruncated === true) === args.get('truncated'),
    'annotation-support': row => row.exactAnnotation?.support === args.get('annotation-support'),
};
for (const [key, predicate] of Object.entries(filters)) if (args.has(key)) rows = rows.filter(predicate);
if (args.has('min-work')) rows = rows.filter(row => Number.isFinite(row.workSpent) && row.workSpent >= Number(args.get('min-work')));
if (args.has('max-badness')) rows = rows.filter(row => Number.isFinite(row.bestBadness) && row.bestBadness <= Number(args.get('max-badness')));
if (args.has('depth')) rows = rows.filter(row => Number.isFinite(row.depth) && row.depth === Number(args.get('depth')));
if (args.has('min-depth')) rows = rows.filter(row => Number.isFinite(row.depth) && row.depth >= Number(args.get('min-depth')));
if (args.has('max-depth')) rows = rows.filter(row => Number.isFinite(row.depth) && row.depth <= Number(args.get('max-depth')));
const parents = new Set(rows.map(row => row.parentId ?? row.identity));
const countBy = field => Object.fromEntries([...rows.reduce((map, row) => map.set(row[field] ?? 'unknown', (map.get(row[field] ?? 'unknown') ?? 0) + 1), new Map())].sort());
const parentOutcome = new Map();
for (const row of rows) {
    const parent = row.parentId ?? row.identity;
    const solved = row.outcome === 'solved' || row.context?.parentSolved === true;
    parentOutcome.set(parent, (parentOutcome.get(parent) ?? false) || solved);
}
const inputSelectorDenominators = {};
for (const doc of docs) {
    for (const [selectorId, summary] of Object.entries(doc.capture?.selectorSummaries ?? {})) {
        const state = inputSelectorDenominators[selectorId] ?? { observed: 0, retained: 0, anyTruncated: false };
        state.observed += Number(summary.observed ?? 0);
        state.retained += Number(summary.retained ?? 0);
        state.anyTruncated ||= summary.truncated === true;
        inputSelectorDenominators[selectorId] = state;
    }
}
const exactRows = rows.filter(row => row.exactAnnotation);
const repeatedPhenotypeParents = new Set();
const phenotypeCounts = new Map();
for (const row of rows) {
    const parent = row.parentId ?? row.identity;
    const phenotype = `${parent}::${row.eventKind ?? row.outcome ?? 'unknown'}`;
    const count = (phenotypeCounts.get(phenotype) ?? 0) + 1;
    phenotypeCounts.set(phenotype, count);
    if (count > 1) repeatedPhenotypeParents.add(parent);
}
const result = { rows, summary: { rows: rows.length, independentParents: parents.size,
    solvedControlParents: [...parentOutcome.values()].filter(Boolean).length,
    failedOrUnknownParents: [...parentOutcome.values()].filter(value => !value).length,
    outcomes: countBy('outcome'), eventKinds: countBy('eventKind'), replayBasis: countBy('replayBasis'),
    exactAnnotationValues: Object.fromEntries([...exactRows.reduce((map, row) => map.set(row.exactAnnotation.value ?? 'unknown', (map.get(row.exactAnnotation.value ?? 'unknown') ?? 0) + 1), new Map())].sort()),
    exactAnnotationSupport: Object.fromEntries([...exactRows.reduce((map, row) => map.set(row.exactAnnotation.support ?? 'unknown', (map.get(row.exactAnnotation.support ?? 'unknown') ?? 0) + 1), new Map())].sort()),
    annotatedRows: exactRows.length,
    repeatedPhenotypeParents: repeatedPhenotypeParents.size,
    inputSelectorDenominators,
} };
console.log(JSON.stringify(result, null, 2));
