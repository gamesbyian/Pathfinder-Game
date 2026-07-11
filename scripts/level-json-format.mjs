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
 * drifts from this) AND for every hint artifact (data/hints/<NNNNN>.json,
 * data/stress/hints/<NNNNN>.json, data/stress/hints-random/<NNNNN>.json — see
 * scripts/level-data-io.mjs's stringifyHints). Each RECORD (a level, or a Hint) is serialized as
 * one single-line, fully-compact JSON object, one per line — so a change to one record's diff is
 * exactly one line, regardless of how large the record itself is or how many other records sit in
 * the same file. A hint-workbench run that appends one newly-discovered hint, or that adds a
 * provenance entry to an already-known one, now touches exactly one line, the same way editing one
 * level always has. This is deliberately *not* the same as minifying the whole file to one line
 * (unreadable, and a diff on a single multi-megabyte line is just as unreviewable as one that's
 * pretty-printed across hundreds of lines) or pretty-printing every record's internal structure
 * (the old format for both — a single field change on one record touched dozens of lines; for a
 * Hint specifically, its nested `provenance[].{solver,search,context}` sub-objects made this
 * *worse* than a plain level, not just as bad).
 *
 * Accepts either shape actually used by these files: a bare array (data/levels.json) or a wrapper
 * object whose own top-level metadata fields (generatedAt, generatorVersion, batches,
 * schemaVersion, ...) are pretty-printed normally, with only the record array getting the
 * one-per-line treatment. `recordsField` names which top-level array holds the records —
 * `'levels'` (the default, for the 3 corpora) or `'hints'` (for hint artifacts) — deliberately not
 * inferred, so a wrapper that happens to carry both kinds of array (none currently do) can't
 * silently compact the wrong one.
 */
export function stringifyCorpusJson(value, recordsField = 'levels') {
    const indent = 2;
    const pad = depth => ' '.repeat(indent * depth);

    function serRecordsArray(records, depth) {
        if (records.length === 0) return '[]';
        const items = records.map(record => `${pad(depth + 1)}${JSON.stringify(record)}`);
        return `[\n${items.join(',\n')}\n${pad(depth)}]`;
    }

    // Generic pretty-printer for everything that ISN'T the records array itself (a corpus's own
    // generatedAt/generatorVersion/batches/... metadata, or a hint file's schemaVersion) — mirrors
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
        body = serRecordsArray(value, 0);
    } else {
        const keys = Object.keys(value);
        const items = keys.map(k => {
            const rendered = (k === recordsField && Array.isArray(value[k]))
                ? serRecordsArray(value[k], 1)
                : serGeneric(value[k], 1);
            return `${pad(1)}${JSON.stringify(k)}: ${rendered}`;
        });
        body = keys.length === 0 ? '{}' : `{\n${items.join(',\n')}\n}`;
    }
    return `${body}\n`;
}
