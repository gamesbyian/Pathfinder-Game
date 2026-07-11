/**
 * Shared I/O for the split level/hints artifacts (hardening plan §2).
 *
 * `data/levels.json` holds the authored level definitions and carries NO inline `hints`
 * arrays at rest. The generated hint corpus lives in a per-level companion artifact:
 * `data/hints/<NNN>.json` (NNN = zero-padded 1-based level number) containing that level's
 * FULL hint array — the app lazy-loads it per level via `data.getHints(levelNumber)`.
 *
 * Every Node tool that consumes or produces hints goes through this module so the split
 * stays consistent: read with `readLevelsWithHints()` (levels with `.hints` re-attached,
 * the shape the tools always worked on), write with `writeLevelsWithHints()` (strips
 * `hints` back out of levels.json and updates only the per-level files that changed).
 *
 * The level↔hints join key is the 1-based level number (array index + 1) — see the
 * hardening plan's load-bearing constraint: levels must not be reordered or renumbered.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { stringifyLevelsJson } from './level-json-format.mjs';

const LEVEL_WRAPPERS = new WeakMap();

/** The hints directory that accompanies a levels.json path (sibling `hints/` dir). */
export function hintsDirFor(levelsJsonPath) {
    return path.join(path.dirname(levelsJsonPath), 'hints');
}

/** Zero-padded per-level hint file name, e.g. 7 → "007.json". */
export function hintFileName(levelNumber) {
    return `${String(levelNumber).padStart(3, '0')}.json`;
}

export function hintFilePathFor(levelsJsonPath, levelNumber) {
    return path.join(hintsDirFor(levelsJsonPath), hintFileName(levelNumber));
}

/** Reads one level's full hint array from the artifact; [] when the file doesn't exist. */
export function readLevelHints(levelsJsonPath, levelNumber) {
    const filePath = hintFilePathFor(levelsJsonPath, levelNumber);
    if (!existsSync(filePath)) return [];
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    const hints = Array.isArray(parsed) ? parsed : parsed?.hints;
    if (!Array.isArray(hints)) throw new Error(`${filePath} must contain a JSON array of hint paths or an object with a hints array`);
    return hints;
}

/**
 * Reads levels.json and re-attaches each level's hints from the artifact, returning the
 * combined shape (`level.hints` populated) that the hint tools operate on. A level that
 * already carries inline hints (e.g. a not-yet-split fixture passed via --levels-json)
 * keeps them; artifact hints win when both exist.
 */
export function readLevelsWithHints(levelsJsonPath) {
    const parsed = JSON.parse(readFileSync(levelsJsonPath, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) throw new Error(`${levelsJsonPath} must contain a JSON array of levels or an object with a levels array`);
    if (!Array.isArray(parsed)) LEVEL_WRAPPERS.set(levels, parsed);
    const dir = hintsDirFor(levelsJsonPath);
    levels.forEach((level, i) => {
        if (!level || typeof level !== 'object') return;
        if (existsSync(dir)) {
            const fromArtifact = readLevelHints(levelsJsonPath, i + 1);
            if (fromArtifact.length > 0 || !Array.isArray(level.hints)) level.hints = fromArtifact;
        } else if (!Array.isArray(level.hints)) {
            level.hints = [];
        }
    });
    return levels;
}

/** Serializes one level's hint array — one hint path per line, same style levels.json used. */
export function stringifyHints(hints) {
    return `${stringifyLevelsJson(hints)}\n`;
}

/**
 * Writes the split artifacts from an in-memory levels array (with `.hints` attached):
 * levels.json WITHOUT hints, plus one `hints/<NNN>.json` per level. Per-level files are
 * only rewritten when their content changed, so timestamps/diffs stay minimal.
 * Returns { levelsChanged, hintFilesChanged }.
 */
export function writeLevelsWithHints(levelsJsonPath, levels) {
    if (!Array.isArray(levels)) throw new Error('levels must be an array');
    const dir = hintsDirFor(levelsJsonPath);
    mkdirSync(dir, { recursive: true });

    let hintFilesChanged = 0;
    levels.forEach((level, i) => {
        const hints = Array.isArray(level?.hints) ? level.hints : [];
        const filePath = hintFilePathFor(levelsJsonPath, i + 1);
        const next = stringifyHints(hints);
        const prev = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null;
        if (prev !== next) {
            writeFileSync(filePath, next);
            hintFilesChanged += 1;
        }
    });

    const stripped = levels.map((level) => {
        if (!level || typeof level !== 'object') return level;
        const { hints: _hints, ...rest } = level;
        return rest;
    });
    const wrapper = LEVEL_WRAPPERS.get(levels);
    const output = wrapper ? { ...wrapper, levels: stripped } : stripped;
    const nextLevels = `${stringifyLevelsJson(output)}\n`;
    const prevLevels = existsSync(levelsJsonPath) ? readFileSync(levelsJsonPath, 'utf8') : null;
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
