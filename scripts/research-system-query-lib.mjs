import { createHash } from 'node:crypto';

import { withDetachedGitWorktree } from './git-ref-worktree-lib.mjs';
import { buildResearchSystemInventory } from './research-system-inventory-lib.mjs';

function stableFindingIdentity(category, family, row) {
    const identity = {
        category,
        family,
        kind: row.kind ?? family,
        path: row.path ?? null,
        workstreamId: row.workstreamId ?? null,
        questionRef: row.questionRef ?? null,
        dependency: row.dependency ?? null,
        relation: row.relation ?? null,
        source: row.source ?? null,
        workflow: row.workflow ?? null,
    };
    const hasSpecificKey = Object.entries(identity)
        .some(([key, value]) => !['category', 'family', 'kind'].includes(key) && value != null);
    return hasSpecificKey ? identity : { ...identity, fallback: row };
}

function digest(value) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function stableFindingId(category, family, row) {
    return 'SYS-' + digest(stableFindingIdentity(category, family, row)).slice(0, 12);
}

function flattenFindingFamilies(container, category) {
    const rows = [];
    for (const [family, values] of Object.entries(container ?? {})) {
        for (const row of values ?? []) {
            rows.push({
                id: stableFindingId(category, family, row),
                category,
                family,
                kind: row.kind ?? family,
                fingerprint: digest(row).slice(0, 16),
                row,
            });
        }
    }
    return rows;
}

export function buildResearchSystemFindingIndex(root = process.cwd(), { allowHistoricalWorkstreamTable = false } = {}) {
    const inventory = buildResearchSystemInventory(root, { allowHistoricalWorkstreamTable });
    const findings = [
        ...flattenFindingFamilies(inventory.findings, 'finding'),
        ...flattenFindingFamilies(inventory.architectureFindings, 'architecture'),
    ].sort((a, b) => a.id.localeCompare(b.id));

    return {
        schemaVersion: 1,
        authority: {
            kind: 'derived-read-only',
            source: 'research:system-inventory',
            note: 'Stable IDs identify deterministic current findings; they do not create a new ownership or queue authority.',
        },
        count: findings.length,
        findings,
    };
}

export function queryResearchSystemFindings(index, { query = '', category = '', family = '', kind = '' } = {}) {
    const terms = String(query ?? '').trim().toLowerCase().split(/\s+/u).filter(Boolean);
    return index.findings.filter(row => {
        if (category && row.category !== category) return false;
        if (family && row.family !== family) return false;
        if (kind && row.kind !== kind) return false;
        if (!terms.length) return true;
        const haystack = JSON.stringify(row).toLowerCase();
        return terms.every(term => haystack.includes(term));
    });
}

export function buildResearchSystemFindingSnapshot(index) {
    return {
        schemaVersion: 1,
        findings: index.findings.map(row => ({
            id: row.id,
            category: row.category,
            family: row.family,
            kind: row.kind,
            fingerprint: row.fingerprint,
        })),
    };
}

export function buildResearchSystemFindingSnapshotFromGitRef(root, ref) {
    return withDetachedGitWorktree(root, ref, worktree =>
        buildResearchSystemFindingSnapshot(buildResearchSystemFindingIndex(worktree, {
            allowHistoricalWorkstreamTable: true,
        })));
}

export function diffResearchSystemFindingSnapshots(before, after) {
    const beforeMap = new Map((before.findings ?? []).map(row => [row.id, row]));
    const afterMap = new Map((after.findings ?? []).map(row => [row.id, row]));
    const changed = [...afterMap.entries()].filter(([id, row]) =>
        beforeMap.has(id) && beforeMap.get(id).fingerprint !== row.fingerprint)
        .map(([id, row]) => ({ id, before: beforeMap.get(id), after: row }));
    return {
        schemaVersion: 1,
        added: [...afterMap.entries()].filter(([id]) => !beforeMap.has(id)).map(([, row]) => row),
        removed: [...beforeMap.entries()].filter(([id]) => !afterMap.has(id)).map(([, row]) => row),
        changed,
        retainedUnchanged: [...afterMap.keys()].filter(id =>
            beforeMap.has(id) && beforeMap.get(id).fingerprint === afterMap.get(id).fingerprint).length,
    };
}
