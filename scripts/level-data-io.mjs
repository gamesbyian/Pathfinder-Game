/**
 * Shared I/O for the split level/hints artifacts (hardening plan §2).
 *
 * `data/levels.json` holds the authored level definitions and carries NO inline `hints`
 * arrays at rest. The generated hint corpus lives in a per-level companion artifact:
 * `data/hints/<NNN>.json` (NNN = zero-padded 1-based level number) containing that level's
 * FULL hint array — the app lazy-loads it per level via `data.getHints(levelNumber)`.
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
 * The level↔hints join key is the 1-based level number (array index + 1) — see the
 * hardening plan's load-bearing constraint: levels must not be reordered or renumbered.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { stringifyLevelsJson, stringifyCorpusJson } from './level-json-format.mjs';
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

/** Zero-padded per-level hint file name, e.g. 7 → "007.json". */
export function hintFileName(levelNumber) {
    return `${String(levelNumber).padStart(3, '0')}.json`;
}

export function hintFilePathFor(levelsJsonPath, levelNumber) {
    return path.join(hintsDirFor(levelsJsonPath), hintFileName(levelNumber));
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
            const fromArtifact = readLevelHints(levelsJsonPath, i + 1);
            records = (fromArtifact.length > 0 || !inlineRecords) ? fromArtifact : inlineRecords;
        } else {
            records = inlineRecords || [];
        }
        level.hintRecords = records;
        level.hints = hintPaths(records);
    });
    return levels;
}

/** Serializes one level's canonical Hint[] as the on-disk wrapper (schemaVersion 2). */
export function stringifyHints(records) {
    return `${stringifyLevelsJson({ schemaVersion: HINT_SCHEMA_VERSION, hints: records })}\n`;
}

/**
 * Writes the split artifacts from an in-memory levels array (with `.hints`/`.hintRecords`
 * attached): levels.json WITHOUT hints, plus one `hints/<NNN>.json` per level. Per-level files
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
        const filePath = hintFilePathFor(levelsJsonPath, i + 1);
        const next = stringifyHints(records);
        const prev = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
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

/** Lists the hint files present in the artifact dir (sorted), for validators. */
export function listHintFiles(levelsJsonPath) {
    const dir = hintsDirFor(levelsJsonPath);
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((f) => /^\d{3,}\.json$/.test(f)).sort();
}
