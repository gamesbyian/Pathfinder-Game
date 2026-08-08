import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Load probe corpora without allowing a bare id to select whichever corpus was visited last. */
export function loadProbeCorpora(root, corpora) {
    const levelById = new Map();
    const hintsDirById = new Map();
    const sourceById = new Map();
    for (const [levelsFile, hintsDir] of corpora) {
        const raw = JSON.parse(readFileSync(path.join(root, levelsFile), 'utf8'));
        for (const level of (Array.isArray(raw) ? raw : raw.levels)) {
            if (!level.id) continue;
            const previousSource = sourceById.get(level.id);
            if (previousSource) {
                throw new Error(`Duplicate level id ${level.id} across probe corpora: ${previousSource} and ${levelsFile}`);
            }
            levelById.set(level.id, level);
            hintsDirById.set(level.id, hintsDir);
            sourceById.set(level.id, levelsFile);
        }
    }
    return { levelById, hintsDirById };
}
