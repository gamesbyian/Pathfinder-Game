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
