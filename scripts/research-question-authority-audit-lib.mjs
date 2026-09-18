import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
    loadResearchQuestionRegistry,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';

const LIVE_AUTHORITY_PATHS = [
    'docs/solver-optimization-workstreams.md',
    'docs/solver-future-work.md',
];

const PATH_FIELDS = ['answeredBy', 'constrainedBy'];
const pathLike = value => typeof value === 'string' && /^(?:docs|reports|scripts)\//u.test(value);

export function auditResearchQuestionAuthorities(root = process.cwd()) {
    const registry = loadResearchQuestionRegistry(root);
    const errors = validateResearchQuestionRegistry(registry);
    const warnings = [];

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
        if (state.startsWith('active') && reopensOn != null) {
            warnings.push({
                id,
                kind: 'active-with-reopen-condition',
                detail: 'Active questions normally should describe their current gate directly rather than retain a deferred reopen condition.',
            });
        }

        if (state.startsWith('active') || state === 'deferred-reopen') {
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
        errorCount: errors.length,
        warningCount: warnings.length,
        errors,
        warnings,
    };
}
