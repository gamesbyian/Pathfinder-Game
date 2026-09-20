import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const RESEARCH_QUESTION_STATES = Object.freeze([
    'active-candidate',
    'closed-negative',
    'closed-tested-form',
    'concluded-negative',
    'concluded-positive',
    'deferred-reopen',
    'mixed',
]);

export function researchQuestionLifecycleClass(state) {
    switch (state) {
        case 'active-candidate': return 'active';
        case 'closed-negative':
        case 'closed-tested-form': return 'closed';
        case 'concluded-negative':
        case 'concluded-positive': return 'concluded';
        case 'deferred-reopen': return 'deferred';
        case 'mixed': return 'mixed';
        default: return 'unknown';
    }
}

export function isTerminalResearchQuestionState(state) {
    return ['closed', 'concluded'].includes(researchQuestionLifecycleClass(state));
}

const QUESTION_ID_RELATION_FIELDS = Object.freeze([
    'implies',
    'triggeredBy',
    'negativeControlFor',
    'calibratedBy',
    'calibrates',
    'supersedes',
    'duplicateOf',
]);

const normalizeSearchText = value => String(value ?? '')
    .toLowerCase()
    .replace(/[-_]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

export function normalizeResearchQuestionStatus(state) {
    const value = String(state ?? '').trim().toLowerCase();
    const lifecycle = researchQuestionLifecycleClass(value);
    if (lifecycle === 'active') return 'active';
    if (lifecycle === 'closed') return 'closed';
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
        const state = String(question?.state ?? '').trim();
        if (!state) errors.push(`${prefix}.state is required`);
        else if (!RESEARCH_QUESTION_STATES.includes(state)) errors.push(`${prefix}.state is unknown: ${state}`);
        for (const field of ['premiseRefs', 'measurementOpportunities']) {
            if (question?.[field] != null && (!Array.isArray(question[field])
                || question[field].some(value => typeof value !== 'string' || !value.trim()))) {
                errors.push(`${prefix}.${field} must be a string array when present`);
            }
        }
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
        if (question?.constrainedBy != null) {
            if (!Array.isArray(question.constrainedBy)) {
                errors.push(`questions[${index}].constrainedBy must be an array when present`);
            } else {
                for (const target of question.constrainedBy) {
                    const value = String(target ?? '');
                    const pathReference = /^(?:docs|reports|scripts)\//u.test(value);
                    if (!pathReference && !ids.has(value)) {
                        errors.push(`questions[${index}].constrainedBy references neither a known question nor a repository path: ${value}`);
                    }
                }
            }
        }
    }

    return errors;
}

export function queryResearchQuestions(registry, { query = '', status = '', kind = '' } = {}) {
    const wantedQuery = query.trim().toLowerCase();
    const normalizedQuery = normalizeSearchText(query);
    const wantedStatus = status.trim().toLowerCase();
    const wantedKind = kind.trim().toLowerCase();
    if (wantedKind && wantedKind !== 'question') return [];

    return registry.questions.filter(question => {
        const normalizedStatus = normalizeResearchQuestionStatus(question.state);
        if (wantedStatus && normalizedStatus !== wantedStatus) return false;
        if (!wantedQuery) return true;
        const haystack = JSON.stringify(question).toLowerCase();
        return haystack.includes(wantedQuery) || normalizeSearchText(haystack).includes(normalizedQuery);
    }).map(question => ({
        kind: 'question',
        status: normalizeResearchQuestionStatus(question.state),
        ...question,
    }));
}
