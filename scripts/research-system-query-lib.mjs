import { createHash } from 'node:crypto';

import { buildResearchSystemInventory } from './research-system-inventory-lib.mjs';

function stableFindingId(category, family, row) {
    const material = JSON.stringify({ category, family, row });
    const digest = createHash('sha256').update(material).digest('hex').slice(0, 12);
    return 'SYS-' + digest;
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
                row,
            });
        }
    }
    return rows;
}

export function buildResearchSystemFindingIndex(root = process.cwd()) {
    const inventory = buildResearchSystemInventory(root);
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
        })),
    };
}

export function diffResearchSystemFindingSnapshots(before, after) {
    const beforeMap = new Map((before.findings ?? []).map(row => [row.id, row]));
    const afterMap = new Map((after.findings ?? []).map(row => [row.id, row]));
    return {
        schemaVersion: 1,
        added: [...afterMap.entries()].filter(([id]) => !beforeMap.has(id)).map(([, row]) => row),
        removed: [...beforeMap.entries()].filter(([id]) => !afterMap.has(id)).map(([, row]) => row),
        retained: [...afterMap.keys()].filter(id => beforeMap.has(id)).length,
    };
}
