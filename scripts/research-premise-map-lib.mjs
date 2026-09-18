import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function readJson(root, relative) {
    return JSON.parse(readFileSync(path.join(root, relative), 'utf8'));
}

export function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') quoted = false;
            else field += ch;
            continue;
        }
        if (ch === '"') quoted = true;
        else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n') {
            row.push(field.replace(/\r$/u, ''));
            rows.push(row);
            row = [];
            field = '';
        } else field += ch;
    }
    if (field.length || row.length) {
        row.push(field.replace(/\r$/u, ''));
        rows.push(row);
    }
    if (!rows.length) return [];
    const header = rows[0].map(value => value.trim());
    return rows.slice(1)
        .filter(values => values.some(value => value !== ''))
        .map(values => Object.fromEntries(header.map((name, index) => [name, values[index] ?? ''])));
}

export function loadLatestPremiseSnapshot(root = process.cwd()) {
    for (const relative of [
        'docs/solver-premise-map-snapshot-v2.json',
        'docs/solver-premise-map-snapshot-v1.json',
    ]) {
        if (existsSync(path.join(root, relative))) {
            return { relative, snapshot: readJson(root, relative) };
        }
    }
    return null;
}

function normalizeRelationRows(document, sourceFile) {
    if (Array.isArray(document?.edges)) {
        return document.edges.map(([from, to], index) => ({
            from,
            type: 'UNTYPED_ANCESTRY',
            to,
            note: null,
            sourceFile,
            sourceIndex: index,
        }));
    }
    if (Array.isArray(document?.typedEdges)) {
        return document.typedEdges.map((edge, index) => ({
            from: edge.source,
            type: edge.relation,
            to: edge.target,
            note: edge.note ?? null,
            sourceFile,
            sourceIndex: index,
        }));
    }
    if (Array.isArray(document?.relations)) {
        return document.relations.map((edge, index) => ({
            from: edge.from ?? edge.source,
            type: edge.type ?? edge.relation,
            to: edge.to ?? edge.target,
            note: edge.note ?? null,
            sourceFile,
            sourceIndex: index,
        }));
    }
    return [];
}

export function loadPremiseMap(root = process.cwd()) {
    const latest = loadLatestPremiseSnapshot(root);
    if (!latest) {
        return {
            snapshot: null,
            snapshotFile: null,
            premises: [],
            edges: [],
        };
    }

    const { snapshot, relative: snapshotFile } = latest;
    const premisesById = new Map();
    for (const sourceFile of snapshot.canonicalPremiseFiles ?? []) {
        const absolute = path.join(root, sourceFile);
        if (!existsSync(absolute)) throw new Error(`premise snapshot references missing premise file: ${sourceFile}`);
        for (const row of parseCsv(readFileSync(absolute, 'utf8'))) {
            const id = String(row.id ?? '').trim();
            if (!id) throw new Error(`premise row without id in ${sourceFile}`);
            if (premisesById.has(id)) throw new Error(`duplicate premise id ${id} across active premise files`);
            premisesById.set(id, {
                ...row,
                premiseId: id,
                _premiseSource: sourceFile,
            });
        }
    }

    const edges = [];
    for (const sourceFile of snapshot.relationFiles ?? []) {
        const absolute = path.join(root, sourceFile);
        if (!existsSync(absolute)) throw new Error(`premise snapshot references missing relation file: ${sourceFile}`);
        edges.push(...normalizeRelationRows(readJson(root, sourceFile), sourceFile));
    }

    return {
        snapshot,
        snapshotFile,
        premises: [...premisesById.values()].sort((a, b) => a.premiseId.localeCompare(b.premiseId)),
        edges: edges.map(edge => ({
            ...edge,
            fromKind: /^P\d+$/u.test(String(edge.from)) ? 'premise' : 'external-concept',
            toKind: /^P\d+$/u.test(String(edge.to)) ? 'premise' : 'external-concept',
        })),
    };
}
