#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildResearchStatusIndex, compactResearchStatusIndex, writeResearchStatusIndex } from './research-status-index-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const outputArg = value('out');
const query = value('query');
const status = value('status');
const kind = value('kind');
const compact = args.includes('--compact') || query || status || kind;
const index = buildResearchStatusIndex(process.cwd());

const relationsPath = path.resolve('docs/solver-research-question-relations.json');
const relationRegistry = existsSync(relationsPath)
    ? JSON.parse(readFileSync(relationsPath, 'utf8'))
    : { schemaVersion: 1, questions: [] };
const questions = Array.isArray(relationRegistry.questions) ? relationRegistry.questions : [];
const wantedQuery = query.trim().toLowerCase();
const wantedStatus = status.trim().toLowerCase();
const wantedKind = kind.trim().toLowerCase();
const questionMatches = questions.filter(question => {
    if (wantedKind && wantedKind !== 'question') return false;
    if (wantedStatus && String(question.state ?? '').toLowerCase() !== wantedStatus) return false;
    if (!wantedQuery) return true;
    return JSON.stringify(question).toLowerCase().includes(wantedQuery);
}).map(question => ({ kind: 'question', ...question }));

if (outputArg) {
    const output = path.resolve(outputArg);
    mkdirSync(path.dirname(output), { recursive: true });
    writeResearchStatusIndex({ ...index, questions }, output);
    console.log(JSON.stringify({ output, topics: index.evidence.length, questions: questions.length }, null, 2));
} else if (compact) {
    const reportMatches = wantedKind === 'question'
        ? { schemaVersion: 1, count: 0, entries: [] }
        : compactResearchStatusIndex(index, { query, status, kind });
    console.log(JSON.stringify({
        schemaVersion: 2,
        count: reportMatches.entries.length + questionMatches.length,
        entries: [...questionMatches, ...reportMatches.entries],
    }, null, 2));
} else {
    console.log(JSON.stringify({ ...index, questions }, null, 2));
}
