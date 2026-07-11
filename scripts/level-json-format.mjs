/**
 * Pretty-prints level JSON like `JSON.stringify(value, null, 2)`, except
 * arrays whose elements are all primitives (numbers/strings/booleans/null)
 * are kept on a single line instead of one element per line. This keeps
 * level objects (grid, gates, blocks, ...) human-readable while collapsing
 * `hints` path arrays — which can run 30-60+ integers long — from dozens of
 * lines down to one.
 */
export function stringifyLevelsJson(value, indent = 2) {
    const pad = depth => ' '.repeat(indent * depth);
    const isFlatArray = arr => arr.every(v => v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean');

    function ser(v, depth) {
        if (v === null || typeof v !== 'object') return JSON.stringify(v);
        if (Array.isArray(v)) {
            if (v.length === 0) return '[]';
            if (isFlatArray(v)) return `[${v.map(x => JSON.stringify(x)).join(',')}]`;
            const items = v.map(x => `${pad(depth + 1)}${ser(x, depth + 1)}`);
            return `[\n${items.join(',\n')}\n${pad(depth)}]`;
        }
        const keys = Object.keys(v);
        if (keys.length === 0) return '{}';
        const items = keys.map(k => `${pad(depth + 1)}${JSON.stringify(k)}: ${ser(v[k], depth + 1)}`);
        return `{\n${items.join(',\n')}\n${pad(depth)}}`;
    }

    return ser(value, 0);
}

/**
 * The enforced on-disk format for all 3 local level corpora (data/levels.json,
 * data/stress/stress-levels.json, data/stress/stress-levels-random.json — see CLAUDE.md's
 * Repository Layout and scripts/check-corpus-level-formatting.mjs, which fails CI if any of them
 * drifts from this). Each LEVEL is serialized as one single-line, fully-compact JSON object, one
 * per line — so a change to one level's diff is exactly one line, regardless of how large the
 * level object itself is or how many other levels sit in the same file. This is deliberately
 * *not* the same as minifying the whole file to one line (unreadable, and a diff on a single
 * multi-megabyte line is just as unreviewable as one that's pretty-printed across hundreds of
 * lines) or pretty-printing every level's internal structure (the old data/levels.json format —
 * a single field change on one level touched dozens of lines).
 *
 * Accepts either shape actually used by these files: a bare array (data/levels.json) or a
 * wrapper object whose own top-level metadata fields (generatedAt, generatorVersion, batches,
 * ...) are pretty-printed normally, with only its `levels` array getting the one-line-per-level
 * treatment (the two stress corpora).
 */
export function stringifyCorpusJson(value) {
    const indent = 2;
    const pad = depth => ' '.repeat(indent * depth);

    function serLevelsArray(levels, depth) {
        if (levels.length === 0) return '[]';
        const items = levels.map(level => `${pad(depth + 1)}${JSON.stringify(level)}`);
        return `[\n${items.join(',\n')}\n${pad(depth)}]`;
    }

    // Generic pretty-printer for everything that ISN'T the levels array itself (a stress
    // corpus's own generatedAt/generatorVersion/batches/... metadata) — mirrors
    // stringifyLevelsJson's rules (flat primitive arrays collapse to one line).
    function serGeneric(v, depth) {
        if (v === null || typeof v !== 'object') return JSON.stringify(v);
        if (Array.isArray(v)) {
            if (v.length === 0) return '[]';
            const isFlatArray = v.every(x => x === null || typeof x !== 'object');
            if (isFlatArray) return `[${v.map(x => JSON.stringify(x)).join(',')}]`;
            const items = v.map(x => `${pad(depth + 1)}${serGeneric(x, depth + 1)}`);
            return `[\n${items.join(',\n')}\n${pad(depth)}]`;
        }
        const keys = Object.keys(v);
        if (keys.length === 0) return '{}';
        const items = keys.map(k => `${pad(depth + 1)}${JSON.stringify(k)}: ${serGeneric(v[k], depth + 1)}`);
        return `{\n${items.join(',\n')}\n${pad(depth)}}`;
    }

    let body;
    if (Array.isArray(value)) {
        body = serLevelsArray(value, 0);
    } else {
        const keys = Object.keys(value);
        const items = keys.map(k => {
            const rendered = (k === 'levels' && Array.isArray(value[k]))
                ? serLevelsArray(value[k], 1)
                : serGeneric(value[k], 1);
            return `${pad(1)}${JSON.stringify(k)}: ${rendered}`;
        });
        body = keys.length === 0 ? '{}' : `{\n${items.join(',\n')}\n}`;
    }
    return `${body}\n`;
}
