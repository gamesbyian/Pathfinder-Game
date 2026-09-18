import { Buffer } from 'node:buffer';

function valueOf(row, selector) {
    return typeof selector === 'function' ? selector(row) : row?.[selector];
}

export function groupRowsByKey(rows, selector) {
    const groups = new Map();
    for (const row of rows) {
        const key = valueOf(row, selector);
        if (key == null) throw new Error('signature collision analysis requires a non-null group key');
        const id = typeof key === 'string' ? key : JSON.stringify(key);
        if (!groups.has(id)) groups.set(id, []);
        groups.get(id).push(row);
    }
    return groups;
}

function byteLengthUtf8(value) {
    return Buffer.byteLength(String(value), 'utf8');
}

export function summarizeSignatureCollisions(rows, {
    signature,
    label,
    independentUnit,
    rowId = null,
    includeMembers = false,
} = {}) {
    if (!signature || !label) throw new Error('signature and label selectors are required');
    const groups = groupRowsByKey(rows, signature);
    const summaries = [];
    for (const [sig, members] of groups) {
        const labels = new Set(members.map(row => String(valueOf(row, label))));
        const units = independentUnit
            ? new Set(members.map(row => valueOf(row, independentUnit)).filter(value => value != null).map(String))
            : new Set();
        const summary = {
            signature: sig,
            rows: members.length,
            labels: [...labels].sort(),
            mixed: members.length > 1 && labels.size > 1,
            independentUnits: units.size,
            crossUnit: units.size > 1,
            signatureBytes: byteLengthUtf8(sig),
        };
        if (includeMembers) {
            summary.members = members.map(row => ({
                id: rowId ? valueOf(row, rowId) : null,
                label: valueOf(row, label),
                independentUnit: independentUnit ? valueOf(row, independentUnit) : null,
            }));
        }
        summaries.push(summary);
    }

    const multi = summaries.filter(group => group.rows > 1);
    const mixed = multi.filter(group => group.mixed);
    const crossUnitMulti = multi.filter(group => group.crossUnit);
    const crossUnitMixed = mixed.filter(group => group.crossUnit);
    const sameUnitMixed = mixed.filter(group => !group.crossUnit);
    const signatureBytes = summaries.map(group => group.signatureBytes);

    return {
        rowCount: rows.length,
        distinctSignatures: summaries.length,
        multiMemberGroups: multi.length,
        mixedGroups: mixed.length,
        crossUnitMultiMemberGroups: crossUnitMulti.length,
        crossUnitMixedGroups: crossUnitMixed.length,
        sameUnitMixedGroups: sameUnitMixed.length,
        rowsInMultiMemberGroups: multi.reduce((sum, group) => sum + group.rows, 0),
        rowsInMixedGroups: mixed.reduce((sum, group) => sum + group.rows, 0),
        largestGroupRows: summaries.length ? Math.max(...summaries.map(group => group.rows)) : 0,
        signatureBytes: {
            min: signatureBytes.length ? Math.min(...signatureBytes) : 0,
            max: signatureBytes.length ? Math.max(...signatureBytes) : 0,
            mean: signatureBytes.length
                ? signatureBytes.reduce((sum, value) => sum + value, 0) / signatureBytes.length
                : 0,
        },
        groups: summaries,
    };
}
