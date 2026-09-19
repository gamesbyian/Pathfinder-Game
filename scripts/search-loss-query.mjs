#!/usr/bin/env node
import fs from 'node:fs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const i = arg.indexOf('='); return [arg.slice(2, i), arg.slice(i + 1)];
}));
if (!args.get('in')) throw new Error('--in= is required');
const docs = args.get('in').split(',').map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const annotations = new Map(docs.flatMap(doc => doc.annotations ?? []).map(row => [row.capsuleId, row]));
let rows = docs.flatMap(doc => (doc.records ?? doc.capsules ?? []).map(row => ({
    ...row,
    runId: row.runId ?? doc.run?.runId ?? null,
    protocolHash: row.protocolHash ?? doc.run?.protocolHash ?? null,
    questionId: doc.population?.researchBlock?.questionId ?? doc.researchBlock?.questionId ?? null,
    exactAnnotation: annotations.get(row.capsuleId) ?? null,
})));
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
};
for (const [key, predicate] of Object.entries(filters)) if (args.has(key)) rows = rows.filter(predicate);
if (args.has('min-work')) rows = rows.filter(row => Number.isFinite(row.workSpent) && row.workSpent >= Number(args.get('min-work')));
if (args.has('max-badness')) rows = rows.filter(row => Number.isFinite(row.bestBadness) && row.bestBadness <= Number(args.get('max-badness')));
const parents = new Set(rows.map(row => row.parentId ?? row.identity));
const countBy = field => Object.fromEntries([...rows.reduce((map, row) => map.set(row[field] ?? 'unknown', (map.get(row[field] ?? 'unknown') ?? 0) + 1), new Map())].sort());
const parentOutcome = new Map();
for (const row of rows) {
    const parent = row.parentId ?? row.identity;
    const solved = row.outcome === 'solved' || row.context?.parentSolved === true;
    parentOutcome.set(parent, (parentOutcome.get(parent) ?? false) || solved);
}
const result = { rows, summary: { rows: rows.length, independentParents: parents.size,
    solvedControlParents: [...parentOutcome.values()].filter(Boolean).length,
    failedOrUnknownParents: [...parentOutcome.values()].filter(value => !value).length,
    outcomes: countBy('outcome'), eventKinds: countBy('eventKind'), replayBasis: countBy('replayBasis') } };
console.log(JSON.stringify(result, null, 2));
