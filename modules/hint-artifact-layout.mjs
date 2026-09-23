/**
 * Browser/Node-neutral authority for the physical relationship between a level corpus and its
 * per-level hint artifacts.
 *
 * This module deliberately contains no fs/path/browser APIs. Environment adapters supply their
 * own directory joining/fetch mechanics, but directory names and hint artifact filenames come
 * from here so a writer-legal id cannot become invisible to a validator/browser merely because
 * another surface duplicated the naming rule.
 */

/** @param {string} levelsFileOrPath */
export function hintDirectoryNameForLevelsFile(levelsFileOrPath) {
    if (typeof levelsFileOrPath !== 'string' || levelsFileOrPath.length === 0) {
        throw new Error('hint layout requires a non-empty levels filename/path');
    }
    const baseName = levelsFileOrPath.split(/[\\/]/).pop() ?? levelsFileOrPath;
    const match = /^stress-levels-(.+)\.json$/.exec(baseName);
    return match ? `hints-${match[1]}` : 'hints';
}

/** @param {unknown} key */
function assertHintArtifactKey(key) {
    if (typeof key === 'number') {
        if (!Number.isInteger(key) || key < 1) throw new Error(`numeric hint artifact key must be a positive integer; got ${key}`);
        return;
    }
    if (typeof key !== 'string' || key.length === 0) {
        throw new Error('hint artifact key must be a non-empty string or positive integer');
    }
    if (key === '.' || key === '..' || /[\\/\0-\x1f]/.test(key)) {
        throw new Error(`hint artifact key is not a safe filename identity: ${JSON.stringify(key)}`);
    }
}

/**
 * String persistent ids are used verbatim; positional fallback keys are zero-padded.
 * @param {string | number} key
 * @returns {string}
 */
export function hintArtifactFileName(key) {
    assertHintArtifactKey(key);
    return typeof key === 'string' ? `${key}.json` : `${String(key).padStart(5, '0')}.json`;
}

/**
 * Persistent id when present, otherwise the caller-supplied 1-based array position.
 * @param {{id?: unknown} | null | undefined} level
 * @param {number} position
 * @returns {string | number}
 */
export function hintKeyForLevel(level, position) {
    const key = (typeof level?.id === 'string' && level.id) ? level.id : position;
    assertHintArtifactKey(key);
    return key;
}

/**
 * True only for filenames that could have been emitted by hintArtifactFileName().
 * @param {unknown} fileName
 * @returns {boolean}
 */
export function isHintArtifactFileName(fileName) {
    if (typeof fileName !== 'string' || !fileName.endsWith('.json')) return false;
    const key = fileName.slice(0, -5);
    if (!key) return false;
    try {
        return hintArtifactFileName(key) === fileName;
    } catch {
        return false;
    }
}

/**
 * Canonical expected filenames for a corpus, derived from level identity rather than directory enumeration.
 * @param {ReadonlyArray<{id?: unknown}>} levels
 * @returns {string[]}
 */
export function expectedHintArtifactFileNames(levels) {
    if (!Array.isArray(levels)) throw new Error('expectedHintArtifactFileNames requires a levels array');
    return levels.map((level, index) => hintArtifactFileName(hintKeyForLevel(level, index + 1)));
}
