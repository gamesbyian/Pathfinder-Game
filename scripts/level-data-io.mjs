/**
 * Shared I/O for split level/hint artifacts. Level JSON has no hints at rest; per-level files hold
 * canonical schema-v4 Hint artifacts (sparse-inline or interned). Reads retain v1-v3 compatibility
 * and attach `.hintRecords`
 * as canonical mutable state plus derived `.hints` bare paths. Writes strip both from level JSON and
 * persist only levels named in an explicit hint write set. Hint files use persistent level ids
 * verbatim when present, else 1-based position.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { stringifyCorpusJson } from './level-json-format.mjs';
import { setLevelHintRecords, upgradeLegacyHints, decodeHintArtifact, encodeHintArtifact } from '../modules/domain/hint-runtime.mjs';
import { hintDirectoryNameForLevelsFile, hintArtifactFileName, hintKeyForLevel as canonicalHintKeyForLevel, isHintArtifactFileName } from '../modules/hint-artifact-layout.mjs';


/** Sibling hint directory derived by the shared browser/Node artifact-layout authority. */
export function hintsDirFor(levelsJsonPath) {
    return path.join(path.dirname(levelsJsonPath), hintDirectoryNameForLevelsFile(levelsJsonPath));
}

/** Compatibility export for existing Node callers; naming semantics live in hint-artifact-layout.mjs. */
export function hintFileName(key) {
    return hintArtifactFileName(key);
}

export function hintFilePathFor(levelsJsonPath, key) {
    return path.join(hintsDirFor(levelsJsonPath), hintFileName(key));
}

/** Compatibility export for existing Node callers; identity semantics live in hint-artifact-layout.mjs. */
export function hintKeyForLevel(level, position) {
    return canonicalHintKeyForLevel(level, position);
}

/** Parse current or legacy hint-file shapes into canonical Hint[]. Delegates to the shared
 *  browser/Node decode boundary (decodeHintArtifact, modules/domain/hint-runtime.mjs) so this
 *  Node-side reader and the browser's modules/data-asset-loaders.ts cannot silently diverge on
 *  which physical shapes they understand -- see that function's own doc for why this mattered. */
export function parseHintFileContents(parsed, filePath) {
    try {
        return decodeHintArtifact(parsed);
    } catch {
        throw new Error(`${filePath} must contain a JSON array of hint paths or an object with a hints array`);
    }
}

/** Read one level's canonical hints; missing file means no hints. */
export function readLevelHints(levelsJsonPath, levelNumber) {
    const filePath = hintFilePathFor(levelsJsonPath, levelNumber);
    if (!existsSync(filePath)) return [];
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return parseHintFileContents(parsed, filePath);
}

// Backward-compatible script import surface while the canonical owner lives in hint-runtime.mjs.
export { setLevelHintRecords };

function hydrateLevelHints(levelsJsonPath, levels) {
    const dir = hintsDirFor(levelsJsonPath);
    levels.forEach((level, i) => {
        if (!level || typeof level !== 'object') return;
        const inlineRecords = Array.isArray(level.hints) ? upgradeLegacyHints(level.hints) : null;
        let records;
        if (existsSync(dir)) {
            const fromArtifact = readLevelHints(levelsJsonPath, hintKeyForLevel(level, i + 1));
            records = (fromArtifact.length > 0 || !inlineRecords) ? fromArtifact : inlineRecords;
        } else {
            records = inlineRecords || [];
        }
        setLevelHintRecords(level, records);
    });
    return levels;
}

/**
 * Explicit corpus-document reader. The in-memory contract is always one object:
 *   { levels, metadata, storageShape }
 *
 * Bare-array corpora remain readable, but their storage shape is explicit rather than hidden in
 * array identity. Wrapped corpora preserve every top-level field other than levels in metadata.
 */
export function readLevelCorpusDocumentWithHints(levelsJsonPath) {
    const parsed = JSON.parse(readFileSync(levelsJsonPath, 'utf8'));
    const storageShape = Array.isArray(parsed) ? 'array' : 'object';
    const levels = storageShape === 'array' ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) {
        throw new Error(`${levelsJsonPath} must contain a JSON array of levels or an object with a levels array`);
    }
    const metadata = storageShape === 'object'
        ? Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== 'levels'))
        : {};
    hydrateLevelHints(levelsJsonPath, levels);
    return { levels, metadata, storageShape };
}

/** Serialize canonical semantic Hint[] through the current deterministic physical codec, retaining
 * one logical Hint record per line for reviewability. */
export function stringifyHints(records) {
    return stringifyCorpusJson(encodeHintArtifact(records), 'hints');
}

/**
 * Persist level JSON without inline hints plus ONLY the per-level hint files explicitly named by
 * changedHintLevels. This write set is a correctness boundary for concurrent shard writers: a
 * process may hold a stale full-corpus snapshot, but it cannot rewrite hint files for levels it did
 * not declare as changed. Object identity here expresses caller-owned write intent; it is never
 * inferred from read-time references. New zero-hint files are not created; existing emptied files
 * remain.
 */
export function writeLevelCorpusDocumentWithHints(levelsJsonPath, document, { changedHintLevels = [] } = {}) {
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('corpus document must be an object');
    const { levels, metadata = {}, storageShape = 'object' } = document;
    if (!Array.isArray(levels)) throw new Error('corpus document levels must be an array');
    if (storageShape !== 'array' && storageShape !== 'object') throw new Error('corpus document storageShape must be "array" or "object"');
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('corpus document metadata must be an object');

    const dir = hintsDirFor(levelsJsonPath);
    mkdirSync(dir, { recursive: true });

    const changedLevels = changedHintLevels instanceof Set ? changedHintLevels : new Set(changedHintLevels);
    for (const level of changedLevels) {
        if (!levels.includes(level)) throw new Error('changedHintLevels contains a level outside corpus document levels');
    }

    let hintFilesChanged = 0;
    levels.forEach((level, i) => {
        if (!changedLevels.has(level)) return;
        const filePath = hintFilePathFor(levelsJsonPath, hintKeyForLevel(level, i + 1));
        const fileExists = existsSync(filePath);

        // Current mutation is single-authority: hintRecords is canonical persisted state and
        // hints is only its derived in-memory view. Historical bare paths are upgraded during
        // read/hydration, never reconciled back into a fresh write here.
        const records = Array.isArray(level?.hintRecords) ? level.hintRecords : [];
        if (records.length === 0 && !fileExists) return;
        const next = stringifyHints(records);
        const prev = fileExists ? readFileSync(filePath, 'utf8') : null;
        if (prev !== next) {
            writeFileSync(filePath, next);
            hintFilesChanged += 1;
        }
    });

    const stripped = levels.map((level) => {
        if (!level || typeof level !== 'object') return level;
        const { hints: _hints, hintRecords: _hintRecords, ...rest } = level;
        return rest;
    });
    const output = storageShape === 'object' ? { ...metadata, levels: stripped } : stripped;
    const prevLevels = existsSync(levelsJsonPath) ? readFileSync(levelsJsonPath, 'utf8') : null;
    const nextLevels = stringifyCorpusJson(output);
    const levelsChanged = prevLevels !== nextLevels;
    if (levelsChanged) writeFileSync(levelsJsonPath, nextLevels);

    return { levelsChanged, hintFilesChanged };
}

/** Sorted hint artifact filenames accepted by validators. */
export function listHintFiles(levelsJsonPath) {
    const dir = hintsDirFor(levelsJsonPath);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter(isHintArtifactFileName).sort();
}

/** Bare numeric/range `--levels` specs are ambiguous and rejected. */
export class AmbiguousLevelSpecError extends Error {}

export const LEVEL_SPEC_PREFIX_HELP =
    '--levels=<spec> selects by explicit prefix: "pos:5", "pos:1-10" (1-based array position) or ' +
    '"id:5", "id:1-10" (id-suffix lookup, where supported). A full id string ("R00237") needs no ' +
    'prefix. "all" or omitting the flag selects every level. Bare numbers ("5", "1-10") are ' +
    'rejected — see CLAUDE.md\'s "--levels selector semantics" gotcha for why.';

function ambiguousBareNumberError(token) {
    return new AmbiguousLevelSpecError(
        `--levels: "${token}" is ambiguous (position or id?) — prefix it: "pos:${token}" or "id:${token}". ${LEVEL_SPEC_PREFIX_HELP}`,
    );
}

/**
 * Resolve a corpus-aware level spec to 1-based array positions. Accepts `pos:`, numeric `id:`
 * suffixes across every id prefix/width present, and full ids. Bare numbers/ranges throw. `all` or
 * empty selects every level. Returning positions keeps downstream tools position-indexed.
 */
export function parseLevelSelector(levels, spec) {
    if (!spec || spec === 'all') return new Set(levels.map((_, i) => i + 1));

    const positionById = new Map();
    const idShapes = [];
    const seenShapes = new Set();
    levels.forEach((level, i) => {
        if (typeof level?.id !== 'string') return;
        positionById.set(level.id.toUpperCase(), i + 1);
        const m = /^(\D+)(\d+)$/.exec(level.id);
        if (!m) return;
        const shapeKey = `${m[1].toUpperCase()}:${m[2].length}`;
        if (!seenShapes.has(shapeKey)) { seenShapes.add(shapeKey); idShapes.push({ prefix: m[1].toUpperCase(), width: m[2].length }); }
    });
    const hasIds = idShapes.length > 0;

    const wanted = new Set();
    const addPosition = (n) => { if (Number.isFinite(n) && n >= 1 && n <= levels.length) wanted.add(n); };
    const addIdNumber = (n) => {
        if (!hasIds) { addPosition(n); return; }
        for (const { prefix, width } of idShapes) {
            const pos = positionById.get(`${prefix}${String(n).padStart(width, '0')}`);
            if (pos !== undefined) wanted.add(pos);
        }
    };
    const addRange = (from, to, add) => {
        if (!Number.isFinite(from) || !Number.isFinite(to)) return;
        const step = from <= to ? 1 : -1;
        for (let n = from; step > 0 ? n <= to : n >= to; n += step) add(n);
    };

    for (const part of spec.split(',')) {
        const t = part.trim();
        if (!t) continue;
        // Prefixes must be checked before the full-id pattern: `pos:2` itself matches \D+\d+.
        const posMatch = /^pos:(.+)$/i.exec(t);
        const idMatch = /^id:(.+)$/i.exec(t);
        if (posMatch) {
            const body = posMatch[1];
            if (body.includes('-')) { const [from, to] = body.split('-').map((v) => Number(v.trim())); addRange(from, to, addPosition); }
            else addPosition(Number(body));
            continue;
        }
        if (idMatch) {
            const body = idMatch[1];
            if (body.includes('-')) { const [from, to] = body.split('-').map((v) => Number(v.trim())); addRange(from, to, addIdNumber); }
            else addIdNumber(Number(body));
            continue;
        }
        if (/^\D+\d+$/i.test(t)) {
            const pos = positionById.get(t.toUpperCase());
            if (pos !== undefined) wanted.add(pos);
            continue;
        }
        if (t.includes('-')) {
            const [fromStr, toStr] = t.split('-').map((v) => v.trim());
            if (Number.isFinite(Number(fromStr)) && Number.isFinite(Number(toStr))) throw ambiguousBareNumberError(t);
            continue;
        }
        const n = Number(t);
        if (Number.isFinite(n)) throw ambiguousBareNumberError(t);
    }
    return wanted;
}

/** Corpus-aware selector returning filtered level objects rather than positions. */
export function selectLevelsBySpec(levels, spec) {
    const positions = parseLevelSelector(levels, spec);
    return levels.filter((_, i) => positions.has(i + 1));
}

/**
 * Position-only `--levels` parser. Every token requires `pos:`; `id:` and bare numbers throw.
 * With maxLevel, returns a bounded number[] (`sorted` default true); without maxLevel, `all` returns
 * null and explicit specs return an unbounded Set<number>.
 */
function stripPositionPrefix(token) {
    const posMatch = /^pos:(.+)$/i.exec(token);
    if (posMatch) return posMatch[1];
    if (/^id:/i.test(token)) {
        throw new AmbiguousLevelSpecError(
            `--levels: "${token}" — this tool selects by array position only ("pos:${token.slice(3)}"); ` +
            `id: lookup isn't supported here. ${LEVEL_SPEC_PREFIX_HELP}`,
        );
    }
    throw ambiguousBareNumberError(token);
}

export function parseLevelPositions(spec, options = {}) {
    const { maxLevel, sorted = true } = options;
    if (maxLevel !== undefined) {
        if (!spec || spec === 'all') return Array.from({ length: maxLevel }, (_, i) => i + 1);
        const seen = new Set();
        const out = [];
        const add = (n) => {
            if (Number.isFinite(n) && n >= 1 && n <= maxLevel && !seen.has(n)) { seen.add(n); out.push(n); }
        };
        for (const part of spec.split(',')) {
            const raw = part.trim();
            if (!raw) continue;
            const t = stripPositionPrefix(raw);
            if (t.includes('-')) {
                const [from, to] = t.split('-').map((v) => Number(v.trim()));
                if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
                if (sorted) {
                    for (let n = Math.min(from, to); n <= Math.max(from, to); n++) add(n);
                } else {
                    const step = from <= to ? 1 : -1;
                    for (let n = from; step > 0 ? n <= to : n >= to; n += step) add(n);
                }
            } else add(Number(t));
        }
        return sorted ? out.sort((a, b) => a - b) : out;
    }
    if (!spec || spec === 'all') return null;
    const set = new Set();
    for (const part of spec.split(',')) {
        const raw = part.trim();
        if (!raw) continue;
        const t = stripPositionPrefix(raw);
        if (t.includes('-')) {
            const [a, b] = t.split('-').map((v) => Number(v.trim()));
            if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
            for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
        } else {
            const n = Number(t);
            if (Number.isFinite(n) && n > 0) set.add(n);
        }
    }
    return set;
}
