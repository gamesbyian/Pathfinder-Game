import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { buildResearchStatusIndex } from './research-status-index-lib.mjs';
import {
    loadResearchQuestionRegistry,
    validateResearchQuestionRegistry,
} from './research-question-relations-lib.mjs';

export const RESEARCH_RELATION_CONTRACTS = Object.freeze({
    questions: { identity: 'id', source: 'docs/solver-research-question-relations.json' },
    assets: { identity: 'id', source: 'docs/solver-research-data-assets.json' },
    measurementOpportunities: { identity: 'id', source: 'docs/solver-premise-map-measurement-opportunities.json' },
    evidenceIntegrity: { identity: 'evidenceId', source: 'reports/stress/solver-evidence-integrity-index.json' },
    evidence: { identity: 'topicId', source: 'reports/*.md via research-status-index' },
    queue: { identity: 'topicId', source: 'docs/solver-optimization-workstreams.md via research-status-index' },
    experiments: { identity: 'experimentId', source: 'docs/solver-opt-in-experiment-ledger.md via research-status-index' },
    premiseSnapshots: { identity: 'snapshotId', source: 'docs/solver-premise-map-snapshot-v*.json' },
    premiseAdmissions: { identity: 'premiseId', source: 'docs/solver-premise-map-v2-admissions.json' },
});

function readJson(root, relative, { optional = false } = {}) {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute)) {
        if (optional) return null;
        throw new Error(`missing research relation source: ${relative}`);
    }
    return JSON.parse(readFileSync(absolute, 'utf8'));
}

const withSource = (row, relation, source) => ({
    ...row,
    _researchSource: { relation, source },
});

function normalizePremiseAdmissions(doc) {
    if (!doc) return [];
    if (Array.isArray(doc)) return doc;
    for (const key of ['admissions', 'premises', 'records']) {
        if (Array.isArray(doc[key])) return doc[key];
    }
    return [];
}

export function buildResearchRelations(root = process.cwd()) {
    const questions = loadResearchQuestionRegistry(root);
    const questionErrors = validateResearchQuestionRegistry(questions);
    if (questionErrors.length) {
        throw new Error(`Invalid solver research question registry:\n- ${questionErrors.join('\n- ')}`);
    }

    const assets = readJson(root, 'docs/solver-research-data-assets.json');
    const audits = readJson(root, 'docs/solver-research-resource-contract-audits.json');
    const auditedById = new Map((audits.auditedResources ?? []).map(row => [row.assetId, row]));
    const measurement = readJson(root, 'docs/solver-premise-map-measurement-opportunities.json');
    const evidenceIntegrity = readJson(root, 'reports/stress/solver-evidence-integrity-index.json', { optional: true });
    const status = buildResearchStatusIndex(root);
    const v1 = readJson(root, 'docs/solver-premise-map-snapshot-v1.json', { optional: true });
    const v2 = readJson(root, 'docs/solver-premise-map-snapshot-v2.json', { optional: true });
    const admissions = readJson(root, 'docs/solver-premise-map-v2-admissions.json', { optional: true });

    const relations = {
        questions: questions.questions.map(row => withSource(row, 'questions', RESEARCH_RELATION_CONTRACTS.questions.source)),
        assets: (assets.assets ?? []).map(row => withSource({
            ...row,
            contractGrade: auditedById.has(row.id) ? 'audited' : 'catalogue',
            auditedResourceContract: auditedById.get(row.id) ?? null,
        }, 'assets', RESEARCH_RELATION_CONTRACTS.assets.source)),
        measurementOpportunities: (measurement.opportunities ?? []).map(row =>
            withSource(row, 'measurementOpportunities', RESEARCH_RELATION_CONTRACTS.measurementOpportunities.source)),
        evidenceIntegrity: (evidenceIntegrity?.records ?? []).map(row =>
            withSource(row, 'evidenceIntegrity', RESEARCH_RELATION_CONTRACTS.evidenceIntegrity.source)),
        evidence: status.evidence.map(row => withSource(row, 'evidence', RESEARCH_RELATION_CONTRACTS.evidence.source)),
        queue: status.queue.map(row => withSource(row, 'queue', RESEARCH_RELATION_CONTRACTS.queue.source)),
        experiments: status.experiments.map(row => withSource(row, 'experiments', RESEARCH_RELATION_CONTRACTS.experiments.source)),
        premiseSnapshots: [v1, v2].filter(Boolean).map(row =>
            withSource(row, 'premiseSnapshots', 'docs/solver-premise-map-snapshot-v*.json')),
        premiseAdmissions: normalizePremiseAdmissions(admissions).map(row => {
            const premiseId = row.premiseId ?? row.id ?? row.propositionId ?? null;
            return withSource({ ...row, premiseId }, 'premiseAdmissions', RESEARCH_RELATION_CONTRACTS.premiseAdmissions.source);
        }),
    };

    return {
        schemaVersion: 1,
        contracts: RESEARCH_RELATION_CONTRACTS,
        relations,
    };
}

export function relationNames(model) {
    return Object.keys(model.relations).sort();
}

function flatten(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (typeof value === 'object') return Object.entries(value).flatMap(([key, nested]) => [key, ...flatten(nested)]);
    return [String(value)];
}

export function queryRelation(model, relation, { query = '', status = '', limit = Infinity } = {}) {
    const rows = model.relations[relation];
    if (!rows) throw new Error(`unknown research relation: ${relation}`);
    const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
    const wantedStatus = status.trim().toLowerCase();
    const matched = rows.filter(row => {
        if (wantedStatus) {
            const rowStatus = String(row.status ?? row.state ?? row.reliability ?? '').toLowerCase();
            if (!rowStatus.includes(wantedStatus)) return false;
        }
        if (!terms.length) return true;
        const haystack = flatten(row).join('\n').toLowerCase();
        return terms.every(term => haystack.includes(term));
    });
    const bounded = Number.isFinite(limit) ? matched.slice(0, Math.max(0, limit)) : matched;
    return { relation, matched: matched.length, rows: bounded };
}

export function indexBy(rows, key) {
    const out = new Map();
    for (const row of rows) {
        const value = typeof key === 'function' ? key(row) : row?.[key];
        if (value == null) continue;
        if (out.has(String(value))) throw new Error(`duplicate relation identity ${String(value)}`);
        out.set(String(value), row);
    }
    return out;
}

export function leftJoin(leftRows, rightRows, {
    leftKey,
    rightKey = leftKey,
    as = 'joined',
} = {}) {
    if (!leftKey) throw new Error('leftJoin requires leftKey');
    const right = new Map();
    for (const row of rightRows) {
        const key = typeof rightKey === 'function' ? rightKey(row) : row?.[rightKey];
        if (key == null) continue;
        const id = String(key);
        if (!right.has(id)) right.set(id, []);
        right.get(id).push(row);
    }
    return leftRows.map(row => {
        const key = typeof leftKey === 'function' ? leftKey(row) : row?.[leftKey];
        return { ...row, [as]: key == null ? [] : (right.get(String(key)) ?? []) };
    });
}

export function summarizeIndependentSupport(rows, key) {
    const groups = new Map();
    let missing = 0;
    for (const row of rows) {
        const value = typeof key === 'function' ? key(row) : row?.[key];
        if (value == null || value === '') { missing++; continue; }
        const id = String(value);
        groups.set(id, (groups.get(id) ?? 0) + 1);
    }
    return {
        rows: rows.length,
        independentUnits: groups.size,
        missingIndependentUnit: missing,
        largestUnitRows: groups.size ? Math.max(...groups.values()) : 0,
        units: Object.fromEntries([...groups.entries()].sort(([a], [b]) => a.localeCompare(b))),
    };
}
