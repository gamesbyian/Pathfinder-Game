// Runtime JSON fetch primitives for the bundled data assets — split out of app.ts so
// modules/dev-corpus.ts can reuse createDefaultHintsSource for an alternate corpus's hints
// without importing the whole app.ts composition root (which would create a circular import,
// since app.ts's dependency graph eventually reaches the input controllers that own the
// Dev-Mode corpus switcher UI).
import { upgradeLegacyHints } from './domain/hint-types.js';

export function createDefaultDataAssetLoader({ fetchImpl = globalThis?.fetch, basePath = './data' }: any = {}) {
    return async () => {
        if (typeof fetchImpl !== 'function') return null;
        const [levelsResponse, themesResponse] = await Promise.all([
            fetchImpl(`${basePath}/levels.json`),
            fetchImpl(`${basePath}/themes.json`),
        ]);
        if (!levelsResponse?.ok) throw new Error(`Failed to load ${basePath}/levels.json`);
        if (!themesResponse?.ok) throw new Error(`Failed to load ${basePath}/themes.json`);
        const [levels, themes] = await Promise.all([
            levelsResponse.json(),
            themesResponse.json(),
        ]);
        return { levels, themes };
    };
}

/**
 * Per-level lazy hint fetcher (hardening plan §2). `data/levels.json` carries no hints at
 * rest; a level's FULL hint set lives in `data/hints/<NNN>.json` (NNN = zero-padded 1-based
 * level number) and is fetched only when first requested — never at boot. The file is the
 * canonical `{schemaVersion, hints: Hint[]}` wrapper (domain/hint-types.ts); upgradeLegacyHints
 * also tolerates a bare path array, so an older cached/CDN-served copy of the file still parses.
 *
 * `basePath` also lets a caller point this at an alternate corpus's hints directory (e.g.
 * `./data/stress` for the Dev-Mode stress-corpus switcher — see modules/dev-corpus.ts) since
 * every corpus's hints live at `<basePath>/hints/<NNN>.json`.
 */
export function createDefaultHintsSource({ fetchImpl = globalThis?.fetch, basePath = './data' }: any = {}) {
    return async (levelNumber: number) => {
        if (typeof fetchImpl !== 'function') return [];
        const name = `${String(levelNumber).padStart(3, '0')}.json`;
        const response = await fetchImpl(`${basePath}/hints/${name}`);
        if (!response?.ok) throw new Error(`Failed to load ${basePath}/hints/${name}`);
        const parsed = await response.json();
        return upgradeLegacyHints(Array.isArray(parsed) ? parsed : parsed?.hints);
    };
}
