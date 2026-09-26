import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
    RESEARCH_QUESTION_STATES,
    loadResearchQuestionRegistry,
    researchQuestionLifecycleClass,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';

const LIVE_AUTHORITY_PATHS = [
    'docs/solver-optimization-workstreams.md',
    'docs/solver-future-work.md',
];

const PATH_FIELDS = ['answeredBy', 'constrainedBy'];
const pathLike = value => typeof value === 'string' && /^(?:docs|reports|scripts)\//u.test(value);


const QUEUE_EXECUTION_STATES = new Set(['active', 'closed', 'supporting', 'on-demand', 'method-complete', 'subsumed']);

const cleanTableCell = value => String(value ?? '').replace(/[`*_]/gu, '').trim();

export function parseWorkstreamQuestionStates(source) {
    const rows = [];
    for (const line of String(source ?? '').split('\n')) {
        if (!/^\s*\|/u.test(line)) continue;
        const cells = line.split('|').slice(1, -1).map(cleanTableCell);
        if (cells.length < 7) continue;
        const executionState = cells[2];
        if (!QUEUE_EXECUTION_STATES.has(executionState)) continue;
        const questionRef = /^WS[0-9A-Z-]+$/u.test(cells[6]) ? cells[6] : null;
        rows.push({
            workstreamId: cells[0],
            executionState,
            gateClass: cells[3],
            questionRef,
        });
    }
    return rows;
}

export function queueQuestionLifecycleIssues(workstreamsSource, registry) {
    const questions = new Map((registry?.questions ?? []).map(question => [String(question.id), question]));
    const issues = [];
    for (const row of parseWorkstreamQuestionStates(workstreamsSource)) {
        if (!row.questionRef) continue;
        const question = questions.get(row.questionRef);
        if (!question) {
            issues.push(`workstream ${row.workstreamId} references missing question ${row.questionRef}`);
            continue;
        }
        const lifecycle = researchQuestionLifecycleClass(String(question.state ?? '').trim().toLowerCase());
        const liveExecution = row.executionState === 'active' || row.executionState === 'supporting';
        if (liveExecution && ['closed', 'concluded'].includes(lifecycle)) {
            issues.push(`workstream ${row.workstreamId} is ${row.executionState} but ${row.questionRef} is terminal (${question.state})`);
        }
        if (row.executionState === 'closed' && lifecycle === 'active') {
            issues.push(`workstream ${row.workstreamId} is closed but ${row.questionRef} is still active-candidate`);
        }
        if (row.gateClass === 'reopen-only' && lifecycle === 'active') {
            issues.push(`workstream ${row.workstreamId} is reopen-only but ${row.questionRef} is still active-candidate`);
        }
    }
    return issues;
}

export function summarizeQuestionGenealogyVsImplication(registry) {
    const implies = new Set();
    const triggered = new Set();
    for (const question of registry?.questions ?? []) {
        for (const target of question.implies ?? []) {
            implies.add(`${question.id}->${target}`);
        }
        for (const source of question.triggeredBy ?? []) {
            triggered.add(`${source}->${question.id}`);
        }
    }
    const mirrored = [...implies].filter(edge => triggered.has(edge)).sort();
    const implicationOnly = [...implies].filter(edge => !triggered.has(edge)).sort();
    const triggerOnly = [...triggered].filter(edge => !implies.has(edge)).sort();
    return {
        implicationEdges: implies.size,
        triggerEdges: triggered.size,
        mirroredEdges: mirrored,
        implicationOnlyEdges: implicationOnly,
        triggerOnlyEdges: triggerOnly,
        interpretation: {
            implication: 'authored scientific/logical bearing',
            triggeredBy: 'authored research genealogy; not an inverse of implication',
        },
    };
}

export function auditResearchQuestionAuthorities(root = process.cwd()) {
    const registry = loadResearchQuestionRegistry(root);
    const errors = validateResearchQuestionRegistry(registry);
    const warnings = [];

    const workstreamsPath = path.join(root, 'docs/solver-optimization-workstreams.md');
    const workstreamsSource = existsSync(workstreamsPath) ? readFileSync(workstreamsPath, 'utf8') : '';
    const workstreamsText = workstreamsSource.toLowerCase();
    errors.push(...queueQuestionLifecycleIssues(workstreamsSource, registry));
    const questionDocPath = path.join(root, 'docs/solver-research-question-relations.md');
    if (existsSync(questionDocPath)) {
        const questionDoc = readFileSync(questionDocPath, 'utf8');
        const stateSection = questionDoc.match(/## State semantics([\s\S]*?)(?:\n## |$)/u)?.[1] ?? '';
        const documentedStates = new Set(
            [...stateSection.matchAll(/`((?:active|closed|concluded|deferred)[a-z-]*|mixed)`/gu)]
                .map(match => match[1]),
        );
        for (const state of RESEARCH_QUESTION_STATES) {
            if (!documentedStates.has(state)) {
                errors.push(`question-relations state semantics omits canonical state ${state}`);
            }
        }
        for (const state of documentedStates) {
            if (!RESEARCH_QUESTION_STATES.includes(state)) {
                errors.push(`question-relations state semantics names non-canonical state ${state}`);
            }
        }
    }
    const liveText = LIVE_AUTHORITY_PATHS
        .filter(relative => existsSync(path.join(root, relative)))
        .map(relative => readFileSync(path.join(root, relative), 'utf8').toLowerCase())
        .join('\n');

    for (const question of registry.questions) {
        const id = String(question.id);
        const state = String(question.state ?? '');
        const aliases = Array.isArray(question.aliases) ? question.aliases : [];
        const reopensOn = question.reopensOn ?? null;

        for (const field of PATH_FIELDS) {
            for (const value of question[field] ?? []) {
                if (!pathLike(value)) continue;
                if (!existsSync(path.join(root, value))) {
                    errors.push(`${id}.${field} references missing path ${value}`);
                }
            }
        }

        if (state === 'deferred-reopen' && !String(reopensOn ?? '').trim()) {
            errors.push(`${id} is deferred-reopen but has no reopen condition`);
        }
        const lifecycle = researchQuestionLifecycleClass(state);
        if (lifecycle === 'active' && reopensOn != null) {
            warnings.push({
                id,
                kind: 'active-with-reopen-condition',
                detail: 'Active questions normally should describe their current gate directly rather than retain a deferred reopen condition.',
            });
        }
        if (lifecycle === 'active' && !workstreamsText.includes(id.toLowerCase())) {
            errors.push(`${id} is active but its stable question id is absent from solver-optimization-workstreams.md`);
        }

        if (lifecycle === 'active' || lifecycle === 'deferred') {
            const needles = [id, ...aliases]
                .map(value => String(value).trim().toLowerCase())
                .filter(value => value.length >= 3);
            const discoverable = needles.some(needle => liveText.includes(needle));
            if (!discoverable) {
                warnings.push({
                    id,
                    kind: 'live-question-not-discoverable',
                    detail: 'No question id or alias appears in solver-optimization-workstreams.md or solver-future-work.md.',
                });
            }
        }

        if (state === 'deferred-reopen' && !Array.isArray(question.answeredBy)) {
            warnings.push({
                id,
                kind: 'deferred-without-evidence-list',
                detail: 'Deferred question has no answeredBy list; verify that the tested/blocked form is actually documented.',
            });
        }
    }

    return {
        schemaVersion: 1,
        questionCount: registry.questions.length,
        relationTopology: summarizeQuestionGenealogyVsImplication(registry),
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings,
    };
}
