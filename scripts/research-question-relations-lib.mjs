import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const QUESTION_ID_RELATION_FIELDS = Object.freeze([
    'implies',
    'triggeredBy',
    'negativeControlFor',
    'calibratedBy',
    'calibrates',
]);

export function normalizeResearchQuestionStatus(state) {
    const value = String(state ?? '').toLowerCase();
    if (value.startsWith('active')) return 'active';
    if (value.startsWith('closed')) return 'closed';
    return value;
}

export function loadResearchQuestionRegistry(root = process.cwd()) {
    const registryPath = path.join(root, 'docs/solver-research-question-relations.json');
    if (!existsSync(registryPath)) return { schemaVersion: 1, questions: [] };
    const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
    return {
        ...registry,
        questions: Array.isArray(registry.questions) ? registry.questions : [],
    };
}

export function validateResearchQuestionRegistry(registry) {
    const questions = Array.isArray(registry?.questions) ? registry.questions : [];
    const errors = [];
    const ids = new Set();

    for (const [index, question] of questions.entries()) {
        const prefix = `questions[${index}]`;
        const id = String(question?.id ?? '').trim();
        if (!id) errors.push(`${prefix}.id is required`);
        else if (ids.has(id)) errors.push(`${prefix}.id duplicates ${id}`);
        else ids.add(id);
        if (!String(question?.question ?? '').trim()) errors.push(`${prefix}.question is required`);
        if (!String(question?.owner ?? '').trim()) errors.push(`${prefix}.owner is required`);
        if (!String(question?.state ?? '').trim()) errors.push(`${prefix}.state is required`);
    }

    for (const [index, question] of questions.entries()) {
        for (const field of QUESTION_ID_RELATION_FIELDS) {
            const targets = question?.[field];
            if (targets == null) continue;
            if (!Array.isArray(targets)) {
                errors.push(`questions[${index}].${field} must be an array when present`);
                continue;
            }
            for (const target of targets) {
                if (!ids.has(target)) errors.push(`questions[${index}].${field} references unknown question ${target}`);
            }
        }
    }

    return errors;
}

export function queryResearchQuestions(registry, { query = '', status = '', kind = '' } = {}) {
    const wantedQuery = query.trim().toLowerCase();
    const wantedStatus = status.trim().toLowerCase();
    const wantedKind = kind.trim().toLowerCase();
    if (wantedKind && wantedKind !== 'question') return [];

    return registry.questions.filter(question => {
        const normalizedStatus = normalizeResearchQuestionStatus(question.state);
        if (wantedStatus && normalizedStatus !== wantedStatus) return false;
        if (!wantedQuery) return true;
        return JSON.stringify(question).toLowerCase().includes(wantedQuery);
    }).map(question => ({
        kind: 'question',
        status: normalizeResearchQuestionStatus(question.state),
        ...question,
    }));
}
