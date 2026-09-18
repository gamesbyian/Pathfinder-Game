#!/usr/bin/env node
import { buildQuestionDossier } from './research-question-dossier-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? '';
const questionId = value('question-id');
if (!questionId) throw new Error('--question-id=... is required');
const relatedArg = args.find(arg => arg.startsWith('--related-questions='));
const relatedQuestionIds = relatedArg === undefined
    ? null
    : relatedArg.slice('--related-questions='.length).split(',').map(item => item.trim()).filter(Boolean);

console.log(JSON.stringify(buildQuestionDossier(process.cwd(), {
    questionId,
    evidenceRole: value('evidence-role') || 'development',
    relatedQuestionIds,
}), null, 2));
