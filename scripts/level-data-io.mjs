/**
 * Shared I/O for the split level/hints artifacts (hardening plan §2).
 *
 * `data/levels.json` holds the authored level definitions and carries NO inline `hints`
 * arrays at rest. The generated hint corpus lives in a per-level companion artifact:
 * `data/hints/<id>.json` (`id` = the level's own permanent identity — see below) containing that
 * level's FULL hint array — the app lazy-loads it per level via `data.getHints(level)`.
 *
 * On disk, each hint file is the canonical `{ schemaVersion: 3, hints: Hint[] }` shape
 * (domain/hint-types.ts): every hint is `{ path, provenance }`, where `provenance` is the list
 * of every independent find of that exact path (solver/search/context detail — see
 * HintProvenanceEntry) — see CLAUDE.md's hint-provenance section. Legacy bare-array files, the
 * transitional stress-corpus `hintMetadata` wrapper, and this schema's earlier flat provenance-
 * entry shape (schemaVersion 2) are all auto-upgraded on read.
 *
 * Every Node tool that consumes or produces hints goes through this module so the split
 * stays consistent: read with `readLevelsWithHints()` (levels get BOTH `.hints` — plain
 * `number[][]` paths, the shape existing tools always worked on — and `.hintRecords` — the
 * canonical `Hint[]` with provenance, for tools that attach it); write with
 * `writeLevelsWithHints()` (strips both back out of levels.json and updates only the per-level
 * files that changed). A tool that only touches `.hints` (appends bare paths, no `.hintRecords`
 * update) is safe: `writeLevelsWithHints` reconciles by path signature and simply records no
 * provenance for a path it can't find a matching `.hintRecords` entry for, rather than losing
 * the path or crashing.
 *
 * The level↔hints join key is the level's own persistent `id` string when it has one (every level
 * in all 3 real corpora, post-2026-07-15 — "P00042" published, "S00028"/"R00028" stress —
 * assigned once at generation/backfill/import time, never reused even across deletions; see
 * scripts/stress/generate*.mjs, scripts/backfill-level-ids.mjs, scripts/import-published-levels.mjs's
 * makeLevelIdMinter), else its 1-based array position (a level with no id yet — an editor draft,
 * or a Firestore `published_levels` staging doc not yet pulled in by `levels:import-published` —
 * see docs/level-id-unification-plan.md, which also explains why this was previously
 * position-only for every real corpus: reordering the array silently misattributed hints, an
 * invariant the stress corpora's own `id` field turned out not to actually be protecting against
 * at first, since it was never used as the storage key). `hintKeyForLevel()` is the single place
 * this fallback lives — falling back to position only when `id` is absent means every corpus goes
 * through the same code path, and a level automatically starts using its own id, with zero code
 * changes here, the moment it gets one. An id is used **verbatim** as the filename (e.g.
 * "S00028.json"), not stripped to a bare number: Corpus 1 mixes S- and R-prefixed ids (from the
 * historical random-corpus migration) whose numeric suffixes collide — S00064 and R00064 both
 * exist — so only the full id string is actually unique.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { stringifyCorpusJson } from './level-json-format.mjs';
import { hintPaths, reconcileHints, toHint, upgradeLegacyHints, upgradeProvenanceEntry } from '../modules/domain/hint-types.ts';

const LEVEL_WRAPPERS = new WeakMap();
const HINT_SCHEMA_VERSION = 3;

/**
 * The hints directory that accompanies a levels.json path: sibling `hints/` dir, keyed off the
 * levels file's own basename so every corpus follows the same `<dir-of-levels-json>/hints[-x]/`
 * convention. Corpus 1 (`stress-levels.json`) and corpus 2 (`stress-levels-random.json`) share a
 * parent directory (`data/stress/`) but both number levels 1..N independently, so corpus 2 gets
 * its own sibling `hints-random/` to avoid colliding with corpus 1's `hints/`.
 */
export function hintsDirFor(levelsJsonPath) {
    const base = path.basename(levelsJsonPath, '.json');
    const dirName = base === 'stress-levels-random' ? 'hints-random' : 'hints';
    return path.join(path.dirname(levelsJsonPath), dirName);
}

/** Per-level hint file name from a join key: a number is zero-padded (e.g. 7 → "00007.json",
 *  published levels' array position); a string is used verbatim (e.g. "S00028" → "S00028.json",
 *  a stress-corpus level's own id) — see hintKeyForLevel() for which one a given level gets. */
export function hintFileName(key) {
    return typeof key === 'string' ? `${key}.json` : `${String(key).padStart(5, '0')}.json`;
}

export function hintFilePathFor(levelsJsonPath, key) {
    return path.join(hintsDirFor(levelsJsonPath), hintFileName(key));
}

/** The join key used for a level's hint filename — see the module doc comment for the full
 *  rationale. The level's own `id` string when present, else its 1-based array `position`. */
export function hintKeyForLevel(level, position) {
    return (typeof level?.id === 'string' && level.id) ? level.id : position;
}

/**
 * Parses one hint file's already-JSON.parse()'d contents into canonical Hint[], upgrading
 * whatever legacy shape it finds:
 *   - bare `number[][]` (the original published-corpus format) → empty-provenance Hints;
 *   - the transitional stress-corpus `{schemaVersion:1, hints, hintMetadata}` wrapper (parallel
 *     array, index-aligned) → zipped into each hint's `provenance` via upgradeProvenanceEntry;
 *   - this schema's earlier flat provenance-entry shape (`{schemaVersion:2, hints: Hint[]}`,
 *     `provenance[i] = {technique, nodesExpanded, solveTimeMs, foundAt}`) → each entry upgraded
 *     to the current nested {solver,search,context,foundAt} shape;
 *   - the current canonical `{schemaVersion:3, hints: Hint[]}` wrapper → passed through.
 */
export function parseHintFileContents(parsed, filePath) {
    if (Array.isArray(parsed)) return upgradeLegacyHints(parsed);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.hints)) {
        if (Array.isArray(parsed.hintMetadata)) {
            return parsed.hints.map((hintPath, i) => {
                const meta = parsed.hintMetadata[i];
                return toHint(hintPath, meta ? [upgradeProvenanceEntry(meta)] : []);
            });
        }
        return upgradeLegacyHints(parsed.hints);
    }
    throw new Error(`${filePath} must contain a JSON array of hint paths or an object with a hints array`);
}

/** Reads one level's full hint array from the artifact (canonical Hint[]); [] when the file
 *  doesn't exist. Auto-upgrades legacy file shapes — see parseHintFileContents. */
export function readLevelHints(levelsJsonPath, levelNumber) {
    const filePath = hintFilePathFor(levelsJsonPath, levelNumber);
    if (!existsSync(filePath)) return [];
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return parseHintFileContents(parsed, filePath);
}

/**
 * Reads levels.json and re-attaches each level's hints from the artifact, returning the
 * combined shape the hint tools operate on: `.hints` (plain `number[][]` paths, backward
 * compatible with every existing path-signature/novelty tool) AND `.hintRecords` (canonical
 * `Hint[]` with provenance, for tools that attach it). A level that already carries inline
 * hints (e.g. a not-yet-split fixture passed via --levels-json) keeps them; artifact hints win
 * when both exist.
 */
export function readLevelsWithHints(levelsJsonPath) {
    const parsed = JSON.parse(readFileSync(levelsJsonPath, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) throw new Error(`${levelsJsonPath} must contain a JSON array of levels or an object with a levels array`);
    if (!Array.isArray(parsed)) LEVEL_WRAPPERS.set(levels, parsed);
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
        level.hintRecords = records;
        level.hints = hintPaths(records);
    });
    return levels;
}

/** Serializes one level's canonical Hint[] as the on-disk wrapper (schemaVersion 3) — one
 *  compact-JSON Hint per line (stringifyCorpusJson's recordsField='hints'), the same
 *  one-record-per-line discipline the 3 level corpora already use, so appending one hint (or
 *  adding a provenance entry to an already-known one) touches exactly one line. */
export function stringifyHints(records) {
    return stringifyCorpusJson({ schemaVersion: HINT_SCHEMA_VERSION, hints: records }, 'hints');
}

/**
 * Writes the split artifacts from an in-memory levels array (with `.hints`/`.hintRecords`
 * attached): levels.json WITHOUT hints, plus one `hints/<id>.json` per level. Per-level files
 * are only rewritten when their content changed, so timestamps/diffs stay minimal.
 * Returns { levelsChanged, hintFilesChanged }.
 */
export function writeLevelsWithHints(levelsJsonPath, levels) {
    if (!Array.isArray(levels)) throw new Error('levels must be an array');
    const dir = hintsDirFor(levelsJsonPath);
    mkdirSync(dir, { recursive: true });

    let hintFilesChanged = 0;
    levels.forEach((level, i) => {
        const records = reconcileHints(Array.isArray(level?.hints) ? level.hints : [], level?.hintRecords);
        const filePath = hintFilePathFor(levelsJsonPath, hintKeyForLevel(level, i + 1));
        const fileExists = existsSync(filePath);
        // Never create a NEW file for a level with zero hints — the on-disk hints directory is
        // deliberately sparse (only levels a discovery tool has actually found something for get
        // a file; see data/stress/README.md and CLAUDE.md's hint-provenance section). An existing
        // file whose hints all got pruned to zero is still rewritten (truncated), not deleted —
        // that's a real content change on a level that DID have a file, distinct from never
        // creating one in the first place.
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
    const wrapper = LEVEL_WRAPPERS.get(levels);
    const output = wrapper ? { ...wrapper, levels: stripped } : stripped;
    const prevLevels = existsSync(levelsJsonPath) ? readFileSync(levelsJsonPath, 'utf8') : null;
    // One level per line, enforced for all 3 local corpora (see stringifyCorpusJson's docstring
    // and scripts/check-corpus-level-formatting.mjs) — a change to one level's diff is exactly
    // one line, whether the file has 156 levels or 1700.
    const nextLevels = stringifyCorpusJson(output);
    const levelsChanged = prevLevels !== nextLevels;
    if (levelsChanged) writeFileSync(levelsJsonPath, nextLevels);

    return { levelsChanged, hintFilesChanged };
}

/** Lists the hint files present in the artifact dir (sorted), for validators. Matches both
 *  position-based names (published, "00007.json") and id-based names (stress corpora,
 *  "S00028.json" / "R00028.json" — an optional single letter prefix, since that's every id shape
 *  scripts/stress/generate*.mjs has ever produced). */
export function listHintFiles(levelsJsonPath) {
    const dir = hintsDirFor(levelsJsonPath);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => /^[A-Za-z]?\d{3,}\.json$/.test(f)).sort();
}

/**
 * Resolves a `--levels=` CLI spec into a Set of 1-based array positions — the shared parser for
 * every corpus-capable tool's level-selection flag (solution-profile.mjs, solution-profile-
 * compare.mjs, hint-corpus-expand.mjs), so "which levels does --levels=64 mean" can't drift
 * between tools the way it had before (each had grown its own copy).
 *
 * Deliberately resolves to POSITIONS, not ids: every consumer's downstream data model (solution
 * profiles keyed by `level: <position>`, hint-corpus-expand's `rawLevels[levelNumber - 1]`, ...)
 * is position-indexed throughout, and staying that way means this function is the only thing that
 * needs to know about ids — nothing downstream does.
 *
 * Accepts, per comma-separated part:
 *   - a bare position number or range ("5", "1-10") — always valid, any corpus.
 *   - for a corpus whose levels carry an `id` field (both stress corpora): a full id string,
 *     case-insensitive ("S00028", "r39"), used verbatim; or a bare number/range auto-matched
 *     against EVERY distinct id prefix+width the corpus actually uses — not just whichever prefix
 *     the corpus's first level happens to have. This matters because Corpus 1 mixes S-/R-prefixed
 *     ids (levels migrated in from the original random corpus kept their own R-prefixed identity),
 *     so a bare "64" means BOTH S00064 and R00064 there, not just one of them.
 *
 * `'all'` or an empty spec selects every level.
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
    const addNumber = (n) => {
        if (!hasIds) { addPosition(n); return; }
        for (const { prefix, width } of idShapes) {
            const pos = positionById.get(`${prefix}${String(n).padStart(width, '0')}`);
            if (pos !== undefined) wanted.add(pos);
        }
    };

    for (const part of spec.split(',')) {
        const t = part.trim();
        if (!t) continue;
        if (/^\D+\d+$/i.test(t)) {
            const pos = positionById.get(t.toUpperCase());
            if (pos !== undefined) wanted.add(pos);
            continue;
        }
        if (t.includes('-')) {
            const [from, to] = t.split('-').map((v) => Number(v.trim()));
            if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
            const step = from <= to ? 1 : -1;
            for (let n = from; step > 0 ? n <= to : n >= to; n += step) addNumber(n);
        } else {
            const n = Number(t);
            if (Number.isFinite(n)) addNumber(n);
        }
    }
    return wanted;
}
