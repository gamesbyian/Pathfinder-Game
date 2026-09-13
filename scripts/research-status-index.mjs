#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { buildResearchStatusIndex, compactResearchStatusIndex, writeResearchStatusIndex } from './research-status-index-lib.mjs';
import {
    loadResearchQuestionRegistry,
    queryResearchQuestions,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const outputArg = value('out');
const query = value('query');
const status = value('status');
const kind = value('kind');
const compact = args.includes('--compact') || query || status || kind;
const index = buildResearchStatusIndex(process.cwd());

const relationRegistry = loadResearchQuestionRegistry(process.cwd());
const relationErrors = validateResearchQuestionRegistry(relationRegistry);
if (relationErrors.length) {
    throw new Error(`Invalid solver research question registry:\n- ${relationErrors.join('\n- ')}`);
}
const questions = relationRegistry.questions;
const questionMatches = queryResearchQuestions(relationRegistry, { query, status, kind });
const wantedKind = kind.trim().toLowerCase();

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
