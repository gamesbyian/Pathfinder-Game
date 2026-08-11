/** Convert an internal packed solver key (0-based x/y) to raw level coordinates (1-based x/y).
 * cpsat-full-probe.py's --prefix explicitly consumes the raw/witness convention. */
export function unpackPackedCell(key) {
    if (!Number.isInteger(key) || key < 0) throw new Error(`packed cell must be a non-negative integer: ${key}`);
    return [(key & 0xffff) + 1, (key >>> 16) + 1];
}

const validateRawCoordinate = coordinate => {
    if (coordinate.length !== 2 || !coordinate.every(Number.isInteger) || coordinate.some(value => value < 1)) {
        throw new Error(`raw coordinate must contain two positive 1-based integers: ${JSON.stringify(coordinate)}`);
    }
    return coordinate;
};

/** Normalize a case cell to raw 1-based [x,y]. Numeric values are internal packed keys; explicit
 * arrays/objects are already raw-level coordinates, matching witness JSON and the CP-SAT CLI. */
export function normalizeCoordinate(value) {
    if (Number.isInteger(value)) return unpackPackedCell(value);
    if (Array.isArray(value)) return validateRawCoordinate(value.map(Number));
    if (value && 'x' in value && 'y' in value) return validateRawCoordinate([Number(value.x), Number(value.y)]);
    throw new Error(`invalid coordinate/packed-cell value: ${JSON.stringify(value)}`);
}

const stableCaseId = ({ levelId, depth, prefix, child }, index) => {
    const suffix = child == null ? `prefix-${prefix.length}` : `child-${JSON.stringify(normalizeCoordinate(child))}`;
    return `${levelId}:${depth ?? prefix.length - 1}:${suffix}:${index}`;
};

/** Accept either the committed winning-prefix atlas or a generic explicit case document:
 * { corpus, cases: [{ id?, levelId, prefix, child? }] }. Prefix/child cells may be packed solver
 * keys (0-based internally), raw [x,y] coordinate pairs, or raw {x,y}; emitted prefixes are always
 * 1-based [x,y] pairs as expected by cpsat-full-probe.py's --prefix argument. */
export function extractExplicitPrefixCases(document, { format = 'cases', corpus = null } = {}) {
    const defaultCorpus = corpus ?? document.corpus ?? document.levelsFile ?? 'data/stress/stress-levels-random.json';
    let rawCases;
    if (format === 'atlas-abstain') {
        rawCases = (document.levels ?? []).flatMap(level => (level.branches ?? [])
            .filter(row => row.label === 'oracle-abstain')
            .map(row => ({ ...row, levelId: level.levelId })));
    } else if (format === 'cases') {
        if (!Array.isArray(document.cases)) throw new Error('generic case document must contain a cases array');
        rawCases = document.cases;
    } else {
        throw new Error(`unsupported explicit-prefix case format: ${format}`);
    }

    return rawCases.map((row, index) => {
        if (!row.levelId) throw new Error(`case ${index} missing levelId`);
        const rawPrefix = row.prefix ?? row.path;
        if (!Array.isArray(rawPrefix) || rawPrefix.length === 0) throw new Error(`case ${index} missing non-empty prefix`);
        const prefix = rawPrefix.map(normalizeCoordinate);
        if (row.child != null) prefix.push(normalizeCoordinate(row.child));
        return {
            id: row.id ?? stableCaseId({ levelId: row.levelId, depth: row.depth, prefix: rawPrefix, child: row.child }, index),
            levelId: row.levelId,
            corpus: row.corpus ?? defaultCorpus,
            prefix,
            sourceLabel: row.label ?? null,
            depth: row.depth ?? prefix.length - 1,
            source: row.source ?? null,
        };
    });
}

export function classifyProbeProcess({ stdout = '', stderr = '', exitCode = 0 }) {
    const text = `${stdout}\n${stderr}`;
    if (exitCode === 3 || /SKIPPED \(/.test(text)) return { label: 'timeout/abstain', reason: 'unsupported-mechanics' };
    const match = text.match(/->\s+(OPTIMAL|FEASIBLE|INFEASIBLE|UNKNOWN|MODEL_INVALID)\b/);
    const status = match?.[1] ?? null;
    if (status === 'OPTIMAL' || status === 'FEASIBLE') return { label: 'live', reason: status.toLowerCase(), status };
    if (status === 'INFEASIBLE') return { label: 'dead', reason: 'infeasible', status };
    if (status === 'UNKNOWN') return { label: 'timeout/abstain', reason: 'oracle-unknown', status };
    if (status === 'MODEL_INVALID') return { label: 'timeout/abstain', reason: 'model-invalid', status };
    return { label: 'timeout/abstain', reason: exitCode === 0 ? 'unparsed-probe-output' : `probe-exit-${exitCode}`, status };
}

export function parseEmittedPath(stdout) {
    const match = stdout.match(/^PATH\s+(.+)$/m);
    if (!match) return null;
    const path = JSON.parse(match[1]);
    if (!Array.isArray(path)) throw new Error('probe PATH output was not an array');
    return path.map(validateRawCoordinate);
}
