#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'reports/stress/technique-census/32240161854/combined-cells.json';
const rows = JSON.parse(readFileSync(file, 'utf8')).results ?? [];
const groups = new Map();
for (const row of rows) {
    if (!groups.has(row.cellId)) groups.set(row.cellId, []);
    groups.get(row.cellId).push(row);
}
const dupes = [...groups.entries()].filter(([, rs]) => rs.length > 1);

function diffPaths(a, b, prefix = '', out = []) {
    if (Object.is(a, b)) return out;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        out.push(prefix || '<root>');
        return out;
    }
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of [...keys].sort()) {
        const p = prefix ? `${prefix}.${key}` : key;
        if (!(key in a) || !(key in b)) out.push(p);
        else diffPaths(a[key], b[key], p, out);
    }
    return out;
}

function without(row, keys) {
    const copy = globalThis.structuredClone(row);
    for (const key of keys) delete copy[key];
    return copy;
}

const audit = dupes.map(([cellId, rs]) => {
    const comparisons = rs.slice(1).map((row, i) => {
        const base = rs[0];
        const rawDiffs = diffPaths(base, row);
        const semanticDiffs = diffPaths(
            without(base, ['totalMs', 'variantLabel', 'attempts']),
            without(row, ['totalMs', 'variantLabel', 'attempts']),
        );
        const attemptDiffs = diffPaths(base.attempts, row.attempts, 'attempts');
        return {
            against: i + 1,
            rawDiffs,
            semanticDiffs,
            attemptDiffs,
            summary: {
                a: { ok: base.ok, status: base.status, nodesExpanded: base.nodesExpanded, totalMs: base.totalMs, winningConfigKey: base.winningConfigKey, winningGate: base.winningGate },
                b: { ok: row.ok, status: row.status, nodesExpanded: row.nodesExpanded, totalMs: row.totalMs, winningConfigKey: row.winningConfigKey, winningGate: row.winningGate },
            },
        };
    });
    return { cellId, copies: rs.length, comparisons };
});

const extras = dupes.reduce((n, [, rs]) => n + rs.length - 1, 0);
const semanticConflictCells = audit.filter(x => x.comparisons.some(c => c.semanticDiffs.length));
const timingOrAttemptOnlyCells = audit.filter(x => x.comparisons.every(c => !c.semanticDiffs.length));
console.log(JSON.stringify({
    totalRows: rows.length,
    uniqueCellIds: groups.size,
    duplicateCellIds: dupes.length,
    duplicateExtraRows: extras,
    semanticConflictCount: semanticConflictCells.length,
    timingOrAttemptOnlyCount: timingOrAttemptOnlyCells.length,
    semanticConflictIds: semanticConflictCells.map(x => x.cellId),
    duplicateIds: dupes.map(([id, rs]) => ({ id, copies: rs.length })),
    focus: audit.find(x => x.cellId === 'T1-0054957') ?? null,
    audit,
}, null, 2));
