import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { RESEARCH_ACQUISITION_NEEDS } from './research-acquisition-preflight-lib.mjs';
import { researchRepositoryRefIssues } from './research-repository-ref-lib.mjs';

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

export function validateResearchQuestionRegistry(registry, { root = null } = {}) {
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
        const acquisitionNeed = String(question?.acquisitionNeed ?? '').trim();
        if (acquisitionNeed && !RESEARCH_ACQUISITION_NEEDS.includes(acquisitionNeed)) {
            errors.push(`${prefix}.acquisitionNeed is unknown: ${acquisitionNeed}`);
        }
        if (state === 'deferred-reopen' && !acquisitionNeed) {
            errors.push(`${prefix}.acquisitionNeed is required for deferred-reopen questions`);
        }
        for (const field of ['premiseRefs', 'measurementOpportunities']) {
            if (question?.[field] != null && (!Array.isArray(question[field])
                || question[field].some(value => typeof value !== 'string' || !value.trim()))) {
                errors.push(`${prefix}.${field} must be a string array when present`);
            }
        }
        if (question?.decisionSupport != null) {
            const support = question.decisionSupport;
            if (!support || typeof support !== 'object' || Array.isArray(support)) {
                errors.push(`${prefix}.decisionSupport must be an object when present`);
            } else {
                if (!['all', 'any'].includes(support.mode)) {
                    errors.push(`${prefix}.decisionSupport.mode must be all or any`);
                }
                if (!Array.isArray(support.refs) || support.refs.length === 0) {
                    errors.push(`${prefix}.decisionSupport.refs must be a non-empty array`);
                } else {
                    const seenSupportRefs = new Set();
                    for (const value of support.refs) {
                        const ref = typeof value === 'string' ? value.trim() : '';
                        const refIssues = researchRepositoryRefIssues(ref, {
                            root,
                            requireFile: Boolean(root),
                            label: `${prefix}.decisionSupport.refs`,
                        });
                        if (refIssues.length) {
                            errors.push(...refIssues);
                            break;
                        }
                        if (seenSupportRefs.has(ref)) {
                            errors.push(`${prefix}.decisionSupport.refs duplicates ${ref}`);
                            break;
                        }
                        seenSupportRefs.add(ref);
                    }
                    const answeredBy = new Set(Array.isArray(question.answeredBy) ? question.answeredBy : []);
                    for (const ref of seenSupportRefs) {
                        if (!answeredBy.has(ref)) {
                            errors.push(`${prefix}.decisionSupport ref must also appear in answeredBy: ${ref}`);
                            break;
                        }
                    }
                }
            }
        }
        if (question?.answeredBy != null) {
            if (!Array.isArray(question.answeredBy)) {
                errors.push(`${prefix}.answeredBy must be an array when present`);
            } else {
                const seenAnsweredBy = new Set();
                for (const value of question.answeredBy) {
                    const ref = typeof value === 'string' ? value.trim() : '';
                    const refIssues = researchRepositoryRefIssues(ref, {
                        root,
                        requireFile: Boolean(root),
                        label: `${prefix}.answeredBy`,
                    });
                    if (refIssues.length) {
                        errors.push(...refIssues);
                        break;
                    }
                    if (seenAnsweredBy.has(ref)) {
                        errors.push(`${prefix}.answeredBy duplicates ${ref}`);
                        break;
                    }
                    seenAnsweredBy.add(ref);
                }
            }
        }
    }

    const questionById = new Map(questions.map(question => [question.id, question]));

    for (const [index, question] of questions.entries()) {
        for (const field of QUESTION_ID_RELATION_FIELDS) {
            const targets = question?.[field];
            if (targets == null) continue;
            if (!Array.isArray(targets)) {
                errors.push(`questions[${index}].${field} must be an array when present`);
                continue;
            }
            const seenTargets = new Set();
            for (const target of targets) {
                if (target === question.id) {
                    errors.push(`questions[${index}].${field} self-references ${target}`);
                } else if (seenTargets.has(target)) {
                    errors.push(`questions[${index}].${field} duplicates ${target}`);
                } else if (!ids.has(target)) {
                    errors.push(`questions[${index}].${field} references unknown question ${target}`);
                }
                seenTargets.add(target);
            }
        }
        if (question?.constrainedBy != null) {
            if (!Array.isArray(question.constrainedBy)) {
                errors.push(`questions[${index}].constrainedBy must be an array when present`);
            } else {
                const seenConstraints = new Set();
                for (const target of question.constrainedBy) {
                    const value = String(target ?? '');
                    const pathReference = /^(?:docs|reports|scripts|data|logs)\//u.test(value);
                    if (pathReference) {
                        errors.push(...researchRepositoryRefIssues(value, {
                            root,
                            requireFile: Boolean(root),
                            label: `questions[${index}].constrainedBy`,
                        }));
                    }
                    if (value === question.id) {
                        errors.push(`questions[${index}].constrainedBy self-references ${value}`);
                    } else if (seenConstraints.has(value)) {
                        errors.push(`questions[${index}].constrainedBy duplicates ${value}`);
                    } else if (!pathReference && !ids.has(value)) {
                        errors.push(`questions[${index}].constrainedBy references neither a known question nor a repository path: ${value}`);
                    }
                    seenConstraints.add(value);
                }
            }
        }
    }

    for (const [index, question] of questions.entries()) {
        for (const target of question.calibratedBy ?? []) {
            if (!ids.has(target) || target === question.id) continue;
            if (!(questionById.get(target)?.calibrates ?? []).includes(question.id)) {
                errors.push(`questions[${index}].calibratedBy ${target} is missing reciprocal calibrates edge`);
            }
        }
        for (const target of question.calibrates ?? []) {
            if (!ids.has(target) || target === question.id) continue;
            if (!(questionById.get(target)?.calibratedBy ?? []).includes(question.id)) {
                errors.push(`questions[${index}].calibrates ${target} is missing reciprocal calibratedBy edge`);
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
